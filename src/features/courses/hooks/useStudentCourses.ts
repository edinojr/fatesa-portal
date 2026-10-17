import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { Course } from '../../../types/dashboard';
import { GRADUATION_CONFIG } from '../../../config/graduation';
import { collectExamAttempts, isModuleApproved, isModuleDP, isRecoveryUnlocked, getExamVersion, getModuleExamStatus } from '../../../lib/examRules';

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
        if (!r.nucleo_id || !studentNucleoId || r.nucleo_id === studentNucleoId) return true;
        // Se o polo do aluno não tem liberações cadastradas, herda as liberações existentes (ex: SEDE ou gerais)
        return releasesForStudentNucleo.length === 0;
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
      if (exams && releases) {
        exams.forEach((exam: any) => {
          const isEx = exam.is_bloco_final || exam.tipo === 'prova' || exam.tipo === 'avaliacao' || (exam.titulo && /V[1-3]|RECUPERA|AVALIA/i.test(exam.titulo));
          if (isEx) {
            const rel = (releases as any[]).find((r: any) => r.item_id === exam.id && r.item_type === 'atividade');
            if (rel) {
              if (!examReleaseDates[exam.livro_id]) {
                examReleaseDates[exam.livro_id] = rel.created_at;
              }
            }
          }
        });
      }

      const moduleReleaseDates: Record<string, string> = {};
      (releases || []).forEach((r: any) => {
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
        let nivel = livro ? cursosNivelMap[livro.curso_id] : null;

        // Se aula não foi encontrada diretamente pelo ID, busca por título
        if (!aula && r.aula_id) {
          for (const a of Object.values(aulasMap)) {
            if (a.id === r.aula_id) {
              aula = a;
              livro = livrosMap[a.livro_id];
              nivel = livro ? cursosNivelMap[livro.curso_id] : null;
              break;
            }
          }
        }

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
      const { data: exclusions } = await safeSelect(supabase.from('exclusoes_modulo_aluno').select('livro_id').eq('user_id', profile.id));
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

      // Mesclar notas manuais de registros_alumni.historico se existirem
      (alumniData || []).forEach((a: any) => {
        if (Array.isArray(a.historico)) {
          a.historico.forEach((item: any, idx: number) => {
            if (item && item.modulo && item.nota != null) {
              const numNota = parseFloat(String(item.nota).replace(',', '.'));
              if (!isNaN(numNota)) {
                const normM = normalizeTitle(item.modulo);
                const exists = historyGrades.some(h => normalizeTitle(h.modulo_nome) === normM);
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

      if (exams && examExceptionIds.length > 0) {
        exams.forEach((exam: any) => {
          if (examExceptionIds.includes(exam.id) && exam.livro_id) {
            releasedExamBookIds.add(exam.livro_id);
          }
        });
      }
      
      // Get manually completed modules from user profile
      const manualCompletedModuleIds = (profile?.modulos_finalizados_manual || []) as string[];
      const manualCompleted = new Set(manualCompletedModuleIds);
      const manualBasicModules = new Set<string>();
      const manualMediumModules = new Set<string>();

      manualCompletedModuleIds.forEach(manualId => {
        const book = livrosMap[manualId];
        if (book) {
          const nivel = cursosNivelMap[book.curso_id];
          if (nivel?.toLowerCase().includes('basico') || nivel?.toLowerCase().includes('básico')) {
            manualBasicModules.add(manualId);
          } else if (nivel?.toLowerCase().includes('medio') || nivel?.toLowerCase().includes('médio')) {
            manualMediumModules.add(manualId);
          }
        }
      });

      if (allCourses) {
        allCourses.forEach((c: any) => {
          const isBasicNivel = (c.nivel || '').toLowerCase().includes('basico') || (c.nivel || '').toLowerCase().includes('básico') || (c.nome || '').toLowerCase().includes('básico');
          (c.livros || []).forEach((l: any) => {
            if (isAlumniApproved && isBasicNivel) {
              manualCompleted.add(l.id);
              manualBasicModules.add(l.id);
            }
          });
        });
      }

      // Mapear e adicionar historyGrades aos conjuntos de finalização manual E injetar em resData
      (historyGrades || []).forEach((h: any, idx: number) => {
        if (!h || h.nota == null) return;
        const numNota = Number(h.nota);
        let book = titleToBook[h.modulo_nome] || normalizedTitleToBook[normalizeTitle(h.modulo_nome)];
        if (!book) {
          const histNorm = normalizeTitle(h.modulo_nome);
          for (const b of Object.values(normalizedTitleToBook) as any[]) {
            const bookNorm = normalizeTitle(b.titulo);
            if (bookNorm === histNorm || bookNorm.includes(histNorm) || histNorm.includes(bookNorm)) {
              book = b;
              break;
            }
          }
        }
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
          normalizeTitle(r.lesson_title || r.book_title || '') === normalizeTitle(h.modulo_nome)
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
      );
      
      // Merge manual completions with actual completions
      manualBasicModules.forEach(id => finishedBasicModules.add(id));

      const fBasicCount = Math.max(finishedBasicModules.size, isAlumniApproved ? GRADUATION_CONFIG.basico.requiredModules : 0);
      setFinishedBasicCount(fBasicCount);

      const finishedMediumModules = new Set((resData || [])
        .filter((r: any) => {
          const isEx = r.is_bloco_final || r.lesson_type === 'prova' || r.lesson_type === 'avaliacao' || r.aulas?.tipo === 'prova' || r.aulas?.tipo === 'avaliacao';
          const minGrade = r.aulas?.min_grade || 7.0;
          return isEx && r.status === 'corrigida' && (r.nota || 0) >= minGrade && (r.aulas?.livros?.cursos?.nivel?.toLowerCase().includes('medio') || r.aulas?.livros?.cursos?.nivel?.toLowerCase().includes('médio'))
        })
        .map((r: any) => r.book_id)
      );
      
      // Merge manual completions with actual completions
      manualMediumModules.forEach(id => finishedMediumModules.add(id));

      setFinishedMediumCount(finishedMediumModules.size);
      const isFinished = fBasicCount >= GRADUATION_CONFIG.basico.requiredModules;
      setIsBasicFinished(isFinished);

      if (allCourses && allCourses.length > 0) {
        const mappedCourses: Course[] = allCourses.map((c: any) => {
          const sortedLivros = (c.livros || []).sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));
          const isBasicCourse = (c.nivel || '').toLowerCase().includes('basico') || (c.nivel || '').toLowerCase().includes('básico') || (c.nome || '').toLowerCase().includes('básico');
          const isMedium = (c.nivel || '').toLowerCase().includes('medio') || (c.nivel || '').toLowerCase().includes('médio');
          const levelLocked = isMedium && !isBasicFinished && !isStaff;

          // =========================================================================
          // HIERARQUIA MODULAR INSTITUCIONAL FATESA:
          // Regra Mestra:
          // 1. O 1º módulo do curso está sempre liberado para estudos.
          // 2. Professor libera prova = módulo seguinte liberado para estudos.
          // 3. O curso é modular: mesmo com reprovação ou sem realizar a avaliação,
          //    o aluno pode e deve continuar para o módulo seguinte normalmente.
          // =========================================================================

          const bookStatusMap = new Map<string, {
            examReleased: boolean;
            studentAttempted: boolean;
            isApproved: boolean;
            isDP: boolean;
            isManualFinished: boolean;
            isDirectlyReleased: boolean;
          }>();

          sortedLivros.forEach((l: any) => {
            const hasNucleoRelease = releasedModulos.has(l.id) || (l.aulas || []).some((a: any) => releasedItems.has(a.id));
            const isProfActive = l.professor_active === true;
            const hasExcep = exceptionIds.includes(l.id);

            const histMatch = historyGrades.find((h: any) => {
              const hn = normalizeTitle(h.modulo_nome);
              const ln = normalizeTitle(l.titulo);
              return ln === hn || ln.includes(hn) || hn.includes(ln);
            });
            const hasValidHistoryGrade = !!histMatch && Number(histMatch.nota) >= 7;
            const isManualFinished = manualCompleted.has(l.id) || hasValidHistoryGrade;

            const moduleSubs = resData.filter((s: any) => s.book_id === l.id);
            const moduleExamAttempts = collectExamAttempts(l.aulas || [], moduleSubs);
            const isApproved = isModuleApproved(moduleExamAttempts) || hasValidHistoryGrade;
            const isDP = isModuleDP(moduleExamAttempts);

            const examReleased = releasedExamBookIds.has(l.id) || (l.aulas || []).some((a: any) => {
              const isEx = a.tipo === 'prova' || a.tipo === 'avaliacao' || !!a.is_bloco_final;
              return isEx && (releasedExamIds.has(a.id) || a.professor_active === true || examExceptionIds.includes(a.id));
            });

            // Submissão de avaliação (passou ou reprovou)
            const studentAttempted = moduleExamAttempts.length > 0 || moduleSubs.length > 0;
            const isDirectlyReleased = hasNucleoRelease || isProfActive || hasExcep || isManualFinished;

            bookStatusMap.set(l.id, {
              examReleased,
              studentAttempted,
              isApproved,
              isDP,
              isManualFinished,
              isDirectlyReleased
            });
          });

          const unlockedBookIds = new Set<string>();

          // O 1º módulo está sempre liberado para estudo (se o nível estiver liberado)
          let maxUnlockedIndex = 0;

          sortedLivros.forEach((l: any, idx: number) => {
            const st = bookStatusMap.get(l.id);
            if (!st) return;

            if (st.isDirectlyReleased) {
              unlockedBookIds.add(l.id);
              maxUnlockedIndex = Math.max(maxUnlockedIndex, idx);
            }

            // Se o professor liberou a prova, OU o aluno tentou a prova (passou OU reprovou),
            // OU o módulo foi aprovado/concluído: o módulo SEGUINTE (idx + 1) é liberado!
            if (st.examReleased || st.studentAttempted || st.isApproved || st.isDP || st.isManualFinished) {
              maxUnlockedIndex = Math.max(maxUnlockedIndex, idx + 1);
            }
          });

          // Propagar desbloqueio até maxUnlockedIndex
          if (!levelLocked) {
            for (let i = 0; i <= Math.min(maxUnlockedIndex, sortedLivros.length - 1); i++) {
              unlockedBookIds.add(sortedLivros[i].id);
            }
          }

          return {
            id: c.id,
            nome: c.nome,
            nivel: c.nivel,
            livros: sortedLivros.map((l: any) => {
              const histMatch = historyGrades.find((h: any) => {
                const hn = normalizeTitle(h.modulo_nome);
                const ln = normalizeTitle(l.titulo);
                return ln === hn || ln.includes(hn) || hn.includes(ln);
              });
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

              const isAlumniConcludedBasic = isAlumniApproved && isBasicCourse;
              const finalFinished = moduleFinished || isAlumniConcludedBasic;
              const finalApproved = isApproved || isAlumniConcludedBasic;
              const finalUnlocked = isUnlocked || isAlumniConcludedBasic;
              const finalReleased = isReleased || isAlumniConcludedBasic;

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
                nota: histMatch ? Number(histMatch.nota) : (isApproved && moduleExamAttempts.length > 0 ? getModuleExamStatus(l.aulas || [], moduleSubs).examGrade : (isAlumniConcludedBasic ? 10 : undefined))
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
    profile?.modulos_finalizados_manual
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
