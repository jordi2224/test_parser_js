import mimetypes
from http.server import SimpleHTTPRequestHandler, HTTPServer

class CustomHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add the X-Content-Type-Options header
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def guess_type(self, path):
        # Ensure .js files are served with the correct MIME type
        if path.endswith('.js'):
            return 'application/javascript'
        return super().guess_type(path)

if __name__ == '__main__':
    port = 8080
    print(f"Serving on http://localhost:{port}")
    server = HTTPServer(('localhost', port), CustomHandler)
    server.serve_forever()