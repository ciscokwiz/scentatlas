"""Build the compact JSON data the site loads.

Usage: python3 -I scripts/build_data.py <raw_dir> <out_dir>

Inputs (download with scripts/fetch-data.sh; every file is checksum-verified there):
  perfume_database.csv       ~38k Fragrantica perfumes, scraped ~2017 (pyramid, ordered accords)
  perfume_data_combined.csv  ~480 perfumes (accord strengths, labelled longevity/sillage votes)
  fragrantica_2024.csv       ~70k Fragrantica perfumes up to 2024 (accords, notes in the summary text)
  fragrantica_recent.csv     ~33k Fragrantica perfumes up to 2026 (weighted notes/accords, longevity
                             and sillage averages, vote counts): the most recent and most detailed source
  parfumo_2024.csv           ~59k Parfumo perfumes up to 2024 (fills in perfumes Fragrantica lacks)
  scento_perfumes.csv        ~1.5k perfumes with plain-language descriptions (CC BY 4.0)
  scento_materials.csv       ~420 raw materials with plain smell descriptions (CC BY 4.0)
  scripts/curated.json       hand-added entries

Later, richer sources override earlier ones for the same perfume (matched on brand + name).

Security: all input is treated as untrusted text. Files are read only with the csv/json parsers
(plus ast.literal_eval for list literals, which cannot run code); every string is cleaned
(control characters, HTML tags and spreadsheet-formula prefixes removed, length capped); numbers
are range-checked; only https links to expected hosts are kept. A summary of anything rejected
is printed at the end.

Outputs:
  <out_dir>/index.json       search index  {notes, accords, items:[[id,name,brand,year,gender,pop]]}
  <out_dir>/shards/<n>.json  full detail, SHARD perfumes per file (id // SHARD)
  <out_dir>/notes.json       note -> most popular perfume ids containing it
  <out_dir>/note_info.json   note -> {smell, family, origin} from Scento (CC BY 4.0)
"""
import ast, collections, csv, json, math, os, re, sys, unicodedata

SHARD = 2000
MAX_YEAR = 2026
raw_dir, out_dir = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
csv.field_size_limit(2_000_000)
REJECTED = collections.Counter()

# ---------------------------------------------------------------------------
# Cleaning (security + consistency)

CTRL = re.compile(r'[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]')
TAG = re.compile(r'<[^>]{0,200}>')
DANGER = re.compile(r'javascript:|data:text/html|<\s*script|on\w+\s*=', re.I)


def clean(s, maxlen=120):
    """Untrusted text -> safe plain text (or '')."""
    if s is None:
        return ''
    s = unicodedata.normalize('NFC', str(s))
    if DANGER.search(s):
        REJECTED['dangerous text pattern'] += 1
        s = DANGER.sub('', s)
    s = TAG.sub('', CTRL.sub('', s))
    s = re.sub(r'\s+', ' ', s).strip()
    while s[:1] in ('=', '@', '\t'):  # spreadsheet formula injection
        REJECTED['formula prefix'] += 1
        s = s[1:].lstrip()
    if len(s) > maxlen:
        REJECTED['over-long text trimmed'] += 1
        s = s[:maxlen].rsplit(' ', 1)[0]
    return '' if s.upper() in ('NA', 'NAN', 'NONE', 'NULL') else s


def num(s, lo, hi, cast=float):
    try:
        v = cast(float(s))
    except (TypeError, ValueError):
        return None
    if isinstance(v, float) and not math.isfinite(v):
        return None
    if not lo <= v <= hi:
        REJECTED['number out of range'] += 1
        return None
    return v


def year_of(s):
    m = re.match(r'\s*(\d{4})', str(s or ''))
    return num(m.group(1), 1700, MAX_YEAR, int) if m else None


def safe_json(s, default=None):
    try:
        return json.loads(s) if s and len(s) < 200_000 else default
    except Exception:
        return default


def safe_lit(s, default=None):
    # literal_eval only builds Python literals (lists, dicts, strings, numbers); it cannot call anything.
    try:
        return ast.literal_eval(s) if s and len(s) < 200_000 else default
    except Exception:
        return default


