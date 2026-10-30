# Shared cloud API

This Worker keeps the provider key on Cloudflare. The portable app calls its local PowerShell server, which forwards only the app's approved Gemini requests to this Worker. Client downloads do not need an API key.

The Worker accepts only the configured chat stream, speech generation, model verification, and one-use Live API token routes. It rejects other paths, oversized requests, and invalid Live API token settings. A Durable Object applies per-IP minute and daily limits plus a shared daily request cap. The defaults are in `wrangler.jsonc`; raise them only after checking provider quotas and usage charges.

## Deploy

1. Install Node.js only on the maintainer PC and sign in to Cloudflare once with `npx wrangler login`.
2. Keep the provider key in the ignored local file `redist/api-key.txt`. Never put it in `wrangler.jsonc`, source code, or a GitHub commit.
3. Run `cloudflare/deploy.ps1` from PowerShell. It deploys the Worker, uploads `GEMINI_API_KEY` as a Cloudflare secret, then saves the public Worker URL to `redist/api-endpoint.txt`. The initial Worker upload intentionally happens before setting the secret; the code returns a configuration error until the secret is installed.
4. Commit and push the app source and `redist/api-endpoint.txt`. The endpoint is public configuration; the provider key remains a Cloudflare secret and in the maintainer's ignored local key file.

The deployed endpoint is a public service, so rate limits and the provider's own quota/billing controls matter. The request cap is a safety ceiling, not user authentication. Review Cloudflare and Google usage before sharing the link broadly.

For local Worker development, copy `.dev.vars.example` to `.dev.vars` and fill it with a development key. `.dev.vars` is ignored by Git. `npx wrangler dev` does not publish the Worker.
