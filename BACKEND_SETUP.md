# Kinzo Footage Collector — Professional Backend v2

## What is implemented

- Node.js backend serving `GET /api/health`, `/api/search`, `/api/videos`, and `/api/news`.
- Actual video-file search through **Pexels**, **Pixabay**, and **Wikimedia Commons** official APIs.
- Pexels and Pixabay need their own API keys. Wikimedia Commons does not require a key.
- Curated real Pexels MP4 references for related weather queries when APIs are unavailable. These are **stock B-roll**, not footage of a specific news event.
- Existing repository news cache returns dated article references and original links.
- Frontend has playable HTML5 video players, original-source buttons, MP4 links, creator, license and upload date when verified.
- Social links go to the original platforms; **not** a downloader for YouTube, Instagram, Facebook, TikTok, or X.
- Node unit tests, full-browser search tests, and a separate remote MP4 playback test.

## Local test (developer)

Requires Node.js >= 22.

```bash
npm test
npm start
```

Open http://localhost:8787/ . Confirm `http://localhost:8787/api/health` responds with `status:ok`.

Without API keys, query-matched **curated** Pexels clips and live Wikimedia videos (if reachable) are available. New broad Pexels/Pixabay searches require keys.

## Deploy backend with Render

The repository includes a `render.yaml` Blueprint for a **free** Render Node web service. Free services may sleep when idle and have usage limits.

1. Open [Render Dashboard](https://dashboard.render.com/) and connect your GitHub account.
2. Choose **New → Blueprint** and select `Asim218121/kinzo-data-collector-`. Render reads `render.yaml`.
3. Add `PEXELS_API_KEY` from [Pexels API](https://www.pexels.com/api/) and `PIXABAY_API_KEY` from [Pixabay API](https://pixabay.com/api/docs/) in Render's **secret environment variables**. These keys can initially be blank; Pexels/Pixabay live search won't work until provided.
4. When Render shows a service URL like `https://kinzo-video-backend-xxxx.onrender.com`, open its `/api/health` endpoint.
5. You may use the new Render URL directly for the complete site, **or** open the existing GitHub Pages website and paste the Render URL into **Backend URL → Connect backend**.

Do not put API keys into GitHub HTML, JavaScript, or public files. Render is not currently connected through GitHub just because `render.yaml` is present. A deploy action is still required.

## Search behavior

- `/api/search?q=California%20flooding&days=7&source=all` returns `videos`, `news`, provider status, and original-source `links`.
- A video card represents a linked MP4/WebM file. It is **not** independently verified to depict the searched news event.
- `dateUploaded` and `dateRecorded` are null if upstream doesn't provide them, rather than fabricated.
- For media reuse, always confirm original provider license; an MP4 link is not blanket permission to republish it.

## Current limitations

- Cannot automatically download or reuse social-media video that a platform or creator has not authorized.
- Live news retrieval is powered by the existing scheduled GitHub RSS cache, not a general crawler of every article.
- Additional authorized platform integrations require provider API credentials/approval, rate-limit handling and permission policies.
- Github Pages is a static frontend. The live Node backend requires a separate running service such as Render.
