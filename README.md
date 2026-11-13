# TYPING MASTER By Sada

A fast, installable 3D WebGL typing game with **Solo** and **2-Player Head-to-Head Friend Duel** modes, real-time WPM/accuracy telemetry, procedural Web Audio synthesis, and a persistent local leaderboard.

---

## Features

- **Two Focused Game Modes**:
  - **Solo Run**: Practice at Easy, Normal, or Fast pacing and chase personal bests.
  - **With a Friend (2-Player Duel)**: Turn-based local competitor mode. Player 1 completes a round, passes the device or keyboard to Player 2, and receives a side-by-side winner comparison across WPM, Accuracy, Score, and Max Combo.
- **Real-Time 3D WebGL Arena**: Procedural multi-part 3D interceptor craft, scrolling grid corridor, instanced particles, dynamic FOV scaling, and crisp 3D word target plaques.
- **Procedural Sound Engine**: Synthesized keystroke clicks, laser bursts, and impact feedback using the browser Web Audio API with zero external audio assets.
- **Installable PWA**: Works offline with Service Worker caching and includes an in-app **Install App** button to add directly to your home screen.
- **Persistent Leaderboard**: Tracks top scores across difficulty tiers in browser `localStorage`.

---

## Tech Stack & Hardware Used

### Software Stack
- **Frontend Framework**: React 19 + TypeScript
- **Build Tool & Dev Server**: Vite 8
- **3D Rendering Engine**: Three.js (WebGL2 / WebGL with `RoomEnvironment` PBR reflections and `InstancedMesh` particles)
- **Styling**: Tailwind CSS v4 + `Outfit`, `Plus Jakarta Sans`, and `JetBrains Mono` typography
- **Icons**: Lucide React
- **Audio**: Native Web Audio API procedural synthesizer
- **PWA / Offline Layer**: `vite-plugin-pwa` (Workbox service worker + Web App Manifest)

### Hardware & Target Environments
- **Graphics**: Hardware-accelerated GPU via WebGL2, with automatic software-WebGL detection and frame-paced rendering fallback for headless or low-power environments
- **Input Devices**: Physical mechanical/laptop keyboards and touch-screen virtual keyboards (IME-safe character diffing)
- **Displays**: Responsive `100dvh` viewport scaling for wide desktop monitors, tablets, and portrait handheld displays

---

## Run Locally

### Prerequisites
- Node.js 20+
- npm 10+

### Steps
```bash
# 1. Clone the repository
git clone https://github.com/saamisada/typing-master-by-sada.git
cd typing-master-by-sada

# 2. Install dependencies
npm install

# 3. Start the local development server
npm run dev
```

Open `http://localhost:3000` in your browser.

### Production Build & Type Check
```bash
npm run lint
npm run build
npm run preview
```

---

## Deploy on Cloudflare Pages

You can publish the GitHub repository directly to Cloudflare Pages in a couple of minutes:

1. Log in to the **Cloudflare Dashboard** and navigate to **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Authorize GitHub and select your repository.
3. Configure the build settings:
   - **Project name**: `typing-master-by-sada` (or `TYPING MASTER By Sada`)
   - **Production branch**: `main`
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Click **Save and Deploy**. Cloudflare Pages will install dependencies, build the static bundle + PWA service worker into `dist/`, and publish it on `https://typing-master-by-sada.pages.dev`.

---

## Using as a Reference & Contributing

This codebase is open for learning, reference, and community improvements:
- **3D Game Architecture**: Inspect `src/components/TypingArena3D.tsx`, `src/game/shipModel.ts`, and `src/game/textures.ts` for zero-GC Three.js loops, procedural geometries, and CanvasTexture UI plaques.
- **Audio Synthesis**: Check `src/game/audioSynth.ts` for sample-free Web Audio effects.
- **PWA Setup**: See `vite.config.ts`, `src/hooks/usePWAInstall.ts`, and `src/components/PWAInstallButton.tsx`.

### Contributing
1. Fork this repository.
2. Create a feature branch (`git checkout -b feat/your-feature`).
3. Commit your changes with clear messages.
4. Run `npm run lint` and `npm run build` to verify everything compiles cleanly.
5. Open a Pull Request describing your changes.

---

## License

Released under the [MIT License](./LICENSE).
