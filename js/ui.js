'use strict';

/**
 * PeerSync UI Manager
 *
 * Owns all DOM mutations:
 *   - Connect / Share modals
 *   - Peer panel + titlebar avatars
 *   - File sidebar (recent docs, transfers)
 *   - Status bar (word count, peer count, save status)
 *   - Toast notifications
 *
 * Architecture layer: DOM ← UIManager ← App
 */
class UIManager {
  constructor() {
    this._recentDocs = this._loadRecent();
  }

  /* ─── screen switching ──────────────────────────────────────────── */

  showApp() {
    document.getElementById('connect-modal').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
  }

  showConnect() {
    document.getElementById('connect-modal').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
  }

  setModalStatus(text, type = 'info') {
    const el = document.getElementById('modal-status');
    el.textContent = text;
    el.dataset.type = type;
  }

  /* ─── peer panel ────────────────────────────────────────────────── */

  updatePeerList(peers) {
    const list      = document.getElementById('peer-list');
    const avatarBar = document.getElementById('peer-avatars');
    document.getElementById('peer-count').textContent  = peers.length;
    document.getElementById('peer-status').textContent =
      `${peers.length} peer${peers.length !== 1 ? 's' : ''} connected`;

    list.innerHTML      = '';
    avatarBar.innerHTML = '';

    peers.forEach((peer, idx) => {
      /* ── Panel row ── */
      const row = document.createElement('div');
      row.className  = 'peer-item';
      const latencyBar = peer.isLocal ? '' : `
        <div class="latency-track">
          <div class="latency-fill" style="width:${this._latencyPct(peer.latency)}%"></div>
        </div>`;
      const metaText = peer.isLocal ? 'host · you'
        : (peer.latency ? `${peer.latency} ms` : 'connecting…');

      row.innerHTML = `
        <div class="peer-av" style="--peer-color:${peer.color}">
          ${this._initials(peer.name)}
        </div>
        <div class="peer-details">
          <span class="peer-name">${this._displayName(peer)}</span>
          <span class="peer-meta">${metaText}</span>
          ${latencyBar}
        </div>
        <span class="peer-dot ${peer.isLocal ? 'dot-host' : 'dot-online'}"></span>
      `;
      list.appendChild(row);

      /* ── Titlebar avatar (max 4) ── */
      if (idx < 4) {
        const av = document.createElement('div');
        av.className = 'tb-avatar';
        av.style.setProperty('--peer-color', peer.color);
        av.title     = this._displayName(peer);
        av.textContent = this._initials(peer.name);
        avatarBar.appendChild(av);
      }
    });
  }

  _latencyPct(ms) {
    if (!ms) return 0;
    return Math.min(100, Math.round(ms / 2)); // 200ms → 100%
  }

  _initials(name) {
    return name.replace(/\s*\(you\)/, '').split(/[-\s]/)
      .map(p => p[0] || '').join('').toUpperCase().slice(0, 2);
  }

  _displayName(peer) {
    return peer.isLocal ? peer.name + ' <span class="you-badge">you</span>' : peer.name;
  }

  /* ─── status bar ────────────────────────────────────────────────── */

  updateWordCount(n) {
    document.getElementById('word-count').textContent = `${n} word${n !== 1 ? 's' : ''}`;
  }

  updateCharCount(n) {
    document.getElementById('char-count').textContent = `${n} char${n !== 1 ? 's' : ''}`;
  }

  setSaveStatus(text) {
    document.getElementById('save-status').textContent = text;
  }

  /* ─── share modal ───────────────────────────────────────────────── */

  setRoomInfo(roomId) {
    document.getElementById('share-room-code').textContent = roomId;
    const url = `${location.origin}${location.pathname}#${roomId}`;
    document.getElementById('share-url').textContent = url;
  }

  /* ─── sidebar: recent docs ──────────────────────────────────────── */

