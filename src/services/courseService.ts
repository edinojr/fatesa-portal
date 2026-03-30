import { supabase } from '../lib/supabase';

export const courseService = {
  /**
   * Busca todos os cursos com contagem de livros
   */
  async getCourses() {
    const { data, error } = await supabase
      .from('cursos')
      .select('*, livros(count)');
    if (error) throw error;
    return data;
  },

  /**
   * Busca os livros de um curso específico
   */
  async getBooksByCourse(courseId: string) {
    const { data, error } = await supabase
      .from('livros')
      .select('*, aulas(count)')
      .eq('curso_id', courseId)
      .order('ordem');
    if (error) throw error;
    return data;
  },

  /**
   * Busca todas as aulas (lições) de um livro
   */
  async getLessonsByBook(bookId: string) {
    const { data, error } = await supabase
      .from('aulas')
      .select('*, children:aulas(count)')
      .eq('livro_id', bookId)
      .eq('tipo', 'licao')
      .order('ordem');
    if (error) throw error;
    return data;
  },

  /**
   * Busca os itens filhos de uma lição (vídeos, atividades, provas)
   */
  async getLessonItems(lessonId: string) {
    const { data, error } = await supabase
      .from('aulas')
      .select('*')
      .eq('parent_aula_id', lessonId)
      .order('ordem');
    if (error) throw error;
    return data;
  },

  /**
   * Deleta um item (curso, livro ou aula)
   */
  async deleteItem(table: 'cursos' | 'livros' | 'aulas', id: string) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  /**
   * Reordena itens trocando a posição de dois vizinhos
   */
  async swapOrder(table: 'livros' | 'aulas', itemA: { id: string, ordem: number }, itemB: { id: string, ordem: number }) {
    const { error } = await supabase.rpc('swap_items_order', {
      p_table: table,
      p_id_a: itemA.id,
      p_ordem_a: itemB.ordem,
      p_id_b: itemB.id,
      p_ordem_b: itemA.ordem
    });
    
    // Fallback se o RPC não existir (como no código original que fazia dois updates)
    if (error) {
      const { error: err1 } = await supabase.from(table).update({ ordem: itemB.ordem }).eq('id', itemA.id);
      const { error: err2 } = await supabase.from(table).update({ ordem: itemA.ordem }).eq('id', itemB.id);
      if (err1 || err2) throw (err1 || err2);
    }
  },

  /**
   * Atualiza múltiplos itens para persistir uma nova ordem (Drag and Drop)
   */
  async updateItemsOrder(table: 'livros' | 'aulas', updates: any[]) {
    const updatePromises = updates.map(update => {
      const { id, ...payload } = update;
      return supabase
        .from(table)
        .update(payload)
        .eq('id', id);
    });

    const results = await Promise.all(updatePromises);
    const firstError = results.find(r => r.error)?.error;
    if (firstError) throw firstError;
  }
};
