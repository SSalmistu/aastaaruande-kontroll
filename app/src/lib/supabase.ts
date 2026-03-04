import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Abi-debug: logime välja, mida Vite tegelikult .env-ist loeb
// (prod-keskkonnas võiks selle eemaldada)
// See aitab aru saada, kas Vite üldse näeb VITE_* väärtusi.
// eslint-disable-next-line no-console
console.log("VITE env-id:", {
  VITE_SUPABASE_URL: supabaseUrl,
  VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? "***" : undefined,
});

if (!supabaseUrl || !supabaseAnonKey) {
  // Kui need on tühjad, kasutame placeholderit, et Supabase klient ei kukuks kohe läbi.
  throw new Error(
    "Supabase keskkonnamuutujad (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) ei ole Vite'i poolt nähtavad. Kontrolli, et käivitad `npm run dev` käsu kaustas `app` ja et `.env` fail asub samas kaustas."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

