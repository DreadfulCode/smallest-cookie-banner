/**
 * smallest-cookie-banner
 * A minimal cookie consent banner
 *
 * Features:
 * - GDPR mode: explicit accept/reject
 * - Minimal mode: simple acknowledgment
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

/** Cookie category definition */
export interface CookieCategory {
  /** Unique identifier (e.g., 'analytics', 'marketing') */
  id: string;
  /** Display name */
  name: string;
  /** Description shown to user */
  description?: string;
  /** If true, cannot be disabled (e.g., essential cookies) */
  required?: boolean;
  /** Default state when banner first shown (default: false) */
  defaultEnabled?: boolean;
}

/** Granular consent result - which categories are enabled */
export interface ConsentState {
  [categoryId: string]: boolean;
}

/** Banner mode: 'minimal' for simple accept/reject, 'gdpr' for granular consent */
export type BannerMode = 'minimal' | 'gdpr';

/** Default categories for GDPR mode */
export const DEFAULT_CATEGORIES: CookieCategory[] = [
  { id: 'essential', name: 'Essential', description: 'Required for the website to function', required: true },
  { id: 'analytics', name: 'Analytics', description: 'Help us understand how visitors use our site' },
  { id: 'marketing', name: 'Marketing', description: 'Used to deliver relevant ads' },
  { id: 'functional', name: 'Functional', description: 'Enable enhanced features and personalization' },
];

/** Consent widget configuration for managing preferences after initial consent */
export interface ConsentWidgetConfig {
  /** Enable the floating consent widget (default: false) */
  enabled?: boolean;
  /** Widget position: 'bottom-left' | 'bottom-right' (default: 'bottom-left') */
  position?: 'bottom-left' | 'bottom-right';
  /** Widget text (default: "🍪") */
  text?: string;
  /** Widget aria-label (default: "Manage cookie preferences") */
  ariaLabel?: string;
}

/** Consent record with audit trail metadata */
export interface ConsentRecord {
  /** Consent state for each category */
  state: ConsentState;
  /** ISO 8601 timestamp when consent was given */
  timestamp: string;
  /** Version of the consent policy (optional) */
  policyVersion?: string;
  /** How consent was given */
  method: 'banner' | 'widget' | 'api';
}

/** Tab configuration for tabbed UI */
export interface TabConfig {
  /** Enable tabbed UI (default: true) */
  enabled?: boolean;
  /** Toast/modal layout - stacked with tabs on top (default: false = inline) */
  toast?: boolean;
  /** Consent tab label (default: "Consent") */
  consentLabel?: string;
  /** Details tab label (default: "Details") */
  detailsLabel?: string;
  /** About tab label (default: "About") */
  aboutLabel?: string;
  /** About tab content - custom HTML or use default boilerplate */
  aboutContent?: string;
}

export interface CookieBannerConfig {
  /** Banner mode: 'minimal' (default) or 'gdpr' for granular consent */
  mode?: BannerMode;
  /** Tabbed UI configuration */
  tabs?: TabConfig;
  /** Banner message text */
  msg?: string;
  /** Accept button text (default: "Accept All") */
  acceptText?: string;
  /** Reject button text (default: "Reject All") */
  rejectText?: string;
  /** Settings/Customize button text (default: "Customize") */
  settingsText?: string;
  /** Save preferences button text (default: "Save Preferences") */
  saveText?: string;
  /** Cookie categories for granular consent */
  categories?: CookieCategory[];
  /** Link to privacy policy (optional) */
  privacyPolicyUrl?: string;
  /** Privacy policy link text (default: "Privacy Policy") */
  privacyPolicyText?: string;
  /** Banner ARIA label for accessibility (default: "Cookie consent") */
  bannerAriaLabel?: string;
  /** Label for required categories (default: "(Required)") */
  requiredLabel?: string;
  /** Text direction for RTL languages: 'ltr' | 'rtl' | 'auto' (default: inherits from page) */
  dir?: 'ltr' | 'rtl' | 'auto';
  /** Cookie name (default: "cookie_consent") */
  cookieName?: string;
  /** Cookie expiry in days (default: 365, max: 3650) */
  days?: number;
  /** Cookie domain (e.g., '.example.com' for subdomains) */
  cookieDomain?: string;
  /** Force EU mode (true) or non-EU mode (false). Auto-detects if undefined */
  forceEU?: boolean;
  /** Milliseconds before auto-accept in non-EU mode (default: 5000, 0 to disable, max: 300000) */
  autoAcceptDelay?: number;
  /** Auto-accept on scroll in non-EU mode (default: false) */
  autoAcceptOnScroll?: boolean;
  /** Additional inline styles for the banner element (sanitized for security) */
  style?: string;
  /** Additional CSS rules to inject (sanitized for security) */
  css?: string;
  /** Custom container element (default: document.body) */
  container?: HTMLElement;
  /** CSP nonce for inline styles */
  cspNonce?: string;
  /** Policy version for audit trail (e.g., "1.0", "2024-01") */
  policyVersion?: string;
  /** Consent widget configuration for managing preferences after consent */
  widget?: ConsentWidgetConfig;
  /** Allow multiple banner instances (default: false - singleton behavior) */
  allowMultiple?: boolean;
  /** Callback when user saves consent (receives consent record with metadata) */
  onConsent?: (consent: ConsentState, record?: ConsentRecord) => void;
  /** Callback when user accepts all */
  onAccept?: () => void;
  /** Callback when user rejects all */
  onReject?: () => void;
  /** @deprecated Use onAccept instead */
  onYes?: () => void;
  /** @deprecated Use onReject instead */
  onNo?: () => void;
}

