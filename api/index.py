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

# Expose the Flask WSGI app as a top-level symbol named `app` so Vercel can
# detect and run it directly. This is the simplest compatible interface.
app = flask_app

# Also provide a `handler` for alternative runtimes that expect a function.
def handler(request, response):
    return app(request, response)
