import { MEMBERS, EVENT } from './config.js';
import { ZONES, STANDS, STAND_BY_ID, ZONE_BY_ID } from './stands.js';
import * as store from './store.js';

// ============ état ============
const S = { me: null, drams: [], moments: [], wish: {}, members: [], filters: { q: '', zone: '', mode: 'all' }, feedWho: '', clubTab: 'feed', unsub: [] };
const TAGS = ['Fruité', 'Tourbé', 'Fumé', 'Sherry', 'Boisé', 'Vanillé', 'Épicé', 'Floral', 'Maritime', 'Agrumes', 'Miel', 'Chocolat', 'Herbacé', 'Cask strength', 'Rhum agricole', 'Coup de cœur'];
const COLORS = ['#f0a93b', '#6fc3d3', '#e99bb3', '#9be07a', '#c9a0ff', '#ff8a65', '#4dd0e1', '#ffd54f'];
const $ = (s, r = document) => r.querySelector(s);
const app = $('#app');

// ============ utilitaires ============
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const imgSrc = s => (typeof s === 'string' && s.startsWith('data:image/')) ? s : '';
const colorOf = name => { const i = MEMBERS.indexOf(name); return COLORS[(i >= 0 ? i : [...String(name)].reduce((a, c) => a + c.charCodeAt(0), 0)) % COLORS.length]; };
const avatar = (name, px) => `<span class="avatar" style="background:${colorOf(name)}${px ? `;width:${px}px;height:${px}px;font-size:${Math.round(px / 2)}px` : ''}" title="${esc(name)}">${esc((name || '?')[0].toUpperCase())}</span>`;
const scoreCls = s => s >= 90 ? 's4' : s >= 85 ? 's3' : s >= 80 ? 's2' : s >= 70 ? 's1' : 's0';
const scoreTag = s => (s || s === 0) ? `<span class="score ${scoreCls(s)}">${s}</span>` : '';
const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length * 10) / 10 : null;
const fmtTime = t => t ? new Date(t).toLocaleString('fr-FR', { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : '';
const bottleKey = d => (d.standId || '') + '|' + norm(d.bottle);
const standOf = d => STAND_BY_ID[d.standId] || (d.standName ? { id: '', num: '?', name: d.standName, color: '#888', zoneName: '' } : { id: '', num: '—', name: 'Hors stand', color: '#888', zoneName: '' });
const numBadge = (s, mini) => `<span class="num" style="background:${s.color}${mini ? ';display:inline-grid;min-width:30px;height:20px;font-size:11px;vertical-align:1px' : ''}">${esc(s.num)}</span>`;
const myWish = () => new Set(S.wish[S.me?.name]?.stands || []);

function toast(msg, ms = 2400) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.append(t);
  setTimeout(() => t.remove(), ms);
}
window.addEventListener('store-error', e => toast('⚠️ ' + e.detail, 4000));

function sheet(html, onMount) {
  const bg = document.createElement('div'); bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet">${html}</div>`;
  bg.addEventListener('click', e => { if (e.target === bg) bg.remove(); });
  document.body.append(bg); onMount && onMount(bg.firstElementChild, () => bg.remove());
  return bg;
}

// Compression d'image côté téléphone -> dataURL JPEG
async function compress(file, max, maxChars, q = 0.8) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    let scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    for (let k = 0; k < 8; k++) {
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const out = c.toDataURL('image/jpeg', q);
      if (out.length <= maxChars) return out;
      if (q > 0.5) q -= 0.1; else scale *= 0.8;
    }
    throw new Error('Image trop lourde');
  } finally { URL.revokeObjectURL(url); }
}
async function photoPair(file) {
  return { full: await compress(file, 1400, 900_000, 0.8), thumb: await compress(file, 320, 40_000, 0.65) };
}

// ============ démarrage ============
async function boot() {
  app.innerHTML = `<div class="empty"><div class="e">🥃</div>Chargement…</div>`;
  let r;
  try { r = await store.init(); }
  catch (e) { app.innerHTML = `<div class="login"><h1>Oups</h1><p>Impossible de charger Firebase (${esc(e.message)}). Vérifiez la connexion et <code>config.js</code>.</p><button class="btn primary" onclick="location.reload()">Réessayer</button></div>`; return; }
  if (r.member) start(r.member); else loginView();
}

function loginView() {
  document.body.classList.add('logged-out');
  $('nav.bottom').classList.add('hidden'); $('header.top').classList.add('hidden');
  let who = '';
  app.innerHTML = `<div class="login">
    <div class="big">WLP <b>26</b></div>
    <p class="muted">Carnet de dégustation du club · ${esc(EVENT.name)}</p>
    <label class="f">Qui êtes-vous ?</label>
    <div class="who">${MEMBERS.map(m => `<button data-m="${esc(m)}">${avatar(m)}${esc(m)}</button>`).join('')}</div>
    <label class="f" for="code">Code club</label>
    <input id="code" class="in" type="password" autocomplete="current-password" placeholder="${store.DEMO ? 'Mode démo : n’importe quel code' : 'Le code partagé du club'}">
    <button id="go" class="btn primary block" style="margin-top:14px" disabled>Entrer</button>
    <p id="err" class="small" style="color:var(--red)"></p>
    ${store.DEMO ? '<p class="small muted"><span class="demo-badge">DÉMO</span> Firebase n’est pas configuré : les données restent sur ce téléphone.</p>' : ''}
  </div>`;
  const go = $('#go'), code = $('#code');
  const upd = () => go.disabled = !(who && code.value.trim());
  app.querySelectorAll('.who button').forEach(b => b.onclick = () => { who = b.dataset.m; app.querySelectorAll('.who button').forEach(x => x.classList.toggle('on', x === b)); upd(); code.focus(); });
  code.oninput = upd;
  code.onkeydown = e => { if (e.key === 'Enter' && !go.disabled) go.click(); };
  go.onclick = async () => {
    go.disabled = true; go.textContent = 'Connexion…'; $('#err').textContent = '';
    try { start(await store.join(who, code.value.trim())); }
    catch (e) { $('#err').textContent = e.message; go.textContent = 'Entrer'; upd(); }
  };
}

