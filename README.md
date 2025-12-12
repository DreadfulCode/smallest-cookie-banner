# smallest-cookie-banner

**The smallest legally compliant cookie consent banner in existence.**

~2KB minified + gzipped. Zero dependencies. Full i18n support. 100% customizable.

## What Makes This Different

- **Geo-aware**: Auto-detects EU users (via timezone) for GDPR compliance
- **Implied consent elsewhere**: Non-EU users get auto-accept after scroll/5s (legally sufficient)
- **Truly minimal**: Every byte counts. No bloat.
- **100% customizable**: Every string, every style, every behavior
- **WCAG 2.1 AA Accessible**: Full keyboard navigation, screen reader support, 44px touch targets
- **Secure**: CSS injection protection, input validation, CSP nonce support
- **Mobile-first**: Touch-optimized, responsive, prefers-reduced-motion support

## Quick Start

```html
<script src="https://unpkg.com/smallest-cookie-banner@latest/dist/cookie-banner.min.js"></script>
```

That's it. Done. For EU users: shows accept/reject. For everyone else: shows notice that auto-dismisses.

## How It Works

| User Location | Behavior | Legal Basis |
|--------------|----------|-------------|
| **EU** (GDPR) | Shows Accept + Reject buttons. Waits for explicit choice. | Explicit consent required |
| **Everywhere else** | Shows OK button. Auto-accepts on scroll or after 5s. | Implied consent allowed |

EU detection uses timezone (no external API, no latency, works offline).

## Configuration

```html
<script>
window.CookieBannerConfig = {
  // Text (i18n - customize everything)
  msg: 'We use cookies.',           // Banner message
  acceptText: 'OK',                  // Accept button text
  rejectText: '✗',                   // Reject button text (EU only)

  // Behavior
  days: 365,                         // Cookie expiry in days (max: 3650)
  forceEU: false,                    // Force EU mode (true) or non-EU mode (false)
  autoAcceptDelay: 5000,             // Non-EU: ms before auto-accept (0 = disabled, max: 300000)
  cookieName: 'ck',                  // Custom cookie name (a-z, 0-9, _, -)
  cookieDomain: '.example.com',      // Cookie domain for subdomain sharing

  // Callbacks
  onAccept: () => {},                // Called when accepted (preferred)
  onReject: () => {},                // Called when rejected (preferred)
  onYes: () => {},                   // Deprecated: use onAccept
  onNo: () => {},                    // Deprecated: use onReject

  // Styling (all CSS is sanitized for security)
  style: 'background:blue',          // Inline styles for banner
  css: '#ckb{border-radius:8px}',    // Additional CSS rules

  // Security
  cspNonce: 'abc123',                // CSP nonce for inline styles
  container: document.body           // Custom container element
};
</script>
<script src="https://unpkg.com/smallest-cookie-banner@latest/dist/cookie-banner.min.js"></script>
```

## Full i18n Support

Every string is customizable. Example for German:

```html
<script>
window.CookieBannerConfig = {
  msg: 'Diese Website verwendet Cookies.',
  acceptText: 'Akzeptieren',
  rejectText: 'Ablehnen'
};
</script>
```

Example for Japanese:
```html
<script>
window.CookieBannerConfig = {
  msg: 'このサイトはクッキーを使用しています。',
  acceptText: '同意する',
  rejectText: '拒否する'
};
</script>
```

## Styling

### Option 1: CSS Variables (Recommended)

Override any style with CSS custom properties:

```css
:root {
  /* Banner */
  --ckb-position: fixed;
  --ckb-bottom: 0;
  --ckb-top: auto;
  --ckb-left: 0;
  --ckb-right: 0;
  --ckb-padding: 8px 12px;
  --ckb-bg: #222;
  --ckb-color: #fff;
  --ckb-font: 12px system-ui, sans-serif;
  --ckb-gap: 8px;
  --ckb-z: 9999;

  /* Buttons */
  --ckb-btn-padding: 6px 12px;
  --ckb-btn-border: none;
  --ckb-btn-radius: 3px;
  --ckb-btn-bg: #fff;
  --ckb-btn-color: #222;

  /* Reject button (EU only) */
  --ckb-reject-bg: transparent;
  --ckb-reject-color: inherit;
  --ckb-reject-border: 1px solid currentColor;
}
```

### Option 2: Direct CSS Override

```css
#ckb {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  border-radius: 12px !important;
  margin: 16px !important;
  width: calc(100% - 32px) !important;
}

#ckb button {
  background: #fff !important;
  color: #764ba2 !important;
}
```

### Option 3: Inline Config

```javascript
window.CookieBannerConfig = {
  style: 'background:#1a1a2e;border-radius:0;margin:0',
  css: '#ckb button{text-transform:uppercase}'
};
```

## Position Examples

**Top banner:**
```css
:root {
  --ckb-bottom: auto;
  --ckb-top: 0;
}
```

**Bottom-right toast:**
```css
:root {
  --ckb-bottom: 20px;
  --ckb-right: 20px;
  --ckb-left: auto;
}
#ckb { width: 300px; border-radius: 8px; }
```

## Accessibility (WCAG 2.1 AA)

This banner is fully accessible and complies with WCAG 2.1 AA guidelines:

