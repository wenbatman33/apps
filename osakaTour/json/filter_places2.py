#!/usr/bin/env python3
"""
Filter oyado_all_places.json to keep only Osaka/Kyoto/Nara area places.
Strategy:
1. Keyword blocklist for known non-Osaka/Kyoto places
2. Nominatim geocode with simple query (name + Japan), check bounding box
3. Places not found by Nominatim → keep if name looks Japanese/local, skip English-only chains
"""
import json, time, urllib.request, urllib.parse, sys

# Osaka + Kyoto + Uji + Nara bounding box (generous)
LAT_MIN, LAT_MAX = 34.3, 35.3
LON_MIN, LON_MAX = 135.1, 136.0

EXCLUDE_KW = [
    # Tokyo
    '銀座','新宿','渋谷','代々木','代代木','池尻','三軒茶屋','自由が丘','自由ヶ丘',
    '学芸大学','恵比寿','目黒','中目黒','世田谷','吉祥寺','下北沢','高円寺',
    '荻窪','西荻窪','浅草','秋葉原','表参道','原宿','青山','六本木','麻布',
    '白金','大崎','Ginza','Tokyo','tokyo',
    # Fukuoka
    '警固','久留米','福岡','博多','天神',
    # Hokkaido
    'ニセコ','Niseko','niseko','札幌','函館',
    # Others clearly not Osaka/Kyoto
    '軽井沢','Karuizawa','箱根','Hakone','hakone',
    '倉敷','鎌倉','横浜','Yokohama',
    '名古屋','神戸','Kobe','kobe',
    '長門','Nagato','徳島','高知','松山',
    '富山','Toyama','金沢','Kanazawa',
    '尾道','Onomichi','丸亀','Marugame',
    '伊勢','犬山','Inuyama',
    '那須','益子','Mashiko',
    '越前','Echizen','若狭','Wakasa',
    '奄美','Amami','Setoda',
    'Nagatoyumoto','NAGATOYUMOTO',
    'blanc a tokyo','Blanc a tokyo',
    'bbb haus',  # Kyushu
]

def blocked(name):
    for kw in EXCLUDE_KW:
        if kw in name:
            return True
    return False

def geocode(name):
    q = urllib.parse.quote(name + ' 日本')
    url = f'https://nominatim.openstreetmap.org/search?q={q}&format=json&limit=3&countrycodes=jp'
    req = urllib.request.Request(url, headers={'User-Agent':'osaka-tour/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=8) as r:
            results = json.loads(r.read())
        for item in results:
            lat, lon = float(item['lat']), float(item['lon'])
            if LAT_MIN <= lat <= LAT_MAX and LON_MIN <= lon <= LON_MAX:
                return lat, lon, True   # found in area
        if results:
            lat, lon = float(results[0]['lat']), float(results[0]['lon'])
            return lat, lon, False      # found but outside area
    except Exception as e:
        pass
    return None, None, None             # not found

# Skip categories the user already removed
HIDDEN = {'oyado_ARCHITECTURE__ART','oyado_BAR','oyado_FLOWER_SHOP','oyado_HOTEL','oyado_LIQUOR_STORE'}

with open('oyado_all_places.json') as f:
    data = json.load(f)

filtered = {}
total_kept = 0

for cat_key, cat in data.items():
    if cat_key in HIDDEN:
        continue

    kept = []
    print(f'\n=== {cat_key} ===', flush=True)

    for p in cat['places']:
        name = p['name']

        if blocked(name):
            print(f'  ✗ [kw] {name}', flush=True)
            continue

        lat, lon, in_area = geocode(name)
        time.sleep(1.1)

        if in_area is True:
            print(f'  ✓ {name} ({lat:.3f},{lon:.3f})', flush=True)
            kept.append(p)
        elif in_area is False:
            print(f'  ✗ [loc] {name} ({lat:.3f},{lon:.3f})', flush=True)
        else:
            # Not found on Nominatim — skip to be safe
            print(f'  ? [nf] {name}', flush=True)

    filtered[cat_key] = dict(cat, places=kept, total=len(kept))
    print(f'  → kept {len(kept)}/{len(cat["places"])}', flush=True)
    total_kept += len(kept)

with open('oyado_osaka_kyoto.json', 'w', ensure_ascii=False) as f:
    json.dump(filtered, f, ensure_ascii=False, indent=2)

print(f'\n✓ Done. Total kept: {total_kept}')
