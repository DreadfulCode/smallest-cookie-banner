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

// ============================================================================
// Types
// ============================================================================

export interface CookieBannerConfig {
  /** Banner message text */
  msg?: string;
  /** Accept button text (default: "OK") */
  acceptText?: string;
  /** Reject button text (default: "✗") */
  rejectText?: string;
  /** Cookie name (default: "ck") */
  cookieName?: string;
  /** Cookie expiry in days (default: 365, max: 3650) */
  days?: number;
  /** Cookie domain (e.g., '.example.com' for subdomains) */
  cookieDomain?: string;
  /** Force EU mode (true) or non-EU mode (false). Auto-detects if undefined */
  forceEU?: boolean;
  /** Milliseconds before auto-accept in non-EU mode (default: 5000, 0 to disable, max: 300000) */
  autoAcceptDelay?: number;
  /** Additional inline styles for the banner element (sanitized for security) */
  style?: string;
  /** Additional CSS rules to inject (sanitized for security) */
  css?: string;
  /** Custom container element (default: document.body) */
  container?: HTMLElement;
  /** CSP nonce for inline styles */
  cspNonce?: string;
  /** Callback when user accepts */
  onAccept?: () => void;
  /** Callback when user rejects */
  onReject?: () => void;
  /** @deprecated Use onAccept instead */
  onYes?: () => void;
  /** @deprecated Use onReject instead */
  onNo?: () => void;
}

export interface CookieBannerInstance {
  /** Current consent status: true (accepted), false (rejected), null (pending) */
  readonly status: boolean | null;
  /** Accept consent programmatically */
  accept(): void;
  /** Reject consent programmatically */
  reject(): void;
  /** Show the banner (if not already shown) */
  show(): void;
  /** Hide the banner without setting consent */
  hide(): void;
  /** Remove banner, cleanup listeners, optionally clear cookie */
  destroy(clearCookie?: boolean): void;
  /** Check if banner is currently visible */
  isVisible(): boolean;
}

// Legacy API for backwards compatibility
export interface LegacyCookieBannerAPI {
  readonly ok: boolean | null;
  yes(): void;
  no(): void;
  reset(): void;
  destroy(): void;
}

interface BannerElement extends HTMLDivElement {
  _cleanup?: () => void;
}

// Validated config with guaranteed values
interface ValidatedConfig extends CookieBannerConfig {
  cookieName: string;
  days: number;
  autoAcceptDelay: number;
}

// Extend Window interface for global API
declare global {
  interface Window {
    CookieBanner?: LegacyCookieBannerAPI;
    CookieBannerConfig?: CookieBannerConfig;
  }
}

// ============================================================================
// Constants
// ============================================================================

const EU_OFFSETS: readonly number[] = [-1, 0, 1, 2, 3]; // WET, GMT, CET, EET, FET
const MAX_COOKIE_DAYS = 3650; // 10 years max
const MAX_AUTO_ACCEPT_DELAY = 300000; // 5 minutes max
const DEFAULT_DAYS = 365;
const DEFAULT_AUTO_ACCEPT_DELAY = 5000;
const COOKIE_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;
const DOMAIN_REGEX = /^\.?[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z0-9][a-zA-Z0-9-]*)*$/;

/** Default CSS - uses CSS custom properties for easy overrides */
/** Includes WCAG 2.1 AA compliant touch targets (44x44px min) */
export const DEFAULT_CSS = `#ckb{position:var(--ckb-position,fixed);bottom:var(--ckb-bottom,0);top:var(--ckb-top,auto);left:var(--ckb-left,0);right:var(--ckb-right,0);padding:var(--ckb-padding,12px 16px);background:var(--ckb-bg,#222);color:var(--ckb-color,#fff);font:var(--ckb-font,14px/1.4 system-ui,sans-serif);display:flex;align-items:center;gap:var(--ckb-gap,12px);z-index:var(--ckb-z,9999);flex-wrap:wrap}#ckb:focus{outline:2px solid var(--ckb-focus-color,#4299e1);outline-offset:2px}#ckb p{margin:0;flex:1;min-width:200px}#ckb button{min-height:44px;min-width:44px;padding:var(--ckb-btn-padding,10px 20px);border:var(--ckb-btn-border,none);border-radius:var(--ckb-btn-radius,4px);background:var(--ckb-btn-bg,#fff);color:var(--ckb-btn-color,#222);font:inherit;cursor:pointer;touch-action:manipulation}#ckb button:focus{outline:2px solid var(--ckb-focus-color,#4299e1);outline-offset:2px}#ckb button:hover{opacity:0.9}#ckb #ckn{background:var(--ckb-reject-bg,transparent);color:var(--ckb-reject-color,inherit);border:var(--ckb-reject-border,1px solid currentColor)}@media(prefers-reduced-motion:reduce){#ckb,#ckb *{transition:none!important;animation:none!important}}`;

