import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

export const useAdminFinance = (showToast: (msg: string, type?: 'success' | 'error') => void) => {
  const [pendingDocs, setPendingDocs] = useState<any[]>([]);
  const [pendingPaysValidation, setPendingPaysValidation] = useState<any[]>([]);
  const [financeReport, setFinanceReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchFinanceData = useCallback(async () => {
    setLoading(true);
    try {
      const [docsData, paysData] = await Promise.all([
        supabase.from('documentos').select('*, users(id, nome, email, nucleo_id, nucleos(nome))').not('url', 'is', null).filter('status', 'not.in', '(aprovado,rejeitado)'),
        supabase.from('pagamentos').select('*, users(id, nome, email, nucleo_id, nucleos(nome))').not('comprovante_url', 'is', null).filter('status', 'not.in', '(aprovado,rejeitado)')
      ]);
      if (docsData.data) setPendingDocs(docsData.data);
      if (paysData.data) setPendingPaysValidation(paysData.data);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchFinanceReport = useCallback(async () => {
    setLoading(true);
    try {
      const { data: reportPays, error } = await supabase
        .from('pagamentos')
        .select('id, valor, status, data_vencimento, comprovante_url, feedback, modulo, users(id, nome, email, nucleo_id, nucleos(nome))')
        .order('data_vencimento', { ascending: false });
      if (reportPays) setFinanceReport(reportPays);
      if (error) throw error;
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const handleValidar = async (target: 'doc' | 'pay', id: string, status: 'aprovado' | 'rejeitado', modulo?: string) => {
    const feedback = status === 'rejeitado' ? prompt('Motivo da rejeição:') : null;
    if (status === 'rejeitado' && !feedback) return;

    setActionLoading(id);
    try {
      const table = target === 'pay' ? 'pagamentos' : 'documentos';
      const finalStatus = status === 'aprovado' ? 'aprovado' : 'rejeitado';
      const { error } = await supabase.from(table).update({ status: finalStatus, feedback, modulo: modulo || null }).eq('id', id);
      if (error) throw error;

      if (status === 'aprovado' && target === 'pay') {
        const { data: payData } = await supabase.from('pagamentos').select('user_id').eq('id', id).maybeSingle();
        if (payData?.user_id) await supabase.from('users').update({ acesso_definitivo: true }).eq('id', payData.user_id);
      }

      showToast(`${target === 'doc' ? 'Documento' : 'Pagamento'} ${status} com sucesso!`);
      fetchFinanceData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return {
    pendingDocs,
    pendingPaysValidation,
    financeReport,
    loading,
    actionLoading,
    fetchFinanceData,
    fetchFinanceReport,
    handleValidar
  };
};
