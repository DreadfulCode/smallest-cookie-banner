/**
 * smallest-cookie-banner - The smallest legally compliant cookie banner
 * EU: Full GDPR compliance (accept/reject required)
 * Everywhere else: Implied consent (auto-dismiss notice)
 *
 * Fully customizable via CSS variables or config
 */
(function(window, document) {
  'use strict';

  var COOKIE_NAME = 'ck';
  var EU_OFFSETS = [-1, 0, 1, 2, 3]; // WET, GMT, CET, EET, FET

  // Default CSS - uses CSS custom properties for easy overrides
  var DEFAULT_CSS = [
    '#ckb{',
    'position:var(--ckb-position,fixed);',
    'bottom:var(--ckb-bottom,0);',
    'top:var(--ckb-top,auto);',
    'left:var(--ckb-left,0);',
    'right:var(--ckb-right,0);',
    'padding:var(--ckb-padding,8px 12px);',
    'background:var(--ckb-bg,#222);',
    'color:var(--ckb-color,#fff);',
    'font:var(--ckb-font,12px system-ui,sans-serif);',
    'display:flex;align-items:center;gap:var(--ckb-gap,8px);',
    'z-index:var(--ckb-z,9999);',
    'flex-wrap:wrap;',
    '}',
    '#ckb p{margin:0;flex:1;min-width:200px}',
    '#ckb button{',
    'padding:var(--ckb-btn-padding,6px 12px);',
    'border:var(--ckb-btn-border,none);',
    'border-radius:var(--ckb-btn-radius,3px);',
    'background:var(--ckb-btn-bg,#fff);',
    'color:var(--ckb-btn-color,#222);',
    'font:inherit;cursor:pointer;',
    '}',
    '#ckb #ckn{',
    'background:var(--ckb-reject-bg,transparent);',
    'color:var(--ckb-reject-color,inherit);',
    'border:var(--ckb-reject-border,1px solid currentColor);',
    '}'
  ].join('');

  /**
   * Detect if user is likely in EU based on timezone
   */
  function isEU() {
    var offset = -new Date().getTimezoneOffset() / 60 | 0;
    return EU_OFFSETS.indexOf(offset) > -1;
  }

  /**
   * Get consent value from cookie
   */
  function getConsent() {
    var match = document.cookie.match('(^|;)\\s*' + COOKIE_NAME + '=([^;]*)');
    return match ? match[2] : null;
  }

  /**
   * Set consent cookie
   */
  function setConsent(value, days) {
    var date = new Date();
    date.setDate(date.getDate() + (days || 365));
    var cookie = COOKIE_NAME + '=' + value + ';expires=' + date.toUTCString() + ';path=/;SameSite=Lax';
    if (location.protocol === 'https:') {
      cookie += ';Secure';
    }
    document.cookie = cookie;
  }

  /**
   * Delete consent cookie
   */
  function deleteConsent() {
    document.cookie = COOKIE_NAME + '=;expires=Thu,01 Jan 1970 00:00:00 GMT;path=/';
  }

  /**
   * Inject default styles (once)
   */
  function injectStyles(customCSS) {
    if (document.getElementById('ckb-style')) return;
    var style = document.createElement('style');
    style.id = 'ckb-style';
    style.textContent = DEFAULT_CSS + (customCSS || '');
    document.head.appendChild(style);
  }

  /**
   * Create and show the banner
   */
  function createBanner(config, inEU, onSet) {
    injectStyles(config.css);

    var banner = document.createElement('div');
    banner.id = 'ckb';

    // Apply any custom inline styles from config
    if (config.style) {
      banner.style.cssText = config.style;
    }

    var msg = config.msg || 'Cookies help us deliver our services.';
    var acceptText = config.acceptText || 'OK';
    var rejectText = config.rejectText || '\u2717';
    var rejectBtn = inEU ? '<button id="ckn">' + rejectText + '</button>' : '';

    banner.innerHTML = '<p>' + msg + '</p>' + rejectBtn + '<button id="cky">' + acceptText + '</button>';

    document.body.appendChild(banner);

    // Accept button
    document.getElementById('cky').onclick = function() {
      onSet('1');
    };

    // Reject button (EU only)
    var rejectEl = document.getElementById('ckn');
    if (rejectEl) {
      rejectEl.onclick = function() {
        onSet('0');
      };
    }

    // Non-EU: implied consent after scroll or timeout
    if (!inEU) {
      var timeout = config.autoAcceptDelay !== undefined ? config.autoAcceptDelay : 5000;
      var autoAccept = function() {
        onSet('1');
        document.removeEventListener('scroll', scrollHandler);
      };
      var timer = timeout > 0 ? setTimeout(autoAccept, timeout) : null;
      var scrollHandler = function() {
        if (timer) clearTimeout(timer);
        autoAccept();
      };
      document.addEventListener('scroll', scrollHandler);
    }

    return banner;
  }

  /**
   * Initialize the cookie banner
   */
  function init() {
    var config = window.CookieBannerConfig || {};
    var api = window.CookieBanner || {};
    var banner = null;
    var inEU = config.forceEU !== undefined ? config.forceEU : isEU();

    function handleSet(value) {
      setConsent(value, config.days);
      api.ok = value === '1';
      if (banner) {
        banner.remove();
        banner = null;
      }
      var callback = value === '1' ? config.onYes : config.onNo;
      if (typeof callback === 'function') {
        callback();
      }
    }

    // Public API (always available)
    api.yes = function() { handleSet('1'); };
    api.no = function() { handleSet('0'); };
    api.reset = function() {
      deleteConsent();
      location.reload();
    };

    // Check existing consent
    var existing = getConsent();
    if (existing !== null) {
      api.ok = existing === '1';
      window.CookieBanner = api;
      return api;
    }

    function showBanner() {
      if (!banner) {
        banner = createBanner(config, inEU, handleSet);
      }
    }

    // Show banner when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBanner);
    } else {
      showBanner();
    }

    api.ok = null;
    window.CookieBanner = api;
    return api;
  }

  // Auto-initialize
  init();

  // Export for testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      isEU: isEU,
      getConsent: getConsent,
      setConsent: setConsent,
      deleteConsent: deleteConsent,
      createBanner: createBanner,
      injectStyles: injectStyles,
      init: init,
      DEFAULT_CSS: DEFAULT_CSS
    };
  }

})(typeof window !== 'undefined' ? window : global, typeof document !== 'undefined' ? document : {});
