# PeerSync

PeerSync is a collaborative document editor built for the core college-project flow: authenticate, create or join a room, edit the same document with multiple users in real time, and download the result.

## Architecture

The current codebase uses this stack:

- React + TipTap for the editor interface
- Yjs for CRDT-based shared document state
- `y-websocket` for realtime room synchronization
- Node.js + Express + WebSocket server for transport
- MongoDB for room persistence
- Firebase Authentication for login and usernames
- IndexedDB for browser-side local caching

## Data Flow

1. A signed-in user creates or joins a room.
2. TipTap edits update a Yjs shared document locally.
3. `y-websocket` sends Yjs updates to the Node websocket server.
4. The server broadcasts those updates to every client in the same room.
5. Connected clients apply the updates instantly.
6. MongoDB stores the latest room state.

## Repo Layout

- `client/src/screens` — landing page and editor workspace
- `client/src/components` — reusable auth and toolbar UI
- `client/src/lib` — Firebase setup, auth helpers, room helpers, presence helpers
- `client/src/styles` — shared styling
- `server` — websocket server and MongoDB persistence
- `ARCHITECTURE.html` — landing page entry and architecture overview
- `app.html` — collaborative editor entry

## Main Features

- Email/password login with Firebase Authentication
- Username setup and updates
- Shareable room links and room codes
- Multi-user collaborative editing
- Presence list and live collaborator cursors
- Basic document formatting:
  - headings
  - bold
  - italic
  - underline
  - strikethrough
  - alignment
  - bullet lists
  - numbered lists
  - font family
- Download as `.txt`
- Download as `.html`

## Run

```bash
npm install
npm run build
npm start
```

For development:

```bash
npm run dev
```

## Default Local URLs

- Landing page: `http://127.0.0.1:1234/`
- Editor page: `http://127.0.0.1:1234/app.html`
- Shared room path example: `http://127.0.0.1:1234/room/ABCD1234`
