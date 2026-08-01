#!/usr/bin/env python3
"""本機開發用靜態伺服器：強制不快取。

瀏覽器會把 ES module 存進 memory cache，改了 src/*.js 重新整理也可能拿到舊檔，
導致「明明改了卻沒生效」。這裡統一送 no-store，開發時才不會被騙。

    python3 serve.py [port]
"""
import http.server
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8777


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, fmt, *args):        # 少一點雜訊
        if '304' not in fmt % args:
            super().log_message(fmt, *args)


socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('', PORT), NoCacheHandler) as httpd:
    print(f'serving http://localhost:{PORT} (no-cache)')
    httpd.serve_forever()
