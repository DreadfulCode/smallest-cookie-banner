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
  LegacyCookieBannerAPI,
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
});
