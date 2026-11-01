"""Download real photography for the site and write public/images/manifest.json.

Usage:
  python3 -I scripts/fetch_images.py notes   [--top 150]           # ingredient photos (Wikimedia Commons)
  python3 -I scripts/fetch_images.py bottles [--csv FILE]          # bottle photos

Ingredient photos come from Wikimedia Commons and are filtered to open licences
(CC0, public domain, CC BY, CC BY-SA). Credit and licence are stored for each image
and shown on the site, as those licences require.

Bottle photos: by default the image URLs in data-raw/perfume_data_combined.csv
(~480 perfumes, hosted by Fragrantica; they are copyrighted, so use them only for a private
preview). For launch pass --csv with a licensed feed: columns brand,name,image_url.

Requires network access to commons.wikimedia.org + upload.wikimedia.org (notes) and to
whatever host serves the bottle images.
"""
import argparse, csv, io, json, os, re, sys, time, unicodedata, urllib.parse, urllib.request

from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'images')
MANIFEST = os.path.join(OUT, 'manifest.json')
UA = 'ScentAtlas/0.1 (beginner perfume guide; image fetch script)'
OK_LICENSES = re.compile(r'^(cc0|public domain|pd|cc by(-sa)?( \d\.\d)?)', re.I)

# Hints that steer the image search towards the ingredient rather than e.g. a band or a town.
FAMILY_HINT = [
    (r'pepper|cinnamon|cardamom|clove|nutmeg|ginger|saffron|cumin|coriander|anise|caraway|cassia', 'spice'),
    (r'vanill|tonka|cacao|cocoa|coffee|almond|hazelnut|praline|caramel|honey', 'food'),
    (r'lemon|bergamot|orange|mandarin|grapefruit|lime|yuzu|citron|tangerine', 'citrus fruit'),
    (r'apple|pear|peach|plum|apricot|cherry|berr|currant|melon|pineapple|mango|fig|lychee|rhubarb|coconut', 'fruit'),
    (r'rose|jasmin|iris|violet|lily|tuberose|gardenia|ylang|peony|magnolia|freesia|blossom|flower|orchid|geranium|lavender|mimosa|narcissus|heliotrope|osmanthus|carnation', 'flower'),
    (r'sandal|cedar|vetiver|oud|agarwood|guaiac|wood|birch|cypress|pine|fir|patchouli', 'plant'),
    (r'amber|benzoin|labdanum|myrrh|olibanum|frankincense|incense|resin|balsam|styrax|opoponax|elemi', 'resin'),
    (r'mint|basil|sage|rosemary|thyme|tarragon|artemisia|tea|leaf|grass', 'herb'),
]
SKIP = re.compile(r'notes?$|accord|musk|ambroxan|cashmeran|aldehyde|iso e|calone|ozonic|marine|sea|water|powder', re.I)


def slug(s):
    # Must match slug() in src/lib/router.ts.
    s = ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(c) != 'Mn')
    return re.sub(r'(^-|-$)', '', re.sub(r'[^a-z0-9]+', '-', s))


def get(url, as_json=False):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read()
    return json.loads(data) if as_json else data


def load_manifest():
    if os.path.exists(MANIFEST):
        with open(MANIFEST, encoding='utf-8') as f:
            m = json.load(f)
    else:
        m = {}
    m.setdefault('bottles', {})
    m.setdefault('notes', {})
    return m


def save_manifest(m):
    os.makedirs(OUT, exist_ok=True)
    with open(MANIFEST, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=1)


def save_image(raw, path, size, square):
    im = Image.open(io.BytesIO(raw))
    im = ImageOps.exif_transpose(im)
    im = im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB')
    if square:
        im = ImageOps.fit(im, (size, size), Image.LANCZOS)
    else:
        im.thumbnail((size, size), Image.LANCZOS)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, 'WEBP', quality=82)


def strip_html(s):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', s or '')).strip()


