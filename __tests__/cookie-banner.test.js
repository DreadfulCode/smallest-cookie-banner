/**
 * Tests for smallest-cookie-banner
 * Target: 100% code coverage
 */

describe('smallest-cookie-banner', () => {
  let cookieBanner;

  // Helper to fully reset state
  function resetState() {
    // Clear DOM
    document.body.innerHTML = '';
    document.head.innerHTML = '';

    // Clear all cookies
    document.cookie.split(';').forEach(c => {
      document.cookie = c.trim().split('=')[0] + '=;expires=Thu,01 Jan 1970 00:00:00 GMT;path=/';
    });

    // Reset window globals
    delete window.CookieBanner;
    delete window.CookieBannerConfig;

    // Reset modules
    jest.resetModules();
  }

  beforeEach(() => {
    resetState();

    // Mock location
    delete window.location;
    window.location = { protocol: 'http:', reload: jest.fn() };

    // Ensure document.readyState is 'complete' by default
    Object.defineProperty(document, 'readyState', {
      value: 'complete',
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('isEU()', () => {
    it('returns true for EU timezones (UTC+0)', () => {
      jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(0);
      cookieBanner = require('../src/cookie-banner.js');
      expect(cookieBanner.isEU()).toBe(true);
    });

    it('returns true for EU timezones (UTC+1 CET)', () => {
      resetState();
      jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-60);
      cookieBanner = require('../src/cookie-banner.js');
      expect(cookieBanner.isEU()).toBe(true);
    });

    it('returns true for EU timezones (UTC+2 EET)', () => {
      resetState();
      jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-120);
      cookieBanner = require('../src/cookie-banner.js');
      expect(cookieBanner.isEU()).toBe(true);
    });

    it('returns true for EU timezones (UTC+3 FET)', () => {
      resetState();
      jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-180);
      cookieBanner = require('../src/cookie-banner.js');
      expect(cookieBanner.isEU()).toBe(true);
    });

    it('returns true for EU timezones (UTC-1 WET)', () => {
      resetState();
      jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(60);
      cookieBanner = require('../src/cookie-banner.js');
      expect(cookieBanner.isEU()).toBe(true);
    });

    it('returns false for non-EU timezones (UTC-5 EST)', () => {
      resetState();
      jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(300);
      cookieBanner = require('../src/cookie-banner.js');
      expect(cookieBanner.isEU()).toBe(false);
    });

    it('returns false for non-EU timezones (UTC+8 Asia)', () => {
      resetState();
      jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-480);
      cookieBanner = require('../src/cookie-banner.js');
      expect(cookieBanner.isEU()).toBe(false);
    });
  });

  describe('getConsent()', () => {
    beforeEach(() => {
      resetState();
      // Pre-set consent so init() doesn't create banner
      document.cookie = 'ck=1;path=/';
      cookieBanner = require('../src/cookie-banner.js');
    });

    it('returns "1" when consent cookie is set to accept', () => {
      expect(cookieBanner.getConsent()).toBe('1');
    });

    it('returns "0" when consent cookie is set to reject', () => {
      document.cookie = 'ck=0;path=/';
      expect(cookieBanner.getConsent()).toBe('0');
    });

    it('returns null when no consent cookie exists', () => {
      document.cookie = 'ck=;expires=Thu,01 Jan 1970 00:00:00 GMT;path=/';
      expect(cookieBanner.getConsent()).toBeNull();
    });

    it('handles multiple cookies', () => {
      document.cookie = 'other=value;path=/';
      expect(cookieBanner.getConsent()).toBe('1');
    });
  });

  describe('setConsent()', () => {
    beforeEach(() => {
      resetState();
      document.cookie = 'ck=1;path=/';
      cookieBanner = require('../src/cookie-banner.js');
      // Clear after loading module
      document.cookie = 'ck=;expires=Thu,01 Jan 1970 00:00:00 GMT;path=/';
    });

    it('sets consent cookie with default expiry', () => {
      cookieBanner.setConsent('1');
      expect(document.cookie).toContain('ck=1');
    });

    it('sets consent cookie with custom days', () => {
      cookieBanner.setConsent('1', 30);
      expect(document.cookie).toContain('ck=1');
    });

    it('adds Secure flag for HTTPS', () => {
      window.location.protocol = 'https:';
      // jsdom doesn't actually support Secure cookies, but we verify the code path runs
      expect(() => cookieBanner.setConsent('1')).not.toThrow();
    });

    it('sets rejection cookie', () => {
      cookieBanner.setConsent('0');
      expect(document.cookie).toContain('ck=0');
    });
  });

  describe('deleteConsent()', () => {
    beforeEach(() => {
      resetState();
      document.cookie = 'ck=1;path=/';
      cookieBanner = require('../src/cookie-banner.js');
    });

    it('deletes consent cookie', () => {
      cookieBanner.deleteConsent();
      expect(cookieBanner.getConsent()).toBeNull();
    });
  });

  describe('injectStyles()', () => {
    beforeEach(() => {
      resetState();
      document.cookie = 'ck=1;path=/';
      cookieBanner = require('../src/cookie-banner.js');
    });

    it('injects default styles', () => {
      cookieBanner.injectStyles();
      const style = document.getElementById('ckb-style');
      expect(style).not.toBeNull();
      expect(style.textContent).toContain('#ckb{');
    });

    it('injects custom CSS along with defaults', () => {
      cookieBanner.injectStyles('#custom{color:red}');
      const style = document.getElementById('ckb-style');
      expect(style.textContent).toContain('#custom{color:red}');
    });

    it('does not inject twice', () => {
      cookieBanner.injectStyles();
      cookieBanner.injectStyles();
      const styles = document.querySelectorAll('#ckb-style');
      expect(styles.length).toBe(1);
    });
  });

  describe('createBanner()', () => {
    beforeEach(() => {
      resetState();
      document.cookie = 'ck=1;path=/';
      cookieBanner = require('../src/cookie-banner.js');
    });

    it('creates banner with default message', () => {
      const onSet = jest.fn();
      cookieBanner.createBanner({}, true, onSet);
      const banner = document.getElementById('ckb');
      expect(banner).not.toBeNull();
      expect(banner.innerHTML).toContain('Cookies help us deliver our services.');
    });

    it('creates banner with custom message', () => {
      const onSet = jest.fn();
      cookieBanner.createBanner({ msg: 'Custom message' }, true, onSet);
      const banner = document.getElementById('ckb');
      expect(banner.innerHTML).toContain('Custom message');
    });

    it('creates banner with custom accept text', () => {
      const onSet = jest.fn();
      cookieBanner.createBanner({ acceptText: 'Accept All' }, true, onSet);
      const acceptBtn = document.getElementById('cky');
      expect(acceptBtn.textContent).toBe('Accept All');
    });

    it('creates banner with custom reject text (EU)', () => {
      const onSet = jest.fn();
      cookieBanner.createBanner({ rejectText: 'Decline' }, true, onSet);
      const rejectBtn = document.getElementById('ckn');
      expect(rejectBtn.textContent).toBe('Decline');
    });

    it('shows reject button for EU users', () => {
      const onSet = jest.fn();
      cookieBanner.createBanner({}, true, onSet);
      expect(document.getElementById('ckn')).not.toBeNull();
    });

    it('hides reject button for non-EU users', () => {
      const onSet = jest.fn();
      cookieBanner.createBanner({}, false, onSet);
      expect(document.getElementById('ckn')).toBeNull();
    });

    it('calls onSet with "1" when accept clicked', () => {
      const onSet = jest.fn();
      cookieBanner.createBanner({}, true, onSet);
      document.getElementById('cky').click();
      expect(onSet).toHaveBeenCalledWith('1');
    });

    it('calls onSet with "0" when reject clicked (EU)', () => {
      const onSet = jest.fn();
      cookieBanner.createBanner({}, true, onSet);
      document.getElementById('ckn').click();
      expect(onSet).toHaveBeenCalledWith('0');
    });

    it('applies custom inline styles', () => {
      const onSet = jest.fn();
      cookieBanner.createBanner({ style: 'background:blue' }, true, onSet);
      const banner = document.getElementById('ckb');
      expect(banner.style.background).toBe('blue');
    });

    it('injects custom CSS', () => {
      const onSet = jest.fn();
      cookieBanner.createBanner({ css: '.custom{color:red}' }, true, onSet);
      const style = document.getElementById('ckb-style');
      expect(style.textContent).toContain('.custom{color:red}');
    });

    describe('non-EU auto-accept', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      it('auto-accepts after timeout for non-EU', () => {
        const onSet = jest.fn();
        cookieBanner.createBanner({}, false, onSet);
        jest.advanceTimersByTime(5000);
        expect(onSet).toHaveBeenCalledWith('1');
      });

      it('auto-accepts on scroll for non-EU', () => {
        const onSet = jest.fn();
        cookieBanner.createBanner({}, false, onSet);
        document.dispatchEvent(new Event('scroll'));
        expect(onSet).toHaveBeenCalledWith('1');
      });

      it('clears timeout on scroll', () => {
        const onSet = jest.fn();
        cookieBanner.createBanner({}, false, onSet);
        document.dispatchEvent(new Event('scroll'));
        expect(onSet).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(5000);
        expect(onSet).toHaveBeenCalledTimes(1);
      });

      it('uses custom autoAcceptDelay', () => {
        const onSet = jest.fn();
        cookieBanner.createBanner({ autoAcceptDelay: 1000 }, false, onSet);
        jest.advanceTimersByTime(999);
        expect(onSet).not.toHaveBeenCalled();
        jest.advanceTimersByTime(1);
        expect(onSet).toHaveBeenCalledWith('1');
      });

      it('handles autoAcceptDelay of 0 (no auto-timeout)', () => {
        const onSet = jest.fn();
        cookieBanner.createBanner({ autoAcceptDelay: 0 }, false, onSet);
        jest.advanceTimersByTime(10000);
        expect(onSet).not.toHaveBeenCalled();
        document.dispatchEvent(new Event('scroll'));
        expect(onSet).toHaveBeenCalledWith('1');
      });
    });
  });

  describe('init()', () => {
    it('returns early if consent already exists (accepted)', () => {
      resetState();
      document.cookie = 'ck=1;path=/';
      require('../src/cookie-banner.js');
      expect(window.CookieBanner.ok).toBe(true);
      expect(document.getElementById('ckb')).toBeNull();
    });

    it('returns early if consent already exists (rejected)', () => {
      resetState();
      document.cookie = 'ck=0;path=/';
      require('../src/cookie-banner.js');
      expect(window.CookieBanner.ok).toBe(false);
      expect(document.getElementById('ckb')).toBeNull();
    });

    it('shows banner when no consent', () => {
      resetState();
      require('../src/cookie-banner.js');
      expect(document.getElementById('ckb')).not.toBeNull();
    });

    it('respects forceEU config option', () => {
      resetState();
      jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(300); // Non-EU
      window.CookieBannerConfig = { forceEU: true };
      require('../src/cookie-banner.js');
      expect(document.getElementById('ckn')).not.toBeNull();
    });

    it('respects forceEU false config option', () => {
      resetState();
      jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(0); // EU
      window.CookieBannerConfig = { forceEU: false };
      require('../src/cookie-banner.js');
      expect(document.getElementById('ckn')).toBeNull();
    });

    it('waits for DOMContentLoaded when document is loading', () => {
      resetState();
      Object.defineProperty(document, 'readyState', {
        value: 'loading',
        writable: true,
        configurable: true
      });
      require('../src/cookie-banner.js');
      expect(document.getElementById('ckb')).toBeNull();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      expect(document.getElementById('ckb')).not.toBeNull();
    });

    describe('API methods', () => {
      beforeEach(() => {
        resetState();
        require('../src/cookie-banner.js');
      });

      it('api.yes() accepts consent', () => {
        window.CookieBanner.yes();
        expect(window.CookieBanner.ok).toBe(true);
        expect(document.getElementById('ckb')).toBeNull();
      });

      it('api.no() rejects consent', () => {
        window.CookieBanner.no();
        expect(window.CookieBanner.ok).toBe(false);
        expect(document.getElementById('ckb')).toBeNull();
      });

      it('api.reset() deletes cookie and reloads', () => {
        window.CookieBanner.yes();
        window.CookieBanner.reset();
        expect(window.location.reload).toHaveBeenCalled();
      });

      it('api.ok starts as null', () => {
        expect(window.CookieBanner.ok).toBeNull();
      });
    });

    describe('callbacks', () => {
      it('calls onYes callback when accepted', () => {
        resetState();
        const onYes = jest.fn();
        window.CookieBannerConfig = { onYes };
        require('../src/cookie-banner.js');
        document.getElementById('cky').click();
        expect(onYes).toHaveBeenCalled();
      });

      it('calls onNo callback when rejected', () => {
        resetState();
        const onNo = jest.fn();
        window.CookieBannerConfig = { onNo, forceEU: true };
        require('../src/cookie-banner.js');
        document.getElementById('ckn').click();
        expect(onNo).toHaveBeenCalled();
      });

      it('handles missing callbacks gracefully', () => {
        resetState();
        require('../src/cookie-banner.js');
        expect(() => document.getElementById('cky').click()).not.toThrow();
      });
    });

    describe('custom days config', () => {
      it('uses custom days for cookie expiry', () => {
        resetState();
        window.CookieBannerConfig = { days: 30 };
        require('../src/cookie-banner.js');
        window.CookieBanner.yes();
        expect(document.cookie).toContain('ck=1');
      });
    });

    describe('edge cases', () => {
      it('handles calling API methods before banner exists', () => {
        resetState();
        document.cookie = 'ck=1;path=/';
        require('../src/cookie-banner.js');
        // Banner doesn't exist because consent was already given
        expect(() => window.CookieBanner.yes()).not.toThrow();
        expect(() => window.CookieBanner.no()).not.toThrow();
      });

      it('does not recreate banner if already shown', () => {
        resetState();
        require('../src/cookie-banner.js');
        const firstBanner = document.getElementById('ckb');
        // Trigger DOMContentLoaded again (edge case)
        document.dispatchEvent(new Event('DOMContentLoaded'));
        const secondBanner = document.getElementById('ckb');
        // Should be the same element
        expect(firstBanner).toBe(secondBanner);
      });

      it('handles undefined config values', () => {
        resetState();
        window.CookieBannerConfig = undefined;
        expect(() => require('../src/cookie-banner.js')).not.toThrow();
      });

      it('handles pre-existing CookieBanner object', () => {
        resetState();
        window.CookieBanner = { existing: true };
        require('../src/cookie-banner.js');
        // Should still have the API
        expect(window.CookieBanner.yes).toBeDefined();
      });
    });
  });

  describe('DEFAULT_CSS', () => {
    it('exports default CSS', () => {
      resetState();
      document.cookie = 'ck=1;path=/';
      cookieBanner = require('../src/cookie-banner.js');
      expect(cookieBanner.DEFAULT_CSS).toBeDefined();
      expect(cookieBanner.DEFAULT_CSS).toContain('--ckb-');
    });
  });
});
