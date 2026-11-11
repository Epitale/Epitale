# Matibault 🧡 — notre quotidien à deux

PWA gratuite pour partager la charge mentale à deux :

- **Tâches** (à moi / à elle / à deux, deadline, récurrence) avec **étapes** : on peut tout valider d'un coup via la tâche
  principale, ou seulement une ou deux étapes ; chaque étape peut avoir son responsable.
- **Domaines** (Bébé, Santé, Maison…) et création de vos propres domaines en un geste.
- **Planning** : rendez-vous à l'heure, « toute la journée » ou **sur plusieurs jours** (barres continues).
- **« À préparer »** : sur un événement, choisis une **liste type** (Ménage maison, Affaires pour partir, Courses de la
  semaine…) : elle devient automatiquement une tâche avec ses étapes. Supprimer l'événement supprime ses tâches.
- **Listes types** modifiables dans Réglages. **Courses** partagées. Écran **Aujourd'hui** (« Elle t'a laissé ça »).

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

## Tester la synchro en local (émulateur Firebase)

```bash
npx firebase-tools emulators:start --only auth,firestore --project demo-epitale   # nécessite Java
VITE_FIREBASE_API_KEY=x VITE_FIREBASE_PROJECT_ID=demo-epitale VITE_FIREBASE_EMULATOR=1 npm run dev
```

## En cas de souci de synchro

Un bandeau rouge « Souci de synchro (code) » apparaît en haut de l'écran avec le code d'erreur Firestore, et
Réglages → « Synchro » l'indique aussi (pratique sur téléphone, sans console).
