export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p>© {new Date().getFullYear()} PeerSync. Built for the collaborative web.</p>
        <p>Decentralized · Offline-first · CRDT-powered</p>
      </div>
    </footer>
  );
}
