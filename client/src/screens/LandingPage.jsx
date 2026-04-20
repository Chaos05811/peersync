import {
  AlignLeft,
  ArrowRight,
  Bold,
  Cloud,
  Download,
  FileText,
  Italic,
  List,
  ListOrdered,
  Lock,
  Share2,
  Strikethrough,
  Type,
  Underline,
  Users,
  Waypoints,
  Wifi,
  Zap
} from "lucide-react";

import { AuthPanel } from "../components/AuthPanel";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { useAuthUser } from "../lib/session";

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
    desc: "Keep editing while disconnected. Changes replay through y-websocket on reconnect."
  },
  {
    icon: Share2,
    title: "Shareable rooms",
    desc: "Invite collaborators with a 4-8 character room code or a direct link."
  },
  {
    icon: Lock,
    title: "Email login",
    desc: "Authenticate with Firebase email/password and pick a username."
  },
  {
    icon: Download,
    title: "Export anywhere",
    desc: "Download the result as .txt, .docx, or .pdf with one click."
  }
];

const featureGroups = [
  {
    title: "Authentication",
    icon: Lock,
    items: ["Email/password login with Firebase", "Username setup and updates"]
  },
  {
    title: "Rooms & Collaboration",
    icon: Users,
    items: [
      "Create or join a room",
      "Shareable links and short room codes",
      "Multi-user collaborative editing",
      "Live presence list with collaborator cursors"
    ]
  },
  {
    title: "Sync",
    icon: Wifi,
    items: [
      "CRDT-based shared state with Yjs",
      "Realtime transport via y-websocket",
      "Offline edits cached in IndexedDB",
      "MongoDB persistence on the server"
    ]
  },
  {
    title: "Sharing",
    icon: Share2,
    items: ["Copy room link", "Copy room code", "Open in new tab"]
  },
  {
    title: "Downloads",
    icon: Download,
    items: ["Export as .txt", "Export as .docx", "Export as .pdf"]
  }
];

const formatting = [
  { icon: Type, label: "Headings" },
  { icon: Bold, label: "Bold" },
  { icon: Italic, label: "Italic" },
  { icon: Underline, label: "Underline" },
  { icon: Strikethrough, label: "Strikethrough" },
  { icon: AlignLeft, label: "Alignment" },
  { icon: List, label: "Bullet lists" },
  { icon: ListOrdered, label: "Numbered lists" },
  { icon: Type, label: "Font family" }
];

const stack = [
  { area: "Editor UI", tech: "React + TipTap" },
  { area: "Shared document state", tech: "Yjs (CRDT)" },
  { area: "Realtime transport", tech: "y-websocket" },
  { area: "Server", tech: "Node.js + Express + WebSocket" },
  { area: "Persistence", tech: "MongoDB" },
  { area: "Authentication", tech: "Firebase Authentication" },
  { area: "Local cache", tech: "IndexedDB" }
];

const steps = [
  "A signed-in user creates or joins a room.",
  "TipTap edits update a Yjs shared document locally.",
  "y-websocket sends Yjs updates to the Node websocket server.",
  "The server broadcasts updates to every client in the same room.",
  "Connected clients apply the updates instantly.",
  "MongoDB stores the latest room state."
];

function normalizePath(pathname) {
  if (!pathname || pathname === "/ARCHITECTURE.html") {
    return "/";
  }

  return pathname;
}

function MarketingLayout({ pathname, children }) {
  return (
    <div className="site-shell">
      <div className="site-frame">
        <SiteHeader pathname={pathname} />
        {children}
        <SiteFooter />
      </div>
    </div>
  );
}

