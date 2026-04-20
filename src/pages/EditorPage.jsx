import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

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

import { EditorToolbar } from "../components/EditorToolbar";
import { createUserProfile } from "../lib/session";

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

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function sanitizeFileName(value) {
  return value.trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-") || "document";
}

function getInitials(name) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
}

function CollaborativeEditor({
  title,
  roomId,
  collab,
  users,
  connectionStatus,
  updateTitle
}) {
  const editor = useEditor({
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
        placeholder: "Start typing here. Everyone in this room will see updates instantly."
      }),
      Collaboration.configure({
        document: collab.ydoc
      }),
      CollaborationCursor.configure({
        provider: collab.provider,
        user: collab.user
      })
    ]
  });

  const wordCount = editor?.getText().trim()
    ? editor.getText().trim().split(/\s+/).length
    : 0;
  const charCount = editor?.getText().length || 0;
  const fileName = sanitizeFileName(title || roomId);
  const roomLink = `${window.location.origin}/room/${roomId}`;

  return (
    <div className="editor-shell">
      <header className="editor-header">
        <div className="editor-brand">
          <button className="brand-mark clickable" type="button" onClick={() => window.location.assign("/")}>
            PS
          </button>
          <div className="title-stack">
            <input
              className="doc-title-input"
              value={title}
              onChange={(event) => updateTitle(event.target.value)}
              placeholder="Untitled Document"
            />
            <div className="room-meta">
              <span>Room: {roomId}</span>
              <span className={`status-pill ${connectionStatus}`}>
                {connectionStatus === "connected" ? "Live" : "Connecting"}
              </span>
            </div>
          </div>
        </div>

        <div className="header-actions">
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
            onClick={() => downloadFile(`${fileName}.txt`, editor?.getText() || "", "text/plain")}
          >
            Download TXT
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={() =>
              downloadFile(
                `${fileName}.html`,
                `<!doctype html><html><head><meta charset="UTF-8"><title>${title || "Untitled Document"}</title></head><body>${editor?.getHTML() || ""}</body></html>`,
                "text/html"
              )
            }
          >
            Download HTML
          </button>
        </div>
      </header>

      <EditorToolbar editor={editor} />

      <div className="workspace">
        <aside className="presence-panel">
          <div className="panel-block">
            <div className="panel-label">Collaborators</div>
            <div className="presence-count">{users.length} active</div>
          </div>

          <div className="presence-list">
            {users.map((user) => (
              <div className="presence-user" key={`${user.name}-${user.color}`}>
                <span
                  className="presence-avatar"
                  style={{ backgroundColor: user.color }}
                >
                  {getInitials(user.name)}
                </span>
                <span>{user.name}</span>
              </div>
            ))}
          </div>

          <div className="panel-block">
            <div className="panel-label">Document</div>
            <div className="document-stats">
              <span>{wordCount} words</span>
              <span>{charCount} characters</span>
            </div>
          </div>
        </aside>

        <main className="paper-stage">
          <div className="paper">
            <EditorContent editor={editor} />
          </div>
        </main>
      </div>
    </div>
  );
}

export function EditorPage() {
  const { roomId = "" } = useParams();
  const navigate = useNavigate();
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [title, setTitle] = useState("");
  const [users, setUsers] = useState([]);
  const [collab, setCollab] = useState(null);
  const user = useMemo(() => createUserProfile(), []);

  useEffect(() => {
    if (!roomId.trim()) {
      navigate("/");
      return undefined;
    }

    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(getWebsocketBaseUrl(), roomId, ydoc);
    const localStore = new IndexeddbPersistence(`peersync-${roomId}`, ydoc);
    const titleText = ydoc.getText("title");

    provider.awareness.setLocalStateField("user", user);

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
      ydoc,
      provider,
      localStore,
      titleText,
      user
    });

    return () => {
      titleText.unobserve(syncTitle);
      provider.off("status", handleStatus);
      provider.awareness.off("change", syncUsers);
      provider.destroy();
      localStore.destroy();
      ydoc.destroy();
    };
  }, [navigate, roomId, user]);

  useEffect(() => {
    document.title = `${title || "Untitled Document"} - PeerSync`;
  }, [title]);

  if (!collab) {
    return (
      <div className="loading-screen">
        <div className="loading-card">
          <div className="brand-mark">PS</div>
          <p>Joining room {roomId}...</p>
        </div>
      </div>
    );
  }

  return (
    <CollaborativeEditor
      collab={collab}
      connectionStatus={connectionStatus}
      roomId={roomId}
      title={title}
      users={users}
      updateTitle={(nextTitle) => {
        collab.ydoc.transact(() => {
          collab.titleText.delete(0, collab.titleText.length);
          if (nextTitle) {
            collab.titleText.insert(0, nextTitle);
          }
        });
      }}
    />
  );
}
