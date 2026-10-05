// Liste les voix disponibles dans le compte ElevenLabs. Réservé à l'administrateur.
import { json, verifierAdmin, elHeaders, EL_BASE } from "../lib/studio.mjs";

export default async (req) => {
  const token = await verifierAdmin(req);
  if (!token) return json({ erreur: "Accès réservé à l'administrateur." }, 401);
  const headers = elHeaders();
  if (!headers) return json({ erreur: "Clé ElevenLabs non configurée sur le serveur." }, 500);

  const defaut = (process.env.ELEVENLABS_VOICE_ID || "").trim();
  let voix = [];
  let diag = "";
  const lire = (liste) => (liste || []).map(v => ({ id: v.voice_id, nom: v.name, categorie: v.category || "" }))
    .filter(v => /^[A-Za-z0-9]{10,40}$/.test(v.id || ""));
  for (const chemin of ["/v1/voices", "/v2/voices?page_size=100"]) {
    try {
      const r = await fetch(`${EL_BASE}${chemin}`, { headers });
      if (r.ok) {
        const d = await r.json();
        voix = voix.concat(lire(d.voices));
        if (voix.length) break;
        diag = "ElevenLabs a répondu, mais la liste est vide.";
      } else {
        let detail = "";
        try { const e = await r.json(); detail = e?.detail?.message || e?.detail?.status || (typeof e?.detail === "string" ? e.detail : ""); } catch (_) {}
        diag = `ElevenLabs a refusé (code ${r.status})${detail ? " : " + detail : ""}.`;
      }
    } catch (e) {
      diag = "Impossible de contacter ElevenLabs : " + (e && e.message ? e.message : "erreur réseau") + " (clé mal collée ?).";
    }
  }
  voix.sort((a, b) => a.nom.localeCompare(b.nom));
  voix = voix.slice(0, 100);
  if (!voix.length && /^[A-Za-z0-9]{10,40}$/.test(defaut)) voix = [{ id: defaut, nom: "Voix par défaut", categorie: "" }];
  if (!voix.length) return json({ erreur: "Aucune voix disponible. " + diag + " Ajoutez une voix dans votre compte ElevenLabs, ou définissez ELEVENLABS_VOICE_ID." }, 502);
  return json({ voix, defaut });
};
