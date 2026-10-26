import { supabase } from '../lib/supabase';
import { getTargetDueDate } from '../lib/paymentCycle';

export interface PixFullConfig {
  pixKey: string;
  pixQrUrl: string;
  beneficiario: string;
  banco: string;
  tipoChave: string;
  nucleoValores: Record<string, number>;
}

export const DEFAULT_PIX_CONSTANTS = {
  pixKey: '11958259144',
  tipoChave: 'Telefone',
  beneficiario: 'MARIA HELENA PIRANI CAVALLERO',
  banco: 'Banco Santander',
};

export const financeService = {
  /**
   * Busca pagamentos de um usuário específico
   */
  async getPaymentsByUserId(userId: string) {
    const { data, error } = await supabase
      .from('pagamentos')
      .select('id, valor, status, data_vencimento, data_pagamento, comprovante_url, feedback, descricao')
      .eq('user_id', userId)
      .order('data_vencimento', { ascending: false });
    if (error) throw error;
    return data;
  },

  /**
   * Busca todos os pagamentos pendentes (Admin)
   */
  async getPendingPayments() {
    const { data, error } = await supabase
      .from('pagamentos')
      .select('id, valor, status, data_vencimento, data_pagamento, comprovante_url, feedback, descricao, users(id, nome, email, nucleo_id, nucleos(nome))')
      .eq('status', 'pago'); // No contexto deste sistema, 'pago' significa 'comprovante enviado, aguardando validação'
    if (error) throw error;
    return data;
  },

  /**
   * Valida ou rejeita um pagamento
   */
  async validatePayment(id: string, status: 'aprovado' | 'rejeitado', feedback?: string | null) {
    const { error } = await supabase
      .from('pagamentos')
      .update({ status, feedback })
      .eq('id', id);
    if (error) throw error;
  },

  /**
   * Registra um novo pagamento manual ou avulso
   */
  async registerManualPayment(payload: { user_id: string; valor: number; descricao: string; status: 'pago' | 'aberto'; data_vencimento: string }) {
    const { error } = await supabase
      .from('pagamentos')
      .insert({
        ...payload,
        feedback: 'Registrado manualmente pela administração'
      });
    if (error) throw error;
  },

  /**
   * Solicita extensão de pagamento (Acesso de emergência)
   */
  async requestExtension(userId: string) {
    const exp = new Date();
    exp.setDate(exp.getDate() + 3);
    
    const day15 = new Date();
    day15.setDate(15);
    
    const finalExp = exp > day15 ? day15 : exp;
    const finalExpStr = finalExp.toISOString().split('T')[0];

    const { error } = await supabase
      .from('users')
      .update({ extensao_pagamento_ate: finalExpStr })
      .eq('id', userId);
    if (error) throw error;
    return finalExpStr;
  },

  /**
   * Busca configurações de PIX (Chave e QR Code)
   */
  async getPixConfig() {
    const { data, error } = await supabase.from('configuracoes').select('chave, valor');
    if (error) throw error;
    
    const config = { 
      pixKey: DEFAULT_PIX_CONSTANTS.pixKey, 
      pixQrUrl: '' 
    };
    (data || []).forEach(item => {
      if (item.chave === 'pix_key' && item.valor) config.pixKey = item.valor;
      if (item.chave === 'pix_qr_url') config.pixQrUrl = item.valor;
    });
    return config;
  },

  /**
   * Busca configuração completa de PIX incluindo favorecido, banco e valores por núcleo
   */
  async getPixFullConfig(): Promise<PixFullConfig> {
    const { data, error } = await supabase.from('configuracoes').select('chave, valor');
    if (error) console.warn('Erro ao carregar configuracoes:', error);

    const config: PixFullConfig = {
      pixKey: DEFAULT_PIX_CONSTANTS.pixKey,
      pixQrUrl: '',
      beneficiario: DEFAULT_PIX_CONSTANTS.beneficiario,
      banco: DEFAULT_PIX_CONSTANTS.banco,
      tipoChave: DEFAULT_PIX_CONSTANTS.tipoChave,
      nucleoValores: {}
    };

    (data || []).forEach(item => {
      if (item.chave === 'pix_key' && item.valor) config.pixKey = item.valor;
      if (item.chave === 'pix_qr_url' && item.valor) config.pixQrUrl = item.valor;
      if (item.chave === 'pix_beneficiario' && item.valor) config.beneficiario = item.valor;
      if (item.chave === 'pix_banco' && item.valor) config.banco = item.valor;
      if (item.chave === 'pix_tipo_chave' && item.valor) config.tipoChave = item.valor;
      if (item.chave === 'pix_valores_nucleos' && item.valor) {
        try {
          config.nucleoValores = JSON.parse(item.valor);
        } catch {
          config.nucleoValores = {};
        }
      }
    });

    return config;
  },

  /**
   * Obtém o valor da mensalidade específico de um núcleo
   */
  async getNucleoTuition(nucleoId?: string, nucleoNome?: string): Promise<number> {
    if (!nucleoId && !nucleoNome) return 0;

    // 1. Tenta buscar direto na tabela nucleos (coluna valor_mensalidade se existir)
    try {
      if (nucleoId) {
        const { data } = await supabase
          .from('nucleos')
          .select('*')
          .eq('id', nucleoId)
          .maybeSingle();

        if (data && typeof data.valor_mensalidade === 'number' && data.valor_mensalidade > 0) {
          return data.valor_mensalidade;
        }
      }
    } catch (e) {
      // Ignora erro caso a coluna não exista ainda
    }

    // 2. Busca na tabela de configuracoes
    try {
      const fullConfig = await this.getPixFullConfig();
      if (nucleoId && fullConfig.nucleoValores[nucleoId]) {
        return Number(fullConfig.nucleoValores[nucleoId]);
      }
      if (nucleoNome && fullConfig.nucleoValores[nucleoNome]) {
        return Number(fullConfig.nucleoValores[nucleoNome]);
      }
      if (fullConfig.nucleoValores['default']) {
        return Number(fullConfig.nucleoValores['default']);
      }
    } catch (e) {
      console.warn('Erro ao buscar valor de mensalidade em configurações:', e);
    }

    return 0;
  },

  /**
   * Salva o valor de mensalidade de um núcleo específico
   */
  async saveNucleoTuition(nucleoId: string, valor: number) {
    // 1. Tenta atualizar na tabela nucleos se a coluna existir
    try {
      await supabase.from('nucleos').update({ valor_mensalidade: valor }).eq('id', nucleoId);
    } catch {
      // continua para salvar em configuracoes
    }

    // 2. Atualiza no mapa em configuracoes
    const fullConfig = await this.getPixFullConfig();
    const updatedMap = { ...fullConfig.nucleoValores, [nucleoId]: valor };
    await this.saveConfig('pix_valores_nucleos', JSON.stringify(updatedMap));
  },

  /**
   * Salva múltiplos valores de mensalidades por núcleo
   */
  async saveAllNucleoTuitions(map: Record<string, number>) {
    await this.saveConfig('pix_valores_nucleos', JSON.stringify(map));

    // Opcionalmente tenta sincronizar coluna em nucleos
    for (const [nucleoId, valor] of Object.entries(map)) {
      if (nucleoId !== 'default') {
        try {
          await supabase.from('nucleos').update({ valor_mensalidade: valor }).eq('id', nucleoId);
        } catch {
          // prossegue
        }
      }
    }
  },

  /**
   * Verifica se o aluno já possui pagamento confirmado/enviado para o mês atual
   */
  async hasPaidForCurrentCycle(userId: string, targetDate: string = getTargetDueDate()): Promise<boolean> {
    if (!userId) return false;
    const yearMonth = targetDate.substring(0, 7); // "YYYY-MM"

    const { data, error } = await supabase
      .from('pagamentos')
      .select('id, status, data_vencimento, data_pagamento, comprovante_url')
      .eq('user_id', userId)
      .in('status', ['pago', 'aprovado']);

    if (error || !data) return false;

    // Verifica se algum pagamento corresponde ao mês do ciclo atual
    return data.some(p => {
      const vencMatch = p.data_vencimento && p.data_vencimento.startsWith(yearMonth);
      const pagMatch = p.data_pagamento && p.data_pagamento.startsWith(yearMonth);
      return vencMatch || pagMatch;
    });
  },

  /**
   * Salva configurações de sistema
   */
  async saveConfig(chave: string, valor: string) {
    const { error } = await supabase.from('configuracoes').upsert({ chave, valor });
    if (error) throw error;
  },

  /**
   * Registra um comprovante autovalidado
   */
  async registerValidatedPayment(params: {
    userId: string;
    valor: number;
    comprovanteUrl: string;
    dataPagamento?: string;
    dataVencimento?: string;
    descricao?: string;
    existingPaymentId?: string;
  }) {
    const dataPagamento = params.dataPagamento || new Date().toISOString().split('T')[0];
    const dataVencimento = params.dataVencimento || getTargetDueDate();
    const descricao = params.descricao || 'Comprovante PIX Validado Automaticamente (MARIA HELENA PIRANI CAVALLERO)';

    if (params.existingPaymentId) {
      const { error } = await supabase
        .from('pagamentos')
        .update({
          valor: params.valor,
          comprovante_url: params.comprovanteUrl,
          status: 'pago',
          data_pagamento: dataPagamento,
          data_vencimento: dataVencimento,
          descricao,
          feedback: 'Validado automaticamente pelo sistema de leitura de comprovante'
        })
        .eq('id', params.existingPaymentId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('pagamentos')
        .insert({
          user_id: params.userId,
          valor: params.valor,
          comprovante_url: params.comprovanteUrl,
          status: 'pago',
          data_pagamento: dataPagamento,
          data_vencimento: dataVencimento,
          descricao,
          feedback: 'Validado automaticamente pelo sistema de leitura de comprovante'
        });
      if (error) throw error;
    }
  },

  /**
   * Busca relatório de alunos pagantes que enviaram comprovante via site
   */
  async getFinanceReport() {
    const { data, error } = await supabase
      .from('pagamentos')
      .select('id, valor, status, data_vencimento, data_pagamento, comprovante_url, feedback, descricao, users(id, nome, email, nucleo_id, nucleos(nome))')
      .not('comprovante_url', 'is', null)
      .order('id', { ascending: false });
    
    if (error) throw error;
    return data;
  }
};
