<h1 align="center">PeerSync</h1>

<p align="center">
  <strong>Realtime collaborative document editing with CRDT sync, room sharing,<br/>Firebase auth, and downloadable exports.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-React%20%2B%20TipTap-61DAFB?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/Sync-Yjs-7C3AED?style=flat-square" />
  <img src="https://img.shields.io/badge/Transport-y--websocket-111827?style=flat-square" />
  <img src="https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933?style=flat-square&logo=node.js" />
  <img src="https://img.shields.io/badge/Auth-Firebase-FFCA28?style=flat-square&logo=firebase" />
  <img src="https://img.shields.io/badge/Database-MongoDB-47A248?style=flat-square&logo=mongodb" />
</p>

<p align="center">
  <strong>Realtime Editing · Offline-first Sync · Room Codes · Multi-user Collaboration</strong>
</p>

---

## 🚀 Overview

*PeerSync* is a collaborative document editor built for multi-user realtime writing without depending on a heavy centralized editing service.

It combines:

- *React + TipTap* for the document editor UI
- *Yjs CRDTs* for conflict-free shared state
- *y-websocket* for realtime collaboration
- *Node.js + Express + WebSocket* for transport
- *MongoDB* for room persistence
- *Firebase Authentication* for login and usernames
- *IndexedDB* for client-side offline caching

PeerSync is designed to support the core project workflow:

- Sign in
- Create or join a room
- Edit the same document with multiple users
- Stay in sync in realtime
- Download the final document

---

## 🎯 Problem Statement

Traditional document sharing often depends on a central platform and uninterrupted connectivity. That creates a few common issues:

| Problem | Root Cause | Impact |
|--------|-----------|--------|
| Conflicting edits | Multiple users overwrite each other | Lost work |
| Weak offline support | Changes depend on constant connectivity | Interrupted collaboration |
| Difficult room access | No lightweight sharing model | Friction in team editing |
| Limited export flow | Final output is not easy to download | Submission and sharing issues |

*PeerSync solves this with CRDT-based editing, room-based collaboration, offline caching, and direct file export.*

---

## ⚡ Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Build the frontend

```bash
npm run build
```

### 3. Start the app

```bash
npm start
```

### 4. Development mode

```bash
npm run dev
```

---

## 🔐 Authentication

PeerSync uses *Firebase Authentication* with email/password login.

Users can:

- Sign up with email and password
- Sign in to an existing account
- Set or update a username
- Use that username as their collaborator identity inside rooms

---

## 🧩 Core Modules

### 🏠 Landing Experience

- Home page
- Features page
- Architecture page
- Login page

### 📝 Collaborative Editor

- Shared room-based document editing
- Rich text formatting toolbar
- Room link and room code sharing
- Presence badges and collaborator list
- Realtime cursor awareness

### 💾 Export System

- Export as `.txt`
- Export as `.docx`
- Export as `.pdf`

### 🌐 Sync Layer

- Yjs shared document state
- y-websocket provider for transport
- IndexedDB offline cache
- MongoDB persistence on the server

---

## ⚙️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React + Vite + TipTap | App UI and editor interface |
| Shared State | Yjs | CRDT-based collaborative editing |
| Transport | y-websocket | Realtime document synchronization |
| Backend | Node.js + Express + WebSocket | Room transport and sync server |
| Database | MongoDB | Persistent room state storage |
| Auth | Firebase Authentication | Email/password login and usernames |
| Offline Cache | IndexedDB | Local document persistence in browser |
| Export | jsPDF + docx | PDF and DOCX generation |

---

## 🔁 Data Flow

1. A signed-in user creates or joins a room.
2. TipTap updates the shared Yjs document locally.
3. Yjs changes are sent through `y-websocket`.
4. The Node.js websocket server relays updates to other users in the same room.
5. Connected clients apply updates instantly.
6. MongoDB stores the latest room state.
7. IndexedDB keeps a local cached copy for offline-first behavior.

---

## 🧠 Architecture

```text
User Action
   ↓
React + TipTap Editor
   ↓
Yjs CRDT Document
   ↓
y-websocket Provider
   ↓
Node.js WebSocket Server
   ↓
Other Clients Sync Automatically
   ↓
MongoDB Persistence
```

---

## 📁 Project Structure

```text
client/
├── src/
│   ├── components/         reusable UI components
│   ├── hooks/              theme hook
│   ├── lib/                firebase, session, export helpers
│   ├── screens/            landing pages and editor screens
│   └── styles/             global application styling
│
server/
└── index.js                Express app, websocket server, MongoDB persistence

ARCHITECTURE.html           landing page entry
app.html                    editor entry
vite.config.js              frontend build config
package.json                scripts and dependencies
```

---

## 📦 Key Features

| Feature | Description |
|---------|-------------|
| 🔐 Firebase Auth | Email/password login with username support |
| 👥 Multi-user Collaboration | Multiple users can edit the same room in realtime |
| 🔁 CRDT Sync | Yjs merges concurrent edits safely |
| 📡 Realtime Transport | y-websocket keeps clients synchronized |
| 💾 Offline-first Cache | IndexedDB stores local room state |
| 🔗 Room Sharing | Join using room code or room link |
| 🖋️ Formatting Toolbar | Headings, bold, italic, underline, strike, lists, alignment, font family |
| 💽 Downloads | Export document as TXT, DOCX, or PDF |
| 🗂️ MongoDB Persistence | Server stores the latest room state |
| 🎨 Theme Support | Dark, light, and system theme modes |

---

## 🖥️ Local Routes

| Route | Purpose |
|------|---------|
| `/` | Landing page |
| `/features` | Features screen |
| `/architecture` | Architecture screen |
| `/login` | Login screen |
| `/app` | Workspace launcher |
| `/app.html?room=ROOMCODE` | Collaborative editor room |
| `/room/ROOMCODE` | Redirect to room editor |

Default local host:

```text
http://127.0.0.1:1234
```

---

## 🚧 Future Enhancements

- stronger room permissions and access control
- richer document export fidelity
- document list / dashboard for saved rooms
- comments and inline discussion
- richer collaborator presence and activity history
- image upload and embedded media blocks

