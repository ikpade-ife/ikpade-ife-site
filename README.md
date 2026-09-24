# Ikpadé Ifê — Site web

Plateforme de mise en relation matrimoniale halal pour les musulmans béninois du monde entier.

## Architecture

Le site est volontairement simple : **pas de build, pas de framework, pas de dépendances à installer**. Il se compose de fichiers statiques déployés tels quels sur Netlify.

```
site/
├── index.html          ← L'application principale (single-page app)
├── blog.html            ← Page d'index du blog
├── blog.css              ← Styles partagés par toutes les pages du blog
├── blog/
│   └── *.html            ← Un fichier HTML statique par article
├── logo.png              ← Logo (fichier séparé, mis en cache 1 an)
├── robots.txt / sitemap.xml
├── 404.html               ← Page d'erreur personnalisée
├── _headers                ← En-têtes de sécurité + cache (lus par Netlify)
└── netlify.toml
```

### `index.html` — l'application

Un seul fichier HTML qui contient tout : HTML, CSS (`<style>`) et JavaScript (`<script>`). Ce n'est **pas une vraie SPA avec routage** — chaque "écran" (accueil, inscription, connexion, parcourir les profils, mes demandes, messagerie, console de modération, pages légales) est une `<div>` que le JavaScript affiche ou masque (`hideAllViews()` + `showXxx()`). Aucune de ces vues n'a d'URL propre, donc rien n'est partageable ni indexable au-delà de l'accueil — un axe d'amélioration connu, pas encore traité.

Le bilinguisme FR/EN fonctionne de la même façon : un dictionnaire JavaScript (`I18N`) et une fonction `applyI18n()` qui remplace le texte de chaque élément `data-i18n="clé"` — pas de pages séparées par langue.

### `blog/` — le vrai contenu indexable

Contrairement à l'app, le blog est fait de **vraies pages HTML statiques séparées**, chacune avec son propre titre et sa propre méta-description — c'est ce qui les rend réellement indexables par Google, à la différence du reste du site.

## Backend (Supabase)

Le code du backend (fonctions Edge, migrations SQL) vit dans un **dépôt local séparé**, `ikpade-ife-backend/`, géré via la CLI Supabase (`supabase db push`, `supabase functions deploy`). Il n'est pas inclus dans ce dossier `site/`.

**Tables principales** : `profils`, `demandes_introduction`, `messages_echange`, `messages_contact`, `abonnements`.

**Sécurité** : la sécurité ne repose pas uniquement sur les policies RLS (Row Level Security) — des déclencheurs (`trigger`) verrouillent en plus certaines colonnes sensibles (ex. `statut_verification` d'un profil ne peut être changé que par l'e-mail admin, codé en dur dans plusieurs déclencheurs et policies : `ikpadeife@gmail.com`).

**Services externes** : FedaPay (paiement), Resend (emails transactionnels, domaine `ikpade-ife.com` vérifié).

## Déploiement

Pas de dépôt Git connecté à Netlify pour l'instant — le déploiement se fait en glissant le dossier `site/` entier dans l'onglet **Deploys** du tableau de bord Netlify. Chaque dépôt remplace entièrement le contenu publié.

**Domaine** : `www.ikpade-ife.com`, acheté sur Namecheap, DNS pointés vers Netlify.

## Limites connues (dette technique)

- **Un seul gros fichier** (`index.html`, ~2500 lignes) : HTML, CSS et JS mélangés, ~180 attributs `onclick`, pas de séparation en composants. Fonctionne en solo sur un MVP, mais deviendra difficile à maintenir à plusieurs.
- **Pas de vrai routage** : aucune URL propre pour les sous-pages de l'app (voir plus haut).
- **Pas de tests automatisés.**
- **Pas de dépôt Git** à ce jour — donc pas d'historique de versions, pas de possibilité de revenir en arrière facilement, pas de revue de code possible.

Si une deuxième personne rejoint le projet, la priorité devrait être : mettre en place un vrai dépôt Git (GitHub) connecté à Netlify, avant toute refonte de l'architecture.
