# Pulse

Pulse is a free, open-source, local-first interactive presentation tool for post-secondary educators — a simple alternative to tools like Mentimeter. Instructors build a presentation of ordinary slides and interactive questions, present it from their own computer, and students join from their phones or laptops over the local network. No student accounts, no cloud service, no persistent student data.

See [`Vision Document.txt`](./Vision%20Document.txt) for the full product vision and functional spec this app is built against.

## Installing Pulse (no coding required)

Don't use "Code → Download ZIP" on GitHub — that downloads source code, not the app, and needs Node.js to build. Instead:

1. Go to the [Releases page](https://github.com/EgoTunnel/Pulse/releases) and open the latest release.
2. Under **Assets**, download the file for your computer:
   - Windows: `Pulse Setup <version>.exe`
   - Mac: `Pulse-<version>.dmg`
   - Linux: `Pulse-<version>.AppImage`
3. Run it.
   - **Windows**: you'll likely see a blue "Windows protected your PC" screen — this is normal for a new app that isn't yet code-signed. Click **More info**, then **Run anyway**.
   - **Mac**: right-click (or Control-click) the app and choose **Open**, then confirm **Open** in the dialog — this is Gatekeeper's equivalent warning for an app from outside the App Store.
   - **Linux**: mark the AppImage executable first (right-click → Properties → Permissions → "Allow executing", or `chmod +x Pulse-<version>.AppImage`), then double-click it.

That's it — Pulse opens and you can start building a presentation.

## How it works

Pulse is an Electron desktop app. When an instructor starts a classroom session, the app runs a small local web server (Express + Socket.IO) on the instructor's own machine. Students on the same network scan a QR code or type a short room code to open a plain web page — no install required — and their responses stream back to the presenter in real time over that same local server. Nothing leaves the room; there is no cloud backend.

Presentations are saved as plain `.pulse.json` files (with any images embedded as data URLs), so they're fully portable — copy them, back them up, or hand them to another instructor like any other file.

## Project layout

- `src/shared` — data model, socket event contracts, and helpers shared by every process (`types.ts`, `slideFactory.ts`, `slideMeta.ts`).
- `src/main` — the Electron main process: `presentationStore.ts` (file + library persistence), `sessionManager.ts` (in-memory live session state and results aggregation), `server.ts` (the local Express + Socket.IO server), `index.ts` (app bootstrap + IPC).
- `src/preload` — the context-bridge API (`window.pulse`) exposed to the instructor renderer.
- `src/renderer/src/instructor` — the instructor app: library, slide editor, and present mode.
- `src/renderer/src/student` — the student web app served to devices on the local network.
- `src/renderer/src/shared` — slide rendering components shared between the editor, present mode, and (indirectly) the student experience.

## Getting started

```bash
npm install
npm run dev
```

This starts the Vite dev server and launches the Electron app. The instructor window opens automatically; when you start a classroom session, the local server binds to port `5390` and the student page becomes reachable at `http://<your-LAN-IP>:5390`.

Other scripts:

```bash
npm run typecheck   # TypeScript, no emit
npm run build        # production build (out/)
npm run build:win    # build + package a Windows installer (local only, doesn't publish)
npm run build:mac    # build + package a macOS app
npm run build:linux  # build + package a Linux package
```

## Cutting a release

Releases are built by GitHub Actions ([`.github/workflows/release.yml`](.github/workflows/release.yml)), not on your machine — it builds Windows, Mac, and Linux installers in parallel and publishes them straight to a GitHub Release.

To ship one:

```bash
npm run release           # bumps the patch version (0.1.0 -> 0.1.1), commits, tags, and pushes
npm run release minor     # or: minor / major version bump
```

That's the entire process — pushing the tag is what triggers the build. Watch progress at [github.com/EgoTunnel/Pulse/actions](https://github.com/EgoTunnel/Pulse/actions); once it's green, the new installers are live on the [Releases page](https://github.com/EgoTunnel/Pulse/releases) for anyone to download (see "Installing Pulse" above).

## Status

This covers the MVP described in the vision document's "MVP Definition" and beyond: creating presentations with basic content slides plus all 12 interactive question types (multiple choice, multiple select, true/false, rating, Likert, word cloud, short/open answer, ranking, numeric, Q&A, poll); saving and reopening presentations; starting a session with a QR/room-code join flow; anonymous real-time responses; and ending a session with participation data discarded.

Also done:

- **Q&A moderation** — the instructor can mark a submitted question addressed or dismiss it entirely; both propagate live to the presenter view.
- **Accessibility pass** — keyboard-operable slide list and menus (no mouse-only drag/click paths), visible focus rings, `aria-live` regions for live counts and confirmations, labeled form controls throughout both apps, `aria-pressed`/`aria-expanded` on toggles, a screen-reader-readable list alongside the word cloud (which otherwise only encodes data as font size), image alt text (with a dedicated alt-text field for instructors to fill in), a properly modal end-session dialog, and `prefers-reduced-motion` support.
- **Installer** — electron-builder config with a custom icon (`build/icon.png`, auto-converted per platform); verified locally by installing and launching the packaged Windows app. `npm run release` pushes a version tag, and GitHub Actions (`.github/workflows/release.yml`) builds Windows/Mac/Linux installers and publishes them to a GitHub Release automatically — no local build/upload step needed for either the maintainer or the person installing it.
- **Auto-update** — `electron-updater` (`src/main/updater.ts`) checks quietly on launch and every 4 hours against the same GitHub Releases the installer publishes to; nothing is shown to the instructor until an update has actually downloaded, at which point a small "Restart to update" banner appears (never during a live presentation). **macOS caveat**: auto-update requires the app be code-signed, which this project doesn't do yet (see Security below) — unsigned Mac users will need to redownload manually for now.
- **Security review** — see below.

Not yet built: code signing (needed for macOS auto-update, and to remove the Windows SmartScreen / macOS Gatekeeper warnings) and a full manual accessibility audit (screen-reader testing wasn't possible in this environment — the pass above is markup-level, not verified with an actual reader).

## Security

Pulse's threat model: the local server (`src/main/server.ts`) accepts connections from any device on the same network — that's the whole point of the join flow — so every socket message is treated as untrusted input, the same way a public web server would. A pre-release review covered this and the rest of the app; changes made as a result:

- **Input validation on every socket handler** (`src/main/validate.ts`). Previously a malformed message (wrong type, missing field, huge payload) could throw an uncaught exception inside a socket handler — which crashes the whole Electron process, ending class for everyone. Every handler now validates shape and bounds before acting, and is wrapped so a handler error is logged, never fatal. Verified with an automated test sending ~25 categories of malformed/hostile payloads (wrong types, non-existent option IDs, oversized arrays, a `__proto__` probe, etc.) at a live server — all rejected cleanly, server fully functional afterward.
- **Brute-force mitigation**: a socket that repeatedly guesses the wrong room code gets disconnected after 5 attempts.
- **CORS** is wildcard only in dev (needed because the dev student page is served from a different port than the API); a packaged build only accepts same-origin connections, closing off drive-by access from an unrelated website's background script.
- **Content-Security-Policy / X-Frame-Options / X-Content-Type-Options** headers on everything the local server serves (the actual network-facing surface — the instructor's own window loads no remote content and is separately sandboxed, see below).
- **Untrusted presentation files**: `.pulse.json` is explicitly a shareable, portable format ("share it with another instructor" per the vision doc), so a hand-edited or malicious file is untrusted input too. Opening one now validates structure (unrecognized slides are dropped, not crashed on) and strips any `imageDataUrl` that isn't an embedded `data:image/` URI — otherwise opening someone else's file could silently make the app fetch an arbitrary external URL, leaking that the file was opened.
- **Electron hardening**: `contextIsolation`, disabled `nodeIntegration`, and `sandbox: true` on the instructor window (the last of these required switching the preload script's build output from ESM to CommonJS — Electron's sandboxed preload loader doesn't support `import`/`export` syntax regardless of file extension). Verified `window.pulse` is exposed correctly and no Node globals (`require`, `process`) leak into the page under sandboxing.
- Zero vulnerabilities in shipped dependencies (`npm audit --omit=dev`); the ~17 flagged by a full `npm audit` are all in build-only tooling (electron-builder's dependency chain, esbuild/vite) that never reaches the installer.
- A process-level `uncaughtException`/`unhandledRejection` handler logs and keeps running rather than crashing, as a last-resort safety net beyond the input validation above.

**Known residual risk, accepted rather than fixed**: the local server runs over plain HTTP, not HTTPS. This is deliberate — a self-signed certificate would show every student's phone a scarier "connection not private" warning than the current no-encryption baseline, for a session that only ever carries anonymous poll answers, never credentials or personal data. Room codes (the actual access control for joining) are also not rate-limited beyond the per-socket brute-force disconnect above; this mirrors the same accepted tradeoff in comparable tools (e.g. Kahoot's game PINs).