NOTE_ALIASES = {
    'vanille': 'vanilla', 'vanila': 'vanilla', 'vetyver': 'vetiver', 'myrhh': 'myrrh',
    'sandalowood': 'sandalwood', 'oak moss': 'oakmoss', 'woodsy notes': 'woody notes',
    'citruses': 'citrus', 'clove': 'cloves', 'juniper berries': 'juniper', 'orris': 'orris root',
    'agarwood (oud)': 'oud', 'agarwood': 'oud', 'big strawberry': 'strawberry',
    'ambrette (musk mallow)': 'ambrette', 'cypriol oil or nagarmotha': 'cypriol',
    'woodsy note': 'woody notes', 'oriental notes': 'amber notes', 'tonka': 'tonka bean',
    'tonka beans': 'tonka bean', 'pink peppercorn': 'pink pepper', 'musks': 'musk',
    'white musks': 'white musk', 'mandarin': 'mandarin orange', 'sea notes': 'sea notes',
}
ACCORD_ALIASES = {
    'caramela': 'caramel', 'anis': 'anise', 'vinil': 'vinyl', 'asphault': 'asphalt',
    # Parfumo / Scento vocabulary -> Fragrantica-style accords used by the site
    'spicy': 'warm spicy', 'leathery': 'leather', 'animal': 'animalic', 'oriental': 'amber',
    'resinous': 'balsamic', 'creamy': 'milky', 'chypre': 'mossy', 'fougère': 'aromatic',
    'fougere': 'aromatic', 'citrusy': 'citrus', 'warm': 'amber', 'clean': 'soapy',
    'synthetic': None, 'main accords': None, 'rich': None,
}
LON_KEYS = ['very weak', 'weak', 'moderate', 'long lasting', 'eternal']
SIL_KEYS = ['intimate', 'moderate', 'strong', 'enormous']
GENDER = {'for women': 'f', 'for men': 'm', 'for women and men': 'u', 'female': 'f', 'male': 'm', 'unisex': 'u'}


def clean_note(n):
    n = clean(n, 60).lower().strip(' .;:-*')
    n = NOTE_ALIASES.get(n, n)
    if not n or not re.search(r'[a-zÀ-ɏ]', n):
        return None
    return n


def clean_accord(a):
    a = clean(a, 40).lower()
    a = ACCORD_ALIASES.get(a, a)
    return a or None


def split_list(s, seps=r',|\|'):
    return [x for x in re.split(seps, s or '') if x.strip()]


def weighted(s):
    """'Pear:32|Pink Pepper:15' -> names ordered by weight (strongest first)."""
    out = []
    for i, part in enumerate(split_list(s, r'\|')):
        name, _, w = part.rpartition(':')
        if not name:
            name, w = part, '0'
        out.append((num(w, 0, 1000) or 0, -i, name))
    return [n for _, _, n in sorted(out, reverse=True)]


def ranked_strengths(names):
    # Sources that only give accord order: approximate bar widths from rank.
    return [(a, round(100 - i * 9.5, 1)) for i, a in enumerate(names) if a][:10]


def fold(s):
    s = ''.join(c for c in unicodedata.normalize('NFKD', s.lower()) if not unicodedata.combining(c))
    s = s.replace('&', ' and ').replace("'", '').replace('’', '')
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


BRAND_TAIL = re.compile(r'( (perfumes?|parfums?|paris|fragrances?|beauty|cosmetics|london|milano|new york|italia))+$')
BRAND_FIX = {'maison martin margiela': 'maison margiela', 'christian dior': 'dior', 'ysl': 'yves saint laurent',
             'thierry mugler': 'mugler', 'paco rabanne': 'rabanne', 'parfums de marly': 'de marly',
             'dolce and gabbana': 'dolce gabbana', 'd and g': 'dolce gabbana', 'by kilian': 'kilian'}


