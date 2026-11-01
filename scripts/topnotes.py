import csv, json, sys, collections
c = collections.Counter(); a = collections.Counter()
for x in csv.DictReader(open(sys.argv[1], encoding='utf-8-sig')):
    try: n = json.loads(x["notes"])
    except Exception: continue
    if isinstance(n, list): n = {"base": n}
    if not n: continue
    try: pass
    except Exception: continue
    for k in ('top','middle','base'):
        for v in (n.get(k) or []): c[v.strip().lower()] += 1
    try:
        for v in json.loads(x['main_accords_dirty']): a[v] += 1
    except Exception: pass
print(len(c)); print(', '.join(f"{k}:{v}" for k,v in c.most_common(220)))
print(len(a)); print(', '.join(f"{k}:{v}" for k,v in a.most_common(80)))
