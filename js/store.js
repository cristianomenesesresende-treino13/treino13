/* Treino 12 — persistência local.
   • IndexedDB (sem o limite de ~5 MB do localStorage → décadas de registros).
   • Escrita com debounce + gravação imediata ao sair/ocultar o app.
   • Pontos de restauração automáticos (1 por dia, últimos 7) para recuperar de erros.
   • Migração automática dos dados da versão 1 (localStorage).
   • Backup com criptografia opcional (AES-GCM 256 + PBKDF2) via Web Crypto. */
(function (root) {
'use strict';
const T12 = root.T12, U = T12.U;
const DB_NAME = 'treino12', KV = 'kv', SNAP = 'snapshots';
const LEGACY_KEY = 'treino12:data:v1', LS_KEY = 'treino12:data:v2';
const Store = T12.Store = { backend: 'idb', migratedFromV1: false };
let dbp = null;

function req2p(r) { return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
function openDB() {
  if (dbp) return dbp;
  dbp = new Promise(res => {
    try {
      if (!root.indexedDB) return res(null);
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains(KV)) db.createObjectStore(KV); if (!db.objectStoreNames.contains(SNAP)) db.createObjectStore(SNAP, { keyPath: 'id' }); };
      r.onsuccess = () => { const db = r.result; db.onversionchange = () => db.close(); res(db); };
      r.onerror = () => res(null); r.onblocked = () => res(null);
      setTimeout(() => res(null), 4000);
    } catch (e) { res(null); }
  });
  return dbp;
}
async function tx(store, mode, fn) {
  const db = await openDB(); if (!db) throw new Error('no-idb');
  return new Promise((res, rej) => {
    const t = db.transaction(store, mode), s = t.objectStore(store); let out;
    Promise.resolve(fn(s)).then(v => { out = v; });
    t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
  });
}
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
const lsDel = k => { try { localStorage.removeItem(k); } catch (e) {} };

Store.load = async function () {
  let raw = null;
  const db = await openDB();
  if (db) { try { raw = await tx(KV, 'readonly', s => req2p(s.get('state'))); } catch (e) { raw = null; } }
  else { Store.backend = 'ls'; const t = lsGet(LS_KEY); raw = t ? JSON.parse(t) : null; }
  if (!raw) {
    const legacy = lsGet(LEGACY_KEY);
    if (legacy) {
      try {
        const old = JSON.parse(legacy);
        raw = T12.M.upgrade(old);
        Store.migratedFromV1 = true;
        await Store.putSnapshot({ id: 'v1-migracao', label: 'Dados da versão 1 (antes da migração)', at: Date.now(), state: old });
        await Store.save(raw, true);
        lsDel(LEGACY_KEY);
      } catch (e) { console.error('Falha na migração v1', e); }
    }
  }
  return T12.M.upgrade(raw);
};

let timer = null, pending = null, writing = Promise.resolve();
/* Várias abas/janelas abertas: avisa as outras para recarregar e não sobrescreverem dados. */
let bc = null; try { bc = new BroadcastChannel('treino12'); bc.onmessage = ev => { if (ev.data === 'saved' && Store.onExternalChange) Store.onExternalChange(); }; } catch (e) {}
const notifyOthers = () => { try { bc && bc.postMessage('saved'); } catch (e) {} };
Store.save = function (state, now) {
  pending = state;
  clearTimeout(timer);
  const go = () => {
    const snap = pending; pending = null; if (!snap) return writing;
    writing = writing.then(async () => {
      if (Store.backend === 'idb') {
        try { await tx(KV, 'readwrite', s => { s.put(snap, 'state'); }); notifyOthers(); await Store.daily(snap); return; }
        catch (e) { Store.backend = 'ls'; }
      }
      if (!lsSet(LS_KEY, JSON.stringify(snap))) Store.onError && Store.onError('Não foi possível salvar. Faça um backup agora.');
    }).catch(e => Store.onError && Store.onError('Erro ao salvar: ' + (e && e.message)));
    return writing;
  };
  if (now) return go();
  timer = setTimeout(go, 300);
  return writing;
};
Store.flush = () => { if (pending) { clearTimeout(timer); return Store.save(pending, true); } return writing; };

/* pontos de restauração */
Store.putSnapshot = snap => tx(SNAP, 'readwrite', s => { s.put(snap); }).catch(() => {});
Store.listSnapshots = () => tx(SNAP, 'readonly', s => req2p(s.getAll())).then(a => (a || []).map(x => ({ id: x.id, label: x.label, at: x.at })).sort((a, b) => b.at - a.at)).catch(() => []);
Store.getSnapshot = id => tx(SNAP, 'readonly', s => req2p(s.get(id))).catch(() => null);
let lastDaily = '';
Store.clearSnapshots = () => tx(SNAP, 'readwrite', s => { s.clear(); }).then(() => { lastDaily = ''; }).catch(() => {});
Store.daily = async function (state, force) {
  const id = 'd-' + U.iso(new Date()); if (lastDaily === id && !force) return;
  lastDaily = id;
  try {
    const all = await Store.listSnapshots();
    if (force || !all.some(x => x.id === id)) await Store.putSnapshot({ id, label: 'Automático de ' + U.dmy(new Date()), at: Date.now(), state: JSON.parse(JSON.stringify(state)) });
    const daily = all.filter(x => x.id.startsWith('d-') && x.id !== id).sort((a, b) => b.at - a.at);
    for (const x of daily.slice(6)) await tx(SNAP, 'readwrite', s => { s.delete(x.id); });
  } catch (e) {}
};
/** Eliminação total (LGPD art. 18, VI): registros, pontos de restauração e cópias locais. */
Store.wipe = async function () {
  clearTimeout(timer); pending = null;
  try { await tx(KV, 'readwrite', s => { s.clear(); }); } catch (e) {}
  try { await tx(SNAP, 'readwrite', s => { s.clear(); }); } catch (e) {}
  lsDel(LS_KEY); lsDel(LEGACY_KEY);
};
Store.info = async function () {
  const o = { backend: Store.backend, persisted: null, usage: null, quota: null };
  try { if (navigator.storage) { if (navigator.storage.persisted) o.persisted = await navigator.storage.persisted(); if (navigator.storage.estimate) { const e = await navigator.storage.estimate(); o.usage = e.usage; o.quota = e.quota; } } } catch (e) {}
  return o;
};
Store.persist = async () => { try { return navigator.storage && navigator.storage.persist ? await navigator.storage.persist() : false; } catch (e) { return false; } };

/* criptografia do backup */
const C = T12.Crypto = {};
C.available = () => !!(root.crypto && root.crypto.subtle && root.isSecureContext !== false);
const b64 = buf => { let s = ''; const b = new Uint8Array(buf); for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function key(pass, salt, iter) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
C.encrypt = async function (obj, pass) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), iter = 310000;
  const k = await key(pass, salt, iter);
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(JSON.stringify(obj)));
  return { app: 'treino12', schema: T12.SCHEMA, encrypted: true, exportedAt: obj.exportedAt, alg: 'AES-GCM-256', kdf: { name: 'PBKDF2-SHA256', iter, salt: b64(salt) }, iv: b64(iv), data: b64(data) };
};
C.decrypt = async function (file, pass) {
  const k = await key(pass, unb64(file.kdf.salt), file.kdf.iter);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(file.iv) }, k, unb64(file.data));
  return JSON.parse(new TextDecoder().decode(plain));
};
})(typeof window !== 'undefined' ? window : globalThis);