def key_fold(s):
    # Matching key that survives sources which lost their accented letters ('Idéal' vs 'Id al'):
    # accented letters are dropped entirely before folding.
    return fold(re.sub(r'[^\x00-\x7f’]', '', unicodedata.normalize('NFC', s)))


def brand_key(b):
    k = re.sub(r'\band\b', ' ', key_fold(b)).strip()
    k = BRAND_FIX.get(k, k)
    k = re.sub(r'^(parfums|perfumes) (?=\w)', '', k)
    k = BRAND_TAIL.sub('', k) or k
    return BRAND_FIX.get(k, k).replace(' ', '')


def brand_key2(b):
    """Like brand_key, but with accented letters flattened ('Estée' -> 'estee') instead of dropped."""
    k = re.sub(r'\band\b', ' ', fold(b)).strip()
    k = BRAND_FIX.get(k, k)
    k = re.sub(r'^(parfums|perfumes) (?=\w)', '', k)
    k = BRAND_TAIL.sub('', k) or k
    return BRAND_FIX.get(k, k).replace(' ', '')


def pkeys(brand, name):
    # Two keys per perfume: accents dropped ('Id al') and accents flattened ('Ideal').
    return tuple(dict.fromkeys((brand_key(brand) + '|' + key_fold(name).replace(' ', ''),
                                brand_key2(brand) + '|' + fold(name).replace(' ', ''))))


def pkey(brand, name):
    return brand_key(brand) + '|' + key_fold(name).replace(' ', '')


FRAG_ID = re.compile(r'fragrantica\.[a-z.]+/perfume/[^/]+/[^/]*?-(\d{1,7})\.html')
FIMG_ID = re.compile(r'^https://fimgs\.net/mdimg/perfume/375x500\.(\d{1,7})\.jpg$')


def frag_id(url):
    m = FRAG_ID.search(url or '')
    return int(m.group(1)) if m else None


perfumes = {}  # pkey -> record
by_fid = {}    # Fragrantica id -> record (the most reliable way to match Fragrantica-based sources)


def blank(name, brand, src):
    return {'n': name, 'b': brand, 'y': None, 'g': None, 'r': None, 't': [], 'm': [], 'bs': [], 'fl': [],
            'a': [], 'as': 'rank', 'lon': None, 'sil': None, 'vs': None, 'pop': 0, 'src': src, 'fid': None}


def upsert(brand, name, src, fid=None):
    name, brand = clean(name), clean(brand, 80)
    if not name or not brand:
        REJECTED['missing name or brand'] += 1
        return None, False
    if fid and fid in by_fid:
        return by_fid[fid], False
    ks = pkeys(brand, name)
    p = next((perfumes[k] for k in ks if k in perfumes), None)
    new = p is None
    if new:
        p = blank(name, brand, src)
    for k in ks:
        perfumes.setdefault(k, p)
    if fid:
        p['fid'] = p['fid'] or fid
        by_fid[fid] = p
    return p, new


def has_notes(p):
    return bool(p['t'] or p['m'] or p['bs'] or p['fl'])


def synth_votes(avg, levels, n):
    """A vote histogram whose mean equals `avg` (sources that publish averages only)."""
    if avg is None or n < 10:
        return None
    lo = min(max(int(math.floor(avg)), 1), levels)
    frac = avg - lo
    v = [0] * levels
    v[lo - 1] = round(n * (1 - frac))
    if lo < levels:
        v[lo] = round(n * frac)
    return v


count = collections.Counter()

