"""Import open image sets into public/images/ and update public/images/manifest.json.

Usage:
  python3 -I scripts/import_images.py notes   <fragrance-notes repo dir>
  python3 -I scripts/import_images.py bottles <dir> [<dir> ...]

Sources (see DATA.md):
  notes    github.com/asifnawaz/fragrance-notes (MIT): 541 studio-style ingredient images
  bottles  github.com/Doesntwork123/perfume-images and github.com/mich-de/profumi (public/images):
           transparent product photos of popular bottles. They show brand packaging, so treat them
           as preview-only until you have rights to use them.

Security: downloaded images are untrusted. Each file must have an allowed extension AND matching
magic bytes, be under a size cap, and decode within a pixel budget (decompression-bomb guard).
It is then fully decoded and re-encoded to a fresh WebP, which drops EXIF/XMP/ICC metadata,
embedded thumbnails and anything appended after the image data. SVG, TIFF and GIF are refused
(SVG can carry script). Output names are generated slugs, never the source file names.
"""
import json, os, re, sys, unicodedata
from PIL import Image

Image.MAX_IMAGE_PIXELS = 40_000_000          # decompression-bomb guard
MAX_BYTES = 25 * 1024 * 1024
MAGIC = {b'\x89PNG\r\n\x1a\n': 'png', b'\xff\xd8\xff': 'jpg', b'RIFF': 'webp'}
ALLOWED_EXT = {'.png', '.jpg', '.jpeg', '.webp'}

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'images')
MANIFEST = os.path.join(OUT, 'manifest.json')
report = {'accepted': 0, 'refused': []}


def slug(s):
    # Must match slug() in src/lib/router.ts.
    s = ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(c) != 'Mn')
    return re.sub(r'(^-|-$)', '', re.sub(r'[^a-z0-9]+', '-', s))


def safe_image(path):
    """Open an untrusted image file, or return None (and record why)."""
    ext = os.path.splitext(path)[1].lower()
    if ext not in ALLOWED_EXT:
        report['refused'].append((os.path.basename(path), f'type {ext or "none"} not allowed'))
        return None
    size = os.path.getsize(path)
    if not 0 < size <= MAX_BYTES:
        report['refused'].append((os.path.basename(path), f'size {size}'))
        return None
    with open(path, 'rb') as f:
        head = f.read(12)
    kind = next((k for sig, k in MAGIC.items() if head.startswith(sig)), None)
    if kind is None or (kind == 'webp' and head[8:12] != b'WEBP'):
        report['refused'].append((os.path.basename(path), 'content is not a PNG/JPEG/WebP'))
        return None
    try:
        with Image.open(path) as im:
            im.verify()                        # structural check
        im = Image.open(path)
        if im.format not in ('PNG', 'JPEG', 'WEBP'):
            raise ValueError(f'format {im.format}')
        im.load()                              # full decode (bomb guard applies)
        return im.convert('RGBA')
    except Exception as e:  # noqa: BLE001 - any decode problem means refuse
        report['refused'].append((os.path.basename(path), f'decode failed: {e}'[:120]))
        return None


def defringe(im):
    """Remove the coloured halo background removal leaves on soft edges: choke the alpha a
    little and neutralise the colour of pixels that are only partly opaque."""
    import numpy as np
    a = np.asarray(im, dtype=np.float32).copy()
    alpha = a[..., 3]
    soft = (alpha > 0) & (alpha < 235)
    lum = a[..., :3] @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    for c in range(3):
        a[..., c] = np.where(soft, a[..., c] * 0.35 + lum * 0.65, a[..., c])
    # Pure green-dominant edge pixels are almost always halo: drop them.
    halo = soft & (a[..., 1] > a[..., 0] + 18) & (a[..., 1] > a[..., 2] + 18)
    alpha = np.where(halo, 0, np.clip((alpha - 40) * (255 / 215), 0, 255))
    a[..., 3] = alpha
    out = Image.fromarray(a.astype('uint8'), 'RGBA')
    # Erode the matte ~2px: removes the thin opaque outline and stray frame lines, then soften.
    from PIL import ImageFilter
    A = out.getchannel('A').filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(0.7))
    out.putalpha(A)
    return out


def transparent_corners(im):
    w, h = im.size
    A = im.getchannel('A')
    return all(A.getpixel(p) < 32 for p in ((1, 1), (w - 2, 1), (1, h - 2), (w - 2, h - 2)))


