# QR Code Generation & Printing Guide

This guide walks you through creating, testing, and printing QR codes that link guests to your wedding photo gallery.

---

## 1. Get Your Web App URL

Before generating a QR code, you need your deployed web app URL. It looks like this:

```
https://script.google.com/macros/s/AKfycbx.../exec
```

**Where to find it:**
1. Open your Google Apps Script project.
2. Click **Deploy → Manage deployments**.
3. Copy the **Web app URL** from your active deployment.

> **Test the URL first!** Open it in your phone's browser and confirm the page loads correctly before generating any QR codes.

---

## 2. Recommended QR Code Generators (Free)

All of these produce static QR codes for free — no account required, no tracking, no expiration.

| Generator | URL | Best For |
|-----------|-----|----------|
| QR Code Generator | [qr-code-generator.com](https://www.qr-code-generator.com/) | Simple, clean interface |
| TEC-IT | [qrcode.tec-it.com](https://qrcode.tec-it.com/en/QrCode) | High-res downloads, no signup |
| QRCode Monkey | [qrcode-monkey.com](https://www.qrcode-monkey.com/) | Custom colors and logos |
| Google Charts API | See below | Programmatic generation |

### Using Google Charts API (No Website Needed)

You can generate a QR code directly via URL — useful for automation:

```
https://chart.googleapis.com/chart?chs=500x500&cht=qr&chl=YOUR_URL_HERE&choe=UTF-8
```

Replace `YOUR_URL_HERE` with your encoded web app URL. Open the link in a browser to see/download the QR code.

> **Note:** URL-encode special characters in your web app URL. Most Apps Script URLs work without encoding since they only contain alphanumeric characters and slashes.

---

## 3. QR Code Settings for Print

When generating your QR code, use these settings for reliable scanning:

### Resolution
- **Minimum:** 300 DPI (dots per inch)
- **Recommended:** 600 DPI for sharp print quality
- **Image size:** At least 1000×1000 pixels for the source file

### Error Correction Level
- **Recommended: Level M (Medium, 15% recovery)** — good balance of size and reliability
- Level H (High, 30%) if you plan to add a logo overlay in the center
- Level L (Low, 7%) only for digital/screen display

### Format
- **PNG** for most uses (raster, universally supported)
- **SVG** if you need to scale to any size without quality loss (ideal for professional printing)
- **PDF** for direct print submission

### Quiet Zone
- Ensure there's a white border (quiet zone) around the QR code — at least 4 modules wide
- Most generators add this automatically, but verify it's present

---

## 4. Print Specifications for Wedding Cards

### Minimum QR Code Size by Scanning Distance

| Scanning Distance | Minimum QR Size | Recommended QR Size |
|-------------------|-----------------|---------------------|
| 10 cm (hand-held card) | 2 × 2 cm | 3 × 3 cm |
| 30 cm (table card) | 3 × 3 cm | 4 × 4 cm |
| 1 meter (poster/sign) | 10 × 10 cm | 15 × 15 cm |
| 2+ meters (large banner) | 20 × 20 cm | 25 × 25 cm |

### Common Wedding Print Placements

**Table cards / Place cards:**
- QR code size: 2.5–3 cm
- Position: Bottom center or back of card
- Include brief text: "Scan to share your photos!"

**Wedding program / Menu card:**
- QR code size: 3–4 cm
- Position: Back page or bottom of last page
- Include text: "Share your photos & videos from tonight"

**Standalone table sign (tent card):**
- QR code size: 5–7 cm
- Position: Center of card
- Include: Title + QR + brief instruction

**Welcome poster / Easel sign:**
- QR code size: 12–15 cm
- Position: Center or lower third
- Include: Decorative framing, clear call-to-action

---

## 5. High-Contrast Format Recommendations

QR codes must have strong contrast to scan reliably in all lighting conditions (dim reception halls, outdoor sun glare, camera flash).

### Do's ✓

- **Black QR on white background** — maximum contrast, works everywhere
- **Very dark navy/charcoal on white** — acceptable alternative
- **Dark QR on cream/ivory** — works well for wedding aesthetics
- Matte paper finish (reduces glare from phone flashlights)
- Test scanning under dim lighting before printing 200 copies

### Don'ts ✗

- ❌ Light gray QR on white — insufficient contrast
- ❌ Gold/metallic QR codes — reflective surfaces confuse cameras
- ❌ QR code on busy/patterned background — interferes with scanning
- ❌ Inverted colors (white QR on black) — some older phones struggle
- ❌ QR code smaller than 2 cm on a hand-held card
- ❌ Glossy/laminated finish without testing — can cause glare issues

### Color Pairing Examples (Wedding-Friendly)

| QR Color | Background | Contrast | Wedding Style |
|----------|------------|----------|---------------|
| Black (#000000) | White (#FFFFFF) | ★★★★★ | Classic/Modern |
| Dark Navy (#1a1a2e) | Ivory (#FFFFF0) | ★★★★☆ | Elegant |
| Dark Green (#1b4332) | Cream (#FFFDD0) | ★★★★☆ | Garden/Rustic |
| Dark Burgundy (#4a0404) | White (#FFFFFF) | ★★★★☆ | Romantic |
| Charcoal (#333333) | Light Blush (#FFF0F0) | ★★★☆☆ | Soft/Romantic |

> **Rule of thumb:** If you squint and can still clearly see the QR pattern, it has enough contrast.

---

## 6. Adding Context Around the QR Code

A QR code alone won't get scanned. Add clear, friendly text:

### Suggested Text (Short)

```
📸 Share Your Photos!
[QR CODE]
Scan to upload photos & videos
```

### Suggested Text (Detailed)

```
Help us capture every moment!

[QR CODE]

Scan with your phone camera to upload
photos and videos to our shared gallery.

No app needed • Works on any phone
```

### Multi-Language Example

```
Share your photos! • ¡Comparte tus fotos!
Teile deine Fotos! • Partagez vos photos!

[QR CODE]

Scan → Upload → Done ✓
```

---

## 7. Testing Your Printed QR Code

Before mass printing, do this validation:

### Print Test Checklist

1. ☐ Print ONE copy on your actual paper stock
2. ☐ Scan with iPhone (default Camera app)
3. ☐ Scan with Android (Google Lens or Camera)
4. ☐ Scan with an older phone (2+ years old)
5. ☐ Scan in bright light
6. ☐ Scan in dim light (simulate reception lighting)
7. ☐ Scan from the expected distance (hand-held vs. table)
8. ☐ Verify the correct URL opens
9. ☐ Verify the page loads and works on mobile
10. ☐ Try scanning at a slight angle (guests won't always be perfectly aligned)

### Common Print Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| QR won't scan | Too small or low contrast | Increase size, use black on white |
| QR scans but wrong URL | Old deployment URL | Re-generate QR with current URL |
| QR scans but page errors | Deployment issue | Test URL in browser first |
| QR looks blurry when printed | Low-resolution source image | Use 600 DPI or SVG source |
| QR has artifacts/dots | Printer quality issue | Use higher quality print setting |

---

## 8. Backup Plan

Things to prepare in case of QR issues at the venue:

- **Print the short URL** below the QR code (use a URL shortener like [bit.ly](https://bitly.com) for a memorable link)
- **Have a few phones ready** with the URL bookmarked to help guests who can't scan
- **Create a simple sign** with step-by-step instructions for less tech-savvy guests
- **Test at the venue** during rehearsal if possible (lighting and Wi-Fi conditions matter)

### URL Shortener Setup

1. Go to [bit.ly](https://bitly.com) (free account).
2. Paste your Apps Script web app URL.
3. Customize the short link (e.g., `bit.ly/sarah-james-photos`).
4. Print this short URL as a fallback below the QR code.

---

## 9. Timeline

| When | Action |
|------|--------|
| 4 weeks before | Deploy web app, generate QR code |
| 3 weeks before | Test QR on multiple phones |
| 2 weeks before | Send print files to printer (or print at home) |
| 1 week before | Final test of QR + URL + upload flow |
| Day before | Verify deployment is active, Drive has space |
| Day of | Place cards/signs, enjoy your wedding! |

---

*A well-tested QR code means happy guests and a full gallery. Take 30 minutes to test now, save hours of troubleshooting later.*
