# smallest-cookie-banner

**The smallest legally compliant cookie consent banner in existence.**

[![Live Demo](https://img.shields.io/badge/🍪_Live_Demo-Configurator-4ade80?style=for-the-badge)](https://dreadfulcode.github.io/smallest-cookie-banner/) [![npm](https://img.shields.io/npm/v/smallest-cookie-banner?style=for-the-badge&color=cb3837)](https://www.npmjs.com/package/smallest-cookie-banner) [![Bundle Size](https://img.shields.io/badge/size-~2KB-blue?style=for-the-badge)](https://bundlephobia.com/package/smallest-cookie-banner)

~2KB minified + gzipped. Zero dependencies. TypeScript. Works with React, Vue, Angular, Svelte, or vanilla JS.

## What Makes This Different

- **Geo-aware**: Auto-detects EU users (via timezone) for GDPR compliance
- **Implied consent elsewhere**: Non-EU users get auto-accept after scroll/5s (legally sufficient)
- **Truly minimal**: Every byte counts. No bloat.
- **TypeScript**: Full type definitions included
- **Framework agnostic**: Works with any framework or vanilla JS
- **100% customizable**: Every string, every style, every behavior
- **Full i18n**: Localize to any language
- **Well-tested**: 86 tests, TDD approach
- **WCAG 2.1 AA**: Fully accessible out of the box
- **Secure**: CSS sanitization, input validation, CSP support

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
  days?: number;             // Cookie expiry (1-3650)
  forceEU?: boolean;         // Force EU mode
  autoAcceptDelay?: number;  // Auto-accept delay in ms (0-300000)
  cookieName?: string;       // Custom cookie name
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

## Development

```bash
npm install
npm test        # 86 tests
npm run build   # Build
```

## Browser Support

Chrome 60+, Firefox 60+, Safari 12+, Edge 79+, iOS Safari 12+, Chrome Android 70+

## License

MIT
