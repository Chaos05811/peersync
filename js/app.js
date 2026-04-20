'use strict';

/**
 * PeerSync — Main Bootstrap (app.js)
 *
 * Instantiates and wires all subsystems:
 *   UIManager ← CollabEditor ← RGA CRDT
 *                            ← PeerManager (WebRTC)
 *                            ← FileTransfer
 *
 * Routing: room ID lives in location.hash (#<peerId-of-host>)
 *   New doc  → host(myPeerId)  → hash = myPeerId
 *   Join     → join(roomId)   → hash = roomId
 */
(async () => {

  /* ─── 1. UI & modal setup ──────────────────────────────────────── */

  const ui = new UIManager();
  ui.init();

  const hashRoom = location.hash.slice(1).trim();
  if (hashRoom) {
    document.getElementById('room-input').value = hashRoom;
    ui.setModalStatus('Found room in URL — click Join or press Enter');
  }

  /* ─── 2. Peer init ──────────────────────────────────────────────── */

  const pm = new PeerManager();
  ui.setModalStatus('Connecting to peer network…');

  let peerId;
  try {
    peerId = await pm.init();
    ui.setModalStatus('Ready · peer connected');
  } catch (err) {
    ui.setModalStatus('⚠ Could not reach peer network. Check your connection.', 'error');
    console.error(err);
    return;
  }

  /* ─── 3. Module references (populated after startSession) ─────── */

  let crdt, editor, ft;
  let roomId = null;

  /* ─── 4. Session factory ─────────────────────────────────────────  */

  function startSession() {
    crdt = new RGA(pm.peerId);
    ft   = new FileTransfer(pm);
    _wireFileTransfer();
    _startEditor();
    _wireDocTitle();
    _wireToolbar();
    ui.showApp();
    ui.setRoomInfo(roomId);
    history.replaceState(null, '', '#' + roomId);
    ui.addRecentDoc(roomId, _docTitle());
    ui.updatePeerList(pm.getPeers());
    document.getElementById('editor').focus();
  }

  async function newDoc() {
    roomId = pm.peerId;
    pm.host(roomId);
    startSession();
  }

  async function joinRoom(code) {
    roomId = code;
    ui.setModalStatus('Connecting to room…');
    try {
      await pm.join(roomId);
      ui.setModalStatus('Joined — waiting for sync…');
      // startSession is called inside 'synced' handler below
    } catch (err) {
      ui.setModalStatus('⚠ ' + err.message, 'error');
      console.error(err);
    }
  }

  /* ─── 5. Peer Manager event handlers ────────────────────────────── */

  pm.addEventListener('need-sync', e => {
    // Host: send current CRDT state + peer list to the new connection
    e.detail.send({ crdtState: crdt.serialize() });
  });

  pm.addEventListener('synced', e => {
    const { data } = e.detail;
    if (!crdt) crdt = new RGA(pm.peerId);
    if (data.crdtState) crdt.deserialize(data.crdtState);

    if (!editor) {
      ft = new FileTransfer(pm);
      _wireFileTransfer();
      _startEditor();
      editor.setContent(crdt.getText());
      _wireDocTitle();
      _wireToolbar();
      ui.showApp();
      ui.setRoomInfo(roomId);
      history.replaceState(null, '', '#' + roomId);
      ui.addRecentDoc(roomId, _docTitle());
      document.getElementById('editor').focus();
    }
    ui.updatePeerList(pm.getPeers());
  });

  pm.addEventListener('peer-joined', () => ui.updatePeerList(pm.getPeers()));
  pm.addEventListener('peer-left',   () => ui.updatePeerList(pm.getPeers()));
  pm.addEventListener('latency',     () => ui.updatePeerList(pm.getPeers()));

  pm.addEventListener('host-disconnected', () => {
    ui.toast('Host disconnected — document is now local only', 'warn');
    document.getElementById('network-badge').classList.add('offline');
  });

  pm.addEventListener('error', e => {
    console.warn('[PeerManager error]', e.detail.error);
  });

  /* ─── 6. Editor & CRDT wiring ────────────────────────────────────  */

  function _startEditor() {
    const el = document.getElementById('editor');
    editor   = new CollabEditor(el, crdt, pm);

    editor.addEventListener('change', e => {
      ui.updateWordCount(editor.getWordCount());
      ui.updateCharCount(editor.getCharCount());
      ui.setSaveStatus('Saving…');

      clearTimeout(editor._saveTimer);
      editor._saveTimer = setTimeout(() => {
        try { localStorage.setItem('ps-doc-' + roomId, crdt.getText()); } catch {}
        ui.setSaveStatus('All changes saved');
      }, 800);
    });

    editor.addEventListener('remote-cursor', e => {
      // Could render cursor overlay here; for now just highlight peer row
    });
  }

  /* ─── 7. File transfer wiring ────────────────────────────────────  */

  function _wireFileTransfer() {
    ft.addEventListener('incoming', e => {
      const { meta } = e.detail;
      ui.toast(`Receiving ${meta.name} (${ui.formatBytes(meta.size)})`, 'info');
      ui.addTransfer(meta.id, meta.name, meta.size, 'receive');
    });

    ft.addEventListener('receive-progress', e => {
      ui.setTransferProgress(e.detail.fileId, e.detail.progress);
    });

    ft.addEventListener('receive-complete', e => {
      const { fileId, name, blob, valid } = e.detail;
      ui.completeTransfer(fileId, blob, name);
      ui.toast(valid ? `✓ ${name} received` : `⚠ ${name} — hash mismatch`, valid ? 'success' : 'warn');
    });

    ft.addEventListener('send-progress', e => {
      ui.setTransferProgress('out-' + e.detail.fileId, e.detail.progress);
    });

    ft.addEventListener('send-complete', e => {
      ui.completeTransfer('out-' + e.detail.fileId, null, e.detail.name);
      ui.toast(`✓ ${e.detail.name} sent`, 'success');
    });

    document.getElementById('file-input').addEventListener('change', async ev => {
      for (const file of ev.target.files) {
        const outId = 'out-' + Date.now();
        ui.addTransfer(outId, file.name, file.size, 'send');
        const fid = await ft.sendFile(file);
        // Re-map progress events to the sidebar entry
        const ofill = document.getElementById(`ftf-${CSS.escape(outId)}`);
      }
      ev.target.value = '';
    });
  }

  /* ─── 8. Document title ──────────────────────────────────────────  */

  function _wireDocTitle() {
    const titleEl = document.getElementById('doc-title');
    titleEl.addEventListener('input', () => {
      document.title = titleEl.textContent.trim() + ' — PeerSync';
    });
    titleEl.addEventListener('blur', () => {
      if (!titleEl.textContent.trim()) titleEl.textContent = 'Untitled document';
      ui.addRecentDoc(roomId, _docTitle());
    });
  }

  function _docTitle() {
    return document.getElementById('doc-title').textContent.trim() || 'Untitled document';
  }

  /* ─── 9. Toolbar ─────────────────────────────────────────────────  */

  function _wireToolbar() {
    document.querySelectorAll('.tool-btn[data-cmd]').forEach(btn => {
      btn.addEventListener('mousedown', e => {
        e.preventDefault(); // don't blur editor
        document.execCommand(btn.dataset.cmd, false, null);
        btn.classList.toggle('active', document.queryCommandState(btn.dataset.cmd));
      });
    });

    document.getElementById('editor').addEventListener('keyup', () => {
      document.querySelectorAll('.tool-btn[data-cmd]').forEach(btn => {
        btn.classList.toggle('active', document.queryCommandState(btn.dataset.cmd));
      });
    });

    document.getElementById('btn-attach').addEventListener('click', () => {
      document.getElementById('file-input').click();
    });

    document.getElementById('font-family').addEventListener('change', e => {
      document.execCommand('fontName', false, e.target.value);
    });
  }

  /* ─── 10. Modal button listeners ─────────────────────────────────  */

  document.getElementById('btn-new').addEventListener('click', newDoc);

  document.getElementById('btn-join').addEventListener('click', () => {
    const code = document.getElementById('room-input').value.trim();
    if (code) joinRoom(code);
  });

  document.getElementById('room-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const code = e.target.value.trim();
      if (code) joinRoom(code);
    }
  });

  /* ─── Share modal ─────────────────────────────────────────────────*/

  document.getElementById('btn-share').addEventListener('click', () => {
    document.getElementById('share-modal').classList.remove('hidden');
  });

  document.getElementById('share-close').addEventListener('click', () => {
    document.getElementById('share-modal').classList.add('hidden');
  });

  document.getElementById('share-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
  });

  document.getElementById('btn-copy-code').addEventListener('click', () => {
    const code = document.getElementById('share-room-code').textContent;
    navigator.clipboard.writeText(code).then(() => ui.toast('Room code copied!', 'success'));
  });

  document.getElementById('btn-copy-url').addEventListener('click', () => {
    const url = document.getElementById('share-url').textContent;
    navigator.clipboard.writeText(url).then(() => ui.toast('URL copied!', 'success'));
  });

  document.getElementById('btn-copy-room').addEventListener('click', () => {
    const code = document.getElementById('share-room-code').textContent;
    navigator.clipboard.writeText(code).then(() => ui.toast('Room code copied!', 'success'));
  });

  /* ─── 11. Auto-join from URL hash ───────────────────────────────── */

  if (hashRoom) {
    setTimeout(() => joinRoom(hashRoom), 400);
  }

})();