### Features
- **Keyboard Navigation**: Full keyboard support with Tab, Shift+Tab, ESC
- **Focus Trap**: Focus stays within banner while visible
- **Focus Management**: Focus moves to banner on show, returns to previous element on dismiss
- **ARIA Attributes**: `role="dialog"`, `aria-modal`, `aria-label`, `aria-describedby`
- **Screen Readers**: Properly announced by all major screen readers
- **Touch Targets**: Minimum 44x44px touch targets for mobile accessibility
- **Visible Focus**: Clear focus indicators for keyboard users
- **Reduced Motion**: Respects `prefers-reduced-motion` setting

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Tab` | Move to next button |
| `Shift + Tab` | Move to previous button |
| `Enter` / `Space` | Activate button |
| `Escape` | Dismiss (reject in EU, accept elsewhere) |

## Security

### Features
- **CSS Injection Protection**: All custom CSS is sanitized to prevent:
  - `@import` attacks
  - `url()` data exfiltration
  - `expression()` (IE)
  - `javascript:` protocol
  - Style tag breakout
- **Input Validation**: All configuration parameters are validated
- **Cookie Name Validation**: Prevents cookie attribute injection
- **CSP Nonce Support**: For strict Content Security Policy

### CSP Configuration

```html
<script>
window.CookieBannerConfig = {
  cspNonce: 'your-nonce-value',  // Must match your CSP nonce
  // ...
};
</script>
```

### Cookie Security
- `SameSite=Lax` prevents CSRF attacks
- `Secure` flag added on HTTPS
- Domain attribute supported for subdomain control:

```javascript
window.CookieBannerConfig = {
  cookieDomain: '.example.com'  // Shared across subdomains
};
```

## API

```javascript
// Check consent status
CookieBanner.ok         // true (accepted), false (rejected), null (pending)

// Programmatic control
CookieBanner.yes()      // Accept consent
CookieBanner.no()       // Reject consent
CookieBanner.reset()    // Clear consent & reload page
```

## No-JavaScript Fallback

For users with JS disabled, add a `<noscript>` fallback:

```html
<noscript>
  <style>
    .noscript-banner {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 12px;
      background: #222;
      color: #fff;
      text-align: center;
      z-index: 9999;
    }
  </style>
  <div class="noscript-banner">
    This site uses cookies. By continuing to browse, you accept our
    <a href="/privacy" style="color:#fff">privacy policy</a>.
  </div>
</noscript>
```

## Legal Compliance

### GDPR (EU)

The banner is fully GDPR compliant when:
- You **don't set non-essential cookies before consent**
- You **respect the reject choice**
- You have a **privacy policy**

```javascript
// Only load tracking after consent
if (CookieBanner.ok === true) {
  loadGoogleAnalytics();
}

// Or use callback
window.CookieBannerConfig = {
  onYes: () => loadGoogleAnalytics()
};
```

### CCPA/CPRA (California)

CCPA uses opt-out model. This banner works, but you may want to customize:

```javascript
window.CookieBannerConfig = {
  msg: 'We use cookies. You can opt out of the sale of your data.',
  rejectText: 'Do Not Sell My Info',
  forceEU: true  // Show reject button for Californians
};
```

### Other Jurisdictions

| Region | Model | This Banner |
|--------|-------|-------------|
| EU (GDPR) | Opt-in | ✅ Full compliance |
| California (CCPA) | Opt-out | ✅ Works (customize text) |
| Brazil (LGPD) | Opt-in | ✅ Full compliance |
| Canada (PIPEDA) | Implied OK | ✅ Auto-accepts |
| Australia | No law | ✅ Auto-accepts |
| USA (non-CA) | No law | ✅ Auto-accepts |
| Most of Asia | Varies | ✅ Auto-accepts |

## Size Comparison

| Library | Size (min+gzip) |
|---------|----------------|
| **smallest-cookie-banner** | **~2KB** |
| cookie-consent | ~15KB |
| cookieconsent | ~25KB |
| tarteaucitron | ~45KB |
| OneTrust | ~100KB+ |

*Note: Size increased from ~1KB to ~2KB to add WCAG 2.1 AA accessibility and security features.*

## Installation

### NPM

```bash
npm install smallest-cookie-banner
```

```javascript
import 'smallest-cookie-banner';
```

### CDN

```html
<!-- unpkg -->
<script src="https://unpkg.com/smallest-cookie-banner@latest/dist/cookie-banner.min.js"></script>

<!-- jsDelivr -->
<script src="https://cdn.jsdelivr.net/npm/smallest-cookie-banner@latest/dist/cookie-banner.min.js"></script>
```

### Self-Hosted

Download `dist/cookie-banner.min.js` and serve from your domain.

## Browser Support

All modern browsers (Chrome, Firefox, Safari, Edge). IE11 is **not supported** (uses CSS custom properties, modern event handling).

**Mobile Support:**
- iOS Safari 12+
- Chrome for Android 70+
- Samsung Internet 10+
- All modern mobile browsers

## Privacy

This library:
- Sets **one** first-party cookie (`ck`)
- Sends **no** data anywhere
- Has **no** external dependencies
- Makes **no** network requests
- Collects **no** analytics

## Development

```bash
npm install
npm test        # Run tests with coverage
npm run build   # Build minified version
```

## License

MIT

## FAQ

**Q: Is timezone-based EU detection accurate?**

A: It covers all EU timezones (UTC-1 to UTC+3). Edge cases: UK tourists in Thailand would see non-EU mode. For 100% accuracy, use `forceEU: true` with server-side geo-detection.

**Q: What about "legitimate interest"?**

A: Legitimate interest doesn't apply to tracking cookies. Analytics still need consent in EU. This is a legal question - consult a lawyer.

**Q: Can I use this for granular consent (analytics vs marketing)?**

A: This banner is binary (accept all or reject all). For granular consent, you need a more complex solution. But for most small-to-medium sites, binary consent is sufficient and legally compliant.
