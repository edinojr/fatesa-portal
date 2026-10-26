import React, { useState, useEffect, useRef } from 'react';
import { 
  CreditCard, 
  Copy, 
  CheckCircle2, 
  Upload, 
  AlertTriangle, 
  X, 
  Loader2, 
  Calendar, 
  Building2, 
  User, 
  DollarSign, 
  Info,
  ShieldCheck,
  FileText,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { financeService, PixFullConfig, DEFAULT_PIX_CONSTANTS } from '../../../services/financeService';
import { 
  extractTextFromFile, 
  parseAndValidateReceipt, 
  ReceiptValidationResult,
  OFFICIAL_RECEIVER 
} from '../../../services/receiptValidator';
import { 
  isExemptPaymentMonth, 
  isPixPopupActivePeriod, 
  isPayingStudent, 
  getMonthName, 
  getTargetDueDate 
} from '../../../lib/paymentCycle';

interface PixPaymentPopupProps {
  profile: any;
  onPaymentSuccess?: () => void;
  forceOpen?: boolean;
}

export const PixPaymentPopup: React.FC<PixPaymentPopupProps> = ({
  profile,
  onPaymentSuccess,
  forceOpen = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState<PixFullConfig>({
    pixKey: DEFAULT_PIX_CONSTANTS.pixKey,
    pixQrUrl: '',
    beneficiario: DEFAULT_PIX_CONSTANTS.beneficiario,
    banco: DEFAULT_PIX_CONSTANTS.banco,
    tipoChave: DEFAULT_PIX_CONSTANTS.tipoChave,
    nucleoValores: {}
  });
  const [expectedTuition, setExpectedTuition] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanStatus, setScanStatus] = useState<string>('');
  const [validationResult, setValidationResult] = useState<ReceiptValidationResult | null>(null);
  const [successConfirmed, setSuccessConfirmed] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const nucleoNome = profile?.nucleos?.nome || profile?.nucleo || 'Seu Núcleo';
  const nucleoId = profile?.nucleo_id;

  // Carrega configurações e verifica elegibilidade do pop-up
  useEffect(() => {
    let isMounted = true;

    const checkEligibility = async () => {
      if (!profile) return;

      // 1. Forçado para preview/teste
      const isTestMode = forceOpen || sessionStorage.getItem('test_pix_popup') === 'true';

      // 2. Se for mês de Janeiro ou Julho, NUNCA exibe (isentos de pagamento)
      if (!isTestMode && isExemptPaymentMonth()) {
        if (isMounted) setIsOpen(false);
        return;
      }

      // 3. Verifica se é aluno pagante (não é bolsista, não é staff, não é núcleo isento)
      if (!isTestMode && !isPayingStudent(profile)) {
        if (isMounted) setIsOpen(false);
        return;
      }

      // 4. Verifica se está no período ativo (a partir do mês de Novembro de 2026)
      if (!isTestMode && !isPixPopupActivePeriod()) {
        if (isMounted) setIsOpen(false);
        return;
      }

      // 5. Verifica se o aluno já pagou ou enviou comprovante para o ciclo deste mês
      try {
        const hasPaid = await financeService.hasPaidForCurrentCycle(profile.id);
        if (!isTestMode && hasPaid) {
          if (isMounted) setIsOpen(false);
          return;
        }
      } catch (err) {
        console.warn('Erro ao verificar ciclo de pagamento:', err);
      }

      // 6. Verifica se o pop-up já foi fechado nesta sessão de navegação específica
      const sessionDismissKey = `fatesa_pix_session_dismiss_${profile.id}_${getTargetDueDate().substring(0, 7)}`;
      const dismissedThisSession = sessionStorage.getItem(sessionDismissKey);
      if (!isTestMode && dismissedThisSession === 'true') {
        if (isMounted) setIsOpen(false);
        return;
      }

      // 7. Carrega os dados do PIX e a mensalidade do núcleo
      try {
        const [fullCfg, tuition] = await Promise.all([
          financeService.getPixFullConfig(),
          financeService.getNucleoTuition(nucleoId, nucleoNome)
        ]);
        if (isMounted) {
          setConfig(fullCfg);
          setExpectedTuition(tuition);
          setIsOpen(true);
        }
      } catch (err) {
        console.error('Erro ao carregar dados do Pix:', err);
        if (isMounted) setIsOpen(true);
      }
    };

    checkEligibility();

    return () => {
      isMounted = false;
    };
  }, [profile, forceOpen, nucleoId, nucleoNome]);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(config.pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleClose = () => {
    if (profile?.id) {
      // Salva apenas na sessionStorage: ao deslogar e logar de novo, voltará a abrir até pagar!
      const sessionDismissKey = `fatesa_pix_session_dismiss_${profile.id}_${getTargetDueDate().substring(0, 7)}`;
      sessionStorage.setItem(sessionDismissKey, 'true');
    }
    setIsOpen(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setSelectedFile(file);
    setValidationResult(null);
    setUploading(true);
    setScanProgress(10);
    setScanStatus('Carregando comprovante...');

    try {
      // 1. Extração óptica / textual
      setScanStatus('Reconhecendo dados do comprovante...');
      const rawText = await extractTextFromFile(file, (pct) => {
        setScanProgress(Math.min(90, Math.max(15, pct)));
      });

      // 2. Validação automática
      setScanProgress(95);
      setScanStatus('Validando recebedor, data e valor por núcleo...');
      const result = parseAndValidateReceipt(rawText, {
        expectedRecipient: config.beneficiario || OFFICIAL_RECEIVER,
        expectedAmount: expectedTuition,
        expectedPhone: config.pixKey,
        nucleoNome
      });

      setValidationResult(result);
      setScanProgress(100);

      // 3. Se passou em todas as regras, efetua o upload e o registro automático!
      if (result.isValid) {
        setScanStatus('Comprovante reconhecido! Gravando pagamento...');
        await commitValidatedPayment(file, result);
      } else {
        setScanStatus('Comprovante analisado com divergências.');
      }
    } catch (err: any) {
      console.error('Erro na validação do comprovante:', err);
      setValidationResult({
        isValid: false,
        extractedRecipient: null,
        recipientMatches: false,
        extractedAmount: null,
        amountMatches: false,
        expectedAmount: expectedTuition,
        extractedDate: null,
        dateValid: false,
        rawText: '',
        errors: ['Erro ao processar arquivo: ' + (err.message || 'formato ilegível')],
        warnings: []
      });
      setScanStatus('Erro ao ler comprovante');
    } finally {
      setUploading(false);
    }
  };

  const commitValidatedPayment = async (file: File, result: ReceiptValidationResult) => {
    if (!profile) return;

    try {
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `${profile.id}_pix_${Date.now()}.${fileExt}`;
      const filePath = `comprovantes/${fileName}`;

      // Upload no storage bucket 'comprovantes'
      const { error: uploadErr } = await supabase.storage
        .from('comprovantes')
        .upload(filePath, file, { cacheControl: '31536000' });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('comprovantes')
        .getPublicUrl(filePath);

      // Converte data para YYYY-MM-DD se vier em DD/MM/AAAA
      let isoDate = new Date().toISOString().split('T')[0];
      if (result.extractedDate && result.extractedDate.includes('/')) {
        const parts = result.extractedDate.split('/');
        if (parts.length === 3) {
          isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }

      const valorFinal = result.extractedAmount || expectedTuition || 0;

      await financeService.registerValidatedPayment({
        userId: profile.id,
        valor: valorFinal,
        comprovanteUrl: publicUrl,
        dataPagamento: isoDate,
        dataVencimento: getTargetDueDate(),
        descricao: `Comprovante PIX Validado - ${config.beneficiario} (${nucleoNome})`
      });

      setSuccessConfirmed(true);

      // Desativa o pop-up permanentemente para este ciclo
      setTimeout(() => {
        setIsOpen(false);
        onPaymentSuccess?.();
      }, 3500);

    } catch (err: any) {
      console.error('Erro ao gravar pagamento validado:', err);
      alert('Comprovante reconhecido, porém houve um erro ao registrar: ' + err.message);
    }
  };

  const handleManualForceSubmit = async () => {
    if (!selectedFile || !profile) return;
    setUploading(true);
    setScanStatus('Enviando para análise manual da administração...');
    try {
      const fileExt = selectedFile.name.split('.').pop() || 'png';
      const fileName = `${profile.id}_manual_${Date.now()}.${fileExt}`;
      const filePath = `comprovantes/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from('comprovantes')
        .upload(filePath, selectedFile, { cacheControl: '31536000' });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('comprovantes')
        .getPublicUrl(filePath);

      await financeService.registerValidatedPayment({
        userId: profile.id,
        valor: expectedTuition || 0,
        comprovanteUrl: publicUrl,
        dataPagamento: new Date().toISOString().split('T')[0],
        dataVencimento: getTargetDueDate(),
        descricao: `Comprovante PIX Enviado para Conferência Manual (${nucleoNome})`
      });

      setSuccessConfirmed(true);
      setTimeout(() => {
        setIsOpen(false);
        onPaymentSuccess?.();
      }, 3500);
    } catch (err: any) {
      alert('Erro ao enviar: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  const currentMonthName = getMonthName();

  return (
    <div 
      className="modal-overlay" 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.3s ease-out'
      }}
    >
      <div 
        className="modal-content"
        style={{
          background: 'linear-gradient(145deg, #131722 0%, #0d111a 100%)',
          border: '1px solid rgba(236, 0, 0, 0.35)', // Santander red subtle accent
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(236, 0, 0, 0.15)',
          borderRadius: '24px',
          maxWidth: '560px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          color: '#fff',
          padding: '2rem',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão Fechar Sessão */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          title="Fechar por agora (reabrirá no próximo login)"
        >
          <X size={18} />
        </button>

        {/* Header do Pop-up */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.9rem',
            background: 'rgba(236, 0, 0, 0.12)',
            border: '1px solid rgba(236, 0, 0, 0.3)',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: 800,
            color: '#ff4d4d',
            textTransform: 'uppercase',
            letterSpacing: '0.75px',
            marginBottom: '0.75rem'
          }}>
            <CreditCard size={14} /> Mensalidade • Mês de {currentMonthName}
          </div>

          <h2 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 800, 
            margin: '0.25rem 0',
            letterSpacing: '-0.5px',
            color: '#ffffff'
          }}>
            Esta é a chave Pix
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
            Efetue o pagamento da mensalidade e anexe o comprovante abaixo para liberação imediata.
          </p>
        </div>

        {/* CARD PRINCIPAL COM DADOS BANCÁRIOS (SANTANDER) */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '18px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.25rem'
        }}>
          {/* Chave Pix (Telefone) */}
          <div style={{ marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255, 255, 255, 0.5)', display: 'block', marginBottom: '0.3rem' }}>
              Chave Pix ({config.tipoChave || 'Telefone'})
            </span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(0, 0, 0, 0.4)',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '1px', color: '#00f2fe', fontFamily: 'monospace' }}>
                  {config.pixKey}
                </span>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.45)' }}>
                  (11) 95825-9144
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyKey}
                style={{
                  background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0, 242, 254, 0.15)',
                  border: `1px solid ${copied ? '#10b981' : '#00f2fe'}`,
                  color: copied ? '#10b981' : '#00f2fe',
                  padding: '0.5rem 0.9rem',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                {copied ? 'Copiada!' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Favorecido e Banco */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255, 255, 255, 0.5)', display: 'block', marginBottom: '0.2rem' }}>
                <User size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                Nome do Recebedor
              </span>
              <strong style={{ fontSize: '0.85rem', color: '#fff', display: 'block', lineHeight: 1.3 }}>
                {config.beneficiario || OFFICIAL_RECEIVER}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255, 255, 255, 0.5)', display: 'block', marginBottom: '0.2rem' }}>
                <Building2 size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                Banco
              </span>
              <strong style={{ fontSize: '0.85rem', color: '#ff4d4d', display: 'block' }}>
                {config.banco || DEFAULT_PIX_CONSTANTS.banco}
              </strong>
            </div>
          </div>

          {/* Valor por Núcleo */}
          <div style={{
            padding: '0.8rem 1rem',
            background: 'rgba(0, 242, 254, 0.05)',
            border: '1px solid rgba(0, 242, 254, 0.15)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.6)', display: 'block', textTransform: 'uppercase' }}>
                Mensalidade do seu Núcleo
              </span>
              <strong style={{ fontSize: '0.9rem', color: '#fff' }}>
                {nucleoNome}
              </strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981' }}>
                {expectedTuition > 0 ? `R$ ${expectedTuition.toFixed(2)}` : 'R$ A definir'}
              </span>
            </div>
          </div>
        </div>

        {/* ALERTA: ISENÇÃO DE JANEIRO E JULHO + PERSISTÊNCIA ATÉ PAGAR */}
        <div style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: '14px',
          padding: '0.85rem 1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start'
        }}>
          <Info size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.45 }}>
            <strong style={{ color: '#f59e0b', display: 'block', marginBottom: '2px' }}>
              Regras do Sistema Fatesa:
            </strong>
            • <strong>Isenção:</strong> Os meses de <strong>Janeiro</strong> e <strong>Julho</strong> não possuem cobrança (todos os alunos estão isentos nesses meses).<br />
            • <strong>Persistência:</strong> Este pop-up abrirá <strong>toda vez que você logar no site</strong> avisando do débito até a validação do comprovante.
          </div>
        </div>

        {/* ÁREA DE INSERÇÃO E VALIDAÇÃO DE COMPROVANTE */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/*,application/pdf"
          onChange={handleFileChange}
        />

        {/* Feedback de Sucesso */}
        {successConfirmed ? (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid #10b981',
            borderRadius: '18px',
            padding: '1.5rem',
            textAlign: 'center',
            animation: 'fadeIn 0.4s ease-out'
          }}>
            <ShieldCheck size={48} color="#10b981" style={{ margin: '0 auto 0.75rem' }} />
            <h3 style={{ margin: 0, color: '#10b981', fontSize: '1.25rem', fontWeight: 800 }}>
              Comprovante Validado com Sucesso!
            </h3>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.85)' }}>
              Identificamos o pagamento para <strong>{config.beneficiario}</strong>. Seu acesso está regularizado e o pop-up não será mais exibido.
            </p>
          </div>
        ) : (
          <div>
            {/* Estado de Leitura/Scanning */}
            {uploading ? (
              <div style={{
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(0, 242, 254, 0.3)',
                borderRadius: '18px',
                padding: '2rem 1.5rem',
                textAlign: 'center'
              }}>
                <Loader2 size={36} color="#00f2fe" style={{ margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#00f2fe' }}>
                  {scanStatus}
                </h4>
                <div style={{
                  height: '6px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  margin: '1.25rem auto 0.5rem',
                  maxWidth: '300px'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${scanProgress}%`,
                    background: 'linear-gradient(90deg, #00f2fe, #10b981)',
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                  Extraindo valores, dia pago e nome do recebedor...
                </span>
              </div>
            ) : validationResult && !validationResult.isValid ? (
              /* Resultado com Divergência */
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '18px',
                padding: '1.25rem',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                  <AlertCircle size={22} color="#ef4444" />
                  <strong style={{ fontSize: '0.95rem', color: '#ef4444' }}>
                    Comprovante Requer Ajuste
                  </strong>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.85)', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                  <div>
                    👤 <strong>Recebedor Detectado:</strong>{' '}
                    <span style={{ color: validationResult.recipientMatches ? '#10b981' : '#ef4444' }}>
                      {validationResult.extractedRecipient || 'Não identificado'}
                    </span>{' '}
                    {validationResult.recipientMatches ? '✅' : '❌ (Esperado: MARIA HELENA PIRANI CAVALLERO)'}
                  </div>

                  <div>
                    💰 <strong>Valor Detectado:</strong>{' '}
                    <span style={{ color: validationResult.amountMatches ? '#10b981' : '#f59e0b' }}>
                      {validationResult.extractedAmount ? `R$ ${validationResult.extractedAmount.toFixed(2)}` : 'Não identificado'}
                    </span>{' '}
                    {validationResult.amountMatches ? '✅' : `⚠️ (Esperado para o seu núcleo: R$ ${expectedTuition.toFixed(2)})`}
                  </div>

                  <div>
                    📅 <strong>Data Detectada:</strong>{' '}
                    <span style={{ color: validationResult.dateValid ? '#10b981' : '#ef4444' }}>
                      {validationResult.extractedDate || 'Não identificada'}
                    </span>{' '}
                    {validationResult.dateValid ? '✅' : '❌'}
                  </div>
                </div>

                {validationResult.errors.length > 0 && (
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    color: '#ff8080',
                    marginBottom: '1rem'
                  }}>
                    {validationResult.errors.map((err, i) => (
                      <div key={i}>• {err}</div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    Tentar Outro Comprovante
                  </button>

                  <button
                    type="button"
                    onClick={handleManualForceSubmit}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: 'rgba(245, 158, 11, 0.2)',
                      border: '1px solid #f59e0b',
                      borderRadius: '12px',
                      color: '#f59e0b',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                    title="Enviar para aprovação manual caso seu comprovante esteja correto"
                  >
                    Enviar p/ Análise Manual
                  </button>
                </div>
              </div>
            ) : (
              /* Botão Padrão de Upload */
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%',
                    padding: '1rem 1.5rem',
                    background: 'linear-gradient(135deg, #ec0000 0%, #b30000 100%)', // Santander Red
                    border: 'none',
                    borderRadius: '16px',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '1rem',
                    letterSpacing: '0.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    boxShadow: '0 8px 24px rgba(236, 0, 0, 0.35)',
                    transition: 'all 0.2s transform'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  <Upload size={20} />
                  INSERIR COMPROVANTE
                </button>
                <span style={{
                  display: 'block',
                  textAlign: 'center',
                  fontSize: '0.75rem',
                  color: 'rgba(255, 255, 255, 0.45)',
                  marginTop: '0.6rem'
                }}>
                  Formatos aceitos: Imagem (JPEG, PNG) ou PDF oficial do banco
                </span>
              </div>
            )}
          </div>
        )}

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes fadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        `}</style>
      </div>
    </div>
  );
};

export default PixPaymentPopup;
