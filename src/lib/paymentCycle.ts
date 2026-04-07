/**
 * Lógica do Ciclo de Pagamento Fatesa:
 * - Ciclo: Do dia 25 de um mês ao dia 12 do mês seguinte.
 * - Vencimento: Dia 12 de cada mês.
 * - Bloqueio: A partir do dia 13, se não houver pagamento confirmado para o dia 12 deste mês.
 */

export const getTargetDueDate = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  // Para simplificar a regra do usuário: "após o prazo (dia 12) o aluno será bloqueado".
  // Retornamos a data de vencimento do mês atual.
  return `${year}-${String(month).padStart(2, '0')}-12`;
};

export const checkAccessStatus = (profile: any): 'active' | 'blocked_payment' | 'blocked_admin' => {
  // Conforme solicitado pelo usuário:
  // "o aluno estará sempre ativo mesmo não enviando o comprovante, quem bloqueia o usuário é o administrador."
  if (profile?.bloqueado) return 'blocked_admin';
  return 'active';
};