function start(me) {
  S.me = me;
  $('nav.bottom').classList.remove('hidden'); $('header.top').classList.remove('hidden');
  $('#meBtn').innerHTML = `${avatar(me.name)}<span>${esc(me.name)}</span>${store.DEMO ? ' <span class="demo-badge">DÉMO</span>' : ''}`;
  S.unsub.forEach(u => u());
  const onErr = e => { if (e.code === 'permission-denied') { toast('Accès refusé : reconnectez-vous.', 4000); } };
  S.unsub = [
    store.watch('drams', d => { S.drams = d.sort((a, b) => (b.at || 0) - (a.at || 0)); rerender(); }, onErr),
    store.watch('moments', d => { S.moments = d.sort((a, b) => (b.at || 0) - (a.at || 0)); rerender(); }, onErr),
    store.watch('wishlists', d => { S.wish = Object.fromEntries(d.map(x => [x.id, x])); rerender(); }, onErr),
  ];
  syncBadge();
  route();
}

$('#meBtn').onclick = () => sheet(`
  <div class="row">${avatar(S.me.name)}<b class="grow">${esc(S.me.name)}</b></div>
  <p class="small muted">${store.DEMO ? 'Mode démo : données locales à ce téléphone.' : 'Connecté au carnet partagé du club.'} ${S.drams.filter(d => d.author === S.me.name).length} drams notés.</p>
  <div class="stack">
    <button class="btn block" id="exCsv">⬇️ Exporter toutes les notes (CSV)</button>
    <button class="btn block" id="exJson">💾 Sauvegarde complète (JSON)</button>
    <button class="btn block ghost" id="logout">Changer de membre / se déconnecter</button>
  </div>`, (el, close) => {
  $('#exCsv', el).onclick = () => { exportCsv(); close(); };
  $('#exJson', el).onclick = () => { exportJson(); close(); };
  $('#logout', el).onclick = async () => { close(); S.unsub.forEach(u => u()); await store.leave(); location.hash = ''; loginView(); };
});

function syncBadge() {
  const el = $('#sync');
  const upd = () => {
    const pending = S.drams.filter(d => d._pending).length + S.moments.filter(d => d._pending).length;
    el.textContent = !navigator.onLine ? '📴 hors ligne' + (pending ? ` · ${pending} en attente` : '') : pending ? `⏳ ${pending} en envoi` : '';
  };
  window.addEventListener('online', upd); window.addEventListener('offline', upd);
  S._syncUpd = upd; upd();
}

// ============ routage ============
let renderTimer;
function rerender() { clearTimeout(renderTimer); renderTimer = setTimeout(() => { S._syncUpd && S._syncUpd(); if (!document.querySelector('.editing')) route(true); }, 60); }
window.addEventListener('hashchange', () => route());

function route(soft) {
  if (!S.me) return;
  const [path, qs] = (location.hash.slice(1) || 'stands').split('?');
  const [view, arg] = path.split('/');
  const q = new URLSearchParams(qs || '');
  document.querySelectorAll('nav.bottom a').forEach(a => a.classList.toggle('on', a.dataset.v === view));
  const y = window.scrollY;
  document.body.classList.toggle('on-plan', view === 'plan');
  const views = { stands: vStands, stand: vStand, plan: vPlan, club: vClub, souvenirs: vSouvenirs, dram: vDram, new: vEdit, edit: vEdit };
  if (soft && view === 'plan') return;          // ne pas réinitialiser le zoom
  (views[view] || vStands)(decodeURIComponent(arg || ''), q);
  if (soft) window.scrollTo(0, y); else window.scrollTo(0, 0);
}

