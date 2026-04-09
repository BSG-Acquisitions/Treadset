

# Fix PWA Icon — TreadSet Tire Mark

## Problem
The current `pwa-icon-192.png` and `pwa-icon-512.png` are placeholder/generic icons. iPhone home screen shows the wrong icon.

## Plan

### 1. Generate proper PWA icons
Use AI image generation (Nano banana) to create two icons:
- `public/icon-192x192.png` (192x192)
- `public/icon-512x512.png` (512x512)

Design: Dark forest green (#1A3A1A) solid background, white circular tire tread mark centered, no text, clean app-icon style with rounded corners baked in.

### 2. Update vite.config.ts manifest icons array
Change all three icon entries from `/pwa-icon-192.png` and `/pwa-icon-512.png` to `/icon-192x192.png` and `/icon-512x512.png`.

### 3. Update index.html apple-touch-icon
Change line 12 from:
```html
<link rel="apple-touch-icon" href="/pwa-icon-192.png">
```
to:
```html
<link rel="apple-touch-icon" href="/icon-192x192.png">
```

### 4. Clean up old files
Delete `public/pwa-icon-192.png` and `public/pwa-icon-512.png`.

---

## iPhone re-install process (confirmed)
Yes — after publishing, you must:
1. Delete the existing app from your iPhone home screen (long press → Remove App)
2. Open the published URL in Safari
3. Tap Share → "Add to Home Screen"
4. The new icon will appear

iOS caches PWA icons aggressively — there is no way to update the icon without removing and re-adding. Clearing Safari website data (Settings → Safari → Clear History and Website Data) before re-adding can help if the old icon persists.

