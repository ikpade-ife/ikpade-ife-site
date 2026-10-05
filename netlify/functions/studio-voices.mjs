// Liste les voix disponibles dans le compte ElevenLabs. Réservé à l'administrateur.
import { json, verifierAdmin, elHeaders, EL_BASE } from "../lib/studio.mjs";

export default async (req) => {
  const token = await verifierAdmin(req);
  if (!token) return json({ erreur: "Accès réservé à l'administrateur." }, 401);
  const headers = elHeaders();
  if (!headers) return json({ erreur: "Clé ElevenLabs non configurée sur le serveur." }, 500);

  const defaut = (process.env.ELEVENLABS_VOICE_ID || "").trim();
  let voix = [];
  try {
    const r = await fetch(`${EL_BASE}/v1/voices`, { headers });
    if (r.ok) {
      const d = await r.json();
      voix = (d.voices || []).map(v => ({ id: v.voice_id, nom: v.name, categorie: v.category || "" }))
        .filter(v => /^[A-Za-z0-9]{10,40}$/.test(v.id || ""))
        .sort((a, b) => a.nom.localeCompare(b.nom))
        .slice(0, 100);
    }
  } catch (_) { /* on retombe sur la voix par défaut */ }
  if (!voix.length && /^[A-Za-z0-9]{10,40}$/.test(defaut)) voix = [{ id: defaut, nom: "Voix par défaut", categorie: "" }];
  if (!voix.length) return json({ erreur: "Aucune voix disponible : ajoutez-en une dans votre compte ElevenLabs, ou définissez ELEVENLABS_VOICE_ID." }, 502);
  return json({ voix, defaut });
};