// ============ vue : STANDS ============
function vStands() {
  const f = S.filters, wish = myWish();
  const byStand = {};
  S.drams.forEach(d => (byStand[d.standId] ||= []).push(d));
  const visitedByMe = new Set(S.drams.filter(d => d.author === S.me.name).map(d => d.standId));
  const wishers = {};
  Object.entries(S.wish).forEach(([n, w]) => (w.stands || []).forEach(id => (wishers[id] ||= []).push(n)));
  const qn = norm(f.q);
  const list = STANDS.filter(s =>
    (!f.zone || s.zone === f.zone) &&
    (!qn || norm(s.name + ' ' + s.num + ' ' + s.zoneName + ' ' + s.sub).includes(qn) || (byStand[s.id] || []).some(d => norm(d.bottle).includes(qn))) &&
    (f.mode === 'all' || (f.mode === 'wish' && wish.has(s.id)) || (f.mode === 'club' && byStand[s.id]) || (f.mode === 'todo' && !visitedByMe.has(s.id)))
  );
  let html = `<input class="search" id="q" type="search" placeholder="🔎 Stand, numéro, bouteille…" value="${esc(f.q)}">
    <div class="chips">
      ${[['all', 'Tous'], ['wish', `⭐ Ma liste (${wish.size})`], ['club', '🥃 Dégustés par le club'], ['todo', 'Pas encore visités']].map(([k, l]) => `<button class="chip ${f.mode === k ? 'on' : ''}" data-mode="${k}">${l}</button>`).join('')}
    </div>
    <div class="chips" style="padding-top:2px">
      <button class="chip ${!f.zone ? 'on' : ''}" data-zone="">Toutes zones</button>
      ${ZONES.map(z => `<button class="chip ${f.zone === z.id ? 'on' : ''}" data-zone="${z.id}"><span class="dot" style="background:${z.color}"></span>${esc(z.name.split(' (')[0])}</button>`).join('')}
    </div>`;
  if (!list.length) html += `<div class="empty"><div class="e">🤷</div>Aucun stand ne correspond.</div>`;
  let lastZone = '', lastSub = '';
  for (const s of list) {
    if (s.zone !== lastZone) { html += `<div class="zone-h"><i style="background:${s.color}"></i>${esc(s.zoneName)}</div>`; lastZone = s.zone; lastSub = ''; }
    if (s.sub && s.sub !== lastSub) { html += `<div class="small muted" style="margin:8px 0 0 4px">${esc(s.sub)}</div>`; lastSub = s.sub; }
    const ds = byStand[s.id] || [];
    const tasters = [...new Set(ds.map(d => d.author))];
    const a = avg(ds.map(d => d.score).filter(x => x != null));
    html += `<div class="stand ${visitedByMe.has(s.id) ? 'visited' : ''}" data-id="${s.id}">
      ${numBadge(s)}
      <div class="grow"><div class="name">${esc(s.name)}</div>${ds.length ? `<div class="sub">${ds.length} dram${ds.length > 1 ? 's' : ''} noté${ds.length > 1 ? 's' : ''}</div>` : ''}</div>
      ${(wishers[s.id] || []).length ? `<div class="dots">${wishers[s.id].filter(n => n !== S.me.name).map(n => avatar(n)).join('')}</div>` : ''}
      ${tasters.length ? `<div class="dots" title="Dégusté par">${tasters.map(n => avatar(n)).join('')}</div>` : ''}
      ${a != null ? scoreTag(Math.round(a)) : ''}
      <button class="star ${wish.has(s.id) ? 'on' : ''}" data-star="${s.id}" aria-label="À voir">★</button>
    </div>`;
  }
  app.innerHTML = html;
  const q = $('#q');
  q.oninput = () => { f.q = q.value; const pos = q.selectionStart; vStands(); const nq = $('#q'); nq.focus(); nq.setSelectionRange(pos, pos); };
  app.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { f.mode = b.dataset.mode; vStands(); });
  app.querySelectorAll('[data-zone]').forEach(b => b.onclick = () => { f.zone = b.dataset.zone; vStands(); });
  app.querySelectorAll('[data-star]').forEach(b => b.onclick = e => { e.stopPropagation(); toggleWish(b.dataset.star); });
  app.querySelectorAll('.stand').forEach(el => el.onclick = () => location.hash = 'stand/' + el.dataset.id);
}

function toggleWish(id) {
  const w = myWish(); w.has(id) ? w.delete(id) : w.add(id);
  S.wish[S.me.name] = { ...(S.wish[S.me.name] || {}), stands: [...w] };
  store.save('wishlists', S.me.name, { stands: [...w], at: Date.now() });
  rerender();
}

// ============ vue : STAND ============
function vStand(id) {
  const s = STAND_BY_ID[id]; if (!s) return vStands();
  const ds = S.drams.filter(d => d.standId === id);
  const groups = {};
  ds.forEach(d => (groups[bottleKey(d)] ||= []).push(d));
  const wish = myWish();
  const wishers = Object.entries(S.wish).filter(([, w]) => (w.stands || []).includes(id)).map(([n]) => n);
  app.innerHTML = `
    <a href="#stands" class="small">‹ Stands</a>
    <div class="row" style="margin:10px 0">${numBadge(s)}<div class="grow"><h1 style="margin:0">${esc(s.name)}</h1><div class="small muted">${esc(s.zoneName)}${s.sub ? ' · ' + esc(s.sub) : ''}</div></div></div>
    <div class="grid2">
      <a class="btn primary" href="#new?stand=${encodeURIComponent(id)}">🥃 Noter un dram ici</a>
      <button class="btn" id="wishBtn">${wish.has(id) ? '★ Dans ma liste' : '☆ À visiter'}</button>
    </div>
    ${wishers.length ? `<p class="small muted row" style="margin-top:10px">Veulent y passer : <span class="dots" style="margin-left:6px">${wishers.map(n => avatar(n)).join('')}</span></p>` : ''}
    <h2>Dégustations du club (${ds.length})</h2>
    ${Object.values(groups).map(g => {
      const a = avg(g.map(d => d.score).filter(x => x != null));
      return `<div class="card" style="margin-bottom:10px">
        <div class="row"><b class="grow">${esc(g[0].bottle)}</b>${a != null ? scoreTag(Math.round(a)) : ''}</div>
        ${g.map(d => `<div class="row" style="margin-top:8px;cursor:pointer" data-dram="${d.id}">${avatar(d.author)}<span class="grow small">${esc(d.author)}${d.fav ? ' ❤️' : ''}${d.rebuy ? ' 🛒' : ''} <span class="muted">${esc((d.comment || '').slice(0, 60))}</span></span>${scoreTag(d.score)}</div>`).join('')}
        ${g.some(d => d.author === S.me.name) ? '' : `<a class="btn sm" style="margin-top:10px" href="#new?from=${g[0].id}">+ Je le goûte aussi</a>`}
      </div>`;
    }).join('') || `<div class="empty"><div class="e">🥃</div>Personne n’a encore noté de dram ici.</div>`}`;
  $('#wishBtn').onclick = () => toggleWish(id);
  app.querySelectorAll('[data-dram]').forEach(el => el.onclick = () => location.hash = 'dram/' + el.dataset.dram);
}

