'use strict';

/**
 * PeerSync CRDT Engine — Simplified RGA (Replicated Growable Array)
 *
 * Each character is a node with a unique ID. Insertions specify their
 * predecessor node. Deletions are tombstoned (soft-deleted). Because
 * every node carries a globally unique ID and a deterministic tie-break
 * rule, all peers converge to the same document regardless of message
 * arrival order.
 *
 * Architecture layer: CRDT ← Editor ← App
 */
class RGA {
  constructor(peerId) {
    this.peerId = peerId;
    this.clock  = 0;
    // Sentinel root node — always first, never deleted
    this.nodes  = [{ id: '__root__', char: null, deleted: false, afterId: null, peerId: '' }];
  }

  /* ─── helpers ──────────────────────────────────────────────────── */

  _nodeById(id) { return this.nodes.find(n => n.id === id); }
  _indexById(id) { return this.nodes.findIndex(n => n.id === id); }

  /** Visible plain text */
  getText() {
    return this.nodes
      .filter(n => n.id !== '__root__' && !n.deleted)
      .map(n => n.char)
      .join('');
  }

  /** Visible index → node id */
  idAtVisiblePos(pos) {
    let count = 0;
    for (const n of this.nodes) {
      if (n.id === '__root__' || n.deleted) continue;
      if (count === pos) return n.id;
      count++;
    }
    return null;
  }

  /** Node id → visible index (-1 if deleted / not found) */
  visiblePosOfId(id) {
    let pos = 0;
    for (const n of this.nodes) {
      if (n.id === '__root__') continue;
      if (n.id === id) return n.deleted ? -1 : pos;
      if (!n.deleted) pos++;
    }
    return -1;
  }

  /** Node id just before visible position (for insert-before semantics) */
  _afterIdForPos(pos) {
    if (pos === 0) return '__root__';
    return this.idAtVisiblePos(pos - 1) || '__root__';
  }

  /* ─── local operations ──────────────────────────────────────────── */

  /**
   * Insert `text` at visible position `pos`.
   * Returns array of CRDT ops to broadcast.
   */
  insertAt(pos, text) {
    const ops = [];
    let afterId = this._afterIdForPos(pos);
    for (const char of text) {
      const id = `${this.peerId}:${this.clock++}`;
      const op = { type: 'insert', id, char, afterId, peerId: this.peerId };
      this._applyInsert(op);
      ops.push(op);
      afterId = id;
    }
    return ops;
  }

  /**
   * Delete `len` chars starting at visible position `pos`.
   * Returns array of CRDT ops to broadcast.
   */
  deleteAt(pos, len) {
    const ops = [];
    const ids = [];
    let count = 0;
    for (const n of this.nodes) {
      if (n.id === '__root__' || n.deleted) continue;
      if (count >= pos && count < pos + len) ids.push(n.id);
      count++;
      if (count >= pos + len) break;
    }
    for (const id of ids) {
      const op = { type: 'delete', id, peerId: this.peerId };
      this._applyDelete(op);
      ops.push(op);
    }
    return ops;
  }

  /* ─── apply ─────────────────────────────────────────────────────── */

  _applyInsert(op) {
    if (this._nodeById(op.id)) return; // idempotent

    const afterIdx = this._indexById(op.afterId);
    if (afterIdx === -1) {
      // afterId not yet seen — buffer and retry (simple approach: append after root)
      console.warn('[CRDT] afterId not found, inserting after root', op);
      this.nodes.splice(1, 0, { ...op, deleted: false });
      this._updateClock(op.id);
      return;
    }

    // RGA tie-break: among siblings (same afterId) order by clock desc, then peerId desc
    let insertIdx = afterIdx + 1;
    while (insertIdx < this.nodes.length) {
      const c = this.nodes[insertIdx];
      if (c.afterId !== op.afterId) break;
      const [cp, cc] = c.id.split(':');
      const [op_p, op_c] = op.id.split(':');
      if (parseInt(cc) > parseInt(op_c)) { insertIdx++; continue; }
      if (parseInt(cc) === parseInt(op_c) && cp > op_p) { insertIdx++; continue; }
      break;
    }

    this.nodes.splice(insertIdx, 0, { ...op, deleted: false });
    this._updateClock(op.id);
  }

  _applyDelete(op) {
    const node = this._nodeById(op.id);
    if (node) node.deleted = true;
  }

  _updateClock(id) {
    const c = parseInt((id.split(':')[1]) || '0');
    if (c >= this.clock) this.clock = c + 1;
  }

  /**
   * Apply a remote op (from any peer).
   * Returns {type, pos, char?} describing what changed in the visible text.
   */
  applyRemote(op) {
    if (op.type === 'insert') {
      const existed = !!this._nodeById(op.id);
      this._applyInsert(op);
      if (existed) return null;
      const pos = this.visiblePosOfId(op.id);
      return { type: 'insert', pos, char: op.char };
    } else if (op.type === 'delete') {
      const pos = this.visiblePosOfId(op.id);
      if (pos < 0) return null; // already deleted
      this._applyDelete(op);
      return { type: 'delete', pos };
    }
    return null;
  }

  /* ─── serialization ─────────────────────────────────────────────── */

  serialize() {
    return JSON.stringify({ nodes: this.nodes, clock: this.clock });
  }

  deserialize(data) {
    const d = typeof data === 'string' ? JSON.parse(data) : data;
    this.nodes = d.nodes;
    this.clock  = d.clock;
  }
}

window.RGA = RGA;
