# smallest-cookie-banner

## Your Cookie Banner is Too Damn Big.

**The smallest legally compliant cookie consent banner on the planet.** ~2KB. Zero dependencies. Maximum compliance. Minimum footprint.

Other cookie banners hijack half your screen with walls of text, 47 toggles, and "legitimate interest" guilt trips. Your users didn't come to your site to read privacy policy fan fiction.

**This banner does one job:** Get legally compliant consent in the smallest possible space, then get out of the way.

[**Try the Visual Configurator**](https://dreadfulcode.github.io/smallest-cookie-banner/) | [npm](https://www.npmjs.com/package/smallest-cookie-banner) | [GitHub](https://github.com/DreadfulCode/smallest-cookie-banner)

---

## Why This Exists

| Other Banners | This Banner |
|---------------|-------------|
| 25-100KB+ of JavaScript | **~2KB** total |
| Covers 30% of viewport | Thin strip, corner toast, or modal |
| 15 toggles nobody understands | Accept or Reject. Done. |
| Requires PhD in privacy law | Works out of the box |
| $500/month SaaS pricing | **Free. Forever. MIT License.** |

---

## Install in 10 Seconds

```html
<script src="https://unpkg.com/smallest-cookie-banner@latest/dist/cookie-banner.min.js"></script>
```

That's it. Seriously. It auto-detects EU users and handles everything.

### Or via npm

```bash
npm install smallest-cookie-banner
```

```javascript
import 'smallest-cookie-banner';
```

---

## The Selling Points

### Tiny
- **~2KB** minified + gzipped (competitors: 25-100KB+)
- Zero dependencies
- No external API calls
- Loads instantly

### Smart
- **Auto-detects EU users** via timezone (no slow geo-IP lookups)
- Shows Accept/Reject for GDPR regions
- Auto-accepts for regions where it's legal (USA, Asia, etc.)
- Respects user choice forever (or until they clear cookies)

### Compliant
- **GDPR** (EU) - Full compliance
- **CCPA/CPRA** (California) - Full compliance
- **LGPD** (Brazil) - Full compliance
- **PIPEDA** (Canada) - Full compliance
- Works everywhere else too

### Accessible
- **WCAG 2.1 AA** compliant
- Full keyboard navigation
- Screen reader optimized
- 44px touch targets
- Respects `prefers-reduced-motion`

### Secure
- CSS injection protection
- Input validation
- CSP nonce support
- No tracking, no analytics, no data collection

### Flexible
- 100% customizable text (full i18n)
- CSS variables for easy styling
- Position anywhere: bottom, top, corners, center modal
- Animations: fade, slide, or none
- [Visual configurator](https://dreadfulcode.github.io/smallest-cookie-banner/) generates code for you

### Free
- MIT License
- No SaaS fees
- No usage limits
- No "powered by" badges
- **The most flexible and free privacy solution on the planet**

---

## How It Works

| User Location | What They See | Why |
|--------------|---------------|-----|
| **EU** | Accept + Reject buttons | GDPR requires explicit consent |
| **California** | Accept + Reject buttons | CCPA requires opt-out option |
| **Everywhere else** | OK button, auto-dismisses | Implied consent is legal |

EU detection uses timezone analysis. No external APIs, no latency, works offline.

---

## Customize Everything

### Visual Configurator (Easiest)

Use the **[live configurator](https://dreadfulcode.github.io/smallest-cookie-banner/)** to:
- Pick theme presets (dark, light, gradient, minimal)
- Customize colors, fonts, spacing
- Preview on desktop and mobile
- Generate copy-paste code

### Quick Config

```javascript
window.CookieBannerConfig = {
  msg: 'We use cookies to improve your experience.',
  acceptText: 'Got it',
  rejectText: 'No thanks',
  onAccept: () => loadAnalytics(),
  onReject: () => console.log('Respecting choice')
};
```

### CSS Variables

```css
:root {
  --ckb-bg: #1a1a2e;
  --ckb-color: #ffffff;
  --ckb-btn-bg: #4361ee;
  --ckb-btn-color: #ffffff;
  --ckb-btn-radius: 20px;
}
```

### Full Options

```javascript
window.CookieBannerConfig = {
  // Text (i18n ready)
  msg: 'We use cookies.',
  acceptText: 'OK',
  rejectText: 'No',

  // Behavior
  days: 365,                    // Cookie expiry (max: 3650)
  forceEU: false,               // Force EU mode for all users
  autoAcceptDelay: 5000,        // Auto-accept delay for non-EU (ms)
  cookieName: 'ck',             // Custom cookie name
  cookieDomain: '.example.com', // Share across subdomains

  // Callbacks
  onAccept: () => {},           // User accepted
  onReject: () => {},           // User rejected

  // Advanced
  cspNonce: 'abc123',           // CSP nonce for inline styles
  container: document.body      // Custom container element
};
```

---

## Position It Anywhere

**Bottom bar (default):**
```css
:root { --ckb-bottom: 0; }
```

**Top bar:**
```css
:root { --ckb-bottom: auto; --ckb-top: 0; }
```

**Corner toast:**
```css
:root { --ckb-bottom: 20px; --ckb-right: 20px; --ckb-left: auto; }
#ckb { width: 320px; border-radius: 12px; }
```

**Center modal:**
```css
:root { --ckb-top: 50%; --ckb-left: 50%; }
#ckb { transform: translate(-50%, -50%); width: 400px; }
```

---

## i18n / Translations

Every string is customizable:

```javascript
// German
window.CookieBannerConfig = {
  msg: 'Diese Website verwendet Cookies.',
  acceptText: 'Akzeptieren',
  rejectText: 'Ablehnen'
};

// Japanese
window.CookieBannerConfig = {
  msg: 'このサイトはクッキーを使用しています。',
  acceptText: '同意する',
  rejectText: '拒否する'
};

// Spanish
window.CookieBannerConfig = {
  msg: 'Usamos cookies para mejorar tu experiencia.',
  acceptText: 'Aceptar',
  rejectText: 'Rechazar'
};
```

---

## API

```javascript
// Check consent status
CookieBanner.ok    // true = accepted, false = rejected, null = pending

// Programmatic control
CookieBanner.yes()    // Accept
CookieBanner.no()     // Reject
CookieBanner.reset()  // Clear & reload
```

---

## Size Comparison

| Library | Size |
|---------|------|
| **smallest-cookie-banner** | **~2KB** |
| cookie-consent | ~15KB |
| cookieconsent | ~25KB |
| tarteaucitron | ~45KB |
| OneTrust | ~100KB+ |
| Cookiebot | ~150KB+ |

---

## Legal Compliance

This banner is legally compliant when you:

1. **Don't set tracking cookies before consent**
2. **Respect the reject choice**
3. **Have a privacy policy**

```javascript
// Only load tracking after consent
if (CookieBanner.ok === true) {
  loadGoogleAnalytics();
  loadFacebookPixel();
}

// Or use callbacks
window.CookieBannerConfig = {
  onAccept: () => {
    loadGoogleAnalytics();
    loadFacebookPixel();
  },
  onReject: () => {
    // User said no - respect it
  }
};
```

| Region | Law | Status |
|--------|-----|--------|
| EU | GDPR | Full compliance |
| California | CCPA/CPRA | Full compliance |
| Brazil | LGPD | Full compliance |
| Canada | PIPEDA | Full compliance |
| UK | UK GDPR | Full compliance |
| Rest of world | Varies | Auto-handles |

---

## Accessibility

WCAG 2.1 AA compliant out of the box:

- **Keyboard navigation**: Tab, Shift+Tab, Enter, Escape
- **Focus trap**: Focus stays in banner until dismissed
- **ARIA**: `role="dialog"`, `aria-modal`, `aria-label`
- **Screen readers**: Works with NVDA, JAWS, VoiceOver
- **Touch targets**: Minimum 44x44px
- **Motion**: Respects `prefers-reduced-motion`

---

## Security

- **CSS sanitization**: Blocks `@import`, `expression()`, `javascript:`
- **Input validation**: All config values validated
- **Cookie safety**: `SameSite=Lax`, `Secure` on HTTPS
- **CSP support**: Pass your nonce via `cspNonce` option
- **Zero tracking**: No data sent anywhere, ever

---

## Privacy Promise

This library:
- Sets **one** first-party cookie
- Sends **zero** data anywhere
- Has **zero** external dependencies
- Makes **zero** network requests
- Collects **zero** analytics

Your users' data stays with you. Period.

---

## Browser Support

All modern browsers. IE11 not supported (and good riddance).

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+
- iOS Safari 12+
- Chrome Android 70+

---

## Development

```bash
npm install
npm test        # 86 tests
npm run build   # Build minified version
```

---

## License

**MIT** - Do whatever you want. No attribution required. No fees. Ever.

---

## FAQ

**Q: How accurate is EU detection?**
A: Covers all EU timezones. For 100% accuracy with VPN users, use server-side geo-detection and set `forceEU: true`.

**Q: Can I have granular consent (analytics vs marketing)?**
A: This banner is binary (accept all / reject all). For most sites, that's legally sufficient and better UX. If you need 47 toggles, use a bloated enterprise solution.

**Q: Why not just use Google's consent mode?**
A: You can! This banner works alongside it. But Google's solution is 10x larger and tracks users for Google's benefit.

**Q: Is this really free?**
A: Yes. MIT license. No catch. No premium tier. No "contact sales." Just a tiny cookie banner that does its job.

---

**Stop annoying your users with cookie banner novels. Get compliant in 2KB.**

[Visual Configurator](https://dreadfulcode.github.io/smallest-cookie-banner/) | [npm](https://www.npmjs.com/package/smallest-cookie-banner) | [GitHub](https://github.com/DreadfulCode/smallest-cookie-banner)
