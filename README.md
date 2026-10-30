# vyoiōn portable healthcare companion

vyoiōn is a portable Windows app by INCENDO for explaining health information and medical reports in plain language. It runs in your browser and uses your Gemini API key for cloud responses.

## Start on Windows

1. Download or unzip the project folder.
2. Double-click `start-vyoion.bat`.
3. Keep the PowerShell window open while using vyoiōn. Closing it stops the local app server.

No separate Python, Node.js, or app installer is needed for personal API-key mode. The launcher uses Windows PowerShell and opens the app in your default browser. Use a current browser and an internet connection for cloud features.

## Set up your own Gemini API key

Each person using a downloaded copy needs a Gemini API key from their own Google AI Studio account. The repository does not provide a key.

1. Create or copy a key from [Google AI Studio](https://aistudio.google.com/app/apikey). Review the current account, usage, and billing limits there.
2. Start vyoiōn and select **API key** in the bottom bar, or open **Settings**.
3. Paste your key and select **Save and verify**. A successful verification makes the cloud features ready.
4. On later launches, vyoiōn automatically selects your saved key. To switch keys, open **API key** and choose one under **Saved API keys**. Add another key to keep both available, or choose **Forget selected** to remove one from this PC.

Keys are saved in `redist/api-keys.json` on that PC so you do not have to enter them every time. This is a plain-text local file, excluded from GitHub. Keep the computer and folder private, and do not put this file or `redist/api-key.txt` in a Git commit, screenshot, shared zip, or public upload. A new clone or another PC has no saved key; its user must set up their own. The older `redist/api-key.txt` file is imported locally if present.

If Settings says **Shared cloud access**, this copy has `redist/api-endpoint.txt` configured and uses its owner's hosted service instead of a personal key. To use your own key, remove that endpoint file and restart vyoiōn. Shared-service requests use the service owner's provider account and limits; do not publish a shared endpoint unless you intend to operate that service.

If verification fails, check that the key is complete and active in your AI Studio account, that the required Gemini API is available to its project, and that your account has remaining quota. You can remove a bad saved key in Settings and save a replacement.

## What vyoiōn can do

- Text, voice, and video conversations, with a selectable thinking level for text replies.
- PDF and image uploads for medical-report explanations.
- Optional camera preview and live video conversation.
- Weather, local-time, and place cards when relevant to a request.
- Microphone selection and a local microphone test in Settings.

## Privacy and healthcare

Messages and selected report files are sent to the configured cloud service when you submit them. Live voice sends microphone audio while connected; live video can send camera frames while connected. The app keeps chat history in memory for the current browser session and does not save it to this project folder. Avoid sharing information you do not want processed by the configured service.

vyoiōn provides educational explanations and is not a substitute for emergency care. Seek urgent help for severe or sudden symptoms.

## Optional shared cloud service

The Cloudflare Worker is an optional deployment for teams that want to operate a shared service. It keeps the provider key as a Cloudflare secret; clients using that endpoint do not enter personal keys. Deployment instructions and limits are in [`cloudflare/worker/README.md`](cloudflare/worker/README.md). For a GitHub download where each client supplies their own key, do not include `redist/api-endpoint.txt`.

## Repository safety

Never put an API key, access token, or other credential in source files, documentation, commit messages, or screenshots. `.gitignore` excludes local key files, but still review `git status` and the changes being committed before pushing. If a key has been shared or committed, revoke it in Google AI Studio and create a replacement; deleting it from the latest file alone does not remove it from older commits.
