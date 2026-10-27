import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { Course } from '../../../types/dashboard';
import { GRADUATION_CONFIG } from '../../../config/graduation';
import { collectExamAttempts, isModuleApproved, isModuleDP, isRecoveryUnlocked, getExamVersion, getModuleExamStatus } from '../../../lib/examRules';
import { areModuleTitlesEqual, normalizeModuleTitle, cleanModuleTitle } from '../utils/courseUtils';

const MEDIA_APROVACAO = 7.0;

const missingTables = new Set<string>();
const tableMissing = (name: string) => missingTables.has(name);
const markTableMissing = (name: string) => missingTables.add(name);

function extractTableName(query: any): string | null {
  try {
    const url: string = query?.url || '';
    const match = url.match(/\/rest\/v1\/([^?]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export const useStudentCourses = (profile: any) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [progressoAulas, setProgressoAulas] = useState<any[]>([]);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [finishedBasicCount, setFinishedBasicCount] = useState(0);
  const [finishedMediumCount, setFinishedMediumCount] = useState(0);
  const [isBasicFinished, setIsBasicFinished] = useState(false);

  const fetchStudentDashboardData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const isStaff = ['admin', 'professor', 'suporte', 'colaborador'].includes(profile?.tipo || '') ||
                      (profile?.caminhos_acesso || []).some((r: string) => ['admin', 'professor', 'suporte', 'colaborador'].includes(r));

      const safeSelect = async (queryPromise: PromiseLike<{ data: any; error: any }>) => {
        const tableName = extractTableName(queryPromise)
        if (tableName && tableMissing(tableName)) {
          console.warn(`[safeSelect] Table ${tableName} previously marked as missing, skipping query.`);
          return { data: null, error: null }
        }
        try {
          const r = await queryPromise
          if (r.error) {
            console.error(`[safeSelect] Error on table ${tableName}:`, r.error.message, r.error.code);
            if (r.error.code === '42P01' || r.error.code === 'PGRST205' || /does not exist/i.test(r.error.message)) {
              if (tableName) markTableMissing(tableName)
            }
            return { data: null, error: null }
          }
          return r
        } catch (e) {
          console.error(`[safeSelect] Exception on table ${tableName}:`, e);
          if (tableName) markTableMissing(tableName)
          return { data: null, error: null }
        }
      }

      const { data: releases } = await safeSelect(
        supabase
          .from('liberacoes_nucleo')
          .select('item_id, item_type, created_at, nucleo_id')
          .eq('liberado', true)
      );

      const studentNucleoId = profile?.nucleo_id;
      const releasesForStudentNucleo = studentNucleoId 
        ? (releases || []).filter((r: any) => r.nucleo_id === studentNucleoId)
        : [];

      const applicableReleases = (releases || []).filter((r: any) => {
        // Liberação global sem núcleo específico é válida para todos os alunos
        if (!r.nucleo_id) return true;
        // Liberação com núcleo específico só é válida para alunos daquele polo
        if (studentNucleoId && r.nucleo_id === studentNucleoId) return true;
        return false;
      });

      const { data: exams } = await safeSelect(supabase
        .from('aulas')
        .select('id, livro_id, tipo, titulo, is_bloco_final, professor_active, status_liberacao, data_liberacao, versao')
        .or('tipo.eq.prova,tipo.eq.avaliacao,is_bloco_final.eq.true,titulo.ilike.%V1%,titulo.ilike.%V2%,titulo.ilike.%V3%,titulo.ilike.%RECUPERA%'));

      const releasedModulos = new Set<string>(
        applicableReleases
          .filter((r: any) => r.item_type === 'modulo')
          .map((r: any) => r.item_id)
      );

      const releasedExamIds = new Set<string>(
        applicableReleases
          .filter((r: any) => ['atividade', 'prova', 'avaliacao'].includes(r.item_type))
          .map((r: any) => r.item_id)
      );

      const releasedItems = new Set<string>(
        applicableReleases
          .filter((r: any) => ['video', 'licao', 'atividade', 'prova', 'avaliacao'].includes(r.item_type))
          .map((r: any) => r.item_id)
      );

      const releasedExamBookIds = new Set<string>();
      if (exams) {
        exams.forEach((exam: any) => {
          const isEx = exam.is_bloco_final || exam.tipo === 'prova' || exam.tipo === 'avaliacao' || (exam.titulo && /V[1-3]|RECUPERA|AVALIA/i.test(exam.titulo));
          if (!isEx) return;

          const isRel = releasedExamIds.has(exam.id) || releasedItems.has(exam.id);
          const isProfActive = exam.professor_active === true;
          const isSched = exam.status_liberacao === true && (!exam.data_liberacao || new Date(exam.data_liberacao) <= new Date());

          if (isRel || isProfActive || isSched) {
            if (exam.livro_id) {
              releasedExamBookIds.add(exam.livro_id);
            }
          }
        });
      }

      const examReleaseDates: Record<string, string> = {};
      if (exams && applicableReleases) {
        exams.forEach((exam: any) => {
          const isEx = exam.is_bloco_final || exam.tipo === 'prova' || exam.tipo === 'avaliacao' || (exam.titulo && /V[1-3]|RECUPERA|AVALIA/i.test(exam.titulo));
          if (isEx) {
            const rel = (applicableReleases as any[]).find((r: any) => r.item_id === exam.id && r.item_type === 'atividade');
            if (rel) {
              if (!examReleaseDates[exam.livro_id]) {
                examReleaseDates[exam.livro_id] = rel.created_at;
              }
            }
          }
        });
      }

      const moduleReleaseDates: Record<string, string> = {};
      (applicableReleases || []).forEach((r: any) => {
        if (r.item_type === 'modulo' && !moduleReleaseDates[r.item_id]) {
          moduleReleaseDates[r.item_id] = r.created_at;
        }
      });

      const courseSelect = 'id, nome, nivel, livros(id, titulo, capa_url, ordem, curso_id, professor_active, aulas(id, titulo, tipo, versao, min_grade, ordem, nucleo_id, status_liberacao, data_liberacao, professor_active, is_bloco_final))';
      const { data: allCourses } = await safeSelect(
        supabase.from('cursos').select(courseSelect)
      );

      const normalizeTitle = (s: string) =>
        (s || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim()
          .replace(/[.,;:!?\s]+$/g, '')
          .replace(/\s+/g, ' ');

      const LEGACY_AULA_TO_BOOK_TITLE: Record<string, string> = {
        // Epístola aos Hebreus
        'cca138c2-f8fb-4e5a-ba5c-4cbda81f8eed': 'Epístola aos Hebreus',
        '778a7d2d-d046-475a-8f5d-5ea59700d883': 'Epístola aos Hebreus',
        '8e3c0dc6-e4cf-4500-9fd0-a9e900be2efe': 'Epístola aos Hebreus',
        '383653ae-1a79-4d2e-8509-579040bb1d0c': 'Epístola aos Hebreus',
        '446ee260-6bf3-4fd9-b52d-37c0a3fbd2ce': 'Epístola aos Hebreus',
        'ddc19cca-72c2-4207-ab1c-21a376f11bc6': 'Epístola aos Hebreus',
        '9d7adcf7-e64c-4dfd-9753-127f8d55e7c3': 'Epístola aos Hebreus',
        'dfead070-ffaa-47c8-8304-9a449290d535': 'Epístola aos Hebreus',
        '8706f108-5423-4ede-8598-f2e112073b22': 'Epístola aos Hebreus',
        '57b445f4-2e72-40ac-ad31-e2cafd3dc4f4': 'Epístola aos Hebreus',
        'df242323-1230-4f78-8d65-f0e75de30e24': 'Epístola aos Hebreus',
        '290b9208-4a8d-437e-b147-4ee11387755a': 'Epístola aos Hebreus',
        '8c8e7bac-182d-4df3-844d-fdb734107eaf': 'Epístola aos Hebreus',

        // Doutrina do Espírito Santo
        '30190d06-b324-4b77-8435-b2eb63e4e55f': 'Doutrina do Espírito Santo',
        'e6f7a766-dca2-46ec-b875-935a02f649b1': 'Doutrina do Espírito Santo',
        '8e3cbe49-a4d1-447f-bc29-468eb6e08fb3': 'Doutrina do Espírito Santo',
        '6f67ed3b-afda-4a96-8682-c986c247a005': 'Doutrina do Espírito Santo',
        '75fc97f7-1267-4dc2-85f6-ef4d3a1b2fd1': 'Doutrina do Espírito Santo',
        'aa8b52f0-7d8c-4649-a4a2-b67fde2e2cd9': 'Doutrina do Espírito Santo',
        '619a43d8-acf5-4c3b-b9b1-0037a5fbadb5': 'Doutrina do Espírito Santo',
        '7ac481f8-64f1-41f4-8836-33128e19f6fe': 'Doutrina do Espírito Santo',
        'bd8c55b6-3a9f-4fe3-abdb-d0fbf969432a': 'Doutrina do Espírito Santo',
        '52001439-da37-4844-8d35-69c132a2b1af': 'Doutrina do Espírito Santo',
        'c19572c2-10f0-45a3-abd4-6053f41fd22f': 'Doutrina do Espírito Santo',
        'edd1ce4c-4caa-442f-9195-e84d7274adc9': 'Doutrina do Espírito Santo',
        'c1141d36-657d-4b59-b2ee-bcd7901633e1': 'Doutrina do Espírito Santo',

        // Epístolas Paulinas I
        '0bdde13e-8848-4d49-a929-69b78acba92c': 'Epístolas Paulinas I',
        '0bf75491-7ad2-4d4d-b984-dfc815b32047': 'Epístolas Paulinas I',
        'acef2116-a948-47bb-8bcd-aa39adcd7f7e': 'Epístolas Paulinas I',
        '69b6d4dd-0ddc-45ad-86d9-e169c04f8305': 'Epístolas Paulinas I',
        'd645a78d-aacf-4743-9e7e-313916f31ebb': 'Epístolas Paulinas I',
        'd9246788-96a5-4bb9-8fab-e4a9413ea283': 'Epístolas Paulinas I',
        'abd7ec76-2471-4cb9-876e-e09808f23344': 'Epístolas Paulinas I',
        '0e6f076a-33ad-4cda-bdbd-49e32ed7d006': 'Epístolas Paulinas I',
        '92655b42-54a5-4498-8d1e-468e9d171a30': 'Epístolas Paulinas I',
        '836017e9-87c9-42da-9dd0-756e11772487': 'Epístolas Paulinas I',
        '6fd1a301-0c59-4518-90c1-52ea0d7816e2': 'Epístolas Paulinas I',
        '6f6b3a55-83a7-4312-babf-d477a75f65af': 'Epístolas Paulinas I',
        '5e5b10f9-ee50-4b2f-a63f-35fa8dc8949b': 'Epístolas Paulinas I',

        // Teologia Prática
        '7b545e0f-8322-4256-9de6-45fedbb6b4f3': 'Teologia Prática',
        'd678cd76-1908-472e-9492-e2d5f421c133': 'Teologia Prática',
        '87c5880c-22b7-47ef-bd16-7d4f69264377': 'Teologia Prática',
        'da9c29c8-9fcb-485b-a6f7-01e0e0f66013': 'Teologia Prática',
        'dc69dd9d-b525-4a3c-9698-8a61acff4149': 'Teologia Prática',
        '4e4e8a9d-9815-446f-9cd4-0189e77debf4': 'Teologia Prática',
        '44e83075-58b7-473d-a95d-de6f94d85df2': 'Teologia Prática',
        '21b42fe6-3bca-447e-b3e3-f2f26bdc090d': 'Teologia Prática',
        'e68ce31d-0b5f-4b28-8070-6e80e701f7d7': 'Teologia Prática',
        '199d5b3e-9697-4620-8b72-fea1aedf106e': 'Teologia Prática'
      };

      const ONLINE_MODULE_TITLES = [
        'epistola aos hebreus',
        'epistolas aos hebreus',
        'hebreus',
        'doutrina do espirito santo',
        'espirito santo',
        'epistolas paulinas i',
        'epistola paulina i',
        'epistolas paulinas 1',
        'paulinas i',
        'teologia pratica',
        'historia da igreja',
        'cristologia'
      ];

      const isOnlineCourseModule = (title: string): boolean => {
        const norm = normalizeTitle(title);
        return ONLINE_MODULE_TITLES.some(m => norm === m || norm.includes(m) || m.includes(norm));
      };

      const aulasMap: Record<string, any> = {};
      const livrosMap: Record<string, any> = {};
      const cursosNivelMap: Record<string, string> = {};
      const titleToBook: Record<string, any> = {};
      const normalizedTitleToBook: Record<string, any> = {};

      if (allCourses) {
        allCourses.forEach((c: any) => {
          cursosNivelMap[c.id] = c.nivel;
          (c.livros || []).forEach((l: any) => {
            livrosMap[l.id] = { ...l, curso_id: c.id };
            titleToBook[l.titulo] = { ...l, curso_nivel: c.nivel };
            normalizedTitleToBook[normalizeTitle(l.titulo)] = { ...l, curso_nivel: c.nivel };
            (l.aulas || []).forEach((a: any) => {
              aulasMap[a.id] = { ...a, livro_id: l.id };
            });
          });
        });
      }

      const matchBookByTitle = (title: string) => {
        if (!title) return null;
        if (titleToBook[title]) return titleToBook[title];
        const allBooks = Object.values(livrosMap) as any[];
        return allBooks.find(b => areModuleTitlesEqual(b.titulo, title)) || null;
      };

      const { data: resDataRaw } = await safeSelect(supabase
        .from('respostas_aulas')
        .select('id, aula_id, nota, status, tentativas, created_at, updated_at, comentario_professor, primeira_correcao_at, respostas')
        .eq('aluno_id', profile.id));

      const aulaIds = Array.from(new Set<string>((resDataRaw || []).map((r: any) => r.aula_id).filter(Boolean)));
      const missingAulaIds = aulaIds.filter((id: string) => !aulasMap[id]);

      if (missingAulaIds.length > 0) {
        const { data: missingAulasData } = await safeSelect(supabase
          .from('aulas')
          .select('id, titulo, tipo, versao, min_grade, status_liberacao, data_liberacao, professor_active, questionario, livro_id, is_bloco_final')
          .in('id', missingAulaIds));
        (missingAulasData || []).forEach((a: any) => {
          aulasMap[a.id] = a;
          if (a.livro_id && !livrosMap[a.livro_id]) {
            livrosMap[a.livro_id] = { id: a.livro_id, titulo: a.titulo };
          }
        });
      }

      const resData = (resDataRaw || []).map((r: any) => {
        let aula = aulasMap[r.aula_id];
        let livro = aula ? livrosMap[aula.livro_id] : null;

        // Se aula não foi encontrada diretamente pelo ID, busca em aulasMap
        if (!aula && r.aula_id) {
          for (const a of Object.values(aulasMap)) {
            if (a.id === r.aula_id) {
              aula = a;
              livro = livrosMap[a.livro_id];
              break;
            }
          }
        }

        // Se ainda não encontrou livro, tenta mapeamento de IDs legados
        if (!livro && r.aula_id && LEGACY_AULA_TO_BOOK_TITLE[r.aula_id]) {
          const targetTitle = LEGACY_AULA_TO_BOOK_TITLE[r.aula_id];
          const matchedBook = matchBookByTitle(targetTitle);
          if (matchedBook) {
            livro = matchedBook;
            if (!aula) {
              const examAula = matchedBook.aulas?.find((a: any) => a.tipo === 'prova' || a.is_bloco_final) || matchedBook.aulas?.[0];
              aula = examAula || {
                id: r.aula_id,
                titulo: targetTitle + ' - Avaliação Online',
                tipo: 'prova',
                is_bloco_final: true,
                livro_id: matchedBook.id,
                min_grade: 7
              };
            }
          }
        }

        const nivel = livro ? (cursosNivelMap[livro.curso_id] || livro.curso_nivel) : null;

        return {
          ...r,
          submission_id: r.id,
          lesson_id: r.aula_id,
          lesson_title: aula?.titulo,
          lesson_type: aula?.tipo || 'prova',
          is_bloco_final: aula?.is_bloco_final,
          book_id: livro?.id,
          book_title: livro?.titulo,
          curso_nivel: nivel,
          submitted_at: r.created_at,
          aulas: aula ? { ...aula, livros: livro ? { ...livro, cursos: { nivel } } : null } : null
        };
      });

      const { data: progData } = await safeSelect(supabase.from('progresso').select('aula_id, concluida').eq('aluno_id', profile.id));
      const { data: exceptions } = await safeSelect(supabase.from('liberacoes_excecao').select('livro_id').eq('user_id', profile.id));
      const { data: examExceptions } = await safeSelect(supabase.from('liberacoes_excecao_atividade').select('aula_id').eq('user_id', profile.id));
      const { data: exclusions } = await safeSelect(supabase.from('exclusoes_modulo_aluno').select('livro_id, motivo').eq('user_id', profile.id));
      const { data: historyGradesRaw } = await safeSelect(
        supabase.from('historico_notas').select('id, modulo_nome, curso_nome, nota, data_conclusao').eq('aluno_id', profile.id)
      );
      const userEmail = (profile.email || '').toLowerCase().trim();
      const { data: alumniData } = await safeSelect(
        supabase
          .from('registros_alumni')
          .select('id, nome, curso, nivel_curso, status_aprovacao, historico, user_id')
          .or(`user_id.eq.${profile.id}${userEmail ? `,email.eq.${userEmail}` : ''}`)
      );

      const historyGrades: Array<{ id?: string; modulo_nome: string; curso_nome?: string; nota: number; data_conclusao?: string }> = [
        ...(historyGradesRaw || []).map((h: any) => ({
          id: h.id,
          modulo_nome: h.modulo_nome,
          curso_nome: h.curso_nome,
          nota: Number(h.nota),
          data_conclusao: h.data_conclusao
        }))
      ];

      // Mesclar notas manuais de registros_alumni.historico se existirem (apenas com nota numérica real)
      (alumniData || []).forEach((a: any) => {
        if (Array.isArray(a.historico)) {
          a.historico.forEach((item: any, idx: number) => {
            if (item && item.modulo && item.nota != null && String(item.nota).trim() !== '') {
              const numNota = parseFloat(String(item.nota).replace(',', '.'));
              if (!isNaN(numNota)) {
                const exists = historyGrades.some(h => areModuleTitlesEqual(h.modulo_nome, item.modulo));
                if (!exists) {
                  historyGrades.push({
                    id: `alumni-${a.id}-${idx}`,
                    modulo_nome: item.modulo,
                    curso_nome: a.curso,
                    nota: numNota,
                    data_conclusao: item.data
                  });
                }
              }
            }
          });
        }
      });

      const isAlumniApproved = profile?.tipo === 'ex_aluno' || (alumniData || []).some((a: any) => a.status_aprovacao === 'aprovado');

      const exceptionIds = (exceptions || []).map((e: any) => e.livro_id);
      const examExceptionIds = (examExceptions || []).map((e: any) => e.aula_id);
      const studentExclusions = (exclusions || []).map((e: any) => e.livro_id);
      const hasHiatoExclusion = (exclusions || []).some((e: any) => e.motivo === 'hiato');
      const isHiatoStudent = profile?.status_nucleo === 'hiato' || profile?.status_nucleo === 'trancado' || hasHiatoExclusion;

      if (exams && examExceptionIds.length > 0) {
        exams.forEach((exam: any) => {
          if (examExceptionIds.includes(exam.id) && exam.livro_id) {
            releasedExamBookIds.add(exam.livro_id);
          }
        });
      }
      
      // Mapear módulos finalizados manualmente no perfil
      // NOTA: Apenas módulos com nota oficial comprovada (em historico_notas, registros_alumni ou respostas_aulas)
      // são considerados finalizados. IDs sem notas lançadas por administrador não são computados.
      const manualCompletedModuleIds = (profile?.modulos_finalizados_manual || []) as string[];
      const manualCompleted = new Set<string>();
      const manualBasicModules = new Set<string>();
      const manualMediumModules = new Set<string>();

      manualCompletedModuleIds.forEach(manualId => {
        const book = livrosMap[manualId];
        if (!book) return;
        // Não permite auto-conclusão sem nota
        const hasHistoryNote = historyGrades.some(h => {
          const num = Number(h.nota);
          if (isNaN(num) || num < 7) return false;
          const b = matchBookByTitle(h.modulo_nome);
          return b && b.id === manualId;
        });
        const hasOnlinePass = (resDataRaw || []).some((r: any) => {
          return r.status === 'corrigida' && (r.nota || 0) >= 7 && (
            r.aula_id && aulasMap[r.aula_id]?.livro_id === manualId
          );
        });
        if (hasHistoryNote || hasOnlinePass) {
          manualCompleted.add(manualId);
          const nivel = cursosNivelMap[book.curso_id] || book.curso_nivel;
          if (nivel?.toLowerCase().includes('basico') || nivel?.toLowerCase().includes('básico')) {
            manualBasicModules.add(manualId);
          } else if (nivel?.toLowerCase().includes('medio') || nivel?.toLowerCase().includes('médio')) {
            manualMediumModules.add(manualId);
          }
        }
      });

      // Mapear e adicionar historyGrades aos conjuntos de finalização manual E injetar em resData
      (historyGrades || []).forEach((h: any, idx: number) => {
        if (!h || h.nota == null) return;
        const numNota = Number(h.nota);
        if (isNaN(numNota)) return;
        let book = matchBookByTitle(h.modulo_nome);
        if (book && numNota >= 7) {
          manualCompleted.add(book.id);
          if (book.curso_nivel?.toLowerCase().includes('basico') || book.curso_nivel?.toLowerCase().includes('básico')) {
            manualBasicModules.add(book.id);
          } else if (book.curso_nivel?.toLowerCase().includes('medio') || book.curso_nivel?.toLowerCase().includes('médio')) {
            manualMediumModules.add(book.id);
          }
        }

        // Injetar em resData para que conste em atividades em todos os painéis e boletins
        const existingIdx = resData.findIndex((r: any) => 
          (book && r.book_id === book.id) || 
          areModuleTitlesEqual(r.lesson_title || r.book_title || '', h.modulo_nome)
        );

        const syntheticAula = book?.aulas?.find((a: any) => a.tipo === 'prova' || a.is_bloco_final) || book?.aulas?.[0];
        const syntheticSubmission = {
          id: `manual-${idx}-${h.modulo_nome}`,
          submission_id: `manual-${idx}-${h.modulo_nome}`,
          aluno_id: profile.id,
          aula_id: syntheticAula?.id || `manual-aula-${idx}`,
          lesson_id: syntheticAula?.id || `manual-aula-${idx}`,
          lesson_title: h.modulo_nome,
          lesson_type: 'prova',
          is_bloco_final: true,
          status: 'corrigida',
          nota: numNota,
          min_grade: 7,
          book_id: book?.id || null,
          book_title: book?.titulo || h.modulo_nome,
          curso_nivel: book?.curso_nivel || 'basico',
          created_at: h.data_conclusao || new Date().toISOString(),
          submitted_at: h.data_conclusao || new Date().toISOString(),
          is_manual: true,
          modulo_nome: h.modulo_nome,
          aulas: {
            id: syntheticAula?.id || `manual-aula-${idx}`,
            titulo: h.modulo_nome,
            tipo: 'prova',
            min_grade: 7,
            is_bloco_final: true,
            livros: book ? { ...book, cursos: { nivel: book.curso_nivel } } : null
          }
        };

        if (existingIdx === -1) {
          resData.push(syntheticSubmission);
        } else if (resData[existingIdx].nota === null || resData[existingIdx].nota === undefined || Number(resData[existingIdx].nota) < numNota) {
          resData[existingIdx] = {
            ...resData[existingIdx],
            nota: numNota,
            status: 'corrigida',
            is_manual: true
          };
        }
      });

      // Helper: verifica se o aluno já começou o módulo (submissões OU aulas assistidas).
      const userHasActivityInModule = (livroId: string, aulaIdsList: string[] = []) => {
        return resData.some((res: any) => res.book_id === livroId)
          || (progData || []).some((p: any) => aulaIdsList.includes(p.aula_id));
      };

      setAtividades(resData);
      setProgressoAulas(progData || []);

      const finishedBasicModules = new Set((resData || [])
        .filter((r: any) => {
          const isEx = r.is_bloco_final || r.lesson_type === 'prova' || r.lesson_type === 'avaliacao' || r.aulas?.tipo === 'prova' || r.aulas?.tipo === 'avaliacao';
          const minGrade = r.aulas?.min_grade || 7.0;
          return isEx && r.status === 'corrigida' && (r.nota || 0) >= minGrade && (r.aulas?.livros?.cursos?.nivel?.toLowerCase().includes('basico') || r.aulas?.livros?.cursos?.nivel?.toLowerCase().includes('básico'))
        })
        .map((r: any) => r.book_id)
        .filter(Boolean)
      );
      
      // Merge manual completions with actual completions
      manualBasicModules.forEach(id => finishedBasicModules.add(id));

      const finishedMediumModules = new Set((resData || [])
        .filter((r: any) => {
          const isEx = r.is_bloco_final || r.lesson_type === 'prova' || r.lesson_type === 'avaliacao' || r.aulas?.tipo === 'prova' || r.aulas?.tipo === 'avaliacao';
          const minGrade = r.aulas?.min_grade || 7.0;
          return isEx && r.status === 'corrigida' && (r.nota || 0) >= minGrade && (r.aulas?.livros?.cursos?.nivel?.toLowerCase().includes('medio') || r.aulas?.livros?.cursos?.nivel?.toLowerCase().includes('médio'))
        })
        .map((r: any) => r.book_id)
        .filter(Boolean)
      );

      // Merge com todas as notas de histórico aprovadas (secretaria + alumni)
      (historyGrades || []).forEach(h => {
        const numNota = Number(h.nota);
        if (!isNaN(numNota) && numNota >= 7.0) {
          const matchedBook = matchBookByTitle(h.modulo_nome);
          const bookId = matchedBook ? matchedBook.id : `history-${cleanModuleTitle(h.modulo_nome)}`;
          const nivel = matchedBook ? (cursosNivelMap[matchedBook.curso_id] || matchedBook.curso_nivel) : (h.curso_nome || h.modulo_nome);
          const normNivel = (nivel || '').toLowerCase();
          
          if (normNivel.includes('medio') || normNivel.includes('médio')) {
            finishedMediumModules.add(bookId);
          } else {
            finishedBasicModules.add(bookId);
          }
        }
      });

      // Merge manual completions with actual completions
      manualMediumModules.forEach(id => finishedMediumModules.add(id));

      let fBasicCount = finishedBasicModules.size;
      let fMediumCount = finishedMediumModules.size;

      // Se o aluno é formado oficial (registros_alumni aprovado ou perfil ex_aluno),
      // garante o cômputo dos módulos correspondentes para evitar divergência nos painéis
      if (isAlumniApproved) {
        const isAlumniMedio = (alumniData || []).some((a: any) => (a.nivel_curso || '').toLowerCase().includes('méd'));
        fBasicCount = Math.max(fBasicCount, GRADUATION_CONFIG.basico.requiredModules);
        if (isAlumniMedio) {
          fMediumCount = Math.max(fMediumCount, GRADUATION_CONFIG.medio.requiredModules);
        }
      }

      setFinishedBasicCount(fBasicCount);
      setFinishedMediumCount(fMediumCount);
      const isFinished = fBasicCount >= GRADUATION_CONFIG.basico.requiredModules;
      setIsBasicFinished(isFinished);

      if (allCourses && allCourses.length > 0) {
        const mappedCourses: Course[] = allCourses.map((c: any) => {
          const sortedLivros = (c.livros || []).sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));
          const isBasicCourse = (c.nivel || '').toLowerCase().includes('basico') || (c.nivel || '').toLowerCase().includes('básico') || (c.nome || '').toLowerCase().includes('básico');
          const isMedium = (c.nivel || '').toLowerCase().includes('medio') || (c.nivel || '').toLowerCase().includes('médio');
          const levelLocked = isMedium && !isBasicFinished && !isAlumniApproved && !isStaff;

          // =========================================================================
          // HIERARQUIA MODULAR INSTITUCIONAL FATESA:
          // Regra Mestra:
          // 1. Liberação individual de módulos (liberacoes_excecao) tem prioridade total.
          // 2. Módulos em Dependência (DP) permanecem abertos para recuperação e estudo.
          // 3. Bibliologia DEVE PERMANECER FECHADO até que os professores o liberem.
          // 4. Alunos em HIATO/Trancados: mantêm o módulo em andamento, mas são bloqueados no seguinte.
          // =========================================================================

          const isBibliologiaBook = (book: any) => {
            if (!book) return false;
            const norm = cleanModuleTitle(book.titulo || '');
            return norm === 'bibliologia' || norm.includes('bibliologia') || book.id === 'cd525251-b438-4e21-aaea-bd5578017698';
          };

          const bookStatusMap = new Map<string, {
            examReleased: boolean;
            studentAttempted: boolean;
            isApproved: boolean;
            isDP: boolean;
            isManualFinished: boolean;
            isProfessorReleased: boolean;
            isBibliologiaReleasedForPolo: boolean;
            hasExcep: boolean;
            isBibliologia: boolean;
          }>();

          sortedLivros.forEach((l: any) => {
            const hasExcep = exceptionIds.includes(l.id);
            const isBib = isBibliologiaBook(l);

            // Liberação específica para o polo do aluno na tabela liberacoes_nucleo (item_type = 'modulo')
            const hasPoloSpecificRelease = studentNucleoId 
              ? releasesForStudentNucleo.some((r: any) => r.item_id === l.id && r.item_type === 'modulo')
              : false;

            // Liberação geral de polo (específica do núcleo ou global se o aluno não tiver polo cadastrado)
            const hasPoloRelease = studentNucleoId 
              ? hasPoloSpecificRelease 
              : releasedModulos.has(l.id);

            // Módulo ativo pelo professor (se professor_active === false, o professor desativou expressamente)
            const isNotBlockedByProfessor = l.professor_active !== false;

            // Regra Bibliologia:
            // Bibliologia DEVE PERMANECER FECHADO até que o professor o libere explicitamente para o núcleo do aluno
            const isBibliologiaReleasedForPolo = isBib && hasPoloSpecificRelease && isNotBlockedByProfessor;

            // Módulo regular: liberado pelo professor para o núcleo e não desativado
            const isProfessorReleased = isNotBlockedByProfessor && (
              isBib ? isBibliologiaReleasedForPolo : hasPoloRelease
            );

            const histMatch = historyGrades.find((h: any) => areModuleTitlesEqual(h.modulo_nome, l.titulo));
            const hasValidHistoryGrade = !!histMatch && Number(histMatch.nota) >= 7;
            const hasHistoryDP = !!histMatch && Number(histMatch.nota) > 0 && Number(histMatch.nota) < 7;
            const isManualFinished = manualCompleted.has(l.id) || hasValidHistoryGrade;

            const moduleSubs = resData.filter((s: any) => s.book_id === l.id);
            const moduleExamAttempts = collectExamAttempts(l.aulas || [], moduleSubs);
            const isApproved = isModuleApproved(moduleExamAttempts) || hasValidHistoryGrade;
            const isDP = !isStaff && (isModuleDP(moduleExamAttempts) || hasHistoryDP);

            const examReleased = releasedExamBookIds.has(l.id) || (l.aulas || []).some((a: any) => {
              const isEx = a.tipo === 'prova' || a.tipo === 'avaliacao' || !!a.is_bloco_final || (a.titulo && /V[1-3]|RECUPERA|AVALIA/i.test(a.titulo));
              return isEx && (
                releasedExamIds.has(a.id) || 
                releasedItems.has(a.id) || 
                a.professor_active === true || 
                examExceptionIds.includes(a.id) ||
                (a.status_liberacao === true && (!a.data_liberacao || new Date(a.data_liberacao) <= new Date()))
              );
            });

            // Submissão de avaliação (passou ou reprovou) OU aulas assistidas
            const userActivity = userHasActivityInModule(l.id, (l.aulas || []).map((a: any) => a.id));
            const studentAttempted = moduleExamAttempts.length > 0 || moduleSubs.length > 0 || userActivity;

            bookStatusMap.set(l.id, {
              examReleased,
              studentAttempted,
              isApproved,
              isDP,
              isManualFinished,
              isProfessorReleased,
              isBibliologiaReleasedForPolo,
              hasExcep,
              isBibliologia: isBib
            });
          });

          const unlockedBookIds = new Set<string>();

          // Staff (admin, professor, colaborador): desbloqueia todos para conferência e gestão
          if (isStaff) {
            sortedLivros.forEach((l: any) => unlockedBookIds.add(l.id));
          } else {
            sortedLivros.forEach((l: any) => {
              const st = bookStatusMap.get(l.id);
              if (!st) return;

              // 1. Liberação individual de módulos (liberacoes_excecao):
              // Alunos em transição pré-plataforma ou com permissão especial individual da secretaria
              if (st.hasExcep) {
                unlockedBookIds.add(l.id);
                return;
              }

              // 2. Módulos já concluídos / aprovados (plataforma ou histórico escolar):
              // Permanecem abertos para revisão de aulas e consulta no boletim
              if (st.isApproved || st.isManualFinished) {
                unlockedBookIds.add(l.id);
                return;
              }

              // 3. Módulos em Dependência (DP):
              // Permanecem abertos para o aluno estudar as lições e realizar a prova de recuperação (V2/V3)
              if (st.isDP) {
                unlockedBookIds.add(l.id);
                return;
              }

              // 4. Alunos em HIATO / Trancados:
              // Mantêm acesso aos módulos concluídos e ao módulo que estiverem cursando atualmente,
              // mas são bloqueados de abrir novos módulos.
              if (isHiatoStudent) {
                if (st.studentAttempted && !st.isApproved && !studentExclusions.includes(l.id)) {
                  unlockedBookIds.add(l.id);
                }
                return;
              }

              // 5. Módulos liberados pelo professor para a turma / núcleo:
              // Só abre se o professor tiver liberado expressamente na tabela liberacoes_nucleo
              // e respeitando pré-requisito de nível (Básico antes de Médio).
              if (!levelLocked && st.isProfessorReleased) {
                if (st.isBibliologia) {
                  // Bibliologia só abre se o professor liberou expressamente para o polo deste aluno
                  if (st.isBibliologiaReleasedForPolo) {
                    unlockedBookIds.add(l.id);
                  }
                } else {
                  unlockedBookIds.add(l.id);
                }
                return;
              }
            });
          }

          return {
            id: c.id,
            nome: c.nome,
            nivel: c.nivel,
            livros: sortedLivros.map((l: any) => {
              const histMatch = historyGrades.find((h: any) => areModuleTitlesEqual(h.modulo_nome, l.titulo));
              const hasValidHistoryGrade = !!histMatch && Number(histMatch.nota) >= 7;
              const isManualFinished = manualCompleted.has(l.id) || hasValidHistoryGrade;

              const moduleSubs = resData.filter((s: any) => s.book_id === l.id);
              const moduleExamAttempts = collectExamAttempts(l.aulas || [], moduleSubs);

              const isApproved = isModuleApproved(moduleExamAttempts) || hasValidHistoryGrade;
              const isDP = !isStaff && isModuleDP(moduleExamAttempts);

              // Módulo em manutenção: apenas se NÃO houver aulas cadastradas no módulo
              const hasAnyAulasInModule = (l.aulas || []).length > 0;
              const hasExamInModule = (l.aulas || []).some((a: any) =>
                a.tipo === 'prova' || a.tipo === 'avaliacao' || a.is_bloco_final
              );
              const isMaintenanceModule = !hasAnyAulasInModule && !isManualFinished && !isApproved;
              const moduleFinished = (isApproved || isManualFinished) && !isMaintenanceModule;

              const hasException = exceptionIds.includes(l.id);
              const isUnlockedByHierarchy = unlockedBookIds.has(l.id);

              const effectivelyLevelLocked = levelLocked && !hasException && !isManualFinished;
              const isUnlocked = isUnlockedByHierarchy && !effectivelyLevelLocked;
              const isReleased = isUnlocked;
              const isCurrent = isUnlocked && !moduleFinished;

              const isExcluded = studentExclusions.includes(l.id);
              if (isExcluded && !isStaff && !hasException) {
                return null;
              }

              // Módulos bloqueados por pré-requisito de nível (ex: Médio sem concluir Básico)
              if (effectivelyLevelLocked && !isUnlocked) {
                return null;
              }

              const finalFinished = moduleFinished;
              const finalApproved = isApproved;
              const finalUnlocked = isUnlocked;
              const finalReleased = isReleased;

              return {
                ...l,
                isMaintenanceModule,
                hasExamInModule,
                hasAnyAulasInModule,
                aulas: [...(l.aulas || [])]
                  .sort((a: any, b: any) => {
                    if (a.ordem !== b.ordem) return (a.ordem || 0) - (b.ordem || 0);
                    return (a.titulo || '').localeCompare(b.titulo || '', 'pt-BR', { numeric: true, sensitivity: 'base' });
                  })
                  .map((a: any) => {
                    if (isStaff) return { ...a, lockedByProfessor: false };
                    const isExamType = a.tipo === 'prova' || a.tipo === 'avaliacao' || !!a.is_bloco_final;
                    const hasStudentSubmission = (resData || []).some((r: any) => r.aula_id === a.id || r.lesson_id === a.id);
                    const matchesNucleo = isStaff || 
                      !a.nucleo_id || 
                      !profile?.nucleo_id || 
                      a.nucleo_id === profile?.nucleo_id || 
                      a.tipo === 'licao' || 
                      a.tipo === 'material' ||
                      isExamType || 
                      hasStudentSubmission ||
                      releasesForStudentNucleo.length === 0;
                    if (!matchesNucleo) return { ...a, isHidden: true };

                    return { 
                      ...a, 
                      lockedByProfessor: false, 
                      isHidden: false,
                      status_liberacao: a.status_liberacao,
                      data_liberacao: a.data_liberacao,
                      professor_active: a.professor_active
                    };
                  }).map(a => {
                    const isExamType = a.tipo === 'prova' || a.tipo === 'avaliacao' || !!a.is_bloco_final;
                    const hasStudentSubmission = (resData || []).some((r: any) => r.aula_id === a.id || r.lesson_id === a.id);

                    // Provas: V2 e V3 só aparecem se a versão anterior tiver sido reprovada
                    if (isExamType && !isStaff && !finalFinished && !hasStudentSubmission) {
                      const versao = getExamVersion(a);
                      if (versao > 1 && !isRecoveryUnlocked(versao, moduleExamAttempts)) {
                        return { ...a, isHidden: true };
                      }
                    }
                    return a;
                  }).filter((a: any) => !a.isHidden),
                isReleased: finalReleased,
                isCurrent: isCurrent && finalReleased && !finalFinished,
                isUnlocked: finalUnlocked,
                isFinished: finalFinished,
                isApproved: finalApproved,
                isDP: isDP,
                notaHistorico: histMatch ? Number(histMatch.nota) : undefined,
                nota: histMatch ? Number(histMatch.nota) : (isApproved && moduleExamAttempts.length > 0 ? getModuleExamStatus(l.aulas || [], moduleSubs).examGrade : undefined)
              };
            }).filter(Boolean)
          };
        }).filter(Boolean);
        setCourses(mappedCourses);
      } else {
        console.warn('[useStudentCourses] allCourses is empty or null!', allCourses);
        setCourses([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    profile?.id, 
    profile?.curso_id, 
    profile?.nucleo_id, 
    profile?.tipo, 
    profile?.bolsista,
    profile?.acesso_definitivo,
    profile?.caminhos_acesso, 
    profile?.created_at,
    profile?.modulos_finalizados_manual,
    profile?.status_nucleo
  ]);

  return {
    courses,
    progressoAulas,
    atividades,
    loading,
    fetchStudentDashboardData,
    finishedBasicCount,
    finishedMediumCount,
    isBasicFinished,
    verificarAcessoProva: async (alunoId: string, livroId: string, provaDesejada: 'V1' | 'V2' | 'V3'): Promise<boolean> => {
      if (provaDesejada === 'V1') {
        const { data: aulaV1 } = await supabase
          .from('aulas')
          .select('id')
          .eq('livro_id', livroId)
          .or('tipo.eq.prova,tipo.eq.avaliacao,is_bloco_final.eq.true')
          .eq('versao', 1)
          .single();

        if (!aulaV1) return false;

        const { data: progresso } = await supabase
          .from('progresso')
          .select('concluida')
          .eq('aluno_id', alunoId)
          .eq('aula_id', aulaV1.id)
          .single();

        return progresso?.concluida === true;
      }

      const provaAnterior = provaDesejada === 'V3' ? 'V2' : 'V1';
      const versaoAnterior = provaAnterior === 'V2' ? 2 : 1;

      const { data: aulaAnterior } = await supabase
        .from('aulas')
        .select('id')
        .eq('livro_id', livroId)
        .or('tipo.eq.prova,tipo.eq.avaliacao,is_bloco_final.eq.true')
        .eq('versao', versaoAnterior)
        .single();

      if (!aulaAnterior) return false;

      const { data: resultadoAnterior } = await supabase
        .from('respostas_aulas')
        .select('nota, status')
        .eq('aluno_id', alunoId)
        .eq('aula_id', aulaAnterior.id)
        .single();

      if (!resultadoAnterior || resultadoAnterior.status !== 'corrigida') {
        return false;
      }

      return resultadoAnterior.nota < MEDIA_APROVACAO;
    }
  };
};
