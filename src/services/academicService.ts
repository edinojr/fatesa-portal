import { supabase } from '../lib/supabase';
import { areModuleTitlesEqual, getOfficialBookIndex, getOfficialBookTitle, sortModulesByCurriculum, cleanModuleTitle, LEGACY_AULA_TO_BOOK_TITLE } from '../lib/courseTitles';
import { GRADUATION_CONFIG } from '../config/graduation';

export interface ConsolidateMateria {
  nome: string;
  media: string | number;
  data?: string;
  nivel?: 'basico' | 'medio';
  origem?: 'online' | 'manual' | 'alumni';
}

export interface StudentAcademicSummary {
  alunoData: {
    id: string;
    nome: string;
    email: string;
    nucleo: string;
    matricula: string;
    dataMatricula: string;
    status: string;
    tipo: string;
  };
  materias: ConsolidateMateria[];
  totalModulosConcluidos: number;
  finishedBasicCount: number;
  finishedMediumCount: number;
  isBasicoConcluido: boolean;
  isMedioConcluido: boolean;
  nivelCertificado: 'basico' | 'medio';
  alumniRecord: any | null;
  dataConclusao?: string | null;
  dataConclusaoFormatada?: string;
}

/**
 * Utilitário para interpretar e converter datas em múltiplos formatos (DD/MM/YYYY, ISO, timestamp)
 */
