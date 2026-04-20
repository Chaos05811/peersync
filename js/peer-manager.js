'use strict';

/**
 * PeerSync Peer Manager
 *
 * Topology: Star (host = hub, clients = spokes)
 *  - All CRDT ops route through host → host relays to others
 *  - File transfers are announced via host, then sent direct host relay too
 *  - Latency measured by host ↔ client ping/pong every 2 s
 *
 * WebRTC: PeerJS abstracts ICE/STUN handshake.
 * Signaling server: PeerJS public cloud (no infra needed).
 *
 * Architecture layer: WebRTC ← PeerManager ← App
 */
class PeerManager extends EventTarget {
  constructor() {
    super();
    this.peer      = null;      // PeerJS instance
    this.peerId    = null;
    this.roomId    = null;
    this.isHost    = false;
    this.hostConn  = null;      // non-host: connection to host
    this.peerConns = new Map(); // peerId → RTCDataConnection
    this.peers     = new Map(); // peerId → {id, name, color, latency, isLocal}
    this._pingTimers = new Map();
    this.name  = 'User-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    this.color = this._randomColor();
  }

  /* ─── helpers ──────────────────────────────────────────────────── */

  _randomColor() {
    return ['#4fc3f7','#81c784','#ffb74d','#f06292','#ce93d8','#80cbc4','#fff176']
      [Math.floor(Math.random() * 7)];
  }

  _emit(event, detail = {}) {
    this.dispatchEvent(new CustomEvent(event, { detail }));
  }

  /* ─── init ──────────────────────────────────────────────────────── */