export interface CookieBannerInstance {
  /** Current consent status: true (accepted all), false (rejected all), null (pending) */
  readonly status: boolean | null;
  /** Get granular consent state (returns null if no consent yet) */
  getConsent(): ConsentState | null;
  /** Get full consent record with audit metadata (returns null if no consent yet) */
  getConsentRecord(): ConsentRecord | null;
  /** Check if a specific category is enabled */
  hasConsent(categoryId: string): boolean;
  /** Accept all consent programmatically */
  accept(): void;
  /** Reject all consent programmatically */
  reject(): void;
  /** Show the banner (if not already shown) */
  show(): void;
  /** Reopen settings to manage consent (shows banner even if consent exists) */
  manage(): void;
  /** Hide the banner without setting consent */
  hide(): void;
  /** Remove banner, cleanup listeners, optionally clear cookie */
  destroy(clearCookie?: boolean): void;
  /** Check if banner is currently visible */
  isVisible(): boolean;
  /** Show/hide the consent management widget */
  showWidget(): void;
  /** Hide the consent management widget */
  hideWidget(): void;
}

// Legacy API for backwards compatibility
export interface LegacyCookieBannerAPI {
  readonly ok: boolean | null;
  yes(): void;
  no(): void;
  reset(): void;
  destroy(): void;
}