function HomePage({ pathname }) {
  return (
    <MarketingLayout pathname={pathname}>
      <section className="hero-section">
        <div className="hero-copy">
          <span className="hero-pill">Realtime · CRDT · Offline-first</span>
          <h1>
            Write together, <span>in perfect sync</span>.
          </h1>
          <p>
            PeerSync is a collaborative document editor: sign in, create or join a
            room, and edit the same document with your team in real time, even when
            you&apos;re offline.
          </p>
          <div className="hero-actions">
            <a className="gradient-button" href="/app">
              Start a room <ArrowRight className="inline-icon" />
            </a>
            <a className="ghost-button" href="/architecture">
              See the architecture
            </a>
          </div>
        </div>

        <div className="preview-shell">
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
                PeerSync streams every keystroke through a CRDT, so concurrent edits
                merge cleanly and nobody overwrites anyone else.
              </p>
              <ul>
                <li>Realtime cursors with names</li>
                <li>Offline edits replay on reconnect</li>
                <li>Export to .txt, .docx, or .pdf</li>
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

      <section className="marketing-section">
        <div className="section-heading centered">
          <h2>Everything you need to collaborate</h2>
          <p>
            All the essentials of a modern document editor, wired for realtime by
            default.
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

      <section className="marketing-section">
        <div className="cta-card">
          <h2>Ready to write together?</h2>
          <p>Spin up a room in seconds. Share the link. Watch the cursors arrive.</p>
          <div className="cta-row">
            <a className="ghost-bright-button" href="/app">
              <FileText className="inline-icon" /> Open the editor
            </a>
            <a className="outline-bright-button" href="/features">
              <Cloud className="inline-icon" /> Explore features
            </a>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

function FeaturesPage({ pathname }) {
  return (
    <MarketingLayout pathname={pathname}>
      <section className="marketing-section page-section">
        <header className="section-heading centered narrow">
          <h1>Features</h1>
          <p>
            A focused collaborative editor: authenticate, join a room, edit together,
            export.
          </p>
        </header>

        <div className="feature-grid feature-grid-five">
          {featureGroups.map((group) => (
            <article className="feature-card" key={group.title}>
              <span className="feature-icon-wrap">
                <group.icon className="feature-icon" />
              </span>
              <h3>{group.title}</h3>
              <ul className="feature-list">
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <section className="stack-card formatting-card">
          <h2>Document formatting</h2>
          <p>Everything in the toolbar today.</p>
          <div className="formatting-grid">
            {formatting.map((item) => (
              <div className="format-chip" key={item.label}>
                <item.icon className="feature-icon" />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </section>
      </section>
    </MarketingLayout>
  );
}

function ArchitecturePage({ pathname }) {
  return (
    <MarketingLayout pathname={pathname}>
      <section className="marketing-section page-section">
        <header className="section-heading narrow">
          <h1>Architecture</h1>
          <p>
            PeerSync combines a CRDT editor on the client with a thin websocket
            relay and a persistence layer on the server.
          </p>
        </header>

        <div className="architecture-grid">
          <section className="stack-card">
            <h2>Stack</h2>
            <ul className="stack-list">
              {stack.map((item) => (
                <li key={item.area}>
                  <span>{item.area}</span>
                  <strong>{item.tech}</strong>
                </li>
              ))}
            </ul>
          </section>

          <section className="stack-card">
            <h2>Data flow</h2>
            <ol className="flow-list">
              {steps.map((step, index) => (
                <li key={step}>
                  <span className="flow-index">{index + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <section className="stack-card repository-card">
          <h2>Repository layout</h2>
          <pre>{`client/src/screens      landing page and editor workspace
client/src/components   reusable auth and toolbar UI
client/src/lib          firebase, auth, room and presence helpers
client/src/styles       shared styling
server/                 websocket server and MongoDB persistence
ARCHITECTURE.html       landing page entry
app.html                collaborative editor entry`}</pre>
        </section>
      </section>
    </MarketingLayout>
  );
}

function LoginPage() {
  const { authReady, authUser } = useAuthUser();

  return (
    <div className="site-shell">
      <div className="site-frame auth-frame">
        <div className="login-page">
          <AuthPanel
            authReady={authReady}
            authUser={authUser}
            title={authUser ? "You are signed in" : "Welcome back"}
            subtitle={
              authUser
                ? "Continue to create or join a collaborative room."
                : "Sign in to continue collaborating."
            }
            onAuthenticated={() => {
              window.location.assign("/app");
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

export function LandingPage() {
  const pathname = normalizePath(window.location.pathname);

  if (pathname === "/login") {
    return <LoginPage />;
  }

  if (pathname === "/features") {
    return <FeaturesPage pathname={pathname} />;
  }

  if (pathname === "/architecture") {
    return <ArchitecturePage pathname={pathname} />;
  }

  return <HomePage pathname={pathname} />;
}
