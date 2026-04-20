import { Waypoints } from "lucide-react";

import { ThemeToggle } from "./ThemeToggle";

function isActive(pathname, target) {
  if (target === "/") {
    return pathname === "/" || pathname === "/ARCHITECTURE.html";
  }

  return pathname === target;
}

export function SiteHeader({ pathname = "/" }) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a className="site-brand" href="/">
          <span className="site-brand-mark">
            <Waypoints className="site-brand-icon" />
          </span>
          <span>PeerSync</span>
        </a>

        <nav className="site-nav">
          <a className={isActive(pathname, "/") ? "active" : ""} href="/">
            Home
          </a>
          <a className={isActive(pathname, "/features") ? "active" : ""} href="/features">
            Features
          </a>
          <a
            className={isActive(pathname, "/architecture") ? "active" : ""}
            href="/architecture"
          >
            Architecture
          </a>
          <a className={isActive(pathname, "/login") ? "active" : ""} href="/login">
            Login
          </a>
        </nav>

        <div className="site-header-actions">
          <ThemeToggle />
          <a className="ghost-button" href="/app">
            Open editor
          </a>
          <a className="gradient-button" href="/login">
            Get started
          </a>
        </div>
      </div>
    </header>
  );
}
