vyoiōn REDISTRIBUTABLE RUNTIME NOTES

No third-party redistributable is needed.

The one-click launcher uses Windows PowerShell, which is included with supported Windows installations. The interface runs in the default modern browser. Keep this folder when copying or zipping the project so the portable runtime notes travel with it.

Requirements:
- Windows with Windows PowerShell
- A modern browser
- Internet access for cloud API requests
- The portable API key file at api-key.txt, or an API key entered in Settings
- Save and verify sends one brief setup request; provider usage may be billed
- Attachments totaling up to 12 MB per request

Settings writes the API key to this folder as api-key.txt, and the launcher loads it on every start. The file is plain text and is included when you zip the folder; anyone with the folder can use the key and may incur provider charges. Keep the folder private. Remove api-key.txt and restart the launcher to clear the saved key.

Camera and microphone features need browser permission. Preview remains local until you start live video chat or explicitly ask vyoiōn to analyze one still frame. While live video chat is connected, microphone audio and up to one camera frame per second are sent to the cloud; usage may be billed.