interface BannerElement extends HTMLElement {
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

/** Default About tab content - cookie law boilerplate (concise) */
export const DEFAULT_ABOUT_CONTENT = `<p>Cookies are small text files stored on your device to improve your experience.</p>
<p>We require your consent for non-essential cookies per GDPR Art. 6. You can change your preferences at any time.</p>
<p style="margin-top:10px;font-size:10px;opacity:0.5">Powered by <a href="https://github.com/DreadfulCode/smallest-cookie-banner" target="_blank" rel="noopener" style="color:inherit">smallest-cookie-banner</a></p>`;

/** Default CSS - uses CSS custom properties for easy overrides */
/** Includes WCAG 2.1 AA compliant touch targets (44x44px min) */
export const DEFAULT_CSS = `#ckb{position:var(--ckb-position,fixed);bottom:var(--ckb-bottom,0);top:var(--ckb-top,auto);left:var(--ckb-left,0);right:var(--ckb-right,0);padding:var(--ckb-padding,12px 16px);background:var(--ckb-bg,#222);color:var(--ckb-color,#fff);font:var(--ckb-font,14px/1.4 system-ui,sans-serif);display:flex;align-items:center;gap:var(--ckb-gap,12px);z-index:var(--ckb-z,9999);flex-wrap:wrap}#ckb:focus{outline:2px solid var(--ckb-focus-color,#4299e1);outline-offset:2px}#ckb p{margin:0;flex:1;min-width:200px}#ckb a{color:inherit}#ckb button{min-height:44px;min-width:44px;padding:var(--ckb-btn-padding,10px 20px);border:var(--ckb-btn-border,none);border-radius:var(--ckb-btn-radius,4px);background:var(--ckb-btn-bg,#fff);color:var(--ckb-btn-color,#222);font:inherit;cursor:pointer;touch-action:manipulation}#ckb button:focus{outline:2px solid var(--ckb-focus-color,#4299e1);outline-offset:2px}#ckb button:hover{opacity:0.9}#ckb #ckn{background:var(--ckb-reject-bg,transparent);color:var(--ckb-reject-color,inherit);border:var(--ckb-reject-border,1px solid currentColor)}#ckb #cks{background:var(--ckb-settings-bg,transparent);color:var(--ckb-settings-color,inherit);border:var(--ckb-settings-border,1px solid currentColor)}#ckb-cats{display:none;width:100%;padding:12px 0;border-top:1px solid rgba(255,255,255,0.2);margin-top:8px}#ckb.expanded #ckb-cats{display:block}#ckb-cats label{display:flex;align-items:flex-start;gap:10px;padding:8px 0;cursor:pointer}#ckb-cats input[type=checkbox]{width:20px;height:20px;margin:2px 0;accent-color:var(--ckb-btn-bg,#fff)}#ckb-cats .cat-info{flex:1}#ckb-cats .cat-name{font-weight:600}#ckb-cats .cat-desc{font-size:12px;opacity:0.8;margin-top:2px}#ckb-cats .cat-req{opacity:0.6;font-size:11px}@media(prefers-reduced-motion:reduce){#ckb,#ckb *{transition:none!important;animation:none!important}}` +
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
  private _shadow: ShadowRoot;
  _cleanup?: () => void;

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
  }

  get shadowRoot(): ShadowRoot {
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
function decodeCssUnicodeEscapes(css: string): string {
  return css.replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_match, hex) => {
    const charCode = parseInt(hex, 16);
    // Only decode valid characters, block null bytes
    if (charCode === 0 || charCode > 0x10FFFF) return '';
    return String.fromCodePoint(charCode);
  });
}

/**
 * Sanitize CSS to prevent injection attacks
 * Blocks: @import, url() with external URLs, expression(), behavior:, -moz-binding, HTML tags
 */
