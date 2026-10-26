import { isUserAdmin } from './authUtils';

/**
 * Lógica do Ciclo de Pagamento Fatesa:
 * - Ciclo: Do dia 25 de um mês ao dia 12 do mês seguinte.
 * - Vencimento: Dia 12 de cada mês.
 * - Isenção de Meses: Janeiro e Julho NÃO têm pagamento (todos os alunos isentos).
 * - Ativação do Pop-up PIX: A partir do mês de Novembro para alunos pagantes.
 * - Bloqueio: A partir do dia 13, se não houver pagamento confirmado para o dia 12 deste mês.
 */

/**
 * Verifica se o mês atual (ou fornecido) é um mês isento de pagamento (Janeiro ou Julho)
 */
export const isExemptPaymentMonth = (date: Date = new Date()): boolean => {
  const month = date.getMonth(); // 0 = Janeiro, 6 = Julho
  return month === 0 || month === 6;
};

/**
 * Retorna o nome do mês por extenso em português
 */
export const getMonthName = (date: Date = new Date()): string => {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return months[date.getMonth()];
};

/**
 * Verifica se o pop-up de pagamento PIX deve estar ativo no calendário:
 * - Ativo a partir do mês de Novembro de 2026 em diante
 * - Exceto nos meses de Janeiro e Julho (isentos)
 */
export const isPixPopupActivePeriod = (date: Date = new Date()): boolean => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12

  // Antes de Novembro de 2026: inativo (a não ser que forçado por teste/preview)
  if (year < 2026 || (year === 2026 && month < 11)) {
    return false;
  }

  // Meses de Janeiro (1) e Julho (7) são isentos de pagamento
  if (month === 1 || month === 7) {
    return false;
  }

  return true;
};

/**
 * Retorna se um perfil é considerado aluno pagante
 */
export const isPayingStudent = (profile: any): boolean => {
  if (!profile) return false;
  if (isUserAdmin(profile)) return false;

  const roles = (profile?.caminhos_acesso as string[]) || [];
  const staffTypes = ['admin', 'suporte', 'professor', 'colaborador', 'coordenador_polo'];
  if (staffTypes.includes(profile?.tipo) || roles.some((r: string) => staffTypes.includes(r))) {
    return false;
  }

  // Bolsistas são isentos
  if (profile?.bolsista) return false;

  // Núcleos com isenção geral
  if (profile?.nucleos?.isento) return false;

  // Alunos regulares e presenciais pagantes
  return profile?.tipo === 'aluno' || profile?.tipo === 'presencial' || roles.includes('aluno');
};

export const getTargetDueDate = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  // Retornamos a data de vencimento do mês atual (dia 12)
  return `${year}-${String(month).padStart(2, '0')}-12`;
};

export const checkAccessStatus = (profile: any): 'active' | 'blocked_payment' | 'blocked_admin' => {
  // Administradores e equipe nunca são bloqueados
  if (isUserAdmin(profile)) return 'active';
  const roles = (profile?.caminhos_acesso as string[]) || [];
  if (['admin', 'suporte', 'professor', 'colaborador', 'coordenador_polo'].includes(profile?.tipo) || 
      roles.some((r: string) => ['admin', 'suporte', 'professor', 'colaborador', 'coordenador_polo'].includes(r))) {
    return 'active';
  }

  // Bloqueio administrativo tem prioridade
  if (profile?.bloqueado) return 'blocked_admin';

  // Se o mês for Janeiro ou Julho, todos os alunos estão isentos de pagamento!
  if (isExemptPaymentMonth()) {
    return 'active';
  }

  // Bolsistas e núcleos isentos estão livres de bloqueio por pagamento
  if (profile?.bolsista || profile?.nucleos?.isento) {
    return 'active';
  }

  // Verifica pagamentos pendentes
  const payments = profile?.pagamentos || [];
  const hasOpenPayment = payments.some((p: any) => p.status === 'aberto');
  const day = new Date().getDate();
  const todayStr = new Date().toISOString().split('T')[0];
  const extensionDate = profile?.extensao_pagamento_ate;
  const isUnderExtension = extensionDate && todayStr <= extensionDate && day <= 15;

  if (hasOpenPayment && day > 12 && !isUnderExtension) {
    return 'blocked_payment';
  }

  return 'active';
};
