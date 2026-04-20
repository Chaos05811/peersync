import { useEffect, useMemo, useState } from "react";

import { AuthPanel } from "../components/AuthPanel";
import { initializeFirebaseAnalytics } from "../lib/firebase";
import { createRoomCode, getRoomFromUrl, openRoom, useAuthUser } from "../lib/session";

function ArchitectureSection() {
  return (
    <>
      <section className="info-section">
        <div className="section-kicker">Landing Overview</div>
        <h2>Everything important is reachable from this landing page</h2>
        <p className="muted-copy wide-copy">
          The current PeerSync codebase uses a clean client and server split.
          React and TipTap handle the document UI, Yjs powers CRDT editing,
          `y-websocket` handles transport, Node keeps collaboration rooms live,
          MongoDB persists room state, and Firebase Authentication manages user
          accounts and usernames.
        </p>

        <div className="architecture-grid">
          <article className="arch-card">
            <span className="arch-label">Frontend</span>
            <h3>React + TipTap Editor</h3>
            <p>
              The editor layout is styled like a lightweight docs workspace with
              a toolbar, document canvas, room controls, download actions, and
              collaborator presence.
            </p>
          </article>

          <article className="arch-card">
            <span className="arch-label">CRDT</span>
            <h3>Yjs Shared Document</h3>
            <p>
              Document text and title live in Yjs structures so multiple users
              can edit the same room at once and resolve changes automatically.
            </p>
          </article>

          <article className="arch-card">
            <span className="arch-label">Transport</span>
            <h3>y-websocket + Node</h3>
            <p>
              A websocket server keeps clients in sync in real time using the
              official Yjs websocket protocol implementation.
            </p>
          </article>

          <article className="arch-card">
            <span className="arch-label">Persistence</span>
            <h3>MongoDB Room Storage</h3>
            <p>
              Each room state is saved to MongoDB so documents survive restarts
              and reopen with their previous content.
            </p>
          </article>

          <article className="arch-card">
            <span className="arch-label">Identity</span>
            <h3>Firebase Authentication</h3>
            <p>
              Users sign in with email and password, choose a username, and that
              display name appears in the live collaborator list and cursors.
            </p>
          </article>

          <article className="arch-card">
            <span className="arch-label">Offline Support</span>
            <h3>IndexedDB Cache</h3>
            <p>
              Local document state is cached in the browser for smoother
              reconnects and a more resilient editing flow.
            </p>
          </article>
        </div>
      </section>

      <section className="info-section">
        <div className="section-kicker">Sign In Portal</div>
        <h2>Authentication is part of the landing flow</h2>
        <p className="muted-copy wide-copy">
          The sign-in card on the right side of the landing page is the main
          access portal. Users can register with email and password, sign in,
          set a username, and then create or join a room from the same screen.
        </p>

        <div className="repo-grid">
          <div className="repo-card">
            <h3>Sign Up</h3>
            <p>Create a Firebase-authenticated account with email and password.</p>
          </div>
          <div className="repo-card">
            <h3>Choose Username</h3>
            <p>The collaborator name shown in rooms comes from the saved profile.</p>
          </div>
          <div className="repo-card">
            <h3>Enter Room</h3>
            <p>After sign-in, the same landing page lets users create or join a room.</p>
          </div>
        </div>
      </section>

      <section className="info-section">
        <div className="section-kicker">Sync Flow</div>
        <h2>How a document update moves through PeerSync</h2>
        <div className="flow-board">
          <div className="flow-step">User types in TipTap</div>
          <div className="flow-arrow">→</div>
          <div className="flow-step">Yjs CRDT updates locally</div>
          <div className="flow-arrow">→</div>
          <div className="flow-step">y-websocket sends room update</div>
          <div className="flow-arrow">→</div>
          <div className="flow-step">Other clients apply update instantly</div>
          <div className="flow-arrow">→</div>
          <div className="flow-step">Node persists room in MongoDB</div>
        </div>
      </section>

      <section className="info-section">
        <div className="section-kicker">Repository Layout</div>
        <h2>Reorganized project structure</h2>
        <div className="repo-grid">
          <div className="repo-card">
            <h3>`client/src/screens`</h3>
            <p>Landing page and editor workspace entries.</p>
          </div>
          <div className="repo-card">
            <h3>`client/src/components`</h3>
            <p>Reusable auth and editor UI blocks.</p>
          </div>
          <div className="repo-card">
            <h3>`client/src/lib`</h3>
            <p>Firebase setup, auth state, room helpers, and presence helpers.</p>
          </div>
          <div className="repo-card">
            <h3>`server`</h3>
            <p>Websocket server and MongoDB persistence.</p>
          </div>
          <div className="repo-card">
            <h3>`ARCHITECTURE.html`</h3>
            <p>The landing page and system overview entry point.</p>
          </div>
          <div className="repo-card">
            <h3>`README.md`</h3>
            <p>A markdown version of the same project summary for submission.</p>
          </div>
        </div>
      </section>
    </>
  );
}

export function LandingPage() {
  const { authReady, authUser } = useAuthUser();
  const [roomCode, setRoomCode] = useState("");
  const suggestedRoom = useMemo(() => createRoomCode(), []);
  const pendingRoom = useMemo(() => getRoomFromUrl(), []);

  useEffect(() => {
    initializeFirebaseAnalytics();
  }, []);

  useEffect(() => {
    if (pendingRoom) {
      setRoomCode(pendingRoom);
    }
  }, [pendingRoom]);

  return (
    <div className="landing-page">
      <header className="hero-band">
        <div className="hero-content">
          <div className="hero-copy">
            <div className="brand-row">
              <div className="brand-mark">PS</div>
              <span className="brand-name">PeerSync</span>
            </div>

            <div className="chip-row">
              <span className="feature-chip">React + TipTap</span>
              <span className="feature-chip">Yjs CRDT</span>
              <span className="feature-chip">WebSocket Rooms</span>
              <span className="feature-chip">MongoDB Persistence</span>
              <span className="feature-chip">Firebase Auth</span>
            </div>

            <h1>
              Collaborative editing with room links, real-time sync, downloads,
              and user accounts.
            </h1>
            <p className="hero-description">
              This landing page is the main entry to PeerSync. Sign in here,
              create or join a room here, and review the full project structure
              and architecture here before opening the editor workspace.
            </p>

            <div className="launch-panel">
              <div className="field-group">
                <label className="field-label" htmlFor="landing-room">
                  Room code
                </label>
                <input
                  id="landing-room"
                  className="text-input"
                  value={roomCode}
                  maxLength={20}
                  placeholder={`Example: ${suggestedRoom}`}
                  onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                />
              </div>

              <div className="launch-actions">
                <button
                  className="primary-button"
                  type="button"
                  disabled={!authUser}
                  onClick={() => openRoom(createRoomCode())}
                >
                  Create Room
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={!authUser || !roomCode.trim()}
                  onClick={() => openRoom(roomCode)}
                >
                  Join Room
                </button>
              </div>

              <p className="helper-copy">
                {authUser
                  ? `Signed in as ${authUser.displayName || authUser.email}`
                  : "Sign in first, then create a room or join one with a room code."}
              </p>
            </div>
          </div>

          <AuthPanel
            authReady={authReady}
            authUser={authUser}
            title="Sign in to open your workspace"
            subtitle="Create an account or log in, then launch a room from this page."
            onAuthenticated={() => {
              if (roomCode.trim()) {
                openRoom(roomCode);
              }
            }}
          />
        </div>
      </header>

      <main className="content-shell">
        <ArchitectureSection />
      </main>
    </div>
  );
}