def commons_search(query):
    params = {
        'action': 'query', 'format': 'json', 'generator': 'search', 'gsrnamespace': '6',
        'gsrsearch': f'{query} filetype:bitmap', 'gsrlimit': '10', 'prop': 'imageinfo',
        'iiprop': 'url|extmetadata|mime|size', 'iiurlwidth': '480',
    }
    data = get('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(params), as_json=True)
    pages = sorted((data.get('query') or {}).get('pages', {}).values(), key=lambda p: p.get('index', 99))
    for p in pages:
        info = (p.get('imageinfo') or [{}])[0]
        meta = info.get('extmetadata') or {}
        lic = strip_html((meta.get('LicenseShortName') or {}).get('value'))
        w, h = info.get('width', 0), info.get('height', 0)
        if info.get('mime') not in ('image/jpeg', 'image/png') or not OK_LICENSES.match(lic):
            continue
        if min(w, h) < 300 or not (0.55 < w / max(1, h) < 1.8):
            continue
        return {
            'thumb': info.get('thumburl') or info.get('url'),
            'credit': strip_html((meta.get('Artist') or {}).get('value')) or 'Wikimedia Commons',
            'license': lic,
            'source': info.get('descriptionurl'),
        }
    return None


def fetch_notes(top):
    with open(os.path.join(ROOT, 'public', 'data', 'index.json'), encoding='utf-8') as f:
        ix = json.load(f)
    overrides_path = os.path.join(ROOT, 'scripts', 'note_image_queries.json')
    overrides = json.load(open(overrides_path, encoding='utf-8')) if os.path.exists(overrides_path) else {}
    m = load_manifest()
    done = 0
    for note in ix['notes'][: top * 2]:
        if done >= top:
            break
        key = slug(note)
        if key in m['notes'] or (SKIP.search(note) and key not in overrides):
            continue
        hint = next((h for pat, h in FAMILY_HINT if re.search(pat, note)), '')
        query = overrides.get(key) or f'{note} {hint}'.strip()
        try:
            hit = commons_search(query)
            if not hit:
                print(f'  no open-licence image for {note!r} ({query})')
                continue
            path = os.path.join(OUT, 'notes', f'{key}.webp')
            save_image(get(hit['thumb']), path, 360, square=True)
            m['notes'][key] = {'src': f'images/notes/{key}.webp', 'credit': hit['credit'][:120], 'license': hit['license'], 'source': hit['source']}
            done += 1
            print(f'  ✓ {note}  [{hit["license"]}]')
            save_manifest(m)
            time.sleep(0.3)  # be polite to the Wikimedia API
        except Exception as e:  # keep going; report at the end
            print(f'  ! {note}: {e}', file=sys.stderr)
    print(f'{done} ingredient photos added; manifest has {len(m["notes"])}.')


def fetch_bottles(csv_path):
    with open(os.path.join(ROOT, 'public', 'data', 'index.json'), encoding='utf-8') as f:
        ix = json.load(f)
    ids = {(it[2].lower().strip(), it[1].lower().strip()): it[0] for it in ix['items']}
    rows = []
    if csv_path:
        with open(csv_path, encoding='utf-8-sig') as f:
            rows = [(r['brand'], r['name'], r['image_url']) for r in csv.DictReader(f)]
    else:
        with open(os.path.join(ROOT, 'data-raw', 'perfume_data_combined.csv'), encoding='utf-8-sig') as f:
            rows = [(r['company'], r['name'], r['image']) for r in csv.DictReader(f) if r.get('image')]
    m = load_manifest()
    added = 0
    for brand, name, url in rows:
        pid = ids.get((brand.lower().strip(), name.lower().strip()))
        if pid is None or str(pid) in m['bottles'] or not url.startswith('https://'):
            continue
        try:
            path = os.path.join(OUT, 'bottles', f'{pid}.webp')
            save_image(get(url), path, 640, square=False)
            m['bottles'][str(pid)] = {'src': f'images/bottles/{pid}.webp', 'source': url}
            added += 1
            if added % 25 == 0:
                print(f'  {added} bottles…')
                save_manifest(m)
            time.sleep(0.2)
        except Exception as e:
            print(f'  ! {brand} {name}: {e}', file=sys.stderr)
    save_manifest(m)
    print(f'{added} bottle photos added; manifest has {len(m["bottles"])}.')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('what', choices=['notes', 'bottles'])
    ap.add_argument('--top', type=int, default=150, help='how many of the most common notes to fetch')
    ap.add_argument('--csv', help='licensed bottle image feed: brand,name,image_url')
    a = ap.parse_args()
    fetch_notes(a.top) if a.what == 'notes' else fetch_bottles(a.csv)
