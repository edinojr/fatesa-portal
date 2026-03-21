import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get the user from the JWT
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) throw new Error('Acesso não autorizado')

    // Get the aula_id from request body or query params
    const { aula_id } = await req.json()

    if (!aula_id) throw new Error('ID da aula é obrigatório')

    // 1. Fetch user data (tipo)
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('tipo')
      .eq('id', user.id)
      .single()

    if (userError || !userData) throw new Error('Erro ao buscar dados do usuário')

    // 2. Fetch lesson data (details and type)
    const { data: lessonData, error: lessonError } = await supabaseClient
      .from('aulas')
      .select('*')
      .eq('id', aula_id)
      .single()

    if (lessonError || !lessonData) throw new Error('Erro ao buscar dados da aula')

    // 3. Access Control Logic
    // If student is 'presencial' and lesson is 'ao_vivo'
    if (userData.tipo === 'presencial' && lessonData.tipo === 'ao_vivo') {
      return new Response(
        JSON.stringify({
          ...lessonData,
          video_url: 'Aula disponível apenas presencialmente. Realize as atividades abaixo.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Default: Total access (Online student or Recorded lesson)
    return new Response(
      JSON.stringify(lessonData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
