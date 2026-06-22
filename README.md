# Wavefront — deploy guide

This folder is a complete, ready-to-deploy site:

```
wavefront-site/
├── index.html        ← the website
├── api/
│   └── analyze.js    ← serverless function that calls Claude (keeps your API key secret)
├── vercel.json        ← config
└── README.md
```

## 1. Get an Anthropic API key

Go to https://console.anthropic.com → API Keys → Create Key.
Keep this secret — never put it in index.html or any frontend file.

## 2. Deploy to Vercel (free)

**Option A — no command line, using GitHub:**
1. Create a new GitHub repo and push this folder to it.
2. Go to https://vercel.com → "Add New Project" → import that repo.
3. Before deploying, click "Environment Variables" and add:
   - Key: `ANTHROPIC_API_KEY`
   - Value: (paste your key from step 1)
4. Click Deploy. Vercel gives you a live URL like `your-project.vercel.app`.

**Option B — command line:**
```bash
npm install -g vercel
cd wavefront-site
vercel
# follow the prompts to create/link a project
vercel env add ANTHROPIC_API_KEY
# paste your key when prompted
vercel --prod
```

## 3. Test it

Open your deployed URL, go to either tab, upload a real `.v`/`.sv` file (and a spec PDF for the compliance tab), and click the run button. The browser reads the file, sends the extracted text to `/api/analyze`, which calls Claude server-side and returns structured JSON that renders into the cards.

## Notes & limits

- RTL text is truncated to ~15,000 characters per request (~10,000 for compliance mode) to keep prompts reasonable. Very large multi-thousand-line designs will be cut off — for those, split into focused per-module uploads.
- Each "generate" click is a single API call billed per Anthropic's standard token pricing (see https://www.anthropic.com/pricing).
- The function in `api/analyze.js` uses `claude-sonnet-4-6`. You can swap the model string if you want a faster/cheaper or more capable model.
- CORS is not an issue here since the frontend and API route are served from the same origin.
- If you ever need to rotate your key, update the `ANTHROPIC_API_KEY` environment variable in your Vercel project settings — no code changes needed.