  init() {
    return new Promise((resolve, reject) => {
      // Use PeerJS default cloud signaling
      this.peer = new Peer({
        debug: 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      this.peer.on('open', id => {
        this.peerId = id;
        this._emit('ready', { peerId: id });
        resolve(id);
      });

      this.peer.on('error', err => {
        console.error('[Peer] error:', err);
        this._emit('error', { error: err });
        // Only reject if we never got an id
        if (!this.peerId) reject(err);
      });

      // Incoming connections (host only — clients don't accept arbitrary connections)
      this.peer.on('connection', conn => {
        if (this.isHost) this._acceptConnection(conn);
      });

      setTimeout(() => {
        if (!this.peerId) reject(new Error('Peer init timeout'));
      }, 15000);
    });
  }

  /* ─── host / join ───────────────────────────────────────────────── */

  host(roomId) {
    this.isHost = true;
    this.roomId = roomId;
    this.peers.set(this.peerId, {
      id: this.peerId, name: this.name, color: this.color,
      latency: 0, isLocal: true
    });
    this._emit('peer-joined', { peer: this.peers.get(this.peerId) });
  }

  join(roomId) {
    this.isHost = false;
    this.roomId = roomId;
    return new Promise((resolve, reject) => {
      const conn = this.peer.connect(roomId, { reliable: true, serialization: 'json' });

      const timeout = setTimeout(() => reject(new Error('Join timeout — is the room code correct?')), 12000);

      conn.on('open', () => {
        clearTimeout(timeout);
        this.hostConn = conn;
        this._wireConn(conn, roomId, true);
        conn.send({ type: 'join', peerId: this.peerId, name: this.name, color: this.color });
        resolve();
      });

      conn.on('error', err => { clearTimeout(timeout); reject(err); });
    });
  }

  /* ─── connection wiring ─────────────────────────────────────────── */

  _acceptConnection(conn) {
    conn.on('open', () => {
      this.peerConns.set(conn.peer, conn);
      this._wireConn(conn, conn.peer, false);
    });
  }

  _wireConn(conn, remotePeerId, isToHost) {
    if (!isToHost) this.peerConns.set(remotePeerId, conn);

    conn.on('data', data => this._route(data, remotePeerId, conn, isToHost));

    conn.on('close', () => {
      this.peerConns.delete(remotePeerId);
      this._clearPing(remotePeerId);

      if (this.isHost) {
        const peer = this.peers.get(remotePeerId);
        this.peers.delete(remotePeerId);
        this._emit('peer-left', { peerId: remotePeerId });
        this._broadcast({ type: 'peer-left', peerId: remotePeerId });
      } else if (remotePeerId === this.roomId) {
        this._emit('host-disconnected', {});
      }
    });

    // Host pings clients (not the other way to keep things simple)
    if (this.isHost && !isToHost) {
      this._startPing(remotePeerId, conn);
    }
  }

  /* ─── message routing ───────────────────────────────────────────── */

  _route(msg, fromPeerId, conn, fromHost) {
    switch (msg.type) {

      case 'join': {
        // Host receives a new client's handshake
        if (!this.isHost) break;
        const peer = { id: msg.peerId, name: msg.name, color: msg.color, latency: 0, isLocal: false };
        this.peers.set(msg.peerId, peer);
        this._emit('peer-joined', { peer });

        // Ask app layer for current CRDT state then send sync
        this._emit('need-sync', {
          send: (payload) => {
            conn.send({ type: 'sync', peers: Array.from(this.peers.values()), ...payload });
          }
        });

        // Notify others
        this._broadcastExcept({ type: 'peer-joined', peer }, msg.peerId);
        break;
      }

      case 'sync': {
        this.peers.clear();
        for (const p of msg.peers) {
          this.peers.set(p.id, { ...p, isLocal: p.id === this.peerId });
        }
        this._emit('synced', { data: msg });
        break;
      }

      case 'peer-joined':
        this.peers.set(msg.peer.id, { ...msg.peer, isLocal: false });
        this._emit('peer-joined', { peer: msg.peer });
        break;

      case 'peer-left':
        this.peers.delete(msg.peerId);
        this._emit('peer-left', { peerId: msg.peerId });
        break;

      case 'op':
        // Host relays to everyone else, then surfaces to local app
        if (this.isHost) this._broadcastExcept(msg, fromPeerId);
        this._emit('op', { ops: msg.ops, fromPeerId });
        break;

      case 'cursor':
        if (this.isHost) this._broadcastExcept(msg, fromPeerId);
        this._emit('cursor', { pos: msg.pos, peerId: msg.peerId || fromPeerId });
        break;

      case 'ping':
        conn.send({ type: 'pong', ts: msg.ts });
        break;

      case 'pong': {
        const latency = Date.now() - msg.ts;
        const p = this.peers.get(fromPeerId);
        if (p) { p.latency = latency; this._emit('latency', { peerId: fromPeerId, latency }); }
        break;
      }

      case 'file-announce':
        if (this.isHost) this._broadcastExcept(msg, fromPeerId);
        this._emit('file-announce', { meta: msg.meta, fromPeerId: msg.fromPeerId || fromPeerId });
        break;

      case 'file-start':
        if (this.isHost) this._broadcastExcept(msg, fromPeerId);
        this._emit('file-start', { meta: msg.meta });
        break;

      case 'file-chunk':
        if (this.isHost) this._broadcastExcept(msg, fromPeerId);
        this._emit('file-chunk', { chunk: msg });
        break;

      case 'file-done':
        if (this.isHost) this._broadcastExcept(msg, fromPeerId);
        this._emit('file-done', { fileId: msg.fileId });
        break;
    }
  }

  /* ─── ping ──────────────────────────────────────────────────────── */

  _startPing(peerId, conn) {
    const id = setInterval(() => {
      if (conn.open) conn.send({ type: 'ping', ts: Date.now() });
      else this._clearPing(peerId);
    }, 2000);
    this._pingTimers.set(peerId, id);
  }

  _clearPing(peerId) {
    if (this._pingTimers.has(peerId)) {
      clearInterval(this._pingTimers.get(peerId));
      this._pingTimers.delete(peerId);
    }
  }

  /* ─── send helpers ──────────────────────────────────────────────── */

  sendOps(ops) {
    const msg = { type: 'op', ops };
    this.isHost ? this._broadcast(msg) : this._toHost(msg);
  }

  sendCursor(pos) {
    const msg = { type: 'cursor', pos, peerId: this.peerId };
    this.isHost ? this._broadcast(msg) : this._toHost(msg);
  }

  sendToAll(msg) {
    this.isHost ? this._broadcast(msg) : this._toHost(msg);
  }

  _toHost(msg) {
    if (this.hostConn?.open) this.hostConn.send(msg);
  }

  _broadcast(msg) {
    for (const conn of this.peerConns.values()) {
      if (conn.open) conn.send(msg);
    }
  }

  _broadcastExcept(msg, excludeId) {
    for (const [id, conn] of this.peerConns) {
      if (id !== excludeId && conn.open) conn.send(msg);
    }
  }

  /* ─── accessors ─────────────────────────────────────────────────── */

  getPeers()      { return Array.from(this.peers.values()); }
  getPeerCount()  { return this.peers.size; }

  destroy() { this.peer?.destroy(); }
}

window.PeerManager = PeerManager;
