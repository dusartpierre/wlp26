"""Construit cave-import.json à partir des deux exports Notion (La Cave des Knights + Le grand livre des notes).
Usage : python3 -I build_import.py <dossier_export_cave> <dossier_export_notes> <sortie.json>
"""
import base64, csv, glob, io, json, os, re, sys, unicodedata
from urllib.parse import unquote
from PIL import Image, ImageOps

CAVE_DIR, NOTES_DIR, OUT = sys.argv[1:4]

# Prénoms Notion -> prénoms de l'appli (config.js > MEMBERS)
MEMBER_MAP = {'Johann': 'John', 'Thomas A': 'Tom', 'Valerio': 'Valério'}
mem = lambda n: MEMBER_MAP.get(n.strip(), n.strip()) if n else ''

MONTHS = {m: i + 1 for i, m in enumerate(['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'])}

def fdate(s):
    m = re.match(r'\s*(\d{1,2}) (\w+) (\d{4})', s or '')
    if not m: return ''
    return f'{int(m[3]):04d}-{MONTHS[m[2]]:02d}-{int(m[1]):02d}'

def num(s):
    s = (s or '').replace('\xa0', '').replace('€', '').replace(',', '.').strip()
    try: return round(float(s), 2)
    except ValueError: return None

def person(s):  # "Pierre (https://...)" -> "Pierre"
    return mem(re.sub(r'\s*\(https?://[^)]*\)', '', s or '').split(',')[0]) if s else ''

def notion_id(s):
    m = re.findall(r'([0-9a-f]{32})', s or '')
    return m[-1] if m else ''

def parse_md(path):
    """Renvoie (titre, propriétés, corps) d'une page Notion exportée."""
    txt = open(path, encoding='utf-8').read()
    lines = txt.split('\n')
    title = lines[0].lstrip('# ').strip()
    props, i = {}, 1
    while i < len(lines) and not lines[i].strip(): i += 1
    while i < len(lines) and lines[i].strip():
        k, _, v = lines[i].partition(': ')
        props[k.strip()] = v.strip(); i += 1
    body = '\n'.join(lines[i:]).strip()
    body = re.sub(r'^# .*\n', '', body).strip()            # titre répété
    return title, props, body

def clean_body(body):
    body = re.sub(r'!\[[^\]]*\]\([^)]*\)', '', body)       # images (gérées à part)
    body = re.sub(r'\[([^\]]+)\]\((https?://[^)]+)\)', r'\1 : \2', body)
    return re.sub(r'\n{3,}', '\n\n', body).strip()

def to_data_url(img, max_px, max_chars, q=0.8):
    scale = min(1, max_px / max(img.size))
    for _ in range(10):
        im = img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.LANCZOS) if scale < 1 else img
        b = io.BytesIO(); im.save(b, 'JPEG', quality=int(q * 100), optimize=True)
        out = 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()
        if len(out) <= max_chars: return out
        if q > 0.5: q -= 0.1
        else: scale *= 0.8
    raise ValueError('image trop lourde')

def load_img(path):
    im = ImageOps.exif_transpose(Image.open(path))
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA'); bg = Image.new('RGB', im.size, (255, 255, 255)); bg.paste(im, mask=im.split()[-1]); im = bg
    return im.convert('RGB')

# ---------------- bouteilles / sessions ----------------
bottles, photos, warnings = [], {}, []
page_dir = glob.glob(os.path.join(CAVE_DIR, '**', 'La Cave des Knights'), recursive=True)
page_dir = [p for p in page_dir if os.path.isdir(p)][0]
base_dir = os.path.dirname(page_dir)

def local_file(rel):
    rel = unquote(rel.strip())
    for cand in (os.path.join(page_dir, rel), os.path.join(base_dir, rel)):
        if os.path.isfile(cand): return cand
    return None

