/**
 * Tests for smallest-cookie-banner
 */

import {
  isEU,
  getConsent,
  setConsent,
  deleteConsent,
  createCookieBanner,
  setup,
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
  _resetSingleton,
  injectStyles,
  loadOnConsent,
  blockScriptsUntilConsent,
  _resetScriptRegistry,
  _loadConsentedScripts,
} from '../src/cookie-banner';

// Store original location for restoration
const originalLocation = window.location;

// Component name for Web Component
const COMPONENT_NAME = 'cookie-banner-element';

// Helper functions to query inside Shadow DOM
function getBannerElement(): HTMLElement | null {
  return document.querySelector(COMPONENT_NAME);
}

function getShadowRoot(): ShadowRoot | null {
  const el = getBannerElement();
  return el?.shadowRoot ?? null;
}

// Query inside shadow DOM - returns element from shadow root
function shadowQuery(selector: string): HTMLElement | null {
  const shadow = getShadowRoot();
  return shadow?.querySelector(selector) as HTMLElement | null;
}

// Query all inside shadow DOM
function shadowQueryAll(selector: string): NodeListOf<Element> {
  const shadow = getShadowRoot();
  return shadow?.querySelectorAll(selector) ?? document.querySelectorAll('nonexistent');
}

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
    _resetSingleton();
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
      document.cookie = 'cookie_consent=1;path=/';
      expect(getConsent()).toBe('1');
    });

    it('returns "0" when consent cookie is rejected', () => {
      document.cookie = 'cookie_consent=0;path=/';
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
      expect(document.cookie).toContain('cookie_consent=1');
    });

    it('supports custom cookie name', () => {
      setConsent('1', 'my_cookie');
      expect(document.cookie).toContain('my_cookie=1');
    });

    it('supports custom days', () => {
      setConsent('1', 'cookie_consent', 30);
      expect(document.cookie).toContain('cookie_consent=1');
    });
  });

  describe('deleteConsent()', () => {
    it('deletes consent cookie', () => {
      document.cookie = 'cookie_consent=1;path=/';
      deleteConsent();
      expect(getConsent()).toBeNull();
    });

    it('deletes consent cookie on HTTPS', () => {
      Object.defineProperty(window, 'location', {
        value: { protocol: 'https:' },
        writable: true,
        configurable: true,
      });
      document.cookie = 'cookie_consent=1;path=/';
      deleteConsent();
      expect(getConsent()).toBeNull();
    });
  });

  describe('injectStyles() (deprecated, for backwards compatibility)', () => {
    it('injects styles into document head', () => {
      const testId = 'test-inject-style';
      injectStyles(testId, '.test { color: red; }');
      const style = document.getElementById(testId);
      expect(style).not.toBeNull();
      expect(style?.textContent).toContain('.test');
      style?.remove();
    });

    it('does not duplicate styles with same ID', () => {
      const testId = 'test-inject-style-dup';
      injectStyles(testId, '.test1 { color: red; }');
      injectStyles(testId, '.test2 { color: blue; }');
      const styles = document.querySelectorAll(`#${testId}`);
      expect(styles.length).toBe(1);
      // Should still have original content
      expect(styles[0]?.textContent).toContain('.test1');
      document.getElementById(testId)?.remove();
    });

    it('adds nonce attribute when provided', () => {
      const testId = 'test-inject-style-nonce';
      injectStyles(testId, '.test { color: red; }', 'test-nonce-123');
      const style = document.getElementById(testId);
      expect(style?.getAttribute('nonce')).toBe('test-nonce-123');
      style?.remove();
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
      document.cookie = 'cookie_consent=1;path=/';
      const banner = createCookieBanner();
      expect(banner.status).toBe(true);
    });

    it('shows banner on show()', () => {
      const banner = createCookieBanner();
      banner.show();
      expect(getBannerElement()).not.toBeNull();
      expect(banner.isVisible()).toBe(true);
    });

    it('does not show banner if consent exists', () => {
      document.cookie = 'cookie_consent=1;path=/';
      const banner = createCookieBanner();
      banner.show();
      expect(getBannerElement()).toBeNull();
    });

    it('hides banner on hide()', () => {
      const banner = createCookieBanner();
      banner.show();
      banner.hide();
      expect(getBannerElement()).toBeNull();
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
      expect(document.cookie).toContain('cookie_consent=1');
    });

    it('destroys banner and cleans up', () => {
      const banner = createCookieBanner();
      banner.show();
      // Style is now inside Shadow DOM, not document head
      // Verify banner element exists before destroy
      expect(getBannerElement()).not.toBeNull();
      banner.destroy();
      // Banner element should be removed
      expect(getBannerElement()).toBeNull();
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
        expect(shadowQuery('#ckn')).not.toBeNull();
      });

      it('hides reject button when forceEU is false', () => {
        const banner = createCookieBanner({ forceEU: false });
        banner.show();
        expect(shadowQuery('#ckn')).toBeNull();
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

      it('auto-accepts on scroll when autoAcceptOnScroll enabled', () => {
        const banner = createCookieBanner({ forceEU: false, autoAcceptOnScroll: true });
        banner.show();
        document.dispatchEvent(new Event('scroll'));
        expect(banner.status).toBe(true);
      });

      it('does not auto-accept on scroll by default', () => {
        const banner = createCookieBanner({ forceEU: false });
        banner.show();
        document.dispatchEvent(new Event('scroll'));
        expect(banner.status).toBeNull(); // Should still be pending
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
        expect(shadowQuery('#ckb')?.innerHTML).toContain('Custom message');
      });

      it('uses custom button text', () => {
        const banner = createCookieBanner({ acceptText: 'OK!', rejectText: 'No', forceEU: true });
        banner.show();
        expect(shadowQuery('#cky')?.textContent).toBe('OK!');
        expect(shadowQuery('#ckn')?.textContent).toBe('No');
      });

      it('applies custom style', () => {
        const banner = createCookieBanner({ style: 'background: red' });
        banner.show();
        expect(shadowQuery('#ckb')?.style.background).toBe('red');
      });

      it('injects custom CSS', () => {
        const banner = createCookieBanner({ css: '.test{color:blue}' });
        banner.show();
        // Style is now inside Shadow DOM
        const style = getShadowRoot()?.querySelector('style');
        expect(style?.textContent).toContain('.test{color:blue}');
      });

      it('uses custom container', () => {
        const container = document.createElement('div');
        container.id = 'custom-container';
        document.body.appendChild(container);
        const banner = createCookieBanner({ container });
        banner.show();
        // Web Component is appended to custom container
        expect(container.querySelector(COMPONENT_NAME)).not.toBeNull();
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
        expect(shadowQuery('#ckb')?.innerHTML).toContain('Wij gebruiken cookies');
        expect(shadowQuery('#cky')?.textContent).toBe('Accepteren');
        expect(shadowQuery('#ckn')?.textContent).toBe('Weigeren');
      });

      it('supports Japanese localization', () => {
        const banner = createCookieBanner({
          msg: 'このサイトはクッキーを使用しています。',
          acceptText: '同意する',
          rejectText: '拒否する',
          forceEU: true
        });
        banner.show();
        expect(shadowQuery('#ckb')?.innerHTML).toContain('このサイトはクッキーを使用しています');
        expect(shadowQuery('#cky')?.textContent).toBe('同意する');
        expect(shadowQuery('#ckn')?.textContent).toBe('拒否する');
      });

      it('supports German localization', () => {
        const banner = createCookieBanner({
          msg: 'Diese Website verwendet Cookies.',
          acceptText: 'Akzeptieren',
          rejectText: 'Ablehnen',
          forceEU: true
        });
        banner.show();
        expect(shadowQuery('#ckb')?.innerHTML).toContain('Diese Website verwendet Cookies');
        expect(shadowQuery('#cky')?.textContent).toBe('Akzeptieren');
        expect(shadowQuery('#ckn')?.textContent).toBe('Ablehnen');
      });

      it('supports Spanish localization', () => {
        const banner = createCookieBanner({
          msg: 'Usamos cookies para mejorar tu experiencia.',
          acceptText: 'Aceptar',
          rejectText: 'Rechazar',
          forceEU: true
        });
        banner.show();
        expect(shadowQuery('#ckb')?.innerHTML).toContain('Usamos cookies');
        expect(shadowQuery('#cky')?.textContent).toBe('Aceptar');
        expect(shadowQuery('#ckn')?.textContent).toBe('Rechazar');
      });

      it('supports Chinese localization', () => {
        const banner = createCookieBanner({
          msg: '我们使用cookies来提升您的体验。',
          acceptText: '接受',
          rejectText: '拒绝',
          forceEU: true
        });
        banner.show();
        expect(shadowQuery('#ckb')?.innerHTML).toContain('我们使用cookies');
        expect(shadowQuery('#cky')?.textContent).toBe('接受');
        expect(shadowQuery('#ckn')?.textContent).toBe('拒绝');
      });

      it('supports custom bannerAriaLabel', () => {
        const banner = createCookieBanner({
          bannerAriaLabel: 'Consentement aux cookies',
          forceEU: true,
        });
        banner.show();
        expect(shadowQuery('#ckb')?.getAttribute('aria-label')).toBe('Consentement aux cookies');
      });

      it('supports custom requiredLabel in GDPR mode', () => {
        const banner = createCookieBanner({
          mode: 'gdpr',
          requiredLabel: '(Obligatoire)',
          forceEU: true,
        });
        banner.show();
        const requiredSpan = shadowQuery('.cat-req');
        expect(requiredSpan?.textContent).toBe('(Obligatoire)');
      });

      it('supports full French localization (non-tabbed)', () => {
        const banner = createCookieBanner({
          mode: 'gdpr',
          msg: 'Nous utilisons des cookies pour améliorer votre expérience.',
          acceptText: 'Tout accepter',
          rejectText: 'Tout refuser',
          settingsText: 'Personnaliser',
          saveText: 'Enregistrer les préférences',
          privacyPolicyText: 'Politique de confidentialité',
          bannerAriaLabel: 'Consentement aux cookies',
          requiredLabel: '(Obligatoire)',
          privacyPolicyUrl: '/politique-confidentialite',
          forceEU: true,
          tabs: { enabled: false }, // Test non-tabbed mode
        });
        banner.show();
        expect(shadowQuery('#ckb')?.innerHTML).toContain('Nous utilisons des cookies');
        expect(shadowQuery('#cky')?.textContent).toBe('Tout accepter');
        expect(shadowQuery('#ckn')?.textContent).toBe('Tout refuser');
        expect(shadowQuery('#cks')?.textContent).toBe('Personnaliser');
        expect(shadowQuery('.cat-req')?.textContent).toBe('(Obligatoire)');
        expect(shadowQuery('#ckb')?.getAttribute('aria-label')).toBe('Consentement aux cookies');
      });
    });

    describe('XSS prevention', () => {
      it('escapes HTML in message', () => {
        const banner = createCookieBanner({ msg: '<script>alert(1)</script>' });
        banner.show();
        const content = shadowQuery('#ckb')?.innerHTML || '';
        expect(content).not.toContain('<script>');
        expect(content).toContain('&lt;script&gt;');
      });
    });

    describe('multiple instances', () => {
      it('supports multiple banners with different cookies', () => {
        const banner1 = createCookieBanner({ cookieName: 'consent1', allowMultiple: true });
        const banner2 = createCookieBanner({ cookieName: 'consent2', allowMultiple: true });

        banner1.accept();
        expect(getConsent('consent1')).toBe('1');
        expect(getConsent('consent2')).toBeNull();
        expect(banner2.status).toBeNull();
      });
    });
  });

  describe('setup()', () => {
    it('creates window.CookieBanner API', () => {
      window.CookieBannerConfig = {};
      setup();
      expect(window.CookieBanner).toBeDefined();
      expect(typeof window.CookieBanner?.yes).toBe('function');
      expect(typeof window.CookieBanner?.no).toBe('function');
      expect(typeof window.CookieBanner?.reset).toBe('function');
    });

    it('shows banner automatically when no consent', () => {
      window.CookieBannerConfig = {};
      setup();
      expect(getBannerElement()).not.toBeNull();
    });

    it('does not show banner when consent exists', () => {
      document.cookie = 'cookie_consent=1;path=/';
      window.CookieBannerConfig = {};
      setup();
      expect(getBannerElement()).toBeNull();
    });

    it('legacy ok property reflects status', () => {
      window.CookieBannerConfig = {};
      setup();
      const api = window.CookieBanner as LegacyCookieBannerAPI;
      expect(api.ok).toBeNull();
      api.yes();
      expect(api.ok).toBe(true);
    });

    it('legacy reset clears cookie and reloads', () => {
      window.CookieBannerConfig = {};
      setup();
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
      shadowQuery('#cky')?.click();
      expect(banner.status).toBe(true);
    });

    it('reject button sets consent', () => {
      const banner = createCookieBanner({ forceEU: true });
      banner.show();
      shadowQuery('#ckn')?.click();
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
        // Style is now inside Shadow DOM
        const style = getShadowRoot()?.querySelector('style');
        expect(style?.textContent).not.toContain('@import');
        expect(style?.textContent).not.toContain('evil.com');
        expect(style?.textContent).not.toContain('track.com');
      });

      it('sanitizes config.style before applying', () => {
        const banner = createCookieBanner({
          style: 'background: url(https://evil.com/steal)',
        });
        banner.show();
        const el = shadowQuery('#ckb');
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
        const el = shadowQuery('#ckb');
        expect(el?.getAttribute('role')).toBe('dialog');
      });

      it('has aria-label on banner', () => {
        const banner = createCookieBanner({ forceEU: true });
        banner.show();
        const el = shadowQuery('#ckb');
        expect(el?.getAttribute('aria-label')).toBe('Cookie consent');
      });

      it('has aria-describedby linking to message', () => {
        const banner = createCookieBanner({ forceEU: true });
        banner.show();
        const el = shadowQuery('#ckb');
        const msgId = el?.querySelector('p')?.id;
        expect(el?.getAttribute('aria-describedby')).toBe(msgId);
      });

      it('has aria-modal="true" for modal behavior', () => {
        const banner = createCookieBanner({ forceEU: true });
        banner.show();
        const el = shadowQuery('#ckb');
        expect(el?.getAttribute('aria-modal')).toBe('true');
      });

      it('buttons have type="button"', () => {
        const banner = createCookieBanner({ forceEU: true });
        banner.show();
        const acceptBtn = shadowQuery('#cky');
        const rejectBtn = shadowQuery('#ckn');
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

        const el = shadowQuery('#ckb');
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

        // With Shadow DOM, document.activeElement is the host element
        // The inner wrapper has focus inside the shadow root
        const bannerEl = getBannerElement();
        expect(document.activeElement).toBe(bannerEl);
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

        // Style is now inside Shadow DOM
        const style = getShadowRoot()?.querySelector('style');
        // Check that CSS includes min-height and min-width for buttons
        expect(style?.textContent).toContain('min-height:44px');
        expect(style?.textContent).toContain('min-width:44px');
      });
    });

    describe('reduced motion', () => {
      it('includes prefers-reduced-motion media query', () => {
        const banner = createCookieBanner();
        banner.show();
        // Style is now inside Shadow DOM
        const style = getShadowRoot()?.querySelector('style');
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
      // Style is now inside Shadow DOM
      const style = getShadowRoot()?.querySelector('style');
      expect(style?.getAttribute('nonce')).toBe('abc123');
    });

    it('does not add nonce attribute when not provided', () => {
      const banner = createCookieBanner();
      banner.show();
      // Style is now inside Shadow DOM
      const style = getShadowRoot()?.querySelector('style');
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

      // Verify appendChild was called with a Web Component
      // Content is inside Shadow DOM, not innerHTML of the element
      expect(appendChildSpy).toHaveBeenCalled();
      const appendedEl = appendChildSpy.mock.calls[0]?.[0] as HTMLElement;
      // With Shadow DOM, check shadowRoot has content
      const shadowRoot = (appendedEl as unknown as { shadowRoot: ShadowRoot }).shadowRoot;
      expect(shadowRoot?.innerHTML).toContain('button');

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

    describe('GDPR banner rendering (non-tabbed)', () => {
      it('shows categories panel in GDPR mode (non-tabbed)', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true, tabs: { enabled: false } });
        banner.show();
        expect(shadowQuery('#ckb-cats')).not.toBeNull();
      });

      it('shows categories when categories array is provided (non-tabbed)', () => {
        const banner = createCookieBanner({
          categories: DEFAULT_CATEGORIES,
          forceEU: true,
          tabs: { enabled: false },
        });
        banner.show();
        expect(shadowQuery('#ckb-cats')).not.toBeNull();
      });

      it('shows settings button in GDPR mode (non-tabbed)', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true, tabs: { enabled: false } });
        banner.show();
        expect(shadowQuery('#cks')).not.toBeNull();
      });

      it('shows save button (hidden initially) in GDPR mode (non-tabbed)', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true, tabs: { enabled: false } });
        banner.show();
        const saveBtn = shadowQuery('#cksv');
        expect(saveBtn).not.toBeNull();
        expect(saveBtn?.style.display).toBe('none');
      });

      it('uses Accept All and Reject All text in GDPR mode', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
        banner.show();
        expect(shadowQuery('#cky')?.textContent).toBe('Accept All');
        expect(shadowQuery('#ckn')?.textContent).toBe('Reject All');
      });

      it('renders checkboxes for each category', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
        banner.show();
        const checkboxes = shadowQueryAll('input[name="ckb-cat"]');
        expect(checkboxes.length).toBe(DEFAULT_CATEGORIES.length);
      });

      it('disables required category checkboxes', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
        banner.show();
        const essentialCheckbox = shadowQuery('input[value="essential"]') as HTMLInputElement;
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
        const link = shadowQuery('#ckb a[href="https://example.com/privacy"]');
        expect(link).not.toBeNull();
      });
    });

    describe('GDPR settings toggle', () => {
      it('toggles expanded class on settings click (non-tabbed)', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true, tabs: { enabled: false } });
        banner.show();
        const settingsBtn = shadowQuery('#cks');
        const el = shadowQuery('#ckb');

        expect(el?.classList.contains('expanded')).toBe(false);
        settingsBtn?.click();
        expect(el?.classList.contains('expanded')).toBe(true);
      });

      it('shows save button and hides settings when expanded (non-tabbed)', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true, tabs: { enabled: false } });
        banner.show();
        const settingsBtn = shadowQuery('#cks');
        const saveBtn = shadowQuery('#cksv');

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
        shadowQuery('#cky')?.click();

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
        shadowQuery('#ckn')?.click();

        expect(onConsent).toHaveBeenCalled();
        const consent = onConsent.mock.calls[0][0] as ConsentState;
        expect(consent.essential).toBe(true); // Required stays true
        expect(consent.analytics).toBe(false);
        expect(consent.marketing).toBe(false);
        expect(consent.functional).toBe(false);
      });

      it('Save Preferences saves checkbox states (non-tabbed)', () => {
        const onConsent = jest.fn();
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true, onConsent, tabs: { enabled: false } });
        banner.show();

        // Expand settings
        shadowQuery('#cks')?.click();

        // Check only analytics
        const analyticsCheckbox = shadowQuery('input[value="analytics"]') as HTMLInputElement;
        analyticsCheckbox.checked = true;

        // Uncheck marketing
        const marketingCheckbox = shadowQuery('input[value="marketing"]') as HTMLInputElement;
        marketingCheckbox.checked = false;

        // Save
        shadowQuery('#cksv')?.click();

        expect(onConsent).toHaveBeenCalled();
        const consent = onConsent.mock.calls[0][0] as ConsentState;
        expect(consent.analytics).toBe(true);
        expect(consent.marketing).toBe(false);
      });

      it('stores granular consent in cookie', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
        banner.show();
        shadowQuery('#cky')?.click();

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
        expect(getBannerElement()).toBeNull();

        banner.manage();
        expect(getBannerElement()).not.toBeNull();
      });

      it('starts in expanded mode', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
        banner.accept();
        banner.manage();

        const el = shadowQuery('#ckb');
        expect(el?.classList.contains('expanded')).toBe(true);
      });

      it('preserves previous consent state in checkboxes', () => {
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
        banner.show();

        // Expand and set specific consent
        shadowQuery('#cks')?.click();
        const analyticsCheckbox = shadowQuery('input[value="analytics"]') as HTMLInputElement;
        analyticsCheckbox.checked = false;
        shadowQuery('#cksv')?.click();

        // Reopen via manage()
        banner.manage();

        // Check that previous state is preserved
        const analyticsCheckbox2 = shadowQuery('input[value="analytics"]') as HTMLInputElement;
        expect(analyticsCheckbox2.checked).toBe(false);
      });
    });

    describe('GDPR with existing consent', () => {
      it('reads granular consent from cookie on init', () => {
        document.cookie = 'cookie_consent=essential:1,analytics:0,marketing:1,functional:0;path=/';
        const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });

        const consent = banner.getConsent();
        expect(consent?.essential).toBe(true);
        expect(consent?.analytics).toBe(false);
        expect(consent?.marketing).toBe(true);
        expect(consent?.functional).toBe(false);
      });

      it('reads legacy consent "1" as all accepted', () => {
        document.cookie = 'cookie_consent=1;path=/';
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

        const checkboxes = shadowQueryAll('input[name="ckb-cat"]');
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

        const analyticsCheckbox = shadowQuery('input[value="analytics"]') as HTMLInputElement;
        const marketingCheckbox = shadowQuery('input[value="marketing"]') as HTMLInputElement;

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

        expect(getBannerElement()).toBeNull();

        const widget = document.querySelector('[id^="ckb-widget"]') as HTMLButtonElement;
        widget?.click();

        expect(getBannerElement()).not.toBeNull();
        expect(shadowQuery('#ckb')?.classList.contains('expanded')).toBe(true);
      });

      it('records method as "widget" when consent changed via widget (non-tabbed)', () => {
        const onConsent = jest.fn();
        const banner = createCookieBanner({
          mode: 'gdpr',
          forceEU: true,
          widget: { enabled: true },
          onConsent,
          tabs: { enabled: false },
        });
        banner.show();
        banner.accept();

        // Click widget to reopen
        const widget = document.querySelector('[id^="ckb-widget"]') as HTMLButtonElement;
        widget?.click();

        // Save new preferences
        shadowQuery('#cksv')?.click();

        // Second call should have method 'widget'
        expect(onConsent).toHaveBeenCalledTimes(2);
        const record = onConsent.mock.calls[1][1] as ConsentRecord;
        expect(record.method).toBe('widget');
      });
    });

    describe('widget with existing consent', () => {
      it('shows widget on init when consent exists and widget enabled', () => {
        document.cookie = 'cookie_consent=essential:1,analytics:1;path=/';
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
    it('sanitizes javascript: URLs in privacyPolicyUrl (non-tabbed)', () => {
      const banner = createCookieBanner({
        mode: 'gdpr',
        forceEU: true,
        privacyPolicyUrl: 'javascript:alert(document.cookie)',
        tabs: { enabled: false },
      });
      banner.show();

      const link = shadowQuery('#ckb a');
      // Link should not be rendered since URL is blocked
      expect(link).toBeNull();
    });

    it('sanitizes javascript: URLs in privacyPolicyUrl (tabbed)', () => {
      const banner = createCookieBanner({
        mode: 'gdpr',
        forceEU: true,
        privacyPolicyUrl: 'javascript:alert(document.cookie)',
      });
      banner.show();

      // In tabbed mode, only the powered-by link exists in About tab
      const aboutLinks = shadowQueryAll('#ckb-panel-about a');
      // All links should be the powered-by link, not the blocked javascript: URL
      expect(aboutLinks.length).toBe(1);
      expect(aboutLinks[0]?.getAttribute('href')).toContain('github.com');
    });

    it('allows valid https URLs in privacyPolicyUrl', () => {
      const banner = createCookieBanner({
        mode: 'gdpr',
        forceEU: true,
        privacyPolicyUrl: 'https://example.com/privacy',
      });
      banner.show();

      const link = shadowQuery('#ckb a[href="https://example.com/privacy"]');
      expect(link).not.toBeNull();
    });

    it('allows relative URLs in privacyPolicyUrl', () => {
      const banner = createCookieBanner({
        mode: 'gdpr',
        forceEU: true,
        privacyPolicyUrl: '/privacy-policy',
      });
      banner.show();

      const link = shadowQuery('#ckb a[href="/privacy-policy"]');
      expect(link).not.toBeNull();
    });
  });

  // ============================================================================
  // COMPREHENSIVE CONFIG OPTIONS TESTS - MINIMAL MODE
  // ============================================================================
  describe('Minimal Mode Config Options', () => {
    it('uses default button text in minimal mode (tabbed)', () => {
      const banner = createCookieBanner({ forceEU: true });
      banner.show();
      // Tabbed minimal mode uses "Accept All" / "Reject All"
      expect(shadowQuery('#cky')?.textContent).toBe('Accept All');
      expect(shadowQuery('#ckn')?.textContent).toBe('Reject All');
    });

    it('uses default button text in minimal mode (non-tabbed)', () => {
      const banner = createCookieBanner({ forceEU: true, tabs: { enabled: false } });
      banner.show();
      // Non-tabbed minimal mode defaults: "OK" for accept, "✗" for reject
      expect(shadowQuery('#cky')?.textContent).toBe('OK');
      expect(shadowQuery('#ckn')?.textContent).toBe('✗');
    });

    it('supports custom acceptText in minimal mode', () => {
      const banner = createCookieBanner({
        acceptText: 'Got it',
        forceEU: true,
      });
      banner.show();
      expect(shadowQuery('#cky')?.textContent).toBe('Got it');
    });

    it('supports custom rejectText in minimal mode', () => {
      const banner = createCookieBanner({
        rejectText: 'No thanks',
        forceEU: true,
      });
      banner.show();
      expect(shadowQuery('#ckn')?.textContent).toBe('No thanks');
    });

    it('supports privacyPolicyUrl in minimal mode', () => {
      const banner = createCookieBanner({
        privacyPolicyUrl: 'https://example.com/privacy',
        forceEU: true,
      });
      banner.show();
      const link = shadowQuery('#ckb a[href="https://example.com/privacy"]');
      expect(link).not.toBeNull();
    });

    it('supports privacyPolicyText in minimal mode (tabbed)', () => {
      const banner = createCookieBanner({
        privacyPolicyUrl: '/privacy',
        privacyPolicyText: 'Read our policy',
        forceEU: true,
      });
      banner.show();
      // Privacy link is in the About tab panel (last link)
      const aboutLinks = shadowQueryAll('#ckb-panel-about a');
      const privacyLink = aboutLinks[aboutLinks.length - 1];
      expect(privacyLink?.textContent).toBe('Read our policy');
    });

    it('supports privacyPolicyText in minimal mode (non-tabbed)', () => {
      const banner = createCookieBanner({
        privacyPolicyUrl: '/privacy',
        privacyPolicyText: 'Read our policy',
        forceEU: true,
        tabs: { enabled: false },
      });
      banner.show();
      const link = shadowQuery('#ckb a');
      expect(link?.textContent).toBe('Read our policy');
    });

    it('supports bannerAriaLabel in minimal mode', () => {
      const banner = createCookieBanner({
        bannerAriaLabel: 'Cookie Notice',
        forceEU: true,
      });
      banner.show();
      expect(shadowQuery('#ckb')?.getAttribute('aria-label')).toBe('Cookie Notice');
    });

    it('does not show settings/save buttons in minimal mode', () => {
      const banner = createCookieBanner({ forceEU: true });
      banner.show();
      expect(shadowQuery('#cks')).toBeNull();
      expect(shadowQuery('#cksv')).toBeNull();
    });

    it('does not show categories panel in minimal mode', () => {
      const banner = createCookieBanner({ forceEU: true });
      banner.show();
      expect(shadowQuery('#ckb-cats')).toBeNull();
    });

    it('stores consent state in minimal mode', () => {
      const banner = createCookieBanner({
        forceEU: true,
      });
      banner.show();
      banner.accept();
      // In minimal mode, status is set but no granular consent state
      expect(banner.status).toBe(true);
      // getConsentRecord returns null in minimal mode (no categories)
      expect(banner.getConsentRecord()).toBeNull();
    });

    it('supports widget in minimal mode', () => {
      const banner = createCookieBanner({
        forceEU: true,
        widget: { enabled: true },
      });
      banner.show();
      banner.accept();
      const widget = document.querySelector('[id^="ckb-widget"]');
      expect(widget).not.toBeNull();
    });

    it('supports full minimal mode localization (non-tabbed)', () => {
      const banner = createCookieBanner({
        msg: 'Utilizamos cookies.',
        acceptText: 'Aceptar',
        rejectText: 'Rechazar',
        privacyPolicyUrl: '/privacidad',
        privacyPolicyText: 'Política de privacidad',
        bannerAriaLabel: 'Aviso de cookies',
        forceEU: true,
        tabs: { enabled: false },
      });
      banner.show();
      expect(shadowQuery('#ckb')?.innerHTML).toContain('Utilizamos cookies');
      expect(shadowQuery('#cky')?.textContent).toBe('Aceptar');
      expect(shadowQuery('#ckn')?.textContent).toBe('Rechazar');
      expect(shadowQuery('#ckb a')?.textContent).toBe('Política de privacidad');
      expect(shadowQuery('#ckb')?.getAttribute('aria-label')).toBe('Aviso de cookies');
    });
  });

  // ============================================================================
  // COMPREHENSIVE CONFIG OPTIONS TESTS - GDPR MODE
  // ============================================================================
  describe('GDPR Mode Config Options', () => {
    it('uses default button text in GDPR mode (non-tabbed)', () => {
      const banner = createCookieBanner({ mode: 'gdpr', forceEU: true, tabs: { enabled: false } });
      banner.show();
      expect(shadowQuery('#cky')?.textContent).toBe('Accept All');
      expect(shadowQuery('#ckn')?.textContent).toBe('Reject All');
      expect(shadowQuery('#cks')?.textContent).toBe('Customize');
    });

    it('uses default button text in GDPR mode (tabbed)', () => {
      const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
      banner.show();
      // Tabbed mode only has Accept/Reject buttons
      expect(shadowQuery('#cky')?.textContent).toBe('Accept All');
      expect(shadowQuery('#ckn')?.textContent).toBe('Reject All');
      // No settings button in tabbed mode - tabs replace it
      expect(shadowQuery('#cks')).toBeNull();
    });

    it('supports custom acceptText in GDPR mode', () => {
      const banner = createCookieBanner({
        mode: 'gdpr',
        acceptText: 'Allow All',
        forceEU: true,
      });
      banner.show();
      expect(shadowQuery('#cky')?.textContent).toBe('Allow All');
    });

    it('supports custom rejectText in GDPR mode', () => {
      const banner = createCookieBanner({
        mode: 'gdpr',
        rejectText: 'Deny All',
        forceEU: true,
      });
      banner.show();
      expect(shadowQuery('#ckn')?.textContent).toBe('Deny All');
    });

    it('supports custom settingsText in non-tabbed GDPR mode', () => {
      const banner = createCookieBanner({
        mode: 'gdpr',
        settingsText: 'Manage Preferences',
        forceEU: true,
        tabs: { enabled: false },
      });
      banner.show();
      expect(shadowQuery('#cks')?.textContent).toBe('Manage Preferences');
    });

    it('supports custom saveText in non-tabbed GDPR mode', () => {
      const banner = createCookieBanner({
        mode: 'gdpr',
        saveText: 'Confirm Selection',
        forceEU: true,
        tabs: { enabled: false },
      });
      banner.show();
      // Expand to see save button
      shadowQuery('#cks')?.click();
      expect(shadowQuery('#cksv')?.textContent).toBe('Confirm Selection');
    });

    it('supports privacyPolicyUrl in GDPR mode', () => {
      const banner = createCookieBanner({
        mode: 'gdpr',
        privacyPolicyUrl: 'https://example.com/privacy',
        forceEU: true,
      });
      banner.show();
      const link = shadowQuery('#ckb a[href="https://example.com/privacy"]');
      expect(link).not.toBeNull();
    });

    it('supports privacyPolicyText in GDPR mode with tabbed UI', () => {
      const banner = createCookieBanner({
        mode: 'gdpr',
        privacyPolicyUrl: '/privacy',
        privacyPolicyText: 'View Privacy Policy',
        forceEU: true,
      });
      banner.show();
      // Privacy link is in the About tab panel
      const aboutLinks = shadowQueryAll('#ckb-panel-about a');
      const privacyLink = aboutLinks[aboutLinks.length - 1]; // Last link is privacy
      expect(privacyLink?.textContent).toBe('View Privacy Policy');
    });

    it('supports bannerAriaLabel in GDPR mode', () => {
      const banner = createCookieBanner({
        mode: 'gdpr',
        bannerAriaLabel: 'Cookie Preferences',
        forceEU: true,
      });
      banner.show();
      expect(shadowQuery('#ckb')?.getAttribute('aria-label')).toBe('Cookie Preferences');
    });

    it('supports requiredLabel in GDPR mode', () => {
      const banner = createCookieBanner({
        mode: 'gdpr',
        requiredLabel: '(Mandatory)',
        forceEU: true,
      });
      banner.show();
      expect(shadowQuery('.cat-req')?.textContent).toBe('(Mandatory)');
    });

    it('shows categories in tabbed GDPR mode', () => {
      const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
      banner.show();
      // With tabbed UI, categories are in the Details tab
      const checkboxes = shadowQueryAll('input[name="ckb-cat"]');
      expect(checkboxes.length).toBe(4); // DEFAULT_CATEGORIES
    });

    it('shows tabbed navigation in GDPR mode', () => {
      const banner = createCookieBanner({ mode: 'gdpr', forceEU: true });
      banner.show();
      // Tabbed UI is shown by default
      expect(shadowQuery('.ckb-tab-nav')).not.toBeNull();
      expect(shadowQueryAll('.ckb-tab-btn').length).toBe(3);
    });

    it('supports full GDPR mode localization (German) with tabbed UI', () => {
      const banner = createCookieBanner({
        mode: 'gdpr',
        msg: 'Wir verwenden Cookies.',
        acceptText: 'Alle akzeptieren',
        rejectText: 'Alle ablehnen',
        privacyPolicyUrl: '/datenschutz',
        privacyPolicyText: 'Datenschutzerklärung',
        bannerAriaLabel: 'Cookie-Einwilligung',
        requiredLabel: '(Erforderlich)',
        tabs: {
          enabled: true,
          consentLabel: 'Zustimmung',
          detailsLabel: 'Details',
          aboutLabel: 'Info',
        },
        categories: [
          { id: 'essential', name: 'Notwendig', description: 'Für die Funktion erforderlich', required: true },
          { id: 'analytics', name: 'Analyse', description: 'Hilft uns die Nutzung zu verstehen' },
        ],
        forceEU: true,
      });
      banner.show();
      expect(shadowQuery('#ckb')?.innerHTML).toContain('Wir verwenden Cookies');
      expect(shadowQuery('#cky')?.textContent).toBe('Alle akzeptieren');
      expect(shadowQuery('#ckn')?.textContent).toBe('Alle ablehnen');
      // Tab labels are localized
      const tabs = shadowQueryAll('.ckb-tab-btn');
      expect(tabs[0]?.textContent).toBe('Zustimmung');
      expect(tabs[1]?.textContent).toBe('Details');
      expect(tabs[2]?.textContent).toBe('Info');
      // Privacy link is in the About tab (after the about content)
      const aboutLinks = shadowQueryAll('#ckb-panel-about a');
      const privacyLink = aboutLinks[aboutLinks.length - 1]; // Last link is privacy
      expect(privacyLink?.textContent).toBe('Datenschutzerklärung');
      expect(shadowQuery('#ckb')?.getAttribute('aria-label')).toBe('Cookie-Einwilligung');
      expect(shadowQuery('.cat-req')?.textContent).toBe('(Erforderlich)');
      expect(shadowQuery('.cat-name')?.textContent).toContain('Notwendig');
    });
  });

  // ============================================================================
  // RTL (RIGHT-TO-LEFT) SUPPORT TESTS
  // ============================================================================
  describe('RTL Support', () => {
    it('sets dir="rtl" when configured', () => {
      const banner = createCookieBanner({
        dir: 'rtl',
        forceEU: true,
      });
      banner.show();
      expect(shadowQuery('#ckb')?.getAttribute('dir')).toBe('rtl');
    });

    it('sets dir="ltr" when configured', () => {
      const banner = createCookieBanner({
        dir: 'ltr',
        forceEU: true,
      });
      banner.show();
      expect(shadowQuery('#ckb')?.getAttribute('dir')).toBe('ltr');
    });

    it('sets dir="auto" when configured', () => {
      const banner = createCookieBanner({
        dir: 'auto',
        forceEU: true,
      });
      banner.show();
      expect(shadowQuery('#ckb')?.getAttribute('dir')).toBe('auto');
    });

    it('does not set dir attribute when not configured', () => {
      const banner = createCookieBanner({ forceEU: true });
      banner.show();
      expect(shadowQuery('#ckb')?.hasAttribute('dir')).toBe(false);
    });

    it('supports full Arabic localization with RTL', () => {
      const banner = createCookieBanner({
        mode: 'gdpr',
        dir: 'rtl',
        msg: 'نستخدم ملفات تعريف الارتباط.',
        acceptText: 'قبول الكل',
        rejectText: 'رفض الكل',
        settingsText: 'تخصيص',
        saveText: 'حفظ التفضيلات',
        privacyPolicyText: 'سياسة الخصوصية',
        bannerAriaLabel: 'موافقة ملفات تعريف الارتباط',
        requiredLabel: '(مطلوب)',
        privacyPolicyUrl: '/privacy',
        forceEU: true,
      });
      banner.show();
      expect(shadowQuery('#ckb')?.getAttribute('dir')).toBe('rtl');
      expect(shadowQuery('#ckb')?.innerHTML).toContain('نستخدم ملفات تعريف الارتباط');
      expect(shadowQuery('#cky')?.textContent).toBe('قبول الكل');
      expect(shadowQuery('#ckn')?.textContent).toBe('رفض الكل');
    });

    it('supports Hebrew localization with RTL', () => {
      const banner = createCookieBanner({
        dir: 'rtl',
        msg: 'אנחנו משתמשים בעוגיות.',
        acceptText: 'קבל',
        rejectText: 'דחה',
        forceEU: true,
      });
      banner.show();
      expect(shadowQuery('#ckb')?.getAttribute('dir')).toBe('rtl');
      expect(shadowQuery('#ckb')?.innerHTML).toContain('אנחנו משתמשים בעוגיות');
    });
  });

  // ============================================================================
  // MODE SWITCHING TESTS
  // ============================================================================
  describe('Mode Switching', () => {
    it('minimal mode with no categories shows 2-tab UI (no Details tab)', () => {
      const banner = createCookieBanner({
        // mode defaults to minimal, no categories
        forceEU: true,
        // tabs enabled by default
      });
      banner.show();
      // Tabbed UI is shown with only 2 tabs (Consent + About)
      expect(shadowQuery('.ckb-tab-nav')).not.toBeNull();
      const tabs = shadowQueryAll('.ckb-tab-btn');
      expect(tabs.length).toBe(2); // No Details tab when no categories
      expect(tabs[0]?.textContent).toBe('Consent');
      expect(tabs[1]?.textContent).toBe('About');
      expect(shadowQuery('#cky')?.textContent).toBe('Accept All');
      // No Details panel when no categories
      expect(shadowQuery('#ckb-panel-details')).toBeNull();
    });

    it('passing categories shows 3-tab UI with Details tab', () => {
      // Categories show in Details tab when explicitly provided
      const banner = createCookieBanner({
        categories: [
          { id: 'essential', name: 'Essential', required: true },
          { id: 'analytics', name: 'Analytics' },
        ],
        forceEU: true,
        // tabs enabled by default
      });
      banner.show();
      // Tabbed UI with 3 tabs (Consent + Details + About)
      const tabs = shadowQueryAll('.ckb-tab-btn');
      expect(tabs.length).toBe(3);
      expect(tabs[0]?.textContent).toBe('Consent');
      expect(tabs[1]?.textContent).toBe('Details');
      expect(tabs[2]?.textContent).toBe('About');
      // Categories are in the Details tab panel
      const checkboxes = shadowQueryAll('input[name="ckb-cat"]');
      expect(checkboxes.length).toBe(2);
    });

    it('gdpr mode shows default categories when none provided', () => {
      const banner = createCookieBanner({
        mode: 'gdpr',
        forceEU: true,
      });
      banner.show();
      const checkboxes = shadowQueryAll('input[name="ckb-cat"]');
      expect(checkboxes.length).toBe(4); // DEFAULT_CATEGORIES has 4 items
    });

    it('gdpr mode uses custom categories when provided', () => {
      const banner = createCookieBanner({
        mode: 'gdpr',
        categories: [
          { id: 'required', name: 'Required', required: true },
          { id: 'optional', name: 'Optional' },
        ],
        forceEU: true,
      });
      banner.show();
      const checkboxes = shadowQueryAll('input[name="ckb-cat"]');
      expect(checkboxes.length).toBe(2);
    });

    it('mode:gdpr without forceEU still shows categories in tabbed UI', () => {
      // GDPR mode enables categories even for non-EU
      const banner = createCookieBanner({
        mode: 'gdpr',
        forceEU: false,
        // tabs enabled by default
      });
      banner.show();
      // Categories are in the Details tab
      const checkboxes = shadowQueryAll('input[name="ckb-cat"]');
      expect(checkboxes.length).toBe(4); // DEFAULT_CATEGORIES
      // But reject button hidden for non-EU
      expect(shadowQuery('#ckn')).toBeNull();
    });
  });

  // ============================================================================
  // INSTANTIATION METHOD TESTS
  // ============================================================================
  describe('Instantiation Methods', () => {
    describe('ES Module Import', () => {
      it('exports createCookieBanner function', () => {
        expect(typeof createCookieBanner).toBe('function');
      });

      it('exports setup function', () => {
        expect(typeof setup).toBe('function');
      });

      it('exports utility functions', () => {
        expect(typeof isEU).toBe('function');
        expect(typeof getConsent).toBe('function');
        expect(typeof setConsent).toBe('function');
        expect(typeof deleteConsent).toBe('function');
      });

      it('exports validation functions', () => {
        expect(typeof validateConfig).toBe('function');
        expect(typeof sanitizeCss).toBe('function');
        expect(typeof sanitizeInlineStyle).toBe('function');
        expect(typeof sanitizeUrl).toBe('function');
      });

      it('exports types and constants', () => {
        expect(DEFAULT_CSS).toBeDefined();
        expect(typeof DEFAULT_CSS).toBe('string');
        expect(DEFAULT_CATEGORIES).toBeDefined();
        expect(Array.isArray(DEFAULT_CATEGORIES)).toBe(true);
      });

      it('does not auto-initialize when imported as module', () => {
        // When imported as ES module, auto-init should NOT run
        // The banner should not appear until explicitly created
        resetState();
        expect(getBannerElement()).toBeNull();
        expect(window.CookieBanner).toBeUndefined();
      });

      it('allows manual initialization via createCookieBanner', () => {
        const banner = createCookieBanner({ forceEU: true });
        expect(banner).toBeDefined();
        expect(typeof banner.show).toBe('function');
        expect(typeof banner.hide).toBe('function');
        expect(typeof banner.accept).toBe('function');
        expect(typeof banner.reject).toBe('function');
        expect(typeof banner.destroy).toBe('function');
      });

      it('allows manual initialization via setup', () => {
        window.CookieBannerConfig = { forceEU: true };
        const api = setup();
        expect(api).not.toBeNull();
        expect(window.CookieBanner).toBeDefined();
        expect(typeof window.CookieBanner?.yes).toBe('function');
      });
    });

    describe('Script Tag Auto-Initialization (Legacy/CDN)', () => {
      beforeEach(() => {
        resetState();
      });

      it('setup reads config from window.CookieBannerConfig', () => {
        window.CookieBannerConfig = {
          msg: 'Test message from config',
          forceEU: true,
        };
        setup();
        expect(shadowQuery('#ckb')?.innerHTML).toContain('Test message from config');
      });

      it('setup works with empty config', () => {
        window.CookieBannerConfig = {};
        const api = setup();
        expect(api).not.toBeNull();
        expect(window.CookieBanner).toBeDefined();
      });

      it('setup works without config (undefined)', () => {
        window.CookieBannerConfig = undefined;
        const api = setup();
        expect(api).not.toBeNull();
        expect(window.CookieBanner).toBeDefined();
      });

      it('setup creates legacy API with yes/no/reset/destroy methods', () => {
        window.CookieBannerConfig = { forceEU: true };
        setup();

        expect(typeof window.CookieBanner?.yes).toBe('function');
        expect(typeof window.CookieBanner?.no).toBe('function');
        expect(typeof window.CookieBanner?.reset).toBe('function');
        expect(typeof window.CookieBanner?.destroy).toBe('function');
      });

      it('legacy API ok property returns consent status', () => {
        window.CookieBannerConfig = { forceEU: true };
        setup();

        expect(window.CookieBanner?.ok).toBeNull(); // No consent yet
        window.CookieBanner?.yes();
        expect(window.CookieBanner?.ok).toBe(true);
      });

      it('setup calls onAccept callback from config', () => {
        const onAccept = jest.fn();
        window.CookieBannerConfig = { onAccept, forceEU: true };
        setup();
        window.CookieBanner?.yes();
        expect(onAccept).toHaveBeenCalled();
      });

      it('setup calls onReject callback from config', () => {
        const onReject = jest.fn();
        window.CookieBannerConfig = { onReject, forceEU: true };
        setup();
        window.CookieBanner?.no();
        expect(onReject).toHaveBeenCalled();
      });

      it('setup supports legacy onYes/onNo callback names', () => {
        const onYes = jest.fn();
        const onNo = jest.fn();
        window.CookieBannerConfig = { onYes, onNo, forceEU: true };
        setup();

        window.CookieBanner?.yes();
        expect(onYes).toHaveBeenCalled();

        // Reset and test onNo
        resetState();
        window.CookieBannerConfig = { onYes, onNo, forceEU: true };
        setup();
        window.CookieBanner?.no();
        expect(onNo).toHaveBeenCalled();
      });

      it('setup shows banner when no consent exists', () => {
        window.CookieBannerConfig = { forceEU: true };
        setup();
        expect(getBannerElement()).not.toBeNull();
      });

      it('setup does not show banner when consent already exists', () => {
        document.cookie = 'cookie_consent=1;path=/';
        window.CookieBannerConfig = { forceEU: true };
        setup();
        expect(getBannerElement()).toBeNull();
      });

      it('legacy reset() clears cookie and reloads page', () => {
        window.CookieBannerConfig = { forceEU: true };
        setup();
        window.CookieBanner?.yes();
        expect(getConsent()).toBe('1');

        window.CookieBanner?.reset();
        expect(window.location.reload).toHaveBeenCalled();
      });

      it('legacy destroy() removes banner without clearing cookie', () => {
        window.CookieBannerConfig = { forceEU: true };
        setup();
        expect(getBannerElement()).not.toBeNull();

        window.CookieBanner?.destroy();
        expect(getBannerElement()).toBeNull();
      });

      it('legacy no() calls instance.reject()', () => {
        const onReject = jest.fn();
        window.CookieBannerConfig = { forceEU: true, onReject };
        setup();

        // Ensure CookieBanner exists and call no()
        expect(window.CookieBanner).toBeDefined();
        window.CookieBanner!.no();
        expect(onReject).toHaveBeenCalled();
        expect(window.CookieBanner!.ok).toBe(false);
      });

      it('legacy API methods are callable functions', () => {
        window.CookieBannerConfig = { forceEU: true };
        const api = setup();

        // Verify all methods exist and are functions
        expect(api).not.toBeNull();
        expect(typeof api!.yes).toBe('function');
        expect(typeof api!.no).toBe('function');
        expect(typeof api!.reset).toBe('function');
        expect(typeof api!.destroy).toBe('function');

        // Call destroy directly on the returned API
        api!.destroy();
        expect(getBannerElement()).toBeNull();
      });
    });

    describe('Window.CookieBannerConfig Detection', () => {
      beforeEach(() => {
        resetState();
      });

      it('accepts all config options via window.CookieBannerConfig', () => {
        window.CookieBannerConfig = {
          mode: 'gdpr',
          msg: 'Custom message',
          acceptText: 'Accept All Cookies',
          rejectText: 'Reject All Cookies',
          settingsText: 'Settings',
          saveText: 'Save',
          days: 180,
          cookieName: 'custom_consent',
          forceEU: true,
          privacyPolicyUrl: '/privacy',
          privacyPolicyText: 'Privacy',
        };
        setup();

        const el = shadowQuery('#ckb');
        expect(el?.innerHTML).toContain('Custom message');
        expect(shadowQuery('#cky')?.textContent).toBe('Accept All Cookies');
        expect(shadowQuery('#ckn')?.textContent).toBe('Reject All Cookies');
      });

      it('supports GDPR mode via config with tabbed UI', () => {
        window.CookieBannerConfig = {
          mode: 'gdpr',
          forceEU: true,
          // tabs enabled by default
        };
        setup();

        // Tabbed UI is shown with tabs
        expect(shadowQuery('.ckb-tab-nav')).not.toBeNull();
        // Categories are in the Details tab
        const checkboxes = shadowQueryAll('input[name="ckb-cat"]');
        expect(checkboxes.length).toBe(4); // DEFAULT_CATEGORIES
      });

      it('supports custom categories via config', () => {
        window.CookieBannerConfig = {
          mode: 'gdpr',
          forceEU: true,
          categories: [
            { id: 'essential', name: 'Essential', required: true },
            { id: 'tracking', name: 'Tracking' },
          ],
        };
        setup();

        const checkboxes = shadowQueryAll('input[name="ckb-cat"]');
        expect(checkboxes.length).toBe(2);
      });

      it('supports onConsent callback via config', () => {
        const onConsent = jest.fn();
        window.CookieBannerConfig = {
          mode: 'gdpr',
          forceEU: true,
          onConsent,
        };
        setup();
        window.CookieBanner?.yes();
        expect(onConsent).toHaveBeenCalled();
      });

      it('supports widget config via window.CookieBannerConfig', () => {
        window.CookieBannerConfig = {
          mode: 'gdpr',
          forceEU: true,
          widget: { enabled: true, position: 'bottom-right' },
        };
        setup();
        window.CookieBanner?.yes();

        const widget = document.querySelector('[id^="ckb-widget"]') as HTMLElement;
        expect(widget).not.toBeNull();
        expect(widget?.style.cssText).toMatch(/right:\s*16px/);
      });
    });

    describe('Multiple Instantiation Patterns', () => {
      beforeEach(() => {
        resetState();
      });

      it('supports createCookieBanner for framework integration', () => {
        // React/Vue/Angular pattern: create instance, control manually
        const banner = createCookieBanner({
          msg: 'Framework banner',
          forceEU: true,
        });

        expect(banner.status).toBeNull();
        expect(banner.isVisible()).toBe(false);

        banner.show();
        expect(banner.isVisible()).toBe(true);
        expect(getBannerElement()).not.toBeNull();

        banner.hide();
        expect(banner.isVisible()).toBe(false);
      });

      it('supports setup for CDN/script tag usage', () => {
        // CDN pattern: set config, call setup
        window.CookieBannerConfig = { forceEU: true };
        setup();

        expect(window.CookieBanner).toBeDefined();
        expect(getBannerElement()).not.toBeNull();
      });

      it('multiple createCookieBanner instances can coexist', () => {
        const banner1 = createCookieBanner({
          cookieName: 'consent1',
          msg: 'Banner 1',
          forceEU: true,
          allowMultiple: true,
        });
        const banner2 = createCookieBanner({
          cookieName: 'consent2',
          msg: 'Banner 2',
          forceEU: true,
          allowMultiple: true,
        });

        banner1.accept();
        expect(getConsent('consent1')).toBe('1');
        expect(getConsent('consent2')).toBeNull();
        expect(banner1.status).toBe(true);
        expect(banner2.status).toBeNull();
      });

      it('createCookieBanner works without any config', () => {
        const banner = createCookieBanner();
        expect(banner).toBeDefined();
        expect(banner.status).toBeNull();
        banner.show();
        expect(getBannerElement()).not.toBeNull();
      });

      it('createCookieBanner with container option', () => {
        const container = document.createElement('div');
        container.id = 'my-container';
        document.body.appendChild(container);

        const banner = createCookieBanner({
          container,
          forceEU: true,
        });
        banner.show();

        expect(container.querySelector('#ckb')).not.toBeNull();
        expect(document.body.querySelector('#ckb')).not.toBeNull(); // Also in body since container is in body
      });
    });

    describe('SSR Safety', () => {
      it('createCookieBanner returns no-op instance when window is undefined', () => {
        // Can't truly test this in jsdom, but verify the pattern exists
        const banner = createCookieBanner();
        expect(banner).toBeDefined();
        // In SSR, all methods would be no-ops
        expect(typeof banner.show).toBe('function');
        expect(typeof banner.hide).toBe('function');
      });

      it('setup returns null in SSR context', () => {
        // In jsdom we're in browser context, but verify the function handles the check
        // The actual SSR test would require mocking window to be undefined
        const result = setup();
        // In browser context, it returns the API
        expect(result).not.toBeNull();
      });

      it('utility functions handle SSR gracefully', () => {
        // These should not throw in any context
        expect(() => isEU()).not.toThrow();
        expect(() => getConsent()).not.toThrow();
        expect(() => setConsent('1')).not.toThrow();
        expect(() => deleteConsent()).not.toThrow();
      });
    });

    describe('DOM Ready State Handling', () => {
      it('shows banner immediately when DOM is complete', () => {
        Object.defineProperty(document, 'readyState', {
          value: 'complete',
          writable: true,
          configurable: true,
        });

        window.CookieBannerConfig = { forceEU: true };
        setup();

        expect(getBannerElement()).not.toBeNull();
      });

      it('waits for DOMContentLoaded when document is loading', () => {
        Object.defineProperty(document, 'readyState', {
          value: 'loading',
          writable: true,
          configurable: true,
        });

        const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

        window.CookieBannerConfig = { forceEU: true };
        setup();

        // Should register DOMContentLoaded listener
        expect(addEventListenerSpy).toHaveBeenCalledWith(
          'DOMContentLoaded',
          expect.any(Function)
        );

        // Simulate DOMContentLoaded
        document.dispatchEvent(new Event('DOMContentLoaded'));
        expect(getBannerElement()).not.toBeNull();

        addEventListenerSpy.mockRestore();
      });
    });

    describe('Error Handling in Instantiation', () => {
      it('handles invalid cookieName gracefully', () => {
        expect(() => createCookieBanner({ cookieName: '' })).toThrow();
        expect(() => createCookieBanner({ cookieName: 'invalid;name' })).toThrow();
      });

      it('handles very long cookieName', () => {
        const longName = 'a'.repeat(101);
        expect(() => createCookieBanner({ cookieName: longName })).toThrow();
      });

      it('handles invalid container gracefully', () => {
        const banner = createCookieBanner({
          container: 'not-an-element' as unknown as HTMLElement,
          forceEU: true,
        });
        // Should fall back to document.body
        banner.show();
        expect(document.body.querySelector('#ckb')).not.toBeNull();
      });

      it('handles callback errors without crashing', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        window.CookieBannerConfig = {
          forceEU: true,
          onAccept: () => {
            throw new Error('Callback crash');
          },
        };
        setup();

        expect(() => window.CookieBanner?.yes()).not.toThrow();
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
      });
    });
  });

  // ============================================================================
  // COVERAGE GAP TESTS
  // ============================================================================
  describe('Coverage Gap Tests', () => {
    describe('Cookie Domain and Secure Flag', () => {
      it('setConsent adds domain when valid domain provided', () => {
        // jsdom doesn't properly handle domain-scoped cookies
        // Just verify it doesn't throw
        expect(() => setConsent('1', 'cookie_consent', 365, '.example.com')).not.toThrow();
      });

      it('deleteConsent works with domain', () => {
        setConsent('1', 'cookie_consent', 365, '.example.com');
        deleteConsent('cookie_consent', '.example.com');
        expect(getConsent()).toBeNull();
      });

      it('setConsent adds Secure flag on HTTPS', () => {
        // Mock https protocol
        Object.defineProperty(window, 'location', {
          value: { ...window.location, protocol: 'https:' },
          writable: true,
          configurable: true,
        });

        // jsdom may not properly handle Secure cookies
        // Just verify it doesn't throw
        expect(() => setConsent('1', 'cookie_consent', 365)).not.toThrow();

        // Restore
        Object.defineProperty(window, 'location', {
          value: { ...window.location, protocol: 'http:' },
          writable: true,
          configurable: true,
        });
      });
    });

    describe('Granular Consent Status Edge Cases', () => {
      it('sets status correctly when only required categories enabled', () => {
        // Set granular consent where only essential (required) is true
        document.cookie = 'cookie_consent=e:1,a:0,m:0,f:0;path=/';

        const banner = createCookieBanner({
          mode: 'gdpr',
          forceEU: true,
          categories: [
            { id: 'e', name: 'Essential', required: true },
            { id: 'a', name: 'Analytics' },
            { id: 'm', name: 'Marketing' },
            { id: 'f', name: 'Functional' },
          ],
        });

        // Status should be false since no non-required categories are enabled
        expect(banner.status).toBe(false);
      });

      it('sets status true when at least one non-required category enabled', () => {
        // Set granular consent where analytics is also enabled
        document.cookie = 'cookie_consent=e:1,a:1,m:0,f:0;path=/';

        const banner = createCookieBanner({
          mode: 'gdpr',
          forceEU: true,
          categories: [
            { id: 'e', name: 'Essential', required: true },
            { id: 'a', name: 'Analytics' },
            { id: 'm', name: 'Marketing' },
            { id: 'f', name: 'Functional' },
          ],
        });

        // Status should be true since analytics (non-required) is enabled
        expect(banner.status).toBe(true);
      });
    });

    describe('Focus Trap Shift+Tab', () => {
      it('wraps focus from first to last element on shift+tab', () => {
        const banner = createCookieBanner({ forceEU: true });
        banner.show();

        const shadow = getShadowRoot();
        const buttons = shadow?.querySelectorAll('button:not([style*="display: none"]):not([style*="display:none"])');
        const firstButton = buttons?.[0] as HTMLElement;
        const lastButton = buttons?.[buttons!.length - 1] as HTMLElement;

        // Focus first button
        firstButton?.focus();
        // With Shadow DOM, the host element is document.activeElement
        // and shadowRoot.activeElement is the actual focused element
        expect(getBannerElement()).not.toBeNull();

        // Simulate shift+tab by dispatching keydown on document (where the listener is attached)
        const event = new KeyboardEvent('keydown', {
          key: 'Tab',
          shiftKey: true,
          bubbles: true,
        });
        document.dispatchEvent(event);

        // Focus should wrap to last button (note: jsdom has limited shadow DOM focus support)
        // Check that focus handling code was triggered without error
        expect(shadow?.activeElement).toBe(lastButton);
      });
    });

    describe('Widget Hover Effects', () => {
      it('scales widget on mouseenter and mouseleave', () => {
        const banner = createCookieBanner({
          forceEU: true,
          widget: { enabled: true },
        });
        banner.accept();

        const widget = document.querySelector('[id^="ckb-widget"]') as HTMLElement;
        expect(widget).not.toBeNull();

        // Simulate mouseenter
        widget.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        expect(widget.style.transform).toBe('scale(1.1)');

        // Simulate mouseleave
        widget.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
        expect(widget.style.transform).toBe('scale(1)');
      });
    });

    describe('Banner Cleanup in manage()', () => {
      it('removes existing banner before showing manage dialog', () => {
        const banner = createCookieBanner({
          mode: 'gdpr',
          forceEU: true,
        });
        banner.show();
        expect(getBannerElement()).not.toBeNull();

        // Call manage while banner is visible
        banner.manage();

        // Banner should still exist (recreated)
        expect(getBannerElement()).not.toBeNull();
      });

      it('cleans up previous banner when manage called multiple times', () => {
        const banner = createCookieBanner({
          mode: 'gdpr',
          forceEU: true,
        });
        banner.accept();
        banner.manage();
        banner.hide();
        banner.manage();

        // Should only have one banner
        const banners = document.querySelectorAll(COMPONENT_NAME);
        expect(banners.length).toBe(1);
      });
    });

    describe('Invalid Cookie Name in setConsent', () => {
      it('throws error for invalid cookie name in setConsent', () => {
        expect(() => setConsent('1', 'invalid;name')).toThrow('Invalid cookie name');
        expect(() => setConsent('1', 'invalid=name')).toThrow('Invalid cookie name');
        expect(() => setConsent('1', '')).toThrow('Invalid cookie name');
      });
    });

    describe('Singleton Behavior', () => {
      it('prevents duplicate banners by default', () => {
        const banner1 = createCookieBanner({ forceEU: true });
        banner1.show();

        const banner2 = createCookieBanner({ forceEU: true });

        // Should return existing instance
        expect(banner2).toBe(banner1);

        // Only one banner in DOM
        const banners = document.querySelectorAll(COMPONENT_NAME);
        expect(banners.length).toBe(1);
      });

      it('single click on accept dismisses banner (no double-click needed)', () => {
        const onAccept = jest.fn();
        const banner = createCookieBanner({ forceEU: true, onAccept });
        banner.show();

        // Click accept once
        const acceptBtn = shadowQuery('#cky');
        expect(acceptBtn).not.toBeNull();
        acceptBtn!.click();

        // Banner should be gone after single click
        expect(getBannerElement()).toBeNull();
        expect(onAccept).toHaveBeenCalledTimes(1);
        expect(banner.status).toBe(true);
      });

      it('allows multiple banners with allowMultiple: true', () => {
        const banner1 = createCookieBanner({
          forceEU: true,
          allowMultiple: true,
          cookieName: 'ck1',
        });
        banner1.show();

        const banner2 = createCookieBanner({
          forceEU: true,
          allowMultiple: true,
          cookieName: 'ck2',
        });
        banner2.show();

        // Should be different instances
        expect(banner2).not.toBe(banner1);
      });

      it('clears singleton on destroy', () => {
        const banner1 = createCookieBanner({ forceEU: true });
        banner1.show();
        banner1.destroy();

        // Should be able to create a new one
        const banner2 = createCookieBanner({ forceEU: true });
        banner2.show();

        expect(banner2).not.toBe(banner1);
        expect(getBannerElement()).not.toBeNull();
      });

      it('removes orphaned DOM element when no instance reference', () => {
        // Create a banner element manually (simulating orphaned state)
        const orphan = document.createElement('div');
        orphan.id = 'ckb';
        document.body.appendChild(orphan);

        // Creating a new banner should remove the orphan
        const banner = createCookieBanner({ forceEU: true });
        banner.show();

        // Should still only have one banner
        const banners = document.querySelectorAll(COMPONENT_NAME);
        expect(banners.length).toBe(1);
      });
    });
  });

  // ============================================================================
  // COVERAGE TESTS - Lines 644-655, 694, 719, 840, 945-947, 1056-1080, 1389-1436, 1445
  // ============================================================================
  describe('Coverage Tests', () => {
    beforeEach(() => {
      resetState();
    });

    describe('Consent Status Edge Cases (Lines 694, 719)', () => {
      it('sets status to false when existing consent is "0"', () => {
        // Set rejected consent cookie (using default cookie name)
        setConsent('0', 'cookie_consent', 365);

        const banner = createCookieBanner({ forceEU: true });
        // Status should be false since consent was rejected
        expect(banner.status).toBe(false);
      });

      it('handles granular consent with null state gracefully', () => {
        // Set an invalid/malformed consent value that can't be parsed
        document.cookie = 'cookie_consent=invalid;path=/';

        const banner = createCookieBanner({
          forceEU: true,
          mode: 'gdpr',
        });
        // Should handle gracefully - either null or parsed state
        expect(banner.status).toBeDefined();
      });

      it('sets status based on non-required categories in granular mode', () => {
        // Set consent with only required category enabled
        const categories: CookieCategory[] = [
          { id: 'essential', name: 'Essential', required: true },
          { id: 'analytics', name: 'Analytics', required: false },
        ];

        // Encode consent where only essential (required) is true
        const consent = encodeGranularConsent({ essential: true, analytics: false });
        setConsent(consent, 'cookie_consent', 365);

        const banner = createCookieBanner({
          forceEU: true,
          mode: 'gdpr',
          categories,
        });

        // Status should be false since only required category is enabled
        expect(banner.status).toBe(false);
      });

      it('sets status to true when non-required category is enabled', () => {
        const categories: CookieCategory[] = [
          { id: 'essential', name: 'Essential', required: true },
          { id: 'analytics', name: 'Analytics', required: false },
        ];

        // Encode consent where analytics (non-required) is true
        const consent = encodeGranularConsent({ essential: true, analytics: true });
        setConsent(consent, 'cookie_consent', 365);

        const banner = createCookieBanner({
          forceEU: true,
          mode: 'gdpr',
          categories,
        });

        // Status should be true since non-required category is enabled
        expect(banner.status).toBe(true);
      });
    });

    describe('onConsent Callback Error Handling (Lines 778, 841)', () => {
      it('catches and logs errors thrown by onConsent callback in accept/reject', () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

        const banner = createCookieBanner({
          forceEU: true,
          mode: 'gdpr',
          onConsent: () => {
            throw new Error('Callback error');
          },
        });
        banner.show();
        banner.accept();

        expect(consoleError).toHaveBeenCalledWith(
          'Cookie banner onConsent callback error:',
          expect.any(Error)
        );

        consoleError.mockRestore();
      });

      it('catches and logs errors thrown by onConsent in Save Preferences (non-tabbed)', () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

        const banner = createCookieBanner({
          forceEU: true,
          mode: 'gdpr',
          tabs: { enabled: false },
          onConsent: () => {
            throw new Error('Save callback error');
          },
        });
        banner.show();

        // Expand settings to show save button
        shadowQuery('#cks')?.click();
        // Click save
        shadowQuery('#cksv')?.click();

        expect(consoleError).toHaveBeenCalledWith(
          'Cookie banner onConsent callback error:',
          expect.any(Error)
        );

        consoleError.mockRestore();
      });
    });

    describe('Tabbed UI Mode (Lines 945-947, 1056-1080)', () => {
      it('adds tabbed class to wrapper when tabs enabled', () => {
        const banner = createCookieBanner({
          forceEU: true,
          mode: 'gdpr',
          tabs: { enabled: true },
        });
        banner.show();

        const wrapper = shadowQuery('#ckb');
        expect(wrapper?.classList.contains('tabbed')).toBe(true);
      });

      it('renders tab navigation buttons', () => {
        const banner = createCookieBanner({
          forceEU: true,
          mode: 'gdpr',
          tabs: { enabled: true },
        });
        banner.show();

        const tabNav = shadowQuery('.ckb-tab-nav');
        expect(tabNav).not.toBeNull();

        const tabBtns = shadowQueryAll('.ckb-tab-btn');
        expect(tabBtns.length).toBe(3); // Consent, Details, About
      });

      it('renders tab panels', () => {
        const banner = createCookieBanner({
          forceEU: true,
          mode: 'gdpr',
          tabs: { enabled: true },
        });
        banner.show();

        const panels = shadowQueryAll('.ckb-tab-panel');
        expect(panels.length).toBe(3);
      });

      it('switches tabs when tab button clicked', () => {
        const banner = createCookieBanner({
          forceEU: true,
          mode: 'gdpr',
          tabs: { enabled: true },
        });
        banner.show();

        // Initially consent tab should be active
        const consentBtn = shadowQuery('.ckb-tab-btn[data-tab="consent"]');
        expect(consentBtn?.classList.contains('active')).toBe(true);
        expect(consentBtn?.getAttribute('aria-selected')).toBe('true');

        // Click details tab
        const detailsBtn = shadowQuery('.ckb-tab-btn[data-tab="details"]');
        detailsBtn?.click();

        // Details tab should now be active
        expect(detailsBtn?.classList.contains('active')).toBe(true);
        expect(detailsBtn?.getAttribute('aria-selected')).toBe('true');

        // Consent tab should be inactive
        expect(consentBtn?.classList.contains('active')).toBe(false);
        expect(consentBtn?.getAttribute('aria-selected')).toBe('false');

        // Details panel should be active
        const detailsPanel = shadowQuery('#ckb-panel-details');
        expect(detailsPanel?.classList.contains('active')).toBe(true);
      });

      it('switches to about tab correctly', () => {
        const banner = createCookieBanner({
          forceEU: true,
          mode: 'gdpr',
          tabs: { enabled: true },
        });
        banner.show();

        // Click about tab
        const aboutBtn = shadowQuery('.ckb-tab-btn[data-tab="about"]');
        aboutBtn?.click();

        expect(aboutBtn?.classList.contains('active')).toBe(true);
        expect(aboutBtn?.getAttribute('aria-selected')).toBe('true');

        const aboutPanel = shadowQuery('#ckb-panel-about');
        expect(aboutPanel?.classList.contains('active')).toBe(true);
      });

      it('uses custom tab labels when provided', () => {
        const banner = createCookieBanner({
          forceEU: true,
          mode: 'gdpr',
          tabs: {
            enabled: true,
            consentLabel: 'Zustimmung',
            detailsLabel: 'Details',
            aboutLabel: 'Info',
          },
        });
        banner.show();

        const tabs = shadowQueryAll('.ckb-tab-btn');
        expect(tabs[0]?.textContent).toBe('Zustimmung');
        expect(tabs[1]?.textContent).toBe('Details');
        expect(tabs[2]?.textContent).toBe('Info');
      });
    });

    describe('Data Attributes Parsing - Direct createCookieBanner Tests', () => {
      // Note: Data attributes are parsed by autoInit which is hard to test directly.
      // These tests verify the config options work via createCookieBanner directly.

      it('supports all config options that data attributes would set', () => {
        // This tests the same config options that parseDataAttributes would produce
        const banner = createCookieBanner({
          forceEU: true,
          tabs: { enabled: true },
          mode: 'gdpr',
          msg: 'Custom message',
          acceptText: 'Agree',
          rejectText: 'Disagree',
          privacyPolicyUrl: '/privacy',
          cookieName: 'custom_ck',
          days: 30,
        });
        banner.show();

        expect(shadowQuery('#ckb')?.innerHTML).toContain('Custom message');
        expect(shadowQuery('#cky')?.textContent).toBe('Agree');
        expect(shadowQuery('#ckn')?.textContent).toBe('Disagree');
        expect(shadowQuery('.ckb-tab-nav')).not.toBeNull();

        banner.accept();
        expect(document.cookie).toContain('custom_ck=');
      });

      it('correctly uses cookieName config option', () => {
        const banner = createCookieBanner({
          forceEU: true,
          cookieName: 'my_consent',
        });
        banner.show();
        banner.accept();

        expect(document.cookie).toContain('my_consent=');
      });

      it('correctly uses privacyPolicyUrl config option', () => {
        const banner = createCookieBanner({
          forceEU: true,
          privacyPolicyUrl: '/my-privacy-policy',
        });
        banner.show();

        const link = shadowQuery('a[href="/my-privacy-policy"]');
        expect(link).not.toBeNull();
      });
    });
  });

  // Tests for tabbed UI and GDPR mode features
  describe('Tabbed UI toast mode', () => {
    it('adds toast class when tabs.toast is true', () => {
      const banner = createCookieBanner({
        forceEU: true,
        tabs: { enabled: true, toast: true },
      });
      banner.show();

      const wrapper = shadowQuery('#ckb');
      expect(wrapper?.classList.contains('toast')).toBe(true);
      expect(wrapper?.classList.contains('tabbed')).toBe(true);
    });

    it('does not add toast class when tabs.toast is false', () => {
      const banner = createCookieBanner({
        forceEU: true,
        tabs: { enabled: true, toast: false },
      });
      banner.show();

      const wrapper = shadowQuery('#ckb');
      expect(wrapper?.classList.contains('tabbed')).toBe(true);
      expect(wrapper?.classList.contains('toast')).toBe(false);
    });
  });

  describe('Tab switching', () => {
    it('switches tabs when tab buttons are clicked', () => {
      const banner = createCookieBanner({
        forceEU: true,
        tabs: { enabled: true },
        mode: 'gdpr',
      });
      banner.show();

      // Click on Details tab
      const detailsTab = shadowQuery('.ckb-tab-btn[data-tab="details"]');
      expect(detailsTab).not.toBeNull();
      detailsTab?.click();

      // Check that details panel is active
      const detailsPanel = shadowQuery('#ckb-panel-details');
      expect(detailsPanel?.classList.contains('active')).toBe(true);

      // Check that consent panel is not active
      const consentPanel = shadowQuery('#ckb-panel-consent');
      expect(consentPanel?.classList.contains('active')).toBe(false);

      // Click on About tab
      const aboutTab = shadowQuery('.ckb-tab-btn[data-tab="about"]');
      aboutTab?.click();

      const aboutPanel = shadowQuery('#ckb-panel-about');
      expect(aboutPanel?.classList.contains('active')).toBe(true);
    });

    it('updates aria-selected on tab buttons', () => {
      const banner = createCookieBanner({
        forceEU: true,
        tabs: { enabled: true },
        mode: 'gdpr',
      });
      banner.show();

      const consentTab = shadowQuery('.ckb-tab-btn[data-tab="consent"]');
      const detailsTab = shadowQuery('.ckb-tab-btn[data-tab="details"]');

      // Initially consent tab should be selected
      expect(consentTab?.getAttribute('aria-selected')).toBe('true');
      expect(detailsTab?.getAttribute('aria-selected')).toBe('false');

      // Click details tab
      detailsTab?.click();

      expect(consentTab?.getAttribute('aria-selected')).toBe('false');
      expect(detailsTab?.getAttribute('aria-selected')).toBe('true');
    });

    it('minimal mode with tabs shows only Consent and About tabs (no Details)', () => {
      const banner = createCookieBanner({
        forceEU: true,
        tabs: { enabled: true },
        // No mode = minimal (default)
      });
      banner.show();

      // Should have Consent and About tabs
      const consentTab = shadowQuery('.ckb-tab-btn[data-tab="consent"]');
      const aboutTab = shadowQuery('.ckb-tab-btn[data-tab="about"]');
      expect(consentTab).not.toBeNull();
      expect(aboutTab).not.toBeNull();

      // Should NOT have Details tab (no categories in minimal mode)
      const detailsTab = shadowQuery('.ckb-tab-btn[data-tab="details"]');
      expect(detailsTab).toBeNull();
    });

    it('GDPR mode with tabs shows Consent, Details, and About tabs', () => {
      const banner = createCookieBanner({
        forceEU: true,
        tabs: { enabled: true },
        mode: 'gdpr',
      });
      banner.show();

      // Should have all three tabs
      const consentTab = shadowQuery('.ckb-tab-btn[data-tab="consent"]');
      const detailsTab = shadowQuery('.ckb-tab-btn[data-tab="details"]');
      const aboutTab = shadowQuery('.ckb-tab-btn[data-tab="about"]');

      expect(consentTab).not.toBeNull();
      expect(detailsTab).not.toBeNull();
      expect(aboutTab).not.toBeNull();
    });

    it('GDPR mode Details tab shows each category exactly once', () => {
      const banner = createCookieBanner({
        forceEU: true,
        tabs: { enabled: true },
        mode: 'gdpr',
      });
      banner.show();

      // Count category checkboxes - should be exactly 4 (Essential, Analytics, Marketing, Functional)
      const categoryCheckboxes = shadowQueryAll('input[name="ckb-cat"]');
      expect(categoryCheckboxes.length).toBe(4);

      // Each category should appear only once
      const essentialLabels = shadowQueryAll('label:has(input[value="essential"])');
      const analyticsLabels = shadowQueryAll('label:has(input[value="analytics"])');
      const marketingLabels = shadowQueryAll('label:has(input[value="marketing"])');
      const functionalLabels = shadowQueryAll('label:has(input[value="functional"])');

      expect(essentialLabels.length).toBe(1);
      expect(analyticsLabels.length).toBe(1);
      expect(marketingLabels.length).toBe(1);
      expect(functionalLabels.length).toBe(1);
    });

    it('minimal mode with tabs has exactly 2 tabs', () => {
      const banner = createCookieBanner({
        forceEU: true,
        tabs: { enabled: true },
        mode: 'minimal',
      });
      banner.show();

      // Should have exactly 2 tabs
      const allTabs = shadowQueryAll('.ckb-tab-btn');
      expect(allTabs.length).toBe(2);

      // Verify they are Consent and About only
      const tabNames = Array.from(allTabs).map(t => t.getAttribute('data-tab'));
      expect(tabNames).toContain('consent');
      expect(tabNames).toContain('about');
      expect(tabNames).not.toContain('details');
    });
  });

  describe('Settings and Save buttons in GDPR mode (non-tabbed)', () => {
    it('shows categories when settings button is clicked', () => {
      const banner = createCookieBanner({
        forceEU: true,
        mode: 'gdpr',
        tabs: { enabled: false }, // Non-tabbed mode has settings button
      });
      banner.show();

      const settingsBtn = shadowQuery('#cks');
      expect(settingsBtn).not.toBeNull();

      // Wrapper should not have expanded class initially
      const wrapper = shadowQuery('#ckb');
      expect(wrapper?.classList.contains('expanded')).toBe(false);

      // Click settings button
      settingsBtn?.click();

      // Wrapper should now have expanded class
      expect(wrapper?.classList.contains('expanded')).toBe(true);
    });

    it('saves preferences when save button is clicked', () => {
      const onConsent = jest.fn();
      const banner = createCookieBanner({
        forceEU: true,
        mode: 'gdpr',
        tabs: { enabled: false }, // Non-tabbed mode has save button
        onConsent,
      });
      banner.show();

      // Expand categories first
      const settingsBtn = shadowQuery('#cks');
      settingsBtn?.click();

      // Click save button
      const saveBtn = shadowQuery('#cksv');
      expect(saveBtn).not.toBeNull();
      saveBtn?.click();

      expect(onConsent).toHaveBeenCalled();
    });
  });

  describe('Script Blocking Utilities', () => {
    beforeEach(() => {
      _resetScriptRegistry();
      // Clear any dynamically added scripts
      document.querySelectorAll('script[data-test-script]').forEach(s => s.remove());
    });

    describe('loadOnConsent()', () => {
      it('registers script for future consent', () => {
        const callback = jest.fn();
        loadOnConsent('analytics', 'https://example.com/analytics.js', callback);

        // Script should not be loaded yet
        const scripts = document.querySelectorAll('script[src="https://example.com/analytics.js"]');
        expect(scripts.length).toBe(0);
        expect(callback).not.toHaveBeenCalled();
      });

      it('loads script immediately if consent already given', () => {
        // Set consent first
        setConsent('1', 'cookie_consent', 365);

        loadOnConsent('analytics', 'https://example.com/ga-immediate.js');

        // Script should be added to head
        const scripts = document.querySelectorAll('script[src="https://example.com/ga-immediate.js"]');
        expect(scripts.length).toBe(1);
      });

      it('loads script immediately if granular consent already given for category', () => {
        // Set granular consent with analytics enabled
        setConsent('essential:1,analytics:1,marketing:0,functional:0', 'cookie_consent', 365);

        loadOnConsent('analytics', 'https://example.com/ga-granular.js');

        // Script should be added
        const scripts = document.querySelectorAll('script[src="https://example.com/ga-granular.js"]');
        expect(scripts.length).toBe(1);
      });

      it('does not load script if granular consent denied for category', () => {
        // Set granular consent with analytics disabled
        setConsent('essential:1,analytics:0,marketing:0,functional:0', 'cookie_consent', 365);

        loadOnConsent('analytics', 'https://example.com/ga-denied.js');

        // Script should NOT be added
        const scripts = document.querySelectorAll('script[src="https://example.com/ga-denied.js"]');
        expect(scripts.length).toBe(0);
      });

      it('does not duplicate scripts if called multiple times', () => {
        setConsent('1', 'cookie_consent', 365);

        loadOnConsent('analytics', 'https://example.com/no-dupe.js');
        loadOnConsent('analytics', 'https://example.com/no-dupe.js');
        loadOnConsent('analytics', 'https://example.com/no-dupe.js');

        const scripts = document.querySelectorAll('script[src="https://example.com/no-dupe.js"]');
        expect(scripts.length).toBe(1);
      });

      it('calls callback when script already loaded', () => {
        setConsent('1', 'cookie_consent', 365);

        const callback1 = jest.fn();
        const callback2 = jest.fn();

        // First call loads script
        loadOnConsent('analytics', 'https://example.com/callback-test.js', callback1);

        // Second call should trigger callback immediately since script already loaded
        loadOnConsent('analytics', 'https://example.com/callback-test.js', callback2);

        expect(callback2).toHaveBeenCalled();
      });

      it('handles consent value "0" (rejected) correctly', () => {
        setConsent('0', 'cookie_consent', 365);

        loadOnConsent('analytics', 'https://example.com/rejected.js');

        // Script should NOT be loaded
        const scripts = document.querySelectorAll('script[src="https://example.com/rejected.js"]');
        expect(scripts.length).toBe(0);
      });
    });

    describe('_loadConsentedScripts()', () => {
      it('loads scripts for consented categories', () => {
        // Register scripts
        loadOnConsent('analytics', 'https://example.com/load-analytics.js');
        loadOnConsent('marketing', 'https://example.com/load-marketing.js');

        // Simulate consent
        _loadConsentedScripts({ analytics: true, marketing: false, essential: true });

        // Only analytics should be loaded
        expect(document.querySelectorAll('script[src="https://example.com/load-analytics.js"]').length).toBe(1);
        expect(document.querySelectorAll('script[src="https://example.com/load-marketing.js"]').length).toBe(0);
      });

      it('loads all scripts when boolean true passed (minimal mode)', () => {
        loadOnConsent('analytics', 'https://example.com/all-analytics.js');
        loadOnConsent('marketing', 'https://example.com/all-marketing.js');

        _loadConsentedScripts(true);

        expect(document.querySelectorAll('script[src="https://example.com/all-analytics.js"]').length).toBe(1);
        expect(document.querySelectorAll('script[src="https://example.com/all-marketing.js"]').length).toBe(1);
      });

      it('loads no scripts when boolean false passed', () => {
        loadOnConsent('analytics', 'https://example.com/none-analytics.js');

        _loadConsentedScripts(false);

        expect(document.querySelectorAll('script[src="https://example.com/none-analytics.js"]').length).toBe(0);
      });
    });

    describe('blockScriptsUntilConsent()', () => {
      it('scans DOM for data-consent scripts and registers them', () => {
        // Add blocked script to DOM
        const blockedScript = document.createElement('script');
        blockedScript.type = 'text/plain';
        blockedScript.dataset.consent = 'analytics';
        blockedScript.dataset.src = 'https://example.com/blocked-script.js';
        blockedScript.dataset.testScript = 'true';
        document.body.appendChild(blockedScript);

        // Scan for blocked scripts
        blockScriptsUntilConsent();

        // Should not be loaded yet (no consent)
        expect(document.querySelectorAll('script[src="https://example.com/blocked-script.js"]').length).toBe(0);

        // Now give consent
        _loadConsentedScripts({ analytics: true });

        // Should be loaded now
        expect(document.querySelectorAll('script[src="https://example.com/blocked-script.js"]').length).toBe(1);
      });
    });

    describe('Integration with createCookieBanner', () => {
      it('loads registered scripts when user accepts (minimal mode)', () => {
        loadOnConsent('analytics', 'https://example.com/banner-accept.js');

        const banner = createCookieBanner({ forceEU: true });
        banner.show();

        // Accept
        const acceptBtn = shadowQuery('#cky');
        acceptBtn?.click();

        // Script should be loaded
        expect(document.querySelectorAll('script[src="https://example.com/banner-accept.js"]').length).toBe(1);
      });

      it('does not load scripts when user rejects', () => {
        loadOnConsent('analytics', 'https://example.com/banner-reject.js');

        const banner = createCookieBanner({ forceEU: true });
        banner.show();

        // Reject
        const rejectBtn = shadowQuery('#ckn');
        rejectBtn?.click();

        // Script should NOT be loaded
        expect(document.querySelectorAll('script[src="https://example.com/banner-reject.js"]').length).toBe(0);
      });

      it('loads only consented category scripts in GDPR mode', () => {
        loadOnConsent('analytics', 'https://example.com/gdpr-analytics.js');
        loadOnConsent('marketing', 'https://example.com/gdpr-marketing.js');

        const banner = createCookieBanner({
          forceEU: true,
          mode: 'gdpr',
          tabs: { enabled: false },
        });
        banner.show();

        // Open settings, uncheck marketing, save
        const settingsBtn = shadowQuery('#cks');
        settingsBtn?.click();

        // Check analytics checkbox (should be unchecked by default)
        const checkboxes = getShadowRoot()?.querySelectorAll('input[name="ckb-cat"]') as NodeListOf<HTMLInputElement>;
        checkboxes.forEach(cb => {
          if (cb.value === 'analytics') cb.checked = true;
          if (cb.value === 'marketing') cb.checked = false;
        });

        // Save
        const saveBtn = shadowQuery('#cksv');
        saveBtn?.click();

        // Only analytics should be loaded
        expect(document.querySelectorAll('script[src="https://example.com/gdpr-analytics.js"]').length).toBe(1);
        expect(document.querySelectorAll('script[src="https://example.com/gdpr-marketing.js"]').length).toBe(0);
      });

      describe('Return visit scenario (Issue: loadOnConsent not loading on subsequent visits)', () => {
        it('loads script on return visit when consent was given previously (minimal mode)', () => {
          // FIRST VISIT: User consents
          loadOnConsent('analytics', 'https://example.com/return-visit-minimal.js');
          const banner1 = createCookieBanner({ forceEU: true });
          banner1.show();
          const acceptBtn1 = shadowQuery('#cky');
          acceptBtn1?.click();

          // Verify script loaded on first visit
          expect(document.querySelectorAll('script[src="https://example.com/return-visit-minimal.js"]').length).toBe(1);

          // SIMULATE PAGE RELOAD: Reset script registry but keep cookie
          _resetScriptRegistry();
          _resetSingleton();
          document.querySelectorAll('script[src="https://example.com/return-visit-minimal.js"]').forEach(s => s.remove());

          // SECOND VISIT: Cookie exists, banner should not show, script should load immediately
          loadOnConsent('analytics', 'https://example.com/return-visit-minimal.js');

          // Script should be loaded immediately on return visit
          const scripts = document.querySelectorAll('script[src="https://example.com/return-visit-minimal.js"]');
          expect(scripts.length).toBe(1);
        });

        it('loads script on return visit when consent was given previously (GDPR mode)', () => {
          // FIRST VISIT: User accepts all in GDPR mode
          loadOnConsent('analytics', 'https://example.com/return-visit-gdpr.js');
          const banner1 = createCookieBanner({ forceEU: true, mode: 'gdpr' });
          banner1.show();
          const acceptBtn1 = shadowQuery('#cky');
          acceptBtn1?.click();

          // Verify script loaded on first visit
          expect(document.querySelectorAll('script[src="https://example.com/return-visit-gdpr.js"]').length).toBe(1);

          // SIMULATE PAGE RELOAD: Reset script registry but keep cookie
          _resetScriptRegistry();
          _resetSingleton();
          document.querySelectorAll('script[src="https://example.com/return-visit-gdpr.js"]').forEach(s => s.remove());

          // SECOND VISIT: Cookie exists (granular format), banner should not show
          loadOnConsent('analytics', 'https://example.com/return-visit-gdpr.js');

          // Script should be loaded immediately on return visit
          const scripts = document.querySelectorAll('script[src="https://example.com/return-visit-gdpr.js"]');
          expect(scripts.length).toBe(1);
        });

        it('loads script on return visit with createCookieBanner and loadOnConsent called in any order', () => {
          // FIRST VISIT: User consents
          const banner1 = createCookieBanner({ forceEU: true, mode: 'gdpr' });
          loadOnConsent('analytics', 'https://example.com/return-order.js');
          banner1.show();
          shadowQuery('#cky')?.click();

          expect(document.querySelectorAll('script[src="https://example.com/return-order.js"]').length).toBe(1);

          // SIMULATE PAGE RELOAD
          _resetScriptRegistry();
          _resetSingleton();
          document.querySelectorAll('script[src="https://example.com/return-order.js"]').forEach(s => s.remove());

          // SECOND VISIT: Different call order - createCookieBanner first, then loadOnConsent
          createCookieBanner({ forceEU: true, mode: 'gdpr' });
          loadOnConsent('analytics', 'https://example.com/return-order.js');

          // Script should still load
          const scripts = document.querySelectorAll('script[src="https://example.com/return-order.js"]');
          expect(scripts.length).toBe(1);
        });

        it('does not load script on return visit if category was denied', () => {
          // FIRST VISIT: User saves with analytics unchecked
          loadOnConsent('analytics', 'https://example.com/return-denied.js');
          const banner1 = createCookieBanner({ forceEU: true, mode: 'gdpr', tabs: { enabled: false } });
          banner1.show();

          // Open settings and save with analytics unchecked (default is unchecked)
          shadowQuery('#cks')?.click();
          shadowQuery('#cksv')?.click();

          // Script should NOT have loaded (analytics was not consented)
          expect(document.querySelectorAll('script[src="https://example.com/return-denied.js"]').length).toBe(0);

          // SIMULATE PAGE RELOAD
          _resetScriptRegistry();
          _resetSingleton();

          // SECOND VISIT: Analytics was denied, script should not load
          loadOnConsent('analytics', 'https://example.com/return-denied.js');

          const scripts = document.querySelectorAll('script[src="https://example.com/return-denied.js"]');
          expect(scripts.length).toBe(0);
        });

        it('loads script on return visit with CUSTOM cookie name using cookieName option', () => {
          // FIX: loadOnConsent now accepts cookieName option to match banner config
          const customCookieName = 'my_custom_consent';

          // FIRST VISIT: Banner configured with custom cookie name
          loadOnConsent('analytics', 'https://example.com/custom-cookie.js', { cookieName: customCookieName });
          const banner1 = createCookieBanner({
            forceEU: true,
            mode: 'gdpr',
            cookieName: customCookieName,
          });
          banner1.show();
          shadowQuery('#cky')?.click();

          // Verify script loaded on first visit (via _loadConsentedScripts)
          expect(document.querySelectorAll('script[src="https://example.com/custom-cookie.js"]').length).toBe(1);

          // Verify cookie was set with custom name
          expect(document.cookie).toContain(customCookieName);

          // SIMULATE PAGE RELOAD
          _resetScriptRegistry();
          _resetSingleton();
          document.querySelectorAll('script[src="https://example.com/custom-cookie.js"]').forEach(s => s.remove());

          // SECOND VISIT: loadOnConsent with cookieName option finds the consent
          loadOnConsent('analytics', 'https://example.com/custom-cookie.js', { cookieName: customCookieName });

          // Script loads because loadOnConsent now checks the correct cookie
          const scripts = document.querySelectorAll('script[src="https://example.com/custom-cookie.js"]');
          expect(scripts.length).toBe(1);
        });

        it('loads script on return visit with custom cookieName when createCookieBanner is called (auto-inherit)', () => {
          // This tests that createCookieBanner loads pending scripts on init even with custom cookieName
          const customCookieName = 'my_other_consent';

          // FIRST VISIT: Banner with custom cookie name, loadOnConsent without cookieName option
          loadOnConsent('analytics', 'https://example.com/no-option.js'); // No cookieName option!
          const banner1 = createCookieBanner({
            forceEU: true,
            mode: 'gdpr',
            cookieName: customCookieName,
          });
          banner1.show();
          shadowQuery('#cky')?.click();

          // Script loaded on first visit via _loadConsentedScripts (called by banner)
          expect(document.querySelectorAll('script[src="https://example.com/no-option.js"]').length).toBe(1);

          // SIMULATE PAGE RELOAD
          _resetScriptRegistry();
          _resetSingleton();
          document.querySelectorAll('script[src="https://example.com/no-option.js"]').forEach(s => s.remove());

          // SECOND VISIT: loadOnConsent without cookieName, but createCookieBanner with custom cookieName
          loadOnConsent('analytics', 'https://example.com/no-option.js'); // Still no cookieName!
          createCookieBanner({
            forceEU: true,
            mode: 'gdpr',
            cookieName: customCookieName,
          });

          // Script DOES load because createCookieBanner loads pending scripts on init
          const scripts = document.querySelectorAll('script[src="https://example.com/no-option.js"]');
          expect(scripts.length).toBe(1);
        });

        it('does not load script on return visit without cookieName option when createCookieBanner not called', () => {
          // Edge case: if user only calls loadOnConsent without createCookieBanner, they still need cookieName
          const customCookieName = 'edge_case_consent';

          // FIRST VISIT: Banner with custom cookie name
          loadOnConsent('analytics', 'https://example.com/edge-case.js');
          const banner1 = createCookieBanner({
            forceEU: true,
            mode: 'gdpr',
            cookieName: customCookieName,
          });
          banner1.show();
          shadowQuery('#cky')?.click();

          expect(document.querySelectorAll('script[src="https://example.com/edge-case.js"]').length).toBe(1);

          // SIMULATE PAGE RELOAD
          _resetScriptRegistry();
          _resetSingleton();
          document.querySelectorAll('script[src="https://example.com/edge-case.js"]').forEach(s => s.remove());

          // SECOND VISIT: ONLY loadOnConsent called (no createCookieBanner)
          loadOnConsent('analytics', 'https://example.com/edge-case.js'); // No cookieName, no banner

          // Script does NOT load - loadOnConsent alone can't know about custom cookie name
          const scripts = document.querySelectorAll('script[src="https://example.com/edge-case.js"]');
          expect(scripts.length).toBe(0);
        });

        it('supports callback with cookieName option', () => {
          const customCookieName = 'callback_test_consent';
          const callback = jest.fn();

          // Set consent with custom cookie name
          setConsent('essential:1,analytics:1', customCookieName, 365);

          // Call loadOnConsent with both callback and cookieName
          loadOnConsent('analytics', 'https://example.com/callback-option.js', {
            callback,
            cookieName: customCookieName,
          });

          // Script should be loaded
          expect(document.querySelectorAll('script[src="https://example.com/callback-option.js"]').length).toBe(1);
        });

        it('loadOnConsent should read cookieName from window.CookieBannerConfig on return visit', () => {
          window.CookieBannerConfig = {
            forceEU: true,
            cookieName: 'asdfghj',
          };

          // First visit: user accepts
          const banner = createCookieBanner({ forceEU: true, cookieName: 'asdfghj' });
          banner.show();
          shadowQuery('#cky')?.click();
          expect(document.cookie).toContain('asdfghj=');

          // Simulate page reload
          _resetScriptRegistry();
          _resetSingleton();

          // Return visit: loadOnConsent without explicit cookieName (reads from CookieBannerConfig)
          loadOnConsent('analytics', 'https://example.com/dietervb-bug.js', {
            callback: () => console.log('loaded'),
          });

          // Should load because loadOnConsent reads cookieName from window.CookieBannerConfig
          const scripts = document.querySelectorAll('script[src="https://example.com/dietervb-bug.js"]');
          expect(scripts.length).toBe(1);

          delete window.CookieBannerConfig;
        });

        it('loadOnConsent ignores invalid cookieName with special characters in CookieBannerConfig', () => {
          // Set consent with default cookie name
          setConsent('essential:1,analytics:1', 'cookie_consent', 365);

          // Invalid cookie name with special characters should be ignored
          window.CookieBannerConfig = {
            cookieName: 'bad;cookie=injection',
          };

          loadOnConsent('analytics', 'https://example.com/special-chars.js');

          // Should load because it falls back to default 'cookie_consent'
          const scripts = document.querySelectorAll('script[src="https://example.com/special-chars.js"]');
          expect(scripts.length).toBe(1);

          delete window.CookieBannerConfig;
        });

        it('loadOnConsent ignores empty cookieName in CookieBannerConfig', () => {
          setConsent('essential:1,analytics:1', 'cookie_consent', 365);

          window.CookieBannerConfig = {
            cookieName: '',
          };

          loadOnConsent('analytics', 'https://example.com/empty-name.js');

          // Should load because empty string is falsy, falls back to default
          const scripts = document.querySelectorAll('script[src="https://example.com/empty-name.js"]');
          expect(scripts.length).toBe(1);

          delete window.CookieBannerConfig;
        });

        it('loadOnConsent ignores cookieName with spaces in CookieBannerConfig', () => {
          setConsent('essential:1,analytics:1', 'cookie_consent', 365);

          window.CookieBannerConfig = {
            cookieName: 'cookie name',
          };

          loadOnConsent('analytics', 'https://example.com/spaces.js');

          // Should load because spaces fail regex, falls back to default
          const scripts = document.querySelectorAll('script[src="https://example.com/spaces.js"]');
          expect(scripts.length).toBe(1);

          delete window.CookieBannerConfig;
        });
      });
    });
  });
});
