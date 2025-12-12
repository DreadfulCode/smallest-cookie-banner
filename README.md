# smallest-cookie-banner

The smallest legally compliant cookie consent banner. No dependencies. ~1KB minified + gzipped.

## Why?

Cookie banners are annoying. But they're legally required. This is the smallest possible implementation that still keeps you compliant with GDPR, CCPA, LGPD, and other privacy regulations worldwide.

## Quick Start (CDN)

```html
<script src="https://unpkg.com/smallest-cookie-banner@latest/dist/cookie-banner.min.js"></script>
```

Or via jsDelivr:

```html
<script src="https://cdn.jsdelivr.net/npm/smallest-cookie-banner@latest/dist/cookie-banner.min.js"></script>
```

That's it. A banner will appear for new visitors.

## Installation

### NPM

```bash
npm install smallest-cookie-banner
```

```javascript
import 'smallest-cookie-banner';
```

### Manual

Download `cookie-banner.min.js` and include it:

```html
<script src="cookie-banner.min.js"></script>
```

## Configuration

```html
<script>
window.CookieBannerConfig = {
  // Text content
  message: 'We use cookies.',
  acceptText: 'OK',
  rejectText: '✕',

  // Behavior
  expires: 365,              // Days until consent expires
  sameSite: 'Lax',           // Cookie SameSite attribute

  // Callbacks
  onAccept: () => {},        // Called when user accepts
  onReject: () => {},        // Called when user rejects

  // Styling
  position: 'bottom',        // 'top' or 'bottom'
  zIndex: 9999,
};
</script>
<script src="https://unpkg.com/smallest-cookie-banner@latest/dist/cookie-banner.min.js"></script>
```

## API

```javascript
// Check consent status
CookieBanner.hasConsent()     // Returns: true, false, or null (not yet decided)

// Programmatically set consent
CookieBanner.accept()
CookieBanner.reject()

// Reset consent (show banner again)
CookieBanner.reset()

// Show/hide banner manually
CookieBanner.show()
CookieBanner.hide()
```

## Legal Compliance

### What This Banner Does

| Requirement | Status |
|------------|--------|
| Shows notice before setting cookies | ✅ |
| Provides Accept option | ✅ |
| Provides Reject option | ✅ |
| Remembers user choice | ✅ |
| Works without JavaScript cookies | ✅ |
| Doesn't set tracking cookies until consent | ✅ |

### What YOU Must Do

This banner handles the UI. You must:

1. **Not load tracking scripts until consent is given**
2. **Respect the user's choice** - check `CookieBanner.hasConsent()` before loading analytics, ads, etc.
3. **Have a Privacy Policy** - link to it from your site
4. **Document what cookies you use** - required by most regulations

### Example: Conditional Script Loading

```javascript
// Only load Google Analytics if user consented
if (CookieBanner.hasConsent() === true) {
  // Load your tracking scripts
  const script = document.createElement('script');
  script.src = 'https://www.googletagmanager.com/gtag/js?id=GA_ID';
  document.head.appendChild(script);
}

// Or use the callback
window.CookieBannerConfig = {
  onAccept: () => {
    // Load tracking scripts here
  }
};
```

## Jurisdiction Guide

### GDPR (European Union)

**Strictest requirements.** Requires:
- Explicit opt-in consent BEFORE any non-essential cookies
- Granular control (this banner provides accept/reject)
- Must be as easy to reject as accept
- Consent must be freely given, specific, informed
- Must be able to withdraw consent

**This banner is GDPR compliant** when you:
- Don't set any non-essential cookies before consent
- Respect the reject choice

### CCPA/CPRA (California, USA)

**Opt-out model.** Requires:
- "Do Not Sell/Share My Personal Information" option
- Notice at collection

**This banner satisfies basic requirements.** For full CCPA compliance, you may want to customize the reject text to "Do Not Sell My Info".

### LGPD (Brazil)

Similar to GDPR. Requires consent for personal data processing. **This banner is compliant.**

### POPIA (South Africa)

Requires consent for processing personal information. **This banner is compliant.**

### PDPA (Thailand, Singapore)

Consent-based frameworks. **This banner is compliant.**

### ePrivacy Directive (EU)

Works alongside GDPR. Specifically covers cookies and electronic communications. **This banner is compliant.**

### PIPEDA (Canada)

Requires meaningful consent. Implied consent acceptable for non-sensitive data. **This banner is compliant.**

### Jurisdictions with Implied Consent

Some jurisdictions allow implied consent (continuing to browse = consent):
- USA (except California for certain data)
- Canada (for non-sensitive data)
- Australia (no specific cookie law)
- Most of Asia (varies by country)
- Most of South America (except Brazil)

**Even in these jurisdictions**, showing a notice is best practice and prepares you for regulatory changes.

## Minimal Mode

For jurisdictions allowing implied consent, you can use a notice-only mode:

```javascript
window.CookieBannerConfig = {
  message: 'This site uses cookies.',
  acceptText: 'OK',
  rejectText: '',  // Empty string hides reject button
};
```

## Customizing Appearance

The banner uses minimal inline styles. Override with CSS:

```css
#cookie-banner {
  background: #000 !important;
  color: #fff !important;
  font-family: system-ui !important;
}

#cookie-banner button {
  background: #fff !important;
  color: #000 !important;
}
```

## Size Comparison

| Library | Size (min+gzip) |
|---------|----------------|
| **smallest-cookie-banner** | **~1KB** |
| cookie-consent | ~15KB |
| cookieconsent | ~25KB |
| tarteaucitron | ~45KB |
| OneTrust | ~100KB+ |

## How It Works

1. On page load, checks for existing consent cookie
2. If no consent recorded, shows banner
3. User clicks Accept or Reject
4. Choice stored in a first-party cookie (`cookie_consent`)
5. Banner hidden, callbacks fired
6. On subsequent visits, banner stays hidden

The consent cookie itself is considered "strictly necessary" (required for the site to function as intended by respecting user preferences) and doesn't require consent to set.

## Browser Support

All modern browsers + IE11.

## Self-Hosting

If you don't want any external requests:

1. Download `dist/cookie-banner.min.js`
2. Host it on your own server
3. Include it: `<script src="/js/cookie-banner.min.js"></script>`

## Privacy

This library:
- Sets only ONE first-party cookie (`cookie_consent`)
- Sends NO data anywhere
- Has NO external dependencies
- Makes NO network requests
- Collects NO analytics

## License

MIT - Use it however you want.

## Contributing

Found a way to make it smaller? PRs welcome.

## FAQ

**Q: Is this actually legally compliant?**

A: This banner provides the UI mechanics required by privacy laws. Compliance also depends on YOUR implementation (not loading trackers before consent, having a privacy policy, etc.). When in doubt, consult a lawyer.

**Q: Can I remove the reject button?**

A: In GDPR jurisdictions, no - rejecting must be as easy as accepting. In other jurisdictions, you may be able to use notice-only mode.

**Q: What about "legitimate interest"?**

A: Legitimate interest is a GDPR legal basis that doesn't require consent for some processing. However, cookies for tracking/analytics generally still require consent. This is a legal question - consult a lawyer.

**Q: Do I need this for strictly necessary cookies?**

A: No. Cookies essential for the site to function (session cookies, shopping cart, etc.) don't require consent. But you should still inform users about them in your privacy policy.

**Q: What about the "Accept All" / "Manage Preferences" pattern?**

A: That's for granular consent (analytics vs marketing vs functional). This library takes a simpler approach: accept all non-essential cookies or reject all. For most small sites, this is sufficient. Large sites with complex cookie needs might want a more feature-rich solution.
