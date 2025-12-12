/**
 * smallest-cookie-banner
 * The smallest legally compliant cookie consent banner
 * https://github.com/DreadfulCode/smallest-cookie-banner
 * MIT License
 */
(function() {
  'use strict';

  var COOKIE_NAME = 'cookie_consent';
  var config = window.CookieBannerConfig || {};

  // Default configuration
  var defaults = {
    message: 'This site uses cookies to improve your experience.',
    acceptText: 'Accept',
    rejectText: 'Reject',
    expires: 365,
    sameSite: 'Lax',
    position: 'bottom',
    zIndex: 9999,
    onAccept: null,
    onReject: null
  };

  // Merge config with defaults
  for (var key in defaults) {
    if (config[key] === undefined) {
      config[key] = defaults[key];
    }
  }

  var banner = null;

  // Cookie functions
  function setCookie(value) {
    var date = new Date();
    date.setTime(date.getTime() + (config.expires * 24 * 60 * 60 * 1000));
    document.cookie = COOKIE_NAME + '=' + value +
      ';expires=' + date.toUTCString() +
      ';path=/' +
      ';SameSite=' + config.sameSite +
      (location.protocol === 'https:' ? ';Secure' : '');
  }

  function getCookie() {
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
      var cookie = cookies[i].trim();
      if (cookie.indexOf(COOKIE_NAME + '=') === 0) {
        return cookie.substring(COOKIE_NAME.length + 1);
      }
    }
    return null;
  }

  function deleteCookie() {
    document.cookie = COOKIE_NAME + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
  }

  // Banner functions
  function createBanner() {
    banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');

    var posStyle = config.position === 'top' ? 'top:0' : 'bottom:0';

    banner.innerHTML =
      '<div style="max-width:900px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">' +
        '<span style="flex:1;min-width:200px">' + config.message + '</span>' +
        '<div style="display:flex;gap:8px">' +
          (config.rejectText ? '<button id="cb-reject" style="padding:8px 16px;border:1px solid currentColor;background:transparent;color:inherit;cursor:pointer;border-radius:4px">' + config.rejectText + '</button>' : '') +
          '<button id="cb-accept" style="padding:8px 16px;border:none;background:#2563eb;color:#fff;cursor:pointer;border-radius:4px">' + config.acceptText + '</button>' +
        '</div>' +
      '</div>';

    banner.style.cssText =
      'position:fixed;' + posStyle + ';left:0;right:0;' +
      'padding:16px 20px;' +
      'background:#f8fafc;color:#1e293b;' +
      'box-shadow:0 -2px 10px rgba(0,0,0,0.1);' +
      'font-family:system-ui,-apple-system,sans-serif;' +
      'font-size:14px;' +
      'z-index:' + config.zIndex;

    document.body.appendChild(banner);

    // Event listeners
    document.getElementById('cb-accept').onclick = accept;
    var rejectBtn = document.getElementById('cb-reject');
    if (rejectBtn) {
      rejectBtn.onclick = reject;
    }
  }

  function hideBanner() {
    if (banner) {
      banner.style.display = 'none';
    }
  }

  function showBanner() {
    if (banner) {
      banner.style.display = 'block';
    } else {
      createBanner();
    }
  }

  function accept() {
    setCookie('1');
    hideBanner();
    if (typeof config.onAccept === 'function') {
      config.onAccept();
    }
  }

  function reject() {
    setCookie('0');
    hideBanner();
    if (typeof config.onReject === 'function') {
      config.onReject();
    }
  }

  function hasConsent() {
    var value = getCookie();
    if (value === '1') return true;
    if (value === '0') return false;
    return null;
  }

  function reset() {
    deleteCookie();
    showBanner();
  }

  // Initialize
  function init() {
    if (hasConsent() === null) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createBanner);
      } else {
        createBanner();
      }
    } else if (hasConsent() === true && typeof config.onAccept === 'function') {
      // Fire onAccept for returning users who previously consented
      config.onAccept();
    }
  }

  // Public API
  window.CookieBanner = {
    hasConsent: hasConsent,
    accept: accept,
    reject: reject,
    reset: reset,
    show: showBanner,
    hide: hideBanner
  };

  init();
})();
