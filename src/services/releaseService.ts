import { supabase } from '../lib/supabase';
import { getExamVersion } from '../lib/examRules';

export interface NucleoReleaseItem {
  nucleo_id: string;
  item_id: string;
  item_type: string;
  liberado: boolean;
}

export interface ReleaseExamsResult {
  examId: string | null;
  examTitulo: string | null;
  nextBookId: string | null;
  nextBookTitulo: string | null;
  items: NucleoReleaseItem[];
  activatedAulaIds: string[];
}

function isExamAula(item: { tipo?: string; is_bloco_final?: boolean }) {
  return item.tipo === 'prova' || item.tipo === 'avaliacao' || !!item.is_bloco_final;
}

function pushContentReleases(
  nucleoId: string,
  aulas: Array<{ id: string; tipo?: string; is_bloco_final?: boolean }>,
  items: NucleoReleaseItem[]
): string[] {
  const ids: string[] = [];
  for (const item of aulas) {
    if (isExamAula(item)) continue;
    const isVideo = item.tipo === 'video' || item.tipo === 'gravada' || item.tipo === 'ao_vivo';
    items.push({
      nucleo_id: nucleoId,
      item_id: item.id,
      item_type: isVideo ? 'video' : 'atividade',
      liberado: true,
    });
    ids.push(item.id);
  }
  return ids;
}

export async function setItemsProfessorActive(
  table: 'livros' | 'aulas',
  ids: string | string[],
  active: boolean
): Promise<void> {
  const idList = [...new Set((Array.isArray(ids) ? ids : [ids]).filter(Boolean))];
  if (idList.length === 0) return;
  const builder = supabase.from(table).update({ professor_active: active });
  const result = idList.length === 1
    ? await builder.eq('id', idList[0]).select('id')
    : await builder.in('id', idList).select('id');
  if (result.error) throw result.error;
  if (!result.data || result.data.length === 0) {
    throw new Error('Nenhuma linha atualizada. Verifique se seu perfil tem permissão para ativar/desativar conteúdo.');
  }
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
  const result: ReleaseExamsResult = {
    examId: null,
    examTitulo: null,
    nextBookId: null,
    nextBookTitulo: null,
    items: [],
    activatedAulaIds: [],
  };

  const { data: currentAulas, error: aulasErr } = await supabase
    .from('aulas')
    .select('id, titulo, versao, ordem, tipo, is_bloco_final')
    .eq('livro_id', currentBook.id)
    .order('ordem', { ascending: true });
  if (aulasErr) throw aulasErr;

  const v1Exams = (currentAulas || []).filter((e: any) => isExamAula(e) && getExamVersion(e) === 1);

  const items: NucleoReleaseItem[] = [];
  items.push({ nucleo_id: nucleoId, item_id: currentBook.id, item_type: 'modulo', liberado: true });

  const currentContentIds = pushContentReleases(nucleoId, currentAulas || [], items);
  result.activatedAulaIds.push(...currentContentIds);

  const examIdsToActivate: string[] = [];
  for (const exam of v1Exams) {
    items.push({ nucleo_id: nucleoId, item_id: exam.id, item_type: 'atividade', liberado: true });
    if (!result.examId) {
      result.examId = exam.id;
      result.examTitulo = exam.titulo;
    }
    result.activatedAulaIds.push(exam.id);
    examIdsToActivate.push(exam.id);
  }

  const allAulasToActivate = [...new Set([...examIdsToActivate, ...currentContentIds])];
  if (allAulasToActivate.length) {
    await setItemsProfessorActive('aulas', allAulasToActivate, true);
  }

  await setItemsProfessorActive('livros', currentBook.id, true);

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
    items.push({ nucleo_id: nucleoId, item_id: nextBook.id, item_type: 'modulo', liberado: true });

    const { data: nextContent, error: ncErr } = await supabase
      .from('aulas')
      .select('id, tipo, is_bloco_final')
      .eq('livro_id', nextBook.id);
    if (ncErr) throw ncErr;

    const nextContentIds = pushContentReleases(nucleoId, nextContent || [], items);
    result.activatedAulaIds.push(...nextContentIds);
    if (nextContentIds.length) {
      await setItemsProfessorActive('aulas', nextContentIds, true);
    }
    await setItemsProfessorActive('livros', nextBook.id, true);
  }

  result.items = items;
  if (items.length === 0) return result;

  const currentItemIds = new Set<string>([currentBook.id, ...currentContentIds, result.examId].filter(Boolean) as string[]);
  const currentItems = items.filter((i) => currentItemIds.has(i.item_id));
  const nextItems = items.filter((i) => !currentItemIds.has(i.item_id));

  if (nextItems.length) {
    const { error: nextErr } = await supabase.from('liberacoes_nucleo').upsert(nextItems, { onConflict: 'nucleo_id, item_id, item_type' });
    if (nextErr) throw nextErr;
  }
  if (currentItems.length) {
    const { error: curErr } = await supabase.from('liberacoes_nucleo').upsert(currentItems, { onConflict: 'nucleo_id, item_id, item_type' });
    if (curErr) throw curErr;
  }
  return result;
};
