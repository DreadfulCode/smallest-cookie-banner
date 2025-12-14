# smallest-cookie-banner

**The smallest legally compliant cookie consent banner in existence.**

[![Live Demo](https://img.shields.io/badge/🍪_Live_Demo-Configurator-4ade80?style=for-the-badge)](https://dreadfulcode.github.io/smallest-cookie-banner/) [![npm](https://img.shields.io/badge/npm-smallest--cookie--banner-cb3837?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/smallest-cookie-banner) [![Size](https://img.shields.io/badge/size-~7KB_gzip-blue?style=for-the-badge)](https://github.com/DreadfulCode/smallest-cookie-banner) [![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)

~7KB minified + gzipped. Zero dependencies. TypeScript. Works with React, Vue, Angular, Svelte, or vanilla JS.

**[Read more about the library and see it in action on my blog](https://vibecodingwithfred.com/blog/gdpr-cookie-banner-cdn/)**

If you use this library and want a mention here, send me your URL!

## Features

### Minimal
- **~7KB gzipped** — still smaller than most images
- **Zero dependencies** — no bloat, no supply chain risk
- **No external requests** — works offline, no tracking

### Flexible
- **100% customizable** — every string, every style, every behavior
- **Full i18n** — localize to any language (EN, NL, DE, ES, ZH, JA, etc.)
- **CSS variables** — style with your own design system
- **Framework agnostic** — React, Vue, Angular, Svelte, or vanilla JS

### Smart
- **Geo-aware** — auto-detects EU users via timezone for GDPR
- **Implied consent** — auto-accepts in regions where it's legal (USA, Asia, etc.)
- **TypeScript** — full type definitions included
- **Well-tested** — 307 tests, TDD approach
- **CSS Encapsulation** — Web Components with Shadow DOM (v2.0)

### Compliant & Accessible
- **GDPR, CCPA, LGPD** — legally compliant worldwide
- **WCAG 2.1 AA** — keyboard navigation, screen readers, 44px touch targets
- **Secure** — CSS sanitization, input validation, CSP nonce support

## Quick Start

### CDN (Vanilla JS)

```html
<script src="https://unpkg.com/smallest-cookie-banner@latest/dist/cookie-banner.min.js"></script>
```

### npm (Any Framework)

```bash
npm install smallest-cookie-banner
```

```typescript
// ES Module
import 'smallest-cookie-banner';

// Or with types
import { createCookieBanner, CookieBannerConfig } from 'smallest-cookie-banner';
```

### React

```tsx
import { useEffect } from 'react';
import 'smallest-cookie-banner';

function App() {
  useEffect(() => {
    window.CookieBannerConfig = {
      onAccept: () => console.log('Accepted'),
      onReject: () => console.log('Rejected')
    };
  }, []);

  return <div>Your app</div>;
}
```

### Vue

```vue
<script setup>
import 'smallest-cookie-banner';

window.CookieBannerConfig = {
  msg: 'We use cookies.',
  onAccept: () => loadAnalytics()
};
</script>
```

### Angular

```typescript
// app.component.ts
import 'smallest-cookie-banner';

ngOnInit() {
  (window as any).CookieBannerConfig = {
    onAccept: () => this.analyticsService.init()
  };
}
```

## How It Works

| User Location | Behavior | Legal Basis |
|--------------|----------|-------------|
| **EU** (GDPR) | Shows Accept + Reject buttons | Explicit consent required |
| **Everywhere else** | Shows OK button, auto-accepts | Implied consent allowed |

## Configuration

```typescript
interface CookieBannerConfig {
  // Text (i18n)
  msg?: string;              // Banner message
  acceptText?: string;       // Accept button text
  rejectText?: string;       // Reject button text (EU only)

  // Behavior
  days?: number;             // Cookie expiry (1-3650, default: 365)
  forceEU?: boolean;         // Force EU mode
  autoAcceptDelay?: number;  // Auto-accept delay in ms (0-300000)
  cookieName?: string;       // Cookie name (default: "cookie_consent")
  cookieDomain?: string;     // Cookie domain for subdomains

  // Callbacks
  onAccept?: () => void;     // Called on accept
  onReject?: () => void;     // Called on reject

  // Styling
  style?: string;            // Inline styles
  css?: string;              // Additional CSS

  // Security
  cspNonce?: string;         // CSP nonce for inline styles
  container?: HTMLElement;   // Custom container
}
```

## i18n Examples

```typescript
// English (default)
window.CookieBannerConfig = {
  msg: 'We use cookies to enhance your experience.',
  acceptText: 'Accept',
  rejectText: 'Decline'
};

// Dutch
window.CookieBannerConfig = {
  msg: 'Wij gebruiken cookies om uw ervaring te verbeteren.',
  acceptText: 'Accepteren',
  rejectText: 'Weigeren'
};

// German
window.CookieBannerConfig = {
  msg: 'Diese Website verwendet Cookies.',
  acceptText: 'Akzeptieren',
  rejectText: 'Ablehnen'
};

// Spanish
window.CookieBannerConfig = {
  msg: 'Usamos cookies para mejorar tu experiencia.',
  acceptText: 'Aceptar',
  rejectText: 'Rechazar'
};

// Chinese (Simplified)
window.CookieBannerConfig = {
  msg: '我们使用cookies来提升您的体验。',
  acceptText: '接受',
  rejectText: '拒绝'
};

// Japanese
window.CookieBannerConfig = {
  msg: 'このサイトはクッキーを使用しています。',
  acceptText: '同意する',
  rejectText: '拒否する'
};
```

## Styling

### CSS Variables

```css
:root {
  --ckb-bg: #222;
  --ckb-color: #fff;
  --ckb-btn-bg: #fff;
  --ckb-btn-color: #222;
  --ckb-btn-radius: 4px;
  --ckb-padding: 12px 16px;
  --ckb-font: 14px system-ui, sans-serif;
  --ckb-z: 9999;
}
```

### Position

```css
/* Top */
:root { --ckb-bottom: auto; --ckb-top: 0; }

/* Corner toast */
:root { --ckb-bottom: 20px; --ckb-right: 20px; --ckb-left: auto; }
#ckb { width: 320px; border-radius: 8px; }
```

## Visual Configurator

Use the **[live configurator](https://dreadfulcode.github.io/smallest-cookie-banner/)** to customize and generate code.

## API

```typescript
// Check consent status
CookieBanner.ok    // true | false | null

// Programmatic control
CookieBanner.yes()    // Accept
CookieBanner.no()     // Reject
CookieBanner.reset()  // Clear & reload
```

## Script Blocking

**Important:** The library manages consent state but doesn't block scripts automatically. You must use one of these approaches:

### Quick Start (Recommended)

```javascript
import { createCookieBanner, loadOnConsent } from 'smallest-cookie-banner';

// 1. Register scripts BEFORE creating banner (they won't load yet)
loadOnConsent('analytics', 'https://www.googletagmanager.com/gtag/js?id=G-XXXXX');
loadOnConsent('marketing', 'https://connect.facebook.net/en_US/fbevents.js');

// 2. Create banner - scripts load automatically when user consents
createCookieBanner({ mode: 'gdpr', forceEU: true });
```

**What happens:**
- User clicks "Accept All" → Both scripts load
- User clicks "Reject All" → No scripts load
- User enables only Analytics → Only analytics script loads

### HTML Approach (No JS Changes)

```html
<!-- Mark scripts as blocked with data attributes -->
<script type="text/plain" data-consent="analytics" data-src="https://www.googletagmanager.com/gtag/js?id=G-XXXXX"></script>
<script type="text/plain" data-consent="marketing" data-src="https://connect.facebook.net/en_US/fbevents.js"></script>

<script type="module">
  import { createCookieBanner, blockScriptsUntilConsent } from 'smallest-cookie-banner';

  // Scan DOM for blocked scripts
  blockScriptsUntilConsent();

  // Banner handles the rest
  createCookieBanner({ mode: 'gdpr', forceEU: true });
</script>
```

### Callback Approach (Full Control)

```javascript
import { createCookieBanner } from 'smallest-cookie-banner';

createCookieBanner({
  mode: 'gdpr',
  forceEU: true,
  onConsent: (consent) => {
    // consent = { essential: true, analytics: true/false, marketing: true/false, functional: true/false }

    if (consent.analytics) {
      // Load Google Analytics
      const script = document.createElement('script');
      script.src = 'https://www.googletagmanager.com/gtag/js?id=G-XXXXX';
      document.head.appendChild(script);
    }

    if (consent.marketing) {
      // Load Facebook Pixel, etc.
    }
  }
});
```

### Google Consent Mode v2

```javascript
// Set defaults BEFORE gtag loads
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}

gtag('consent', 'default', {
  'analytics_storage': 'denied',
  'ad_storage': 'denied',
});

// Update on consent
createCookieBanner({
  mode: 'gdpr',
  forceEU: true,
  onConsent: (consent) => {
    gtag('consent', 'update', {
      'analytics_storage': consent.analytics ? 'granted' : 'denied',
      'ad_storage': consent.marketing ? 'granted' : 'denied',
    });
  }
});
```

## TypeScript

Full type definitions included:

```typescript
import {
  createCookieBanner,
  CookieBannerConfig,
  CookieBannerInstance
} from 'smallest-cookie-banner';

const config: CookieBannerConfig = {
  msg: 'We use cookies.',
  onAccept: () => loadAnalytics()
};

const banner: CookieBannerInstance = createCookieBanner(config);
```

## Size Comparison

| Library | Size |
|---------|------|
| **smallest-cookie-banner** | **~6KB** |
| cookie-consent | ~15KB |
| cookieconsent | ~25KB |
| tarteaucitron | ~45KB |
| OneTrust | ~100KB+ |

## Compliance

| Region | Law | Status |
|--------|-----|--------|
| EU | GDPR | ✅ |
| California | CCPA | ✅ |
| Brazil | LGPD | ✅ |
| UK | UK GDPR | ✅ |
| Canada | PIPEDA | ✅ |

## Accessibility (WCAG 2.1 AA)

- Keyboard navigation (Tab, Escape)
- Focus trap while visible
- ARIA attributes (`role="dialog"`, `aria-modal`)
- 44px touch targets
- Respects `prefers-reduced-motion`

## Security

- CSS injection protection
- Input validation
- CSP nonce support
- `SameSite=Lax` cookies
- `Secure` flag on HTTPS

## Contributing

Contributions welcome! Current version: **v1.0.6**

### Getting Started

1. Fork the repo and clone locally
2. Install dependencies: `npm install`
3. Create a feature branch: `git checkout -b feature/your-feature`

### PR Requirements

All PRs must include:

| Type | Requirements |
|------|-------------|
| **Bug Fix** | Test case reproducing the bug + fix |
| **New Feature** | Tests covering the feature, updated types |
| **Refactor** | No coverage regression, passing tests |
| **Docs** | Accurate, clear, spell-checked |

### Checklist

- [ ] Tests pass: `npm test`
- [ ] **90%+ code coverage** (enforced by CI)
- [ ] Linting passes: `npm run lint`
- [ ] Types check: `npm run typecheck`
- [ ] Build succeeds: `npm run build`
- [ ] PR description explains the change

### CI Pipeline

All PRs are automatically checked for:
- Linting (ESLint + TypeScript)
- Tests (Jest, 260+ test cases)
- Coverage threshold (90% minimum)
- Build verification

## Development

```bash
npm install
npm test        # Run tests with coverage
npm run build   # Build for production
npm run lint    # Check code style
```

## Browser Support

Chrome 60+, Firefox 60+, Safari 12+, Edge 79+, iOS Safari 12+, Chrome Android 70+

## License

MIT
