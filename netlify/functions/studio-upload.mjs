// Envoie une photo de personnage vers le stockage Higgsfield et renvoie son adresse publique.
// Réservé à l'administrateur. La photo arrive déjà réduite et compressée par la page (JPEG).
import { json, verifierAdmin, hfHeaders, HF_BASE } from "../lib/studio.mjs";

const TAILLE_MAX = 4 * 1024 * 1024; // 4 Mo une fois décodée

export default async (req) => {
  if (req.method !== "POST") return json({ erreur: "Méthode non autorisée." }, 405);

  const token = await verifierAdmin(req);
  if (!token) return json({ erreur: "Accès réservé à l'administrateur." }, 401);

  const headers = hfHeaders();
  if (!headers) return json({ erreur: "Clé Higgsfield non configurée sur le serveur." }, 500);

  let body;
  try { body = await req.json(); } catch (_) { return json({ erreur: "Requête invalide." }, 400); }

  const m = String(body.image || "").match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return json({ erreur: "Photo invalide (JPEG attendu)." }, 400);
  const octets = Buffer.from(m[1], "base64");
  if (!octets.length || octets.length > TAILLE_MAX) return json({ erreur: "Photo trop lourde (4 Mo maximum)." }, 400);

  // 1) Demander une adresse d'envoi à Higgsfield.
  let info;
  try {
    const r = await fetch(`${HF_BASE}/files/generate-upload-url`, {
      method: "POST",
      headers,
      body: JSON.stringify({ content_type: "image/jpeg" }),
    });
    info = await r.json().catch(() => ({}));
    if (!r.ok || !info.upload_url || !info.public_url) {
      if (r.status === 401 || r.status === 403) return json({ erreur: "Clé Higgsfield refusée." }, 502);
      return json({ erreur: "Higgsfield n'a pas fourni d'adresse d'envoi." }, 502);
    }
  } catch (_) {
    return json({ erreur: "Higgsfield est injoignable pour le moment." }, 502);
  }

  // 2) Envoyer la photo (sans la clé Higgsfield : l'adresse est déjà signée).
  try {
    const up = await fetch(info.upload_url, {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "image/jpeg" }, info.upload_headers || {}),
      body: octets,
    });
    if (!up.ok) return json({ erreur: "Envoi de la photo refusé par le stockage." }, 502);
  } catch (_) {
    return json({ erreur: "Envoi de la photo impossible." }, 502);
  }

  return json({ url: info.public_url });
};
