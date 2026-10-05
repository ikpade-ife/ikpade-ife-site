// Donne l'avancement d'une génération. Réservé à l'administrateur.
import { json, verifierAdmin, hfHeaders, HF_BASE } from "../lib/studio.mjs";

export default async (req) => {
  const token = await verifierAdmin(req);
  if (!token) return json({ erreur: "Accès réservé à l'administrateur." }, 401);

  const headers = hfHeaders();
  if (!headers) return json({ erreur: "Clé Higgsfield non configurée sur le serveur." }, 500);

  const id = new URL(req.url).searchParams.get("id") || "";
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(id)) return json({ erreur: "Identifiant invalide." }, 400);

  let r;
  try {
    r = await fetch(`${HF_BASE}/requests/${id}/status`, { headers });
  } catch (_) {
    return json({ statut: "en_cours" }); // incident passager : la page réessaiera
  }
  if (r.status >= 500) return json({ statut: "en_cours" });
  if (!r.ok) return json({ erreur: "Suivi impossible." }, 502);

  const d = await r.json().catch(() => ({}));
  const s = String(d.status || "");
  if (s === "completed") {
    const url = d.video && d.video.url;
    return url ? json({ statut: "termine", url }) : json({ statut: "echec", erreur: "Aucune vidéo reçue." });
  }
  if (s === "nsfw") return json({ statut: "echec", erreur: "Refusée par la modération. Reformulez le texte." });
  if (s === "failed") return json({ statut: "echec", erreur: "La génération a échoué." });
  if (s === "canceled") return json({ statut: "echec", erreur: "La génération a été annulée." });
  return json({ statut: "en_cours" });
};
