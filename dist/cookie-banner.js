/**
 * smallest-cookie-banner
 * The smallest legally compliant cookie consent banner
 *
 * Features:
 * - EU: Full GDPR compliance (accept/reject required)
 * - Everywhere else: Implied consent (auto-dismiss notice)
 * - SSR-safe (works with Next.js, Nuxt, etc.)
 * - Framework-friendly (React, Vue, Angular, Svelte)
 * - Tree-shakeable ES modules
 * - Multiple instances supported
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DEFAULT_CSS = void 0;
    exports.isEU = isEU;
    exports.getConsent = getConsent;
    exports.setConsent = setConsent;
    exports.deleteConsent = deleteConsent;
    exports.createCookieBanner = createCookieBanner;
    exports.initLegacy = initLegacy;
    // ============================================================================
    // Constants
    // ============================================================================
    var EU_OFFSETS = [-1, 0, 1, 2, 3]; // WET, GMT, CET, EET, FET
    /** Default CSS - uses CSS custom properties for easy overrides */
    exports.DEFAULT_CSS = "#ckb{position:var(--ckb-position,fixed);bottom:var(--ckb-bottom,0);top:var(--ckb-top,auto);left:var(--ckb-left,0);right:var(--ckb-right,0);padding:var(--ckb-padding,8px 12px);background:var(--ckb-bg,#222);color:var(--ckb-color,#fff);font:var(--ckb-font,12px system-ui,sans-serif);display:flex;align-items:center;gap:var(--ckb-gap,8px);z-index:var(--ckb-z,9999);flex-wrap:wrap}#ckb p{margin:0;flex:1;min-width:200px}#ckb button{padding:var(--ckb-btn-padding,6px 12px);border:var(--ckb-btn-border,none);border-radius:var(--ckb-btn-radius,3px);background:var(--ckb-btn-bg,#fff);color:var(--ckb-btn-color,#222);font:inherit;cursor:pointer}#ckb #ckn{background:var(--ckb-reject-bg,transparent);color:var(--ckb-reject-color,inherit);border:var(--ckb-reject-border,1px solid currentColor)}";
    // ============================================================================
    // SSR Safety
    // ============================================================================
    var isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
    // ============================================================================
    // Utility Functions
    // ============================================================================
    /**
     * Detect if user is likely in EU based on timezone
     */
    function isEU() {
        if (!isBrowser)
            return false;
        var offset = Math.floor(-new Date().getTimezoneOffset() / 60);
        return EU_OFFSETS.indexOf(offset) > -1;
    }
    /**
     * Get consent value from cookie
     */
    function getConsent(cookieName) {
        if (cookieName === void 0) { cookieName = 'ck'; }
        if (!isBrowser)
            return null;
        var match = document.cookie.match(new RegExp('(^|;)\\s*' + cookieName + '=([^;]*)'));
        return match ? match[2] : null;
    }
    /**
     * Set consent cookie
     */
    function setConsent(value, cookieName, days) {
        if (cookieName === void 0) { cookieName = 'ck'; }
        if (days === void 0) { days = 365; }
        if (!isBrowser)
            return;
        var date = new Date();
        date.setDate(date.getDate() + days);
        var cookie = "".concat(cookieName, "=").concat(value, ";expires=").concat(date.toUTCString(), ";path=/;SameSite=Lax");
        if (location.protocol === 'https:') {
            cookie += ';Secure';
        }
        document.cookie = cookie;
    }
    /**
     * Delete consent cookie
     */
    function deleteConsent(cookieName) {
        if (cookieName === void 0) { cookieName = 'ck'; }
        if (!isBrowser)
            return;
        document.cookie = "".concat(cookieName, "=;expires=Thu,01 Jan 1970 00:00:00 GMT;path=/");
    }
    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(str) {
        if (!isBrowser)
            return str;
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    /**
     * Inject styles (once per ID)
     */
    function injectStyles(id, css) {
        if (!isBrowser || document.getElementById(id))
            return;
        var style = document.createElement('style');
        style.id = id;
        style.textContent = css;
        document.head.appendChild(style);
    }
    // ============================================================================
    // Cookie Banner Class (Framework-Friendly)
    // ============================================================================
    /**
     * Create a new cookie banner instance
     * Framework-friendly: no global state, proper cleanup, SSR-safe
     */
    function createCookieBanner(config) {
        if (config === void 0) { config = {}; }
        // SSR: return no-op instance
        if (!isBrowser) {
            return {
                status: null,
                accept: function () { },
                reject: function () { },
                show: function () { },
                hide: function () { },
                destroy: function () { },
                isVisible: function () { return false; },
            };
        }
        var cookieName = config.cookieName || 'ck';
        var days = config.days || 365;
        var inEU = config.forceEU !== undefined ? config.forceEU : isEU();
        var container = config.container || document.body;
        var banner = null;
        var _status = null;
        var styleId = "ckb-style-".concat(Math.random().toString(36).slice(2, 8));
        // Check existing consent
        var existing = getConsent(cookieName);
        if (existing !== null) {
            _status = existing === '1';
        }
        function handleConsent(accepted) {
            setConsent(accepted ? '1' : '0', cookieName, days);
            _status = accepted;
            if (banner) {
                if (banner._cleanup)
                    banner._cleanup();
                banner.remove();
                banner = null;
            }
            var callback = accepted
                ? (config.onAccept || config.onYes)
                : (config.onReject || config.onNo);
            if (typeof callback === 'function') {
                callback();
            }
        }
        function createBannerElement() {
            // Inject styles
            injectStyles(styleId, exports.DEFAULT_CSS + (config.css || ''));
            var el = document.createElement('div');
            el.id = 'ckb';
            if (config.style) {
                el.style.cssText = config.style;
            }
            var msg = escapeHtml(config.msg || 'Cookies help us deliver our services.');
            var acceptText = escapeHtml(config.acceptText || 'OK');
            var rejectText = escapeHtml(config.rejectText || '\u2717');
            var rejectBtn = inEU ? "<button id=\"ckn\">".concat(rejectText, "</button>") : '';
            el.innerHTML = "<p>".concat(msg, "</p>").concat(rejectBtn, "<button id=\"cky\">").concat(acceptText, "</button>");
            container.appendChild(el);
            // Event handlers
            var acceptEl = el.querySelector('#cky');
            var rejectEl = el.querySelector('#ckn');
            if (acceptEl) {
                acceptEl.addEventListener('click', function () { return handleConsent(true); });
            }
            if (rejectEl) {
                rejectEl.addEventListener('click', function () { return handleConsent(false); });
            }
            // Non-EU: auto-accept
            var timer = null;
            var scrollHandler = null;
            if (!inEU) {
                var timeout = config.autoAcceptDelay !== undefined ? config.autoAcceptDelay : 5000;
                var autoAccept_1 = function () {
                    handleConsent(true);
                };
                if (timeout > 0) {
                    timer = setTimeout(autoAccept_1, timeout);
                }
                scrollHandler = function () {
                    if (timer)
                        clearTimeout(timer);
                    autoAccept_1();
                };
                document.addEventListener('scroll', scrollHandler, { once: true });
            }
            // Cleanup function
            el._cleanup = function () {
                if (scrollHandler) {
                    document.removeEventListener('scroll', scrollHandler);
                }
                if (timer) {
                    clearTimeout(timer);
                }
            };
            return el;
        }
        // Instance API
        var instance = {
            get status() {
                return _status;
            },
            accept: function () {
                handleConsent(true);
            },
            reject: function () {
                handleConsent(false);
            },
            show: function () {
                if (!banner && _status === null) {
                    banner = createBannerElement();
                }
            },
            hide: function () {
                if (banner) {
                    if (banner._cleanup)
                        banner._cleanup();
                    banner.remove();
                    banner = null;
                }
            },
            destroy: function (clearCookie) {
                if (clearCookie === void 0) { clearCookie = false; }
                this.hide();
                var style = document.getElementById(styleId);
                if (style)
                    style.remove();
                if (clearCookie) {
                    deleteConsent(cookieName);
                    _status = null;
                }
            },
            isVisible: function () {
                return banner !== null;
            },
        };
        return instance;
    }
    // ============================================================================
    // Legacy Global API (for CDN/script tag usage)
    // ============================================================================
    /**
     * Initialize with legacy global API (window.CookieBanner)
     * Called automatically when loaded via script tag
     */
    function initLegacy() {
        if (!isBrowser)
            return null;
        var config = window.CookieBannerConfig || {};
        var instance = createCookieBanner(config);
        // Show banner if no consent yet
        if (instance.status === null) {
            // Wait for DOM if loading
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function () { return instance.show(); });
            }
            else {
                instance.show();
            }
        }
        // Legacy API
        var legacyApi = {
            get ok() {
                return instance.status;
            },
            yes: function () {
                instance.accept();
            },
            no: function () {
                instance.reject();
            },
            reset: function () {
                instance.destroy(true);
                location.reload();
            },
            destroy: function () {
                instance.destroy();
            },
        };
        window.CookieBanner = legacyApi;
        return legacyApi;
    }
    // ============================================================================
    // Auto-initialization for script tag usage
    // ============================================================================
    // Only auto-init if loaded as a script (not imported as module)
    if (isBrowser && typeof window.CookieBannerConfig !== 'undefined') {
        initLegacy();
    }
    // Also check if script has no type="module" attribute
    if (isBrowser && document.currentScript && !document.currentScript.hasAttribute('type')) {
        initLegacy();
    }
});