export const parseFlexibleDate = (dateStr?: string | Date | null): Date | null => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) {
    return isNaN(dateStr.getTime()) ? null : dateStr;
  }
  const str = String(dateStr).trim();
  if (!str) return null;

  // DD/MM/YYYY ou DD/MM/YY
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (brMatch) {
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10) - 1;
    let year = parseInt(brMatch[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day, 12, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
};

/**
 * Função utilitária para detectar se uma matéria pertence ao nível Médio ou Básico
 */
export const detectNivelModulo = (moduloNome: string, cursoNomeOuNivel?: string): 'basico' | 'medio' => {
  const normCurso = (cursoNomeOuNivel || '').toLowerCase();
  if (normCurso.includes('medio') || normCurso.includes('médio')) return 'medio';

  const normNome = (moduloNome || '').toLowerCase();
  if (normNome.includes('médio') || normNome.includes('medio')) return 'medio';

  // Matérias típicas da grade do curso Médio de Teologia da Fatesa
  const materiasMedio = [
    'hebraico', 'grego', 'hermeneutica avancada', 'hermeneutica avançada',
    'homiletica avancada', 'homilética avançada', 'apologetica avancada', 'apologética avançada',
    'teologia sistematica avancada', 'teologia sistemática avançada',
    'lideranca eclesiastica', 'liderança eclesiástica', 'administracao eclesiastica', 'administração eclesiástica',
    'aconselhamento pastoral', 'etica pastoral', 'ética pastoral',
    'escatologia avancada', 'escatologia avançada', 'geografia biblica', 'geografia bíblica'
  ];

  if (materiasMedio.some(m => normNome.includes(m))) return 'medio';

  return 'basico';
};

/**
 * Busca e consolida todas as notas acadêmicas de um aluno a partir de todas as fontes:
 * 1. respostas_aulas (avaliações online corrigidas)
 * 2. historico_notas (lançamentos manuais de secretaria)
 * 3. registros_alumni (histórico de formados / planilha importada)
 */
export const fetchStudentAcademicSummary = async (profile: any): Promise<StudentAcademicSummary> => {
  const userId = profile?.id;
  const userEmail = (profile?.email || '').toLowerCase().trim();
  const userName = profile?.nome || 'Aluno';
  const userNucleo = profile?.nucleos?.nome || profile?.nucleo || 'SEDE';

  const isUUID = Boolean(userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId));
  let effectiveUserId = isUUID ? userId : null;
  if (!effectiveUserId && userEmail) {
    try {
      const { data: u } = await supabase.from('users').select('id').eq('email', userEmail).maybeSingle();
      if (u?.id) effectiveUserId = u.id;
    } catch (e) {
      console.warn('[academicService] Erro ao buscar ID por e-mail:', e);
    }
  }

  // 1. Consultas em paralelo com proteção de erro
  const queries: Promise<any>[] = [];

  // A. Respostas de aulas online
  queries.push(
    effectiveUserId
      ? Promise.resolve(supabase
          .from('respostas_aulas')
          .select('id, aula_id, nota, status, created_at, updated_at')
          .eq('aluno_id', effectiveUserId))
      : Promise.resolve({ data: [] })
  );

  // B. Histórico manual de notas
  queries.push(
    effectiveUserId
      ? Promise.resolve(supabase
          .from('historico_notas')
          .select('id, aluno_id, curso_nome, modulo_nome, nota, data_conclusao, created_at')
          .eq('aluno_id', effectiveUserId))
      : Promise.resolve({ data: [] })
  );

  // C. Registros Alumni (Formados / Histórico oficial)
  let alumniPromise: Promise<any>;
  if (effectiveUserId && userEmail) {
    alumniPromise = Promise.resolve(supabase
      .from('registros_alumni')
      .select('*')
      .or(`user_id.eq.${effectiveUserId},email.eq.${userEmail}`));
  } else if (effectiveUserId) {
    alumniPromise = Promise.resolve(supabase.from('registros_alumni').select('*').eq('user_id', effectiveUserId));
  } else if (userEmail) {
    alumniPromise = Promise.resolve(supabase.from('registros_alumni').select('*').eq('email', userEmail));
  } else {
    alumniPromise = Promise.resolve({ data: [] });
  }
  queries.push(alumniPromise);

  const [respRes, histRes, alumniRes] = await Promise.all(queries);

  const respData = respRes?.data || [];
  const histData = histRes?.data || [];
  const alumniList = alumniRes?.data || [];
  const alumniRecord = alumniList.length > 0 ? alumniList[0] : null;

  // 2. Buscar dados de aulas e livros se houver submissões online
  const aulaIds = Array.from(new Set(respData.map((r: any) => r.aula_id).filter(Boolean)));
  let aulasMap: Record<string, any> = {};
  let livrosMap: Record<string, any> = {};

  if (aulaIds.length > 0) {
    try {
      const { data: aData } = await supabase
        .from('aulas')
        .select('id, titulo, tipo, is_bloco_final, livro_id, min_grade')
        .in('id', aulaIds);

      (aData || []).forEach((a: any) => { aulasMap[a.id] = a; });

      const livroIds = Array.from(new Set((aData || []).map((a: any) => a.livro_id).filter(Boolean)));
      if (livroIds.length > 0) {
        const { data: lData } = await supabase
          .from('livros')
          .select('id, titulo, curso_id, cursos(id, nome, nivel)')
          .in('id', livroIds);
        (lData || []).forEach((l: any) => { livrosMap[l.id] = l; });
      }
    } catch (e) {
      console.warn('[academicService] Falha ao carregar aulas/livros complementares:', e);
    }
  }

  // 3. Mapa unificado de matérias com desduplicação por título canônico
  // Estrutura: chave canônica -> { nome, media, data, nivel, origem }
  const consolidatedMap = new Map<string, ConsolidateMateria>();

  const insertOrUpdateMateria = (
    nomeOriginal: string,
    notaNum: number,
    dataStr?: string,
    nivelHint?: 'basico' | 'medio',
    origem: 'online' | 'manual' | 'alumni' = 'manual'
  ) => {
    if (!nomeOriginal || isNaN(notaNum) || notaNum < 7.0) return;

    const trimmedNome = nomeOriginal.trim();
    const canonicalNome = getOfficialBookTitle(trimmedNome);
    const nivel = nivelHint || detectNivelModulo(trimmedNome);

    // Procurar se já existe matéria equivalente cadastrada
    let existingKey: string | null = null;
    for (const key of consolidatedMap.keys()) {
      if (areModuleTitlesEqual(key, trimmedNome) || areModuleTitlesEqual(key, canonicalNome)) {
        existingKey = key;
        break;
      }
    }

    if (existingKey) {
      const existing = consolidatedMap.get(existingKey)!;
      const existingNota = typeof existing.media === 'number' ? existing.media : parseFloat(String(existing.media).replace(',', '.'));
      if (notaNum > existingNota) {
        consolidatedMap.set(existingKey, {
          nome: canonicalNome || existing.nome, // Prioriza o nome oficial numerado
          media: notaNum,
          data: dataStr || existing.data,
          nivel: existing.nivel || nivel,
          origem
        });
      }
    } else {
      consolidatedMap.set(canonicalNome, {
        nome: canonicalNome,
        media: notaNum,
        data: dataStr,
        nivel,
        origem
      });
    }
  };

  // A. Incorporar notas de registros_alumni (Histórico oficial consolidado)
  if (alumniRecord && Array.isArray(alumniRecord.historico)) {
    const defaultNivelAlumni = (alumniRecord.nivel_curso || '').toLowerCase().includes('méd') ? 'medio' : 'basico';
    alumniRecord.historico.forEach((item: any) => {
      if (item && item.modulo && item.nota != null && String(item.nota).trim() !== '') {
        const numNota = parseFloat(String(item.nota).replace(',', '.'));
        if (!isNaN(numNota)) {
          insertOrUpdateMateria(item.modulo, numNota, item.data, defaultNivelAlumni, 'alumni');
        }
      }
    });
  }

  // B. Incorporar notas manuais da tabela historico_notas
  histData.forEach((item: any) => {
    if (item.modulo_nome && item.nota != null) {
      const numNota = parseFloat(String(item.nota).replace(',', '.'));
      if (!isNaN(numNota)) {
        const nivel = detectNivelModulo(item.modulo_nome, item.curso_nome);
        insertOrUpdateMateria(item.modulo_nome, numNota, item.data_conclusao, nivel, 'manual');
      }
    }
  });

  // C. Incorporar notas de respostas_aulas online (processo online)
  respData.forEach((r: any) => {
    const aula = aulasMap[r.aula_id];
    const livro = aula?.livro_id ? livrosMap[aula.livro_id] : null;
    let modTitle = livro?.titulo || (r.aula_id && LEGACY_AULA_TO_BOOK_TITLE[r.aula_id]) || aula?.titulo;
    if (!modTitle) return;

    if (r.nota != null) {
      const numNota = parseFloat(String(r.nota).replace(',', '.'));
      if (!isNaN(numNota) && numNota >= 7.0) {
        const cursoNivel = livro?.cursos?.nivel || livro?.cursos?.nome;
        const nivel = detectNivelModulo(modTitle, cursoNivel);
        insertOrUpdateMateria(modTitle, numNota, r.updated_at || r.created_at, nivel, 'online');
      }
    }
  });

  // 4. Extrair lista plana e ordenar pelo currículo oficial (1 a 27)
  const rawMaterias: ConsolidateMateria[] = Array.from(consolidatedMap.values()).map(m => ({
    ...m,
    nome: getOfficialBookTitle(m.nome),
    media: Number(m.media).toFixed(1)
  }));
  const materias = sortModulesByCurriculum(rawMaterias, m => m.nome);

  // 5. Contagens e regras de conclusão de curso
  const basicMaterias = materias.filter(m => m.nivel === 'basico');
  const mediumMaterias = materias.filter(m => m.nivel === 'medio');

  const finishedBasicCount = basicMaterias.length;
  const finishedMediumCount = mediumMaterias.length;
  const totalModulosConcluidos = materias.length;

  const isAlumniFormado = !!alumniRecord && (
    alumniRecord.status_aprovacao === 'aprovado' ||
    !alumniRecord.status_aprovacao ||
    profile?.tipo === 'ex_aluno'
  );
  const isAlumniMedio = isAlumniFormado && (alumniRecord?.nivel_curso || '').toLowerCase().includes('méd');

  const isBasicoConcluido = isAlumniFormado || finishedBasicCount >= GRADUATION_CONFIG.basico.requiredModules;
  const isMedioConcluido = isAlumniMedio || finishedMediumCount >= GRADUATION_CONFIG.medio.requiredModules || totalModulosConcluidos >= 35;

  const nivelCertificado: 'basico' | 'medio' = isMedioConcluido ? 'medio' : 'basico';

  // 6. Determinar data de conclusão com base na última prova feita pelo aluno
  // Regra de negócio:
  // - Se o aluno realizou prova online no sistema (ex: última prova "bibliologia"), a data dessa prova no sistema é utilizada como data de conclusão oficial do certificado.
  // - Caso não haja prova online, analisa a última prova/módulo com data registrada no histórico (manual ou alumni).
  // - Caso não seja identificada nenhuma data de prova, emite com a data do pedido (null -> fallback new Date()).
  let latestOnlineExamDate: Date | null = null;
  respData.forEach((r: any) => {
    const aula = aulasMap[r.aula_id];
    const isExam = aula?.is_bloco_final || aula?.tipo === 'prova' || aula?.tipo === 'avaliacao' || true;
    const notaNum = parseFloat(String(r.nota).replace(',', '.'));
    if (isExam && !isNaN(notaNum) && notaNum >= 7.0) {
      const d = parseFlexibleDate(r.updated_at || r.created_at);
      if (d && (!latestOnlineExamDate || d.getTime() > latestOnlineExamDate.getTime())) {
        latestOnlineExamDate = d;
      }
    }
  });

  let latestMateriaDate: Date | null = null;
  materias.forEach(m => {
    if (m.data) {
      const d = parseFlexibleDate(m.data);
      if (d && (!latestMateriaDate || d.getTime() > latestMateriaDate.getTime())) {
        latestMateriaDate = d;
      }
    }
  });

  let dataConclusaoObj: Date | null = null;
  if (latestOnlineExamDate) {
    // Prova realizada no sistema tem a prioridade máxima solicitada
    dataConclusaoObj = latestOnlineExamDate;
  } else if (latestMateriaDate) {
    dataConclusaoObj = latestMateriaDate;
  } else if (alumniRecord?.ano_formacao) {
    dataConclusaoObj = parseFlexibleDate(alumniRecord.ano_formacao);
  }

  const dataConclusao = dataConclusaoObj ? dataConclusaoObj.toISOString() : null;
  const dataConclusaoFormatada = dataConclusaoObj 
    ? `Santo André, ${dataConclusaoObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}`
    : undefined;

  // 7. Preparar dados consolidados do aluno para histórico e certificados
  const alunoData = {
    id: userId || alumniRecord?.id || 'N/A',
    nome: (alumniRecord?.nome || userName || '').trim().toUpperCase(),
    email: userEmail || alumniRecord?.email || '',
    nucleo: (userNucleo || alumniRecord?.nucleo || 'SEDE').trim().toUpperCase(),
    matricula: alumniRecord?.matricula || profile?.matricula || 'N/A',
    dataMatricula: alumniRecord?.ano_formacao || (profile?.created_at ? new Date(profile.created_at).toLocaleDateString('pt-BR') : 'N/A'),
    status: (isBasicoConcluido || isMedioConcluido || profile?.tipo === 'ex_aluno') ? 'Formado' : 'Ativo',
    tipo: profile?.tipo || (isAlumniFormado ? 'ex_aluno' : 'aluno')
  };

  return {
    alunoData,
    materias,
    totalModulosConcluidos,
    finishedBasicCount,
    finishedMediumCount,
    isBasicoConcluido,
    isMedioConcluido,
    nivelCertificado,
    alumniRecord,
    dataConclusao,
    dataConclusaoFormatada
  };
};

