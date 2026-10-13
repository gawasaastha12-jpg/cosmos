# Cosmic Mythology AR Explorer

An interactive, zero-build, static front-end web application bridging ancient celestial mythology and modern observational astrophysics across world skies.

---

## 🌌 Overview & Architecture

- **Zero-Build Architecture**: Runs entirely as static HTML5, Vanilla JavaScript, CSS3, WebGL (Three.js), and client-side Canvas. No bundlers (Vite/Webpack), no frameworks (React/Next), and no backend server required.
- **Client-Side Astrometry**: Calculates Greenwich Mean Sidereal Time (GMST), Local Sidereal Time (LST), Hour Angle ($HA$), and horizon altitude strictly in the browser using device GPS and gyroscope.
- **Offline & Fallback Ready**: Embedded dataset fallbacks allow the explorer to run completely offline without an internet connection.
- **Audio Engine**: Dual-path narration system supporting pre-rendered native audio recordings and seamless fallback to client-side Web Speech API across multiple languages.

---

## 🚀 Deployment Guide (Static Hosting)

Because this project requires **no build step**, deployment to any modern static host takes under two minutes.

### 1. Netlify
- **Option A (Netlify Drop)**: Drag and drop the repository folder directly into [Netlify Drop](https://app.netlify.com/drop).
- **Option B (Netlify CLI)**:
  ```bash
  npm install -g netlify-cli
  netlify deploy --prod --dir .
  ```
- **Option C (Git Connect)**:
  - Build command: *(leave empty)*
  - Publish directory: `.` (root)

### 2. Vercel
- **Option A (Vercel CLI)**:
  ```bash
  npm install -g vercel
  vercel --prod
  ```
- **Option B (Git Connect)**:
  - Framework Preset: `Other`
  - Build Command: *(leave empty)*
  - Output Directory: `.` (root)

### 3. Cloudflare Pages
- Connect your GitHub/GitLab repository.
- **Framework preset**: `None`
- **Build command**: *(leave empty)*
- **Build output directory**: `.`

### 4. GitHub Pages
- Go to repository **Settings** → **Pages**.
- **Source**: `Deploy from a branch`.
- **Branch**: `master` (or `main`) / folder: `/ (root)`.
- Save.

---

## 🛡️ Public Mode & Policy Configuration

By default, the application runs in **Public Mode**:
- **Verified & Probable Only**: Stories marked `unverified` are automatically hidden.
- **Pending Review Policy**: Stories from living Indigenous oral traditions flagged `pending community review` are excluded from public builds per cultural heritage preservation ethics.

### Configuration (`data/policy.json`)
You can adjust the inclusion policy at any time without rebuilding code:
```json
{
  "excludePendingCommunityReview": true,
  "hideUnverified": true
}
```

### Developer Mode URL Flag
To inspect all 165 raw stories, unverified records, and pending community items for developer auditing:
```
https://your-domain.com/?all=1
```

---

## 📁 Repository Structure

```
.
├── index.html                  # Main application (Cosmic Canvas, Science, Myth, Journeys)
├── about.html                  # Credits, sources, mathematical methods & error reporting
├── privacy.html                # Privacy policy (zero telemetry, on-device local storage)
├── 404.html                    # Static 404 error page
├── data/
│   ├── policy.json             # Public build policy configuration
│   ├── myth.json               # 165 celestial stories across 10 global traditions
│   ├── citation-audit.csv      # Academic citation audit with primary evidence URLs
│   ├── audio-stories.json      # Audio story metadata, durations, and sentence timestamps
│   └── myth.public.json        # Pre-built public distribution dataset
├── audio/                      # Audio narration recordings
├── scripts/
│   ├── build-public.js         # Prunes unverified/pending stories into myth.public.json
│   ├── generate-fallbacks.js   # Synchronizes embedded fallback data in index.html
│   ├── check-links.js          # Validates news and citation HTTP links
│   └── validate-content.js     # Validates JSON schema integrity
└── README.md                   # Deployment and operational documentation
```

---

## 📜 License & Ethics
- Astrometric coordinates derived from the Bright Star Catalogue (BSC5), ESA Hipparcos, and ESA Gaia DR3.
- Traditional celestial narratives curated from classical digitized archives (Perseus, Sacred Texts, ctext.org) and museum cultural documentation.