# 1) ~2017 Fragrantica scrape ---------------------------------------------------
with open(os.path.join(raw_dir, 'perfume_database.csv'), encoding='utf-8-sig') as f:
    for x in csv.DictReader(f):
        p, new = upsert(x['brand'], x['perfume'], 'db')
        if not p:
            continue
        notes = safe_json(x['notes'])
        if isinstance(notes, dict):
            p['t'] = [clean_note(v) for v in (notes.get('top') or [])]
            p['m'] = [clean_note(v) for v in (notes.get('middle') or [])]
            p['bs'] = [clean_note(v) for v in (notes.get('base') or [])]
        elif isinstance(notes, list):
            p['fl'] = [clean_note(v) for v in notes]
        p['a'] = ranked_strengths([clean_accord(a) for a in (safe_json(x['main_accords_dirty'], []) or [])])
        lon = [int(v) for v in (safe_json(x['longevity'], []) or []) if str(v).isdigit()]
        sil = [int(v) for v in (safe_json(x['sillage'], []) or []) if str(v).isdigit()]
        p['y'] = year_of(x['launch_year'])
        # Vote order in this source is not labelled and looks inconsistent: flag it.
        p['lon'] = lon if len(lon) == 5 and sum(lon) >= 10 else None
        p['sil'] = sil if len(sil) == 4 and sum(sil) >= 10 else None
        p['vs'] = 'unlabelled'
        p['pop'] = sum(lon) + sum(sil)
        count['db'] += 1

# 2) Fragrantica to 2024 (Kaggle mirror) ------------------------------------------
LIST_SPLIT = r',\s*|\s+and\s+'


def parse_summary_notes(text):
    t = m = b = fl = []
    mt = re.search(r'Top notes? (?:is|are) (.+?); middle notes? (?:is|are) (.+?); base notes? (?:is|are) (.+?)\.(?:\s|$)', text)
    if mt:
        t, m, b = (re.split(LIST_SPLIT, g) for g in mt.groups())
    else:
        mf = re.search(r'(?:features|Notes? (?:is|are)) (.+?)\.(?:\s|$)', text)
        if mf:
            fl = re.split(LIST_SPLIT, mf.group(1))
    return t, m, b, fl


def strip_tail(full, alnum_target):
    """Cut a brand that was glued onto the end of a name ('9am Afnan' -> '9am', 'Afnan')."""
    seen, i = '', len(full)
    while i > 0 and len(seen) < len(alnum_target):
        i -= 1
        c = fold(full[i]).replace(' ', '')
        seen = c + seen
    if seen == alnum_target:
        return full[:i].strip(), full[i:].strip()
    return full.strip(), None


# House names as spelled by the other Fragrantica sources, indexed by last word, so a brand glued to
# the end of a name can be recognised with its accents intact (web addresses drop them).
KNOWN_BRANDS = collections.defaultdict(collections.Counter)
for fn, col in (('perfume_database.csv', 'brand'), ('fragrantica_recent.csv', 'brand')):
    with open(os.path.join(raw_dir, fn), encoding='utf-8-sig') as f:
        for x in csv.DictReader(f):
            b = clean(x[col], 80)
            if b:
                KNOWN_BRANDS[fold(b).split(' ')[-1] if fold(b) else ''][b] += 1


def skeleton(b):
    # Web addresses replace accented letters with '-': 'Estée Lauder' -> 'Est-e-Lauder'.
    return re.sub(r'[^a-z0-9]', '', re.sub(r'[^\x00-\x7f]', '', b.lower()))


SKELETON = {}
_votes = collections.Counter()
for group in KNOWN_BRANDS.values():
    for b, c in group.items():
        _votes[b] += c * (3 if re.search(r'[^\x00-\x7f]', b) else 1)
for b, _ in sorted(_votes.items(), key=lambda kv: (-kv[1], kv[0])):
    SKELETON.setdefault(skeleton(b), b)


def split_brand(full, url_brand):
    url_brand = SKELETON.get(skeleton(url_brand), url_brand)
    ff = fold(full)
    words = ff.split(' ')
    url_alnum = fold(url_brand).replace(' ', '')
    for b in sorted(KNOWN_BRANDS.get(words[-1] if words else '', {}), key=lambda b: (-len(b), b)):
        # Same house if the glued-on suffix is that brand and its start agrees with the web address.
        if ff.endswith(' ' + fold(b)) and fold(b).replace(' ', '')[:4] == url_alnum[:4]:
            name, _ = strip_tail(full, fold(b).replace(' ', ''))
            if name:
                return name, b
    return strip_tail(full, fold(url_brand).replace(' ', ''))


