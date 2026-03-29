#!/usr/bin/env python3
import json, time, urllib.request, urllib.parse

# Known non-Osaka/Kyoto keywords in place names
EXCLUDE_KEYWORDS = [
    # Tokyo areas
    '銀座','新宿','渋谷','代々木','代代木','池尻','三軒茶屋','自由が丘','自由ヶ丘',
    '学芸大学','学大','恵比寿','目黒','中目黒','世田谷','杉並','吉祥寺',
    '下北沢','高円寺','荻窪','西荻窪','浅草','上野','秋葉原','神田','表参道',
    '原宿','青山','六本木','麻布','白金','品川','五反田','大崎','渋谷',
    'Ginza','Shinjuku','Shibuya','Ginza',
    # Fukuoka
    '警固','久留米','福岡','博多','天神',
    # Hokkaido
    'ニセコ','Niseko','札幌','函館',
    # Others
    '軽井沢','Karuizawa','箱根','Hakone',
    '倉敷','鎌倉','横浜','Yokohama',
    '名古屋','神戸','Kobe',
    '長門','Nagato','徳島','高知','松山',
    '松本','長野','Nagano','富山','Toyama',
    '石川','Ishikawa','金沢','Kanazawa',
    '尾道','Onomichi','丸亀','Marugame',
    '伊勢','Iseshima','犬山','Inuyama',
    '那須','益子','Mashiko','湯本','Yumoto',
    '越前','Echizen','若狭','Wakasa',
    '奄美','Amami','対馬','Tsushima',
    '高千穂','Takachiho',
    'Setoda','Niseko','Nagatoyumoto',
]

# Osaka/Kyoto bounding box
LAT_MIN, LAT_MAX = 34.3, 35.3
LON_MIN, LON_MAX = 135.2, 136.0

def name_has_exclude(name):
    name_lower = name.lower()
    for kw in EXCLUDE_KEYWORDS:
        if kw.lower() in name_lower:
            return True
    return False

def geocode(name):
    q = urllib.parse.quote(name + ' 大阪 OR 京都 日本')
    url = f'https://nominatim.openstreetmap.org/search?q={q}&format=json&limit=1&countrycodes=jp'
    req = urllib.request.Request(url, headers={'User-Agent': 'osaka-tour-filter/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
        if data:
            return float(data[0]['lat']), float(data[0]['lon'])
    except:
        pass
    return None, None

with open('oyado_all_places.json') as f:
    data = json.load(f)

filtered = {}
for cat_key, cat in data.items():
    kept = []
    for p in cat['places']:
        name = p['name']
        if name_has_exclude(name):
            print(f'  [SKIP-keyword] {name}')
            continue
        # Geocode to verify location
        lat, lon = geocode(name)
        time.sleep(1.1)  # Nominatim rate limit
        if lat is None:
            # Can't verify, skip
            print(f'  [SKIP-nogeo] {name}')
            continue
        if LAT_MIN <= lat <= LAT_MAX and LON_MIN <= lon <= LON_MAX:
            print(f'  [KEEP] {name} ({lat:.4f}, {lon:.4f})')
            kept.append(p)
        else:
            print(f'  [SKIP-loc] {name} ({lat:.4f}, {lon:.4f})')

    if kept:
        filtered[cat_key] = dict(cat, places=kept, total=len(kept))
    print(f'\n{cat_key}: {len(cat["places"])} -> {len(kept)}\n')

with open('oyado_osaka_kyoto.json', 'w', ensure_ascii=False) as f:
    json.dump(filtered, f, ensure_ascii=False, indent=2)

print(f'\nDone. {sum(len(c["places"]) for c in filtered.values())} places kept.')
