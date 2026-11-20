# Kinzo Footage Collector v2

**Professional Node backend + real playable video search:** see [BACKEND_SETUP.md](BACKEND_SETUP.md).


A GitHub-ready, browser-based documentary media research workspace. **No Python, no Node installation needed for GitHub Pages hosting.**

## Features
- Topic search against Wikimedia Commons live API (photos and videos), thumbnails, file links, creator/license info
- External research searches for Google Images, YouTube, Pexels, Pixabay, TikTok, Instagram, Google News, NOAA, USGS
- Script TXT upload / paste, automatic sentence-per-scene splitting
- Save selected sources to a local browser collection; assign items to scenes
- Permitted downloads for clearly recognized Commons licenses (public domain, CC0, CC BY, CC BY-SA), with manual rights confirmation and source fallback
- Shot list CSV, attribution TXT, scene TXT, full project JSON export
- Browser local storage, no third-party tracking service, no proprietary API keys

## Important limitations
- The current app searches Wikimedia Commons media directly. Other sources are **external search links**, not in-app indexed feeds.
- This app **does not scrape or automatically download** YouTube/TikTok/Instagram/news footage. Research results do not imply reuse rights.
- Wikimedia files can carry additional restrictions (personality/privacy, trademarks, local copyright law, model releases), even with a free copyright license. Always check source pages and follow attribution/share-alike obligations.
- The web app cannot bypass publisher paywalls or website copy protection.
- Local storage is specific to the browser/device and can be cleared. Regularly export JSON.
- A photo's upload date does not prove the depicted event date. Verify footage age and location at the source.
- This repository is not already deployed. A public URL appears only after *you* push it to hosting.

## Open in Chrome (simple)
1. Use GitHub Pages or Netlify deployment below. It opens as an ordinary URL in Chrome.
2. Or install Node.js 22+, then run:

```bash
npm install
npm run dev
```

Open the local URL shown by Vite (usually `http://localhost:5173`).

## Deploy on GitHub Pages (free)
1. Create a new GitHub repository, e.g. `kinzo-footage-collector`.
2. Upload **all contents of this folder** into the repository root, commit to `main`.
3. Open repository **Settings > Pages > Build and deployment > Source: GitHub Actions**.
4. Click **Actions > Deploy Kinzo web app to GitHub Pages > Run workflow** (or push to main). The GitHub Pages workflow deploys the static site directly; no npm installation is needed.
5. Open `https://YOUR-USERNAME.github.io/kinzo-footage-collector/` (actual URL depends on repository name). Do not assume the URL is active before deployment succeeds.

## Deploy on Netlify
1. Create Netlify account and connect GitHub repository.
2. Set build command `npm run build` and publish directory `dist`.
3. Deploy. Netlify gives your browser URL.

## Automated tests

```bash
npm test
npm run build
```

## Suggested Codex instructions
Copy `CODEX_TASK.md` into Codex along with this repo. Ask Codex to extend live search connectors, better local media storage, and storyboards while respecting service terms and copyright.

## Security
The app uses the Commons public API and external official search links. It does not ask for credentials. Do not paste private API keys into browser code or commit them to GitHub. A future backend is needed for any private API keys or protected provider integrations.
