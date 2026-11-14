import hashlib, hmac, json, os, time
from http.server import BaseHTTPRequestHandler, HTTPServer
from config import load_env
load_env()
secret = os.getenv('AIO_WEBHOOK_SECRET', '')
if not secret.startswith('whsec_'):
    raise SystemExit('Set your private AIO_WEBHOOK_SECRET in .env.')
# Demonstration only: replace with durable event-ID storage in production.
seen = {}
class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != '/aio-webhook':
            self.send_error(404); return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if length < 1 or length > 65536:
                self.send_error(413); return
            raw = self.rfile.read(length)
            timestamp = self.headers.get('AIO-Webhook-Timestamp', '')
            signature = self.headers.get('AIO-Webhook-Signature', '')
            event_id = self.headers.get('AIO-Webhook-Id', '')
            if not timestamp.isdigit() or abs(time.time() - int(timestamp)) > 300:
                self.send_error(401); return
            expected = 'v1=' + hmac.new(secret.encode(), timestamp.encode() + b'.' + raw, hashlib.sha256).hexdigest()
            if not hmac.compare_digest(signature, expected):
                self.send_error(401); return
            event = json.loads(raw)
            if not event_id or event.get('id') != event_id:
                self.send_error(400); return
            for key in list(seen):
                if seen[key] < time.time() - 86400:
                    del seen[key]
            if event_id not in seen:
                seen[event_id] = time.time()
                print('Verified AIO event:', event.get('type'), event_id, event.get('data'))
                # Enqueue a durable, idempotent business handler here.
            self.send_response(200); self.send_header('Content-Type', 'application/json'); self.end_headers(); self.wfile.write(b'{"received":true}')
        except (ValueError, UnicodeDecodeError, TypeError):
            self.send_error(400)
HTTPServer(('127.0.0.1', int(os.getenv('PORT', '3001'))), Handler).serve_forever()