// ============ vue : DRAM ============
function vDram(id) {
  const d = S.drams.find(x => x.id === id);
  if (!d) { app.innerHTML = `<div class="empty"><div class="e">🫗</div>Dram introuvable.<br><a href="#club">Retour</a></div>`; return; }
  const s = standOf(d), mine = d.author === S.me.name;
  const others = S.drams.filter(x => x.id !== d.id && bottleKey(x) === bottleKey(d));
  app.innerHTML = `
    <a href="${s.id ? '#stand/' + s.id : '#club'}" class="small">‹ ${esc(s.name)}</a>
    ${d.hasPhoto || d.thumb ? `<div class="hero"><img id="heroImg" src="${imgSrc(d.thumb)}" alt=""></div>` : ''}
    <div class="row" style="margin-top:8px"><div class="grow"><h1 style="margin:0">${esc(d.bottle)}</h1>
      <div class="small muted">${numBadge(s, true)} ${esc(s.name)}</div></div>
      <div class="bigscore" style="font-size:40px">${d.score ?? '–'}<div class="small muted" style="font-size:11px;font-weight:600">/100</div></div></div>
    <div class="row" style="margin:10px 0">${avatar(d.author)}<span class="grow small">${esc(d.author)} · ${fmtTime(d.at)}</span>${d.fav ? '❤️' : ''}${d.rebuy ? ' 🛒' : ''}</div>
    <dl class="kv card">
      ${[['Âge', d.age], ['Degré', d.abv ? d.abv + ' %' : ''], ['Fût', d.cask], ['Prix', d.price ? d.price + ' €' : '']].filter(x => x[1]).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('') || '<dt>—</dt><dd class="muted">Pas de détails</dd>'}
    </dl>
    ${(d.tags || []).length ? `<div style="margin-top:10px">${d.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
    <div class="note-block">
      ${[['Nez', d.nose], ['Bouche', d.palate], ['Finale', d.finish], ['Commentaire', d.comment]].filter(x => x[1]).map(([k, v]) => `<h3>${k}</h3><p>${esc(v)}</p>`).join('')}
    </div>
    ${others.length ? `<h2>Les autres membres</h2>${others.map(dramRow).join('')}` : ''}
    <div class="grid2" style="margin-top:18px">
      ${mine ? `<a class="btn" href="#edit/${d.id}">✏️ Modifier</a><button class="btn" id="del">🗑 Supprimer</button>`
             : others.some(o => o.author === S.me.name) ? '' : `<a class="btn primary" href="#new?from=${d.id}" style="grid-column:span 2">🥃 Je le goûte aussi</a>`}
    </div>`;
  if (d.hasPhoto) store.getPhoto(d.id).then(p => { const i = $('#heroImg'); if (i && imgSrc(p)) i.src = p; });
  bindDramRows();
  const del = $('#del');
  if (del) del.onclick = () => { if (confirm('Supprimer ce dram ?')) { store.remove('drams', d.id); if (d.hasPhoto) store.removePhoto(d.id); location.hash = s.id ? 'stand/' + s.id : 'club'; toast('Supprimé'); } };
}

function dramRow(d) {
  const s = standOf(d);
  return `<div class="dram" data-dram="${d.id}">
    ${imgSrc(d.thumb) ? `<img class="thumb" src="${imgSrc(d.thumb)}" alt="" loading="lazy">` : `<div class="thumb">🥃</div>`}
    <div class="grow"><div class="t">${esc(d.bottle)}${d.fav ? ' ❤️' : ''}${d.rebuy ? ' 🛒' : ''}</div>
      <div class="m">#${esc(s.num)} ${esc(s.name)}</div>
      <div class="m row" style="gap:5px;margin-top:3px">${avatar(d.author, 18)}${esc(d.author)} · ${fmtTime(d.at)}${d._pending ? ' · ⏳' : ''}</div></div>
    ${scoreTag(d.score)}
  </div>`;
}
function bindDramRows() { app.querySelectorAll('.dram[data-dram]').forEach(el => el.onclick = () => location.hash = 'dram/' + el.dataset.dram); }

// ============ vue : ÉDITION / NOUVEAU ============
function vEdit(id, q) {
  const existing = id ? S.drams.find(x => x.id === id) : null;
  if (id && (!existing || existing.author !== S.me.name)) return vDram(id);
  const from = q.get('from') ? S.drams.find(x => x.id === q.get('from')) : null;
  const d = existing || { standId: q.get('stand') || from?.standId || '', bottle: from?.bottle || '', age: from?.age || '', abv: from?.abv || '', cask: from?.cask || '', price: from?.price || '', score: 80, tags: [], fav: false, rebuy: false };
  let photo = null, thumb = d.thumb || null, removePhoto = false;
  const tags = new Set(d.tags || []);
  app.innerHTML = `<div class="editing">
    <a href="javascript:history.back()" class="small">‹ Annuler</a>
    <h1>${existing ? 'Modifier le dram' : 'Nouveau dram'}</h1>
    <label class="f">Stand</label>
    <select class="in" id="stand">
      <option value="">— Hors stand / autre —</option>
      ${ZONES.map(z => `<optgroup label="${esc(z.name)}">${STANDS.filter(s => s.zone === z.id).map(s => `<option value="${s.id}" ${s.id === d.standId ? 'selected' : ''}>${esc(s.num)} · ${esc(s.name)}</option>`).join('')}</optgroup>`).join('')}
    </select>
    <label class="f">Bouteille / dram *</label>
    <input class="in" id="bottle" placeholder="ex. Ardbeg Uigeadail, Chichibu The First Ten…" value="${esc(d.bottle)}" autocomplete="off" list="bottles">
    <datalist id="bottles"></datalist>
    <div class="grid3">
      <div><label class="f">Âge</label><input class="in" id="age" value="${esc(d.age)}" placeholder="12 ans"></div>
      <div><label class="f">Degré %</label><input class="in" id="abv" inputmode="decimal" value="${esc(d.abv)}" placeholder="46"></div>
      <div><label class="f">Prix €</label><input class="in" id="price" inputmode="decimal" value="${esc(d.price)}" placeholder="75"></div>
    </div>
    <label class="f">Fût / finition</label>
    <input class="in" id="cask" value="${esc(d.cask)}" placeholder="Sherry oloroso, ex-bourbon…">

    <label class="f">Note</label>
    <div class="card"><div class="bigscore" id="sv">${d.score ?? 80}</div>
      <input type="range" id="score" min="50" max="100" step="1" value="${d.score ?? 80}">
      <div class="row small muted" style="justify-content:space-between"><span>50 bof</span><span>75 correct</span><span>85 très bon</span><span>95 ✨</span></div>
    </div>

    <label class="f">Profil</label>
    <div>${TAGS.map(t => `<button type="button" class="chip ${tags.has(t) ? 'on' : ''}" data-tag="${esc(t)}" style="margin:0 4px 6px 0">${esc(t)}</button>`).join('')}</div>

    <div class="grid2" style="margin-top:8px">
      <label class="toggle"><input type="checkbox" id="fav" ${d.fav ? 'checked' : ''}>❤️ Coup de cœur</label>
      <label class="toggle"><input type="checkbox" id="rebuy" ${d.rebuy ? 'checked' : ''}>🛒 À acheter</label>
    </div>

    <label class="f">Photo (étiquette, verre…)</label>
    <label class="photo-drop" id="drop">
      <input type="file" accept="image/*" capture="environment" id="file" hidden>
      <div id="prev">${imgSrc(thumb) ? `<img src="${imgSrc(thumb)}">` : '📷 Prendre / choisir une photo'}</div>
    </label>
    ${imgSrc(thumb) ? `<button type="button" class="btn sm ghost" id="rmPhoto" style="margin-top:6px">Retirer la photo</button>` : ''}

    <label class="f">Nez</label><textarea class="in" id="nose">${esc(d.nose)}</textarea>
    <label class="f">Bouche</label><textarea class="in" id="palate">${esc(d.palate)}</textarea>
    <label class="f">Finale</label><textarea class="in" id="finish">${esc(d.finish)}</textarea>
    <label class="f">Commentaire libre</label><textarea class="in" id="comment" placeholder="Ambiance, anecdote du stand…">${esc(d.comment)}</textarea>

    <div class="sticky-save"><button class="btn primary block" id="saveBtn">Enregistrer</button></div>
  </div>`;

  const fillBottles = () => {
    const sid = $('#stand').value;
    const names = [...new Set(S.drams.filter(x => !sid || x.standId === sid).map(x => x.bottle))].slice(0, 40);
    $('#bottles').innerHTML = names.map(n => `<option value="${esc(n)}">`).join('');
  };
  fillBottles(); $('#stand').onchange = fillBottles;
  $('#score').oninput = e => { $('#sv').textContent = e.target.value; };
  app.querySelectorAll('[data-tag]').forEach(b => b.onclick = () => { const t = b.dataset.tag; tags.has(t) ? tags.delete(t) : tags.add(t); b.classList.toggle('on'); });
  $('#file').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    $('#prev').textContent = '⏳ Compression…';
    try { const p = await photoPair(f); photo = p.full; thumb = p.thumb; removePhoto = false; $('#prev').innerHTML = `<img src="${imgSrc(p.full)}">`; }
    catch (err) { $('#prev').textContent = '⚠️ ' + err.message; }
  };
  const rm = $('#rmPhoto'); if (rm) rm.onclick = () => { removePhoto = true; photo = null; thumb = null; $('#prev').textContent = '📷 Prendre / choisir une photo'; rm.remove(); };

  $('#saveBtn').onclick = () => {
    const bottle = $('#bottle').value.trim();
    if (!bottle) { toast('Indiquez le nom de la bouteille'); $('#bottle').focus(); return; }
    const standId = $('#stand').value;
    const data = {
      author: S.me.name, standId, standName: STAND_BY_ID[standId]?.name || '', bottle,
      age: $('#age').value.trim(), abv: $('#abv').value.trim().replace(',', '.'), price: $('#price').value.trim().replace(',', '.'), cask: $('#cask').value.trim(),
      score: +$('#score').value, tags: [...tags], fav: $('#fav').checked, rebuy: $('#rebuy').checked,
      nose: $('#nose').value.trim(), palate: $('#palate').value.trim(), finish: $('#finish').value.trim(), comment: $('#comment').value.trim(),
      thumb: removePhoto ? null : (thumb || null), hasPhoto: removePhoto ? false : (photo ? true : !!d.hasPhoto),
      updated: Date.now(), at: d.at || Date.now(),
    };
    const newId = store.save('drams', existing?.id, data);
    if (photo) store.putPhoto(newId, photo, S.me.name);
    if (removePhoto && d.hasPhoto) store.removePhoto(newId);
    toast(existing ? 'Modifié ✓' : 'Dram enregistré 🥃');
    location.replace('#dram/' + newId);
  };
}

// ============ vue : PLAN ============
function vPlan() {
  app.innerHTML = `<div class="plan-wrap" id="pw"><img id="pimg" src="plan-wlp26.webp" alt="Plan du salon WLP 26" draggable="false"></div>
    <div class="plan-tools"><button id="zin">+</button><button id="zout">−</button><button id="zfit" style="font-size:15px">⤢</button></div>`;
  const wrap = $('#pw'), img = $('#pimg');
  let sc = 1, tx = 0, ty = 0, min = 0.2;
  const apply = () => { img.style.transform = `translate(${tx}px,${ty}px) scale(${sc})`; };
  const fit = (right) => {
    const W = wrap.clientWidth, H = wrap.clientHeight, iw = img.naturalWidth, ih = img.naturalHeight;
    min = Math.min(W / iw, H / ih);
    if (right) { sc = H / ih; tx = W - iw * sc * 0.99; ty = 0; }  // cadre sur le plan du hall (partie droite)
    else { sc = min; tx = (W - iw * sc) / 2; ty = (H - ih * sc) / 2; }
    apply();
  };
  const zoomAt = (f, cx, cy) => { const ns = Math.max(min * 0.8, Math.min(sc * f, 6)); tx = cx - (cx - tx) * ns / sc; ty = cy - (cy - ty) * ns / sc; sc = ns; apply(); };
  img.onload = () => fit(true); if (img.complete && img.naturalWidth) fit(true);
  $('#zin').onclick = () => zoomAt(1.4, wrap.clientWidth / 2, wrap.clientHeight / 2);
  $('#zout').onclick = () => zoomAt(1 / 1.4, wrap.clientWidth / 2, wrap.clientHeight / 2);
  $('#zfit').onclick = () => fit(false);
  const pts = new Map(); let last = null;
  wrap.onpointerdown = e => { wrap.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); last = null; };
  wrap.onpointermove = e => {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
    const r = wrap.getBoundingClientRect();
    if (pts.size === 1) { tx += e.clientX - prev[0]; ty += e.clientY - prev[1]; apply(); }
    else if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      const dist = Math.hypot(a[0] - b[0], a[1] - b[1]), cx = (a[0] + b[0]) / 2 - r.left, cy = (a[1] + b[1]) / 2 - r.top;
      if (last) { tx += cx - last.cx; ty += cy - last.cy; zoomAt(dist / last.dist, cx, cy); }
      last = { dist, cx, cy };
    }
  };
  const up = e => { pts.delete(e.pointerId); last = null; };
  wrap.onpointerup = up; wrap.onpointercancel = up;
  wrap.onwheel = e => { e.preventDefault(); const r = wrap.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top); };
  let lastTap = 0;
  wrap.addEventListener('pointerup', e => { const t = Date.now(); if (t - lastTap < 300) { const r = wrap.getBoundingClientRect(); zoomAt(2, e.clientX - r.left, e.clientY - r.top); } lastTap = t; });
}

// ============ vue : CLUB ============
function vClub() {
  const tab = S.clubTab;
  let html = `<h1>Le club</h1><div class="seg">${[['feed', 'Fil'], ['top', 'Top'], ['members', 'Membres']].map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  if (tab === 'feed') {
    const who = S.feedWho;
    const list = S.drams.filter(d => !who || d.author === who);
    html += `<div class="chips" style="padding-top:0"><button class="chip ${!who ? 'on' : ''}" data-who="">Tout le monde</button>${MEMBERS.map(m => `<button class="chip ${who === m ? 'on' : ''}" data-who="${esc(m)}">${esc(m)}</button>`).join('')}</div>
      <div style="margin-top:8px">${list.map(dramRow).join('') || `<div class="empty"><div class="e">🥃</div>Aucun dram pour l’instant.<br>Appuyez sur <b>+</b> pour commencer !</div>`}</div>`;
  } else if (tab === 'top') {
    const groups = {};
    S.drams.forEach(d => { if (d.score != null) (groups[bottleKey(d)] ||= []).push(d); });
    const rows = Object.values(groups).map(g => ({ g, a: avg(g.map(d => d.score)), n: new Set(g.map(d => d.author)).size, favs: g.filter(d => d.fav).length }));
    const top = rows.sort((x, y) => y.a - x.a || y.n - x.n).slice(0, 25);
    const consensus = rows.filter(r => r.n >= 2).sort((x, y) => y.a - x.a).slice(0, 10);
    const hearts = rows.filter(r => r.favs).sort((x, y) => y.favs - x.favs || y.a - x.a).slice(0, 10);
    const rankList = arr => arr.map((r, i) => `<div class="dram" data-dram="${r.g[0].id}"><span class="rank">${i + 1}</span>
        <div class="grow"><div class="t">${esc(r.g[0].bottle)}</div><div class="m">#${esc(standOf(r.g[0]).num)} ${esc(standOf(r.g[0]).name)}</div>
        <div class="dots" style="margin-top:4px;padding-left:5px">${[...new Set(r.g.map(d => d.author))].map(n => avatar(n)).join('')}</div></div>
        ${r.favs ? `<span class="small">❤️${r.favs > 1 ? r.favs : ''}</span>` : ''}${scoreTag(Math.round(r.a))}</div>`).join('');
    html += top.length ? `
      ${consensus.length ? `<h2>🏆 Consensus (≥ 2 dégustateurs)</h2>${rankList(consensus)}` : ''}
      ${hearts.length ? `<h2>❤️ Coups de cœur</h2>${rankList(hearts)}` : ''}
      <h2>📈 Meilleures notes</h2>${rankList(top)}` : `<div class="empty"><div class="e">🏆</div>Le classement apparaîtra avec les premières notes.</div>`;
  } else {
    const zonesVisited = new Set(S.drams.map(d => STAND_BY_ID[d.standId]?.zone).filter(Boolean));
    const standsVisited = new Set(S.drams.map(d => d.standId).filter(Boolean));
    html += `<div class="grid3"><div class="stat"><b>${S.drams.length}</b><span>drams notés</span></div><div class="stat"><b>${standsVisited.size}</b><span>stands visités / ${STANDS.length}</span></div><div class="stat"><b>${zonesVisited.size}</b><span>zones / ${ZONES.length}</span></div></div>`;
    const stats = MEMBERS.map(m => {
      const ds = S.drams.filter(d => d.author === m);
      const sc = ds.map(d => d.score).filter(x => x != null);
      const best = ds.slice().sort((a, b) => (b.score || 0) - (a.score || 0))[0];
      const tagCount = {}; ds.forEach(d => (d.tags || []).forEach(t => tagCount[t] = (tagCount[t] || 0) + 1));
      const favTag = Object.entries(tagCount).sort((a, b) => b[1] - a[1])[0];
      return { m, n: ds.length, a: avg(sc), best, favTag, stands: new Set(ds.map(d => d.standId)).size };
    });
    const maxN = Math.max(1, ...stats.map(s => s.n));
    html += stats.map(s => `<div class="card" style="margin-top:10px">
      <div class="row">${avatar(s.m)}<b class="grow">${esc(s.m)}</b>${s.a != null ? `<span class="small muted">moy.</span>${scoreTag(Math.round(s.a))}` : ''}</div>
      <div class="bar" style="margin:10px 0 6px"><i style="width:${s.n / maxN * 100}%"></i></div>
      <div class="small muted">${s.n} dram${s.n > 1 ? 's' : ''} · ${s.stands} stand${s.stands > 1 ? 's' : ''}${s.favTag ? ` · plutôt <b style="color:var(--ink)">${esc(s.favTag[0])}</b>` : ''}</div>
      ${s.best ? `<div class="small" style="margin-top:6px;cursor:pointer" data-go="${s.best.id}">🥇 ${esc(s.best.bottle)} ${scoreTag(s.best.score)}</div>` : ''}
    </div>`).join('');
    const strict = stats.filter(s => s.a != null).sort((a, b) => a.a - b.a);
    if (strict.length >= 2) html += `<p class="small muted" style="margin-top:14px">🧐 Le plus sévère : <b>${esc(strict[0].m)}</b> · 🥰 Le plus généreux : <b>${esc(strict[strict.length - 1].m)}</b></p>`;
  }
  app.innerHTML = html;
  app.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { S.clubTab = b.dataset.tab; vClub(); });
  app.querySelectorAll('[data-who]').forEach(b => b.onclick = () => { S.feedWho = b.dataset.who; vClub(); });
  app.querySelectorAll('[data-go]').forEach(b => b.onclick = () => location.hash = 'dram/' + b.dataset.go);
  bindDramRows();
}

// ============ vue : SOUVENIRS ============
function vSouvenirs() {
  const shopping = S.drams.filter(d => d.author === S.me.name && d.rebuy);
  app.innerHTML = `<h1>Souvenirs</h1>
    <button class="btn primary block" id="addM">📸 Ajouter un souvenir</button>
    ${shopping.length ? `<details class="card" style="margin-top:12px"><summary><b>🛒 Ma liste d’achats (${shopping.length})</b></summary>
      <div style="margin-top:8px">${shopping.map(d => `<div class="row small" style="padding:6px 0;border-top:1px solid #ffffff10"><span class="grow">${esc(d.bottle)} <span class="muted">· ${esc(standOf(d).name)}</span></span>${d.price ? `<span class="muted">${esc(d.price)} €</span>` : ''}${scoreTag(d.score)}</div>`).join('')}</div></details>` : ''}
    <h2>Journal du salon</h2>
    ${S.moments.map(m => `<div class="moment" data-mid="${m.id}">
      ${imgSrc(m.thumb) ? `<img src="${imgSrc(m.thumb)}" alt="" loading="lazy" data-full="${m.hasPhoto ? m.id : ''}">` : ''}
      <div class="b"><div class="row small">${avatar(m.author)}<b class="grow">${esc(m.author)}</b><span class="muted">${fmtTime(m.at)}</span>
        ${m.author === S.me.name ? `<button class="iconbtn" data-delm="${m.id}" aria-label="Supprimer">🗑</button>` : ''}</div>
        ${m.text ? `<p style="margin:8px 0 0;white-space:pre-wrap">${esc(m.text)}</p>` : ''}
        ${m.standId && STAND_BY_ID[m.standId] ? `<a class="small" href="#stand/${m.standId}">📍 ${esc(STAND_BY_ID[m.standId].name)}</a>` : ''}
      </div></div>`).join('') || `<div class="empty"><div class="e">📸</div>Photos de groupe, masterclass, rencontres…<br>Tout ce qu’on voudra se rappeler.</div>`}`;
  $('#addM').onclick = addMoment;
  // chargement lazy des photos pleine qualité quand elles deviennent visibles
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; io.unobserve(e.target);
    const id = e.target.dataset.full; if (id) store.getPhoto(id).then(p => { if (imgSrc(p)) e.target.src = p; });
  }), { rootMargin: '200px' });
  app.querySelectorAll('img[data-full]').forEach(i => i.dataset.full && io.observe(i));
  app.querySelectorAll('[data-delm]').forEach(b => b.onclick = () => { if (confirm('Supprimer ce souvenir ?')) { const m = S.moments.find(x => x.id === b.dataset.delm); store.remove('moments', m.id); if (m.hasPhoto) store.removePhoto(m.id); } });
}

