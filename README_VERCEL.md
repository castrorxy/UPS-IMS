Deployment notes for Vercel

1. Install Vercel CLI:

```
npm i -g vercel
```

2. From `ups-inventory-app` run locally:

```
vercel dev
```

3. To deploy:

```
vercel login
vercel --prod
```

Notes:
- `api/index.py` imports `app` from `app.py`. If your Flask app instance is named differently, update the import.
- Serverless runtime has ephemeral filesystem; move any persistent files to external services.
