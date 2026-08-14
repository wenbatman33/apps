#!/usr/bin/env python3
"""開發用靜態伺服器：一律送 no-cache，避免改了程式碼瀏覽器還用舊的 module 快取。"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from pathlib import Path


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, fmt, *args):  # 安靜一點
        pass


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8642
    root = str(Path(__file__).parent)
    handler = partial(NoCacheHandler, directory=root)
    print(f'serving {root} at http://localhost:{port} (no-cache)')
    ThreadingHTTPServer(('127.0.0.1', port), handler).serve_forever()
