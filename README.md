# Epitale 🧡 — notre quotidien à deux

PWA gratuite pour partager la charge mentale à deux : tâches (à moi / à elle / à deux, deadline, récurrence),
planning de RDV, liste de courses, et un écran « Aujourd'hui » qui dit à chacun ce qu'il a à faire.

## Essayer tout de suite (mode démo)

```bash
npm install
npm run dev
```
Sans configuration, l'app tourne en **mode démo** (données locales, un seul appareil).

## Synchroniser vos 2 téléphones (Firebase, gratuit)

1. https://console.firebase.google.com → **Ajouter un projet** (Google Analytics inutile).
2. **Build → Authentication → Commencer → Email/Mot de passe → Activer**.
3. **Build → Firestore Database → Créer** (mode production, région `eur3` / `europe-west`).
4. Onglet **Règles** de Firestore : colle le contenu de `firestore.rules` puis **Publier**.
5. ⚙️ **Paramètres du projet → Général → Vos applications → `</>` (Web)** : enregistre l'app et copie la config.
6. `cp .env.example .env.local` et remplis les 6 valeurs `VITE_FIREBASE_*`.
7. `npm run dev` : crée ton compte → **Créer notre foyer** → un code s'affiche.
   Ta copine crée son compte sur son téléphone → **J'ai un code** → c'est synchronisé en temps réel.

Le plan gratuit Firebase (Spark) est très largement suffisant pour 2 personnes.

## Mettre en ligne (gratuit) pour l'avoir sur les téléphones

**Cloudflare Pages** (ou Vercel/Netlify) : connecte le repo GitHub, puis
- Build command : `npm run build` — Output directory : `dist`
- Variables d'environnement : les 6 `VITE_FIREBASE_*`
- Firebase → Authentication → **Paramètres → Domaines autorisés** : ajoute le domaine fourni (ex. `epitale.pages.dev`).

## Installer sur le téléphone

- **iPhone** : ouvrir l'URL dans **Safari** → Partager → *Sur l'écran d'accueil*.
- **Android** : Chrome → menu ⋮ → *Installer l'application*.

## Structure

- `src/store/` — `LocalProvider` (démo) et `FirebaseProvider` (temps réel + hors-ligne) derrière la même interface `Store`.
- `src/screens/` — Aujourd'hui, Tâches, Planning, Courses, connexion.
- `src/lib/` — dates, récurrence, logique des tâches.
- `firestore.rules` — seuls les 2 membres du foyer lisent/écrivent les données.

## Prochaine étape possible

Notifications push (Firebase Cloud Messaging + Cloud Function) pour les deadlines et les assignations.
