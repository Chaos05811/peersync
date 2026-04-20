import { useEffect, useMemo, useState } from "react";
import { updateProfile } from "firebase/auth";
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  Share2,
  Users,
  Waypoints,
  Wifi,
  WifiOff
} from "lucide-react";

import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import FontFamily from "@tiptap/extension-font-family";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { IndexeddbPersistence } from "y-indexeddb";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

import { AuthPanel } from "../components/AuthPanel";
import { EditorToolbar } from "../components/EditorToolbar";
import { ThemeToggle } from "../components/ThemeToggle";
import { downloadDocx, downloadPdf, downloadTxt } from "../lib/exporters";
import {
  buildPresenceProfile,
  createRoomCode,
  getCleanRoomPath,
  getRoomFromUrl,
  openRoom,
  useAuthUser
} from "../lib/session";

function getWebsocketBaseUrl() {
  if (import.meta.env.VITE_COLLAB_SERVER_URL) {
    return import.meta.env.VITE_COLLAB_SERVER_URL;
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";

  if (import.meta.env.DEV) {
    return `${protocol}://${window.location.hostname}:1234/collaboration`;
  }

  return `${protocol}://${window.location.host}/collaboration`;
}

function getInitials(name) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
}

function PresenceBadges({ users }) {
  return (
    <div className="presence-badges">
      {users.slice(0, 4).map((user) => (
        <span
          className="presence-badge"
          key={`${user.name}-${user.color}`}
          style={{ backgroundColor: user.color }}
          title={user.name}
        >
          {getInitials(user.name)}
        </span>
      ))}
    </div>
  );
}

