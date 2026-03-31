import { supabase } from '../lib/supabase';

export const documentService = {
  /**
   * Busca documentos de um usuário específico
   */
  async getDocumentsByUserId(userId: string) {
    const { data, error } = await supabase
      .from('documentos')
      .select('id, tipo, url, status, feedback, created_at')
      .eq('user_id', userId);
    if (error) throw error;
    return data;
  },

  /**
   * Busca todos os documentos pendentes (Admin)
   */
  async getPendingDocuments() {
    const { data, error } = await supabase
      .from('documentos')
      .select('id, tipo, url, status, created_at, users(id, nome, email)')
      .eq('status', 'pendente');
    if (error) throw error;
    return data;
  },

  /**
   * Valida ou rejeita um documento
   */
  async validateDocument(id: string, status: 'aprovado' | 'rejeitado', feedback?: string | null) {
    const { error } = await supabase
      .from('documentos')
      .update({ status, feedback })
      .eq('id', id);
    if (error) throw error;
  },

  /**
   * Faz o upload de um documento para o bucket
   */
  async uploadDocument(userId: string, type: string, file: File) {
    const safeName = file.name.replace(/[^\w.-]/g, '_');
    const filePath = `${userId}/${Date.now()}_${safeName}`;
    
    // Upload do arquivo
    const { error: uploadError } = await supabase.storage
      .from('documentos')
      .upload(filePath, file);
    if (uploadError) throw uploadError;

    // Obter URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('documentos')
      .getPublicUrl(filePath);

    // Salvar registro no banco
    const { error: dbError } = await supabase
      .from('documentos')
      .upsert({ user_id: userId, tipo: type as any, url: publicUrl, status: 'pendente' });
    
    if (dbError) throw dbError;
    return publicUrl;
  }
};
