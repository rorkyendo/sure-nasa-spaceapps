/* SURE shared history — GitHub repo file as a tiny NoSQL store.
   Reads: same-origin GET of data/db/analyses.json (public, no auth).
   Writes: GitHub Contents API PUT, needs a user-supplied token with
   contents:write on this repo. Token stays in this browser only. */
window.SUREDB = (() => {
  const REPO = 'rorkyendo/sure-nasa-spaceapps';
  const PATH = 'data/db/analyses.json';
  const TKEY = 'sure_gh_token_v1';
  const API = `https://api.github.com/repos/${REPO}/contents/${PATH}`;

  const token = () => { try { return localStorage.getItem(TKEY) || ''; } catch (e) { return ''; } };
  const setToken = t => { try { t ? localStorage.setItem(TKEY, t) : localStorage.removeItem(TKEY); } catch (e) {} };
  const enabled = () => !!token();

  const b64encode = obj => {
    const bytes = new TextEncoder().encode(JSON.stringify(obj, null, 2) + '\n');
    let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin);
  };
  const b64decode = s => {
    const bin = atob(s.replace(/\n/g, ''));
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  };

  /* Remote file -> {items, sha}. items=[] when file missing/empty. */
  async function readRemote() {
    const r = await fetch(PATH + '?ts=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('read ' + r.status);
    const items = await r.json();
    let sha = null;
    if (enabled()) {
      const g = await fetch(API, { headers: { Authorization: 'Bearer ' + token(), Accept: 'application/vnd.github+json' } });
      if (g.ok) sha = (await g.json()).sha;
    }
    return { items: Array.isArray(items) ? items : [], sha };
  }

  const merge = (a, b) => {
    const m = new Map();
    [...(a || []), ...(b || [])].forEach(x => { if (x && x.id != null) m.set(x.id, x); });
    return [...m.values()].sort((x, y) => (y.at || '').localeCompare(x.at || '')).slice(0, 50);
  };

  /* Fetch shared items. Caller merges them into its fresh local list. */
  async function pull() {
    const { items } = await readRemote();
    return items;
  }

  /* Write the list back to the repo. Merges with remote unless opts.replace
     (used for deletes/clear so removed ids stay removed). One sha retry. */
  async function push(local, message, opts) {
    if (!enabled()) throw new Error('no token');
    for (let attempt = 0; attempt < 2; attempt++) {
      const g = await fetch(API, { headers: { Authorization: 'Bearer ' + token(), Accept: 'application/vnd.github+json' } });
      if (!g.ok) throw new Error('auth ' + g.status);
      const meta = await g.json();
      let remote = [];
      try { remote = b64decode(meta.content); } catch (e) {}
      const items = opts && opts.replace ? (local || []).slice(0, 50) : merge(local, remote);
      const put = await fetch(API, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + token(), Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message || 'chore(db): update analyses', content: b64encode(items), sha: meta.sha })
      });
      if (put.ok) return items;
      if (put.status !== 409) throw new Error('write ' + put.status);
    }
    throw new Error('conflict');
  }

  async function test() {
    const r = await fetch(API, { headers: { Authorization: 'Bearer ' + token(), Accept: 'application/vnd.github+json' } });
    if (r.status === 404) return 'connected (file will be created on first save)';
    if (r.ok) return 'connected';
    throw new Error(r.status === 401 ? 'token rejected' : 'github ' + r.status);
  }

  /* --- connect UI --- */
  const $id = s => document.getElementById(s);
  function paintBtn() { const b = $id('dbbtn'); if (b) b.textContent = 'DB: ' + (enabled() ? 'shared' : 'local'); }
  function stat(t, bad) { const e = $id('dbstat'); if (e) { e.textContent = t; e.style.color = bad ? '#ff9aa6' : ''; } }
  async function refreshStat() {
    if (!enabled()) { stat('Mode: history is kept in this browser only.'); paintBtn(); return; }
    stat('Checking token…');
    try { stat('Shared mode: ' + await test() + '. Saves go to the repo file.'); } catch (e) { stat('Token problem: ' + e.message, true); }
    paintBtn();
  }
  /* --- Meteomatics login (rain radar overlay) --- */
  const MMKEY = 'sure_mm_auth_v1';
  const mmGet = () => { try { return localStorage.getItem(MMKEY) || ''; } catch (e) { return ''; } };
  const mmSet = v => { try { v ? localStorage.setItem(MMKEY, v) : localStorage.removeItem(MMKEY); } catch (e) {} };
  function mmStat() {
    const e = $id('mmstat'); if (!e) return;
    e.textContent = mmGet()
      ? 'Login saved — live precipitation overlay is on.'
      : 'No login — the rain radar overlay stays off. The base satellite map and forecast still work.';
  }

  function wire() {
    const mb = $id('dbmodal'), bb = $id('dbbtn'), tk = $id('dbtok');
    if (bb) bb.addEventListener('click', () => { refreshStat(); mmStat(); mb.classList.add('on'); });
    if ($id('dbclose')) $id('dbclose').addEventListener('click', () => mb.classList.remove('on'));
    if (mb) mb.addEventListener('click', e => { if (e.target === mb) mb.classList.remove('on'); });
    if ($id('dbsave')) $id('dbsave').addEventListener('click', () => {
      const v = (tk.value || '').trim();
      if (!v) { stat('Paste a token first.', true); return; }
      setToken(v); tk.value = ''; refreshStat();
    });
    if ($id('dboff')) $id('dboff').addEventListener('click', () => { setToken(''); refreshStat(); });
    const mk = $id('mmtok');
    if ($id('mmsave')) $id('mmsave').addEventListener('click', () => {
      const v = (mk.value || '').trim();
      if (!v || v.indexOf(':') < 0) { const e = $id('mmstat'); if (e) e.textContent = 'Paste as user:password.'; return; }
      mmSet(v); mk.value = ''; mmStat(); if (window.SUREMMCHANGE) window.SUREMMCHANGE();
    });
    if ($id('mmoff')) $id('mmoff').addEventListener('click', () => { mmSet(''); mmStat(); if (window.SUREMMCHANGE) window.SUREMMCHANGE(); });
    paintBtn();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();

  return { REPO, PATH, enabled, token, setToken, merge, pull, push, test };
})();
export {};
