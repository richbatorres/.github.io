# Wedding Pics Shared Gallery — Deployment Guide

A serverless photo and video sharing gallery for weddings, powered by Google Apps Script and Google Drive. Guests scan a QR code, upload their photos/videos, and everyone can browse the shared gallery — no app install required.

---

## System Architecture Overview

```
┌─────────────┐       HTTPS        ┌──────────────────────┐       Google Drive API       ┌─────────────┐
│  Guest's    │  ──────────────►   │  Google Apps Script  │  ──────────────────────►    │Google Drive │
│  Browser    │  ◄──────────────   │  (Web App)           │  ◄──────────────────────    │  Folder     │
└─────────────┘    HTML/JSON       └──────────────────────┘                             └─────────────┘
```

**How it works:**

1. Guests open the web app URL (via QR code or direct link).
2. The browser-based UI lets them upload photos/videos or browse the gallery.
3. Google Apps Script handles the upload, stores files in a designated Google Drive folder.
4. The gallery view fetches thumbnails and file links from the same Drive folder.
5. No server to maintain — Google handles hosting, scaling, and HTTPS.

---

## Prerequisites

- A **Google account** (personal Gmail or Google Workspace)
- **Google Drive** with sufficient storage (15 GB free tier; consider Google One if expecting many large videos)
- A modern web browser for setup (Chrome recommended)
- Basic familiarity with copy-pasting code and clicking through Google menus

---

## Step-by-Step Deployment Instructions

### 1. Create the Google Drive Folder Structure

