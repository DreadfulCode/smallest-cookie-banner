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
  /** Cookie expiry in days (default: 365) */
  days?: number;
  /** Force EU mode (true) or non-EU mode (false). Auto-detects if undefined */
  forceEU?: boolean;
  /** Milliseconds before auto-accept in non-EU mode (default: 5000, 0 to disable) */
  autoAcceptDelay?: number;
  /** Additional inline styles for the banner element */
  style?: string;
  /** Additional CSS rules to inject */
  css?: string;
  /** Custom container element (default: document.body) */
  container?: HTMLElement;
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
  ok: boolean | null;
  yes(): void;
  no(): void;
  reset(): void;
  destroy(): void;
}

interface BannerElement extends HTMLDivElement {
  _cleanup?: () => void;
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

const EU_OFFSETS = [-1, 0, 1, 2, 3]; // WET, GMT, CET, EET, FET

/** Default CSS - uses CSS custom properties for easy overrides */
export const DEFAULT_CSS = `#ckb{position:var(--ckb-position,fixed);bottom:var(--ckb-bottom,0);top:var(--ckb-top,auto);left:var(--ckb-left,0);right:var(--ckb-right,0);padding:var(--ckb-padding,8px 12px);background:var(--ckb-bg,#222);color:var(--ckb-color,#fff);font:var(--ckb-font,12px system-ui,sans-serif);display:flex;align-items:center;gap:var(--ckb-gap,8px);z-index:var(--ckb-z,9999);flex-wrap:wrap}#ckb p{margin:0;flex:1;min-width:200px}#ckb button{padding:var(--ckb-btn-padding,6px 12px);border:var(--ckb-btn-border,none);border-radius:var(--ckb-btn-radius,3px);background:var(--ckb-btn-bg,#fff);color:var(--ckb-btn-color,#222);font:inherit;cursor:pointer}#ckb #ckn{background:var(--ckb-reject-bg,transparent);color:var(--ckb-reject-color,inherit);border:var(--ckb-reject-border,1px solid currentColor)}`;

// ============================================================================
// SSR Safety
// ============================================================================

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

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
  return EU_OFFSETS.indexOf(offset) > -1;
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
export function setConsent(value: string, cookieName = 'ck', days = 365): void {
  if (!isBrowser) return;
  const date = new Date();
  date.setDate(date.getDate() + days);
  let cookie = `${cookieName}=${value};expires=${date.toUTCString()};path=/;SameSite=Lax`;
  if (location.protocol === 'https:') {
    cookie += ';Secure';
  }
  document.cookie = cookie;
}

/**
 * Delete consent cookie
 */
export function deleteConsent(cookieName = 'ck'): void {
  if (!isBrowser) return;
  let cookie = `${cookieName}=;expires=Thu,01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`;
  if (location.protocol === 'https:') {
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
function injectStyles(id: string, css: string): void {
  if (!isBrowser || document.getElementById(id)) return;
  const style = document.createElement('style');
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

  const cookieName = config.cookieName || 'ck';
  const days = config.days || 365;
  const inEU = config.forceEU !== undefined ? config.forceEU : isEU();
  const container = config.container || document.body;

  let banner: BannerElement | null = null;
  let _status: boolean | null = null;
  const styleId = `ckb-style-${Math.random().toString(36).slice(2, 8)}`;

  // Check existing consent
  const existing = getConsent(cookieName);
  if (existing !== null) {
    _status = existing === '1';
  }

  function handleConsent(accepted: boolean): void {
    setConsent(accepted ? '1' : '0', cookieName, days);
    _status = accepted;

    if (banner) {
      if (banner._cleanup) banner._cleanup();
      banner.remove();
      banner = null;
    }

    const callback = accepted
      ? (config.onAccept || config.onYes)
      : (config.onReject || config.onNo);

    if (typeof callback === 'function') {
      callback();
    }
  }

  function createBannerElement(): BannerElement {
    // Inject styles
    injectStyles(styleId, DEFAULT_CSS + (config.css || ''));

    const el = document.createElement('div') as BannerElement;
    el.id = 'ckb';

    if (config.style) {
      el.style.cssText = config.style;
    }

    const msg = escapeHtml(config.msg || 'Cookies help us deliver our services.');
    const acceptText = escapeHtml(config.acceptText || 'OK');
    const rejectText = escapeHtml(config.rejectText || '\u2717');
    const rejectBtn = inEU ? `<button id="ckn">${rejectText}</button>` : '';

    el.innerHTML = `<p>${msg}</p>${rejectBtn}<button id="cky">${acceptText}</button>`;

    container.appendChild(el);

    // Event handlers
    const acceptEl = el.querySelector('#cky');
    const rejectEl = el.querySelector('#ckn');

    if (acceptEl) {
      acceptEl.addEventListener('click', () => handleConsent(true));
    }
    if (rejectEl) {
      rejectEl.addEventListener('click', () => handleConsent(false));
    }

    // Non-EU: auto-accept
    let timer: ReturnType<typeof setTimeout> | null = null;
    let scrollHandler: (() => void) | null = null;

    if (!inEU) {
      const timeout = config.autoAcceptDelay !== undefined ? config.autoAcceptDelay : 5000;

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
      }
    },

    destroy(clearCookie = false) {
      this.hide();
      const style = document.getElementById(styleId);
      if (style) style.remove();
      if (clearCookie) {
        deleteConsent(cookieName);
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
      location.reload();
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
if (isBrowser && typeof window.CookieBannerConfig !== 'undefined') {
  autoInit();
}

// Also check if script has no type="module" attribute
if (isBrowser && document.currentScript && !document.currentScript.hasAttribute('type')) {
  autoInit();
}
