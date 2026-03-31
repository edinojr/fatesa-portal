import { supabase } from '../lib/supabase';

export const financeService = {
  /**
   * Busca pagamentos de um usuário específico
   */
  async getPaymentsByUserId(userId: string) {
    const { data, error } = await supabase
      .from('pagamentos')
      .select('id, valor, status, data_vencimento, data_pagamento, comprovante_url, feedback')
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
      .select('id, valor, status, data_vencimento, comprovante_url, users(id, nome, email)')
      .eq('status', 'pago'); // No contexto deste sistema, 'pago' significa 'comprovante enviado, aguardando validação'
    if (error) throw error;
    return data;
  },

  /**
   * Valida ou rejeita um pagamento
   */
  async validatePayment(id: string, status: 'pago' | 'rejeitado', feedback?: string | null) {
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
    
    const config = { pixKey: '', pixQrUrl: '' };
    data.forEach(item => {
      if (item.chave === 'pix_key') config.pixKey = item.valor;
      if (item.chave === 'pix_qr_url') config.pixQrUrl = item.valor;
    });
    return config;
  },

  /**
   * Salva configurações de sistema
   */
  async saveConfig(chave: string, valor: string) {
    const { error } = await supabase.from('configuracoes').upsert({ chave, valor });
    if (error) throw error;
  }
};
