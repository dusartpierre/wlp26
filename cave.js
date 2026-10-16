// La Cave des Knights : les bouteilles des soirées du club et leurs notes.
// Même socle que le carnet WLP 26 (config.js, store.js, style.css, connexion partagée).
import { MEMBERS } from './config.js';
import * as store from './store.js';

// ============ état ============
const S = {
  me: null, bottles: [], ratings: [], unsub: [],
  f: { q: '', type: '', country: '', season: '', sort: 'date', mine: false },
  rankTab: 'note', rankSeason: '', knightTab: 'notes',
};
const COLORS = ['#f0a93b', '#6fc3d3', '#e99bb3', '#9be07a', '#c9a0ff', '#ff8a65', '#4dd0e1', '#ffd54f'];
const W = { pack: 0.1, nose: 0.3, taste: 0.6 };             // pondération de la note globale (identique à Notion)
const CRIT = [['pack', 'Packaging', '📦'], ['nose', 'Nez', '👃'], ['taste', 'Goût', '👅']];
const BLIND_DAYS = 2;                                       // notes des autres masquées tant qu'on n'a pas noté (soirée récente)
const FLAGS = {
  scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', ecosse: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'pays de galles': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', wales: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', irlande: '🇮🇪', ireland: '🇮🇪', angleterre: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', england: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  usa: '🇺🇸', 'etats unis': '🇺🇸', france: '🇫🇷', japon: '🇯🇵', japan: '🇯🇵', bresil: '🇧🇷', 'coree du sud': '🇰🇷', canada: '🇨🇦',
  suede: '🇸🇪', belgique: '🇧🇪', italia: '🇮🇹', italie: '🇮🇹', inde: '🇮🇳', india: '🇮🇳', 'new zealand': '🇳🇿', 'nouvelle zelande': '🇳🇿',
  australie: '🇦🇺', australia: '🇦🇺', taiwan: '🇹🇼', allemagne: '🇩🇪', suisse: '🇨🇭', 'pays bas': '🇳🇱', danemark: '🇩🇰', finlande: '🇫🇮',
  islande: '🇮🇸', israel: '🇮🇱', 'afrique du sud': '🇿🇦', espagne: '🇪🇸', autriche: '🇦🇹', norvege: '🇳🇴', mexique: '🇲🇽',
};
const $ = (s, r = document) => r.querySelector(s);
const app = $('#app');

