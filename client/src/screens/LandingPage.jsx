import { useMemo, useState } from "react";
import {
  ArrowRight,
  Cloud,
  Download,
  FileText,
  Lock,
  Share2,
  Users,
  Waypoints,
  Wifi,
  Zap
} from "lucide-react";

import { AuthPanel } from "../components/AuthPanel";
import { createRoomCode, openRoom, useAuthUser } from "../lib/session";

const features = [
  {
    icon: Users,
    title: "Multi-user editing",
    desc: "Edit the same document with teammates and see every change appear instantly."
  },
  {
    icon: Zap,
    title: "CRDT-powered sync",
    desc: "Built on Yjs so concurrent edits merge cleanly with no conflicts."
  },
  {
    icon: Wifi,
    title: "Offline-first",
    desc: "Keep editing while disconnected and reconnect without losing state."
  },
  {
    icon: Share2,
    title: "Shareable rooms",
    desc: "Invite collaborators with a room code or direct room link."
  },
  {
    icon: Lock,
    title: "Firebase login",
    desc: "Authenticate with email and password and set a username."
  },
  {
    icon: Download,
    title: "Export formats",
    desc: "Download the collaborative document as TXT, DOCX, or PDF."
  }
];

export function LandingPage() {
  const { authReady, authUser } = useAuthUser();
  const [roomCode, setRoomCode] = useState("");
  const sampleRoom = useMemo(() => createRoomCode(), []);

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <a className="site-brand" href="/ARCHITECTURE.html">
            <span className="site-brand-mark">
              <Waypoints className="site-brand-icon" />
            </span>
            <span>PeerSync</span>
          </a>

          <nav className="site-nav">
            <a href="#features">Features</a>
            <a href="#architecture">Architecture</a>
            <a href="/app.html">Workspace</a>
          </nav>

          <div className="site-header-actions">
            <a className="ghost-button" href="/app.html">
              Open editor
            </a>
            <a className="gradient-button" href="/app.html">
              Get started
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-grid">
            <div className="hero-copy-panel">
              <span className="hero-pill">Realtime · CRDT · Offline-first</span>
              <h1>
                Write together, <span>in perfect sync</span>.
              </h1>
              <p>
                PeerSync is a collaborative document editor: sign in, create or
                join a room, and edit the same document with your team in real
                time using the existing Yjs and websocket backend.
              </p>

              <div className="hero-launch">
                <div className="hero-input-group">
                  <label htmlFor="room-code">Room code</label>
                  <input
                    id="room-code"
                    className="portal-input standalone"
                    value={roomCode}
                    onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                    placeholder={sampleRoom}
                    maxLength={12}
                  />
                </div>
                <div className="hero-cta-row">
                  <button
                    className="gradient-button"
                    type="button"
                    disabled={!authUser}
                    onClick={() => openRoom(createRoomCode())}
                  >
                    Start a room <ArrowRight className="inline-icon" />
                  </button>
                  <button
                    className="ghost-button"
                    type="button"
                    disabled={!authUser || !roomCode.trim()}
                    onClick={() => openRoom(roomCode)}
                  >
                    Join room
                  </button>
                </div>
                <p className="hero-helper">
                  {authReady && authUser
                    ? `Signed in as ${authUser.displayName || authUser.email}`
                    : "Sign in first, then create or join a room."}
                </p>
              </div>
            </div>

            <AuthPanel
              authReady={authReady}
              authUser={authUser}
              title="Sign in to PeerSync"
              subtitle="Use the current Firebase setup to access the collaborative workspace."
              onAuthenticated={() => {
                if (roomCode.trim()) {
                  openRoom(roomCode);
                }
              }}
            />
          </div>

          <div className="preview-card">
            <div className="preview-topbar">
              <div className="preview-dots">
                <span />
                <span />
                <span />
              </div>
              <div className="preview-link">peersync.app/room/ABCD1234</div>
              <div className="preview-users">
                <span>A</span>
                <span>M</span>
                <span>K</span>
              </div>
            </div>
            <div className="preview-body">
              <div className="preview-document">
                <h2>Project Kickoff Notes</h2>
                <p>
                  PeerSync streams every keystroke through a CRDT so concurrent
                  edits merge cleanly and nobody overwrites anyone else.
                </p>
                <ul>
                  <li>Realtime cursors with usernames</li>
                  <li>Offline reconnect support</li>
                  <li>Download as TXT, DOCX, or PDF</li>
                </ul>
              </div>
              <aside className="preview-sidebar">
                <p>In this room</p>
                <ul>
                  <li>Aanya</li>
                  <li>Marc</li>
                  <li>Kira</li>
                </ul>
              </aside>
            </div>
          </div>
        </section>

        <section className="content-section" id="features">
          <div className="section-heading">
            <h2>Everything you need to collaborate</h2>
            <p>
              All the essentials of a modern document editor, wired for
              realtime by default.
            </p>
          </div>

          <div className="feature-grid">
            {features.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <span className="feature-icon-wrap">
                  <feature.icon className="feature-icon" />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="content-section" id="architecture">
          <div className="section-heading">
            <h2>Architecture</h2>
            <p>
              This frontend is plugged into the existing PeerSync backend and
              collaboration stack without changing the server logic.
            </p>
          </div>

          <div className="architecture-grid">
            <div className="stack-card">
              <h3>Stack</h3>
              <ul className="stack-list">
                <li><span>Editor UI</span><strong>React + TipTap</strong></li>
                <li><span>Shared state</span><strong>Yjs</strong></li>
                <li><span>Transport</span><strong>y-websocket</strong></li>
                <li><span>Server</span><strong>Node + Express + WebSocket</strong></li>
                <li><span>Persistence</span><strong>MongoDB</strong></li>
                <li><span>Authentication</span><strong>Firebase Auth</strong></li>
              </ul>
            </div>

            <div className="stack-card">
              <h3>Flow</h3>
              <ol className="flow-list">
                <li>Sign in with Firebase.</li>
                <li>Create or join a room.</li>
                <li>Edit through TipTap.</li>
                <li>Sync updates through Yjs and y-websocket.</li>
                <li>Persist room state in MongoDB.</li>
                <li>Export the final file when needed.</li>
              </ol>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="cta-card">
            <h2>Ready to write together?</h2>
            <p>
              Open the workspace, sign in, create a room, and start collaborating.
            </p>
            <div className="cta-row">
              <a className="ghost-bright-button" href="/app.html">
                <FileText className="inline-icon" /> Open the editor
              </a>
              <a className="outline-bright-button" href="#features">
                <Cloud className="inline-icon" /> Explore features
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
