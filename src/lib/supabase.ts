import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Variáveis do Supabase ausentes no .env')
}

const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s global timeout

  return fetch(input, { ...init, signal: controller.signal })
    .then((res) => {
      clearTimeout(timeoutId);
      return res;
    })
    .catch((err) => {
      clearTimeout(timeoutId);
      throw err;
    });
};

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  global: {
    fetch: customFetch,
  },
});
