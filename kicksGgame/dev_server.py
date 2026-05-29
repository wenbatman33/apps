#!/usr/bin/env python3
# 開發用靜態伺服器：多執行緒 + no-cache（避免改了檔卻被瀏覽器快取擋住）
import sys
import http.server
import socketserver


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
    with ThreadingHTTPServer(('', port), NoCacheHandler) as httpd:
        print(f'dev server on http://localhost:{port} (no-cache, threaded)')
        httpd.serve_forever()
