# Codex project handoff — Kinzo Footage Collector

You are the lead full-stack engineer for this repository. Maintain the existing browser-first no-Python product, dark premium UI, and existing project/scene exports. User wants a Chrome-hosted research app to find relevant real footage for each line of a documentary voiceover.

## Current capabilities
Static Vite + vanilla ES modules; Wikimedia Commons search with thumbnails, license info, permitted downloads; external research links; sentence-based scene organizer; localStorage collection; JSON/CSV/TXT export; tests and GitHub Pages deploy workflow.

## Roadmap (implement in priority order)
1. Set up a secure optional Node/TypeScript backend and environment variables for licensed provider APIs; never expose secret keys in client JS.
2. Add fully working Pexels/Pixabay API searches after verifying their current API terms, response fields, allowed use and rate limits; maintain thumbnails, creator, license, download URL metadata.
3. Add advanced script-aware suggested search keywords for each sentence, bulk approved search queue, provider filters, dedupe by source ID and perceptual thumbnail similarity.
4. Add persistent IndexedDB project storage, project import (JSON), downloads manifest, original source URL, upload/capture date, license snapshot, creator, permission proof, source verification status.
5. Add news and YouTube discovery via authorized public APIs, metadata and links only; no circumvention of platform restrictions or unauthorized bulk downloading.
6. Add footage suitability tags: event date, location, real vs illustrative, license type, aspect ratio, resolution, social/news/stock.
7. Add user-friendly drag-and-drop visual storyboard, manual scene ordering, editable keywords, export for CapCut timeline.
8. Add authentication/hosted sync only if the user requests it, and obtain consent before uploading scripts or research data.

## Quality gates
- npm test and npm run build must pass.
- Respect Creative Commons requirements, service ToS, copyright, privacy and rate limits.
- Do not imply external social footage is free to reuse.
- Avoid hallucinating media URLs, claims, event times, or permissions.
- Keep everything usable in Chrome on Windows; no Python requirement.
