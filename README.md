# smallest-cookie-banner

**The smallest legally compliant cookie consent banner in existence.**

[![Live Demo](https://img.shields.io/badge/🍪_Live_Demo-Configurator-4ade80?style=for-the-badge)](https://dreadfulcode.github.io/smallest-cookie-banner/) [![npm](https://img.shields.io/badge/npm-smallest--cookie--banner-cb3837?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/smallest-cookie-banner) [![Size](https://img.shields.io/badge/size-~2KB_gzip-blue?style=for-the-badge)](https://github.com/DreadfulCode/smallest-cookie-banner) [![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)

~2KB minified + gzipped. Zero dependencies. TypeScript. Works with React, Vue, Angular, Svelte, or vanilla JS.

**[Read more about the library and see it in action on my blog](https://vibecodingwithfred.com/blog/gdpr-cookie-banner-cdn/)**

If you use this library and want a mention here, send me your URL!

> ⚠️ **Alpha Version** — This project is in active development and has not been tested in all browsers yet. Use in production at your own discretion. Please [report issues](https://github.com/DreadfulCode/smallest-cookie-banner/issues) if you encounter bugs.

## Features

### Minimal
- **~2KB gzipped** — smaller than a favicon
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
- **Well-tested** — 91 tests, TDD approach

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
| **smallest-cookie-banner** | **~2KB** |
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

Contributions welcome! Current version: **v1.0.5**

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