/**
 * Analisa e consolida todas as notas dos alunos que fizeram o processo online (respostas_aulas).
 * - Identifica avaliações com nota aprovada (>= 7.0)
 * - Mapeia com precisão para o módulo curricular oficial (1 a 27)
 * - Registra ou atualiza as notas consolidadas na tabela historico_notas
 * - Atualiza o campo modulos_finalizados_manual dos alunos em users
 */
export const consolidateAllOnlineGrades = async (): Promise<{
  totalOnlineAnalyzed: number;
  totalConsolidated: number;
  totalModulesUpdated: number;
  details: Array<{ alunoNome: string; moduloNome: string; nota: number }>;
}> => {
  // 1. Buscar todas as submissões online, aulas, livros e notas manuais existentes
  const [
    { data: subDataRaw, error: subErr },
    { data: aulasData, error: aulaErr },
    { data: livrosData, error: livroErr },
    { data: existingHistData, error: histErr },
    { data: usersData, error: usersErr }
  ] = await Promise.all([
    supabase.from('respostas_aulas').select('id, aluno_id, aula_id, nota, status, created_at, updated_at'),
    supabase.from('aulas').select('id, titulo, tipo, is_bloco_final, livro_id, min_grade'),
    supabase.from('livros').select('id, titulo, curso_id, cursos:curso_id(nivel)'),
    supabase.from('historico_notas').select('id, aluno_id, modulo_nome, nota'),
    supabase.from('users').select('id, nome, email, modulos_finalizados_manual')
  ]);

  if (subErr) throw subErr;
  if (aulaErr) console.warn('[consolidateAllOnlineGrades] Erro ao buscar aulas:', aulaErr);
  if (livroErr) console.warn('[consolidateAllOnlineGrades] Erro ao buscar livros:', livroErr);
  if (histErr) console.warn('[consolidateAllOnlineGrades] Erro ao buscar histórico:', histErr);
  if (usersErr) console.warn('[consolidateAllOnlineGrades] Erro ao buscar usuários:', usersErr);

  const aulasMap: Record<string, any> = {};
  (aulasData || []).forEach((a: any) => { aulasMap[a.id] = a; });

  const livrosMap: Record<string, any> = {};
  (livrosData || []).forEach((l: any) => { livrosMap[l.id] = l; });

  const usersMap: Record<string, any> = {};
  (usersData || []).forEach((u: any) => { usersMap[u.id] = u; });

  // Mapa de notas já existentes em historico_notas por "aluno_id::modulo_nome_normalizado"
  const existingMap = new Map<string, { id: string; nota: number }>();
  (existingHistData || []).forEach((h: any) => {
    if (h.aluno_id && h.modulo_nome) {
      const key = `${h.aluno_id}::${cleanModuleTitle(h.modulo_nome)}`;
      const current = existingMap.get(key);
      const num = Number(h.nota) || 0;
      if (!current || num > current.nota) {
        existingMap.set(key, { id: h.id, nota: num });
      }
    }
  });

  const validSubs = (subDataRaw || []).filter((r: any) => {
    if (!r.aluno_id || !r.aula_id || r.nota == null) return false;
    const num = parseFloat(String(r.nota).replace(',', '.'));
    return !isNaN(num) && num >= 7.0;
  });

  let totalConsolidated = 0;
  const userModulesToUpdate: Record<string, Set<string>> = {};
  const details: Array<{ alunoNome: string; moduloNome: string; nota: number }> = [];

  for (const r of validSubs) {
    const numNota = parseFloat(String(r.nota).replace(',', '.'));
    const aula = aulasMap[r.aula_id];
    let livro = aula?.livro_id ? livrosMap[aula.livro_id] : null;
    let modTitle = livro?.titulo || (r.aula_id && LEGACY_AULA_TO_BOOK_TITLE[r.aula_id]) || aula?.titulo;
    if (!modTitle) continue;

    const canonicalNome = getOfficialBookTitle(modTitle);
    const key = `${r.aluno_id}::${cleanModuleTitle(canonicalNome)}`;
    const existing = existingMap.get(key);

    const user = usersMap[r.aluno_id];
    const cursoNivel = livro?.cursos?.nivel || (getOfficialBookIndex(canonicalNome) < 27 ? 'Teologia Básico' : 'Teologia Médio');
    const dataConclusao = r.updated_at ? new Date(r.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    // Se a nota não existe em historico_notas ou é maior que a nota anterior
    if (!existing || numNota > existing.nota) {
      const payload = {
        aluno_id: r.aluno_id,
        curso_nome: cursoNivel === 'medio' ? 'Teologia Médio' : 'Teologia Básico',
        modulo_nome: canonicalNome,
        nota: numNota,
        data_conclusao: dataConclusao,
        observacao: 'Consolidação automática do processo online'
      };

      if (existing?.id) {
        await supabase.from('historico_notas').update(payload).eq('id', existing.id);
      } else {
        const { data: inserted } = await supabase.from('historico_notas').insert(payload).select('id').maybeSingle();
        if (inserted?.id) {
          existingMap.set(key, { id: inserted.id, nota: numNota });
        }
      }

      totalConsolidated++;
      details.push({
        alunoNome: user?.nome || r.aluno_id,
        moduloNome: canonicalNome,
        nota: numNota
      });
    }

    // Registrar módulo concluído em users.modulos_finalizados_manual
    if (livro?.id) {
      if (!userModulesToUpdate[r.aluno_id]) {
        userModulesToUpdate[r.aluno_id] = new Set<string>(user?.modulos_finalizados_manual || []);
      }
      userModulesToUpdate[r.aluno_id].add(livro.id);
    }
  }

  // Atualizar modulos_finalizados_manual para cada aluno
  let totalModulesUpdated = 0;
  for (const [alunoId, modSet] of Object.entries(userModulesToUpdate)) {
    const user = usersMap[alunoId];
    const currentList = new Set<string>(user?.modulos_finalizados_manual || []);
    let changed = false;
    for (const mId of modSet) {
      if (!currentList.has(mId)) {
        currentList.add(mId);
        changed = true;
      }
    }
    if (changed) {
      await supabase.from('users').update({ modulos_finalizados_manual: Array.from(currentList) }).eq('id', alunoId);
      totalModulesUpdated++;
    }
  }

  return {
    totalOnlineAnalyzed: validSubs.length,
    totalConsolidated,
    totalModulesUpdated,
    details
  };
};
