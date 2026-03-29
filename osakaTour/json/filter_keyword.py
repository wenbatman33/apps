#!/usr/bin/env python3
"""
Filter by keyword blocklist only - removes places with clear non-Osaka/Kyoto location indicators.
"""
import json

EXCLUDE_KW = [
    # Tokyo districts
    '銀座','新宿','渋谷','代々木','代代木','池尻大橋','三軒茶屋','自由が丘','自由ヶ丘',
    '学芸大学','学大','恵比寿','目黒','中目黒','世田谷','吉祥寺','下北沢','高円寺',
    '荻窪','西荻窪','浅草','秋葉原','表参道','原宿','青山','六本木','麻布十番',
    '白金','大崎','五反田','池尻','代代木上原','Gakugei Daigaku',
    'tokyo','Tokyo','TOKYO',
    # Fukuoka
    '警固','久留米','福岡','博多','天神',
    # Hokkaido
    'ニセコ','Niseko','niseko','札幌','函館',
    # Others
    '軽井沢','Karuizawa','箱根','Hakone',
    '倉敷','鎌倉','横浜','Yokohama',
    '名古屋',
    '長門','徳島','高知','松山',
    '富山','金沢','Kanazawa',
    '尾道','Onomichi','丸亀','Marugame',
    '伊勢志摩','犬山','Inuyama',
    '益子','Mashiko',
    '越前','若狭',
    '奄美','Setoda','Nagatoyumoto',
    'Blanc a tokyo','blanc a tokyo',
    '大須',  # Nagoya
    '岡山',  # Okayama
    'Sauna Tokyo','sauna tokyo',
    'Azabujuban','azabujuban',
    '稲村ヶ崎',  # Kamakura
    'PostCoffee',  # Tokyo
    'Plant-based cafe NICE',  # Tokyo
    'Gemia',  # Tokyo
    'plant-planet',  # Tokyo
    'YIDAKI',  # unclear but Tokyo area
    'tienda',  # Tokyo
    'NOVELS',  # Tokyo
    'カド',  # Tokyo cafe
    'Mimura Coffee',  # unclear
    'B Sankyō','RA COFFEE','229','SUNDAE APART','seihitsu',
    'Ventura Coffee','Toaru Coffee',  # Tokyo cafes
    'Stumptown Coffee',  # Tokyo
    'Verve Coffee',  # Tokyo
    'SHIROUZU COFFEE',  # Fukuoka
    'bills Ginza','The Burn',
    'SHOLA at SHISHI-IWA-HOUSE',  # Karuizawa
    'Snow Shoveling',  # unclear
    'Tengyu Bookstore',
    'flotsam books',
    'Yuran Antiquarian',
    'ammel','本屋すみれ','Book shop tsukahara',
    'KIMAMA BOOKS','余波舎','汽水空港',
    'BOOKS&FARM','BOOKNERD','Tomari','石川屋','ARBOR BOOKS',
    'MINOU BOOKS 久留米','円錐書店',
    '臺灣鹿港肉包','Boulangerie Sudo','Boulangerie Sourire',
    'オーガニック直売所','NiOR','hélianthe',
    'Marujin Store','ソーセージパーク','TANUKI APPETIZING',
    'Kawazoe','Pan Calite','Furoindo','Pan do coro',
    'Pain Yorutono','西川ぱんじゅう店','Bake House Yellowknife',
    'Blanc a tokyo','SunBake',
    'FILNI','Komonokaen','T Plants Labo','ソレトナ',
    'Santa Ana Garden','BUD PLANTS','PANGEA',
    'Dried Flower','Seeding','北中植物商店','ビザールパーク',
    'hanadocoro','apaiser','CHARM flowers','edalab','Araheamy','soucit','Kiki',
    'Lopnur',
    'bills','CARVAAN',
    'Brewery & Restaurant CARVAAN',
    'Ogura Idekita','Nao-Chan',
    'さんぱち食堂',
    'SHOLA',
    'Câline',
    'curation',
    '6ème',
    'STLAB','LiT',
    'Trattoria Tabulé',
    'SATOYAMA TERRACE',
    'sauna kolme','Sauna Shikiji',
    '522 Tokujinotani','VIEHÄttÄVÄ',
    'Rikkarikka',
    '御湯神指し','Nukatoyuge',
    'KIWAMI SAUNA 大須',
]

HIDDEN = {'oyado_ARCHITECTURE__ART','oyado_BAR','oyado_FLOWER_SHOP','oyado_HOTEL','oyado_LIQUOR_STORE'}

def blocked(name):
    for kw in EXCLUDE_KW:
        if kw in name:
            return True
    return False

with open('oyado_all_places.json') as f:
    data = json.load(f)

filtered = {}
total_before = 0
total_after = 0

for cat_key, cat in data.items():
    if cat_key in HIDDEN:
        continue
    kept = []
    for p in cat['places']:
        total_before += 1
        if blocked(p['name']):
            print(f'  ✗ {p["name"]}')
        else:
            kept.append(p)
            total_after += 1
    filtered[cat_key] = dict(cat, places=kept, total=len(kept))
    print(f'{cat_key}: {len(cat["places"])} → {len(kept)}')

with open('oyado_osaka_kyoto.json', 'w', encoding='utf-8') as f:
    json.dump(filtered, f, ensure_ascii=False, indent=2)

print(f'\nDone: {total_before} → {total_after} places')
