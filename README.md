# vyoiōn portable healthcare companion

## Start

On Windows, double-click start-vyoion.bat. It opens vyoiōn in your default browser. Leave the PowerShell window open while using the app; closing it stops that server. The launcher keeps the window open and reuses only a matching current server.

No installer, Node.js, Python, or third-party runtime is required. The launcher uses Windows PowerShell and serves files only to 127.0.0.1, trying ports 43187–43217. If an older copy is still running, it leaves that process alone and starts the updated app on the next free port; use the URL printed in the PowerShell window.

## First use

The maintainer copy loads `redist/api-key.txt` automatically. GitHub clones intentionally do not contain that private file. After the shared Cloudflare Worker is deployed, `redist/api-endpoint.txt` contains its public address; client copies use the hosted service without asking users for a provider key. If no hosted endpoint is configured, a private local copy can use a key in Settings.

The key file is plain text inside the maintainer's local portable folder. It is loaded into the local PowerShell process on launch and never sent to browser storage. Anyone who gets a copy can use the key and incur provider charges. Do not commit it, publish it, or distribute it to clients. Replace or remove the file to rotate or clear it. The app also accepts `GEMINI_API_KEY` from the process environment when no key file exists. The Cloudflare Worker source and deployment steps are in [`cloudflare/worker/README.md`](cloudflare/worker/README.md); the provider key is uploaded as a Worker secret.

## Features

- Text, voice, and video conversation modes.
- PDF and image attachments for report explanation.
- Attachments can total up to 12 MB per request.
- Optional camera preview with a separate full-screen view. Preview stays local until you start live video chat or choose Ask about this frame.
- Voice chat streams microphone audio to the live cloud conversation only after you start it. Typed and report replies in voice mode use cloud narration with a feminine default and a masculine option; the on-screen words appear in step with playback. Hindi and Hinglish self-reference follows the selected narrator. Selecting a report or image ends the live session before file analysis so two audio replies cannot overlap. Narration uses an additional cloud request and may add provider usage charges. If narration is unavailable, the browser’s built-in voice is used as a fallback.
- Settings let you select an input microphone, check its local audio level, and choose the camera used for preview and live video. Device choices are saved on the current device. Live sessions request the browser/device’s noise suppression and echo cancellation; actual support varies by device and browser.
- The voice sphere reacts to your voice and the assistant’s live audio.
- Video chat streams microphone audio and up to one camera frame per second while live chat is connected. Live cloud usage may be billed by your API provider.
- Chat messages and report contents are held in memory for the current browser session. Follow-up replies use recent conversation context; relevant follow-ups can resend the most recently shared report so the assistant can refer to its contents. vyoiōn does not save chat history to this folder.
- Text chat opens with Thinking Off selected. The Off control uses the lowest reasoning setting available for the configured cloud model; the provider does not guarantee that all internal reasoning is disabled. Choose Low, Mid, or High for written replies and single-frame questions. If another level has not started streaming after three seconds, it retries once at Off. That retry may use extra provider quota. Voice and live video use a separate real-time conversation mode, so the Thinking control does not change them. Simple greetings are answered locally for an immediate reply. Cloud response time can still vary.
- vyoiōn follows the user’s language and supports English, Hindi, and natural Hinglish replies.
- Weather requests show a location prompt if no city or country is named. The card shows the latest available Open-Meteo forecast-model conditions, the data time in that place’s GMT offset, and a refresh button; model data can differ from local weather-station readings. A time request without a named place immediately asks the browser for location permission, then shows the device’s local time and GMT offset when allowed. If permission is denied, the app explains how to allow it in browser settings. Place and map cards use Open-Meteo geocoding and OpenStreetMap maps.

## Privacy and healthcare

The app does not store report files or chat history in the project folder. Text messages and chosen reports go to the cloud service when you send them. Weather and place searches are sent to Open-Meteo; map previews load from OpenStreetMap. A time request without a named place triggers the browser location prompt; coordinates are used only if you allow access. Other current-location lookups use the app’s location button and browser permission. Microphone selection and the microphone test are local settings; test audio is not sent to the cloud. Live voice and video send microphone audio to the live cloud session while connected. Noise suppression and echo cancellation are requested from the browser/device for those sessions. During live video chat, up to one camera frame per second is streamed while connected; a still camera frame is sent only when you choose to ask about it. Use only files, camera, and microphone input you are comfortable sharing with the cloud service.

vyoiōn explains information for education. It does not diagnose, replace a clinician, or provide emergency care. Seek urgent in-person help for severe or sudden symptoms.

The assistant’s refusal to disclose private app details is a model instruction, not a way to hide local files. Anyone with the portable folder can inspect or change its source code.

## Portable folder

On another Windows PC, double-click start-vyoion.bat. The hosted endpoint is public configuration and can travel in a GitHub download; the provider key stays in the Worker secret. Clients need an internet connection and a supported modern browser for cloud AI, microphone, and camera features. Camera and microphone access depend on browser permission prompts.

interactive_webgl_particle_orb.tsx is the original orb reference file and is kept unchanged. The running app uses a local canvas-based microphone-reactive sphere so it needs no external packages.