1. Go to [Google Drive](https://drive.google.com).
2. Create a new folder called `Wedding Gallery` (or any name you prefer).
3. Inside it, create a subfolder called `Uploads`.
4. Note down the **folder ID** of the `Uploads` folder:
   - Open the folder in Drive.
   - Look at the URL: `https://drive.google.com/drive/folders/XXXXXXXXXXXXXXX`
   - The `XXXXXXXXXXXXXXX` part is your folder ID.

### 2. Create the Google Apps Script Project

1. Go to [Google Apps Script](https://script.google.com).
2. Click **New Project**.
3. Rename the project to `Wedding Gallery App`.
4. Delete any existing code in `Code.gs`.
5. Paste your Apps Script backend code (the `Code.gs` file from this project).
6. If your project has an HTML file (`Index.html`), click **File → New → HTML file**, name it `Index`, and paste the frontend code.

### 3. Configure the Script

In your `Code.gs`, set the folder ID:

```javascript
const UPLOAD_FOLDER_ID = 'YOUR_UPLOADS_FOLDER_ID_HERE';
```

Replace `YOUR_UPLOADS_FOLDER_ID_HERE` with the folder ID you noted in Step 1.

### 4. Deploy as a Web App

1. In the Apps Script editor, click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in the deployment settings:
   - **Description:** `Wedding Gallery v1.0`
   - **Execute as:** `Me` (your Google account)
   - **Who has access:** `Anyone` (this allows guests without Google accounts to use it)
4. Click **Deploy**.
5. **Authorize** the app when prompted (review permissions and click Allow).
6. Copy the **Web app URL** — this is what guests will use.

> **Important:** Every time you edit the code, you must create a **new deployment** or update the existing one for changes to take effect.

### 5. Test the Deployment

1. Open the Web app URL in an incognito/private browser window.
2. Try uploading a photo.
3. Verify it appears in your Google Drive `Uploads` folder.
4. Check the gallery view loads correctly.

---

## How to Generate QR Codes

See [QR_INSTRUCTIONS.md](./QR_INSTRUCTIONS.md) for detailed QR code generation and printing guidance.

Quick version:
1. Copy your deployed Web app URL.
2. Go to [qr-code-generator.com](https://www.qr-code-generator.com/) or [qrcode.tec-it.com](https://qrcode.tec-it.com).
3. Paste the URL and download the QR code as PNG (minimum 300 DPI for print).

---

## Security Notes

- The web app runs under **your** Google account. Uploaded files consume **your** Drive storage.
- The deployed URL is obscure but technically public — anyone with the link can upload.
- **Do not** expose your Drive folder ID in client-side code. The Apps Script backend should handle all Drive operations server-side.
- Implement rate limiting and file validation in your Apps Script to prevent abuse.
- Consider adding a simple event code or passphrase if you want an extra layer of access control.
- After the wedding, you can **disable** the web app deployment to stop new uploads.

See [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md) for a full security review checklist.

---

## Testing Checklist

### Devices
- [ ] iPhone Safari (latest iOS)
- [ ] iPhone Chrome
- [ ] Android Chrome
- [ ] Android Samsung Internet
- [ ] Desktop Chrome
- [ ] Desktop Firefox
- [ ] Desktop Safari (Mac)
- [ ] iPad / Android tablet

### Network Conditions
- [ ] Strong Wi-Fi
- [ ] Weak Wi-Fi (simulate with browser throttling)
- [ ] 4G mobile data
- [ ] 3G / slow connection
- [ ] Interrupted connection mid-upload (should show clear error)

### Media Types
- [ ] JPEG photos (small, < 2 MB)
- [ ] JPEG photos (large, > 5 MB)
- [ ] PNG screenshots
- [ ] HEIC/HEIF photos (iPhone default format)
- [ ] Portrait orientation photos
- [ ] Landscape orientation photos
- [ ] Short video (< 30 seconds, MP4)
- [ ] Long video (> 2 minutes)
- [ ] 4K video
- [ ] Slow-motion video
- [ ] Multiple files at once (batch upload)

### Functionality
- [ ] Upload progress indicator works
- [ ] Success confirmation displays
- [ ] Error messages are user-friendly
- [ ] Gallery loads and displays thumbnails
- [ ] Gallery pagination or lazy loading works
- [ ] Files are correctly named in Drive

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for the full QA testing guide.

---

## Troubleshooting

| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| "Authorization required" error | App not authorized | Re-deploy and complete the authorization flow |
| Upload fails silently | File too large or unsupported type | Check Apps Script execution logs (View → Executions) |
| QR code doesn't work | Wrong URL encoded | Verify the URL opens correctly in a browser first |
| Gallery shows no images | Folder ID mismatch | Double-check `UPLOAD_FOLDER_ID` matches your Drive folder |
| "Script exceeded maximum execution time" | Video file too large | Increase timeout or limit max file size |
| Changes not reflected | Old deployment cached | Create a new deployment version |
| 403 Forbidden | Deployment access setting wrong | Ensure "Who has access" is set to "Anyone" |

### Checking Execution Logs

1. Open your Apps Script project.
2. Click **Executions** in the left sidebar.
3. Review recent executions for errors (red entries).
4. Click an execution to see the full error stack trace.

---

## Monitoring & Maintenance

### Before the Wedding
- Test with 5–10 friends to catch issues early.
- Monitor Drive storage usage.
- Ensure your Google account won't hit quota limits.

### During the Wedding
- Keep your phone handy to check the Apps Script execution log if guests report issues.
- Google Apps Script has a daily quota of ~20,000 URL fetches and 6 min/execution — more than enough for a typical wedding.

### After the Wedding
- **Disable the deployment** to prevent further uploads (Deploy → Manage deployments → Archive).
- Download all photos from Drive for backup.
- Share the Drive folder with the couple or create a shared album.
- Consider organizing photos by timestamp or creating a Google Photos shared album from the uploads.

### Storage Management
- Free Google Drive: 15 GB shared across Gmail, Drive, and Photos.
- A typical wedding with 200 photos + 20 short videos ≈ 3–5 GB.
- If you expect heavy video uploads, consider upgrading to Google One (100 GB for ~$2/month).

---

## Project Files

| File | Purpose |
|------|---------|
| `README.md` | This deployment guide |
| `SECURITY_CHECKLIST.md` | Security review checklist |
| `TESTING_GUIDE.md` | QA testing procedures |
| `QR_INSTRUCTIONS.md` | QR code generation & printing guide |

---

*Built with love for your special day. No servers, no app installs, no hassle.*
