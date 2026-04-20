import { useState, useCallback } from 'react';
import { financeService } from '../../../services/financeService';

export const useFinanceControl = (userProfile: any) => {
  const [payments, setPayments] = useState<any[]>([]);
  const [pixConfig, setPixConfig] = useState<{ pixKey: string, pixQrUrl: string }>({ pixKey: '', pixQrUrl: '' });
  const [isBlockedDueToPayment, setIsBlockedDueToPayment] = useState(false);
  const [isPastDue, setIsPastDue] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchPayments = useCallback(async () => {
    if (!userProfile?.id) return;
    setLoading(true);
    try {
      const [pays, config] = await Promise.all([
        financeService.getPaymentsByUserId(userProfile.id),
        financeService.getPixConfig()
      ]);
      
      setPayments(pays || []);
      setPixConfig(config);

      // Lógica de bloqueio financeiro
      const hasOpenPayment = (pays || []).some((p: any) => p.status === 'aberto');
      const day = new Date().getDate();
      const todayStr = new Date().toISOString().split('T')[0];
      const extensionDate = userProfile?.extensao_pagamento_ate;
      
      const isUnderExtension = extensionDate && todayStr <= extensionDate && day <= 15;
      
      const isPresencial = userProfile?.tipo === 'presencial';
      const isStaff = ['admin', 'professor', 'suporte'].includes(userProfile?.tipo || '') || (userProfile?.caminhos_acesso || []).some((r: string) => ['admin', 'professor', 'suporte'].includes(r));
      const isExempt = userProfile?.bolsista || isStaff || isPresencial;

      if (hasOpenPayment && !isExempt) {
        if (day > 12 && !isUnderExtension) {
          setIsBlockedDueToPayment(true);
        } else if (day >= 10 || (day > 12 && isUnderExtension)) {
          setIsPastDue(true);
        } else {
          setIsBlockedDueToPayment(false);
          setIsPastDue(false);
        }
      } else {
        setIsBlockedDueToPayment(false);
        setIsPastDue(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userProfile?.id, userProfile?.extensao_pagamento_ate]);

  const requestExtension = async () => {
    if (!userProfile?.id) return { error: 'Usuário não encontrado' };
    const day = new Date().getDate();
    if (day > 15) return { error: 'O prazo máximo para extensão (dia 15) já expirou.' };

    try {
      const finalExpStr = await financeService.requestExtension(userProfile.id);
      return { success: true, date: finalExpStr };
    } catch (err: any) {
      return { error: err.message };
    }
  };

  return {
    payments,
    pixConfig,
    isBlockedDueToPayment,
    isPastDue,
    loading,
    fetchPayments,
    requestExtension
  };
};
