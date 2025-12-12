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
 * - WCAG 2.1 AA accessible
 * - CSP nonce support
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
    exports.sanitizeCss = sanitizeCss;
    exports.sanitizeInlineStyle = sanitizeInlineStyle;
    exports.validateConfig = validateConfig;
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
    var MAX_COOKIE_DAYS = 3650; // 10 years max
    var MAX_AUTO_ACCEPT_DELAY = 300000; // 5 minutes max
    var DEFAULT_DAYS = 365;
    var DEFAULT_AUTO_ACCEPT_DELAY = 5000;
    var COOKIE_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;
    var DOMAIN_REGEX = /^\.?[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z0-9][a-zA-Z0-9-]*)*$/;
    /** Default CSS - uses CSS custom properties for easy overrides */
    /** Includes WCAG 2.1 AA compliant touch targets (44x44px min) */
    exports.DEFAULT_CSS = "#ckb{position:var(--ckb-position,fixed);bottom:var(--ckb-bottom,0);top:var(--ckb-top,auto);left:var(--ckb-left,0);right:var(--ckb-right,0);padding:var(--ckb-padding,12px 16px);background:var(--ckb-bg,#222);color:var(--ckb-color,#fff);font:var(--ckb-font,14px/1.4 system-ui,sans-serif);display:flex;align-items:center;gap:var(--ckb-gap,12px);z-index:var(--ckb-z,9999);flex-wrap:wrap}#ckb:focus{outline:2px solid var(--ckb-focus-color,#4299e1);outline-offset:2px}#ckb p{margin:0;flex:1;min-width:200px}#ckb button{min-height:44px;min-width:44px;padding:var(--ckb-btn-padding,10px 20px);border:var(--ckb-btn-border,none);border-radius:var(--ckb-btn-radius,4px);background:var(--ckb-btn-bg,#fff);color:var(--ckb-btn-color,#222);font:inherit;cursor:pointer;touch-action:manipulation}#ckb button:focus{outline:2px solid var(--ckb-focus-color,#4299e1);outline-offset:2px}#ckb button:hover{opacity:0.9}#ckb #ckn{background:var(--ckb-reject-bg,transparent);color:var(--ckb-reject-color,inherit);border:var(--ckb-reject-border,1px solid currentColor)}@media(prefers-reduced-motion:reduce){#ckb,#ckb *{transition:none!important;animation:none!important}}";
    // ============================================================================
    // SSR Safety
    // ============================================================================
    var isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
    // ============================================================================
    // CSS Sanitization (Security)
    // ============================================================================
    /**
     * Sanitize CSS to prevent injection attacks
     * Blocks: @import, url() with external URLs, expression(), behavior:, -moz-binding, HTML tags
     */
    function sanitizeCss(css) {
        if (!css)
            return '';
        var sanitized = css;
        // Remove HTML tags (style tag breakout prevention)
        sanitized = sanitized.replace(/<[^>]*>/g, '');
        // Remove @import (case-insensitive, handles whitespace obfuscation)
        sanitized = sanitized.replace(/@\s*i\s*m\s*p\s*o\s*r\s*t\b[^;]*(;|$)/gi, '');
        // Remove expression() - IE CSS expression (case-insensitive)
        sanitized = sanitized.replace(/e\s*x\s*p\s*r\s*e\s*s\s*s\s*i\s*o\s*n\s*\([^)]*\)/gi, '');
        // Remove behavior: property (IE)
        sanitized = sanitized.replace(/behavior\s*:[^;]*(;|$)/gi, '');
        // Remove -moz-binding (Firefox XBL)
        sanitized = sanitized.replace(/-moz-binding\s*:[^;]*(;|$)/gi, '');
        // Sanitize url() - only allow data:image URIs
        sanitized = sanitized.replace(/url\s*\(\s*(['"]?)([^'")\s]+)\1\s*\)/gi, function (match, _quote, url) {
            var trimmedUrl = url.trim().toLowerCase();
            // Allow data:image URIs
            if (trimmedUrl.startsWith('data:image/')) {
                return match;
            }
            // Block everything else (javascript:, external URLs, etc.)
            return '';
        });
        // Remove javascript: protocol
        sanitized = sanitized.replace(/javascript\s*:/gi, '');
        return sanitized;
    }
    /**
     * Sanitize inline styles (more restrictive than CSS blocks)
     */
    function sanitizeInlineStyle(style) {
        if (!style)
            return '';
        var sanitized = style;
        // Remove url() entirely for inline styles (too risky)
        sanitized = sanitized.replace(/url\s*\([^)]*\)/gi, '');
        // Remove expression()
        sanitized = sanitized.replace(/e\s*x\s*p\s*r\s*e\s*s\s*s\s*i\s*o\s*n\s*\([^)]*\)/gi, '');
        // Remove behavior:
        sanitized = sanitized.replace(/behavior\s*:[^;]*(;|$)/gi, '');
        // Remove -moz-binding
        sanitized = sanitized.replace(/-moz-binding\s*:[^;]*(;|$)/gi, '');
        // Remove javascript:
        sanitized = sanitized.replace(/javascript\s*:/gi, '');
        return sanitized;
    }
    // ============================================================================
    // Input Validation
    // ============================================================================
    /**
     * Validate and sanitize configuration
     * @throws Error if cookieName contains invalid characters
     */
    function validateConfig(config) {
        var validated = __assign(__assign({}, config), { cookieName: 'ck', days: DEFAULT_DAYS, autoAcceptDelay: DEFAULT_AUTO_ACCEPT_DELAY });
        // Validate cookie name (required to be safe - RFC 6265)
        if (config.cookieName !== undefined) {
            if (!config.cookieName || config.cookieName.length === 0) {
                throw new Error('Cookie name cannot be empty');
            }
            if (!COOKIE_NAME_REGEX.test(config.cookieName)) {
                throw new Error('Cookie name contains invalid characters. Use only letters, numbers, underscores, and hyphens.');
            }
            if (config.cookieName.length > 100) {
                throw new Error('Cookie name too long (max 100 characters)');
            }
            validated.cookieName = config.cookieName;
        }
        // Validate days (clamp to safe range)
        if (config.days !== undefined) {
            var days = parseInt(String(config.days), 10);
            if (!isNaN(days) && days > 0) {
                validated.days = Math.min(days, MAX_COOKIE_DAYS);
            }
        }
        // Validate autoAcceptDelay (clamp to safe range)
        if (config.autoAcceptDelay !== undefined) {
            var delay = parseInt(String(config.autoAcceptDelay), 10);
            if (!isNaN(delay) && delay >= 0) {
                validated.autoAcceptDelay = Math.min(delay, MAX_AUTO_ACCEPT_DELAY);
            }
        }
        // Validate container
        if (config.container !== undefined) {
            if (!(config.container instanceof HTMLElement)) {
                validated.container = undefined;
            }
        }
        // Validate cookie domain
        if (config.cookieDomain !== undefined) {
            if (DOMAIN_REGEX.test(config.cookieDomain)) {
                validated.cookieDomain = config.cookieDomain;
            }
            else {
                validated.cookieDomain = undefined;
            }
        }
        return validated;
    }
    // ============================================================================
    // Utility Functions
    // ============================================================================
    /**
     * Escape special regex characters to prevent ReDoS attacks
     */
    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    /**
     * Detect if user is likely in EU based on timezone
     */
    function isEU() {
        if (!isBrowser)
            return false;
        var offset = Math.floor(-new Date().getTimezoneOffset() / 60);
        return EU_OFFSETS.includes(offset);
    }
    /**
     * Get consent value from cookie
     */
    function getConsent(cookieName) {
        if (cookieName === void 0) { cookieName = 'ck'; }
        if (!isBrowser)
            return null;
        var escapedName = escapeRegex(cookieName);
        var match = document.cookie.match(new RegExp('(^|;)\\s*' + escapedName + '=([^;]*)'));
        return match ? match[2] : null;
    }
    /**
     * Set consent cookie
     */
    function setConsent(value, cookieName, days, domain) {
        if (cookieName === void 0) { cookieName = 'ck'; }
        if (days === void 0) { days = DEFAULT_DAYS; }
        if (!isBrowser)
            return;
        // Validate cookie name before setting
        if (!COOKIE_NAME_REGEX.test(cookieName)) {
            throw new Error('Invalid cookie name');
        }
        var date = new Date();
        date.setDate(date.getDate() + Math.min(days, MAX_COOKIE_DAYS));
        var cookie = "".concat(cookieName, "=").concat(value, ";expires=").concat(date.toUTCString(), ";path=/;SameSite=Lax");
        if (domain && DOMAIN_REGEX.test(domain)) {
            cookie += ";Domain=".concat(domain);
        }
        if (typeof location !== 'undefined' && location.protocol === 'https:') {
            cookie += ';Secure';
        }
        document.cookie = cookie;
    }
    /**
     * Delete consent cookie
     */
    function deleteConsent(cookieName, domain) {
        if (cookieName === void 0) { cookieName = 'ck'; }
        if (!isBrowser)
            return;
        var cookie = "".concat(cookieName, "=;expires=Thu,01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax");
        if (domain && DOMAIN_REGEX.test(domain)) {
            cookie += ";Domain=".concat(domain);
        }
        if (typeof location !== 'undefined' && location.protocol === 'https:') {
            cookie += ';Secure';
        }
        document.cookie = cookie;
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
    function injectStyles(id, css, nonce) {
        if (!isBrowser || document.getElementById(id))
            return;
        var style = document.createElement('style');
        style.id = id;
        if (nonce) {
            style.setAttribute('nonce', nonce);
        }
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
        // Validate configuration
        var validatedConfig = validateConfig(config);
        var cookieName = validatedConfig.cookieName;
        var days = validatedConfig.days;
        var cookieDomain = validatedConfig.cookieDomain;
        var inEU = config.forceEU !== undefined ? config.forceEU : isEU();
        var container = validatedConfig.container || document.body;
        var banner = null;
        var _status = null;
        var previousActiveElement = null;
        var styleId = "ckb-style-".concat(Math.random().toString(36).slice(2, 8) || 'default');
        // Check existing consent
        var existing = getConsent(cookieName);
        if (existing !== null) {
            _status = existing === '1';
        }
        function handleConsent(accepted) {
            setConsent(accepted ? '1' : '0', cookieName, days, cookieDomain);
            _status = accepted;
            if (banner) {
                if (banner._cleanup)
                    banner._cleanup();
                banner.remove();
                banner = null;
            }
            // Restore focus to previous element
            if (previousActiveElement && previousActiveElement instanceof HTMLElement) {
                previousActiveElement.focus();
            }
            var callback = accepted
                ? (config.onAccept || config.onYes)
                : (config.onReject || config.onNo);
            if (typeof callback === 'function') {
                try {
                    callback();
                }
                catch (error) {
                    console.error('Cookie banner callback error:', error);
                }
            }
        }
        function createBannerElement() {
            // Inject sanitized styles
            var customCss = config.css ? sanitizeCss(config.css) : '';
            injectStyles(styleId, exports.DEFAULT_CSS + customCss, config.cspNonce);
            var el = document.createElement('div');
            el.id = 'ckb';
            // ARIA attributes for accessibility
            el.setAttribute('role', 'dialog');
            el.setAttribute('aria-label', 'Cookie consent');
            el.setAttribute('aria-modal', 'true');
            el.setAttribute('tabindex', '-1');
            // Apply sanitized inline styles
            if (config.style) {
                el.style.cssText = sanitizeInlineStyle(config.style);
            }
            // Generate unique ID for message
            var msgId = "ckb-msg-".concat(Math.random().toString(36).slice(2, 8));
            el.setAttribute('aria-describedby', msgId);
            var msg = escapeHtml(config.msg || 'Cookies help us deliver our services.');
            var acceptText = escapeHtml(config.acceptText || 'OK');
            var rejectText = escapeHtml(config.rejectText || '\u2717');
            var rejectBtn = inEU ? "<button type=\"button\" id=\"ckn\">".concat(rejectText, "</button>") : '';
            // Set innerHTML BEFORE appending to DOM to prevent reflow
            el.innerHTML = "<p id=\"".concat(msgId, "\">").concat(msg, "</p>").concat(rejectBtn, "<button type=\"button\" id=\"cky\">").concat(acceptText, "</button>");
            // NOW append to container (after innerHTML is set)
            container.appendChild(el);
            // Store previous focus and move focus to banner
            previousActiveElement = document.activeElement;
            el.focus();
            // Event handlers
            var acceptEl = el.querySelector('#cky');
            var rejectEl = el.querySelector('#ckn');
            var handleAcceptClick = function () { return handleConsent(true); };
            var handleRejectClick = function () { return handleConsent(false); };
            if (acceptEl) {
                acceptEl.addEventListener('click', handleAcceptClick);
            }
            if (rejectEl) {
                rejectEl.addEventListener('click', handleRejectClick);
            }
            // Keyboard navigation
            var handleKeydown = function (e) {
                if (e.key === 'Escape') {
                    // ESC dismisses - reject in EU mode, accept in non-EU mode
                    handleConsent(!inEU);
                }
                else if (e.key === 'Tab') {
                    // Focus trap
                    var focusableElements = el.querySelectorAll('button');
                    var firstElement = focusableElements[0];
                    var lastElement = focusableElements[focusableElements.length - 1];
                    if (e.shiftKey && document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                    else if (!e.shiftKey && document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            };
            document.addEventListener('keydown', handleKeydown);
            // Non-EU: auto-accept
            var timer = null;
            var scrollHandler = null;
            if (!inEU) {
                var timeout = validatedConfig.autoAcceptDelay;
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
                document.removeEventListener('keydown', handleKeydown);
                if (scrollHandler) {
                    document.removeEventListener('scroll', scrollHandler);
                }
                if (timer) {
                    clearTimeout(timer);
                }
                if (acceptEl) {
                    acceptEl.removeEventListener('click', handleAcceptClick);
                }
                if (rejectEl) {
                    rejectEl.removeEventListener('click', handleRejectClick);
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
                    // Restore focus
                    if (previousActiveElement && previousActiveElement instanceof HTMLElement) {
                        previousActiveElement.focus();
                    }
                }
            },
            destroy: function (clearCookie) {
                if (clearCookie === void 0) { clearCookie = false; }
                this.hide();
                var style = document.getElementById(styleId);
                if (style)
                    style.remove();
                if (clearCookie) {
                    deleteConsent(cookieName, cookieDomain);
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
                if (typeof location !== 'undefined') {
                    location.reload();
                }
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
    // Track if already initialized to prevent double-init
    var _initialized = false;
    function autoInit() {
        if (_initialized)
            return;
        _initialized = true;
        initLegacy();
    }
    // Only auto-init if loaded as a script (not imported as module)
    if (isBrowser &&
        (typeof window.CookieBannerConfig !== 'undefined' ||
            (document.currentScript && !document.currentScript.hasAttribute('type')))) {
        autoInit();
    }
});