export function sanitizeCss(css: string): string {
  if (!css) return '';

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
  sanitized = sanitized.replace(
    /url\s*\(\s*(['"]?)([^'")\s]+)\1\s*\)/gi,
    (match, _quote, url) => {
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
    }
  );

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript\s*:/gi, '');

  return sanitized;
}

/**
 * Sanitize URLs to prevent javascript: XSS and phishing
 * Only allows http:, https:, and relative URLs
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
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
    cookieName: 'cookie_consent',
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
  for (let i = 0; i < EU_OFFSETS.length; i++) {
    if (EU_OFFSETS[i] === offset) return true;
  }
  return false;
}

/**
 * Get consent value from cookie
 */
export function getConsent(cookieName = 'cookie_consent'): string | null {
  if (!isBrowser) return null;
  const escapedName = escapeRegex(cookieName);
  const match = document.cookie.match(new RegExp(`(^|;)\\s*${escapedName}=([^;]*)`));
  return match ? match[2] : null;
}

/**
 * Set consent cookie
 */
export function setConsent(
  value: string,
  cookieName = 'cookie_consent',
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
export function deleteConsent(cookieName = 'cookie_consent', domain?: string): void {
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
 * Parse granular consent from cookie value
 * Format: "cat1:1,cat2:0,cat3:1" or legacy "1"/"0"
 */
export function parseGranularConsent(value: string | null, categories?: CookieCategory[]): ConsentState | null {
  if (!value) return null;

  // Legacy format: "1" = all accepted, "0" = all rejected
  if (value === '1' || value === '0') {
    const allEnabled = value === '1';
    if (!categories || categories.length === 0) {
      return { all: allEnabled };
    }
    const state: ConsentState = {};
    for (const cat of categories) {
      state[cat.id] = cat.required ? true : allEnabled;
    }
    return state;
  }

  // Granular format: "essential:1,analytics:0,marketing:0"
  const state: ConsentState = {};
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
export function encodeGranularConsent(state: ConsentState): string {
  const parts: string[] = [];
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
function escapeHtml(str: string): string {
  if (!isBrowser) return str;
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Inject styles (once per ID) - kept for backwards compatibility
 * @internal In v2.0, styles are injected into Shadow DOM instead
 */
function _injectStyles(id: string, css: string, nonce?: string): void {
  if (!isBrowser || document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  if (nonce) {
    style.setAttribute('nonce', nonce);
  }
  style.textContent = css;
  document.head.appendChild(style);
}

// Export for testing
export { _injectStyles as injectStyles };

// ============================================================================
// Script Blocking Utilities
// ============================================================================

/** Pending script registry entry */
interface PendingScript {
  src: string;
  category: string;
  callback?: () => void;
}

const _pendingScripts: PendingScript[] = [];
const _loadedScripts: Set<string> = new Set();

/** Internal: Load a script dynamically. Callers must check _loadedScripts first. */
function _loadScript(src: string, callback?: () => void): void {
  _loadedScripts.add(src);

  const script = document.createElement('script');
  script.src = src;
  script.async = true;

  if (callback) {
    script.onload = () => callback();
  }

  document.head.appendChild(script);
}

/**
 * Register a script to load only after consent is given for a category.
 * Scripts are loaded automatically when consent is granted via the banner.
 *
 * @param category - Consent category (e.g., 'analytics', 'marketing', 'functional')
 * @param src - Script URL to load
 * @param callback - Optional callback after script loads
 *
 * @example
 * // Register scripts before creating banner
 * loadOnConsent('analytics', 'https://www.googletagmanager.com/gtag/js?id=G-XXXXX');
 * loadOnConsent('marketing', 'https://connect.facebook.net/en_US/fbevents.js');
 *
 * // Banner handles loading automatically
 * createCookieBanner({ mode: 'gdpr', forceEU: true });
 */
export function loadOnConsent(category: string, src: string, callback?: () => void): void {
  if (!isBrowser) return;

  // Check if already loaded
  if (_loadedScripts.has(src)) {
    callback?.();
    return;
  }

  // Check if consent already given for this category
  const existingConsent = getConsent();
  if (existingConsent) {
    const state = parseGranularConsent(existingConsent);
    if (state && state[category]) {
      _loadScript(src, callback);
      return;
    }
    // Also handle minimal mode "1" = all accepted
    if (existingConsent === '1') {
      _loadScript(src, callback);
      return;
    }
  }

  // Register for future consent
  _pendingScripts.push({ src, category, callback });
}

/**
 * Load pending scripts for consented categories.
 * Called automatically by createCookieBanner on consent.
 * @internal
 */
export function _loadConsentedScripts(consent: ConsentState | boolean): void {
  if (!isBrowser) return;

  // Handle boolean (minimal mode: true = all accepted)
  if (typeof consent === 'boolean') {
    if (consent) {
      _pendingScripts.forEach(script => {
        if (!_loadedScripts.has(script.src)) {
          _loadScript(script.src, script.callback);
        }
      });
    }
    return;
  }

  // Handle granular consent
  const toLoad = _pendingScripts.filter(s => consent[s.category] && !_loadedScripts.has(s.src));

  toLoad.forEach(script => {
    _loadScript(script.src, script.callback);
  });
}

/**
 * Scan DOM for blocked scripts and register them for consent-based loading.
 * Looks for: <script type="text/plain" data-consent="category" data-src="url">
 *
 * @example
 * // In HTML:
 * // <script type="text/plain" data-consent="analytics" data-src="https://..."></script>
 *
 * // In JS:
 * blockScriptsUntilConsent();
 * createCookieBanner({ mode: 'gdpr', forceEU: true });
 */
export function blockScriptsUntilConsent(): void {
  if (!isBrowser) return;

  document.querySelectorAll('script[data-consent][data-src]').forEach(el => {
    const script = el as HTMLScriptElement;
    const category = script.dataset.consent || '';
    const src = script.dataset.src || '';

    if (category && src) {
      loadOnConsent(category, src);
    }
  });
}

/**
 * Clear script registry (for testing)
 * @internal
 */
export function _resetScriptRegistry(): void {
  _pendingScripts.length = 0;
  _loadedScripts.clear();
}

// ============================================================================
// Cookie Banner Class (Framework-Friendly)
// ============================================================================

// Track active instance for singleton behavior
let _activeInstance: CookieBannerInstance | null = null;

/**
 * Reset singleton state (for testing only)
 * @internal
 */
export function _resetSingleton(): void {
  _activeInstance = null;
}

/**
 * Create a new cookie banner instance
 * Framework-friendly: no global state, proper cleanup, SSR-safe
 *
 * By default, prevents duplicate banners. Set `config.allowMultiple = true` to override.
 */
export function createCookieBanner(config: CookieBannerConfig = {}): CookieBannerInstance {
  // SSR: return no-op instance
  if (!isBrowser) {
    return {
      status: null,
      getConsent: () => null,
      getConsentRecord: () => null,
      hasConsent: () => false,
      accept: () => {},
      reject: () => {},
      show: () => {},
      manage: () => {},
      hide: () => {},
      destroy: () => {},
      isVisible: () => false,
      showWidget: () => {},
      hideWidget: () => {},
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
  const categories = config.categories || (isGdprMode ? DEFAULT_CATEGORIES : []);
  const hasCategories = categories.length > 0;

  let banner: BannerElement | null = null;
  let _status: boolean | null = null;
  let _consentState: ConsentState | null = null;
  let _consentTimestamp: string | null = null;
  let _consentMethod: 'banner' | 'widget' | 'api' = 'banner';
  let previousActiveElement: Element | null = null;
  const styleId = `ckb-style-${Math.random().toString(36).slice(2, 8) || 'default'}`;
  const widgetId = `ckb-widget-${Math.random().toString(36).slice(2, 8) || 'default'}`;

  // Check existing consent
  const existing = getConsent(cookieName);
  if (existing !== null) {
    _consentState = parseGranularConsent(existing, categories);
    // For legacy status: true if accepted all or has any non-required category enabled
    if (existing === '1') {
      _status = true;
    } else if (existing === '0') {
      _status = false;
    } else {
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
      } else {
        _status = null;
      }
    }
  }

  function handleConsent(accepted: boolean): void {
    // Record timestamp for audit trail
    _consentTimestamp = new Date().toISOString();

    if (hasCategories) {
      // Build consent state for all categories
      const state: ConsentState = {};
      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        state[cat.id] = cat.required ? true : accepted;
      }
      _consentState = state;
      setConsent(encodeGranularConsent(state), cookieName, days, cookieDomain);
    } else {
      setConsent(accepted ? '1' : '0', cookieName, days, cookieDomain);
    }
    _status = accepted;

    // Load any pending scripts registered with loadOnConsent()
    if (hasCategories && _consentState) {
      _loadConsentedScripts(_consentState);
    } else {
      _loadConsentedScripts(accepted);
    }

    if (banner) {
      if (banner._cleanup) banner._cleanup();
      banner.remove();
      banner = null;
    }

    // Show widget if enabled after consent is given
    if (config.widget?.enabled) {
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
      } catch (error) {
        console.error('Cookie banner callback error:', error);
      }
    }

    // Call onConsent with granular state and record
    if (hasCategories && typeof config.onConsent === 'function') {
      try {
        const record: ConsentRecord = {
          state: _consentState!,
          timestamp: _consentTimestamp,
          policyVersion: config.policyVersion,
          method: _consentMethod,
        };
        config.onConsent(_consentState!, record);
      } catch (error) {
        console.error('Cookie banner onConsent callback error:', error);
      }
    }
  }

  function handleGranularConsent(state: ConsentState): void {
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

    // Load any pending scripts registered with loadOnConsent()
    _loadConsentedScripts(state);

    if (banner) {
      if (banner._cleanup) banner._cleanup();
      banner.remove();
      banner = null;
    }

    // Show widget if enabled after consent is given
    if (config.widget?.enabled) {
      createWidget();
    }

    if (previousActiveElement && previousActiveElement instanceof HTMLElement) {
      previousActiveElement.focus();
    }

    if (typeof config.onConsent === 'function') {
      try {
        const record: ConsentRecord = {
          state: state,
          timestamp: _consentTimestamp,
          policyVersion: config.policyVersion,
          method: _consentMethod,
        };
        config.onConsent(state, record);
      } catch (error) {
        console.error('Cookie banner onConsent callback error:', error);
      }
    }
  }

  function createBannerElement(startExpanded = false): BannerElement {
    // Failsafe: remove any existing banner to prevent duplicates
    const existing = document.querySelector(COMPONENT_NAME);
    if (existing) {
      existing.remove();
    }

    // Create Web Component with Shadow DOM
    const el = document.createElement(COMPONENT_NAME) as CookieBannerWebComponent & BannerElement;
    el.id = 'ckb';
    const shadow = el.shadowRoot!;

    // Inject styles into Shadow DOM (encapsulated)
    const customCss = config.css ? sanitizeCss(config.css) : '';
    const styleEl = document.createElement('style');
    if (config.cspNonce) {
      styleEl.setAttribute('nonce', config.cspNonce);
    }
    styleEl.textContent = DEFAULT_CSS + customCss;
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
    const tabsEnabled = config.tabs?.enabled !== false;
    const consentLabel = escapeHtml(config.tabs?.consentLabel || 'Consent');
    const detailsLabel = escapeHtml(config.tabs?.detailsLabel || 'Details');
    const aboutLabel = escapeHtml(config.tabs?.aboutLabel || 'About');
    const aboutContent = config.tabs?.aboutContent || DEFAULT_ABOUT_CONTENT;

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
      if (!tabsEnabled) catsHtml += '</div>';
    }

    // Build HTML based on mode
    let html = '';

    if (tabsEnabled) {
      // Tabbed UI mode
      wrapper.classList.add('tabbed');
      if (config.tabs?.toast) {
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
    } else if (hasCategories) {
      // GDPR mode (non-tabbed): Settings button + categories panel + Accept All / Reject All / Save
      html = `<p id="${msgId}">${msg}${privacyLink}</p>`;
      html += catsHtml;
      html += `<button type="button" id="cks">${settingsText}</button>`;
      html += `<button type="button" id="cksv" style="display:none">${saveText}</button>`;
      html += inEU ? `<button type="button" id="ckn">${rejectText}</button>` : '';
      html += `<button type="button" id="cky">${acceptText}</button>`;
    } else {
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
      const saveBtn = shadow.querySelector('#cksv') as HTMLButtonElement | null;
      const settingsBtn = shadow.querySelector('#cks') as HTMLButtonElement | null;
      if (saveBtn) saveBtn.style.display = '';
      if (settingsBtn) settingsBtn.style.display = 'none';
    }

    // Append wrapper to shadow DOM, then element to container
    shadow.appendChild(wrapper);
    container.appendChild(el);

    // Store previous focus and move focus to banner wrapper
    previousActiveElement = document.activeElement;
    wrapper.focus();

    // Event handlers (query inside shadow DOM)
    const acceptEl = shadow.querySelector('#cky') as HTMLButtonElement | null;
    const rejectEl = shadow.querySelector('#ckn') as HTMLButtonElement | null;
    const settingsEl = shadow.querySelector('#cks') as HTMLButtonElement | null;
    const saveEl = shadow.querySelector('#cksv') as HTMLButtonElement | null;

    const handleAcceptClick = (): void => handleConsent(true);
    const handleRejectClick = (): void => handleConsent(false);

    const handleSettingsClick = (): void => {
      wrapper.classList.toggle('expanded');
      const isExpanded = wrapper.classList.contains('expanded');
      if (saveEl) saveEl.style.display = isExpanded ? '' : 'none';
      if (settingsEl) settingsEl.style.display = isExpanded ? 'none' : '';
    };

    const handleSaveClick = (): void => {
      // Gather checkbox states
      const state: ConsentState = {};
      const cats = categories.length > 0 ? categories : DEFAULT_CATEGORIES;
      const checkboxes = shadow.querySelectorAll('input[name="ckb-cat"]');

      for (let c = 0; c < checkboxes.length; c++) {
        const checkbox = checkboxes[c] as HTMLInputElement;
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

      const handleTabClick = (e: Event): void => {
        const btn = e.currentTarget as HTMLButtonElement;
        const tabId = btn.getAttribute('data-tab');

        // Update tab buttons
        for (let t = 0; t < tabBtns.length; t++) {
          const tabBtn = tabBtns[t] as HTMLButtonElement;
          const isActive = tabBtn.getAttribute('data-tab') === tabId;
          tabBtn.classList.toggle('active', isActive);
          tabBtn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        }

        // Update tab panels
        for (let p = 0; p < tabPanels.length; p++) {
          const panel = tabPanels[p] as HTMLElement;
          const isActive = panel.id === `ckb-panel-${tabId}`;
          panel.classList.toggle('active', isActive);
        }
      };

      for (let t = 0; t < tabBtns.length; t++) {
        tabBtns[t].addEventListener('click', handleTabClick);
      }
    }

    // Keyboard navigation
    const handleKeydown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        // ESC dismisses - reject in EU mode, accept in non-EU mode
        handleConsent(!inEU);
      } else if (e.key === 'Tab') {
        // Focus trap (query inside shadow DOM)
        const focusableElements = shadow.querySelectorAll('button:not([style*="display: none"]):not([style*="display:none"]), input, a');
        const firstElement = focusableElements[0] as HTMLElement | undefined;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement | undefined;

        // Get active element inside shadow DOM
        const activeEl = shadow.activeElement || document.activeElement;

        if (firstElement && lastElement) {
          if (e.shiftKey && activeEl === firstElement) {
            e.preventDefault();
            lastElement.focus();
          } else if (!e.shiftKey && activeEl === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeydown);

    // Non-EU: auto-accept (only in minimal mode)
    let timer: ReturnType<typeof setTimeout> | null = null;
    let scrollHandler: (() => void) | null = null;

    if (!inEU && !hasCategories) {
      const timeout = validatedConfig.autoAcceptDelay;

      const autoAccept = (): void => {
        handleConsent(true);
      };

      if (timeout > 0) {
        timer = setTimeout(autoAccept, timeout);
      }

      // Only add scroll listener if explicitly enabled (default: false)
      if (config.autoAcceptOnScroll) {
        scrollHandler = (): void => {
          if (timer) clearTimeout(timer);
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
  function createWidget(): void {
    // Don't create if one already exists
    if (document.getElementById(widgetId)) return;

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
  const instance: CookieBannerInstance = {
    get status() {
      return _status;
    },

    getConsent() {
      return _consentState;
    },

    hasConsent(categoryId: string) {
      if (!_consentState) return false;
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
        if (banner._cleanup) banner._cleanup();
        banner.remove();
        banner = null;
      }
      // Show banner in expanded mode for managing consent
      banner = createBannerElement(true);
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
      this.hideWidget();
      const style = document.getElementById(styleId);
      if (style) style.remove();
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
      if (!_consentState) return null;
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
  if (config.widget?.enabled && _status !== null) {
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
export function setup(): LegacyCookieBannerAPI | null {
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

/**
 * Parse config from script tag data attributes
 * Supports: data-force-eu, data-tabs, data-msg, data-accept-text, data-reject-text, etc.
 */
function parseDataAttributes(script: HTMLScriptElement): CookieBannerConfig {
  const config: CookieBannerConfig = {};

  // Boolean attributes (presence = true)
  if (script.hasAttribute('data-force-eu')) config.forceEU = true;
  if (script.hasAttribute('data-tabs')) config.tabs = { enabled: true };
  if (script.hasAttribute('data-gdpr')) config.mode = 'gdpr';

  // String attributes
  const msg = script.getAttribute('data-msg');
  if (msg) config.msg = msg;

  const acceptText = script.getAttribute('data-accept-text');
  if (acceptText) config.acceptText = acceptText;

  const rejectText = script.getAttribute('data-reject-text');
  if (rejectText) config.rejectText = rejectText;

  const privacyUrl = script.getAttribute('data-privacy-url');
  if (privacyUrl) config.privacyPolicyUrl = privacyUrl;

  const cookieName = script.getAttribute('data-cookie-name');
  if (cookieName) config.cookieName = cookieName;

  // Number attributes
  const days = script.getAttribute('data-days');
  if (days) config.days = parseInt(days, 10);

  return config;
}

function autoInit(): void {
  if (_initialized) return;
  _initialized = true;

  // Merge data attributes with window.CookieBannerConfig
  let config: CookieBannerConfig = window.CookieBannerConfig || {};

  // Parse data attributes from current script tag
  const script = document.currentScript as HTMLScriptElement | null;
  if (script) {
    const dataConfig = parseDataAttributes(script);
    config = { ...dataConfig, ...config }; // window config overrides data attributes
  }

  // Set merged config back
  window.CookieBannerConfig = config;

  setup();
}

// Only auto-init if loaded as a script (not imported as module)
if (
  isBrowser &&
  (typeof window.CookieBannerConfig !== 'undefined' ||
    (document.currentScript && document.currentScript.getAttribute('type') !== 'module'))
) {
  autoInit();
}
