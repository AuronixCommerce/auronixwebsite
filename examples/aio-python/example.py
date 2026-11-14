import json, os, sys, uuid
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.error import HTTPError, URLError
from config import load_env
class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None
load_env()
key = os.getenv('AIO_API_KEY', '')
if not key.startswith('aio_live_'):
    raise SystemExit('Set AIO_API_KEY in your private .env first.')
request_id = str(uuid.uuid4())
body = {'model': os.getenv('AIO_MODEL', 'aio-2-fast'), 'messages': [{'role': 'user', 'content': ' '.join(sys.argv[1:]) or 'Explain wholesale sourcing in two sentences.'}], 'max_completion_tokens': 512}
request = Request(os.getenv('AIO_BASE_URL', 'https://auronixcommerce.com/api/aio/v1') + '/chat/completions', data=json.dumps(body).encode(), headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'Idempotency-Key': request_id}, method='POST')
print('Request idempotency key:', request_id)
try:
    with build_opener(NoRedirect).open(request, timeout=60) as response:
        result = json.load(response)
    print(result['choices'][0]['message']['content'])
    print('Tokens:', result['usage'])
    print('Credits charged:', result['billing']['charged_units'] / result['billing']['units_per_credit'])
    print('Request ID:', result['id'])
except HTTPError as error:
    try:
        print('HTTP', error.code, json.load(error).get('error', {}).get('message', 'Request failed'), file=sys.stderr)
    except (ValueError, AttributeError):
        print('HTTP', error.code, 'Request failed', file=sys.stderr)
    sys.exit(1)
except (URLError, TimeoutError, OSError) as error:
    print('Connection failed. Check console Usage before submitting a new request; do not retry automatically with a new idempotency key.', file=sys.stderr)
    sys.exit(1)
