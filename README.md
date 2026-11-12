# Epitale 🧡 — notre quotidien à deux

PWA gratuite pour partager la charge mentale à deux, sur deux téléphones.

## Fonctionnalités

- **Tâches** avec responsable (moi / elle / à deux / **à prendre**), domaines créables, étapes (tout valider d'un coup ou étape par étape),
  récurrence avec **alternance** (« à tour de rôle »).
- **Échéances** : « **Avant le…** » (compte à rebours J-5, J-2, Dernier jour, de plus en plus pressant) ou « **Le jour J** ».
  Rappel N jours avant, et « Je m'y mets le… ».
- **Planning** : événements (heure, toute la journée, sur plusieurs jours, répétés), anniversaires 🎂, drapeaux d'échéance.
- **Anniversaires** : récurrents chaque année, carte festive, âge, et tâche « Cadeau + carte » créée automatiquement N jours avant.
- **« À préparer »** sur un événement : listes types (Ménage, Affaires pour partir, Courses…) → tâche avec étapes.
- **Courses** par rayon, **habituels** en un geste, **repas de la semaine** qui alimentent la liste.
- **« Je m'en occupe »** pour prendre une tâche libre, **bilan du dimanche** (qui a fait / pensé à quoi, « Merci »),
  **infos pratiques** (téléphones, codes, contrats), **ajout rapide en une phrase** (au clavier ou **à la voix**).
- **Notifications** push (assignation, échéance, anniversaires, résumé du matin, tâche terminée).

## Essayer tout de suite (mode démo)

```bash
npm install
npm run dev
```
Sans configuration, l'app tourne en **mode démo** (données locales, un seul appareil).

## Synchroniser vos 2 téléphones (Firebase, gratuit)

1. https://console.firebase.google.com → **Ajouter un projet** (Google Analytics inutile).
2. **Authentication → Commencer → Email/Mot de passe → Activer**.
3. **Firestore Database → Créer** (mode production, région `eur3` / `europe-west`).
4. Onglet **Règles** de Firestore : colle le contenu de `firestore.rules` puis **Publier**.
5. ⚙️ **Paramètres du projet → Général → Vos applications → `</>` (Web)** : enregistre l'app et copie la config.
6. `cp .env.example .env.local` et remplis les `VITE_FIREBASE_*`.
7. `npm run dev` : crée ton compte → **Créer notre foyer** → un code s'affiche.
   Ta copine crée son compte sur son téléphone → **J'ai un code**.

## Mettre en ligne (gratuit)

**Cloudflare** (Workers & Pages), connecte le repo GitHub :
- Build command : `npm run build` — sortie : `dist`
- Variables de **build** : les `VITE_FIREBASE_*` (et `VITE_FIREBASE_VAPID_KEY` pour les notifications).
- Firebase → Authentication → **Paramètres → Domaines autorisés** : ajoute le domaine fourni.

Installer sur le téléphone : **iPhone** : Safari → Partager → *Sur l'écran d'accueil* · **Android** : Chrome → ⋮ → *Installer l'application*.

## 🔔 Activer les notifications (une seule fois)

Les notifications viennent d'un petit programme gratuit (dossier `worker/`) qui s'exécute **toutes les 10 minutes** sur Cloudflare.

1. **Clé Web Push.** Firebase → ⚙️ Paramètres du projet → **Cloud Messaging** → *Certificats Web Push* → **Générer une paire de clés**.
   Copie la clé et ajoute-la aux variables de **build** du site Cloudflare : `VITE_FIREBASE_VAPID_KEY`. Relance le déploiement du site.
2. **Compte de service.** Firebase → ⚙️ Paramètres du projet → **Comptes de service** → **Générer une nouvelle clé privée** (un fichier `.json`
   est téléchargé). Garde-le secret.
3. **Déployer le programme.** Cloudflare → *Workers & Pages* → **Create → Import a repository** → ce repo, avec :
   - **Root directory** : `worker`
   - **Deploy command** : `npx wrangler deploy`
   - **Variables** : `FIREBASE_PROJECT_ID` = ton identifiant de projet Firebase ; **secret** `GOOGLE_SERVICE_ACCOUNT` = tout le contenu du fichier `.json`.
   - Facultatif : secret `RUN_KEY` (n'importe quel mot de passe) pour lancer un passage à la main : `https://<ton-worker>.workers.dev/?key=<RUN_KEY>`.
4. Sur **chaque téléphone** : onglet **Plus → Notifications → activer**. Sur iPhone, l'appli doit d'abord être ajoutée à l'écran d'accueil (iOS 16.4+).

Coût : gratuit (les passages utilisent quelques milliers de lectures Firestore par jour, largement dans le quota offert).

## Structure

- `src/store/` — `LocalProvider` (démo) et `FirebaseProvider` (temps réel + hors-ligne) derrière la même interface `Store` ; `push.ts` (abonnement aux notifications).
- `src/screens/`, `src/components/` — écrans et formulaires. `src/lib/` — dates, échéances, événements récurrents, anniversaires, ajout rapide, bilan.
- `worker/` — programme d'envoi des notifications (logique pure dans `logic.ts`, accès Firestore REST, jeton Google, FCM).
- `firestore.rules` — seuls les 2 membres du foyer lisent/écrivent les données.

## Tester la synchro en local (émulateur Firebase)

```bash
npx firebase-tools emulators:start --only auth,firestore --project demo-epitale   # nécessite Java
VITE_FIREBASE_API_KEY=x VITE_FIREBASE_PROJECT_ID=demo-epitale VITE_FIREBASE_EMULATOR=1 npm run dev
```

## En cas de souci de synchro

Un bandeau rouge « Souci de synchro (code) » apparaît en haut avec le code d'erreur Firestore, et Réglages → « Synchro » l'indique aussi
(pratique sur téléphone, sans console).
