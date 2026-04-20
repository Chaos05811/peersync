import { useEffect, useMemo, useState } from "react";
import { updateProfile } from "firebase/auth";

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

function sanitizeFileName(value) {
  return value.trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-") || "document";
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getInitials(name) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
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
  const editor = useEditor(
    {
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: "doc-editor"
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
      <div className="workspace-launch">
        <div className="workspace-launch-card">
          <div className="brand-mark">PS</div>
          <h2>Joining room {roomId}</h2>
          <p className="muted-copy">Preparing the collaborative editor.</p>
        </div>
      </div>
    );
  }

  const wordCount = editor.getText().trim()
    ? editor.getText().trim().split(/\s+/).length
    : 0;
  const charCount = editor.getText().length;
  const fileName = sanitizeFileName(title || roomId);
  const roomLink = getCleanRoomPath(roomId);

  return (
    <div className="editor-page">
      <header className="workspace-header">
        <div className="workspace-header-main">
          <a className="brand-row plain-link" href="/ARCHITECTURE.html">
            <div className="brand-mark">PS</div>
            <span className="brand-name">PeerSync</span>
          </a>

          <div className="doc-header-copy">
            <input
              className="doc-title-input"
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

            <div className="doc-meta-row">
              <span>Room code: {roomId}</span>
              <span className={`status-pill ${connectionStatus}`}>
                {connectionStatus === "connected" ? "Connected" : "Connecting"}
              </span>
              <span>{users.length} collaborator(s)</span>
            </div>
          </div>
        </div>

        <div className="workspace-header-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(roomLink);
            }}
          >
            Copy Room Link
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() =>
              downloadFile(`${fileName}.txt`, editor.getText(), "text/plain")
            }
          >
            Download TXT
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={() =>
              downloadFile(
                `${fileName}.html`,
                `<!doctype html><html><head><meta charset="UTF-8"><title>${title || "Untitled Document"}</title></head><body>${editor.getHTML()}</body></html>`,
                "text/html"
              )
            }
          >
            Download HTML
          </button>
        </div>
      </header>

      <EditorToolbar editor={editor} />

      <div className="workspace-grid">
        <aside className="workspace-sidebar">
          <section className="sidebar-card">
            <div className="section-kicker">Your Account</div>
            <label className="field">
              <span>Username</span>
              <input
                className="text-input"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>
            <button
              className="secondary-button full-width"
              type="button"
              disabled={profileSaving || !displayName.trim()}
              onClick={handleProfileSave}
            >
              {profileSaving ? "Saving..." : "Update Username"}
            </button>
            <p className="helper-copy">{authUser.email}</p>
          </section>

          <section className="sidebar-card">
            <div className="section-kicker">Collaborators</div>
            <div className="presence-list">
              {users.map((user) => (
                <div className="presence-user" key={`${user.name}-${user.color}`}>
                  <span
                    className="presence-avatar"
                    style={{ backgroundColor: user.color }}
                  >
                    {getInitials(user.name)}
                  </span>
                  <div className="presence-copy">
                    <strong>{user.name}</strong>
                    <span>{user.name === presenceUser.name ? "You" : "Live in room"}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="sidebar-card">
            <div className="section-kicker">Document Stats</div>
            <div className="stats-list">
              <div className="stat-row">
                <span>Words</span>
                <strong>{wordCount}</strong>
              </div>
              <div className="stat-row">
                <span>Characters</span>
                <strong>{charCount}</strong>
              </div>
            </div>
          </section>
        </aside>

        <main className="document-stage">
          <div className="document-paper">
            <EditorContent editor={editor} />
          </div>
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
    return (
      <div className="workspace-launch">
        <div className="workspace-launch-card">
          <div className="brand-row">
            <div className="brand-mark">PS</div>
            <span className="brand-name">PeerSync Workspace</span>
          </div>
          <h2>Open a room to start editing</h2>
          <p className="muted-copy">
            Create a fresh room or join an existing one using the shared room code.
          </p>

          <div className="field-group">
            <label className="field-label" htmlFor="room-launch-input">
              Room code
            </label>
            <input
              id="room-launch-input"
              className="text-input"
              value={roomInput}
              onChange={(event) => setRoomInput(event.target.value.toUpperCase())}
              placeholder={`Example: ${createRoomCode()}`}
            />
          </div>

          <div className="launch-actions">
            <button className="primary-button" type="button" onClick={() => openRoom(createRoomCode())}>
              Create Room
            </button>
            <button
              className="secondary-button"
              type="button"
              disabled={!roomInput.trim()}
              onClick={() => openRoom(roomInput)}
            >
              Join Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!collab) {
    return (
      <div className="workspace-launch">
        <div className="workspace-launch-card">
          <div className="brand-mark">PS</div>
          <h2>Joining room {roomId}</h2>
          <p className="muted-copy">Preparing the collaborative editor.</p>
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
      <div className="workspace-launch">
        <div className="workspace-auth-wrap">
          <AuthPanel
            authReady={authReady}
            authUser={authUser}
            title="Sign in before opening the editor"
            subtitle="Room access is tied to Firebase Authentication so each collaborator has a username."
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
