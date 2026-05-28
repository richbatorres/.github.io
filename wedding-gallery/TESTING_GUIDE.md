# QA Testing Guide — Wedding Pics Shared Gallery

This guide covers everything you need to test before sharing the gallery link with your wedding guests. Complete each section and check off items as you go.

---

## 1. Device Testing Matrix

Test the web app on as many of these device/browser combinations as possible. Recruit friends or family to help cover devices you don't own.

### Priority 1 — Must Test (90%+ of wedding guests will use these)

| Device | Browser | Status | Notes |
|--------|---------|--------|-------|
| iPhone (iOS 16+) | Safari | ☐ | Most common guest device |
| iPhone (iOS 16+) | Chrome | ☐ | Second most common on iPhone |
| Android phone | Chrome | ☐ | Most common Android browser |
| Android phone | Samsung Internet | ☐ | Default on Samsung devices |

### Priority 2 — Should Test

| Device | Browser | Status | Notes |
|--------|---------|--------|-------|
| iPad | Safari | ☐ | Tablet layout |
| Android tablet | Chrome | ☐ | Tablet layout |
| Desktop/Laptop | Chrome | ☐ | For at-home browsing |
| Desktop/Laptop | Firefox | ☐ | Alternative desktop browser |
| Desktop/Laptop | Safari (Mac) | ☐ | Mac users |
| Desktop/Laptop | Edge | ☐ | Windows default |

### Priority 3 — Nice to Have

| Device | Browser | Status | Notes |
|--------|---------|--------|-------|
| Older iPhone (iOS 14–15) | Safari | ☐ | Older devices |
| Older Android (Android 10–11) | Chrome | ☐ | Budget phones |
| iPhone | Firefox | ☐ | Rare but possible |

### What to Check on Each Device

For every device/browser combination, verify:

1. **Page loads completely** — no missing elements, no infinite spinners.
2. **Upload button is tappable** — large enough touch target, not hidden behind other elements.
3. **Camera capture works** — "Take Photo" option appears in the file picker.
4. **Photo library access works** — can select existing photos from gallery.
5. **Upload completes** — progress indicator shows, success message appears.
6. **Gallery displays** — thumbnails load, images are viewable.
7. **Text is readable** — no overflow, no tiny fonts on mobile.
8. **Orientation works** — portrait and landscape both display correctly.

---

## 2. Network Condition Tests

Wedding venues often have poor connectivity. Test under realistic conditions.

### How to Simulate Network Conditions

**Chrome DevTools (Desktop):**
1. Open DevTools (F12)
2. Go to Network tab
3. Select throttling preset: "Slow 3G", "Fast 3G", or create custom profile

**On Mobile:**
- Move to an area with weak signal (basement, elevator)
- Switch to mobile data and disable Wi-Fi
- Use airplane mode to test offline behavior

### Test Scenarios

| Condition | Test | Expected Behavior | Status |
|-----------|------|-------------------|--------|
| Strong Wi-Fi | Upload 5 MB photo | Completes in < 5 seconds | ☐ |
| Strong Wi-Fi | Upload 50 MB video | Completes in < 30 seconds | ☐ |
| Weak Wi-Fi (1 Mbps) | Upload 5 MB photo | Completes (slowly), progress shown | ☐ |
| Slow 3G | Upload 2 MB photo | Completes within 60 seconds | ☐ |
| Slow 3G | Load gallery (20 photos) | Thumbnails load progressively | ☐ |
| Connection lost mid-upload | Pull Wi-Fi during upload | Clear error message, retry option | ☐ |
| Connection restored | Reconnect after failure | Can retry without refreshing page | ☐ |
| No connection | Open app offline | Meaningful offline message | ☐ |
| Intermittent connection | Toggle airplane mode | No data corruption, graceful handling | ☐ |

### Key Questions

- Does the upload progress indicator work on slow connections?
- Does the app timeout gracefully (not hang forever)?
- Are error messages helpful? ("Upload failed — check your connection and try again" vs. "Error 500")
- Can the user retry without losing their file selection?

---

## 3. Media Type Tests

Guests will upload all kinds of media. Test each format your app should support.

### Photo Tests

| Media Type | Details | Expected Behavior | Status |
|------------|---------|-------------------|--------|
| JPEG (small) | < 2 MB, standard photo | Upload + display correctly | ☐ |
| JPEG (large) | 5–10 MB, high-res DSLR | Upload + display correctly | ☐ |
| JPEG (very large) | > 15 MB | Upload succeeds or shows size limit message | ☐ |
| PNG | Screenshot or edited photo | Upload + display correctly | ☐ |
| HEIC | iPhone default format (iOS 11+) | Upload + display correctly | ☐ |
| HEIF | Alternative Apple format | Upload + display correctly | ☐ |
| WebP | Android/Chrome captures | Upload + display correctly | ☐ |
| Portrait orientation | Vertical photo | Displays upright (EXIF respected) | ☐ |
| Landscape orientation | Horizontal photo | Displays correctly | ☐ |
| Square crop | 1:1 aspect ratio | Displays without distortion | ☐ |
| Panorama | Ultra-wide aspect ratio | Displays reasonably (scrollable or fit) | ☐ |

### Video Tests

