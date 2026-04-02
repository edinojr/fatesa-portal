/**
 * Lógica do Ciclo de Pagamento Fatesa:
 * - Ciclo: Do dia 25 de um mês ao dia 12 do mês seguinte.
 * - Vencimento: Dia 12 de cada mês.
 * - Bloqueio: A partir do dia 13, se não houver pagamento confirmado para o dia 12 deste mês.
 */

export const getTargetDueDate = (date: Date = new Date()): string => {
  const day = date.getDate();
  let year = date.getFullYear();
  let month = date.getMonth() + 1;

  // Se hoje é dia 13 ou mais, o aluno já deveria ter pago o dia 12 deste mês.
  // Se hoje é dia 1-12, ele está no período de carência do dia 12 deste mês, 
  // MAS pode estar devendo o mês anterior. 
  
  // Para simplificar a regra do usuário: "após o prazo (dia 12) o aluno será bloqueado".
  // Retornamos a data de vencimento do mês atual.
  return `${year}-${String(month).padStart(2, '0')}-12`;
};

export const checkAccessStatus = (profile: any, payments: any[]): 'active' | 'blocked_payment' | 'blocked_admin' => {
  // Admins e Professores nunca são bloqueados por pagamento
  if (!profile || ['admin', 'professor', 'suporte', 'colaborador'].includes(profile.tipo)) {
    return 'active';
  }

  // Bloqueio manual administrativo tem precedência
  if (profile.bloqueado) return 'blocked_admin';

  const now = new Date();
  const day = now.getDate();

  // Se ainda não passou do dia 12, está no período de carência/pagamento do mês atual.
  // IMPORTANTE: Aqui poderíamos checar se ele deve o mês ANTERIOR, 
  // mas seguindo a regra estrita do usuário: "após o prazo (12) o aluno será bloqueado".
  if (day <= 12) return 'active';

  const targetDueDate = getTargetDueDate(now);
  
  // Verifica se existe um pagamento PAGO com a data de vencimento do dia 12 deste mês
  const hasPaid = payments.some(p => 
    p.status === 'pago' && 
    p.data_vencimento === targetDueDate
  );

  return hasPaid ? 'active' : 'blocked_payment';
};
