import { supabase } from '../lib/supabase';

export interface GraduationData {
  nome: string;
  rg: string;
  telefone: string;
  cep: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  courseId: string;
  courseName: string;
  levelName: string;
}

export const graduationService = {
  /**
   * Oficializa a graduação de um aluno.
   * Muda o tipo do usuário para 'ex_aluno' e cria/atualiza o registro na base de formados.
   */
  async graduateStudent(userId: string, data: GraduationData) {
    const currentYear = new Date().getFullYear().toString();

    // 1. Atualizar o perfil do usuário
    const { error: userError } = await supabase
      .from('users')
      .update({
        tipo: 'ex_aluno',
        ano_graduacao: currentYear
      })
      .eq('id', userId);

    if (userError) throw userError;

    // 2. Buscar dados do usuário (email, núcleo) para complementar o registro de alumni
    const { data: userProfile } = await supabase
      .from('users')
      .select('email, nucleo_id, nucleos(nome)')
      .eq('id', userId)
      .single();

    // 3. Criar ou Atualizar o registro na tabela registros_alumni
    const alumniRecord = {
      user_id: userId,
      nome: data.nome,
      email: userProfile?.email,
      curso: data.courseName,
      nivel_curso: data.levelName,
      nucleo: (userProfile?.nucleos as any)?.nome || 'Polo Central',
      ano_formacao: currentYear,
      rg: data.rg,
      telefone: data.telefone,
      cep: data.cep,
      endereco: data.endereco,
      bairro: data.bairro,
      cidade: data.cidade,
      uf: data.uf,
      observacoes: `Graduação automática via portal em ${new Date().toLocaleDateString()}`
    };

    // Tentar encontrar se já existe um registro para este usuário
    const { data: existingAlumni } = await supabase
      .from('registros_alumni')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    let result;
    if (existingAlumni) {
      result = await supabase
        .from('registros_alumni')
        .update(alumniRecord)
        .eq('id', existingAlumni.id)
        .select();
    } else {
      result = await supabase
        .from('registros_alumni')
        .insert(alumniRecord)
        .select();
    }

    if (result.error) throw result.error;

    return result.data[0];
  },

  /**
   * Verifica se um aluno já é formado (tem registro de alumni).
   */
  async checkAlumniStatus(userId: string) {
    const { data, error } = await supabase
      .from('registros_alumni')
      .select('*, codigo_verificacao')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) return null;
    return data;
  },

  /**
   * Verifica um certificado pelo código de autenticidade (público).
   */
  async verifyCertificate(code: string) {
    const { data, error } = await supabase.rpc('verificar_certificado', {
      p_codigo: code
    });

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  }
};
