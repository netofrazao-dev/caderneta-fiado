import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  { auth: { persistSession: true, autoRefreshToken: true } }
)

export const NOME_LOJA = (import.meta.env.VITE_NOME_LOJA as string) || 'Mercantil Frazão'