with open(os.path.join(raw_dir, 'fragrantica_2024.csv'), encoding='utf-8-sig') as f:
    for x in csv.DictReader(f):
        url, full, gender = x['url'], clean(x['Name'], 200), clean(x['Gender'], 40)
        fid = frag_id(url)
        mb = re.search(r'/perfume/([^/]+)/', url or '')
        if not fid or not mb:
            REJECTED['fragrantica_2024: bad url'] += 1
            continue
        if gender and full.endswith(gender):
            full = full[: -len(gender)]
        url_brand = mb.group(1).replace('-', ' ')
        name, brand = split_brand(full, url_brand)
        p, new = upsert(brand or url_brand, name, 'fra24', fid)
        if not p:
            continue
        desc = clean(x['Description'], 4000)
        t, m, b, fl = parse_summary_notes(desc)
        if t or m or b or fl:
            if new or not has_notes(p):
                p['t'], p['m'], p['bs'], p['fl'] = ([clean_note(v) for v in L] for L in (t, m, b, fl))
        acc = [clean_accord(a) for a in (safe_lit(x['Main Accords'], []) or []) if isinstance(a, str)]
        if acc and (new or not p['a']):
            p['a'] = ranked_strengths(acc)
        my = re.search(r'launched in (\d{4})', desc)
        p['y'] = p['y'] or (year_of(my.group(1)) if my else None)
        p['g'] = GENDER.get(gender.lower(), p['g'])
        p['r'] = num(x['Rating Value'], 0, 5) or p['r']
        p['pop'] = max(p['pop'], num(x['Rating Count'], 0, 10_000_000, int) or 0)
        count['fra24 ' + ('new' if new else 'merged')] += 1

# 3) Small rich set: accord strengths + labelled votes ----------------------------
with open(os.path.join(raw_dir, 'perfume_data_combined.csv'), encoding='utf-8-sig') as f:
    for x in csv.DictReader(f):
        mi = FIMG_ID.match(clean(x['image'], 200))
        p, new = upsert(x['company'], x['name'], 'rich', int(mi.group(1)) if mi else None)
        if not p:
            continue
        acc = safe_lit(x['main accords'], {}) or {}
        lon = safe_lit(x['longevity'], {}) or {}
        sil = safe_lit(x['sillage'], {}) or {}
        if not all(isinstance(d, dict) for d in (acc, lon, sil)):
            REJECTED['rich: malformed row'] += 1
            continue
        m = re.search(r'launched in (\d{4})', x.get('description') or '')
        p.update({
            'g': GENDER.get(clean(x['for_gender']).lower(), p['g']),
            'r': num(x['rating'], 0, 5),
            't': [clean_note(v) for v in (safe_lit(x['top notes'], []) or [])],
            'm': [clean_note(v) for v in (safe_lit(x['middle notes'], []) or [])],
            'bs': [clean_note(v) for v in (safe_lit(x['base notes'], []) or [])],
            'a': [(clean_accord(k), num(v, 0, 100) or 0) for k, v in acc.items()], 'as': 'strength',
            'lon': [num(lon.get(k, 0), 0, 1e7, int) or 0 for k in LON_KEYS] if lon else None,
            'sil': [num(sil.get(k, 0), 0, 1e7, int) or 0 for k in SIL_KEYS] if sil else None,
            'vs': 'labelled',
            'pop': max(p['pop'], num(x['number_votes'], 0, 1e7, int) or 0),
        })
        if m and not p['y']:
            p['y'] = year_of(m.group(1))
        count['rich'] += 1

