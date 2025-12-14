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
    exports.DEFAULT_CSS = exports.DEFAULT_ABOUT_CONTENT = exports.DEFAULT_CATEGORIES = void 0;
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
    exports.injectStyles = _injectStyles;
    exports._resetSingleton = _resetSingleton;
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
    const EU_OFFSETS = [-1, 0, 1, 2, 3]; // WET, GMT, CET, EET, FET
    const MAX_COOKIE_DAYS = 3650; // 10 years max
    const MAX_AUTO_ACCEPT_DELAY = 300000; // 5 minutes max
    const DEFAULT_DAYS = 365;
    const DEFAULT_AUTO_ACCEPT_DELAY = 5000;
    const COOKIE_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;
    const DOMAIN_REGEX = /^\.?[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z0-9][a-zA-Z0-9-]*)*$/;
    /** Default About tab content - cookie law boilerplate (concise) */
    exports.DEFAULT_ABOUT_CONTENT = `<p>Cookies are small text files stored on your device to improve your experience.</p>
<p>We require your consent for non-essential cookies per GDPR Art. 6. You can change your preferences at any time.</p>
<p style="margin-top:10px;font-size:10px;opacity:0.5">Powered by <a href="https://github.com/DreadfulCode/smallest-cookie-banner" target="_blank" rel="noopener" style="color:inherit">smallest-cookie-banner</a></p>`;
    /** Default CSS - uses CSS custom properties for easy overrides */
    /** Includes WCAG 2.1 AA compliant touch targets (44x44px min) */
    exports.DEFAULT_CSS = `#ckb{position:var(--ckb-position,fixed);bottom:var(--ckb-bottom,0);top:var(--ckb-top,auto);left:var(--ckb-left,0);right:var(--ckb-right,0);padding:var(--ckb-padding,12px 16px);background:var(--ckb-bg,#222);color:var(--ckb-color,#fff);font:var(--ckb-font,14px/1.4 system-ui,sans-serif);display:flex;align-items:center;gap:var(--ckb-gap,12px);z-index:var(--ckb-z,9999);flex-wrap:wrap}#ckb:focus{outline:2px solid var(--ckb-focus-color,#4299e1);outline-offset:2px}#ckb p{margin:0;flex:1;min-width:200px}#ckb a{color:inherit}#ckb button{min-height:44px;min-width:44px;padding:var(--ckb-btn-padding,10px 20px);border:var(--ckb-btn-border,none);border-radius:var(--ckb-btn-radius,4px);background:var(--ckb-btn-bg,#fff);color:var(--ckb-btn-color,#222);font:inherit;cursor:pointer;touch-action:manipulation}#ckb button:focus{outline:2px solid var(--ckb-focus-color,#4299e1);outline-offset:2px}#ckb button:hover{opacity:0.9}#ckb #ckn{background:var(--ckb-reject-bg,transparent);color:var(--ckb-reject-color,inherit);border:var(--ckb-reject-border,1px solid currentColor)}#ckb #cks{background:var(--ckb-settings-bg,transparent);color:var(--ckb-settings-color,inherit);border:var(--ckb-settings-border,1px solid currentColor)}#ckb-cats{display:none;width:100%;padding:12px 0;border-top:1px solid rgba(255,255,255,0.2);margin-top:8px}#ckb.expanded #ckb-cats{display:block}#ckb-cats label{display:flex;align-items:flex-start;gap:10px;padding:8px 0;cursor:pointer}#ckb-cats input[type=checkbox]{width:20px;height:20px;margin:2px 0;accent-color:var(--ckb-btn-bg,#fff)}#ckb-cats .cat-info{flex:1}#ckb-cats .cat-name{font-weight:600}#ckb-cats .cat-desc{font-size:12px;opacity:0.8;margin-top:2px}#ckb-cats .cat-req{opacity:0.6;font-size:11px}@media(prefers-reduced-motion:reduce){#ckb,#ckb *{transition:none!important;animation:none!important}}` +
        /* Tabbed UI CSS - inline by default, column for toast via CSS var */
        `.ckb-tabs{flex:1;min-width:200px}.ckb-tab-nav{display:inline;font-size:11px;opacity:0.7;margin-right:8px}.ckb-tab-btn{all:unset!important;display:inline!important;background:none!important;border:none!important;color:inherit!important;padding:0!important;margin:0 4px!important;cursor:pointer!important;font-size:11px!important;min-height:0!important;min-width:0!important;text-decoration:none;opacity:0.8}.ckb-tab-btn:hover{text-decoration:underline!important;opacity:1!important}.ckb-tab-btn.active{text-decoration:underline!important;opacity:1!important}.ckb-tab-btn:focus{outline:1px dotted!important}.ckb-tab-btn:first-child{margin-left:0!important}.ckb-tab-panel{display:none}.ckb-tab-panel.active{display:inline}.ckb-tab-panel p{margin:0;font-size:inherit}.ckb-about-content{font-size:12px;line-height:1.4;opacity:0.85}.ckb-about-content p{margin:0}.ckb-tab-panel label{display:flex;align-items:flex-start;gap:8px;padding:6px 0;cursor:pointer}.ckb-tab-panel input[type=checkbox]{width:18px;height:18px;margin:2px 0;accent-color:var(--ckb-btn-bg,#fff);flex-shrink:0}#ckb.tabbed .ckb-buttons{display:contents}#ckb.tabbed.toast{flex-direction:column;align-items:stretch}#ckb.tabbed.toast .ckb-tabs{min-width:auto}#ckb.tabbed.toast .ckb-tab-nav{display:block;margin-bottom:8px;margin-left:-4px}#ckb.tabbed.toast .ckb-tab-panel{display:none}#ckb.tabbed.toast .ckb-tab-panel.active{display:block}#ckb.tabbed.toast .ckb-tab-panel p{margin:0 0 6px}#ckb.tabbed.toast .ckb-about-content p{margin:0 0 6px}#ckb.tabbed.toast .ckb-buttons{display:flex;gap:10px;justify-content:flex-end;margin-top:8px}`;
    // ============================================================================
    // SSR Safety
    // ============================================================================
    const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
    // ============================================================================
    // Web Component Definition
    // ============================================================================
    const COMPONENT_NAME = 'cookie-banner-element';
    /** Custom element for cookie banner with Shadow DOM encapsulation */
    class CookieBannerWebComponent extends HTMLElement {
        constructor() {
            super();
            this._shadow = this.attachShadow({ mode: 'open' });
        }
        get shadowRoot() {
            return this._shadow;
        }
    }
    // Register custom element (only once, only in browser)
    if (isBrowser && typeof customElements !== 'undefined' && !customElements.get(COMPONENT_NAME)) {
        customElements.define(COMPONENT_NAME, CookieBannerWebComponent);
    }
    // ============================================================================
    // CSS Sanitization (Security)
    // ============================================================================
    /**
     * Decode CSS unicode escape sequences to prevent obfuscation bypasses
     * E.g., \75\72\6C = url
     */
    function decodeCssUnicodeEscapes(css) {
        return css.replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_match, hex) => {
            const charCode = parseInt(hex, 16);
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
        let sanitized = css;
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
        sanitized = sanitized.replace(/url\s*\(\s*(['"]?)([^'")\s]+)\1\s*\)/gi, (match, _quote, url) => {
            const trimmedUrl = url.trim().toLowerCase();
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
        const trimmed = url.trim();
        const lower = trimmed.toLowerCase();
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
        let sanitized = style;
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
        const validated = Object.assign(Object.assign({}, config), { cookieName: 'cookie_consent', days: DEFAULT_DAYS, autoAcceptDelay: DEFAULT_AUTO_ACCEPT_DELAY });
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
            const days = parseInt(String(config.days), 10);
            if (!isNaN(days) && days > 0) {
                validated.days = Math.min(days, MAX_COOKIE_DAYS);
            }
        }
        // Validate autoAcceptDelay (clamp to safe range)
        if (config.autoAcceptDelay !== undefined) {
            const delay = parseInt(String(config.autoAcceptDelay), 10);
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
        const offset = Math.floor(-new Date().getTimezoneOffset() / 60);
        for (let i = 0; i < EU_OFFSETS.length; i++) {
            if (EU_OFFSETS[i] === offset)
                return true;
        }
        return false;
    }
    /**
     * Get consent value from cookie
     */
    function getConsent(cookieName = 'cookie_consent') {
        if (!isBrowser)
            return null;
        const escapedName = escapeRegex(cookieName);
        const match = document.cookie.match(new RegExp(`(^|;)\\s*${escapedName}=([^;]*)`));
        return match ? match[2] : null;
    }
    /**
     * Set consent cookie
     */
    function setConsent(value, cookieName = 'cookie_consent', days = DEFAULT_DAYS, domain) {
        if (!isBrowser)
            return;
        // Validate cookie name before setting
        if (!COOKIE_NAME_REGEX.test(cookieName)) {
            throw new Error('Invalid cookie name');
        }
        const date = new Date();
        date.setDate(date.getDate() + Math.min(days, MAX_COOKIE_DAYS));
        let cookie = `${cookieName}=${value};expires=${date.toUTCString()};path=/;SameSite=Lax`;
        if (domain && DOMAIN_REGEX.test(domain)) {
            cookie += `;Domain=${domain}`;
        }
        if (typeof location !== 'undefined' && location.protocol === 'https:') {
            cookie += ';Secure';
        }
        document.cookie = cookie;
    }
    /**
     * Delete consent cookie
     */
    function deleteConsent(cookieName = 'cookie_consent', domain) {
        if (!isBrowser)
            return;
        let cookie = `${cookieName}=;expires=Thu,01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`;
        if (domain && DOMAIN_REGEX.test(domain)) {
            cookie += `;Domain=${domain}`;
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
            const allEnabled = value === '1';
            if (!categories || categories.length === 0) {
                return { all: allEnabled };
            }
            const state = {};
            for (const cat of categories) {
                state[cat.id] = cat.required ? true : allEnabled;
            }
            return state;
        }
        // Granular format: "essential:1,analytics:0,marketing:0"
        const state = {};
        const parts = value.split(',');
        for (const part of parts) {
            const [id, val] = part.split(':');
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
        const parts = [];
        const keys = Object.keys(state);
        for (let i = 0; i < keys.length; i++) {
            const id = keys[i];
            const enabled = state[id];
            parts.push(`${id}:${enabled ? '1' : '0'}`);
        }
        return parts.join(',');
    }
    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(str) {
        if (!isBrowser)
            return str;
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    /**
     * Inject styles (once per ID) - kept for backwards compatibility
     * @internal In v2.0, styles are injected into Shadow DOM instead
     */
    function _injectStyles(id, css, nonce) {
        if (!isBrowser || document.getElementById(id))
            return;
        const style = document.createElement('style');
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
    let _activeInstance = null;
    /**
     * Reset singleton state (for testing only)
     * @internal
     */
    function _resetSingleton() {
        _activeInstance = null;
    }
    /**
     * Create a new cookie banner instance
     * Framework-friendly: no global state, proper cleanup, SSR-safe
     *
     * By default, prevents duplicate banners. Set `config.allowMultiple = true` to override.
     */
    function createCookieBanner(config = {}) {
        var _a;
        // SSR: return no-op instance
        if (!isBrowser) {
            return {
                status: null,
                getConsent: () => null,
                getConsentRecord: () => null,
                hasConsent: () => false,
                accept: () => { },
                reject: () => { },
                show: () => { },
                manage: () => { },
                hide: () => { },
                destroy: () => { },
                isVisible: () => false,
                showWidget: () => { },
                hideWidget: () => { },
            };
        }
        // Singleton: prevent duplicate banners unless explicitly allowed
        if (!config.allowMultiple && _activeInstance) {
            return _activeInstance;
        }
        // Validate configuration
        const validatedConfig = validateConfig(config);
        const cookieName = validatedConfig.cookieName;
        const days = validatedConfig.days;
        const cookieDomain = validatedConfig.cookieDomain;
        const inEU = config.forceEU !== undefined ? config.forceEU : isEU();
        const container = validatedConfig.container || document.body;
        const isGdprMode = config.mode === 'gdpr';
        const categories = config.categories || (isGdprMode ? exports.DEFAULT_CATEGORIES : []);
        const hasCategories = categories.length > 0;
        let banner = null;
        let _status = null;
        let _consentState = null;
        let _consentTimestamp = null;
        let _consentMethod = 'banner';
        let previousActiveElement = null;
        const styleId = `ckb-style-${Math.random().toString(36).slice(2, 8) || 'default'}`;
        const widgetId = `ckb-widget-${Math.random().toString(36).slice(2, 8) || 'default'}`;
        // Check existing consent
        const existing = getConsent(cookieName);
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
                    const stateKeys = Object.keys(_consentState);
                    for (let i = 0; i < stateKeys.length; i++) {
                        const catId = stateKeys[i];
                        const catEnabled = _consentState[catId];
                        if (catEnabled) {
                            // Check if this category is required
                            let isRequired = false;
                            for (let j = 0; j < categories.length; j++) {
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
                const state = {};
                for (let i = 0; i < categories.length; i++) {
                    const cat = categories[i];
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
            const callback = accepted
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
                    const record = {
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
            let hasNonRequiredEnabled = false;
            const stateKeys = Object.keys(state);
            for (let i = 0; i < stateKeys.length; i++) {
                const catId = stateKeys[i];
                const catEnabled = state[catId];
                if (catEnabled) {
                    // Check if this category is required
                    let isRequired = false;
                    for (let j = 0; j < categories.length; j++) {
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
                    const record = {
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
        function createBannerElement(startExpanded = false) {
            var _a, _b, _c, _d, _e, _f;
            // Failsafe: remove any existing banner to prevent duplicates
            const existing = document.querySelector(COMPONENT_NAME);
            if (existing) {
                existing.remove();
            }
            // Create Web Component with Shadow DOM
            const el = document.createElement(COMPONENT_NAME);
            el.id = 'ckb';
            const shadow = el.shadowRoot;
            // Inject styles into Shadow DOM (encapsulated)
            const customCss = config.css ? sanitizeCss(config.css) : '';
            const styleEl = document.createElement('style');
            if (config.cspNonce) {
                styleEl.setAttribute('nonce', config.cspNonce);
            }
            styleEl.textContent = exports.DEFAULT_CSS + customCss;
            shadow.appendChild(styleEl);
            // Create wrapper div inside shadow DOM
            const wrapper = document.createElement('div');
            wrapper.id = 'ckb';
            // ARIA attributes for accessibility
            wrapper.setAttribute('role', 'dialog');
            wrapper.setAttribute('aria-label', config.bannerAriaLabel || 'Cookie consent');
            wrapper.setAttribute('aria-modal', 'true');
            wrapper.setAttribute('tabindex', '-1');
            // RTL support - set dir attribute if specified
            if (config.dir) {
                wrapper.setAttribute('dir', config.dir);
            }
            // Apply sanitized inline styles
            if (config.style) {
                wrapper.style.cssText = sanitizeInlineStyle(config.style);
            }
            // Generate unique ID for message
            const msgId = `ckb-msg-${Math.random().toString(36).slice(2, 8)}`;
            wrapper.setAttribute('aria-describedby', msgId);
            const msg = escapeHtml(config.msg || 'Cookies help us deliver our services.');
            const acceptText = escapeHtml(config.acceptText || 'Accept All');
            const rejectText = escapeHtml(config.rejectText || 'Reject All');
            const settingsText = escapeHtml(config.settingsText || 'Customize');
            const saveText = escapeHtml(config.saveText || 'Save Preferences');
            const privacyText = escapeHtml(config.privacyPolicyText || 'Privacy Policy');
            // Tab configuration - tabs enabled by default (disable with tabs: { enabled: false })
            const tabsEnabled = ((_a = config.tabs) === null || _a === void 0 ? void 0 : _a.enabled) !== false;
            const consentLabel = escapeHtml(((_b = config.tabs) === null || _b === void 0 ? void 0 : _b.consentLabel) || 'Consent');
            const detailsLabel = escapeHtml(((_c = config.tabs) === null || _c === void 0 ? void 0 : _c.detailsLabel) || 'Details');
            const aboutLabel = escapeHtml(((_d = config.tabs) === null || _d === void 0 ? void 0 : _d.aboutLabel) || 'About');
            const aboutContent = ((_e = config.tabs) === null || _e === void 0 ? void 0 : _e.aboutContent) || exports.DEFAULT_ABOUT_CONTENT;
            // Build privacy policy link if URL provided (sanitize to prevent javascript: XSS)
            const sanitizedPrivacyUrl = sanitizeUrl(config.privacyPolicyUrl || '');
            const privacyLink = sanitizedPrivacyUrl
                ? ` <a href="${escapeHtml(sanitizedPrivacyUrl)}" target="_blank" rel="noopener">${privacyText}</a>`
                : '';
            // Build categories HTML (used in both tabbed and non-tabbed modes)
            let catsHtml = '';
            if (hasCategories) {
                const cats = categories;
                catsHtml = tabsEnabled ? '' : '<div id="ckb-cats">';
                for (let c = 0; c < cats.length; c++) {
                    const cat = cats[c];
                    const isRequired = cat.required === true;
                    const isChecked = _consentState
                        ? _consentState[cat.id] === true
                        : (isRequired || cat.defaultEnabled === true);
                    const checkedAttr = isChecked ? ' checked' : '';
                    const disabledAttr = isRequired ? ' disabled' : '';
                    const requiredLabelText = escapeHtml(config.requiredLabel || '(Required)');
                    const requiredLabel = isRequired ? `<span class="cat-req">${requiredLabelText}</span>` : '';
                    const desc = cat.description ? `<div class="cat-desc">${escapeHtml(cat.description)}</div>` : '';
                    const catId = escapeHtml(cat.id);
                    const catName = escapeHtml(cat.name);
                    catsHtml += `<label>
          <input type="checkbox" name="ckb-cat" value="${catId}"${checkedAttr}${disabledAttr}>
          <div class="cat-info">
            <div class="cat-name">${catName} ${requiredLabel}</div>
            ${desc}
          </div>
        </label>`;
                }
                if (!tabsEnabled)
                    catsHtml += '</div>';
            }
            // Build HTML based on mode
            let html = '';
            if (tabsEnabled) {
                // Tabbed UI mode
                wrapper.classList.add('tabbed');
                if ((_f = config.tabs) === null || _f === void 0 ? void 0 : _f.toast) {
                    wrapper.classList.add('toast');
                }
                // Only show Details tab if there are categories (GDPR mode)
                const detailsTab = hasCategories
                    ? `<button type="button" class="ckb-tab-btn" role="tab" aria-selected="false" aria-controls="ckb-panel-details" data-tab="details">${detailsLabel}</button>`
                    : '';
                const detailsPanel = hasCategories
                    ? `<div id="ckb-panel-details" class="ckb-tab-panel" role="tabpanel">${catsHtml}</div>`
                    : '';
                html = `<div class="ckb-tabs">
        <nav class="ckb-tab-nav" role="tablist">
          <button type="button" class="ckb-tab-btn active" role="tab" aria-selected="true" aria-controls="ckb-panel-consent" data-tab="consent">${consentLabel}</button>
          ${detailsTab}
          <button type="button" class="ckb-tab-btn" role="tab" aria-selected="false" aria-controls="ckb-panel-about" data-tab="about">${aboutLabel}</button>
        </nav>
        <div id="ckb-panel-consent" class="ckb-tab-panel active" role="tabpanel">
          <p id="${msgId}">${msg}</p>
        </div>
        ${detailsPanel}
        <div id="ckb-panel-about" class="ckb-tab-panel" role="tabpanel">
          <div class="ckb-about-content">${aboutContent}</div>
          ${sanitizedPrivacyUrl ? `<p><a href="${escapeHtml(sanitizedPrivacyUrl)}" target="_blank" rel="noopener">${privacyText}</a></p>` : ''}
        </div>
      </div>
      <div class="ckb-buttons">
        ${inEU ? `<button type="button" id="ckn">${rejectText}</button>` : ''}
        <button type="button" id="cky">${acceptText}</button>
      </div>`;
            }
            else if (hasCategories) {
                // GDPR mode (non-tabbed): Settings button + categories panel + Accept All / Reject All / Save
                html = `<p id="${msgId}">${msg}${privacyLink}</p>`;
                html += catsHtml;
                html += `<button type="button" id="cks">${settingsText}</button>`;
                html += `<button type="button" id="cksv" style="display:none">${saveText}</button>`;
                html += inEU ? `<button type="button" id="ckn">${rejectText}</button>` : '';
                html += `<button type="button" id="cky">${acceptText}</button>`;
            }
            else {
                // Minimal mode: simple Accept/Reject
                html = `<p id="${msgId}">${msg}${privacyLink}</p>`;
                const minimalRejectText = escapeHtml(config.rejectText || '\u2717');
                html += inEU ? `<button type="button" id="ckn">${minimalRejectText}</button>` : '';
                html += `<button type="button" id="cky">${escapeHtml(config.acceptText || 'OK')}</button>`;
            }
            // Set innerHTML on wrapper inside shadow DOM
            wrapper.innerHTML = html;
            // Start expanded if requested (for manage())
            if (startExpanded && hasCategories) {
                wrapper.classList.add('expanded');
                const saveBtn = shadow.querySelector('#cksv');
                const settingsBtn = shadow.querySelector('#cks');
                if (saveBtn)
                    saveBtn.style.display = '';
                if (settingsBtn)
                    settingsBtn.style.display = 'none';
            }
            // Append wrapper to shadow DOM, then element to container
            shadow.appendChild(wrapper);
            container.appendChild(el);
            // Store previous focus and move focus to banner wrapper
            previousActiveElement = document.activeElement;
            wrapper.focus();
            // Event handlers (query inside shadow DOM)
            const acceptEl = shadow.querySelector('#cky');
            const rejectEl = shadow.querySelector('#ckn');
            const settingsEl = shadow.querySelector('#cks');
            const saveEl = shadow.querySelector('#cksv');
            const handleAcceptClick = () => handleConsent(true);
            const handleRejectClick = () => handleConsent(false);
            const handleSettingsClick = () => {
                wrapper.classList.toggle('expanded');
                const isExpanded = wrapper.classList.contains('expanded');
                if (saveEl)
                    saveEl.style.display = isExpanded ? '' : 'none';
                if (settingsEl)
                    settingsEl.style.display = isExpanded ? 'none' : '';
            };
            const handleSaveClick = () => {
                // Gather checkbox states
                const state = {};
                const cats = categories.length > 0 ? categories : exports.DEFAULT_CATEGORIES;
                const checkboxes = shadow.querySelectorAll('input[name="ckb-cat"]');
                for (let c = 0; c < checkboxes.length; c++) {
                    const checkbox = checkboxes[c];
                    state[checkbox.value] = checkbox.checked;
                }
                // Ensure required categories are always true
                for (let c = 0; c < cats.length; c++) {
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
            // Tab switching (tabbed UI mode)
            if (tabsEnabled) {
                const tabBtns = shadow.querySelectorAll('.ckb-tab-btn');
                const tabPanels = shadow.querySelectorAll('.ckb-tab-panel');
                const handleTabClick = (e) => {
                    const btn = e.currentTarget;
                    const tabId = btn.getAttribute('data-tab');
                    // Update tab buttons
                    for (let t = 0; t < tabBtns.length; t++) {
                        const tabBtn = tabBtns[t];
                        const isActive = tabBtn.getAttribute('data-tab') === tabId;
                        tabBtn.classList.toggle('active', isActive);
                        tabBtn.setAttribute('aria-selected', isActive ? 'true' : 'false');
                    }
                    // Update tab panels
                    for (let p = 0; p < tabPanels.length; p++) {
                        const panel = tabPanels[p];
                        const isActive = panel.id === `ckb-panel-${tabId}`;
                        panel.classList.toggle('active', isActive);
                    }
                };
                for (let t = 0; t < tabBtns.length; t++) {
                    tabBtns[t].addEventListener('click', handleTabClick);
                }
            }
            // Keyboard navigation
            const handleKeydown = (e) => {
                if (e.key === 'Escape') {
                    // ESC dismisses - reject in EU mode, accept in non-EU mode
                    handleConsent(!inEU);
                }
                else if (e.key === 'Tab') {
                    // Focus trap (query inside shadow DOM)
                    const focusableElements = shadow.querySelectorAll('button:not([style*="display: none"]):not([style*="display:none"]), input, a');
                    const firstElement = focusableElements[0];
                    const lastElement = focusableElements[focusableElements.length - 1];
                    // Get active element inside shadow DOM
                    const activeEl = shadow.activeElement || document.activeElement;
                    if (firstElement && lastElement) {
                        if (e.shiftKey && activeEl === firstElement) {
                            e.preventDefault();
                            lastElement.focus();
                        }
                        else if (!e.shiftKey && activeEl === lastElement) {
                            e.preventDefault();
                            firstElement.focus();
                        }
                    }
                }
            };
            document.addEventListener('keydown', handleKeydown);
            // Non-EU: auto-accept (only in minimal mode)
            let timer = null;
            let scrollHandler = null;
            if (!inEU && !hasCategories) {
                const timeout = validatedConfig.autoAcceptDelay;
                const autoAccept = () => {
                    handleConsent(true);
                };
                if (timeout > 0) {
                    timer = setTimeout(autoAccept, timeout);
                }
                // Only add scroll listener if explicitly enabled (default: false)
                if (config.autoAcceptOnScroll) {
                    scrollHandler = () => {
                        if (timer)
                            clearTimeout(timer);
                        autoAccept();
                    };
                    document.addEventListener('scroll', scrollHandler, { once: true });
                }
            }
            // Cleanup function
            el._cleanup = () => {
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
            const widgetConfig = config.widget || {};
            const position = widgetConfig.position || 'bottom-left';
            const text = widgetConfig.text || '🍪';
            const ariaLabel = widgetConfig.ariaLabel || 'Manage cookie preferences';
            const widget = document.createElement('button');
            widget.id = widgetId;
            widget.type = 'button';
            widget.setAttribute('aria-label', ariaLabel);
            widget.textContent = text;
            // Widget styles
            const posStyles = position === 'bottom-right'
                ? 'right:16px;left:auto;'
                : 'left:16px;right:auto;';
            widget.style.cssText = `
      position:fixed;
      bottom:16px;
      ${posStyles}
      width:48px;
      height:48px;
      border-radius:50%;
      border:none;
      background:var(--ckb-btn-bg,#222);
      color:var(--ckb-btn-color,#fff);
      font-size:20px;
      cursor:pointer;
      z-index:var(--ckb-z,9998);
      box-shadow:0 2px 8px rgba(0,0,0,0.2);
      display:flex;
      align-items:center;
      justify-content:center;
      transition:transform 0.2s ease;
    `.replace(/\s+/g, '');
            widget.addEventListener('mouseenter', () => {
                widget.style.transform = 'scale(1.1)';
            });
            widget.addEventListener('mouseleave', () => {
                widget.style.transform = 'scale(1)';
            });
            widget.addEventListener('click', () => {
                _consentMethod = 'widget';
                instance.manage();
            });
            container.appendChild(widget);
        }
        // Instance API
        const instance = {
            get status() {
                return _status;
            },
            getConsent() {
                return _consentState;
            },
            hasConsent(categoryId) {
                if (!_consentState)
                    return false;
                return _consentState[categoryId] === true;
            },
            accept() {
                handleConsent(true);
            },
            reject() {
                handleConsent(false);
            },
            show() {
                if (!banner && _status === null) {
                    banner = createBannerElement();
                }
            },
            manage() {
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
            hide() {
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
            destroy(clearCookie = false) {
                this.hide();
                this.hideWidget();
                const style = document.getElementById(styleId);
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
            isVisible() {
                return banner !== null;
            },
            getConsentRecord() {
                if (!_consentState)
                    return null;
                return {
                    state: _consentState,
                    timestamp: _consentTimestamp || new Date().toISOString(),
                    policyVersion: config.policyVersion,
                    method: _consentMethod || 'banner',
                };
            },
            showWidget() {
                createWidget();
            },
            hideWidget() {
                const existingWidget = document.getElementById(widgetId);
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
        const config = window.CookieBannerConfig || {};
        const instance = createCookieBanner(config);
        // Show banner if no consent yet
        if (instance.status === null) {
            // Wait for DOM if loading
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => instance.show());
            }
            else {
                instance.show();
            }
        }
        // Legacy API
        const legacyApi = {
            get ok() {
                return instance.status;
            },
            yes() {
                instance.accept();
            },
            no() {
                instance.reject();
            },
            reset() {
                instance.destroy(true);
                if (typeof location !== 'undefined') {
                    location.reload();
                }
            },
            destroy() {
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
    let _initialized = false;
    /**
     * Parse config from script tag data attributes
     * Supports: data-force-eu, data-tabs, data-msg, data-accept-text, data-reject-text, etc.
     */
    function parseDataAttributes(script) {
        const config = {};
        // Boolean attributes (presence = true)
        if (script.hasAttribute('data-force-eu'))
            config.forceEU = true;
        if (script.hasAttribute('data-tabs'))
            config.tabs = { enabled: true };
        if (script.hasAttribute('data-gdpr'))
            config.mode = 'gdpr';
        // String attributes
        const msg = script.getAttribute('data-msg');
        if (msg)
            config.msg = msg;
        const acceptText = script.getAttribute('data-accept-text');
        if (acceptText)
            config.acceptText = acceptText;
        const rejectText = script.getAttribute('data-reject-text');
        if (rejectText)
            config.rejectText = rejectText;
        const privacyUrl = script.getAttribute('data-privacy-url');
        if (privacyUrl)
            config.privacyPolicyUrl = privacyUrl;
        const cookieName = script.getAttribute('data-cookie-name');
        if (cookieName)
            config.cookieName = cookieName;
        // Number attributes
        const days = script.getAttribute('data-days');
        if (days)
            config.days = parseInt(days, 10);
        return config;
    }
    function autoInit() {
        if (_initialized)
            return;
        _initialized = true;
        // Merge data attributes with window.CookieBannerConfig
        let config = window.CookieBannerConfig || {};
        // Parse data attributes from current script tag
        const script = document.currentScript;
        if (script) {
            const dataConfig = parseDataAttributes(script);
            config = Object.assign(Object.assign({}, dataConfig), config); // window config overrides data attributes
        }
        // Set merged config back
        window.CookieBannerConfig = config;
        setup();
    }
    // Only auto-init if loaded as a script (not imported as module)
    if (isBrowser &&
        (typeof window.CookieBannerConfig !== 'undefined' ||
            (document.currentScript && document.currentScript.getAttribute('type') !== 'module'))) {
        autoInit();
    }
});
