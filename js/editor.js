'use strict';

/**
 * PeerSync Collaborative Editor
 *
 * Wraps a <div contenteditable> and keeps it in sync with the RGA CRDT.
 *
 *  Local edit flow:
 *    keystroke → input event → diff(prev, current) → CRDT ops → sendOps
 *
 *  Remote edit flow:
 *    PeerManager 'op' event → crdt.applyRemote(op) → patch DOM → restore caret
 *
 * Architecture layer: DOM ← CollabEditor ← App
 */
class CollabEditor extends EventTarget {
  constructor(el, crdt, pm) {
    super();
    this.el   = el;
    this.crdt = crdt;
    this.pm   = pm;

    this._applying   = false;   // guard: don't re-dispatch during remote apply
    this._prevText   = '';
    this._cursorPos  = 0;
    this._remoteCursors = new Map(); // peerId → {el, pos}
    this._saveTimeout   = null;

    this._bind();
  }

  _emit(event, detail = {}) {
    this.dispatchEvent(new CustomEvent(event, { detail }));
  }

  /* ─── binding ───────────────────────────────────────────────────── */

  _bind() {
    // Local edits
    this.el.addEventListener('input', () => {
      if (this._applying) return;
      this._handleLocalInput();
    });

    // Cursor tracking (click, arrow keys, etc.)
    this.el.addEventListener('mouseup', () => this._broadcastCursor());
    this.el.addEventListener('keyup',   () => this._broadcastCursor());

    // Remote ops
    this.pm.addEventListener('op', e => {
      for (const op of (e.detail.ops || [])) {
        this._applyRemoteOp(op);
      }
    });

    // Remote cursors
    this.pm.addEventListener('cursor', e => {
      this._showRemoteCursor(e.detail.peerId, e.detail.pos);
    });

    this.pm.addEventListener('peer-left', e => {
      this._removeRemoteCursor(e.detail.peerId);
    });
  }

  /* ─── local input ───────────────────────────────────────────────── */

  _handleLocalInput() {
    const newText  = this._getText();
    const oldText  = this._prevText;
    if (newText === oldText) return;

    const caretPos = this._getCaretOffset();

    // Minimal diff: common prefix / suffix gives us the changed window
    let lo = 0;
    while (lo < oldText.length && lo < newText.length && oldText[lo] === newText[lo]) lo++;

    let oldHi = oldText.length;
    let newHi = newText.length;
    while (oldHi > lo && newHi > lo && oldText[oldHi - 1] === newText[newHi - 1]) {
      oldHi--; newHi--;
    }

    const allOps = [];

    // 1. Delete old[lo..oldHi)
    const delLen = oldHi - lo;
    if (delLen > 0) {
      allOps.push(...this.crdt.deleteAt(lo, delLen));
    }

    // 2. Insert new[lo..newHi)
    const ins = newText.slice(lo, newHi);
    if (ins.length > 0) {
      allOps.push(...this.crdt.insertAt(lo, ins));
    }

    this._prevText = newText;

    if (allOps.length > 0) {
      this.pm.sendOps(allOps);
    }

    this._emit('change', { text: newText, caretPos });
  }

  /* ─── remote apply ──────────────────────────────────────────────── */

  _applyRemoteOp(op) {
    this._applying = true;

    const savedCaret = this._getCaretOffset();
    const result     = this.crdt.applyRemote(op);

    if (result) {
      // Efficiently patch the DOM text node instead of replacing all innerHTML
      const newText = this.crdt.getText();
      if (this._getText() !== newText) {
        this._setText(newText);
        this._prevText = newText;

        // Adjust caret for remote change
        let newCaret = savedCaret;
        if (result.type === 'insert' && result.pos <= savedCaret) newCaret++;
        else if (result.type === 'delete' && result.pos < savedCaret)  newCaret = Math.max(0, newCaret - 1);

        this._setCaretOffset(newCaret);
      }
      this._emit('change', { text: newText });
    }

    this._applying = false;
  }

  /* ─── cursor ────────────────────────────────────────────────────── */

  _broadcastCursor() {
    const pos = this._getCaretOffset();
    this._cursorPos = pos;
    this.pm.sendCursor(pos);
  }

  _showRemoteCursor(peerId, pos) {
    // Emit up to app layer; visual overlay is handled by UIManager
    this._emit('remote-cursor', { peerId, pos });
  }

  _removeRemoteCursor(peerId) {
    this._emit('remote-cursor-remove', { peerId });
  }

  /* ─── DOM helpers ───────────────────────────────────────────────── */

  _getText() {
    // Use textContent for plain-text fidelity (ignores HTML tags)
    return this.el.innerText.replace(/\u00a0/g, ' ');
  }

  _setText(text) {
    // Preserve a single text node for simple caret math
    if (this.el.childNodes.length === 1 && this.el.childNodes[0].nodeType === Node.TEXT_NODE) {
      this.el.childNodes[0].data = text;
    } else {
      this.el.textContent = text;
    }
  }

  /**
   * Get the caret position as a character offset within the editor's
   * plain text (ignoring HTML tags).
   */
  _getCaretOffset() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return 0;

    const range = sel.getRangeAt(0);
    const pre   = range.cloneRange();
    pre.selectNodeContents(this.el);
    pre.setEnd(range.startContainer, range.startOffset);
    return pre.toString().length;
  }

  /**
   * Restore caret to a character offset within the editor.
   */
  _setCaretOffset(offset) {
    if (!document.activeElement || document.activeElement !== this.el) return;

    offset = Math.max(0, offset);
    const text = this._getText();
    offset = Math.min(offset, text.length);

    // Walk text nodes
    const walker = document.createTreeWalker(this.el, NodeFilter.SHOW_TEXT);
    let node, rem = offset;
    while ((node = walker.nextNode())) {
      if (rem <= node.textContent.length) {
        const range = document.createRange();
        range.setStart(node, rem);
        range.collapse(true);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }
      rem -= node.textContent.length;
    }

    // Fall back: end of editor
    const range = document.createRange();
    range.selectNodeContents(this.el);
    range.collapse(false);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
  }

  /* ─── public API ────────────────────────────────────────────────── */

  /** Overwrite editor content without generating ops (used on sync) */
  setContent(text) {
    this._applying = true;
    this._setText(text);
    this._prevText = text;
    this._applying = false;
  }

  getWordCount() {
    const t = this._getText().trim();
    return t ? t.split(/\s+/).length : 0;
  }

  getCharCount() {
    return this._getText().length;
  }

  focus() { this.el.focus(); }
}

window.CollabEditor = CollabEditor;