function addMoment() {
  let full = null, thumb = null;
  sheet(`<h1 style="margin-top:0">Nouveau souvenir</h1>
    <label class="photo-drop"><input type="file" accept="image/*" id="mf" hidden><div id="mp">📷 Photo (facultatif)</div></label>
    <label class="f">Texte</label><textarea class="in editing" id="mt" placeholder="La masterclass de fou, la rencontre avec le master blender…"></textarea>
    <label class="f">Stand lié (facultatif)</label>
    <select class="in" id="ms"><option value="">—</option>${STANDS.map(s => `<option value="${s.id}">${esc(s.num)} · ${esc(s.name)}</option>`).join('')}</select>
    <button class="btn primary block" id="mok" style="margin-top:14px">Publier</button>`, (el, close) => {
    $('#mf', el).onchange = async e => {
      const f = e.target.files[0]; if (!f) return; $('#mp', el).textContent = '⏳ Compression…';
      try { const p = await photoPair(f); full = p.full; thumb = await compress(f, 800, 120_000, 0.7); $('#mp', el).innerHTML = `<img src="${imgSrc(thumb)}">`; }
      catch (err) { $('#mp', el).textContent = '⚠️ ' + err.message; }
    };
    $('#mok', el).onclick = () => {
      const text = $('#mt', el).value.trim();
      if (!text && !full) { toast('Ajoutez une photo ou un texte'); return; }
      const id = store.save('moments', null, { author: S.me.name, text, thumb, hasPhoto: !!full, standId: $('#ms', el).value, at: Date.now() });
      if (full) store.putPhoto(id, full, S.me.name);
      close(); toast('Souvenir ajouté 📸');
    };
  });
}

// ============ exports ============
function download(name, content, type) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function exportCsv() {
  const cols = ['author', 'num', 'stand', 'zone', 'bottle', 'age', 'abv', 'cask', 'price', 'score', 'tags', 'fav', 'rebuy', 'nose', 'palate', 'finish', 'comment', 'date'];
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = S.drams.map(d => { const s = standOf(d); return [d.author, s.num, s.name, s.zoneName, d.bottle, d.age, d.abv, d.cask, d.price, d.score, (d.tags || []).join(', '), d.fav ? 'oui' : '', d.rebuy ? 'oui' : '', d.nose, d.palate, d.finish, d.comment, d.at ? new Date(d.at).toISOString() : ''].map(q).join(';'); });
  download('wlp26-degustations.csv', '﻿' + cols.join(';') + '\n' + rows.join('\n'), 'text/csv');
}
function exportJson() {
  download('wlp26-sauvegarde.json', JSON.stringify({ exportedAt: new Date().toISOString(), drams: S.drams, moments: S.moments.map(({ thumb, ...m }) => m), wishlists: S.wish }, null, 2), 'application/json');
}

// ============ service worker ============
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

boot();
