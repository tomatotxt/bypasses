// ==UserScript==
// @name         Work.ink Bypass & Adblock
// @namespace    http://tampermonkey.net/
// @version      13.4
// @description  Bypasses the extension check and hides ads/popups on Work.ink for a cleaner experience.
// @author       tomato.txt
// @match        *://*.work.ink/*
// @run-at       document-start
// @grant        unsafeWindow
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    // --- Part 1: Ad & Popup Hiding ---
    // List of CSS selectors for elements we want to hide.
    const filters = `
        /* Blocks BSA ad zones by targeting the start of their dynamic ID */
        [id^="bsa-zone_"],

        /* Blocks the main popup/modal overlay */
        div.fixed.inset-0.bg-black\\/50.backdrop-blur-sm,

        /* Hides the "Done" banner that may appear */
        div.done-banner-container.svelte-1yjmk1g,

        /* Blocks inserted ad elements (often used by ad networks) */
        ins:nth-of-type(1),

        /* A fragile rule from your list. May break or hide the wrong thing. */
        div:nth-of-type(9),

        /* A broad rule from your list. May hide legitimate text. */
        p[style] {
            display: none !important;
        }
    `;

    // Function to inject our CSS filters into the page's <head>
    function addStyles(css) {
        const style = document.createElement('style');
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
    }

    // Apply the filters immediately
    addStyles(filters);


    // --- Part 2: Extension Bypass Logic ---
    const spoofedExtensionId = 'deaiapbieocoklikiokamcdklicacgdo';
    const detectionValue = 'wk_installed';
    const fakeSuccessResponse = { "installed": true, "name": "pdfeditor" };

    if (typeof unsafeWindow.chrome === 'undefined') unsafeWindow.chrome = {};
    if (typeof unsafeWindow.chrome.runtime === 'undefined') unsafeWindow.chrome.runtime = {};
    if (typeof unsafeWindow.chrome.runtime.sendMessage !== 'undefined') return;

    unsafeWindow.chrome.runtime.sendMessage = function(extensionId, message, options, responseCallback) {
        const callback = [responseCallback, options].find(arg => typeof arg === 'function');
        let isMatch = false;

        if ((typeof message === 'object' && message !== null && message.message === detectionValue) ||
            (typeof message === 'string' && message === detectionValue)) {
            isMatch = true;
        }

        if (extensionId === spoofedExtensionId && isMatch) {
            if (callback) {
                setTimeout(() => callback(fakeSuccessResponse), 50 + Math.random() * 100);
            }
        }
    };
})();
