// Relaie la vidéo générée vers la page (même origine), pour pouvoir y ajouter logo et voix.
import { json, verifierAdmin, hfHeaders, HF_BASE } from "../lib/studio.mjs";

export default async (req) => {
  const token = await verifierAdmin(req);
  if (!token) return json({ erreur: "Accès réservé à l'administrateur." }, 401);
  const headers = hfHeaders();
  if (!headers) return json({ erreur: "Clé Higgsfield non configurée sur le serveur." }, 500);

  const id = new URL(req.url).searchParams.get("id") || "";
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(id)) return json({ erreur: "Identifiant invalide." }, 400);

  // L'adresse de la vidéo est relue côté serveur, jamais fournie par le navigateur.
  const st = await fetch(`${HF_BASE}/requests/${id}/status`, { headers }).catch(() => null);
  if (!st || !st.ok) return json({ erreur: "Vidéo introuvable." }, 502);
  const d = await st.json().catch(() => ({}));
  const url = d.status === "completed" && d.video && d.video.url;
  if (!url || !/^https:\/\//.test(url)) return json({ erreur: "Vidéo non disponible." }, 404);

  const up = await fetch(url).catch(() => null);
  if (!up || !up.ok || !up.body) return json({ erreur: "Téléchargement de la vidéo impossible." }, 502);
  return new Response(up.body, {
    status: 200,
    headers: { "Content-Type": up.headers.get("content-type") || "video/mp4", "Cache-Control": "no-store" },
  });
};