function WorkspaceLauncher({ roomInput, setRoomInput }) {
  return (
    <div className="site-shell">
      <div className="site-frame app-frame">
        <header className="room-header">
          <div className="room-header-inner">
            <a className="site-brand" href="/">
              <span className="site-brand-mark">
                <Waypoints className="site-brand-icon" />
              </span>
              <span>PeerSync</span>
            </a>

            <div className="site-header-actions">
              <ThemeToggle />
              <a className="ghost-button" href="/login">
                Switch account
              </a>
            </div>
          </div>
        </header>

        <main className="workspace-page">
          <section className="workspace-shell">
            <header className="section-heading centered narrow">
              <h1>Your workspace</h1>
              <p>Start a fresh document or hop into an existing room with its code.</p>
            </header>

            <div className="workspace-grid">
              <section className="workspace-card">
                <span className="feature-icon-wrap">
                  <Waypoints className="feature-icon" />
                </span>
                <h2>Create a new room</h2>
                <p>We&apos;ll generate a fresh room code and shareable link.</p>
                <button
                  className="gradient-button full-width"
                  type="button"
                  onClick={() => openRoom(createRoomCode())}
                >
                  Create room
                </button>
              </section>

              <section className="workspace-card">
                <span className="feature-icon-wrap muted-icon">
                  <Users className="feature-icon" />
                </span>
                <h2>Join with a code</h2>
                <p>Got a room code from a teammate? Drop it in.</p>
                <input
                  className="workspace-input"
                  value={roomInput}
                  onChange={(event) => setRoomInput(event.target.value.toUpperCase())}
                  placeholder="ABCD1234"
                  maxLength={12}
                />
                <button
                  className="ghost-button full-width"
                  type="button"
                  disabled={!roomInput.trim()}
                  onClick={() => openRoom(roomInput)}
                >
                  Join room
                </button>
              </section>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function CollaborativeRoom({
  authUser,
  collab,
  roomId,
  presenceUser,
  connectionStatus,
  title,
  users,
  displayName,
  setDisplayName,
  profileSaving,
  handleProfileSave
}) {
  const [copied, setCopied] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [showDownload, setShowDownload] = useState(false);

  const editor = useEditor(
    {
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: "doc-editor ps-prose"
        }
      },
      extensions: [
        StarterKit.configure({
          history: false
        }),
        Underline,
        TextStyle,
        FontFamily.configure({
          types: ["textStyle"]
        }),
        TextAlign.configure({
          types: ["heading", "paragraph"]
        }),
        Placeholder.configure({
          placeholder: "Start typing to edit this document with your collaborators."
        }),
        Collaboration.configure({
          document: collab.ydoc
        }),
        CollaborationCursor.configure({
          provider: collab.provider,
          user: presenceUser
        })
      ]
    },
    [collab, presenceUser]
  );

  useEffect(() => {
    document.title = `${title || `Room ${roomId}`} - PeerSync`;
  }, [roomId, title]);

  if (!editor) {
    return (
      <div className="site-shell">
        <div className="site-frame app-frame">
          <div className="loading-shell">
            <div className="workspace-card compact-card">
              <span className="site-brand-mark">
                <Waypoints className="site-brand-icon" />
              </span>
              <h2>Joining room {roomId}</h2>
              <p>Preparing the collaborative editor.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const roomLink = getCleanRoomPath(roomId);

  async function copyValue(value, kind) {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  }

  function toggleConnection() {
    if (connectionStatus === "connected") {
      collab.provider.disconnect();
      return;
    }

    collab.provider.connect();
  }

  return (
    <div className="site-shell">
      <div className="site-frame app-frame room-frame">
        <header className="room-header">
          <div className="room-header-inner">
            <div className="room-left">
              <a className="site-brand" href="/">
                <span className="site-brand-mark">
                  <Waypoints className="site-brand-icon" />
                </span>
                <span>PeerSync</span>
              </a>

              <span className="room-slash">/</span>
              <span className="room-code-pill">{roomId}</span>
              <span className={`room-status ${connectionStatus}`}>
                {connectionStatus === "connected" ? (
                  <Wifi className="status-icon" />
                ) : (
                  <WifiOff className="status-icon" />
                )}
                {connectionStatus === "connected" ? "Live" : "Connecting"}
              </span>
            </div>

            <div className="room-actions">
              <PresenceBadges users={users} />

              <button className="ghost-button" type="button" onClick={toggleConnection}>
                {connectionStatus === "connected" ? (
                  <WifiOff className="inline-icon" />
                ) : (
                  <Wifi className="inline-icon" />
                )}
                {connectionStatus === "connected" ? "Go offline" : "Reconnect"}
              </button>

              <ThemeToggle />

              <div className="dropdown-shell">
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setShowShare((current) => !current);
                    setShowDownload(false);
                  }}
                >
                  <Share2 className="inline-icon" />
                  Share
                </button>

                {showShare ? (
                  <div className="dropdown-menu">
                    <p className="dropdown-label">Room link</p>
                    <div className="dropdown-row">
                      <input readOnly value={roomLink} className="dropdown-input" />
                      <button
                        className="ghost-button icon-only"
                        type="button"
                        onClick={() => copyValue(roomLink, "link")}
                      >
                        {copied === "link" ? (
                          <Check className="inline-icon" />
                        ) : (
                          <Copy className="inline-icon" />
                        )}
                      </button>
                    </div>

                    <p className="dropdown-label">Room code</p>
                    <div className="dropdown-row">
                      <input readOnly value={roomId} className="dropdown-input mono" />
                      <button
                        className="ghost-button icon-only"
                        type="button"
                        onClick={() => copyValue(roomId, "code")}
                      >
                        {copied === "code" ? (
                          <Check className="inline-icon" />
                        ) : (
                          <Copy className="inline-icon" />
                        )}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="dropdown-shell">
                <button
                  className="gradient-button"
                  type="button"
                  onClick={() => {
                    setShowDownload((current) => !current);
                    setShowShare(false);
                  }}
                >
                  <Download className="inline-icon" />
                  Download
                  <ChevronDown className="inline-icon chevron-icon" />
                </button>

                {showDownload ? (
                  <div className="dropdown-menu narrow-menu">
                    <button
                      className="dropdown-action"
                      type="button"
                      onClick={() => downloadTxt({ editor, title, fallbackName: roomId })}
                    >
                      <span>Plain text</span>
                      <span>.txt</span>
                    </button>
                    <button
                      className="dropdown-action"
                      type="button"
                      onClick={() => downloadDocx({ editor, title, fallbackName: roomId })}
                    >
                      <span>Word document</span>
                      <span>.docx</span>
                    </button>
                    <button
                      className="dropdown-action"
                      type="button"
                      onClick={() => downloadPdf({ editor, title, fallbackName: roomId })}
                    >
                      <span>PDF document</span>
                      <span>.pdf</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="toolbar-bar">
            <EditorToolbar editor={editor} />
          </div>
        </header>

        <main className="room-main">
          <div className="editor-column">
            <div className="editor-card">
              <input
                className="room-title-input"
                value={title}
                onChange={(event) => {
                  collab.ydoc.transact(() => {
                    collab.titleText.delete(0, collab.titleText.length);
                    if (event.target.value) {
                      collab.titleText.insert(0, event.target.value);
                    }
                  });
                }}
                placeholder={`Welcome to room ${roomId}`}
              />
              <div className="room-editor-surface">
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>

          <aside className="room-sidebar">
            <section className="side-card">
              <div className="side-card-header">
                <div className="side-card-title">
                  <Users className="inline-icon" />
                  <h3>In this room</h3>
                </div>
                <span className="side-badge">{users.length}</span>
              </div>

              <div className="collaborator-list">
                {users.map((user) => (
                  <div className="collaborator-row" key={`${user.name}-${user.color}`}>
                    <span
                      className="presence-badge single"
                      style={{ backgroundColor: user.color }}
                    >
                      {getInitials(user.name)}
                    </span>
                    <div className="collaborator-copy">
                      <strong>
                        {user.name}
                        {user.name === presenceUser.name ? " (you)" : ""}
                      </strong>
                      <span>Editing now</span>
                    </div>
                    <span className="live-dot" />
                  </div>
                ))}
              </div>
            </section>

            <section className="side-card">
              <h3>About this room</h3>
              <dl className="meta-list">
                <div>
                  <dt>Code</dt>
                  <dd>{roomId}</dd>
                </div>
                <div>
                  <dt>Sync</dt>
                  <dd>Yjs · y-websocket</dd>
                </div>
                <div>
                  <dt>Cache</dt>
                  <dd>IndexedDB</dd>
                </div>
              </dl>

              <label className="portal-field inline-field">
                <span>Username</span>
                <input
                  className="portal-input standalone"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </label>
              <button
                className="ghost-button full-width"
                type="button"
                disabled={profileSaving || !displayName.trim()}
                onClick={handleProfileSave}
              >
                {profileSaving ? "Saving..." : "Update username"}
              </button>
              <p className="panel-copy">{authUser.email}</p>
            </section>
          </aside>
        </main>
      </div>
    </div>
  );
}

function Workspace({ authUser }) {
  const roomId = useMemo(() => getRoomFromUrl(), []);
  const presenceUser = useMemo(() => buildPresenceProfile(authUser), [authUser]);
  const [collab, setCollab] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [title, setTitle] = useState("");
  const [users, setUsers] = useState([]);
  const [roomInput, setRoomInput] = useState(roomId);
  const [displayName, setDisplayName] = useState(authUser.displayName || "");
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    if (!roomId) {
      return undefined;
    }

    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(getWebsocketBaseUrl(), roomId, ydoc);
    const localStore = new IndexeddbPersistence(`peersync-${roomId}`, ydoc);
    const titleText = ydoc.getText("title");

    provider.awareness.setLocalStateField("user", presenceUser);

    function syncTitle() {
      setTitle(titleText.toString());
    }

    function syncUsers() {
      const nextUsers = Array.from(provider.awareness.getStates().values())
        .map((state) => state.user)
        .filter(Boolean);
      setUsers(nextUsers);
    }

    function handleStatus({ status }) {
      setConnectionStatus(status);
    }

    syncTitle();
    syncUsers();

    titleText.observe(syncTitle);
    provider.on("status", handleStatus);
    provider.awareness.on("change", syncUsers);

    setCollab({
      localStore,
      provider,
      titleText,
      ydoc
    });

    return () => {
      titleText.unobserve(syncTitle);
      provider.off("status", handleStatus);
      provider.awareness.off("change", syncUsers);
      provider.destroy();
      localStore.destroy();
      ydoc.destroy();
    };
  }, [presenceUser, roomId]);

  useEffect(() => {
    if (!collab) {
      return;
    }

    collab.provider.awareness.setLocalStateField("user", presenceUser);
  }, [collab, presenceUser]);

  async function handleProfileSave() {
    if (!displayName.trim()) {
      return;
    }

    setProfileSaving(true);
    try {
      await updateProfile(authUser, {
        displayName: displayName.trim()
      });
      await authUser.reload();
      window.location.reload();
    } finally {
      setProfileSaving(false);
    }
  }

  if (!roomId) {
    return <WorkspaceLauncher roomInput={roomInput} setRoomInput={setRoomInput} />;
  }

  if (!collab) {
    return (
      <div className="site-shell">
        <div className="site-frame app-frame">
          <div className="loading-shell">
            <div className="workspace-card compact-card">
              <span className="site-brand-mark">
                <Waypoints className="site-brand-icon" />
              </span>
              <h2>Joining room {roomId}</h2>
              <p>Preparing the collaborative editor.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CollaborativeRoom
      authUser={authUser}
      collab={collab}
      roomId={roomId}
      presenceUser={presenceUser}
      connectionStatus={connectionStatus}
      title={title}
      users={users}
      displayName={displayName}
      setDisplayName={setDisplayName}
      profileSaving={profileSaving}
      handleProfileSave={handleProfileSave}
    />
  );
}

export function EditorPage() {
  const { authReady, authUser } = useAuthUser();

  if (!authReady || !authUser) {
    return (
      <div className="site-shell">
        <div className="site-frame auth-frame">
          <div className="login-page">
            <AuthPanel
              authReady={authReady}
              authUser={authUser}
              title="Welcome back"
              subtitle="Sign in to continue collaborating."
              onAuthenticated={() => {
                window.location.reload();
              }}
            />
            <p className="back-link-row">
              <a href="/">← Back to home</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <Workspace authUser={authUser} />;
}
