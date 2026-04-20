'use strict';

/**
 * PeerSync File Transfer
 *
 * Transfers files as 16 KB chunks over WebRTC data channels (via host relay).
 * After all chunks are received the file is reassembled and its SHA-256 digest
 * is compared against the sender's digest for integrity verification.
 *
 * Flow:
 *   Sender:
 *     1. sha256(file)
 *     2. sendToAll  file-announce {meta}
 *     3. sendToAll  file-start   {meta}
 *     4. sendToAll  file-chunk   {fileId, index, totalChunks, data[]}  × N
 *     5. sendToAll  file-done    {fileId}
 *
 *   Receiver:
 *     1. 'file-announce' → surface toast / add sidebar entry
 *     2. 'file-start'    → allocate buffer
 *     3. 'file-chunk'    × N → fill buffer, emit progress
 *     4. All chunks received → sha256 + emit 'receive-complete'
 *
 * Architecture layer: DataChannel ← FileTransfer ← App
 */
class FileTransfer extends EventTarget {
  constructor(pm) {
    super();
    this.pm          = pm;
    this.CHUNK_SIZE  = 16 * 1024; // 16 KB

    /** fileId → {meta, chunks[], received, fromPeerId} */
    this._inbound  = new Map();
    /** fileId → {meta, sent, total} */
    this._outbound = new Map();

    this._bindPeerEvents();
  }

  _emit(event, detail = {}) {
    this.dispatchEvent(new CustomEvent(event, { detail }));
  }

  _bindPeerEvents() {
    this.pm.addEventListener('file-announce', e => {
      const { meta, fromPeerId } = e.detail;
      this._emit('incoming', { meta, fromPeerId });
    });

    this.pm.addEventListener('file-start', e => {
      const { meta } = e.detail;
      this._inbound.set(meta.id, {
        meta,
        chunks  : new Array(meta.totalChunks).fill(null),
        received: 0
      });
    });

    this.pm.addEventListener('file-chunk', e => {
      this._onChunk(e.detail.chunk);
    });

    this.pm.addEventListener('file-done', e => {
      const { fileId } = e.detail;
      const transfer = this._inbound.get(fileId);
      if (transfer && transfer.received === transfer.meta.totalChunks) {
        this._finalize(fileId);
      }
    });
  }

  /* ─── send ──────────────────────────────────────────────────────── */

  async sendFile(file) {
    const fileId      = this._uuid();
    const arrayBuffer = await file.arrayBuffer();
    const hash        = await this._sha256(arrayBuffer);
    const bytes       = new Uint8Array(arrayBuffer);
    const totalChunks = Math.ceil(bytes.length / this.CHUNK_SIZE) || 1;

    const meta = {
      id: fileId,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      totalChunks,
      hash,
      fromPeerId: this.pm.peerId
    };

    this._outbound.set(fileId, { meta, sent: 0, total: totalChunks });

    // Announce so receivers can prepare UI
    this.pm.sendToAll({ type: 'file-announce', meta, fromPeerId: this.pm.peerId });

    // Brief pause so announce arrives first
    await this._sleep(80);

    this.pm.sendToAll({ type: 'file-start', meta });

    // Stream chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.CHUNK_SIZE;
      const slice = bytes.slice(start, start + this.CHUNK_SIZE);

      this.pm.sendToAll({
        type       : 'file-chunk',
        fileId,
        index      : i,
        totalChunks,
        data       : Array.from(slice)   // JSON-serializable
      });

      const progress = Math.round(((i + 1) / totalChunks) * 100);
      this._emit('send-progress', { fileId, progress, name: file.name });

      // Yield every 10 chunks to keep UI responsive and prevent channel overflow
      if (i % 10 === 9) await this._sleep(15);
    }

    this.pm.sendToAll({ type: 'file-done', fileId });
    this._emit('send-complete', { fileId, name: file.name });
    return fileId;
  }

  /* ─── receive ───────────────────────────────────────────────────── */

  _onChunk(chunk) {
    const transfer = this._inbound.get(chunk.fileId);
    if (!transfer || transfer.chunks[chunk.index] !== null) return;

    transfer.chunks[chunk.index] = chunk.data;
    transfer.received++;

    const progress = Math.round((transfer.received / transfer.meta.totalChunks) * 100);
    this._emit('receive-progress', { fileId: chunk.fileId, progress, name: transfer.meta.name });

    if (transfer.received === transfer.meta.totalChunks) {
      this._finalize(chunk.fileId);
    }
  }

  async _finalize(fileId) {
    const transfer = this._inbound.get(fileId);
    if (!transfer) return;
    this._inbound.delete(fileId);

    // Reassemble
    const flat   = transfer.chunks.flat();
    const buffer = new Uint8Array(flat);

    // Integrity check
    const hash    = await this._sha256(buffer.buffer);
    const valid   = hash === transfer.meta.hash;

    const blob = new Blob([buffer], { type: transfer.meta.mimeType });

    this._emit('receive-complete', {
      fileId,
      name  : transfer.meta.name,
      size  : transfer.meta.size,
      blob,
      valid,
      hash,
      expectedHash: transfer.meta.hash
    });
  }

  /* ─── utilities ─────────────────────────────────────────────────── */

  async _sha256(buffer) {
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  _uuid() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11)
      .replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
  }

  _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

window.FileTransfer = FileTransfer;
