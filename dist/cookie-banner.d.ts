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
export declare const DEFAULT_CATEGORIES: CookieCategory[];
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
export interface LegacyCookieBannerAPI {
    readonly ok: boolean | null;
    yes(): void;
    no(): void;
    reset(): void;
    destroy(): void;
}
interface ValidatedConfig extends CookieBannerConfig {
    cookieName: string;
    days: number;
    autoAcceptDelay: number;
}
declare global {
    interface Window {
        CookieBanner?: LegacyCookieBannerAPI;
        CookieBannerConfig?: CookieBannerConfig;
    }
}
/** Default About tab content - cookie law boilerplate (concise) */
export declare const DEFAULT_ABOUT_CONTENT = "<p>Cookies are small text files stored on your device to improve your experience.</p>\n<p>We require your consent for non-essential cookies per GDPR Art. 6. You can change your preferences at any time.</p>\n<p style=\"margin-top:10px;font-size:10px;opacity:0.5\">Powered by <a href=\"https://github.com/DreadfulCode/smallest-cookie-banner\" target=\"_blank\" rel=\"noopener\" style=\"color:inherit\">smallest-cookie-banner</a></p>";
/** Default CSS - uses CSS custom properties for easy overrides */
/** Includes WCAG 2.1 AA compliant touch targets (44x44px min) */
export declare const DEFAULT_CSS: string;
/**
 * Sanitize CSS to prevent injection attacks
 * Blocks: @import, url() with external URLs, expression(), behavior:, -moz-binding, HTML tags
 */
export declare function sanitizeCss(css: string): string;
/**
 * Sanitize URLs to prevent javascript: XSS and phishing
 * Only allows http:, https:, and relative URLs
 */
export declare function sanitizeUrl(url: string): string;
/**
 * Sanitize inline styles (more restrictive than CSS blocks)
 */
export declare function sanitizeInlineStyle(style: string): string;
/**
 * Validate and sanitize configuration
 * @throws Error if cookieName contains invalid characters
 */
export declare function validateConfig(config: CookieBannerConfig): ValidatedConfig;
/**
 * Detect if user is likely in EU based on timezone
 */
export declare function isEU(): boolean;
/**
 * Get consent value from cookie
 */
export declare function getConsent(cookieName?: string): string | null;
/**
 * Set consent cookie
 */
export declare function setConsent(value: string, cookieName?: string, days?: number, domain?: string): void;
/**
 * Delete consent cookie
 */
export declare function deleteConsent(cookieName?: string, domain?: string): void;
/**
 * Parse granular consent from cookie value
 * Format: "cat1:1,cat2:0,cat3:1" or legacy "1"/"0"
 */
export declare function parseGranularConsent(value: string | null, categories?: CookieCategory[]): ConsentState | null;
/**
 * Encode granular consent to cookie value
 */
export declare function encodeGranularConsent(state: ConsentState): string;
/**
 * Inject styles (once per ID) - kept for backwards compatibility
 * @internal In v2.0, styles are injected into Shadow DOM instead
 */
declare function _injectStyles(id: string, css: string, nonce?: string): void;
export { _injectStyles as injectStyles };
/**
 * Reset singleton state (for testing only)
 * @internal
 */
export declare function _resetSingleton(): void;
/**
 * Create a new cookie banner instance
 * Framework-friendly: no global state, proper cleanup, SSR-safe
 *
 * By default, prevents duplicate banners. Set `config.allowMultiple = true` to override.
 */
export declare function createCookieBanner(config?: CookieBannerConfig): CookieBannerInstance;
/**
 * Set up the global window.CookieBanner API
 * Called automatically when loaded via script tag
 */
export declare function setup(): LegacyCookieBannerAPI | null;
