// ==UserScript==
// @name         Universal LootLabs Bypass
// @namespace    http://tampermonkey.net/
// @version      7.0
// @description  A clean, readable bypass for LootLabs link lockers. Snipes links from data streams and automates tasks.
// @author       tomato.txt
// @match        *://*.lootlabs.gg/*
// @match        *://*.loot-link.com/*
// @match        *://*.lootdest.org/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    /**
     * CONFIGURATION & STATE
     */
    const STATE = {
        destinationFound: false,
        taskAutomationStarted: false,
        estimatedWaitTime: 15 // Default fallback
    };

    const SELECTORS = {
        taskItem: '.task',
        taskTime: '.task-time',
        overlayId: 'loot-bypass-overlay',
        progressBarId: 'loot-progress-fill',
        statusId: 'loot-status-text',
        timerId: 'loot-timer-text'
    };

    /**
     * UTILITIES
     */

    // Decodes the XOR-encrypted links used by LootLabs
    // Logic extracted from their internal '35.js' logic
    function decryptLootLink(encoded) {
        try {
            const raw = atob(encoded);
            const key = raw.substring(0, 5);
            const encrypted = raw.substring(5);
            let decrypted = '';

            for (let i = 0; i < encrypted.length; i++) {
                decrypted += String.fromCharCode(encrypted.charCodeAt(i) ^ key.charCodeAt(i % 5));
            }
            return decrypted.includes('http') ? decrypted : null;
        } catch (e) {
            return null;
        }
    }

    // Handles the final transition once the link is captured
    function handleRedirect(url) {
        if (STATE.destinationFound) return;
        STATE.destinationFound = true;

        console.log(`[Bypass] Destination sniped: ${url}`);

        const statusEl = document.getElementById(SELECTORS.statusId);
        const barEl = document.getElementById(SELECTORS.progressBarId);

        if (statusEl) statusEl.innerText = "LINK CAPTURED! REDIRECTING...";
        if (barEl) {
            barEl.style.width = "100%";
            barEl.style.backgroundColor = "#10b981";
        }

        setTimeout(() => {
            window.location.replace(url);
        }, 500);
    }

    /**
     * UI COMPONENT (The "Curtain")
     */
    function injectOverlay() {
        if (document.getElementById(SELECTORS.overlayId)) return;

        const style = document.createElement('style');
        style.innerHTML = `
            #${SELECTORS.overlayId} {
                position: fixed; inset: 0; z-index: 2147483647;
                background: #020617; color: #f8fafc;
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                font-family: system-ui, -apple-system, sans-serif;
            }
            .bypass-card { text-align: center; width: 350px; padding: 20px; }
            .header-text { font-size: 16px; font-weight: 800; letter-spacing: 0.1em; color: #38bdf8; text-transform: uppercase; }
            .bar-bg { width: 100%; height: 8px; background: #1e293b; border-radius: 10px; margin: 20px 0; overflow: hidden; }
            #${SELECTORS.progressBarId} { width: 0%; height: 100%; background: #38bdf8; transition: width 1s linear; }
            .timer-val { font-size: 48px; font-weight: 200; margin-bottom: 10px; }
            .status-sub { font-size: 12px; color: #64748b; font-family: monospace; }
            .exit-hint { margin-top: 40px; font-size: 10px; color: #334155; cursor: pointer; text-decoration: underline; }
        `;
        document.documentElement.appendChild(style);

        const overlay = document.createElement('div');
        overlay.id = SELECTORS.overlayId;
        overlay.innerHTML = `
            <div class="bypass-card">
                <div class="header-text">Universal Bypass</div>
                <div id="${SELECTORS.timerId}" class="timer-val">0s</div>
                <div class="bar-bg"><div id="${SELECTORS.progressBarId}"></div></div>
                <div id="${SELECTORS.statusId}" class="status-sub">Synchronizing with server...</div>
                <div class="exit-hint" onclick="document.getElementById('${SELECTORS.overlayId}').remove()">Close Overlay (View Original Page)</div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    function runCountdown(seconds) {
        let remaining = seconds;
        const timerEl = document.getElementById(SELECTORS.timerId);
        const barEl = document.getElementById(SELECTORS.progressBarId);

        const interval = setInterval(() => {
            if (STATE.destinationFound || remaining <= 0) {
                clearInterval(interval);
                return;
            }
            remaining--;
            timerEl.innerText = `${remaining}s`;
            barEl.style.width = `${((seconds - remaining) / seconds) * 100}%`;
        }, 1000);
    }

    /**
     * NETWORK INTERCEPTORS (The Sniffers)
     */

    // 1. WebSocket Hook: Snipes links sent via 'r:' prefix
    const OriginalWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
        const ws = new OriginalWebSocket(url, protocols);
        ws.addEventListener('message', (event) => {
            if (typeof event.data === 'string' && event.data.startsWith('r:')) {
                const encrypted = event.data.replace('r:', '');
                const decrypted = decryptLootLink(encrypted);
                if (decrypted) handleRedirect(decrypted);
            }
        });
        return ws;
    };

    // 2. Fetch Hook: Intercepts links delivered via JSON APIs
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        const clone = response.clone();
        clone.json().then(data => {
            const possible = data.url || data.link || data.destination || data.real_link;
            if (typeof possible === 'string' && possible.includes('http')) {
                handleRedirect(possible);
            }
        }).catch(() => {});
        return response;
    };

    /**
     * DOM AUTOMATION
     */
    function scanAndTriggerTasks() {
        const tasks = document.querySelectorAll(SELECTORS.taskItem);
        if (tasks.length > 0 && !STATE.taskAutomationStarted) {
            STATE.taskAutomationStarted = true;

            let maxFoundTime = 15;

            tasks.forEach(task => {
                // Determine wait time from the HTML elements
                const timeDisplay = task.querySelector(SELECTORS.taskTime);
                if (timeDisplay) {
                    const parsedTime = parseInt(timeDisplay.innerText.replace(/\D/g, ''));
                    if (!isNaN(parsedTime) && parsedTime > maxFoundTime) {
                        maxFoundTime = parsedTime;
                    }
                }
                // Automatically click to start the server-side countdown
                task.click();
            });

            STATE.estimatedWaitTime = maxFoundTime;
            injectOverlay();
            runCountdown(STATE.estimatedWaitTime);
            console.log(`[Bypass] Tasks triggered. Estimated wait: ${maxFoundTime}s`);
        }
    }

    // Monitor for the moment tasks appear on screen
    const domObserver = new MutationObserver(() => scanAndTriggerTasks());
    domObserver.observe(document.documentElement, { childList: true, subtree: true });

    // Speed up standard UI timeouts (Visual only)
    const originalTimeout = window.setTimeout;
    window.setTimeout = function(fn, delay) {
        if (delay >= 1000 && !STATE.destinationFound) delay = 50;
        return originalTimeout(fn, delay);
    };

})();
