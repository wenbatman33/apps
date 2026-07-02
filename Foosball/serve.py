# 本地開發伺服器：強制 no-store，避免瀏覽器快取到新舊混合的 JS 模組
import http.server

PORT = 8917

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()

if __name__ == '__main__':
    print(f'serving on http://localhost:{PORT} (no-cache)')
    http.server.ThreadingHTTPServer(('', PORT), NoCacheHandler).serve_forever()