// ============ utilitaires ============
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const slug = s => norm(s).replace(/ /g, '-');
const imgSrc = s => (typeof s === 'string' && s.startsWith('data:image/')) ? s : '';
const extSrc = s => (typeof s === 'string' && /^https?:\/\//.test(s)) ? s : '';
const flag = c => FLAGS[norm(c)] || (c ? '🌍' : '');
const colorOf = name => { const i = MEMBERS.indexOf(name); return COLORS[(i >= 0 ? i : [...String(name)].reduce((a, c) => a + c.charCodeAt(0), 0)) % COLORS.length]; };
const avatar = (name, px) => name ? `<span class="avatar" style="background:${colorOf(name)}${px ? `;width:${px}px;height:${px}px;font-size:${Math.round(px / 2)}px` : ''}" title="${esc(name)}">${esc(name[0].toUpperCase())}</span>` : '';
const f1 = v => v == null ? '–' : (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
const f2 = v => v == null ? '–' : (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');
const euro = v => v == null ? '' : (Math.round(v * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: v % 1 ? 2 : 0 }) + '\u00a0€';
const noteCls = s => s >= 8.25 ? 's4' : s >= 8 ? 's3' : s >= 7.5 ? 's2' : s >= 7 ? 's1' : 's0';
const noteTag = (s, big) => s != null ? `<span class="score ${noteCls(s)}${big ? ' big' : ''}">${f2(s)}</span>` : `<span class="score s0 nn">–</span>`;
const fmtDate = d => d ? new Date(d + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
const fmtShort = d => d ? new Date(d + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' }) : '';
const today = () => new Date().toISOString().slice(0, 10);
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const toNum = v => { const n = parseFloat(String(v ?? '').replace(',', '.').replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : null; };
const knownMembers = () => { const extra = new Set(); S.ratings.forEach(r => extra.add(r.author)); S.bottles.forEach(b => [b.host, b.bringer, b.culture].forEach(n => n && extra.add(n))); return [...MEMBERS, ...[...extra].filter(n => n && !MEMBERS.includes(n)).sort()]; };
const isFormer = n => !MEMBERS.includes(n);

// Note globale d'une fiche : moyenne pondérée des critères renseignés (anciennes fiches : goût seul, etc.)
function weighted(o) {
  let s = 0, w = 0;
  for (const k in W) if (o[k] != null) { s += W[k] * o[k]; w += W[k]; }
  return w ? s / w : null;
}
const ratingsOf = id => S.ratings.filter(r => r.bottleId === id);
// Note du club : pondération des moyennes de chaque critère (même calcul que dans Notion)
function clubNote(b) {
  const rs = ratingsOf(b.id);
  const v = {};
  for (const k in W) {
    const vals = rs.map(r => r[k]).filter(x => x != null);
    if (k === 'pack' && Array.isArray(b.packClub)) vals.push(...b.packClub);
    v[k] = vals.length ? mean(vals) : null;
  }
  const note = weighted(v);
  return { ...v, note, n: rs.length, qp: note != null && b.price ? note / b.price * 100 : null };
}
const myRating = b => S.ratings.find(r => r.bottleId === b.id && r.author === S.me.name);
// Mode « à l'aveugle » : soirée récente, pas encore noté -> on ne voit pas les notes des autres
const isBlind = b => !myRating(b) && b.date && (Date.now() - new Date(b.date + 'T12:00')) / 864e5 <= BLIND_DAYS;
const bottlesOnly = () => S.bottles.filter(b => b.kind !== 'session');
const seasons = () => [...new Set(S.bottles.map(b => b.season).filter(Boolean))].sort((a, b) => {
  const da = S.bottles.filter(x => x.season === a).map(x => x.date || '').sort()[0] || '', db = S.bottles.filter(x => x.season === b).map(x => x.date || '').sort()[0] || '';
  return db.localeCompare(da);
});
const uniq = k => [...new Set(bottlesOnly().map(b => b[k]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
const bottleTitle = b => b.name || [b.brand, b.label].filter(Boolean).join(' - ') || 'Sans nom';
const metaLine = b => [b.type, b.abv ? String(b.abv).replace('.', ',') + '°' : '', euro(b.price)].filter(Boolean).map(esc).join(' · ');

function thumbHtml(b, cls = 'thumb') {
  const t = imgSrc(b.thumb), u = extSrc(b.photoUrl);
  if (t) return `<img class="${cls}" src="${t}" alt="" loading="lazy">`;
  if (u) return `<img class="${cls} ext" src="${esc(u)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.outerHTML='<div class=&quot;${cls}&quot;>🥃</div>'">`;
  return `<div class="${cls}">🥃</div>`;
}

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

async function compress(file, max, maxChars, q = 0.8) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    let scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    for (let k = 0; k < 8; k++) {
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
      const out = c.toDataURL('image/jpeg', q);
      if (out.length <= maxChars) return out;
      if (q > 0.5) q -= 0.1; else scale *= 0.8;
    }
    throw new Error('Image trop lourde');
  } finally { URL.revokeObjectURL(url); }
}
const photoPair = async f => ({ full: await compress(f, 1400, 900_000, 0.8), thumb: await compress(f, 320, 40_000, 0.7) });
const photoButtons = idp => `<div class="grid2" style="margin-top:8px">
  <label class="btn"><input type="file" accept="image/*" capture="environment" class="${idp}" hidden>📷 Prendre une photo</label>
  <label class="btn"><input type="file" accept="image/*" class="${idp}" hidden>🖼️ Galerie</label></div>`;

// ============ démarrage ============
async function boot() {
  app.innerHTML = `<div class="empty"><div class="e">🥃</div>Chargement de la cave…</div>`;
  let r;
  try { r = await store.init(); }
  catch (e) { app.innerHTML = `<div class="login"><h1>Oups</h1><p>Impossible de charger Firebase (${esc(e.message)}).</p><button class="btn primary" onclick="location.reload()">Réessayer</button></div>`; return; }
  if (r.member) start(r.member); else loginView();
}

function loginView() {
  $('nav.bottom').classList.add('hidden'); $('header.top').classList.add('hidden');
  let who = '';
  app.innerHTML = `<div class="login">
    <img src="logo-wk.png" alt="Whisky Knights" class="wk-logo">
    <div class="big" style="font-size:40px;text-align:center">La <b>Cave</b></div>
    <p class="muted" style="text-align:center;margin-top:4px">Les bouteilles et les notes du club</p>
    <label class="f">Qui êtes-vous ?</label>
    <div class="who">${MEMBERS.map(m => `<button data-m="${esc(m)}">${avatar(m)}${esc(m)}</button>`).join('')}</div>
    <label class="f" for="code">Code club</label>
    <input id="code" class="in" type="password" autocomplete="current-password" placeholder="${store.DEMO ? 'Mode démo : n’importe quel code' : 'Le code partagé du club'}">
    <button id="go" class="btn primary block" style="margin-top:14px" disabled>Entrer</button>
    <p id="err" class="small" style="color:var(--red)"></p>
    ${store.DEMO ? '<p class="small muted"><span class="demo-badge">DÉMO</span> Firebase n’est pas configuré : les données restent sur cet appareil.</p>' : ''}
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
  const onErr = e => { if (e.code === 'permission-denied') toast('Accès refusé : vérifiez les règles Firestore (bottles / ratings).', 5000); };
  S.unsub = [
    store.watch('bottles', d => { S.bottles = d.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.at || 0) - (a.at || 0)); rerender(); }, onErr),
    store.watch('ratings', d => { S.ratings = d; rerender(); }, onErr),
  ];
  syncBadge();
  route();
}

$('#meBtn').onclick = () => sheet(`
  <div class="row">${avatar(S.me.name)}<b class="grow">${esc(S.me.name)}</b></div>
  <p class="small muted">${S.ratings.filter(r => r.author === S.me.name).length} notes · ${bottlesOnly().filter(b => b.bringer === S.me.name).length} bouteilles apportées.</p>
  <div class="stack">
    <a class="btn block" href="index.html#stands">🎪 Carnet Whisky Live Paris 2026</a>
    <button class="btn block" id="exCsv">⬇️ Exporter la cave et les notes (CSV)</button>
    <button class="btn block" id="exJson">💾 Sauvegarde complète (JSON)</button>
    <label class="btn block"><input type="file" accept=".json,application/json" id="imp" hidden>📥 Importer l’historique Notion</label>
    <button class="btn block ghost" id="logout">Changer de membre / se déconnecter</button>
  </div>`, (el, close) => {
  $('#exCsv', el).onclick = () => { exportCsv(); close(); };
  $('#exJson', el).onclick = () => { exportJson(); close(); };
  $('#imp', el).onchange = e => { const f = e.target.files[0]; close(); if (f) importNotion(f); };
  $('#logout', el).onclick = async () => { close(); S.unsub.forEach(u => u()); await store.leave(); location.hash = ''; loginView(); };
});

function syncBadge() {
  const el = $('#sync');
  const upd = () => {
    const pending = S.ratings.filter(d => d._pending).length + S.bottles.filter(d => d._pending).length;
    el.textContent = !navigator.onLine ? '📴' + (pending ? ` ${pending}` : '') : pending ? `⏳ ${pending}` : '';
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
  const [path, qs] = (location.hash.slice(1) || 'cave').split('?');
  const [view, arg] = path.split('/');
  const q = new URLSearchParams(qs || '');
  const navOf = { b: 'cave', rate: 'cave', editb: 'cave', new: 'plus', m: 'knights' };
  document.querySelectorAll('nav.bottom a').forEach(a => a.classList.toggle('on', a.dataset.v === (navOf[view] || view)));
  const y = window.scrollY;
  const views = { cave: vCave, b: vBottle, rate: vRate, new: vEditBottle, editb: vEditBottle, rank: vRank, knights: vKnights, m: vMember, saisons: vSeasons, plus: vPlus };
  (views[view] || vCave)(decodeURIComponent(arg || ''), q);
  window.scrollTo(0, soft ? y : 0);
}

// ============ vue : CAVE ============
function vCave() {
  const f = S.f, qn = norm(f.q);
  const all = bottlesOnly();
  let list = all.filter(b =>
    (!f.type || b.type === f.type) && (!f.country || b.country === f.country) && (!f.season || b.season === f.season) &&
    (!f.mine || !myRating(b)) &&
    (!qn || norm([bottleTitle(b), b.brand, b.label, b.country, b.region, b.type, b.bringer, b.season].join(' ')).includes(qn)));
  const cn = new Map(all.map(b => [b.id, clubNote(b)]));
  const sorters = {
    date: (a, b) => (b.date || '').localeCompare(a.date || ''),
    note: (a, b) => (cn.get(b.id).note ?? -1) - (cn.get(a.id).note ?? -1),
    qp: (a, b) => (cn.get(b.id).qp ?? -1) - (cn.get(a.id).qp ?? -1),
    az: (a, b) => bottleTitle(a).localeCompare(bottleTitle(b), 'fr'),
  };
  list.sort(sorters[f.sort]);
  const countries = new Set(all.map(b => b.country).filter(Boolean));
  const toRate = all.filter(b => !myRating(b)).length;
  const sel = (id, label, vals, cur) => `<select class="chip sel ${cur ? 'on' : ''}" id="${id}"><option value="">${label}</option>${vals.map(v => `<option ${v === cur ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>`;
  let html = `
    <div class="cave-head">
      <div><b>${all.length}</b><span>bouteilles</span></div>
      <div><b>${countries.size}</b><span>pays</span></div>
      <div><b>${seasons().filter(s => /saison/i.test(s)).length}</b><span>saisons</span></div>
      <div><b>${S.ratings.length}</b><span>notes</span></div>
    </div>
    ${(() => { const cur = currentBottle(); return cur && !myRating(cur) ? `<a class="cta-now" href="#rate/${cur.id}">${thumbHtml(cur, 'thumb sm')}<div class="grow"><div class="small muted">Soirée du ${fmtShort(cur.date)}</div><b>${esc(bottleTitle(cur))}</b></div><span class="btn sm primary">Noter</span></a>` : ''; })()}
    <input class="search" id="q" type="search" placeholder="🔎 Marque, whisky, pays, région…" value="${esc(f.q)}">
    <div class="chips">
      ${sel('fType', 'Type', uniq('type'), f.type)}
      ${sel('fCountry', 'Pays', uniq('country'), f.country)}
      ${sel('fSeason', 'Saison', seasons().filter(s => S.bottles.some(b => b.season === s && b.kind !== 'session')), f.season)}
      <button class="chip ${f.mine ? 'on' : ''}" id="fMine">✍️ À noter (${toRate})</button>
    </div>
    <div class="chips" style="padding-top:2px">
      <span class="small muted" style="align-self:center">Tri :</span>
      ${[['date', 'Date'], ['note', 'Note'], ['qp', 'Qualité/prix'], ['az', 'A–Z']].map(([k, l]) => `<button class="chip ${f.sort === k ? 'on' : ''}" data-sort="${k}">${l}</button>`).join('')}
    </div>`;
  if (!all.length) html += emptyCave();
  else if (!list.length) html += `<div class="empty"><div class="e">🤷</div>Aucune bouteille ne correspond.</div>`;
  else html += `<div class="bgrid">${list.map(b => { const c = cn.get(b.id), mine = myRating(b); return `
    <a class="bcard" href="#b/${b.id}">
      <div class="bimg">${thumbHtml(b, 'pic')}${c.note != null && !isBlind(b) ? `<span class="bnote">${noteTag(c.note)}</span>` : ''}${mine ? '<span class="bmine" title="Noté">✓</span>' : ''}</div>
      <div class="bt"><span class="fl">${flag(b.country)}</span> ${esc(bottleTitle(b))}</div>
      <div class="bm">${esc(b.type || '')}${b.type && b.price ? ' · ' : ''}${euro(b.price)}</div>
      <div class="bm">${esc(b.season || '')}${b.bringer ? ` · 🍾 ${esc(b.bringer)}` : ''}</div>
    </a>`; }).join('')}</div>`;
  app.innerHTML = html;
  const q = $('#q');
  if (q) q.oninput = () => { f.q = q.value; const pos = q.selectionStart; vCave(); const nq = $('#q'); nq.focus(); nq.setSelectionRange(pos, pos); };
  [['fType', 'type'], ['fCountry', 'country'], ['fSeason', 'season']].forEach(([id, k]) => { const s = $('#' + id); if (s) s.onchange = () => { f[k] = s.value; vCave(); }; });
  const fm = $('#fMine'); if (fm) fm.onclick = () => { f.mine = !f.mine; vCave(); };
  app.querySelectorAll('[data-sort]').forEach(b => b.onclick = () => { f.sort = b.dataset.sort; vCave(); });
  const imp = $('#impEmpty'); if (imp) imp.onchange = e => e.target.files[0] && importNotion(e.target.files[0]);
}
const emptyCave = () => `<div class="empty"><div class="e">🍾</div>La cave est vide.<br>Importez l’historique Notion ou ajoutez la première bouteille.
  <div class="stack" style="max-width:320px;margin:16px auto 0">
    <label class="btn primary block"><input type="file" accept=".json,application/json" id="impEmpty" hidden>📥 Importer cave-import.json</label>
    <a class="btn block" href="#new">＋ Ajouter une bouteille</a></div></div>`;
// Bouteille « du moment » : la plus récente si sa soirée date de moins de 7 jours
function currentBottle() {
  const b = bottlesOnly().filter(x => x.date && x.date <= today()).sort((a, c) => c.date.localeCompare(a.date))[0];
  return b && (Date.now() - new Date(b.date + 'T12:00')) / 864e5 <= 7 ? b : null;
}

// ============ vue : ＋ ============
function vPlus() {
  const cur = currentBottle();
  const notRated = bottlesOnly().filter(b => !myRating(b)).slice(0, 6);
  app.innerHTML = `<h1>Nouvelle soirée ?</h1>
    <a class="btn primary block" href="#new">🍾 Ajouter la bouteille de la soirée</a>
    ${cur ? `<h2>Bouteille du moment</h2><a class="cta-now" href="#${myRating(cur) ? 'b' : 'rate'}/${cur.id}">${thumbHtml(cur, 'thumb sm')}<div class="grow"><div class="small muted">${fmtDate(cur.date)}</div><b>${esc(bottleTitle(cur))}</b></div><span class="btn sm ${myRating(cur) ? '' : 'primary'}">${myRating(cur) ? 'Voir' : 'Noter'}</span></a>` : ''}
    ${notRated.length ? `<h2>Pas encore notées par moi</h2>${notRated.map(b => rowHtml(b, `<a class="btn sm" href="#rate/${b.id}">Noter</a>`)).join('')}` : ''}`;
}

function rowHtml(b, right = '', rank = '') {
  const c = clubNote(b);
  return `<a class="dram brow" href="#b/${b.id}">${rank !== '' ? `<span class="rank">${rank}</span>` : ''}${thumbHtml(b)}
    <div class="grow"><div class="t"><span class="fl">${flag(b.country)}</span> ${esc(bottleTitle(b))}</div>
      <div class="m">${metaLine(b)}</div>
      <div class="m">${fmtShort(b.date)}${b.bringer ? ` · 🍾 ${esc(b.bringer)}` : ''}</div></div>
    ${right || (isBlind(b) ? '<span class="pill">🙈</span>' : noteTag(c.note))}</a>`;
}

// ============ vue : FICHE BOUTEILLE ============
function vBottle(id) {
  const b = S.bottles.find(x => x.id === id);
  if (!b) { app.innerHTML = `<div class="empty"><div class="e">🫗</div>Bouteille introuvable.<br><a href="#cave">Retour à la cave</a></div>`; return; }
  if (b.kind === 'session') return vSession(b);
  const c = clubNote(b), rs = ratingsOf(b.id).sort((x, y) => (weighted(y) ?? 0) - (weighted(x) ?? 0)), mine = myRating(b), blind = isBlind(b);
  const raters = new Set(rs.map(r => r.author));
  const missing = MEMBERS.filter(m => !raters.has(m));
  const big = extSrc(b.photoUrl);
  app.innerHTML = `
    <a href="#cave" class="small">‹ La cave</a>
    <div class="bhero">${imgSrc(b.thumb) ? `<img id="heroImg" src="${imgSrc(b.thumb)}" alt="">` : big ? `<img id="heroImg" src="${esc(big)}" alt="" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'nopic',textContent:'🥃'}))">` : '<div class="nopic">🥃</div>'}</div>
    <div class="row" style="margin-top:10px;align-items:flex-start">
      <div class="grow"><h1 style="margin:0">${esc(bottleTitle(b))}</h1>
        <div class="small muted">${flag(b.country)} ${esc([b.country, b.region].filter(Boolean).join(' · '))}</div>
        <div class="small muted">${metaLine(b)}</div></div>
      <div class="bigscore bs-fiche">${blind ? '🙈' : f2(c.note)}<div class="small muted" style="font-size:11px;font-weight:600">${blind ? 'notez d’abord' : '/10 · ' + c.n + ' note' + (c.n > 1 ? 's' : '')}</div></div>
    </div>
    ${!blind && c.note != null ? `<div class="card crit" style="margin-top:12px">
      ${CRIT.map(([k, l, e]) => `<div class="critrow"><span>${e} ${l}</span><span class="bar"><i style="width:${(c[k] ?? 0) * 10}%"></i></span><b>${f1(c[k])}</b></div>`).join('')}
      ${c.qp != null ? `<div class="small muted" style="margin-top:6px">Qualité/prix : <b style="color:var(--ink)">${f1(c.qp)}</b> · rang ${rankOf(b, 'qp')}/${rankedCount()} · note : rang ${rankOf(b, 'note')}/${rankedCount()}</div>` : ''}
    </div>` : ''}
    <div style="margin-top:12px">${mine
      ? `<a class="btn block" href="#rate/${b.id}">✏️ Modifier ma note (${f2(weighted(mine))})</a>`
      : `<a class="btn primary block" href="#rate/${b.id}">✍️ Noter cette bouteille</a>`}</div>
    <dl class="kv card" style="margin-top:12px">
      ${[['Soirée', fmtDate(b.date)], ['Saison', b.season], ['Accueil', b.host && `${avatar(b.host, 18)} ${esc(b.host)}`], ['Bouteille', b.bringer && `${avatar(b.bringer, 18)} ${esc(b.bringer)}`], ['Culture', b.culture && `${avatar(b.culture, 18)} ${esc(b.culture)}`]]
        .filter(x => x[1]).map(([k, v]) => `<dt>${k}</dt><dd>${/avatar/.test(v) ? v : esc(v)}</dd>`).join('')}
    </dl>
    <h2>Les notes (${rs.length})</h2>
    ${blind && rs.length ? `<div class="card small muted">🙈 ${rs.length} membre${rs.length > 1 ? 's ont' : ' a'} déjà noté : ${rs.map(r => avatar(r.author, 20)).join(' ')}<br>Leurs notes s’afficheront quand vous aurez donné la vôtre.</div>`
      : rs.length ? `<div class="card ntable"><div class="nh"><span></span><span>📦</span><span>👃</span><span>👅</span><span>Note</span></div>
        ${rs.map(r => `<div class="nr ${r.author === S.me.name ? 'me' : ''}"><span class="row" style="gap:6px">${avatar(r.author, 22)}<span class="small">${esc(r.author)}${isFormer(r.author) ? ' <span class="muted">(ancien)</span>' : ''}</span></span>
          <span>${f1(r.pack)}</span><span>${f1(r.nose)}</span><span>${f1(r.taste)}</span><span>${noteTag(weighted(r))}</span></div>
          ${r.comment ? `<div class="ncom">${esc(r.comment)}</div>` : ''}`).join('')}
        ${Array.isArray(b.packClub) && b.packClub.length ? `<div class="small muted" style="margin-top:6px">📦 Packaging noté par le club : ${b.packClub.map(f1).join(', ')}</div>` : ''}</div>`
      : `<div class="empty" style="padding:14px"><div class="e">✍️</div>Personne n’a encore noté cette bouteille.</div>`}
    ${missing.length && rs.length ? `<p class="small muted">Pas encore noté : ${missing.map(m => esc(m)).join(', ')}</p>` : ''}
    ${b.comment || b.noseComment || b.tasteComment || b.story ? `<h2>Le souvenir</h2><div class="note-block card">
      ${[['Commentaires', b.comment], ['Nez', b.noseComment], ['Goût', b.tasteComment], ['Histoire', b.story]].filter(x => x[1]).map(([k, v]) => `<h3>${k}</h3><p>${linkify(v)}</p>`).join('')}</div>` : ''}
    ${b.slides ? `<a class="btn block" style="margin-top:10px" href="${esc(b.slides)}" target="_blank" rel="noopener">📊 La présentation de la soirée</a>` : ''}
    ${b.extra ? `<h2>Photos de la soirée</h2><div class="gal">${Array.from({ length: b.extra }, (_, i) => `<img data-ph="${b.id}_x${i + 1}" alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">`).join('')}</div>` : ''}
    <div class="grid2" style="margin-top:18px">
      <a class="btn" href="#editb/${b.id}">✏️ Modifier la fiche</a>
      <label class="btn"><input type="file" accept="image/*" id="addPh" hidden>📷 Ajouter une photo</label>
    </div>
    ${b.author === S.me.name ? `<button class="btn block ghost" id="delB" style="margin-top:8px">🗑 Supprimer cette bouteille</button>` : ''}`;
  if (b.hasPhoto) store.getPhoto(b.id).then(p => { const i = $('#heroImg'); if (i && imgSrc(p)) i.src = p; });
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; io.unobserve(e.target);
    store.getPhoto(e.target.dataset.ph).then(p => { if (imgSrc(p)) e.target.src = p; else e.target.remove(); });
  }), { rootMargin: '200px' });
  app.querySelectorAll('img[data-ph]').forEach(i => { io.observe(i); i.onclick = () => { if (imgSrc(i.src)) sheet(`<img src="${i.src}" style="width:100%;border-radius:12px">`); }; });
  $('#addPh').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    toast('⏳ Compression…', 1200);
    try {
      const p = await photoPair(f);
      if (!b.hasPhoto && !imgSrc(b.thumb)) { store.putPhoto(b.id, p.full, S.me.name); store.save('bottles', b.id, { thumb: p.thumb, hasPhoto: true, updated: Date.now() }); }
      else { const n = (b.extra || 0) + 1; store.putPhoto(`${b.id}_x${n}`, p.full, S.me.name); store.save('bottles', b.id, { extra: n, updated: Date.now() }); }
      toast('Photo ajoutée 📸');
    } catch (err) { toast('⚠️ ' + err.message); }
  };
  const del = $('#delB');
  if (del) del.onclick = () => {
    if (!confirm(`Supprimer « ${bottleTitle(b)} » et ses ${rs.length} notes ?`)) return;
    rs.filter(r => r.author === S.me.name).forEach(r => store.remove('ratings', r.id));
    store.remove('bottles', b.id); location.hash = 'cave'; toast('Supprimée');
  };
}
const linkify = t => esc(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">lien ↗</a>');
const ranked = k => bottlesOnly().map(b => ({ b, c: clubNote(b) })).filter(x => x.c[k] != null).sort((x, y) => y.c[k] - x.c[k]);
const rankOf = (b, k) => ranked(k).findIndex(x => x.b.id === b.id) + 1 || '–';
const rankedCount = () => ranked('note').length;

function vSession(b) {
  app.innerHTML = `<a href="#saisons" class="small">‹ Saisons</a>
    <h1>${esc(b.name || 'Soirée')}</h1>
    <dl class="kv card">${[['Date', fmtDate(b.date)], ['Saison', b.season], ['Accueil', b.host], ['Bouteille', b.bringer], ['Culture', b.culture]].filter(x => x[1]).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
    ${b.comment || b.story ? `<div class="note-block card" style="margin-top:12px"><p>${linkify(b.comment || b.story)}</p></div>` : ''}
    <p class="small muted">Soirée sans bouteille enregistrée. Vous pouvez la compléter pour en faire une fiche bouteille.</p>
    <a class="btn block" href="#editb/${b.id}">✏️ Compléter la fiche</a>`;
}

// ============ vue : NOTER ============
function vRate(id) {
  const b = S.bottles.find(x => x.id === id); if (!b) return vCave();
  const mine = myRating(b);
  const v = { pack: mine?.pack ?? 7, nose: mine?.nose ?? 7, taste: mine?.taste ?? 7 };
  app.innerHTML = `<div class="editing">
    <a href="#b/${b.id}" class="small">‹ Annuler</a>
    <div class="row" style="margin:10px 0">${thumbHtml(b)}<div class="grow"><h1 style="margin:0;font-size:19px">${esc(bottleTitle(b))}</h1><div class="small muted">${flag(b.country)} ${metaLine(b)}</div></div></div>
    <div class="card"><div class="bigscore" id="gv">${f2(weighted(v))}</div><div class="small muted" style="text-align:center">note globale · packaging 10 % · nez 30 % · goût 60 %</div></div>
    ${CRIT.map(([k, l, e]) => `<div class="card slider" style="margin-top:10px">
      <div class="row"><b class="grow">${e} ${l}</b><button class="stepb" data-k="${k}" data-d="-0.1">−</button><span class="sv" id="v_${k}">${f1(v[k])}</span><button class="stepb" data-k="${k}" data-d="0.1">+</button></div>
      <input type="range" min="0" max="10" step="0.1" value="${v[k]}" data-k="${k}">
      <div class="row small muted" style="justify-content:space-between"><span>0</span><span>5</span><span>7 bon</span><span>8 très bon</span><span>10</span></div>
    </div>`).join('')}
    <label class="f">Commentaire (facultatif)</label>
    <textarea class="in" id="cm" placeholder="Arômes, ressenti, accord…">${esc(mine?.comment || '')}</textarea>
    <div class="sticky-save"><button class="btn primary block" id="saveR">${mine ? 'Mettre à jour ma note' : 'Enregistrer ma note'}</button></div>
    ${mine ? `<button class="btn block ghost" id="delR" style="margin-top:8px">Retirer ma note</button>` : ''}
  </div>`;
  const upd = k => { $('#v_' + k).textContent = f1(v[k]); $(`input[data-k="${k}"]`).value = v[k]; $('#gv').textContent = f2(weighted(v)); };
  app.querySelectorAll('input[type=range]').forEach(i => i.oninput = () => { v[i.dataset.k] = +i.value; upd(i.dataset.k); });
  app.querySelectorAll('.stepb').forEach(btn => btn.onclick = () => { const k = btn.dataset.k; v[k] = Math.min(10, Math.max(0, Math.round((v[k] + +btn.dataset.d) * 10) / 10)); upd(k); });
  $('#saveR').onclick = () => {
    const rid = mine?.id || `${b.id}_${slug(S.me.name)}`;
    const data = { bottleId: b.id, author: S.me.name, pack: v.pack, nose: v.nose, taste: v.taste, global: Math.round(weighted(v) * 100) / 100, comment: $('#cm').value.trim(), at: mine?.at || Date.now(), updated: Date.now() };
    store.save('ratings', rid, data);
    toast(mine ? 'Note mise à jour ✓' : 'Note enregistrée 🥃');
    location.replace('#b/' + b.id);
  };
  const del = $('#delR'); if (del) del.onclick = () => { if (confirm('Retirer votre note ?')) { store.remove('ratings', mine.id); location.replace('#b/' + b.id); } };
}

// ============ vue : AJOUT / MODIF BOUTEILLE ============
function vEditBottle(id) {
  const ex = id ? S.bottles.find(x => x.id === id) : null;
  if (id && !ex) return vCave();
  const lastSeason = seasons().find(s => /saison/i.test(s)) || 'Saison 1';
  const d = ex || { date: today(), season: lastSeason, host: '', bringer: S.me.name, culture: '' };
  let photo = null, thumb = imgSrc(d.thumb) || null;
  const people = knownMembers();
  const pSel = (idf, cur) => `<select class="in" id="${idf}"><option value="">—</option>${people.map(m => `<option ${m === cur ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select>`;
  const dl = (idf, vals) => `<datalist id="${idf}">${vals.map(v => `<option value="${esc(v)}">`).join('')}</datalist>`;
  app.innerHTML = `<div class="editing">
    <a href="${ex ? '#b/' + ex.id : '#cave'}" class="small">‹ Annuler</a>
    <h1>${ex ? 'Modifier la fiche' : 'Nouvelle bouteille'}</h1>
    <div class="grid2">
      <div><label class="f">Marque / distillerie *</label><input class="in" id="brand" value="${esc(d.brand)}" placeholder="Glenfarclas" autocomplete="off"></div>
      <div><label class="f">Nom du whisky</label><input class="in" id="label" value="${esc(d.label)}" placeholder="15 years old" autocomplete="off"></div>
    </div>
    <div class="grid2">
      <div><label class="f">Type</label><input class="in" id="type" list="dlType" value="${esc(d.type)}" placeholder="Single Malt">${dl('dlType', [...new Set(['Single Malt', 'Bourbon', 'Blended', 'Rye', 'Single Grain', ...uniq('type')])])}</div>
      <div><label class="f">Pays</label><input class="in" id="country" list="dlCountry" value="${esc(d.country)}" placeholder="Scotland">${dl('dlCountry', uniq('country'))}</div>
    </div>
    <label class="f">Région</label><input class="in" id="region" list="dlRegion" value="${esc(d.region)}" placeholder="Speyside, Kentucky…">${dl('dlRegion', uniq('region'))}
    <div class="grid2">
      <div><label class="f">Degrés</label><input class="in" id="abv" inputmode="decimal" value="${esc(d.abv ?? '')}" placeholder="46"></div>
      <div><label class="f">Prix (€)</label><input class="in" id="price" inputmode="decimal" value="${esc(d.price ?? '')}" placeholder="59"></div>
    </div>
    <div class="grid2">
      <div><label class="f">Date de la soirée</label><input class="in" id="date" type="date" value="${esc(d.date)}"></div>
      <div><label class="f">Saison</label><input class="in" id="season" list="dlSeason" value="${esc(d.season)}">${dl('dlSeason', seasons())}</div>
    </div>
    <div class="grid3">
      <div><label class="f">🏠 Accueil</label>${pSel('host', d.host)}</div>
      <div><label class="f">🍾 Bouteille</label>${pSel('bringer', d.bringer)}</div>
      <div><label class="f">🎓 Culture</label>${pSel('culture', d.culture)}</div>
    </div>
    <label class="f">Photo de la bouteille</label>
    <div class="photo-drop" id="prev">${thumb ? `<img src="${thumb}">` : extSrc(d.photoUrl) ? `<img src="${esc(d.photoUrl)}" referrerpolicy="no-referrer">` : '📷 Pas encore de photo'}</div>
    ${photoButtons('pf')}
    <label class="f">Commentaires de la soirée</label><textarea class="in" id="comment" placeholder="Ce qu’on en a dit, l’ambiance…">${esc(d.comment)}</textarea>
    <label class="f">Lien de la présentation (facultatif)</label><input class="in" id="slides" type="url" value="${esc(d.slides)}" placeholder="https://docs.google.com/presentation/…">
    <div class="sticky-save"><button class="btn primary block" id="saveB">${ex ? 'Enregistrer' : 'Ajouter à la cave'}</button></div>
  </div>`;
  app.querySelectorAll('input.pf').forEach(inp => inp.onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    $('#prev').textContent = '⏳ Compression…';
    try { const p = await photoPair(f); photo = p.full; thumb = p.thumb; $('#prev').innerHTML = `<img src="${imgSrc(p.full)}">`; }
    catch (err) { $('#prev').textContent = '⚠️ ' + err.message; }
    e.target.value = '';
  });
  $('#saveB').onclick = () => {
    const brand = $('#brand').value.trim(), label = $('#label').value.trim();
    if (!brand) { toast('Indiquez au moins la marque'); $('#brand').focus(); return; }
    const data = {
      kind: 'bottle', brand, label, name: [brand, label].filter(Boolean).join(' - '),
      type: $('#type').value.trim(), country: $('#country').value.trim(), region: $('#region').value.trim(),
      abv: toNum($('#abv').value), price: toNum($('#price').value), date: $('#date').value, season: $('#season').value.trim(),
      host: $('#host').value, bringer: $('#bringer').value, culture: $('#culture').value,
      comment: $('#comment').value.trim(), slides: $('#slides').value.trim(), updated: Date.now(),
    };
    if (photo) { data.thumb = thumb; data.hasPhoto = true; }
    if (!ex) { data.author = S.me.name; data.at = Date.now(); data.extra = 0; }
    const nid = store.save('bottles', ex?.id, data);
    if (photo) store.putPhoto(nid, photo, S.me.name);
    toast(ex ? 'Fiche modifiée ✓' : 'Bouteille ajoutée 🍾');
    location.replace(ex ? '#b/' + nid : '#rate/' + nid);
  };
}

// ============ vue : CLASSEMENT ============
function vRank() {
  const tab = S.rankTab, season = S.rankSeason;
  const pool = bottlesOnly().filter(b => !season || b.season === season).map(b => ({ b, c: clubNote(b) })).filter(x => x.c.note != null && !isBlind(x.b));
  let html = `<h1>Classement</h1>
    <div class="seg">${[['note', 'Note'], ['qp', 'Qualité/prix'], ['country', 'Pays'], ['type', 'Types']].map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div class="chips" style="padding-top:0"><button class="chip ${!season ? 'on' : ''}" data-season="">Toutes saisons</button>${seasons().filter(s => S.bottles.some(b => b.season === s && b.kind !== 'session')).map(s => `<button class="chip ${season === s ? 'on' : ''}" data-season="${esc(s)}">${esc(s.replace('Saison ', 'S'))}</button>`).join('')}</div>`;
  if (!pool.length) html += `<div class="empty"><div class="e">🏆</div>Pas encore de bouteille notée${season ? ' cette saison' : ''}.</div>`;
  else if (tab === 'note' || tab === 'qp') {
    const list = pool.filter(x => x.c[tab] != null).sort((x, y) => y.c[tab] - x.c[tab]);
    const top = list.slice(0, 3);
    if (top.length === 3) html += `<div class="podium">${[1, 0, 2].map(i => `<a href="#b/${top[i].b.id}" class="pod p${i + 1}">${thumbHtml(top[i].b, 'pic')}<div class="medal">${['🥇', '🥈', '🥉'][i]}</div><div class="pt">${esc(bottleTitle(top[i].b))}</div><b>${tab === 'qp' ? f1(top[i].c.qp) : f2(top[i].c.note)}</b></a>`).join('')}</div>`;
    html += list.map((x, i) => rowHtml(x.b, tab === 'qp' ? `<span class="qp"><b>${f1(x.c.qp)}</b><span class="small muted">${f2(x.c.note)} · ${euro(x.b.price)}</span></span>` : '', i + 1)).join('');
    if (tab === 'qp') html += `<p class="small muted">Q/P = note du club ÷ prix × 100 (comme dans Notion).</p>`;
  } else {
    const k = tab, groups = {};
    pool.forEach(x => (groups[x.b[k] || '—'] ||= []).push(x));
    const rows = Object.entries(groups).map(([g, xs]) => ({ g, n: xs.length, a: mean(xs.map(x => x.c.note)), best: xs.sort((p, q) => q.c.note - p.c.note)[0] })).sort((p, q) => q.a - p.a);
    html += rows.map((r, i) => `<div class="dram brow" style="cursor:default"><span class="rank">${i + 1}</span><div class="thumb fl-big">${k === 'country' ? flag(r.g) : '🥃'}</div>
      <div class="grow"><div class="t">${esc(r.g)}</div><div class="m">${r.n} bouteille${r.n > 1 ? 's' : ''} · meilleure : <a href="#b/${r.best.b.id}">${esc(bottleTitle(r.best.b))}</a></div></div>${noteTag(r.a)}</div>`).join('');
  }
  app.innerHTML = html;
  app.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { S.rankTab = b.dataset.tab; vRank(); });
  app.querySelectorAll('[data-season]').forEach(b => b.onclick = () => { S.rankSeason = b.dataset.season; vRank(); });
}

// ============ vue : KNIGHTS (membres) ============
function memberStats() {
  const notes = new Map(bottlesOnly().map(b => [b.id, clubNote(b)]));
  return knownMembers().map(m => {
    const rs = S.ratings.filter(r => r.author === m && notes.has(r.bottleId));
    const given = rs.map(weighted).filter(x => x != null);
    const gaps = rs.map(r => { const g = weighted(r), c = notes.get(r.bottleId).note; return g != null && c != null ? g - c : null; }).filter(x => x != null);
    const brought = bottlesOnly().filter(b => b.bringer === m);
    const recv = brought.map(b => notes.get(b.id).note).filter(x => x != null);
    const best = rs.slice().sort((a, b) => (weighted(b) ?? 0) - (weighted(a) ?? 0))[0];
    return { m, former: isFormer(m), n: rs.length, avgGiven: mean(given), gap: mean(gaps), absGap: mean(gaps.map(Math.abs)), brought, avgRecv: mean(recv),
      host: S.bottles.filter(b => b.host === m).length, culture: S.bottles.filter(b => b.culture === m).length, best };
  }).filter(s => s.n || s.brought.length || s.host);
}
function vKnights() {
  const st = memberStats(), tab = S.knightTab;
  const active = st.filter(s => !s.former);
  const pick = (arr, k, dir) => arr.filter(s => s[k] != null && s.n >= 3).sort((a, b) => dir * (a[k] - b[k]))[0];
  const strict = pick(active, 'gap', 1), generous = pick(active, 'gap', -1), aligned = pick(active, 'absGap', 1);
  const finder = active.filter(s => s.avgRecv != null && s.brought.length >= 2).sort((a, b) => b.avgRecv - a.avgRecv)[0];
  let html = `<h1>Les Knights</h1>
    <div class="awards">
      ${finder ? `<div class="aw"><span>🕵️</span><b>${esc(finder.m)}</b><small>meilleur dénicheur · ${f2(finder.avgRecv)}</small></div>` : ''}
      ${strict ? `<div class="aw"><span>🧐</span><b>${esc(strict.m)}</b><small>le plus sévère · ${strict.gap > 0 ? '+' : ''}${f2(strict.gap)}</small></div>` : ''}
      ${generous ? `<div class="aw"><span>🥰</span><b>${esc(generous.m)}</b><small>le plus généreux · +${f2(generous.gap)}</small></div>` : ''}
      ${aligned ? `<div class="aw"><span>🎯</span><b>${esc(aligned.m)}</b><small>le plus raccord avec le club</small></div>` : ''}
    </div>
    <div class="seg">${[['notes', 'Notes mises'], ['recues', 'Ses bouteilles']].map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  const list = st.slice().sort(tab === 'notes' ? (a, b) => (a.former - b.former) || b.n - a.n : (a, b) => (a.former - b.former) || (b.avgRecv ?? -1) - (a.avgRecv ?? -1));
  html += list.map(s => `<a class="card mcard" href="#m/${encodeURIComponent(s.m)}">
    <div class="row">${avatar(s.m)}<b class="grow">${esc(s.m)}${s.former ? ' <span class="small muted">· ancien</span>' : ''}</b>
      ${tab === 'notes' ? (s.avgGiven != null ? `<span class="small muted">moy.</span>${noteTag(s.avgGiven)}` : '') : (s.avgRecv != null ? `<span class="small muted">reçue</span>${noteTag(s.avgRecv)}` : '')}</div>
    <div class="small muted" style="margin-top:6px">${tab === 'notes'
      ? `${s.n} note${s.n > 1 ? 's' : ''}${s.gap != null ? ` · écart au club ${s.gap > 0 ? '+' : ''}${f2(s.gap)}` : ''}`
      : `${s.brought.length} bouteille${s.brought.length > 1 ? 's' : ''} apportée${s.brought.length > 1 ? 's' : ''} · 🏠 ${s.host} accueil${s.host > 1 ? 's' : ''} · 🎓 ${s.culture} culture`}</div>
    ${tab === 'notes' && s.best ? `<div class="small" style="margin-top:4px">❤️ ${esc(bottleTitle(S.bottles.find(b => b.id === s.best.bottleId) || {}))} ${noteTag(weighted(s.best))}</div>` : ''}
  </a>`).join('');
  html += `<p class="small muted">Écart au club : moyenne de (ma note − note du club) sur les bouteilles notées. Négatif = plus sévère que le club.</p>`;
  app.innerHTML = html;
  app.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { S.knightTab = b.dataset.tab; vKnights(); });
}

function vMember(name) {
  const s = memberStats().find(x => x.m === name);
  if (!s) return vKnights();
  const rs = S.ratings.filter(r => r.author === name).map(r => ({ r, b: S.bottles.find(b => b.id === r.bottleId) })).filter(x => x.b)
    .sort((a, b) => (weighted(b.r) ?? 0) - (weighted(a.r) ?? 0));
  app.innerHTML = `<a href="#knights" class="small">‹ Les Knights</a>
    <div class="row" style="margin:12px 0">${avatar(name, 44)}<div class="grow"><h1 style="margin:0">${esc(name)}</h1><div class="small muted">${s.former ? 'Ancien membre · ' : ''}${s.n} notes · ${s.brought.length} bouteilles apportées</div></div></div>
    <div class="grid3"><div class="stat"><b>${f2(s.avgGiven)}</b><span>note moyenne donnée</span></div><div class="stat"><b>${s.gap != null ? (s.gap > 0 ? '+' : '') + f2(s.gap) : '–'}</b><span>écart au club</span></div><div class="stat"><b>${f2(s.avgRecv)}</b><span>note de ses bouteilles</span></div></div>
    ${s.brought.length ? `<h2>Ses bouteilles (${s.brought.length})</h2>${s.brought.map(b => rowHtml(b)).join('')}` : ''}
    <h2>Ses notes (${rs.length})</h2>
    ${rs.map(({ r, b }) => rowHtml(b, isBlind(b) && name !== S.me.name ? '<span class="pill">🙈</span>' : `<span class="qp"><b>${f2(weighted(r))}</b><span class="small muted">club ${f2(clubNote(b).note)}</span></span>`)).join('') || '<div class="empty">Aucune note.</div>'}`;
}

// ============ vue : SAISONS (calendrier) ============
function vSeasons() {
  const groups = {};
  S.bottles.forEach(b => (groups[b.season || 'Sans saison'] ||= []).push(b));
  const order = seasons().concat(groups['Sans saison'] ? ['Sans saison'] : []);
  const next = S.bottles.filter(b => b.date > today()).sort((a, b) => a.date.localeCompare(b.date))[0];
  app.innerHTML = `<h1>Les saisons</h1>
    ${next ? `<div class="card next">📅 Prochaine soirée : <b>${fmtDate(next.date)}</b>${next.host ? ` chez ${esc(next.host)}` : ''}</div>` : ''}
    ${order.map(s => { const bs = groups[s].sort((a, b) => (b.date || '').localeCompare(a.date || '')); const notes = bs.map(b => clubNote(b).note).filter(x => x != null);
      return `<details class="card season" ${s === order[0] ? 'open' : ''}><summary><div class="row"><b class="grow">${esc(s)}</b><span class="small muted">${bs.length} soirée${bs.length > 1 ? 's' : ''}${notes.length ? ' · moy. ' + f2(mean(notes)) : ''}</span></div></summary>
        ${bs.map(b => { const c = clubNote(b); return `<a class="ev" href="#b/${b.id}"><div class="evd"><b>${b.date ? new Date(b.date + 'T12:00').getDate() : '?'}</b><span>${b.date ? new Date(b.date + 'T12:00').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }) : ''}</span></div>
          <div class="grow"><div class="t">${b.kind === 'session' ? '🎬 ' : flag(b.country) + ' '}${esc(bottleTitle(b))}</div>
          <div class="m">${[b.host && '🏠 ' + esc(b.host), b.bringer && '🍾 ' + esc(b.bringer), b.culture && '🎓 ' + esc(b.culture)].filter(Boolean).join('  ')}</div></div>
          ${b.kind === 'session' ? '' : isBlind(b) ? '<span class="pill">🙈</span>' : noteTag(c.note)}</a>`; }).join('')}</details>`; }).join('') || emptyCave()}`;
  const imp = $('#impEmpty'); if (imp) imp.onchange = e => e.target.files[0] && importNotion(e.target.files[0]);
}

// ============ import Notion ============
async function importNotion(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch { toast('⚠️ Fichier illisible'); return; }
  if (data.format !== 'whisky-knights-cave') { toast('⚠️ Ce n’est pas un fichier cave-import.json'); return; }
  const haveB = new Set(S.bottles.map(b => b.id)), haveR = new Set(S.ratings.map(r => r.id));
  const nb = data.bottles.filter(b => !haveB.has(b.id)), nr = data.ratings.filter(r => !haveR.has(r.id));
  const np = Object.entries(data.photos || {}).filter(([id]) => !haveB.has(id.split('_')[0]));
  sheet(`<h1 style="margin-top:0">Importer l’historique Notion</h1>
    <p>${nb.length} fiche${nb.length > 1 ? 's' : ''} (bouteilles et soirées), ${nr.length} notes et ${np.length} photos à importer.${data.bottles.length - nb.length ? `<br><span class="small muted">${data.bottles.length - nb.length} fiches déjà présentes seront ignorées.</span>` : ''}</p>
    <p class="small muted">Prénoms convertis : ${Object.entries(data.memberMap || {}).map(([a, b]) => `${esc(a)} → ${esc(b)}`).join(', ')}. Vous serez indiqué comme auteur des fiches et des photos importées ; chaque note reste au nom de son membre.</p>
    <div class="bar" style="height:10px;margin:12px 0"><i id="ib" style="width:0%"></i></div><p class="small" id="it"></p>
    <button class="btn primary block" id="go" ${nb.length + nr.length + np.length ? '' : 'disabled'}>Importer</button>`, (el, close) => {
    $('#go', el).onclick = async () => {
      const go = $('#go', el); go.disabled = true; go.textContent = 'Import en cours…';
      const items = [
        ...nb.map(({ id, ...b }) => ['bottles', id, { ...b, author: S.me.name, at: b.date ? Date.parse(b.date + 'T20:00') : Date.now(), imported: Date.now() }]),
        ...nr.map(({ id, ...r }) => ['ratings', id, { ...r, at: r.at ? Date.parse(r.at + 'T20:00') : Date.now() }]),
        ...np.map(([id, d]) => ['photos', id, { data: d, author: S.me.name, at: Date.now() }]),
      ];
      try {
        await store.saveMany(items, (done, total) => { $('#ib', el).style.width = (done / total * 100) + '%'; $('#it', el).textContent = `${done} / ${total}`; });
        close(); toast(`✓ Import terminé : ${nb.length} fiches, ${nr.length} notes`, 4000); location.hash = 'cave';
      } catch (e) { $('#it', el).textContent = '⚠️ ' + (e.code === 'permission-denied' ? 'Refusé par Firestore : avez-vous publié les nouvelles règles ?' : e.message); go.disabled = false; go.textContent = 'Réessayer'; }
    };
  });
}

// ============ exports ============
function download(name, content, type) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const csvq = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
const dec = v => v == null ? '' : String(Math.round(v * 100) / 100).replace('.', ',');
function exportCsv() {
  const bh = ['date', 'saison', 'marque', 'nom', 'type', 'pays', 'region', 'degres', 'prix', 'accueil', 'bouteille', 'culture', 'note_club', 'packaging', 'nez', 'gout', 'qp', 'nb_notes', 'commentaires'];
  const br = bottlesOnly().map(b => { const c = clubNote(b); return [b.date, b.season, b.brand, b.label, b.type, b.country, b.region, dec(b.abv), dec(b.price), b.host, b.bringer, b.culture, dec(c.note), dec(c.pack), dec(c.nose), dec(c.taste), dec(c.qp), c.n, b.comment].map(csvq).join(';'); });
  download('cave-knights-bouteilles.csv', '﻿' + bh.join(';') + '\n' + br.join('\n'), 'text/csv');
  const rh = ['date', 'bouteille', 'membre', 'packaging', 'nez', 'gout', 'note_globale', 'commentaire'];
  const rr = S.ratings.map(r => { const b = S.bottles.find(x => x.id === r.bottleId) || {}; return [b.date, bottleTitle(b), r.author, dec(r.pack), dec(r.nose), dec(r.taste), dec(weighted(r)), r.comment].map(csvq).join(';'); });
  setTimeout(() => download('cave-knights-notes.csv', '﻿' + rh.join(';') + '\n' + rr.join('\n'), 'text/csv'), 400);
}
function exportJson() {
  download('cave-knights-sauvegarde.json', JSON.stringify({ exportedAt: new Date().toISOString(), bottles: S.bottles.map(({ thumb, _pending, ...b }) => b), ratings: S.ratings.map(({ _pending, ...r }) => r) }, null, 2), 'application/json');
}

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
boot();