# 4) Fragrantica to 2026: most recent + most detailed, overrides ------------------
with open(os.path.join(raw_dir, 'fragrantica_recent.csv'), encoding='utf-8-sig') as f:
    for x in csv.DictReader(f):
        p, new = upsert(x['brand'], x['name'], 'fra26', frag_id(x['url']) or num(x['id'], 1, 9_999_999, int))
        if not p:
            continue
        p['n'], p['b'] = clean(x['name']) or p['n'], clean(x['brand'], 80) or p['b']  # newest spelling
        t, m, b, fl = (weighted(x[k]) for k in ('notes_top', 'notes_middle', 'notes_base', 'notes_flat'))
        if t or m or b or fl:
            p['t'], p['m'], p['bs'], p['fl'] = ([clean_note(v) for v in L] for L in (t, m, b, fl))
        acc = []
        for part in split_list(x['accords'], r'\|'):
            name, _, w = part.rpartition(':')
            acc.append((clean_accord(name or part), num(w, 0, 100) or 0))
        if acc:
            p['a'], p['as'] = acc[:10], 'strength'
        votes = num(x['vote_count'], 0, 10_000_000, int) or 0
        lon = synth_votes(num(x['longevity_avg'], 1, 5), 5, votes)
        sil = synth_votes(num(x['sillage_avg'], 1, 4), 4, votes)
        if lon and sil:
            p['lon'], p['sil'], p['vs'] = lon, sil, 'labelled'
        p['y'] = year_of(x['year']) or p['y']
        p['g'] = GENDER.get(clean(x['gender']).lower(), p['g'])
        p['r'] = num(x['rating_avg'], 0, 5) or p['r']
        p['pop'] = max(p['pop'], votes)
        p['src'] = 'fra26'
        count['fra26 ' + ('new' if new else 'merged')] += 1

# 5) Parfumo: adds perfumes Fragrantica sets lack -----------------------------------
CONC = re.compile(r'\s+(eau de (toilette|parfum|cologne)|extrait( de parfum)?|parfum|cologne|edt|edp|elixir)$', re.I)
with open(os.path.join(raw_dir, 'parfumo_2024.csv'), encoding='utf-8-sig') as f:
    for x in csv.DictReader(f):
        name, brand = clean(x['Name']), clean(x['Brand'], 80)
        if not name or not brand:
            continue
        # Some Parfumo names carry '<Brand> <year> <concentration>': 'Sauvage Dior 2015 Eau de Toilette'.
        conc = ''
        mm = re.match(r'^(.+?) ' + re.escape(brand) + r'(?: \d{4})?(?: (.+))?$', name, re.I)
        if mm:
            name, conc = mm.group(1).strip(), (mm.group(2) or '').strip()
        base = CONC.sub('', name).strip() or name
        keys = [k for n in (f'{name} {conc}'.strip(), name, base) for k in pkeys(brand, n)]
        hit = next((perfumes[k] for k in keys if k in perfumes), None)
        if conc:
            name = f'{name} {conc}'
        if hit:  # already known: only fill gaps
            p = hit
            p['y'] = p['y'] or year_of(x['Release_Year'])
            count['parfumo merged'] += 1
            continue
        t, m, b = (split_list(x[c], r',') for c in ('Top_Notes', 'Middle_Notes', 'Base_Notes'))
        acc = [clean_accord(a) for a in split_list(x['Main_Accords'], r',')]
        if len(t) + len(m) + len(b) < 2 and not acc:
            continue  # nothing useful to show
        p, _ = upsert(brand, name, 'parfumo')
        p['t'], p['m'], p['bs'] = ([clean_note(v) for v in L] for L in (t, m, b))
        p['a'] = ranked_strengths(acc)
        p['y'] = year_of(x['Release_Year'])
        r = num(x['Rating_Value'], 0, 10)
        p['r'] = round(r / 2, 2) if r else None
        p['pop'] = num(x['Rating_Count'], 0, 10_000_000, int) or 0
        count['parfumo new'] += 1

# 6) Scento (CC BY 4.0): plain-language descriptions ------------------------------
with open(os.path.join(raw_dir, 'scento_perfumes.csv'), encoding='utf-8-sig') as f:
    for x in csv.DictReader(f):
        p, new = upsert(x['house'], x['name'], 'scento')
        if not p:
            continue
        if new or not has_notes(p):
            p['t'], p['m'], p['bs'] = ([clean_note(v) for v in split_list(x[c], ';')] for c in ('top_notes', 'heart_notes', 'base_notes'))
            if not has_notes(p):
                p['fl'] = [clean_note(v) for v in split_list(x['notes'], ';')]
        if new or not p['a']:
            p['a'] = ranked_strengths([clean_accord(a) for a in split_list(x['character'], ';')])
            p['pop'] = max(p['pop'], 2000 - (num(x['popularity_rank'], 1, 100000, int) or 2000))
        p['y'] = p['y'] or year_of(x['year'])
        d = clean(x['description'], 400)
        if d:
            p['d'] = d
        url = clean(x['url'], 200)
        if url.startswith('https://www.scento.com/'):
            p['du'] = url
        count['scento ' + ('new' if new else 'merged')] += 1