for md in sorted(glob.glob(os.path.join(page_dir, '*.md'))):
    title, p, body = parse_md(md)
    bid = notion_id(os.path.basename(md))
    title = title.replace('🇺🇸', '').strip()
    if not p.get('Marque') and not p.get('Accueil'):
        warnings.append(f'Page ignorée (vide) : {title or "Sans titre"} {p.get("Date", "")}'); continue
    kind = 'bottle' if p.get('Marque') else 'session'
    b = {
        'id': bid, 'kind': kind, 'name': title,
        'brand': p.get('Marque', ''), 'label': p.get('Nom du whisky', ''),
        'type': p.get('Type', ''), 'country': p.get('Pays', ''), 'region': p.get('Région', ''),
        'abv': num(p.get('Degrés')), 'price': num(p.get('Prix')),
        'date': fdate(p.get('Date')), 'season': p.get('Saison', ''),
        'host': person(p.get('Accueil')), 'bringer': person(p.get('Bouteille')), 'culture': person(p.get('Culture')),
        'comment': p.get('Commentaires', ''), 'noseComment': p.get('Commentaire nez', ''), 'tasteComment': p.get('Commentaire goût', ''),
        'story': '\n\n'.join(x for x in [p.get('Description', ''), clean_body(body)] if x),
        'slides': p.get('Slides', '') or (re.search(r'https://docs\.google\.com/presentation[^\s)]+', body) or [None])[0] or '',
        'legacyNote': num(p.get('Note')), 'source': 'notion',
    }
    # photo principale
    ph = p.get('Photo Bouteille', '')
    if ph.startswith('http'):
        b['photoUrl'] = ph
    elif ph:
        f = local_file(ph)
        if f:
            im = load_img(f)
            b['thumb'] = to_data_url(im, 320, 40_000, 0.7)
            photos[bid] = to_data_url(im, 1400, 700_000, 0.8)
            b['hasPhoto'] = True
        else: warnings.append(f'Photo introuvable : {title} -> {ph}')
    # autres photos (souvenirs de la soirée) : propriété + images dans le corps
    extras = [x for x in (p.get('Autres photos', '').split(', ') if p.get('Autres photos') else [])]
    extras += re.findall(r'!\[[^\]]*\]\(([^)]+)\)', body)
    seen, k = set(), 0
    for rel in extras:
        f = local_file(rel)
        if not f or f in seen: continue
        seen.add(f); k += 1
        im = load_img(f)
        photos[f'{bid}_x{k}'] = to_data_url(im, 1400, 700_000, 0.8)
        if 'thumb' not in b and 'photoUrl' not in b:   # pas de photo bouteille : la 1re photo de soirée sert de vignette
            b['thumb'] = to_data_url(im, 320, 40_000, 0.7)
    b['extra'] = k
    bottles.append(b)

by_id = {b['id']: b for b in bottles}

# ---------------- notes ----------------
W = {'pack': 0.1, 'nose': 0.3, 'taste': 0.6}
def glob_note(r):
    parts = [(W[k], r[k]) for k in W if r.get(k) is not None]
    return round(sum(w * v for w, v in parts) / sum(w for w, _ in parts), 2) if parts else None

ratings, rid_seen = [], set()
for md in sorted(glob.glob(os.path.join(NOTES_DIR, '*.md'))):
    title, p, body = parse_md(md)
    bid = notion_id(p.get('Whisky', ''))
    member = person(p.get('Membre'))
    if bid in by_id and not member and num(p.get('Packaging')) is not None:
        # anciennes saisons : note packaging donnée par le club, sans membre
        by_id[bid].setdefault('packClub', []).append(num(p.get('Packaging'))); continue
    if not bid or not member:
        warnings.append(f'Note sans whisky/membre ignorée : {os.path.basename(md)}'); continue
    if bid not in by_id:
        warnings.append(f'Note sur une bouteille absente de la cave : {p.get("Whisky")}'); continue
    r = {'bottleId': bid, 'author': member, 'pack': num(p.get('Packaging')), 'nose': num(p.get('Nez')), 'taste': num(p.get('Goût')),
         'legacy': True}
    comment = clean_body(body)
    if title and title != 'Sans titre' and comment: comment = f'« {title} »\n{comment}'
    if comment: r['comment'] = comment
    r['global'] = glob_note(r)
    leg = num(p.get('Note globale'))
    if leg is not None and r['global'] is not None and abs(leg - r['global']) > 0.02:
        warnings.append(f'Écart note globale {by_id[bid]["name"]} / {member} : Notion {leg} vs calcul {r["global"]}')
    slug = unicodedata.normalize('NFD', member).encode('ascii', 'ignore').decode().lower().replace(' ', '-')
    rid = f'{bid}_{slug}'
    if rid in rid_seen:
        n = 2
        while f'{rid}-{n}' in rid_seen: n += 1
        rid = f'{rid}-{n}'; warnings.append(f'Double note {by_id[bid]["name"]} / {member} (gardées toutes les deux)')
    rid_seen.add(rid); r['id'] = rid
    r['at'] = by_id[bid]['date']
    ratings.append(r)

# contrôle : note bouteille recalculée vs Notion
for b in bottles:
    rs = [r for r in ratings if r['bottleId'] == b['id']]
    if not rs: continue
    vals = {k: [r[k] for r in rs if r[k] is not None] + (b.get('packClub', []) if k == 'pack' else []) for k in W}
    avgk = {k: sum(v) / len(v) if v else None for k, v in vals.items()}
    calc = glob_note(avgk)
    if b['legacyNote'] is not None and calc is not None and abs(calc - b['legacyNote']) > 0.02:
        warnings.append(f'Écart note bouteille {b["name"]} : Notion {b["legacyNote"]} vs calcul {calc}')

out = {'format': 'whisky-knights-cave', 'version': 1, 'exportedAt': __import__('datetime').date.today().isoformat(),
       'memberMap': MEMBER_MAP, 'bottles': bottles, 'ratings': ratings, 'photos': photos}
json.dump(out, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(f'{len(bottles)} fiches ({sum(b["kind"] == "bottle" for b in bottles)} bouteilles), {len(ratings)} notes, {len(photos)} photos, '
      f'{os.path.getsize(OUT) / 1e6:.1f} Mo')
print('\n'.join(warnings))
