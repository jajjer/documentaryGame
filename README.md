# DocuFrame – Weekly Documentary Guessing Game

DocuFrame is a simple Wordle-style web game for documentaries. Each week there is one documentary and up to five image frames as hints. Players get at most five guesses; each wrong guess reveals another frame, and at the end they can copy a shareable text result.

**[Play the live game →](https://jajjer.github.io/documentaryGame/)**

This project is a Vite + React + TypeScript single-page app wired to use Firebase Firestore for storing weekly puzzles.

## Tech stack

- React 19 + TypeScript
- Vite 7
- Firebase Web SDK 12 (Firestore)
- Vitest + React Testing Library (tests)

---

## Testing

```bash
npm run test        # Run tests once
npm run test:watch  # Run tests in watch mode
```

Tests run automatically in CI before each deploy. Unit tests cover `utils` (normalizeTitle, week helpers); component tests cover the App shell, loading state, and puzzle UI with mocked Firebase.

---

## Getting started

1. **Install dependencies**

   From the project root:

   ```bash
   npm install
   ```

2. **Create a Firebase project**

   - Go to the Firebase console and create a new project.
   - Add a **Web app** to that project.
   - Copy the web configuration (apiKey, authDomain, etc).

3. **Configure environment variables**

   Create a `.env.local` file in the project root (not committed to git) and paste your Firebase config:

   ```bash
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id   # optional, for Analytics
   ```

   These are read in `src/firebase.ts` via `import.meta.env`.

   **Analytics (optional):** To see usage (sessions, active users, custom events), enable **Google Analytics** in the Firebase Console (Project settings → General → Your apps → choose the web app → ensure "Enable Google Analytics" is on). Copy the `measurementId` (e.g. `G-XXXXXXXXXX`) into `.env.local` as `VITE_FIREBASE_MEASUREMENT_ID`. The app logs `game_started` (when someone starts a week’s puzzle) and `game_completed` (outcome and attempt count). View reports under **Analytics** in the Firebase Console.

4. **Create the Firestore collection**

   In Firestore (recommended: **Firestore in Native mode**), create a collection:

   - Collection: `weeklyPuzzles`
   - Document ID format: the Monday of the week, e.g. `2026-03-02`.

   Each document should have fields like:

   - `title` (string) – canonical documentary title (e.g. `"The Last Dance"`).
   - `images` (array of string) – up to 5 image URLs in order from hardest to easiest.
   - `altTitles` (array of string, optional) – alternative accepted titles.
   - `year` (number, optional) – release year.

   Example document:

   ```json
   {
     "title": "The Last Dance",
     "images": [
       "https://your-cdn.com/frames/last-dance-1.jpg",
       "https://your-cdn.com/frames/last-dance-2.jpg",
       "https://your-cdn.com/frames/last-dance-3.jpg",
       "https://your-cdn.com/frames/last-dance-4.jpg",
       "https://your-cdn.com/frames/last-dance-5.jpg"
     ],
     "altTitles": ["Last Dance"],
     "year": 2020
   }
   ```

   The app computes the current week’s Monday date and looks up that document ID.

5. **Run the dev server**

   ```bash
   npm run dev
   ```

   Then open the printed `http://localhost:5173` (or similar) URL in your browser.

---

## Game rules & behavior

- **One puzzle per week**: The current week is identified by `Week of MM/DD/YYYY` (Monday). Firestore doc ID is the Monday date string (`YYYY-MM-DD`).
- **Frames**:
  - 5 possible image frames per puzzle.
  - The first frame is visible from the start.
  - Each wrong guess reveals one more frame (up to 5).
- **Guesses**:
  - Maximum of 5 guesses per week.
  - Matching ignores case, punctuation, and leading articles (`The`, `A`, `An`).
  - You can optionally define `altTitles` for alternate names.
- **Persistence**:
  - A player’s attempts and result for the current week are stored in `localStorage` under `docuframe:<weekId>`.
  - Once they finish (win or lose), they can’t replay on that browser.
- **Share text**:
  - After the game is complete, a “Share result” button copies a Wordle-style text summary to the clipboard (plain text, no special dependencies).

---

## Files to look at

- `src/App.tsx` – main game UI and logic (guess handling, frames, share text).
- `src/firebase.ts` – Firebase app + Firestore initialization.
- `src/utils.ts` – week ID computation and title normalization.
- `src/index.css` – styling for the layout and components.
- `vite.config.ts` – Vite config with `@vitejs/plugin-react-swc`.

---

## Deploying

### GitHub Pages (recommended)

1. **Create a new repo on GitHub**  
   Create a repository (e.g. `Documentary`). Do not add a README or .gitignore (this project already has them).

2. **Match the repo name to the site base**  
   In `vite.config.ts`, `base` is set to `'/Documentary/'` for GitHub Pages. If your repo name is different, change it to `'/<your-repo-name>/'` (with leading and trailing slashes).

3. **Push the project**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/Documentary.git
   git push -u origin main
   ```

4. **Add Firebase env as repo secrets**  
   So the built app can talk to Firebase, add these as **Actions secrets** (repo → Settings → Secrets and variables → Actions → New repository secret) with the same names and values as in your `.env`:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MEASUREMENT_ID` (optional; for Analytics on the deployed site)

5. **Turn on GitHub Pages**  
   In the repo: **Settings → Pages → Build and deployment → Source**: choose **GitHub Actions**.  
   After the next push to `main` (or a manual workflow run), the site will be at `https://YOUR_USERNAME.github.io/Documentary/`.

### Other hosts

- **Firebase Hosting**: run `npm run build` and deploy the `dist` folder.
- Netlify, Vercel, etc.: point the build command to `npm run build`, publish `dist`, and set the same `VITE_*` env vars at build time.

