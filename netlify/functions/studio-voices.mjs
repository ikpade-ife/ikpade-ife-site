// Liste les voix disponibles dans le compte ElevenLabs. Réservé à l'administrateur.
import { json, verifierAdmin, elHeaders, EL_BASE } from "../lib/studio.mjs";

export default async (req) => {
  const token = await verifierAdmin(req);
  if (!token) return json({ erreur: "Accès réservé à l'administrateur." }, 401);
  const headers = elHeaders();
  if (!headers) return json({ erreur: "Clé ElevenLabs non configurée sur le serveur." }, 500);

  const defaut = (process.env.ELEVENLABS_VOICE_ID || "").trim();
  const ID_OK = /^[A-Za-z0-9]{10,40}$/;
  // Liste personnalisée : ELEVENLABS_VOICES = "Amina:IDvoix1;Moussa:IDvoix2" (séparateurs ; ou retour à la ligne)
  const perso = (process.env.ELEVENLABS_VOICES || "").split(/[;\n\r]+/).map(x => x.trim()).filter(Boolean).map((x, i) => {
    const m = x.match(/^(.*?)[:=]\s*([A-Za-z0-9]{10,40})$/);
    if (m) return { id: m[2], nom: (m[1].trim() || "Voix " + (i + 1)).slice(0, 40), categorie: "" };
    return ID_OK.test(x) ? { id: x, nom: "Voix " + (i + 1), categorie: "" } : null;
  }).filter(Boolean);
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
  // Ordre final : votre liste personnalisée, la voix par défaut, puis les voix trouvées dans le compte
  let toutes = perso.slice();
  if (ID_OK.test(defaut) && !toutes.some(v => v.id === defaut)) toutes.push({ id: defaut, nom: "Voix par défaut", categorie: "" });
  for (const v of voix) if (!toutes.some(t => t.id === v.id)) toutes.push(v);
  voix = toutes.slice(0, 100);
  if (!voix.length) return json({ erreur: "Aucune voix disponible. " + diag + " Définissez ELEVENLABS_VOICES (ex. Amina:IDvoix1;Moussa:IDvoix2) ou ELEVENLABS_VOICE_ID." }, 502);
  const choisie = ID_OK.test(defaut) ? defaut : (voix[0] && voix[0].id) || "";
  return json({ voix, defaut: choisie });
};
