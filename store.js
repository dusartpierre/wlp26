// Couche de données : Firestore (partagé) ou mode démo (localStorage, local au téléphone).
import { firebaseConfig } from './config.js';

const FB = 'https://www.gstatic.com/firebasejs/11.10.0/';
export const DEMO = !firebaseConfig.apiKey || firebaseConfig.apiKey === 'A_REMPLIR';

let fs, db, auth, authMod;
const ME_KEY = 'wlp26:me';

// ---------- utilitaires localStorage sûrs ----------
const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn('localStorage', e); } },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

// ---------- MODE DÉMO ----------
const demoWatchers = {};
const demoRead = c => ls.get('wlp26demo:' + c, {});
const demoWrite = (c, m) => { ls.set('wlp26demo:' + c, m); (demoWatchers[c] || []).forEach(cb => cb(toArr(m))); };
const toArr = m => Object.entries(m).map(([id, d]) => ({ id, ...d }));
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ---------- API ----------
export async function init() {
  if (DEMO) return { member: ls.get(ME_KEY, null) };
  const [appMod, fsMod, aMod] = await Promise.all([
    import(FB + 'firebase-app.js'), import(FB + 'firebase-firestore.js'), import(FB + 'firebase-auth.js'),
  ]);
  fs = fsMod; authMod = aMod;
  const app = appMod.initializeApp(firebaseConfig);
  try {
    db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) });
  } catch { db = fs.getFirestore(app); }
  auth = aMod.getAuth(app);
  const user = await new Promise(res => { const u = aMod.onAuthStateChanged(auth, x => { u(); res(x); }); });
  if (!user) { ls.del(ME_KEY); return { member: null }; }
  try {
    const snap = await fs.getDoc(fs.doc(db, 'members', user.uid));
    if (snap.exists()) { const m = { name: snap.data().name, uid: user.uid }; ls.set(ME_KEY, m); return { member: m }; }
  } catch (e) {
    const cached = ls.get(ME_KEY, null);          // hors ligne : on fait confiance au cache
    if (cached && cached.uid === user.uid) return { member: cached };
  }
  return { member: null };
}

export async function join(name, code) {
  if (DEMO) { const m = { name, uid: 'demo-' + name }; ls.set(ME_KEY, m); return m; }
  const cred = auth.currentUser ? { user: auth.currentUser } : await authMod.signInAnonymously(auth);
  try {
    await fs.setDoc(fs.doc(db, 'members', cred.user.uid), { name, code, joinedAt: Date.now() });
  } catch (e) {
    throw new Error(e.code === 'permission-denied' ? 'Code club incorrect.' : 'Connexion impossible : ' + (e.message || e));
  }
  const m = { name, uid: cred.user.uid }; ls.set(ME_KEY, m); return m;
}

export async function leave() {
  ls.del(ME_KEY);
  if (!DEMO && auth) { try { await fs.deleteDoc(fs.doc(db, 'members', auth.currentUser.uid)); } catch {} await authMod.signOut(auth); }
}

export function watch(coll, cb, onErr) {
  if (DEMO) {
    (demoWatchers[coll] ||= []).push(cb); cb(toArr(demoRead(coll)));
    return () => { demoWatchers[coll] = demoWatchers[coll].filter(x => x !== cb); };
  }
  return fs.onSnapshot(fs.collection(db, coll), { includeMetadataChanges: false },
    s => cb(s.docs.map(d => ({ id: d.id, ...d.data(), _pending: d.metadata.hasPendingWrites }))),
    e => { console.error(coll, e); onErr && onErr(e); });
}

// Les écritures Firestore ne sont pas attendues (await) : elles partent dans la file
// hors ligne et se synchronisent dès que le réseau revient.
export function save(coll, id, data) {
  id ||= newId();
  if (DEMO) { const m = demoRead(coll); m[id] = { ...(m[id] || {}), ...data }; demoWrite(coll, m); return id; }
  fs.setDoc(fs.doc(db, coll, id), data, { merge: true }).catch(e => alertErr(e));
  return id;
}

export function remove(coll, id) {
  if (DEMO) { const m = demoRead(coll); delete m[id]; demoWrite(coll, m); return; }
  fs.deleteDoc(fs.doc(db, coll, id)).catch(e => alertErr(e));
}

export async function getPhoto(id) {
  if (DEMO) return demoRead('photos')[id]?.data || null;
  try { const s = await fs.getDoc(fs.doc(db, 'photos', id)); return s.exists() ? s.data().data : null; }
  catch { return null; }
}
export function putPhoto(id, data, author) { return save('photos', id, { data, author, at: Date.now() }); }
export function removePhoto(id) { remove('photos', id); }

function alertErr(e) {
  console.error(e);
  window.dispatchEvent(new CustomEvent('store-error', { detail: e.code === 'permission-denied' ? 'Action refusée (droits).' : (e.message || String(e)) }));
}

export { ls, newId };
