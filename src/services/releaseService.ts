import { supabase } from '../lib/supabase';
import { getExamVersion } from '../lib/examRules';

export interface ReleaseExamsResult {
  examId: string | null;
  examTitulo: string | null;
  nextBookId: string | null;
  nextBookTitulo: string | null;
}

/**
 * Regra Fatesa de liberação de provas — fonte única usada pelos painéis de
 * Conteúdo (ProfessorContent) e Liberação (ContentReleasePanel):
 *
 * 1. Libera a prova V1 do módulo (versão 1 explícita — nunca V2/V3) para o núcleo.
 * 2. Libera automaticamente o módulo seguinte do curso: linha 'modulo' +
 *    aulas de conteúdo (lições/exercícios/vídeos, sem provas) + professor_active.
 *
 * A liberação persiste até que o professor a revogue manualmente.
 */
export const releaseExamAndNextModule = async (currentBook: any, nucleoId: string): Promise<ReleaseExamsResult> => {
  const result: ReleaseExamsResult = { examId: null, examTitulo: null, nextBookId: null, nextBookTitulo: null };

  // 1. Prova V1 do módulo
  const { data: exams, error: examErr } = await supabase
    .from('aulas')
    .select('id, titulo, versao, ordem, tipo, is_bloco_final')
    .eq('livro_id', currentBook.id)
    .or('tipo.eq.prova,tipo.eq.avaliacao,is_bloco_final.eq.true')
    .order('ordem', { ascending: true });
  if (examErr) throw examErr;

  const v1Exam = (exams || []).find((e: any) => getExamVersion(e) === 1) || null;

  const items: Array<{ nucleo_id: string; item_id: string; item_type: string; liberado: boolean }> = [];
  if (v1Exam) {
    items.push({ nucleo_id: nucleoId, item_id: v1Exam.id, item_type: 'atividade', liberado: true });
    result.examId = v1Exam.id;
    result.examTitulo = v1Exam.titulo;
  }

  // 2. Módulo seguinte do mesmo curso (por ordem)
  let nextBook: any = null;
  if (typeof currentBook.ordem === 'number' && currentBook.curso_id) {
    const { data: nb, error: nbErr } = await supabase
      .from('livros')
      .select('id, titulo')
      .eq('ordem', currentBook.ordem + 1)
      .eq('curso_id', currentBook.curso_id)
      .maybeSingle();
    if (nbErr) throw nbErr;
    nextBook = nb;
  }

  if (nextBook) {
    result.nextBookId = nextBook.id;
    result.nextBookTitulo = nextBook.titulo;

    // Linha 'modulo' — sem ela o módulo seguinte não aparece no painel dos alunos
    items.push({ nucleo_id: nucleoId, item_id: nextBook.id, item_type: 'modulo', liberado: true });

    // Aulas de conteúdo (lições/exercícios/vídeos, SEM provas)
    const { data: nextContent, error: ncErr } = await supabase
      .from('aulas')
      .select('id, tipo, is_bloco_final')
      .eq('livro_id', nextBook.id);
    if (ncErr) throw ncErr;
    (nextContent || [])
      .filter((item: any) => !(item.tipo === 'prova' || item.tipo === 'avaliacao' || item.is_bloco_final))
      .forEach((item: any) => {
        const isVideo = item.tipo === 'video' || item.tipo === 'gravada' || item.tipo === 'ao_vivo';
        items.push({ nucleo_id: nucleoId, item_id: item.id, item_type: isVideo ? 'video' : 'atividade', liberado: true });
      });

    const { error: actErr } = await supabase.from('livros').update({ professor_active: true }).eq('id', nextBook.id);
    if (actErr) throw actErr;
  }

  if (items.length === 0) return result;

  const { error } = await supabase.from('liberacoes_nucleo').upsert(items, { onConflict: 'nucleo_id, item_id, item_type' });
  if (error) throw error;
  return result;
};
