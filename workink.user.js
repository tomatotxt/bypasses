// ==UserScript==
// @name         Work.ink Adblock Bypass and Auto-Clicker (Volcano Key System Support)
// @namespace    http://tampermonkey.net/
// @version      117.2
// @description  Bypasses adblock/extension checks, auto-clicks buttons, and waits 30 seconds on Volcano Key System.
// @author       tomato.txt
// @match        *://*.work.ink/*
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    /**
     * This function contains the entire logic for the script,
     * including ad hiding, extension bypass, and the auto-clicker.
     */
    function initializeScript() {
        // --- Part 1: Ad & Popup Hiding ---
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

            /* Hides a main content container or panel */
            div.fixed.top-16.left-0.right-0.bottom-0.bg-white.z-40.overflow-y-auto,

            /* A broad rule from your list. May hide legitimate text. */
            p[style] {
                display: none !important;
            }
        `;

        function addStyles(css) {
            const style = document.createElement('style');
            style.textContent = css;
            (document.head || document.documentElement).appendChild(style);
        }
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

        // --- Part 3: Automatic Button Clicker (Stops on Unfocus) ---
        const clickIntervalTime = 250; // Clicks every 250 milliseconds (4 times a second)
        let clickerInterval = null;

        function startClicking() {
            if (clickerInterval === null) {
                clickerInterval = setInterval(() => {
                    const buttons = document.querySelectorAll('.button.large.accessBtn');
                    buttons.forEach(button => {
                        if (button) {
                            button.click();
                        }
                    });
                }, clickIntervalTime);
            }
        }

        function stopClicking() {
            clearInterval(clickerInterval);
            clickerInterval = null;
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                stopClicking();
            }
        });

        if (!document.hidden) {
            startClicking();
        }
    }

    // --- Part 4: URL-based Delay Logic ---
    const thirtySeconds = 0;

    // Check if the specific path is in the URL
    if (window.location.href.includes('work.ink/22hr/')) {
        // If it is, wait 30 seconds before running the script
        setTimeout(initializeScript, thirtySeconds);
    } else {
        // Otherwise, run the script immediately
        initializeScript();
    }

})();
