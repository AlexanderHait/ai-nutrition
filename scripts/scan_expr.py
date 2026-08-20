import json,sys

def walk(v, path, out):
    if isinstance(v, dict):
        for k, x in v.items():
            walk(x, path + [str(k)], out)
    elif isinstance(v, list):
        for i, x in enumerate(v):
            walk(x, path + [str(i)], out)
    elif isinstance(v, str):
        if '{{' in v and not v.startswith('='):
            out.append(('/'.join(path), v))

def scan(path):
    d = json.load(open(path))
    wf = d['workflow'] if 'workflow' in d else d
    print(f"=== {wf['name']}  ({wf['id']}), узлов {len(wf['nodes'])}")
    total = 0
    for n in wf['nodes']:
        # jsCode и промпты — это код и текст, там {{ }} законны
        params = {k: v for k, v in (n.get('parameters') or {}).items() if k not in ('jsCode',)}
        found = []
        walk(params, [], found)
        for p, v in found:
            total += 1
            print(f"   ⚠ {n['name']}  [{n['type'].split('.')[-1]}]  {p}")
            print(f"       {v[:180]}")
    if total == 0:
        print("   чисто")
    return total

if __name__ == '__main__':
    t = 0
    for p in sys.argv[1:]:
        t += scan(p)
    print(f"\nВСЕГО подозрительных значений: {t}")
