# 本地開發伺服器：一律回應 no-store，避免瀏覽器快取舊版遊戲檔案
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()


if __name__ == '__main__':
    ThreadingHTTPServer(('', 8437), NoCacheHandler).serve_forever()