| Media Type | Details | Expected Behavior | Status |
|------------|---------|-------------------|--------|
| MP4 (short) | < 30 seconds, 1080p | Upload completes, playable | ☐ |
| MP4 (long) | 2–5 minutes | Upload completes (may take time) | ☐ |
| MP4 (4K) | Large file, high resolution | Upload succeeds or shows size limit | ☐ |
| MOV | iPhone video format | Upload + recognized correctly | ☐ |
| Slow-motion | iPhone slo-mo video | Upload completes | ☐ |
| Time-lapse | iPhone time-lapse | Upload completes | ☐ |
| WebM | Android screen recording | Upload completes | ☐ |
| Vertical video | Portrait orientation recording | Displays correctly | ☐ |

### Batch Upload Tests

| Scenario | Expected Behavior | Status |
|----------|-------------------|--------|
| Select 3 photos at once | All upload successfully | ☐ |
| Select 10 photos at once | All upload, progress shown for each | ☐ |
| Select 20+ photos at once | Uploads in batches or shows limit message | ☐ |
| Mix of photos and videos | All upload with correct types | ☐ |
| Cancel mid-batch | Completed uploads are saved, rest cancelled cleanly | ☐ |

### Edge Cases

| Scenario | Expected Behavior | Status |
|----------|-------------------|--------|
| File with no extension | Rejected with helpful message | ☐ |
| File with wrong extension (.jpg but actually .exe) | Rejected by server-side validation | ☐ |
| Filename with special characters (é, ñ, 日本語) | Uploads without error | ☐ |
| Filename with spaces | Uploads without error | ☐ |
| Very long filename (100+ chars) | Truncated safely, uploads fine | ☐ |
| 0-byte file | Rejected with message | ☐ |
| Duplicate filename | Both files saved (no overwrite) | ☐ |

---

## 4. Upload Flow Verification

Walk through the complete upload experience step by step.

### Happy Path

1. ☐ Open the web app URL
2. ☐ Page loads within 3 seconds on good connection
3. ☐ Upload button/area is immediately visible (no scrolling needed)
4. ☐ Tap upload → file picker opens
5. ☐ "Take Photo" and "Photo Library" options both available (mobile)
6. ☐ Select a photo → file name or thumbnail preview shown
7. ☐ Tap "Upload" / "Send" → progress indicator appears
8. ☐ Progress updates smoothly (not stuck at 0% then jumping to 100%)
9. ☐ Success message appears clearly
10. ☐ Can immediately upload another file without refreshing
11. ☐ Uploaded file appears in Google Drive within 30 seconds

### Error Paths

1. ☐ Select unsupported file type → clear rejection message before upload starts
2. ☐ Select file over size limit → clear message with the limit stated
3. ☐ Lose connection during upload → error message with retry option
4. ☐ Server error (simulate by temporarily breaking script) → user-friendly error, not a stack trace
5. ☐ Rate limit hit → friendly "please wait" message with approximate wait time
6. ☐ Try uploading with JavaScript disabled → graceful degradation or clear message

### Accessibility

1. ☐ Upload button has sufficient color contrast (4.5:1 minimum)
2. ☐ Touch targets are at least 44×44 pixels on mobile
3. ☐ Text is readable without zooming (minimum 16px body text)
4. ☐ Success/error messages are visible without scrolling
5. ☐ Works with system font size set to "Large" or "Extra Large"

---

## 5. Gallery Verification

Test the gallery/viewing experience thoroughly.

### Display Tests

1. ☐ Gallery loads and shows uploaded photos as thumbnails
2. ☐ Thumbnails load progressively (not all-or-nothing)
3. ☐ Tapping a thumbnail opens full-size view
4. ☐ Full-size images are sharp and correctly oriented
5. ☐ Can navigate between photos (swipe or arrows)
6. ☐ Can close/dismiss full-size view easily
7. ☐ Videos show a play button or video indicator
8. ☐ Videos play inline (don't force download)
9. ☐ Gallery handles 0 photos gracefully ("No photos yet" message)
10. ☐ Gallery handles 100+ photos without crashing

### Performance Tests

| Scenario | Target | Status |
|----------|--------|--------|
| Gallery with 10 photos | Loads in < 3 seconds | ☐ |
| Gallery with 50 photos | Loads in < 8 seconds | ☐ |
| Gallery with 100+ photos | Pagination or lazy loading works | ☐ |
| Scrolling through gallery | Smooth, no jank or freezing | ☐ |
| Opening full-size photo | Displays in < 2 seconds | ☐ |

### Sorting & Organization

1. ☐ Photos display in chronological order (newest first or oldest first — pick one)
2. ☐ Newly uploaded photos appear in the gallery without manual refresh
3. ☐ Gallery auto-refreshes or has a "refresh" button

---

## 6. Pre-Wedding Final Checklist

Complete this 48 hours before the wedding:

- [ ] All Priority 1 devices tested and working
- [ ] Upload tested on venue Wi-Fi (if accessible beforehand)
- [ ] QR code scans correctly on 3+ different phones
- [ ] Google Drive has sufficient free storage (check quota)
- [ ] Apps Script execution logs are clean (no errors)
- [ ] Rate limiting is configured and tested
- [ ] Event code (if used) is set and shared with wedding party
- [ ] Backup plan documented (what to do if the app goes down)
- [ ] Someone technical is designated as "on-call" during the event

---

## 7. Bug Report Template

If you find an issue during testing, document it:

```
**Device:** iPhone 14, iOS 17.2
**Browser:** Safari
**Network:** Venue Wi-Fi
**Steps to reproduce:**
1. Opened web app
2. Selected 3 HEIC photos
3. Tapped Upload

**Expected:** All 3 photos upload successfully
**Actual:** First photo uploads, then spinner hangs indefinitely
**Screenshot/Recording:** [attach if possible]
```

---

*Test early, test often. Your future self (and your guests) will thank you.*