def save_webp(im, rel, box):
    im = im.copy()
    bbox = im.getchannel('A').getbbox()        # trim empty transparent margins
    if bbox:
        im = im.crop(bbox)
    im.thumbnail((box, box), Image.LANCZOS)
    path = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, 'WEBP', quality=82, method=6)  # fresh file: no metadata carried over
    report['accepted'] += 1


def load_manifest():
    m = json.load(open(MANIFEST, encoding='utf-8')) if os.path.exists(MANIFEST) else {}
    m.setdefault('bottles', {})
    m.setdefault('notes', {})
    return m


def save_manifest(m):
    os.makedirs(OUT, exist_ok=True)
    json.dump(m, open(MANIFEST, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)


def load_index():
    ix = json.load(open(os.path.join(ROOT, 'public', 'data', 'index.json'), encoding='utf-8'))
    items = [(i, n, ix['brands'][b], y, pop) for i, (n, b, y, g, pop) in enumerate(ix['items'])]
    return ix, items


def finish(m):
    save_manifest(m)
    print(f"accepted {report['accepted']} images; refused {len(report['refused'])}")
    for name, why in report['refused']:
        print(f'  refused {name}: {why}')


# ---------------------------------------------------------------------------
# Ingredient images

ORIGIN = re.compile(r'^(italian|sicilian|calabrian|madagascan|madagascar|bourbon|persian|indian|turkish|bulgarian|'
                    r'egyptian|moroccan|haitian|brazilian|mexican|tahitian|french|spanish|virginian|virginia|atlas|'
                    r'damask|sri lankan|ceylon|chinese|japanese|african|australian|tunisian|guatemalan|georgian|'
                    r'laotian|cambodian|mysore|white|black|pink|red|green|wild|sweet|fresh|bitter|dark|pure|'
                    r'bright|vibrant|warm|dry|smoky|salty|golden|sparkling)\s+', re.I)


def note_variants(n):
    n = n.lower().strip()
    out = [n]
    base = ORIGIN.sub('', n)
    for v in (base, re.sub(r'\s+(absolute|essence|oil|accord|extract|leaf|leaves|notes?)$', '', base)):
        if v and v not in out:
            out.append(v)
    for v in list(out):
        out += [v[:-1]] if v.endswith('s') else [v + 's']
    return [slug(v) for v in out if v]


# Our note name -> image slug, for groupings and synonyms the rules can't infer.
NOTE_PICK = {
    'mandarin orange': 'mandarin-oil', 'sea notes': 'marine-accord', 'marine notes': 'marine-accord',
    'woody notes': 'wood', 'green notes': 'watery-greens', 'fruity notes': 'dewy-fruits',
    'spicy notes': 'spices', 'spices': 'spices', 'black currant': 'black-currant-berries',
    'blackcurrant': 'black-currant-berries', 'cassis': 'creme-de-cassis', 'orris root': 'orris-concrete',
    'orris': 'orris-concrete', 'guaiac wood': 'gaiac-wood', 'olibanum': 'frankincense',
    'juniper': 'juniper-berry', 'juniper berries': 'juniper-berry', 'litchi': 'red-lychee', 'lychee': 'red-lychee',
    'jasmine sambac': 'jasmine', 'sugar': 'sugar-cube', 'rum': 'jamaican-rum', 'green apple': 'crisp-apple',
    'red apple': 'red-apple-skin', 'praline': 'vanilla-praline', 'cypress': 'cypress-wood',
    'passionfruit': 'purple-passion-fruit', 'passion fruit': 'purple-passion-fruit', 'amalfi lemon': 'lemon',
    'red berries': 'raspberry', 'green leaves': 'violet-leaves', 'ginger': 'ginger-extract-co2',
    'apricot': 'apricot-nectar', 'melon': 'honeydew', 'honeydew melon': 'honeydew', 'frangipani': 'frangipani-flower',
    'petitgrain': 'petitgrain-bigarade', 'artemisia': 'wormwood-oil', 'wormwood': 'wormwood-oil', 'honeysuckle': None, 'aldehydes': None,
    'ambroxan': None, 'cashmeran': None, 'iso e super': None, 'powdery notes': None,
}


def import_notes(repo):
    # Index the folder itself (some file names keep accents the metadata slugs drop: 'gaïac-wood').
    img_dir = os.path.realpath(os.path.join(repo, 'assets', 'images-transparent'))
    have = {}
    for fn in sorted(os.listdir(img_dir)):
        f = os.path.join(img_dir, fn)
        if fn.endswith('.webp') and os.path.isfile(f) and not os.path.islink(f):
            have.setdefault(slug(fn[:-5]), f)
    # Also index each image under its base ingredient ('persian-saffron' -> 'saffron').
    by_base = {}
    for s in sorted(have, key=len):
        for v in note_variants(s.replace('-', ' ')):
            by_base.setdefault(v, s)
    ix, _ = load_index()
    m = load_manifest()
    m['notes'] = {k: v for k, v in m['notes'].items() if 'fragrance-notes' not in v.get('credit', '')}
    used, matched = {}, 0
    # Word index: slug -> its words, for 'apple' -> 'crisp-apple' (head noun must be the last word).
    words_of = {s: s.split('-') for s in have}
    # Only notes used by at least MIN_USES perfumes get a photo (keeps the site under hosting file
    # limits); rarer notes keep their drawn illustration.
    MIN_USES = 20
    for note, uses in zip(ix['notes'], ix['noteCounts']):
        if uses < MIN_USES:
            continue
        if 'musk' in note:  # the set pictures musk as fur with a halo: keep our drawn illustration
            src = None
        elif note in NOTE_PICK:
            src = slug(NOTE_PICK[note]) if NOTE_PICK[note] else None
            src = src if src in have else None
        else:
            src = next((v for v in note_variants(note) if v in have), None) or \
                next((by_base[v] for v in note_variants(note) if v in by_base), None)
            if not src:
                nw = [w for w in slug(re.sub(r'\bnotes?\b', '', note)).split('-') if w]
                if nw and len(nw[-1]) > 2:
                    cands = [s for s, ws in words_of.items() if ws[-1] in (nw[-1], nw[-1] + 's', nw[-1].rstrip('s'))
                             and all(w in ws or w + 's' in ws for w in nw)]
                    src = min(cands, key=lambda s: (len(words_of[s]), s)) if cands else None
        if not src:
            continue
        if src not in used:
            im = safe_image(have[src])
            if im is not None and not transparent_corners(im):
                report['refused'].append((os.path.basename(have[src]), 'background not transparent'))
                im = None
            if im is None:
                used[src] = None
                continue
            save_webp(defringe(im), f'notes/{src}.webp', 320)
            used[src] = f'images/notes/{src}.webp'
        if used[src]:
            m['notes'][slug(note)] = {
                'src': used[src], 'credit': 'fragrance-notes by Asif Nawaz', 'license': 'MIT',
                'source': 'https://github.com/asifnawaz/fragrance-notes',
            }
            matched += 1
    print(f'{matched} of {len(ix["notes"])} notes now have an ingredient image ({len([u for u in used.values() if u])} files)')
    finish(m)


# ---------------------------------------------------------------------------
# Bottle photos

SKIP = re.compile(r'rating ?template|ratingexample|^img_\d+|mbappe|watch|hublot|wd-40|tony iommi|^black$|^elves$|\.old$', re.I)
# File-name abbreviations and typos -> searchable words.
WORDS = {
    'elixer': 'elixir', 'parfma': 'parma', 'colbat': 'cobalt', 'gualtier': 'gaultier', 'rabbane': 'rabanne',
    'cdnim': 'club de nuit intense man', 'cdnsillage': 'club de nuit sillage', 'cdn': 'club de nuit',
    'adg': 'acqua di gio', 'pdm': 'parfums de marly', 'lv': 'louis vuitton', 'bdk': 'bdk parfums',
    'ysl': 'yves saint laurent', 'ck': 'calvin klein', 'myslf': 'myslf', 'toilette': 'eau de toilette',
    'angels': "angels' share", 'v2': '', '2d': '', 'new': '', 'full': '', 'edt': 'eau de toilette',
    'baccarat': 'baccarat rouge 540', 'rouge': '', 'kilian': 'kilian', 'fat': 'fat electrician',
    'electrician': '', 'tygar': 'tygar', 'ani': 'ani', 'ck2': 'ck2',
}
# Folder -> brand hint.
FOLDER_BRAND = {'armaf': 'armaf', 'lattafa': 'lattafa', 'zara': 'zara'}
# Exact picks where a name is ambiguous (file stem, folded -> (brand, name)).
PICK = {
    'sauvage': ('Dior', 'Sauvage'), 'sauvage dior': ('Dior', 'Sauvage'), 'eros': ('Versace', 'Eros'),
    'phantom': ('Rabanne', 'Phantom'), 'wanted': ('Azzaro', 'Wanted'), 'valentino': None, 'valentino 1': None,
    'valentino 2': None, 'le male': ('Jean Paul Gaultier', 'Le Male'), 'le beau': ('Jean Paul Gaultier', 'Le Beau'),
    'invictus': ('Rabanne', 'Invictus'), '1 million': ('Rabanne', '1 Million'), 'one million': ('Rabanne', '1 Million'),
    'creed aventus': ('Creed', 'Aventus'), 'creed aventus v2': ('Creed', 'Aventus'), 'asad': ('Lattafa Perfumes', 'Asad'),
    'fahrenheit': ('Dior', 'Fahrenheit'), 'dior homme': ('Dior', 'Dior Homme'), 'cool water': ('Davidoff', 'Cool Water'),
    'imagination': ('Louis Vuitton', 'Imagination'), 'lv imagination': ('Louis Vuitton', 'Imagination'),
    'spicebomb': ('Viktor&Rolf', 'Spicebomb'), 'baccarat rouge': ('Maison Francis Kurkdjian', 'Baccarat Rouge 540'),
    'santal 33': ('Le Labo', 'Santal 33'), 'layton': ('Parfums de Marly', 'Layton'), 'pdm sedley': ('Parfums de Marly', 'Sedley'),
    'sedley': ('Parfums de Marly', 'Sedley'), 'greenley': ('Parfums de Marly', 'Greenley'), 'haltane': ('Parfums de Marly', 'Haltane'),
    'herod': ('Parfums de Marly', 'Herod'), 'oajan': ('Parfums de Marly', 'Oajan'), 'carlisle': ('Parfums de Marly', 'Carlisle'),
    'althair': ('Parfums de Marly', 'Althaïr'), 'perseus': ('Parfums de Marly', 'Perseus'), 'habdan': ('Parfums de Marly', 'Habdan'),
    'khamrah': ('Lattafa Perfumes', 'Khamrah'), 'the one for men': ('Dolce&Gabbana', 'The One for Men'),
    'naxos': ('Xerjoff', 'XJ 1861 Naxos'), 'renaissance': ('Xerjoff', 'XJ 1861 Renaissance'),
    'acqua di gio pour homme': ('Giorgio Armani', 'Acqua di Gio'), 'acqua di gio pour homme toilette': ('Giorgio Armani', 'Acqua di Gio'), 'erba gold': ('Xerjoff', 'Erba Gold'),
    'erba pura': ('Xerjoff', 'Erba Pura'), 'torino21': ('Xerjoff', 'Torino21'), 'torino22': ('Xerjoff', 'Torino22'),
    'uden': ('Xerjoff', 'Uden'), 'megamare': ('Orto Parisi', 'Megamare'), 'viking': ('Creed', 'Viking'),
    'imagination ': ('Louis Vuitton', 'Imagination'), 'afternoon swim': ('Louis Vuitton', 'Afternoon Swim'),
    'pacific chill': ('Louis Vuitton', 'Pacific Chill'), 'california dream': ('Louis Vuitton', 'California Dream'),
    'city of stars': ('Louis Vuitton', 'City of Stars'), 'ombre nomade': ('Louis Vuitton', 'Ombre Nomade'),
    'les sables roses': ('Louis Vuitton', 'Les Sables Roses'), 'meteore': ('Louis Vuitton', 'Météore'),
    'fleur du desert': ('Louis Vuitton', 'Fleur du Désert'), 'stellar times': ('Louis Vuitton', 'Stellar Times'),
    'voyage': ('Nautica', 'Nautica Voyage'), 'side effect': ('Initio Parfums Prives', 'Side Effect'),
    'initio paragon': ('Initio Parfums Prives', 'Paragon'), 'red tobacco': ('Mancera', 'Red Tobacco'),
    'instant crush': ('Mancera', 'Instant Crush'), 'cedrat boise': ('Mancera', 'Cedrat Boise'),
    'by the fireplace': ('Maison Martin Margiela', 'By the Fireplace'), 'bianco latte': ('Giardini Di Toscana', 'Bianco Latte'),
    'gris charnel': ('BDK Parfums', 'Gris Charnel'), 'bdk gris charnel': ('BDK Parfums', 'Gris Charnel'),
    'tuscan leather': ('Tom Ford', 'Tuscan Leather'), 'oud wood': ('Tom Ford', 'Oud Wood'), 'black orchid': ('Tom Ford', 'Black Orchid'),
    'ombre leather': ('Tom Ford', 'Ombré Leather'), 'noir extreme': ('Tom Ford', 'Noir Extreme'), 'lost cherry': ('Tom Ford', 'Lost Cherry'),
    'bitter peach': ('Tom Ford', 'Bitter Peach'), 'fucking fabulous': ('Tom Ford', 'Fucking Fabulous'),
    'neroli portofino': ('Tom Ford', 'Neroli Portofino'), 'tobacco vanille': ('Tom Ford', 'Tobacco Vanille'),
    'vanilla sex': ('Tom Ford', 'Vanilla Sex'), 'mandarino di amalfi': ('Tom Ford', 'Mandarino di Amalfi'),
    'fico di amalfi': ('Tom Ford', 'Fico di Amalfi'), 'mandorlo di sicilia': ('Tom Ford', 'Mandorlo di Sicilia'),
    'azure lime': ('Tom Ford', 'Azure Lime'), 'grey vetiver': ('Tom Ford', 'Grey Vetiver'),
    'tom ford grey vetiver': ('Tom Ford', 'Grey Vetiver'), 'ambre nuit': ('Christian Dior', 'Ambre Nuit'),
    'bois talisman': ('Parfums de Marly', 'Bois Talisman'), 'blue talisman': ('Ex Nihilo', 'Blue Talisman'),
    'alexandria ii': ('Xerjoff', 'Alexandria II'), 'arabians tonka': ('Montale', 'Arabians Tonka'),
    'amore caffe': ('Mancera', 'Amore Caffe'), 'babycat': ('Yves Saint Laurent', 'Babycat'),
    'french riviera': ('Mancera', 'French Riviera'), '40 knots': ('Xerjoff', '40 Knots'),
    'kilian angels share': ('By Kilian', "Angels' Share"), 'angels share by kilian': ('By Kilian', "Angels' Share"),
    'green irish tweed': ('Creed', 'Green Irish Tweed'), 'creed green irish tweed': ('Creed', 'Green Irish Tweed'),
    'creed millesime imperial': ('Creed', 'Imperial Millesime'), 'creed silver mountain water': ('Creed', 'Silver Mountain Water'),
    'oud for greatness': ('Initio Parfums Prives', 'Oud for Greatness'), 'nishane ani': ('Nishane', 'Ani'),
    'calvin klein ck2': ('Calvin Klein', 'CK2'), 'dior sauvage edt': ('Dior', 'Sauvage'),
    'bleu de chanel chanel': ('Chanel', 'Bleu de Chanel'), 'bleu de chanel new': ('Chanel', 'Bleu de Chanel'),
    'bleu de chanel': ('Chanel', 'Bleu de Chanel'), 'acqua di gio': ('Giorgio Armani', 'Acqua di Giò'),
    'adg profondo': ('Giorgio Armani', 'Acqua di Giò Profondo'), 'bleu electrique': ('Yves Saint Laurent', "La Nuit de L'Homme Bleu Électrique"),
    'gucci guilty': ('Gucci', 'Guilty Pour Homme'), 'gucci guilty new': ('Gucci', 'Guilty Pour Homme'),
    'invictus new': ('Rabanne', 'Invictus'), 'one million': ('Rabanne', '1 Million'), 'stronger with you': ('Giorgio Armani', 'Emporio Armani Stronger With You'),
    'ultra male': ('Jean Paul Gaultier', 'Ultra Male'), 'valentino uomo intense': ('Valentino', 'Valentino Uomo Intense'),
    'bvlgari tygar': ('Bvlgari', 'Tygar'), 'dior homme intense': ('Dior', 'Dior Homme Intense'), 'fat electrician': ('Etat Libre d’Orange', 'Fat Electrician'),
    'sauvage elixir': ('Dior', 'Sauvage Elixir'), 'tobacco vanille new': ('Tom Ford', 'Tobacco Vanille'),
    'creed aventus ': ('Creed', 'Aventus'), 'afnan 9pm': ('Afnan', '9pm'), '9pm rebel': ('Afnan', '9pm Rebel'),
    '9am dive': ('Afnan', '9am Dive'), 'xerjoff allende': ('Xerjoff', 'Allende'), 'cr7 game on': ('Cristiano Ronaldo', 'CR7 Game On'),
}


def fold(s):
    s = ''.join(c for c in unicodedata.normalize('NFKD', s.lower()) if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', ' ', s.replace('&', ' and ').replace("'", '').replace('’', '')).strip()


def stem_words(stem):
    stem = re.sub(r'_upscayl.*$|\(\d+\)|\s+20\d\d$', '', stem)
    words = fold(stem.replace('_', ' ')).split()
    out = []
    for w in words:
        out += WORDS.get(w, w).split()
    return ' '.join(out)


def import_bottles(dirs):
    ix, items = load_index()
    by_bn = {}
    for i, n, b, y, pop in items:
        by_bn.setdefault((fold(b), fold(n)), (i, n, b))
    top = items[:40000]
    m = load_manifest()
    m['bottles'] = {}
    chosen = {}  # perfume key -> (score, path, image)
    for d in dirs:
        root = os.path.realpath(d)
        for dirpath, dirnames, files in os.walk(root):
            dirnames[:] = sorted(d for d in dirnames if not d.startswith('.'))  # skip .git etc.
            for fn in sorted(files):
                path = os.path.join(dirpath, fn)
                if not os.path.realpath(path).startswith(root + os.sep) or os.path.islink(path):
                    continue  # never follow links out of the folder
                stem = os.path.splitext(fn)[0]
                folder = os.path.basename(dirpath).lower()
                if SKIP.search(fn) or SKIP.search(stem):
                    continue
                raw = fold(stem.replace('_', ' '))
                q = stem_words(stem)
                hit = None
                if raw in PICK or q in PICK:
                    pick = PICK.get(raw, PICK.get(q))
                    if pick is None:
                        continue
                    hit = by_bn.get((fold(pick[0]), fold(pick[1])))
                    if not hit:  # brand spelled differently: match by name among top perfumes
                        hit = next(((i, n, b) for i, n, b, y, p in top if fold(n) == fold(pick[1]) and fold(pick[0]).split()[0] in fold(b)), None)
                if not hit:
                    brand_hint = FOLDER_BRAND.get(folder, '')
                    qs = set(q.split())
                    best = None
                    for i, n, b, y, pop in (items if brand_hint else top):
                        fn_, fb = fold(n), fold(b)
                        if brand_hint and brand_hint not in fb:
                            continue
                        full = set((fb + ' ' + fn_).split())
                        if q == fn_ or q == fn_ + ' ' + fb or q == fb + ' ' + fn_:
                            score = 3
                        elif set(fn_.split()) <= qs <= full:
                            score = 2
                        else:
                            continue
                        if not best or score > best[0]:
                            best = (score, (i, n, b))
                        if score == 3:
                            break
                    hit = best[1] if best else None
                if not hit:
                    report['refused'].append((fn, 'no confident perfume match'))
                    continue
                key = slug(f'{hit[2]} {hit[1]}')
                im = safe_image(path)
                if im is None:
                    continue
                alpha = im.getchannel('A').getextrema()[0] < 250   # has real transparency
                quality = (2 if alpha else 0) + min(im.width * im.height / 400_000, 1.5) - (1 if '2d' in fn.lower() else 0)
                if key not in chosen or quality > chosen[key][0]:
                    chosen[key] = (quality, fn, im, hit)
    for key, (_, fn, im, (i, n, b)) in sorted(chosen.items()):
        save_webp(im, f'bottles/{key}.webp', 720)
        m['bottles'][key] = {'src': f'images/bottles/{key}.webp', 'name': f'{b} – {n}', 'file': fn[:80]}
    print(f'{len(chosen)} perfumes now have a bottle photo')
    for key, (_, fn, _, (i, n, b)) in sorted(chosen.items(), key=lambda kv: kv[1][3][0]):
        print(f'  #{i:<6} {b} – {n}   <=  {fn}')
    finish(m)


if __name__ == '__main__':
    if len(sys.argv) < 3 or sys.argv[1] not in ('notes', 'bottles'):
        sys.exit(__doc__)
    import_notes(sys.argv[2]) if sys.argv[1] == 'notes' else import_bottles(sys.argv[2:])
