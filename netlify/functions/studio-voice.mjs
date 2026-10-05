// Transforme un texte en voix off (ElevenLabs, modèle multilingue). Réservé à l'administrateur.
import { json, verifierAdmin, rpc, elHeaders, EL_BASE } from "../lib/studio.mjs";

const LIMITE_VOIX_PAR_JOUR = 20;

export default async (req) => {
  if (req.method !== "POST") return json({ erreur: "Méthode non autorisée." }, 405);
  const token = await verifierAdmin(req);
  if (!token) return json({ erreur: "Accès réservé à l'administrateur." }, 401);
  const headers = elHeaders();
  if (!headers) return json({ erreur: "Clé ElevenLabs non configurée sur le serveur." }, 500);

  let body;
  try { body = await req.json(); } catch (_) { return json({ erreur: "Requête invalide." }, 400); }
  const texte = String(body.texte || "").trim();
  const voiceId = String(body.voiceId || "");
  if (texte.length < 5 || texte.length > 600) return json({ erreur: "Le texte de la voix doit faire entre 5 et 600 caractères." }, 400);
  if (!/^[A-Za-z0-9]{10,40}$/.test(voiceId)) return json({ erreur: "Voix invalide." }, 400);

  const res = await rpc(token, "studio_reserve_generation", {
    p_prompt: texte.slice(0, 200), p_params: { voiceId }, p_limite: LIMITE_VOIX_PAR_JOUR, p_kind: "voix",
  });
  if (!res.ok) {
    if (JSON.stringify(res.data || "").includes("LIMITE_JOURNALIERE")) {
      return json({ erreur: `Limite de ${LIMITE_VOIX_PAR_JOUR} voix par jour atteinte.` }, 429);
    }
    return json({ erreur: "Impossible de vérifier la limite quotidienne." }, 500);
  }
  const reservationId = res.data && res.data.id;

  let r;
  try {
    r = await fetch(`${EL_BASE}/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: "POST", headers,
      body: JSON.stringify({ text: texte, model_id: "eleven_multilingual_v2" }),
    });
  } catch (_) {
    await rpc(token, "studio_cancel_reservation", { p_id: reservationId });
    return json({ erreur: "ElevenLabs est injoignable pour le moment." }, 502);
  }
  if (!r.ok) {
    await rpc(token, "studio_cancel_reservation", { p_id: reservationId });
    if (r.status === 401) return json({ erreur: "Clé ElevenLabs refusée (ou crédits épuisés)." }, 502);
    if (r.status === 402 || r.status === 429) return json({ erreur: "Crédits ElevenLabs insuffisants ou trop de demandes." }, 402);
    return json({ erreur: "ElevenLabs a refusé la demande." }, 502);
  }
  const audio = await r.arrayBuffer();
  return new Response(audio, { status: 200, headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
};
