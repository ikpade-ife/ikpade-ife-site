// Lance une génération vidéo (Seedance 2.5 via Higgsfield). Réservé à l'administrateur.
import { json, verifierAdmin, rpc, hfHeaders, HF_BASE, LIMITE_PAR_JOUR } from "../lib/studio.mjs";

const FORMATS = ["9:16", "16:9", "1:1", "4:3", "3:4", "21:9"];
const RESOLUTIONS = ["480p", "720p"];
// Le texte à l'écran généré par l'IA est illisible : on l'interdit toujours dans le prompt.
const CONSIGNE = " No text, no captions, no subtitles, no logos or watermarks on screen.";
// Sans le son de l'IA, on évite aussi que les personnages "parlent" : la voix off (étape 2) ne serait pas synchronisée avec leurs lèvres.
const CONSIGNE_SANS_PAROLES = " The characters do not speak: mouths closed, natural gentle smiles, expressive eyes and body language.";

export default async (req) => {
  if (req.method !== "POST") return json({ erreur: "Méthode non autorisée." }, 405);

  const token = await verifierAdmin(req);
  if (!token) return json({ erreur: "Accès réservé à l'administrateur." }, 401);

  const headers = hfHeaders();
  if (!headers) return json({ erreur: "Clé Higgsfield non configurée sur le serveur." }, 500);

  let body;
  try { body = await req.json(); } catch (_) { return json({ erreur: "Requête invalide." }, 400); }

  const prompt = String(body.prompt || "").trim();
  if (prompt.length < 5 || prompt.length > 1500) {
    return json({ erreur: "Le texte doit faire entre 5 et 1500 caractères." }, 400);
  }
  const duree = Number.isInteger(body.duree) ? body.duree : 5;
  if (duree < 4 || duree > 15) return json({ erreur: "La durée doit être de 4 à 15 secondes." }, 400);
  const format = FORMATS.includes(body.format) ? body.format : "9:16";
  const resolution = RESOLUTIONS.includes(body.resolution) ? body.resolution : "720p";
  const audio = body.audio === true;

  // 1) Réserver une des générations du jour (refuse au-delà de la limite).
  const params = { duree, format, resolution, audio };
  const res = await rpc(token, "studio_reserve_generation", {
    p_prompt: prompt.slice(0, 500), p_params: params, p_limite: LIMITE_PAR_JOUR,
  });
  if (!res.ok) {
    const msg = JSON.stringify(res.data || "");
    if (msg.includes("LIMITE_JOURNALIERE")) {
      return json({ erreur: `Limite de ${LIMITE_PAR_JOUR} vidéos par jour atteinte. Revenez demain.` }, 429);
    }
    return json({ erreur: "Impossible de vérifier la limite quotidienne." }, 500);
  }
  const { id: reservationId, restantes } = res.data || {};

  // 2) Envoyer la demande à Higgsfield.
  let hf;
  try {
    hf = await fetch(`${HF_BASE}/bytedance/seedance-2.5/text-to-video`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt: prompt + CONSIGNE + (audio ? "" : CONSIGNE_SANS_PAROLES),
        duration: duree,
        resolution,
        aspect_ratio: format,
        output_format: "mp4",
        generate_audio: audio,
      }),
    });
  } catch (_) {
    await rpc(token, "studio_cancel_reservation", { p_id: reservationId });
    return json({ erreur: "Higgsfield est injoignable pour le moment." }, 502);
  }

  const data = await hf.json().catch(() => ({}));
  if (!hf.ok || !data.request_id) {
    await rpc(token, "studio_cancel_reservation", { p_id: reservationId });
    if (hf.status === 401 || hf.status === 403) return json({ erreur: "Clé Higgsfield refusée." }, 502);
    if (hf.status === 402) return json({ erreur: "Crédits Higgsfield insuffisants." }, 402);
    return json({ erreur: "Higgsfield a refusé la demande." }, 502);
  }

  await rpc(token, "studio_attach_request", { p_id: reservationId, p_request_id: data.request_id });
  return json({ requestId: data.request_id, restantes });
};
