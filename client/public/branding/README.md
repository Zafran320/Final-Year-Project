# Branding Assets

Drop your logo and favicon files here — they are automatically picked up by the app.

## Expected Files

| Filename | Purpose | Recommended Size |
|----------|---------|-----------------|
| `logo.png` | App logo displayed in navbar and auth screens | 200×50px (or SVG) |
| `logo.svg` | Vector logo (preferred over PNG if available) | Any |
| `favicon.png` | Browser tab icon | 32×32px or 64×64px |
| `favicon.ico` | Legacy browser favicon | 16×16 + 32×32 multi-size |
| `apple-touch-icon.png` | iOS home screen icon | 180×180px |
| `og-image.png` | Open Graph social preview image | 1200×630px |

## How It Works

- `favicon.png` / `favicon.ico` → auto-picked up via `<link rel="icon">` in `index.html`
- `logo.png` / `logo.svg` → imported in components via `/branding/logo.png` or `/branding/logo.svg`
- All files are served as static assets at `/branding/<filename>`

## Usage in Components

```tsx
<img src="/branding/logo.svg" alt="CareerTwin AI" />
```
