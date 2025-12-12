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
export interface LegacyCookieBannerAPI {
    ok: boolean | null;
    yes(): void;
    no(): void;
    reset(): void;
    destroy(): void;
}
/** Default CSS - uses CSS custom properties for easy overrides */
export declare const DEFAULT_CSS = "#ckb{position:var(--ckb-position,fixed);bottom:var(--ckb-bottom,0);top:var(--ckb-top,auto);left:var(--ckb-left,0);right:var(--ckb-right,0);padding:var(--ckb-padding,8px 12px);background:var(--ckb-bg,#222);color:var(--ckb-color,#fff);font:var(--ckb-font,12px system-ui,sans-serif);display:flex;align-items:center;gap:var(--ckb-gap,8px);z-index:var(--ckb-z,9999);flex-wrap:wrap}#ckb p{margin:0;flex:1;min-width:200px}#ckb button{padding:var(--ckb-btn-padding,6px 12px);border:var(--ckb-btn-border,none);border-radius:var(--ckb-btn-radius,3px);background:var(--ckb-btn-bg,#fff);color:var(--ckb-btn-color,#222);font:inherit;cursor:pointer}#ckb #ckn{background:var(--ckb-reject-bg,transparent);color:var(--ckb-reject-color,inherit);border:var(--ckb-reject-border,1px solid currentColor)}";
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
export declare function setConsent(value: string, cookieName?: string, days?: number): void;
/**
 * Delete consent cookie
 */
export declare function deleteConsent(cookieName?: string): void;
/**
 * Create a new cookie banner instance
 * Framework-friendly: no global state, proper cleanup, SSR-safe
 */
export declare function createCookieBanner(config?: CookieBannerConfig): CookieBannerInstance;
/**
 * Initialize with legacy global API (window.CookieBanner)
 * Called automatically when loaded via script tag
 */
export declare function initLegacy(): LegacyCookieBannerAPI | null;
