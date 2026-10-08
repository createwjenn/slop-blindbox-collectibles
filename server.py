"""Local preview and Gmail delivery. Serves only dist/, never the settings file."""
import json
import os
import re
import smtplib
import ssl
import threading
import time
from email.message import EmailMessage
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / 'dist'
SENDER = 'jenn.creativespace@gmail.com'
FIGURES = {
    'niu-lai': 'Niu Lai', 'strawberlina': 'Strawberlina', 'bananito': 'Bananito',
    'tung-tung-tung': 'Tung Tung Tung', 'tralalero-tralala': 'Tralalero Tralala',
    'ballerina-capuccina': 'Ballerina Capuccina', 'chill-guy': 'Chill Guy',
    'secret-capybara-toilet': 'Secret Capybara Toilet',
}


def app_password():
    # Read on each request so saving the file takes effect without a restart.
    value = os.environ.get('GMAIL_APP_PASSWORD', '')
    if not value:
        try:
            for line in (ROOT / '.env.local').read_text().splitlines():
                key, sep, candidate = line.partition('=')
                if sep and key.strip() == 'GMAIL_APP_PASSWORD':
                    value = candidate.strip().strip('\"\'')
        except FileNotFoundError:
            pass
    value = re.sub(r'\s+', '', value)
    return value if re.fullmatch(r'[a-zA-Z]{16}', value) else ''


def validate_request(data):
    if not isinstance(data, dict):
        raise ValueError('Please enter a valid email address.')
    recipient = data.get('email', '')
    slug = data.get('slug', '')
    if not isinstance(recipient, str) or not isinstance(slug, str):
        raise ValueError('Invalid wallpaper request.')
    recipient = recipient.strip()
    if len(recipient) > 254 or not re.fullmatch(r"[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}", recipient):
        raise ValueError('Please enter a valid email address.')
    if slug not in FIGURES:
        raise ValueError('Please select a collectible wallpaper.')
    return recipient, slug


def make_message(recipient, slug):
    message = EmailMessage()
    message['From'] = f'Slop Collectibles <{SENDER}>'
    message['To'] = recipient
    message['Subject'] = f'Your {FIGURES[slug]} wallpaper'
    message.set_content(f'Your little world is ready!\n\nHere is your {FIGURES[slug]} wallpaper. Save the attached image and make it your lock screen.\n\nEnjoy your Slop collectible!')
    message.add_attachment((PUBLIC / 'assets' / 'wallpapers' / f'{slug}.png').read_bytes(), maintype='image', subtype='png', filename=f'slop-{slug}-wallpaper.png')
    return message


def deliver(message, password):
    with smtplib.SMTP_SSL('smtp.gmail.com', 465, context=ssl.create_default_context(), timeout=20) as smtp:
        smtp.login(SENDER, password)
        smtp.send_message(message)


class RateLimit:
    def __init__(self):
        self.lock = threading.Lock()
        self.attempts = []

    def allow(self, address):
        now = time.monotonic()
        with self.lock:
            self.attempts = [(t, ip) for t, ip in self.attempts if now - t < 3600]
            recent = [t for t, ip in self.attempts if ip == address and now - t < 600]
            if len(self.attempts) >= 30 or len(recent) >= 5 or (recent and now - recent[-1] < 15):
                return False
            self.attempts.append((now, address))
            return True


class Handler(SimpleHTTPRequestHandler):
    limiter = RateLimit()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC), **kwargs)

    def log_message(self, format, *args):
        # Do not record addresses, passwords, or request payloads.
        pass

    def json_response(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = unquote(urlsplit(self.path).path)
        target = (PUBLIC / path.lstrip('/')).resolve()
        if any(part.startswith('.') for part in Path(path).parts) or not target.is_relative_to(PUBLIC):
            self.send_error(404)
            return
        super().do_GET()

    def do_POST(self):
        if urlsplit(self.path).path != '/api/wallpaper-email':
            self.json_response(404, {'error': 'Not found.'})
            return
        port = self.server.server_port
        allowed = {f'http://127.0.0.1:{port}', f'http://localhost:{port}'}
        if self.headers.get('Origin') not in allowed or 'http://' + self.headers.get('Host', '') not in allowed:
            self.json_response(403, {'error': 'Please send from the local website.'})
            return
        if self.headers.get_content_type() != 'application/json':
            self.json_response(415, {'error': 'Invalid request format.'})
            return
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if size < 1 or size > 2048:
                raise ValueError('Invalid request size.')
            recipient, slug = validate_request(json.loads(self.rfile.read(size)))
        except (ValueError, UnicodeError):
            self.json_response(400, {'error': 'Please enter a valid email and select a wallpaper.'})
            return
        password = app_password()
        if not password:
            self.json_response(503, {'error': 'Email is not ready yet. Please download your wallpaper for now.'})
            return
        if not self.limiter.allow(self.client_address[0]):
            self.json_response(429, {'error': 'Please wait a little before sending another wallpaper.'})
            return
        try:
            deliver(make_message(recipient, slug), password)
        except (OSError, smtplib.SMTPException):
            self.json_response(502, {'error': 'Email could not be sent. Please try later or download the image.'})
            return
        self.json_response(200, {'sent': True})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', '4187'))
    print(f'Slop preview: http://127.0.0.1:{port}/', flush=True)
    ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
