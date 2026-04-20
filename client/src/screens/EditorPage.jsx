import { useEffect, useMemo, useState } from "react";
import { updateProfile } from "firebase/auth";
import {
  Check,
  Copy,
  Download,
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
    <div className="workspace-page">
      <header className="site-header">
        <div className="site-header-inner">
          <a className="site-brand" href="/ARCHITECTURE.html">
            <span className="site-brand-mark">
              <Waypoints className="site-brand-icon" />
            </span>
            <span>PeerSync</span>
          </a>
          <div className="site-header-actions">
            <a className="ghost-button" href="/ARCHITECTURE.html">
              Home
            </a>
          </div>
        </div>
      </header>

      <main className="workspace-center">
        <div className="section-heading center">
          <h1>Your workspace</h1>
          <p>Start a fresh document or hop into an existing room with its code.</p>
        </div>

        <div className="workspace-split">
          <section className="panel-card">
            <span className="panel-icon">
              <Waypoints className="panel-icon-svg" />
            </span>
            <h2>Create a new room</h2>
            <p>Generate a fresh room code and jump straight into the editor.</p>
            <button className="gradient-button full-width" type="button" onClick={() => openRoom(createRoomCode())}>
              Create room
            </button>
          </section>

          <section className="panel-card">
            <span className="panel-icon muted">
              <Users className="panel-icon-svg" />
            </span>
            <h2>Join with a code</h2>
            <p>Got a room code from a teammate? Drop it in.</p>
            <div className="portal-field">
              <span>Room code</span>
              <input
                className="portal-input standalone mono"
                value={roomInput}
                onChange={(event) => setRoomInput(event.target.value.toUpperCase())}
                placeholder="ABCD1234"
                maxLength={12}
              />
            </div>
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
      </main>
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
          placeholder:
            "Start typing here. Everyone in this room will see updates instantly."
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
    document.title = `${title || "Untitled Document"} - PeerSync`;
  }, [title]);

  if (!editor) {
    return (
      <div className="workspace-page">
        <main className="workspace-center">
          <div className="panel-card compact-card">
            <span className="site-brand-mark">
              <Waypoints className="site-brand-icon" />
            </span>
            <h2>Joining room {roomId}</h2>
            <p>Preparing the collaborative editor.</p>
          </div>
        </main>
      </div>
    );
  }

  const wordCount = editor.getText().trim()
    ? editor.getText().trim().split(/\s+/).length
    : 0;
  const charCount = editor.getText().length;
  const roomLink = getCleanRoomPath(roomId);

  async function copyValue(value, kind) {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="room-page">
      <header className="room-header">
        <div className="room-header-inner">
          <div className="room-brand-block">
            <a className="site-brand" href="/ARCHITECTURE.html">
              <span className="site-brand-mark">
                <Waypoints className="site-brand-icon" />
              </span>
              <span>PeerSync</span>
            </a>

            <div className="room-meta">
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
          </div>

          <div className="room-actions">
            <PresenceBadges users={users} />
            <button className="ghost-button" type="button" onClick={() => copyValue(roomLink, "link")}>
              {copied === "link" ? <Check className="inline-icon" /> : <Copy className="inline-icon" />}
              Copy link
            </button>
            <button className="ghost-button" type="button" onClick={() => copyValue(roomId, "code")}>
              {copied === "code" ? <Check className="inline-icon" /> : <Copy className="inline-icon" />}
              Copy code
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() => downloadTxt({ editor, title, fallbackName: roomId })}
            >
              <Download className="inline-icon" /> TXT
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() => downloadDocx({ editor, title, fallbackName: roomId })}
            >
              <Download className="inline-icon" /> DOCX
            </button>
            <button
              className="gradient-button"
              type="button"
              onClick={() => downloadPdf({ editor, title, fallbackName: roomId })}
            >
              <Download className="inline-icon" /> PDF
            </button>
          </div>
        </div>
      </header>

      <EditorToolbar editor={editor} />

      <main className="room-content">
        <section className="room-editor-panel">
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
            placeholder="Untitled Document"
          />
          <div className="room-editor-surface">
            <EditorContent editor={editor} />
          </div>
        </section>

        <aside className="room-side-panel">
          <section className="panel-card">
            <h3>Account</h3>
            <p className="panel-copy">Update the username shown to collaborators.</p>
            <label className="portal-field">
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

          <section className="panel-card">
            <h3>Collaborators</h3>
            <div className="collaborator-list">
              {users.map((user) => (
                <div className="collaborator-row" key={`${user.name}-${user.color}`}>
                  <span
                    className="presence-badge"
                    style={{ backgroundColor: user.color }}
                  >
                    {getInitials(user.name)}
                  </span>
                  <div className="collaborator-copy">
                    <strong>{user.name}</strong>
                    <span>{user.name === presenceUser.name ? "You" : "Live in room"}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel-card">
            <h3>Document stats</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span>Words</span>
                <strong>{wordCount}</strong>
              </div>
              <div className="stat-item">
                <span>Characters</span>
                <strong>{charCount}</strong>
              </div>
            </div>
          </section>
        </aside>
      </main>
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

    const syncTitle = () => {
      setTitle(titleText.toString());
    };

    const syncUsers = () => {
      const nextUsers = Array.from(provider.awareness.getStates().values())
        .map((state) => state.user)
        .filter(Boolean);
      setUsers(nextUsers);
    };

    const handleStatus = ({ status }) => {
      setConnectionStatus(status);
    };

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
      <div className="workspace-page">
        <main className="workspace-center">
          <div className="panel-card compact-card">
            <span className="site-brand-mark">
              <Waypoints className="site-brand-icon" />
            </span>
            <h2>Joining room {roomId}</h2>
            <p>Preparing the collaborative editor.</p>
          </div>
        </main>
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
      <div className="login-page">
        <div className="login-backdrop" />
        <div className="login-shell">
          <AuthPanel
            authReady={authReady}
            authUser={authUser}
            title="Sign in to continue collaborating"
            subtitle="Use the current Firebase Authentication setup, then open or join a room."
            onAuthenticated={() => {
              window.location.reload();
            }}
          />
        </div>
      </div>
    );
  }

  return <Workspace authUser={authUser} />;
}