# 7) Curated entries -------------------------------------------------------------
with open(os.path.join(here, 'curated.json'), encoding='utf-8') as f:
    for c in json.load(f):
        p, _ = upsert(c['brand'], c['name'], 'curated')
        p.update({
            'y': c.get('year'), 'g': c.get('gender'), 'r': None,
            't': [clean_note(v) for v in c.get('top', [])], 'm': [clean_note(v) for v in c.get('middle', [])],
            'bs': [clean_note(v) for v in c.get('base', [])], 'fl': [],
            'a': ranked_strengths([clean_accord(a) for a in c['accords']]), 'as': 'rank',
            'lon': None, 'sil': None, 'vs': None, 'pop': c.get('pop', 500), 'src': 'curated',
            'note': clean(c.get('source_note'), 300),
        })
        count['curated'] += 1

# ---------------------------------------------------------------------------
# Finalise

# One display spelling per house: the one used by its most popular perfumes.
parent = {}
def find(a):
    while parent.setdefault(a, a) != a:
        parent[a] = parent[parent[a]]
        a = parent[a]
    return a
for p in {id(p): p for p in perfumes.values()}.values():
    parent[find('1' + brand_key(p['b']))] = find('2' + brand_key2(p['b']))
spell = collections.defaultdict(collections.Counter)
for p in {id(p): p for p in perfumes.values()}.values():
    spell[find('1' + brand_key(p['b']))][p['b']] += p['pop'] + 1
# Prefer spellings that kept their accents ('Estée Lauder' over 'Est e Lauder').
accented = lambda b: 3 if re.search(r'[^\x00-\x7f]', b) else 1
best_spelling = {k: max(c, key=lambda b: c[b] * accented(b)) for k, c in spell.items()}
for p in perfumes.values():
    p['b'] = best_spelling[find('1' + brand_key(p['b']))]

items = [p for p in {id(p): p for p in perfumes.values()}.values() if p['a'] or has_notes(p)]
items.sort(key=lambda p: (-p['pop'], p['n'].lower()))

note_count = collections.Counter()
accord_set = collections.Counter()
for p in items:
    seen = set()
    for k in ('t', 'm', 'bs', 'fl'):
        p[k] = [v for v in dict.fromkeys(v for v in p[k] if v) if not (v in seen or seen.add(v))]
        note_count.update(p[k])
    p['a'] = [(a, s) for a, s in dict((a, s) for a, s in p['a'] if a).items()]
    accord_set.update(a for a, _ in p['a'])

notes = [n for n, _ in note_count.most_common()]
accords = [a for a, _ in accord_set.most_common()]
ni = {n: i for i, n in enumerate(notes)}
ai = {a: i for i, a in enumerate(accords)}

# Similar perfumes: cosine similarity over TF-IDF weighted notes + accords,
# matched against the most popular perfumes so suggestions are findable.
import numpy as np
dims = len(notes) + len(accords)
idf_n = np.log(len(items) / (1 + np.array([note_count[n] for n in notes], dtype=np.float32)))
idf_a = np.log(len(items) / (1 + np.array([accord_set[a] for a in accords], dtype=np.float32)))


def vec(p):
    v = np.zeros(dims, dtype=np.float32)
    for k in ('t', 'm', 'bs', 'fl'):
        for n in p[k]:
            v[ni[n]] = idf_n[ni[n]]
    for a, s in p['a']:
        v[len(notes) + ai[a]] = 1.6 * idf_a[ai[a]] * (s / 100)
    nrm = np.linalg.norm(v)
    return v / nrm if nrm else v


