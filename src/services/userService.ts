import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Usado para criar usuários (professores/admins) sem deslogar o admin atual
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const userService = {
  /**
   * Busca o perfil completo do usuário logado
   */
  async getCurrentProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, nome, tipo, nucleo_id, created_at, phone, profile_image, nucleos(id, nome)')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Busca todos os usuários com seus núcleos (Admin)
   */
  async getAllUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, nome, tipo, nucleo_id, created_at, phone, nucleos(id, nome)');
    if (error) throw error;
    return data;
  },

  /**
   * Atualiza campos específicos do usuário (nome, tipo, núcleo, etc)
   */
  async updateUser(userId: string, updates: any) {
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId);
    if (error) throw error;
  },

  /**
   * Deleta um usuário completamente (usando RPC para limpar auth.users)
   */
  async deleteUserEntirely(userId: string) {
    const { error } = await supabase.rpc('delete_user_entirely', { target_user_id: userId });
    if (error) throw error;
  },

  /**
   * Cria um novo usuário (Professor ou Admin) usando um cliente secundário
   */
  async createSpecialUser(email: string, password: string, nome: string, tipo: string, additionalData: any = {}) {
    // 1. Autoriza o e-mail na tabela correspondente antes de criar no Auth
    if (tipo === 'admin') {
      await supabase.from('admins_autorizados').insert({ email });
    } else if (tipo === 'professor') {
      await supabase.from('professores_autorizados').insert({ email, nome });
    }

    // 2. Cria o usuário usando cliente temporário
    const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });

    const { data, error } = await tempClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: nome,
          student_type: tipo,
          acesso_definitivo: true,
          ...additionalData
        }
      }
    });

    if (error) throw error;
    return data;
  },

  /**
   * Busca todos os núcleos disponíveis
   */
  async getAllNucleos() {
    const { data, error } = await supabase.from('nucleos').select('id, nome');
    if (error) throw error;
    return data;
  }
};
