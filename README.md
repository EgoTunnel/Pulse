# Pulse

Pulse is a free, open-source, local-first interactive presentation tool for post-secondary educators — a simple alternative to tools like Mentimeter. Instructors build a presentation of ordinary slides and interactive questions, present it from their own computer, and students join from their phones or laptops over the local network. No student accounts, no cloud service, no persistent student data.

See [`Vision Document.txt`](./Vision%20Document.txt) for the full product vision and functional spec this app is built against.

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
npm run build:win    # build + package a Windows installer
npm run build:mac    # build + package a macOS app
npm run build:linux  # build + package a Linux package
```

## Status

This is an early scaffold covering the MVP described in the vision document's "MVP Definition": creating presentations with basic content slides plus multiple-choice, word-cloud, and rating/scale questions; saving and reopening presentations; starting a session with a QR/room-code join flow; anonymous real-time responses; and ending a session with participation data discarded. The remaining interactive question types (multiple select, true/false, Likert, short/open answer, ranking, numeric, Q&A, poll) are also implemented in the data model, editor, present mode, and student app, though some (like Q&A moderation controls) are intentionally minimal for now.

Not yet built: auto-update, installer icons/branding, accessibility pass, and packaging polish.
