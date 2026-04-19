import json
import os
import base64
import urllib.request
from urllib.parse import urlparse

har_path = '/Users/batman_work/claude/apps/bejeweledGame/data/en.gameslol.net.har'
output_dir = '/Users/batman_work/claude/apps/bejeweledGame/data/mp3s'

os.makedirs(output_dir, exist_ok=True)

with open(har_path, 'r', encoding='utf-8') as f:
    har_data = json.load(f)

entries = har_data.get('log', {}).get('entries', [])

downloaded_count = 0

for entry in entries:
    request = entry.get('request', {})
    response = entry.get('response', {})
    
    url = request.get('url', '')
    
    # Check if it's an MP3 by URL extension or MIME type
    mime_type = response.get('content', {}).get('mimeType', '').lower()
    
    if url.lower().endswith('.mp3') or 'audio/mpeg' in mime_type or 'audio/mp3' in mime_type:
        # Extract a filename from the URL
        parsed_url = urlparse(url)
        filename = os.path.basename(parsed_url.path)
        if not filename.lower().endswith('.mp3'):
            filename = filename + '.mp3'
        if not filename or filename == '.mp3':
            filename = f"audio_{downloaded_count}.mp3"
            
        file_path = os.path.join(output_dir, filename)
        
        content = response.get('content', {})
        text = content.get('text', '')
        encoding = content.get('encoding', '')
        
        # Priority 1: Decode base64 content from HAR
        if text and encoding == 'base64':
            try:
                audio_data = base64.b64decode(text)
                with open(file_path, 'wb') as out_f:
                    out_f.write(audio_data)
                print(f"Extracted from HAR: {filename}")
                downloaded_count += 1
                continue
            except Exception as e:
                print(f"Failed to decode base64 for {filename}: {e}")
                
        # Priority 2: Download from URL if not in HAR content
        if url and url.startswith('http'):
            try:
                print(f"Downloading from URL: {url} -> {filename}")
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req) as response:
                    with open(file_path, 'wb') as out_f:
                        out_f.write(response.read())
                downloaded_count += 1
            except Exception as e:
                print(f"Failed to download {url}: {e}")

print(f"\nDone! Total MP3s downloaded/extracted: {downloaded_count}")
