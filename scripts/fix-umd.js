/**
 * Fix TypeScript's broken UMD output for browser usage
 *
 * TypeScript's UMD output looks like:
 *
 *   (function (factory) {
 *     if (typeof module === "object" && typeof module.exports === "object") {
 *       // CommonJS - works
 *     }
 *     else if (typeof define === "function" && define.amd) {
 *       // AMD - works
 *     }
 *     // NOTHING FOR BROWSER - factory never gets called!
 *   })(function (require, exports) { ... });
 *
 * This script adds the missing browser fallback so it works via <script> tag.
 */

const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '..', 'dist', 'cookie-banner.js');
let code = fs.readFileSync(distPath, 'utf8');

// Find the broken UMD wrapper pattern
const brokenPattern = /\(function \(factory\) \{\s*if \(typeof module === "object" && typeof module\.exports === "object"\) \{[^}]+\}\s*else if \(typeof define === "function" && define\.amd\) \{[^}]+\}\s*\}\)/;

// The fixed UMD wrapper with browser global fallback
const fixedWrapper = `(function (factory) {
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
})`;

if (brokenPattern.test(code)) {
    code = code.replace(brokenPattern, fixedWrapper);
    fs.writeFileSync(distPath, code);
    console.log('✓ Fixed UMD wrapper for browser compatibility');
} else {
    console.log('⚠ UMD pattern not found - may already be fixed or format changed');
}
