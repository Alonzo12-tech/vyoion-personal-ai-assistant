vyoiōn REDISTRIBUTABLE RUNTIME NOTES

No third-party redistributable is needed.

The one-click launcher uses Windows PowerShell, which is included with supported Windows installations. The interface runs in the default modern browser. Keep this folder when copying or zipping the project so the portable runtime notes travel with it.

Requirements:
- Windows with Windows PowerShell
- A modern browser
- Internet access for cloud API requests
- A hosted endpoint in api-endpoint.txt for client downloads, or a private maintainer key file at api-key.txt
- Save and verify sends one brief setup request; provider usage may be billed
- Attachments totaling up to 12 MB per request

For a client download, api-endpoint.txt contains the public address of the shared hosted service. The provider key stays in that service as a secret; clients do not enter or receive it. The endpoint can be shared publicly. The maintainer's optional api-key.txt is plain text, excluded from Git, and must not be published or distributed. Settings may save a local key only when no hosted endpoint is configured. Remove api-key.txt and restart the launcher to clear the local key.

Camera and microphone features need browser permission. Preview remains local until you start live video chat or explicitly ask vyoiōn to analyze one still frame. While live video chat is connected, microphone audio and up to one camera frame per second are sent to the cloud; usage may be billed.
