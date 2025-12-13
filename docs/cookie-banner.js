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
    else {
        // Browser globals - THIS WAS MISSING!
        var exports = {};
        factory(function(){}, exports);
        // Expose key functions globally
        if (typeof window !== 'undefined') {
            window.createCookieBanner = exports.createCookieBanner;
            window.setup = exports.setup;
            window.CookieBannerModule = exports;
            // Auto-initialize if config is set or script tag without type
            if (typeof window.CookieBannerConfig !== 'undefined' ||
                (document.currentScript && !document.currentScript.hasAttribute('type'))) {
                exports.setup();
            }
        }
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DEFAULT_CSS = exports.DEFAULT_CATEGORIES = void 0;
    exports.sanitizeCss = sanitizeCss;
    exports.sanitizeUrl = sanitizeUrl;
    exports.sanitizeInlineStyle = sanitizeInlineStyle;
    exports.validateConfig = validateConfig;
    exports.isEU = isEU;
    exports.getConsent = getConsent;
    exports.setConsent = setConsent;
    exports.deleteConsent = deleteConsent;
    exports.parseGranularConsent = parseGranularConsent;
    exports.encodeGranularConsent = encodeGranularConsent;
    exports.createCookieBanner = createCookieBanner;
    exports.setup = setup;
    /** Default categories for GDPR mode */
    exports.DEFAULT_CATEGORIES = [
        { id: 'essential', name: 'Essential', description: 'Required for the website to function', required: true },
        { id: 'analytics', name: 'Analytics', description: 'Help us understand how visitors use our site' },
        { id: 'marketing', name: 'Marketing', description: 'Used to deliver relevant ads' },
        { id: 'functional', name: 'Functional', description: 'Enable enhanced features and personalization' },
    ];
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
    exports.DEFAULT_CSS = "#ckb{position:var(--ckb-position,fixed);bottom:var(--ckb-bottom,0);top:var(--ckb-top,auto);left:var(--ckb-left,0);right:var(--ckb-right,0);padding:var(--ckb-padding,12px 16px);background:var(--ckb-bg,#222);color:var(--ckb-color,#fff);font:var(--ckb-font,14px/1.4 system-ui,sans-serif);display:flex;align-items:center;gap:var(--ckb-gap,12px);z-index:var(--ckb-z,9999);flex-wrap:wrap}#ckb:focus{outline:2px solid var(--ckb-focus-color,#4299e1);outline-offset:2px}#ckb p{margin:0;flex:1;min-width:200px}#ckb a{color:inherit}#ckb button{min-height:44px;min-width:44px;padding:var(--ckb-btn-padding,10px 20px);border:var(--ckb-btn-border,none);border-radius:var(--ckb-btn-radius,4px);background:var(--ckb-btn-bg,#fff);color:var(--ckb-btn-color,#222);font:inherit;cursor:pointer;touch-action:manipulation}#ckb button:focus{outline:2px solid var(--ckb-focus-color,#4299e1);outline-offset:2px}#ckb button:hover{opacity:0.9}#ckb #ckn{background:var(--ckb-reject-bg,transparent);color:var(--ckb-reject-color,inherit);border:var(--ckb-reject-border,1px solid currentColor)}#ckb #cks{background:var(--ckb-settings-bg,transparent);color:var(--ckb-settings-color,inherit);border:var(--ckb-settings-border,1px solid currentColor)}#ckb-cats{display:none;width:100%;padding:12px 0;border-top:1px solid rgba(255,255,255,0.2);margin-top:8px}#ckb.expanded #ckb-cats{display:block}#ckb-cats label{display:flex;align-items:flex-start;gap:10px;padding:8px 0;cursor:pointer}#ckb-cats input[type=checkbox]{width:20px;height:20px;margin:2px 0;accent-color:var(--ckb-btn-bg,#fff)}#ckb-cats .cat-info{flex:1}#ckb-cats .cat-name{font-weight:600}#ckb-cats .cat-desc{font-size:12px;opacity:0.8;margin-top:2px}#ckb-cats .cat-req{opacity:0.6;font-size:11px}@media(prefers-reduced-motion:reduce){#ckb,#ckb *{transition:none!important;animation:none!important}}";
    // ============================================================================
    // SSR Safety
    // ============================================================================
    var isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
    // ============================================================================
    // CSS Sanitization (Security)
    // ============================================================================
    /**
     * Decode CSS unicode escape sequences to prevent obfuscation bypasses
     * E.g., \75\72\6C = url
     */
    function decodeCssUnicodeEscapes(css) {
        return css.replace(/\\([0-9a-fA-F]{1,6})\s?/g, function (_match, hex) {
            var charCode = parseInt(hex, 16);
            // Only decode valid characters, block null bytes
            if (charCode === 0 || charCode > 0x10FFFF)
                return '';
            return String.fromCodePoint(charCode);
        });
    }
    /**
     * Sanitize CSS to prevent injection attacks
     * Blocks: @import, url() with external URLs, expression(), behavior:, -moz-binding, HTML tags
     */
    function sanitizeCss(css) {
        if (!css)
            return '';
        // Limit length to prevent ReDoS
        if (css.length > 50000) {
            css = css.slice(0, 50000);
        }
        var sanitized = css;
        // FIRST: Decode unicode escapes to prevent obfuscation bypasses
        sanitized = decodeCssUnicodeEscapes(sanitized);
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
        // Sanitize url() - only allow safe data:image URIs (not SVG which can contain scripts)
        sanitized = sanitized.replace(/url\s*\(\s*(['"]?)([^'")\s]+)\1\s*\)/gi, function (match, _quote, url) {
            var trimmedUrl = url.trim().toLowerCase();
            // Block SVG which can contain embedded scripts
            if (trimmedUrl.includes('svg')) {
                return '';
            }
            // Only allow safe raster image formats
            if (trimmedUrl.startsWith('data:image/png') ||
                trimmedUrl.startsWith('data:image/jpeg') ||
                trimmedUrl.startsWith('data:image/jpg') ||
                trimmedUrl.startsWith('data:image/gif') ||
                trimmedUrl.startsWith('data:image/webp')) {
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
     * Sanitize URLs to prevent javascript: XSS and phishing
     * Only allows http:, https:, and relative URLs
     */
    function sanitizeUrl(url) {
        if (!url)
            return '';
        var trimmed = url.trim();
        var lower = trimmed.toLowerCase();
        // Allow http/https URLs
        if (lower.startsWith('http://') || lower.startsWith('https://')) {
            return trimmed;
        }
        // Allow relative URLs
        if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
            return trimmed;
        }
        // Allow anchor links
        if (trimmed.startsWith('#')) {
            return trimmed;
        }
        // Block everything else (javascript:, data:, vbscript:, file:, etc.)
        return '';
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
        for (var i = 0; i < EU_OFFSETS.length; i++) {
            if (EU_OFFSETS[i] === offset)
                return true;
        }
        return false;
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
     * Parse granular consent from cookie value
     * Format: "cat1:1,cat2:0,cat3:1" or legacy "1"/"0"
     */
    function parseGranularConsent(value, categories) {
        if (!value)
            return null;
        // Legacy format: "1" = all accepted, "0" = all rejected
        if (value === '1' || value === '0') {
            var allEnabled = value === '1';
            if (!categories || categories.length === 0) {
                return { all: allEnabled };
            }
            var state_1 = {};
            for (var _i = 0, categories_1 = categories; _i < categories_1.length; _i++) {
                var cat = categories_1[_i];
                state_1[cat.id] = cat.required ? true : allEnabled;
            }
            return state_1;
        }
        // Granular format: "essential:1,analytics:0,marketing:0"
        var state = {};
        var parts = value.split(',');
        for (var _a = 0, parts_1 = parts; _a < parts_1.length; _a++) {
            var part = parts_1[_a];
            var _b = part.split(':'), id = _b[0], val = _b[1];
            if (id && val !== undefined) {
                state[id] = val === '1';
            }
        }
        return state;
    }
    /**
     * Encode granular consent to cookie value
     */
    function encodeGranularConsent(state) {
        var parts = [];
        var keys = Object.keys(state);
        for (var i = 0; i < keys.length; i++) {
            var id = keys[i];
            var enabled = state[id];
            parts.push(id + ':' + (enabled ? '1' : '0'));
        }
        return parts.join(',');
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
    // Track active instance for singleton behavior
    var _activeInstance = null;
    /**
     * Create a new cookie banner instance
     * Framework-friendly: no global state, proper cleanup, SSR-safe
     *
     * By default, prevents duplicate banners. Set `config.allowMultiple = true` to override.
     */
    function createCookieBanner(config) {
        var _a;
        if (config === void 0) { config = {}; }
        // SSR: return no-op instance
        if (!isBrowser) {
            return {
                status: null,
                getConsent: function () { return null; },
                getConsentRecord: function () { return null; },
                hasConsent: function () { return false; },
                accept: function () { },
                reject: function () { },
                show: function () { },
                manage: function () { },
                hide: function () { },
                destroy: function () { },
                isVisible: function () { return false; },
                showWidget: function () { },
                hideWidget: function () { },
            };
        }
        // Singleton: prevent duplicate banners unless explicitly allowed
        if (!config.allowMultiple && _activeInstance) {
            return _activeInstance;
        }
        // Validate configuration
        var validatedConfig = validateConfig(config);
        var cookieName = validatedConfig.cookieName;
        var days = validatedConfig.days;
        var cookieDomain = validatedConfig.cookieDomain;
        var inEU = config.forceEU !== undefined ? config.forceEU : isEU();
        var container = validatedConfig.container || document.body;
        var isGdprMode = config.mode === 'gdpr';
        var categories = config.categories || (isGdprMode ? exports.DEFAULT_CATEGORIES : []);
        var hasCategories = categories.length > 0;
        var banner = null;
        var _status = null;
        var _consentState = null;
        var _consentTimestamp = null;
        var _consentMethod = 'banner';
        var previousActiveElement = null;
        var styleId = "ckb-style-".concat(Math.random().toString(36).slice(2, 8) || 'default');
        var widgetId = "ckb-widget-".concat(Math.random().toString(36).slice(2, 8) || 'default');
        // Check existing consent
        var existing = getConsent(cookieName);
        if (existing !== null) {
            _consentState = parseGranularConsent(existing, categories);
            // For legacy status: true if accepted all or has any non-required category enabled
            if (existing === '1') {
                _status = true;
            }
            else if (existing === '0') {
                _status = false;
            }
            else {
                // Granular: status is true if any non-required category is enabled
                if (_consentState) {
                    _status = false;
                    var stateKeys = Object.keys(_consentState);
                    for (var i = 0; i < stateKeys.length; i++) {
                        var catId = stateKeys[i];
                        var catEnabled = _consentState[catId];
                        if (catEnabled) {
                            // Check if this category is required
                            var isRequired = false;
                            for (var j = 0; j < categories.length; j++) {
                                if (categories[j].id === catId && categories[j].required) {
                                    isRequired = true;
                                    break;
                                }
                            }
                            if (!isRequired) {
                                _status = true;
                                break;
                            }
                        }
                    }
                }
                else {
                    _status = null;
                }
            }
        }
        function handleConsent(accepted) {
            var _a;
            // Record timestamp for audit trail
            _consentTimestamp = new Date().toISOString();
            if (hasCategories) {
                // Build consent state for all categories
                var state = {};
                for (var i = 0; i < categories.length; i++) {
                    var cat = categories[i];
                    state[cat.id] = cat.required ? true : accepted;
                }
                _consentState = state;
                setConsent(encodeGranularConsent(state), cookieName, days, cookieDomain);
            }
            else {
                setConsent(accepted ? '1' : '0', cookieName, days, cookieDomain);
            }
            _status = accepted;
            if (banner) {
                if (banner._cleanup)
                    banner._cleanup();
                banner.remove();
                banner = null;
            }
            // Show widget if enabled after consent is given
            if ((_a = config.widget) === null || _a === void 0 ? void 0 : _a.enabled) {
                createWidget();
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
            // Call onConsent with granular state and record
            if (hasCategories && typeof config.onConsent === 'function') {
                try {
                    var record = {
                        state: _consentState,
                        timestamp: _consentTimestamp,
                        policyVersion: config.policyVersion,
                        method: _consentMethod,
                    };
                    config.onConsent(_consentState, record);
                }
                catch (error) {
                    console.error('Cookie banner onConsent callback error:', error);
                }
            }
        }
        function handleGranularConsent(state) {
            var _a;
            // Record timestamp for audit trail
            _consentTimestamp = new Date().toISOString();
            _consentState = state;
            setConsent(encodeGranularConsent(state), cookieName, days, cookieDomain);
            // Check if any non-required category is enabled
            var hasNonRequiredEnabled = false;
            var stateKeys = Object.keys(state);
            for (var i = 0; i < stateKeys.length; i++) {
                var catId = stateKeys[i];
                var catEnabled = state[catId];
                if (catEnabled) {
                    // Check if this category is required
                    var isRequired = false;
                    for (var j = 0; j < categories.length; j++) {
                        if (categories[j].id === catId && categories[j].required) {
                            isRequired = true;
                            break;
                        }
                    }
                    if (!isRequired) {
                        hasNonRequiredEnabled = true;
                        break;
                    }
                }
            }
            _status = hasNonRequiredEnabled;
            if (banner) {
                if (banner._cleanup)
                    banner._cleanup();
                banner.remove();
                banner = null;
            }
            // Show widget if enabled after consent is given
            if ((_a = config.widget) === null || _a === void 0 ? void 0 : _a.enabled) {
                createWidget();
            }
            if (previousActiveElement && previousActiveElement instanceof HTMLElement) {
                previousActiveElement.focus();
            }
            if (typeof config.onConsent === 'function') {
                try {
                    var record = {
                        state: state,
                        timestamp: _consentTimestamp,
                        policyVersion: config.policyVersion,
                        method: _consentMethod,
                    };
                    config.onConsent(state, record);
                }
                catch (error) {
                    console.error('Cookie banner onConsent callback error:', error);
                }
            }
        }
        function createBannerElement(startExpanded) {
            if (startExpanded === void 0) { startExpanded = false; }
            // Failsafe: remove any existing banner to prevent duplicates
            var existing = document.getElementById('ckb');
            if (existing) {
                existing.remove();
            }
            // Inject sanitized styles
            var customCss = config.css ? sanitizeCss(config.css) : '';
            injectStyles(styleId, exports.DEFAULT_CSS + customCss, config.cspNonce);
            var el = document.createElement('div');
            el.id = 'ckb';
            // ARIA attributes for accessibility
            el.setAttribute('role', 'dialog');
            el.setAttribute('aria-label', config.bannerAriaLabel || 'Cookie consent');
            el.setAttribute('aria-modal', 'true');
            el.setAttribute('tabindex', '-1');
            // RTL support - set dir attribute if specified
            if (config.dir) {
                el.setAttribute('dir', config.dir);
            }
            // Apply sanitized inline styles
            if (config.style) {
                el.style.cssText = sanitizeInlineStyle(config.style);
            }
            // Generate unique ID for message
            var msgId = "ckb-msg-".concat(Math.random().toString(36).slice(2, 8));
            el.setAttribute('aria-describedby', msgId);
            var msg = escapeHtml(config.msg || 'Cookies help us deliver our services.');
            var acceptText = escapeHtml(config.acceptText || 'Accept All');
            var rejectText = escapeHtml(config.rejectText || 'Reject All');
            var settingsText = escapeHtml(config.settingsText || 'Customize');
            var saveText = escapeHtml(config.saveText || 'Save Preferences');
            var privacyText = escapeHtml(config.privacyPolicyText || 'Privacy Policy');
            // Build privacy policy link if URL provided (sanitize to prevent javascript: XSS)
            var sanitizedPrivacyUrl = sanitizeUrl(config.privacyPolicyUrl || '');
            var privacyLink = sanitizedPrivacyUrl
                ? " <a href=\"".concat(escapeHtml(sanitizedPrivacyUrl), "\" target=\"_blank\" rel=\"noopener\">").concat(privacyText, "</a>")
                : '';
            // Build HTML based on mode
            var html = "<p id=\"".concat(msgId, "\">").concat(msg).concat(privacyLink, "</p>");
            if (hasCategories) {
                // GDPR mode: Settings button + categories panel + Accept All / Reject All / Save
                var cats = categories;
                // Build categories HTML
                var catsHtml = '<div id="ckb-cats">';
                for (var c = 0; c < cats.length; c++) {
                    var cat = cats[c];
                    var isRequired = cat.required === true;
                    var isChecked = _consentState
                        ? _consentState[cat.id] === true
                        : (isRequired || cat.defaultEnabled === true);
                    var checkedAttr = isChecked ? ' checked' : '';
                    var disabledAttr = isRequired ? ' disabled' : '';
                    var requiredLabelText = escapeHtml(config.requiredLabel || '(Required)');
                    var requiredLabel = isRequired ? '<span class="cat-req">' + requiredLabelText + '</span>' : '';
                    var desc = cat.description ? '<div class="cat-desc">' + escapeHtml(cat.description) + '</div>' : '';
                    catsHtml += '<label>' +
                        '<input type="checkbox" name="ckb-cat" value="' + escapeHtml(cat.id) + '"' + checkedAttr + disabledAttr + '>' +
                        '<div class="cat-info">' +
                        '<div class="cat-name">' + escapeHtml(cat.name) + ' ' + requiredLabel + '</div>' +
                        desc +
                        '</div>' +
                        '</label>';
                }
                catsHtml += '</div>';
                html += catsHtml;
                html += "<button type=\"button\" id=\"cks\">".concat(settingsText, "</button>");
                html += "<button type=\"button\" id=\"cksv\" style=\"display:none\">".concat(saveText, "</button>");
                html += inEU ? "<button type=\"button\" id=\"ckn\">".concat(rejectText, "</button>") : '';
                html += "<button type=\"button\" id=\"cky\">".concat(acceptText, "</button>");
            }
            else {
                // Minimal mode: simple Accept/Reject
                var minimalRejectText = escapeHtml(config.rejectText || '\u2717');
                html += inEU ? "<button type=\"button\" id=\"ckn\">".concat(minimalRejectText, "</button>") : '';
                html += "<button type=\"button\" id=\"cky\">".concat(escapeHtml(config.acceptText || 'OK'), "</button>");
            }
            // Set innerHTML BEFORE appending to DOM to prevent reflow
            el.innerHTML = html;
            // Start expanded if requested (for manage())
            if (startExpanded && hasCategories) {
                el.classList.add('expanded');
                var saveBtn = el.querySelector('#cksv');
                var settingsBtn = el.querySelector('#cks');
                if (saveBtn)
                    saveBtn.style.display = '';
                if (settingsBtn)
                    settingsBtn.style.display = 'none';
            }
            // NOW append to container (after innerHTML is set)
            container.appendChild(el);
            // Store previous focus and move focus to banner
            previousActiveElement = document.activeElement;
            el.focus();
            // Event handlers
            var acceptEl = el.querySelector('#cky');
            var rejectEl = el.querySelector('#ckn');
            var settingsEl = el.querySelector('#cks');
            var saveEl = el.querySelector('#cksv');
            var handleAcceptClick = function () { return handleConsent(true); };
            var handleRejectClick = function () { return handleConsent(false); };
            var handleSettingsClick = function () {
                el.classList.toggle('expanded');
                var isExpanded = el.classList.contains('expanded');
                if (saveEl)
                    saveEl.style.display = isExpanded ? '' : 'none';
                if (settingsEl)
                    settingsEl.style.display = isExpanded ? 'none' : '';
            };
            var handleSaveClick = function () {
                // Gather checkbox states
                var state = {};
                var cats = categories.length > 0 ? categories : exports.DEFAULT_CATEGORIES;
                var checkboxes = el.querySelectorAll('input[name="ckb-cat"]');
                for (var c = 0; c < checkboxes.length; c++) {
                    var checkbox = checkboxes[c];
                    state[checkbox.value] = checkbox.checked;
                }
                // Ensure required categories are always true
                for (var c = 0; c < cats.length; c++) {
                    if (cats[c].required) {
                        state[cats[c].id] = true;
                    }
                }
                handleGranularConsent(state);
            };
            if (acceptEl) {
                acceptEl.addEventListener('click', handleAcceptClick);
            }
            if (rejectEl) {
                rejectEl.addEventListener('click', handleRejectClick);
            }
            if (settingsEl) {
                settingsEl.addEventListener('click', handleSettingsClick);
            }
            if (saveEl) {
                saveEl.addEventListener('click', handleSaveClick);
            }
            // Keyboard navigation
            var handleKeydown = function (e) {
                if (e.key === 'Escape') {
                    // ESC dismisses - reject in EU mode, accept in non-EU mode
                    handleConsent(!inEU);
                }
                else if (e.key === 'Tab') {
                    // Focus trap
                    var focusableElements = el.querySelectorAll('button:not([style*="display: none"]):not([style*="display:none"]), input, a');
                    var firstElement = focusableElements[0];
                    var lastElement = focusableElements[focusableElements.length - 1];
                    if (firstElement && lastElement) {
                        if (e.shiftKey && document.activeElement === firstElement) {
                            e.preventDefault();
                            lastElement.focus();
                        }
                        else if (!e.shiftKey && document.activeElement === lastElement) {
                            e.preventDefault();
                            firstElement.focus();
                        }
                    }
                }
            };
            document.addEventListener('keydown', handleKeydown);
            // Non-EU: auto-accept (only in minimal mode)
            var timer = null;
            var scrollHandler = null;
            if (!inEU && !hasCategories) {
                var timeout = validatedConfig.autoAcceptDelay;
                var autoAccept_1 = function () {
                    handleConsent(true);
                };
                if (timeout > 0) {
                    timer = setTimeout(autoAccept_1, timeout);
                }
                // Only add scroll listener if explicitly enabled (default: false)
                if (config.autoAcceptOnScroll) {
                    scrollHandler = function () {
                        if (timer)
                            clearTimeout(timer);
                        autoAccept_1();
                    };
                    document.addEventListener('scroll', scrollHandler, { once: true });
                }
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
                if (settingsEl) {
                    settingsEl.removeEventListener('click', handleSettingsClick);
                }
                if (saveEl) {
                    saveEl.removeEventListener('click', handleSaveClick);
                }
            };
            return el;
        }
        // Create consent management widget
        function createWidget() {
            // Don't create if one already exists
            if (document.getElementById(widgetId))
                return;
            var widgetConfig = config.widget || {};
            var position = widgetConfig.position || 'bottom-left';
            var text = widgetConfig.text || '🍪';
            var ariaLabel = widgetConfig.ariaLabel || 'Manage cookie preferences';
            var widget = document.createElement('button');
            widget.id = widgetId;
            widget.type = 'button';
            widget.setAttribute('aria-label', ariaLabel);
            widget.textContent = text;
            // Widget styles
            var posStyles = position === 'bottom-right'
                ? 'right:16px;left:auto;'
                : 'left:16px;right:auto;';
            widget.style.cssText = "\n      position:fixed;\n      bottom:16px;\n      ".concat(posStyles, "\n      width:48px;\n      height:48px;\n      border-radius:50%;\n      border:none;\n      background:var(--ckb-btn-bg,#222);\n      color:var(--ckb-btn-color,#fff);\n      font-size:20px;\n      cursor:pointer;\n      z-index:var(--ckb-z,9998);\n      box-shadow:0 2px 8px rgba(0,0,0,0.2);\n      display:flex;\n      align-items:center;\n      justify-content:center;\n      transition:transform 0.2s ease;\n    ").replace(/\s+/g, '');
            widget.addEventListener('mouseenter', function () {
                widget.style.transform = 'scale(1.1)';
            });
            widget.addEventListener('mouseleave', function () {
                widget.style.transform = 'scale(1)';
            });
            widget.addEventListener('click', function () {
                _consentMethod = 'widget';
                instance.manage();
            });
            container.appendChild(widget);
        }
        // Instance API
        var instance = {
            get status() {
                return _status;
            },
            getConsent: function () {
                return _consentState;
            },
            hasConsent: function (categoryId) {
                if (!_consentState)
                    return false;
                return _consentState[categoryId] === true;
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
            manage: function () {
                // Remove existing banner if present
                if (banner) {
                    if (banner._cleanup)
                        banner._cleanup();
                    banner.remove();
                    banner = null;
                }
                // Show banner in expanded mode for managing consent
                banner = createBannerElement(true);
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
                this.hideWidget();
                var style = document.getElementById(styleId);
                if (style)
                    style.remove();
                if (clearCookie) {
                    deleteConsent(cookieName, cookieDomain);
                    _status = null;
                    _consentState = null;
                }
                // Clear singleton reference
                if (_activeInstance === instance) {
                    _activeInstance = null;
                }
            },
            isVisible: function () {
                return banner !== null;
            },
            getConsentRecord: function () {
                if (!_consentState)
                    return null;
                return {
                    state: _consentState,
                    timestamp: _consentTimestamp || new Date().toISOString(),
                    policyVersion: config.policyVersion,
                    method: _consentMethod || 'banner',
                };
            },
            showWidget: function () {
                createWidget();
            },
            hideWidget: function () {
                var existingWidget = document.getElementById(widgetId);
                if (existingWidget) {
                    existingWidget.remove();
                }
            },
        };
        // Create widget if enabled
        if (((_a = config.widget) === null || _a === void 0 ? void 0 : _a.enabled) && _status !== null) {
            createWidget();
        }
        // Set singleton reference (unless allowMultiple)
        if (!config.allowMultiple) {
            _activeInstance = instance;
        }
        return instance;
    }
    // ============================================================================
    // Legacy Global API (for CDN/script tag usage)
    // ============================================================================
    /**
     * Set up the global window.CookieBanner API
     * Called automatically when loaded via script tag
     */
    function setup() {
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
        setup();
    }
    // Only auto-init if loaded as a script (not imported as module)
    if (isBrowser &&
        (typeof window.CookieBannerConfig !== 'undefined' ||
            (document.currentScript && document.currentScript.getAttribute('type') !== 'module'))) {
        autoInit();
    }
});
