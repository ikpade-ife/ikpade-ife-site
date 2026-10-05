// Aide partagée par les fonctions du Studio vidéo (côté serveur uniquement).
// L'URL et la clé "anon" de Supabase sont publiques (déjà présentes dans le site) ;
// le secret Higgsfield, lui, vient de la variable d'environnement HF_CREDENTIALS.
export const SUPABASE_URL = "https://rxnjsskjioniclfplsur.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bmpzc2tqaW9uaWNsZnBsc3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNzk2ODcsImV4cCI6MjEwMzk1NTY4N30.X-ELAOXCKYI6a0mT3blnsBTPFKNeYx-B9IOcb0AxrKw";
export const ADMIN_EMAIL = "ikpadeife@gmail.com";
export const HF_BASE = "https://api.higgsfield.ai";
export const LIMITE_PAR_JOUR = 5;

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// Vérifie que l'appelant est bien connecté ET qu'il s'agit de l'administrateur.
// Renvoie son jeton, ou null.
export async function verifierAdmin(req) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const token = m[1];
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  const user = await r.json();
  if (!user || (user.email || "").toLowerCase() !== ADMIN_EMAIL) return null;
  return token;
}

// Appelle une fonction SQL (RPC) de Supabase avec le jeton de l'administrateur.
export async function rpc(token, name, args) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args || {}),
  });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) {}
  return { ok: r.ok, status: r.status, data };
}

export function hfHeaders() {
  const creds = process.env.HF_CREDENTIALS;
  if (!creds || !creds.includes(":")) return null;
  return { Authorization: `Key ${creds}`, "Content-Type": "application/json", Accept: "application/json" };
}

export const EL_BASE = "https://api.elevenlabs.io";
export function elHeaders() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return null;
  return { "xi-api-key": key, "Content-Type": "application/json" };
}