// ============================================================================
// SSR Safety
// ============================================================================

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

// ============================================================================
// CSS Sanitization (Security)
// ============================================================================

/**
 * Sanitize CSS to prevent injection attacks
 * Blocks: @import, url() with external URLs, expression(), behavior:, -moz-binding, HTML tags
 */
export function sanitizeCss(css: string): string {
  if (!css) return '';

  let sanitized = css;

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
  sanitized = sanitized.replace(
    /url\s*\(\s*(['"]?)([^'")\s]+)\1\s*\)/gi,
    (match, _quote, url) => {
      const trimmedUrl = url.trim().toLowerCase();
      // Allow data:image URIs
      if (trimmedUrl.startsWith('data:image/')) {
        return match;
      }
      // Block everything else (javascript:, external URLs, etc.)
      return '';
    }
  );

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript\s*:/gi, '');

  return sanitized;
}

/**
 * Sanitize inline styles (more restrictive than CSS blocks)
 */
export function sanitizeInlineStyle(style: string): string {
  if (!style) return '';

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
export function validateConfig(config: CookieBannerConfig): ValidatedConfig {
  const validated: ValidatedConfig = {
    ...config,
    cookieName: 'ck',
    days: DEFAULT_DAYS,
    autoAcceptDelay: DEFAULT_AUTO_ACCEPT_DELAY,
  };

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
    } else {
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
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detect if user is likely in EU based on timezone
 */
export function isEU(): boolean {
  if (!isBrowser) return false;
  const offset = Math.floor(-new Date().getTimezoneOffset() / 60);
  return EU_OFFSETS.includes(offset);
}

/**
 * Get consent value from cookie
 */
export function getConsent(cookieName = 'ck'): string | null {
  if (!isBrowser) return null;
  const escapedName = escapeRegex(cookieName);
  const match = document.cookie.match(new RegExp('(^|;)\\s*' + escapedName + '=([^;]*)'));
  return match ? match[2] : null;
}

/**
 * Set consent cookie
 */
export function setConsent(
  value: string,
  cookieName = 'ck',
  days = DEFAULT_DAYS,
  domain?: string
): void {
  if (!isBrowser) return;

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
export function deleteConsent(cookieName = 'ck', domain?: string): void {
  if (!isBrowser) return;

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
 * Escape HTML to prevent XSS
 */
function escapeHtml(str: string): string {
  if (!isBrowser) return str;
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Inject styles (once per ID)
 */
function injectStyles(id: string, css: string, nonce?: string): void {
  if (!isBrowser || document.getElementById(id)) return;
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

/**
 * Create a new cookie banner instance
 * Framework-friendly: no global state, proper cleanup, SSR-safe
 */
export function createCookieBanner(config: CookieBannerConfig = {}): CookieBannerInstance {
  // SSR: return no-op instance
  if (!isBrowser) {
    return {
      status: null,
      accept: () => {},
      reject: () => {},
      show: () => {},
      hide: () => {},
      destroy: () => {},
      isVisible: () => false,
    };
  }

  // Validate configuration
  const validatedConfig = validateConfig(config);
  const cookieName = validatedConfig.cookieName;
  const days = validatedConfig.days;
  const cookieDomain = validatedConfig.cookieDomain;
  const inEU = config.forceEU !== undefined ? config.forceEU : isEU();
  const container = validatedConfig.container || document.body;

  let banner: BannerElement | null = null;
  let _status: boolean | null = null;
  let previousActiveElement: Element | null = null;
  const styleId = `ckb-style-${Math.random().toString(36).slice(2, 8) || 'default'}`;

  // Check existing consent
  const existing = getConsent(cookieName);
  if (existing !== null) {
    _status = existing === '1';
  }

  function handleConsent(accepted: boolean): void {
    setConsent(accepted ? '1' : '0', cookieName, days, cookieDomain);
    _status = accepted;

    if (banner) {
      if (banner._cleanup) banner._cleanup();
      banner.remove();
      banner = null;
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
      } catch (error) {
        console.error('Cookie banner callback error:', error);
      }
    }
  }

  function createBannerElement(): BannerElement {
    // Inject sanitized styles
    const customCss = config.css ? sanitizeCss(config.css) : '';
    injectStyles(styleId, DEFAULT_CSS + customCss, config.cspNonce);

    const el = document.createElement('div') as BannerElement;
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
    const msgId = `ckb-msg-${Math.random().toString(36).slice(2, 8)}`;
    el.setAttribute('aria-describedby', msgId);

    const msg = escapeHtml(config.msg || 'Cookies help us deliver our services.');
    const acceptText = escapeHtml(config.acceptText || 'OK');
    const rejectText = escapeHtml(config.rejectText || '\u2717');
    const rejectBtn = inEU ? `<button type="button" id="ckn">${rejectText}</button>` : '';

    // Set innerHTML BEFORE appending to DOM to prevent reflow
    el.innerHTML = `<p id="${msgId}">${msg}</p>${rejectBtn}<button type="button" id="cky">${acceptText}</button>`;

    // NOW append to container (after innerHTML is set)
    container.appendChild(el);

    // Store previous focus and move focus to banner
    previousActiveElement = document.activeElement;
    el.focus();

    // Event handlers
    const acceptEl = el.querySelector('#cky') as HTMLButtonElement | null;
    const rejectEl = el.querySelector('#ckn') as HTMLButtonElement | null;

    const handleAcceptClick = (): void => handleConsent(true);
    const handleRejectClick = (): void => handleConsent(false);

    if (acceptEl) {
      acceptEl.addEventListener('click', handleAcceptClick);
    }
    if (rejectEl) {
      rejectEl.addEventListener('click', handleRejectClick);
    }

    // Keyboard navigation
    const handleKeydown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        // ESC dismisses - reject in EU mode, accept in non-EU mode
        handleConsent(!inEU);
      } else if (e.key === 'Tab') {
        // Focus trap
        const focusableElements = el.querySelectorAll('button');
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeydown);

    // Non-EU: auto-accept
    let timer: ReturnType<typeof setTimeout> | null = null;
    let scrollHandler: (() => void) | null = null;

    if (!inEU) {
      const timeout = validatedConfig.autoAcceptDelay;

      const autoAccept = (): void => {
        handleConsent(true);
      };

      if (timeout > 0) {
        timer = setTimeout(autoAccept, timeout);
      }

      scrollHandler = (): void => {
        if (timer) clearTimeout(timer);
        autoAccept();
      };

      document.addEventListener('scroll', scrollHandler, { once: true });
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
    };

    return el;
  }

  // Instance API
  const instance: CookieBannerInstance = {
    get status() {
      return _status;
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

    hide() {
      if (banner) {
        if (banner._cleanup) banner._cleanup();
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
      const style = document.getElementById(styleId);
      if (style) style.remove();
      if (clearCookie) {
        deleteConsent(cookieName, cookieDomain);
        _status = null;
      }
    },

    isVisible() {
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
export function initLegacy(): LegacyCookieBannerAPI | null {
  if (!isBrowser) return null;

  const config = window.CookieBannerConfig || {};
  const instance = createCookieBanner(config);

  // Show banner if no consent yet
  if (instance.status === null) {
    // Wait for DOM if loading
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => instance.show());
    } else {
      instance.show();
    }
  }

  // Legacy API
  const legacyApi: LegacyCookieBannerAPI = {
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

function autoInit(): void {
  if (_initialized) return;
  _initialized = true;
  initLegacy();
}

// Only auto-init if loaded as a script (not imported as module)
if (
  isBrowser &&
  (typeof window.CookieBannerConfig !== 'undefined' ||
    (document.currentScript && !document.currentScript.hasAttribute('type')))
) {
  autoInit();
}
