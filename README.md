# vyoiōn portable healthcare companion

## Start

On Windows, double-click start-vyoion.bat. It opens vyoiōn in your default browser. Leave the small PowerShell window open while using the app; close it to stop the local web server.

No installer, Node.js, Python, or third-party runtime is required. The launcher uses Windows PowerShell and serves the files only to 127.0.0.1 on port 43187. The redist folder explains the runtime requirements.

## First use

The portable folder loads `redist/api-key.txt` automatically. Settings can replace the key and verify access. If the key file is absent, enter a key in Settings. Verification sends one short setup request, so provider usage may be billed.

The key file is plain text inside the portable folder. It is loaded into the local PowerShell process on launch and never sent to browser storage. Keep the folder and any zip private: anyone who gets a copy can use the key and incur provider charges. Replace or remove the file to rotate or clear it. The app also accepts `GEMINI_API_KEY` from the process environment when no key file exists.

## Features

- Text, voice, and video conversation modes.
- PDF and image attachments for report explanation.
- Attachments can total up to 12 MB per request.
- Optional camera preview with a separate full-screen view. Preview stays local until you start live video chat or choose Ask about this frame.
- Voice chat streams microphone audio to the live cloud conversation only after you start it. Typed and report replies in voice mode use cloud narration with a feminine default and a masculine option; the on-screen words appear in step with playback. Hindi and Hinglish self-reference follows the selected narrator. Narration uses an additional cloud request and may add provider usage charges. If narration is unavailable, the browser’s built-in voice is used as a fallback.
- The voice sphere reacts to your voice and the assistant’s live audio.
- Video chat streams microphone audio and up to one camera frame per second while live chat is connected. Live cloud usage may be billed by your API provider.
- Chat messages and report contents are held in memory for the current browser session. vyoiōn does not save chat history to this folder.
- Text chat opens with Thinking Off selected. The Off control uses the lowest reasoning setting available for the configured cloud model; the provider does not guarantee that all internal reasoning is disabled. Choose Low, Mid, or High for written replies and single-frame questions. If another level has not started streaming after three seconds, it retries once at Off. That retry may use extra provider quota. Voice and live video use a separate real-time conversation mode, so the Thinking control does not change them. Simple greetings are answered locally for an immediate reply. Cloud response time can still vary.
- vyoiōn follows the user’s language and supports English, Hindi, and natural Hinglish replies.
- Weather requests for a named place show a current conditions card. Clock, location, and map requests show live time or a map card without waiting for the chat model. These cards use Open-Meteo location and weather data and OpenStreetMap maps. A request for current location asks the browser for permission only after the user explicitly requests it or presses “Use my location.”

## Privacy and healthcare

The app does not store report files or chat history in the project folder. Text messages and chosen reports go to the cloud service when you send them. Weather and place searches are sent to Open-Meteo; map previews load from OpenStreetMap. Current coordinates are used only after you request your location and allow the browser prompt. During live voice chat, microphone audio goes directly to the live cloud session using a short-lived, single-use token; the permanent key remains in the local process. During live video chat, microphone audio and up to one camera frame per second are streamed while connected. A still camera frame is sent only when you choose to ask about it. Use only files, camera, and microphone input you are comfortable sharing with the cloud service.

vyoiōn explains information for education. It does not diagnose, replace a clinician, or provide emergency care. Seek urgent in-person help for severe or sudden symptoms.

The assistant’s refusal to disclose private app details is a model instruction, not a way to hide local files. Anyone with the portable folder can inspect or change its source code.

## Portable folder

Copy or zip the entire folder. On another Windows PC, double-click start-vyoion.bat; the included key file loads automatically. An internet connection and a supported modern browser are needed for cloud AI, microphone, and camera features. Camera and microphone access depend on browser permission prompts.

interactive_webgl_particle_orb.tsx is the original orb reference file and is kept unchanged. The running app uses a local canvas-based microphone-reactive sphere so it needs no external packages.
