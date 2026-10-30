vyoiōn REDISTRIBUTABLE RUNTIME NOTES

No third-party redistributable is needed.

The one-click launcher uses Windows PowerShell, which is included with supported Windows installations. The interface runs in the default modern browser. Keep this folder when copying or zipping the project so the portable runtime notes travel with it.

Requirements:
- Windows with Windows PowerShell
- A modern browser
- Internet access for cloud API requests
- Each user provides a Gemini API key once in Settings; the app saves and selects keys locally
- Save and verify sends one brief setup request; check the provider's current limits and account terms
- Attachments totaling up to 12 MB per request

Open Settings from the API key link in the app's lower bar. Paste a key and choose Save and verify. It is saved in api-keys.json and reloaded on later launches. Add more keys any time; use the Saved API keys list to switch between them, or Forget selected to remove one. The older api-key.txt file is migrated automatically when the app starts.

api-keys.json and api-key.txt are local plain-text secrets and are excluded from GitHub. Do not put a key in public documentation, commit one, or include these files in a zip shared with other people. A GitHub download has no saved key; each PC user enters their own once. Treat even free-tier API keys like passwords and rotate keys that have been exposed.

Camera and microphone features need browser permission. Preview remains local until you start live video chat or explicitly ask vyoiōn to analyze one still frame. While live video chat is connected, microphone audio and up to one camera frame per second are sent to the cloud; usage may be billed.
