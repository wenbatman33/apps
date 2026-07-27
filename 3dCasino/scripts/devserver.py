#!/usr/bin/env python3
# 開發用靜態伺服器：關閉快取，改 JS 後重新整理立即生效
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8471
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()


if __name__ == '__main__':
    with http.server.ThreadingHTTPServer(('', PORT), NoCacheHandler) as srv:
        print(f'dev server on http://localhost:{PORT} (no-cache)')
        srv.serve_forever()
