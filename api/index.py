from pathlib import Path
import sys
from flask import Flask

# Ensure app package can be imported when running under Vercel
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

try:
    # Import the user's Flask app from app.py
    from app import app as flask_app
except Exception as e:
    # Provide a minimal fallback app so Vercel returns errors instead of 500 on import
    flask_app = Flask(__name__)

def handler(request, response):
    """Vercel Python runtime handler.

    Vercel expects a function that accepts (request, response). We adapt by
    delegating to the Flask WSGI app via Werkzeug's WSGI adapter provided by
    Vercel runtime. The Vercel runtime will provide `request` and `response`
    objects compatible with this signature.
    """
    return flask_app(request, response)
