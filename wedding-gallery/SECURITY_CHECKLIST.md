# Security Checklist — Wedding Pics Shared Gallery

Use this checklist to verify your deployment is secure before sharing the link with guests.

---

## 1. Upload Rate Limiting

- [ ] **Per-IP throttling:** Limit uploads to a reasonable number per time window (e.g., 20 uploads per 10 minutes per user session).
- [ ] **Global throttle:** Set a maximum total uploads per hour to prevent abuse (e.g., 200/hour).
- [ ] **Implementation approach:** Use `PropertiesService` or `CacheService` in Apps Script to track upload counts by session or IP.
- [ ] **Graceful rejection:** When rate limit is hit, return a friendly message ("Please wait a moment before uploading more photos") rather than a generic error.

```javascript
// Example: Simple rate limiting with CacheService
function checkRateLimit(identifier) {
  const cache = CacheService.getScriptCache();
  const key = 'uploads_' + identifier;
  const count = parseInt(cache.get(key) || '0');
  
  if (count >= 20) {
    return false; // Rate limit exceeded
  }
  
  cache.put(key, String(count + 1), 600); // 10-minute window
  return true;
}
```

---

## 2. File Type Validation

- [ ] **Server-side MIME type check:** Validate file types in Apps Script, not just in the browser.
- [ ] **Allowed types whitelist:**
  - `image/jpeg`
  - `image/png`
  - `image/heic`
  - `image/heif`
  - `image/webp`
  - `video/mp4`
  - `video/quicktime` (MOV)
  - `video/webm`
- [ ] **Reject everything else:** Do not allow PDFs, executables, ZIPs, or other non-media files.
- [ ] **File extension check:** Verify the file extension matches the MIME type (defense in depth).
- [ ] **Magic bytes validation (optional):** For extra security, check the first few bytes of the file to confirm it matches the declared type.

```javascript
// Example: MIME type validation
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp',
  'video/mp4', 'video/quicktime', 'video/webm'
];

function isAllowedType(mimeType) {
  return ALLOWED_TYPES.includes(mimeType.toLowerCase());
}
```

---

## 3. Filename Sanitization

- [ ] **Strip special characters:** Remove or replace characters that could cause issues (`/`, `\`, `..`, `<`, `>`, `|`, `?`, `*`, null bytes).
- [ ] **Limit filename length:** Cap at 100 characters to prevent buffer issues.
- [ ] **Rename on upload:** Consider renaming files to a safe pattern (e.g., `wedding_001.jpg`, `wedding_002.mp4`) to avoid conflicts and injection.
- [ ] **Preserve extension:** Keep the original file extension for proper Drive preview support.
- [ ] **Handle duplicates:** Append a timestamp or counter to prevent overwriting.

```javascript
// Example: Filename sanitization
function sanitizeFilename(originalName) {
  // Remove path separators and dangerous characters
  let safe = originalName.replace(/[\/\\:*?"<>|]/g, '_');
  
  // Remove null bytes
  safe = safe.replace(/\0/g, '');
  
  // Limit length (keep extension)
  const ext = safe.split('.').pop();
  const name = safe.substring(0, safe.lastIndexOf('.'));
  safe = name.substring(0, 90) + '.' + ext;
  
  // Prepend timestamp for uniqueness
  const timestamp = new Date().getTime();
  return timestamp + '_' + safe;
}
```

---

## 4. No Drive Folder ID Exposure

- [ ] **Folder ID stays server-side:** The `UPLOAD_FOLDER_ID` constant must only exist in `Code.gs`, never in client-side HTML/JavaScript.
- [ ] **No folder URLs in responses:** API responses should not include direct Drive folder links.
- [ ] **No folder ID in the web app URL:** The deployed URL should not contain or leak the folder ID as a parameter.
- [ ] **Verify in browser DevTools:** Open the web app, check Network tab and page source — the folder ID should not appear anywhere.

### Why This Matters
If someone obtains your folder ID, they could:
- Directly access the folder (if sharing settings are misconfigured)
- Attempt to enumerate or manipulate files
- Target the folder for abuse

---

## 5. Anti-Spam Measures

- [ ] **File size limits:** Enforce a maximum file size (recommended: 50 MB for photos, 200 MB for videos).
- [ ] **Upload count per session:** Limit total files per session (e.g., 50 files max).
- [ ] **Optional event code:** Add a simple passphrase that guests enter once (e.g., the couple's names or wedding date). This prevents random internet users from uploading if the URL leaks.
- [ ] **Honeypot field (optional):** Add a hidden form field that bots will fill but humans won't.
- [ ] **Post-event lockdown:** Plan to disable the deployment after the wedding (within 24–48 hours).

```javascript
// Example: Simple event code validation
const EVENT_CODE = 'sarah-and-james-2025'; // Change this!

function validateEventCode(submittedCode) {
  return submittedCode.toLowerCase().trim() === EVENT_CODE;
}
```

---

## 6. Input Validation

- [ ] **Validate all form fields:** Check that required fields are present and within expected bounds.
- [ ] **Sanitize text inputs:** If you collect guest names or messages, strip HTML tags and limit length.
- [ ] **Validate file count:** Reject requests claiming to upload more files than your batch limit.
- [ ] **Validate content length:** Check that the actual uploaded data size matches the declared size (within tolerance).
- [ ] **Error handling:** Never expose stack traces or internal paths in error responses to the client.

```javascript
// Example: Input validation for guest name
function sanitizeGuestName(name) {
  if (!name || typeof name !== 'string') return 'Anonymous Guest';
  
  // Strip HTML tags
  let clean = name.replace(/<[^>]*>/g, '');
  
  // Limit length
  clean = clean.trim().substring(0, 50);
  
  // Remove control characters
  clean = clean.replace(/[\x00-\x1F\x7F]/g, '');
  
  return clean || 'Anonymous Guest';
}
```

---

## 7. Additional Security Considerations

### Google Account Security
- [ ] Enable 2-Factor Authentication on the Google account hosting the script.
- [ ] Use a dedicated Google account for the wedding (not your personal one) if possible.
- [ ] Review Apps Script permissions — the script should only request Drive access.

### Monitoring
- [ ] Check Apps Script execution logs daily in the week before the wedding.
- [ ] Set up a simple counter to track total uploads (store in `PropertiesService`).
- [ ] Review uploaded files periodically for inappropriate content.

### Data Privacy
- [ ] Inform guests that photos are stored in Google Drive (add a brief note on the upload page).
- [ ] Plan for data retention — decide when you'll delete the uploads or transfer them.
- [ ] Do not collect unnecessary personal data (email, phone number) unless needed.

---

## Quick Security Audit

Run through this before going live:

1. Open the web app URL in an incognito window.
2. Right-click → View Page Source → search for your folder ID. **It should NOT appear.**
3. Open DevTools → Network tab → upload a file → inspect all requests/responses for leaked IDs.
4. Try uploading a `.exe` file — it should be rejected.
5. Try uploading 25+ files rapidly — rate limiting should kick in.
6. Try submitting the form with `<script>alert('xss')</script>` as a guest name — it should be sanitized.

---

*Security is about layers. No single measure is perfect, but together they make abuse impractical.*