  addRecentDoc(id, title) {
    const palette = ['#4fc3f7','#81c784','#ffb74d','#f06292','#ce93d8','#80cbc4'];
    const color   = palette[Math.floor(Math.random() * palette.length)];
    this._recentDocs = [{ id, title, color },
      ...this._recentDocs.filter(d => d.id !== id)].slice(0, 12);
    this._saveRecent();
    this._renderRecent();
  }

  _renderRecent() {
    const el = document.getElementById('recent-docs');
    el.innerHTML = '';
    for (const doc of this._recentDocs) {
      const item = document.createElement('div');
      item.className = 'sidebar-item';
      item.innerHTML = `
        <span class="sidebar-dot" style="background:${doc.color}"></span>
        <span class="sidebar-label-text">${doc.title}</span>
      `;
      item.addEventListener('click', () => {
        location.hash = doc.id;
        location.reload();
      });
      el.appendChild(item);
    }
  }

  /* ─── sidebar: file transfers ───────────────────────────────────── */

  addTransfer(id, name, size, direction) {
    const container = document.getElementById('file-transfers');
    const item = document.createElement('div');
    item.id        = `ft-${CSS.escape(id)}`;
    item.className = `ft-item ft-${direction}`;
    item.innerHTML = `
      <span class="ft-icon">${this._fileEmoji(name)}</span>
      <div class="ft-body">
        <span class="ft-name" title="${name}">${this._truncate(name, 22)}</span>
        <span class="ft-size">${this.formatBytes(size)}</span>
        <div class="ft-track"><div class="ft-fill" id="ftf-${CSS.escape(id)}"></div></div>
      </div>
      <span class="ft-dir">${direction === 'send' ? '↑' : '↓'}</span>
    `;
    container.prepend(item);
  }

  setTransferProgress(id, pct) {
    const fill = document.getElementById(`ftf-${CSS.escape(id)}`);
    if (fill) fill.style.width = `${pct}%`;
  }

  completeTransfer(id, blob, name) {
    const fill = document.getElementById(`ftf-${CSS.escape(id)}`);
    if (fill) { fill.style.width = '100%'; fill.classList.add('ft-done'); }

    const item = document.getElementById(`ft-${CSS.escape(id)}`);
    if (item && blob) {
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href = url; a.download = name; a.className = 'ft-dl'; a.title = 'Download';
      a.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
      item.appendChild(a);
    }
  }

  /* ─── toasts ────────────────────────────────────────────────────── */

  toast(msg, type = 'info') {
    const wrap = document.getElementById('toasts');
    const el   = document.createElement('div');
    el.className  = `toast toast-${type}`;
    el.textContent = msg;
    wrap.appendChild(el);

    // Animate in
    requestAnimationFrame(() => el.classList.add('toast-in'));

    setTimeout(() => {
      el.classList.remove('toast-in');
      el.classList.add('toast-out');
      el.addEventListener('transitionend', () => el.remove(), { once: true });
    }, 3200);
  }

  /* ─── utilities ─────────────────────────────────────────────────── */

  formatBytes(b) {
    if (b < 1024)        return b + ' B';
    if (b < 1048576)     return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  _fileEmoji(name) {
    const ext = name.split('.').pop().toLowerCase();
    return { pdf:'📄', png:'🖼', jpg:'🖼', jpeg:'🖼', gif:'🖼', svg:'🖼',
             mp4:'🎬', mov:'🎬', mp3:'🎵', wav:'🎵', zip:'📦', tar:'📦',
             gz:'📦', js:'📝', ts:'📝', html:'🌐', css:'🎨', md:'📝',
             json:'📋', csv:'📊', xlsx:'📊' }[ext] || '📁';
  }

  _truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  _loadRecent()   { try { return JSON.parse(localStorage.getItem('ps-recent') || '[]'); } catch { return []; } }
  _saveRecent()   { try { localStorage.setItem('ps-recent', JSON.stringify(this._recentDocs)); } catch {} }

  init() { this._renderRecent(); }
}

window.UIManager = UIManager;