TARGETS = min(8000, len(items))
T = np.stack([vec(p) for p in items[:TARGETS]])
similar = []
for start in range(0, len(items), 2000):
    Q = np.stack([vec(p) for p in items[start:start + 2000]])
    S = Q @ T.T
    for row, qid in enumerate(range(start, start + len(Q))):
        if qid < TARGETS:
            S[row, qid] = -1
        best = np.argpartition(-S[row], 8)[:8]
        best = best[np.argsort(-S[row, best])]
        similar.append([int(b) for b in best if S[row, b] > 0.15][:6])

os.makedirs(os.path.join(out_dir, 'shards'), exist_ok=True)
for old in os.listdir(os.path.join(out_dir, 'shards')):
    os.remove(os.path.join(out_dir, 'shards', old))
index_items, shards = [], collections.defaultdict(list)
note_to_ids = collections.defaultdict(list)
for pid, p in enumerate(items):
    index_items.append([pid, p['n'], p['b'], p['y'], p['g'], p['pop']])
    rec = {
        'id': pid, 'n': p['n'], 'b': p['b'], 'y': p['y'], 'g': p['g'], 'r': p['r'],
        't': [ni[v] for v in p['t']], 'm': [ni[v] for v in p['m']], 'bs': [ni[v] for v in p['bs']],
        'fl': [ni[v] for v in p['fl']], 'a': [[ai[a], s] for a, s in p['a']], 'as': p['as'],
        'lon': p['lon'], 'sil': p['sil'], 'vs': p['vs'], 'src': p['src'], 's': similar[pid],
    }
    for k in ('fid', 'note', 'd', 'du'):
        if p.get(k):
            rec[k] = p[k]
    shards[pid // SHARD].append(rec)
    for k in ('t', 'm', 'bs', 'fl'):
        for v in p[k]:
            if len(note_to_ids[ni[v]]) < 120:
                note_to_ids[ni[v]].append(pid)

# Plain smell descriptions for notes (Scento, CC BY 4.0).
note_info = {}
with open(os.path.join(raw_dir, 'scento_materials.csv'), encoding='utf-8-sig') as f:
    for x in csv.DictReader(f):
        smell = clean(x['smell'], 300)
        if not smell:
            continue
        info = {'smell': smell, 'family': clean(x['material_family'], 40), 'origin': clean(x['origin'], 20)}
        for n in [x['name']] + split_list(x['aliases'], r'[;,|]'):
            cn = clean_note(n)
            if cn and cn in ni and cn not in note_info:
                note_info[cn] = info

dump = lambda obj, path: json.dump(obj, open(path, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
# Compact search index: ids are implicit (row order = id = popularity rank), each house name is
# stored once, and popularity is a log2 bucket (enough for ranking search results).
brands = [b for b, _ in collections.Counter(it[2] for it in index_items).most_common()]
bi = {b: i for i, b in enumerate(brands)}
dump({'v': 2, 'shard': SHARD, 'notes': notes, 'noteCounts': [note_count[n] for n in notes],
      'accords': accords, 'brands': brands,
      'items': [[n, bi[b], y or 0, g or '', round(math.log2(pop + 1))] for _, n, b, y, g, pop in index_items]},
     os.path.join(out_dir, 'index.json'))
for s, recs in shards.items():
    dump(recs, os.path.join(out_dir, 'shards', f'{s}.json'))
dump({str(k): v for k, v in note_to_ids.items() if note_count[notes[k]] >= 3}, os.path.join(out_dir, 'notes.json'))
dump(note_info, os.path.join(out_dir, 'note_info.json'))

years = collections.Counter(p['y'] for p in items if p['y'])
print(f'{len(items)} perfumes, {len(notes)} notes, {len(accords)} accords, {len(shards)} shards, {len(note_info)} note descriptions')
print('rows by source:', dict(count))
print('released 2020-2026:', {y: years[y] for y in range(2020, MAX_YEAR + 1)})
print('security/cleaning:', dict(REJECTED) or 'nothing rejected')
