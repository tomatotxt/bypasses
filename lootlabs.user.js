// ==UserScript==
// @name         Universal LootLabs Bypass
// @namespace    http://tampermonkey.net/
// @version      8.1
// @description  Instant bypass for LootLabs. Snipes links directly from data streams without unnecessary delays.
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
     * @constant {Object} CONFIG
     * Centralized configuration for selectors and UI IDs.
     */
    const CONFIG = {
        OVERLAY_ID: 'bypass-curtain',
        STATUS_ID: 'bypass-status',
        TIMER_ID: 'bypass-timer',
        BAR_ID: 'bypass-bar',
        TASK_SELECTOR: '.task',
        TIME_SELECTOR: '.task-time'
    };

    let isRedirecting = false;

    /**
     * XOR Decryption logic extracted from the platform's core.
     * @param {string} encoded - The base64 + XOR encoded string.
     * @returns {string|null} - The decrypted URL or null if invalid.
     */
    function decryptUrl(encoded) {
        try {
            const raw = atob(encoded);
            const key = raw.substring(0, 5);
            const content = raw.substring(5);
            let result = '';

            for (let i = 0; i < content.length; i++) {
                result += String.fromCharCode(content.charCodeAt(i) ^ key.charCodeAt(i % 5));
            }
            return result.includes('http') ? result : null;
        } catch (err) {
            return null;
        }
    }

    /**
     * Performs an immediate redirection to the sniped URL.
     * @param {string} url - The destination URL.
     */
    function instantRedirect(url) {
        if (isRedirecting) return;
        isRedirecting = true;

        // Update UI state immediately before jump
        const status = document.getElementById(CONFIG.STATUS_ID);
        if (status) status.innerText = "LINK SNIPED! JUMPING...";
        
        // Zero delay redirect
        window.location.replace(url);
    }

    /**
     * Injects a clean bypassing overlay to hide the original site.
     */
    function injectUI() {
        if (document.getElementById(CONFIG.OVERLAY_ID)) return;

        const style = document.createElement('style');
        style.innerHTML = `
            #${CONFIG.OVERLAY_ID} {
                position: fixed; inset: 0; z-index: 2147483647;
                background: #020617; color: #f8fafc;
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                font-family: system-ui, -apple-system, sans-serif;
            }
            .bypass-box { text-align: center; width: 300px; }
            .header { font-size: 14px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 2px; }
            .timer { font-size: 40px; font-weight: 200; margin: 10px 0; }
            .progress-bg { width: 100%; height: 4px; background: #1e293b; border-radius: 2px; overflow: hidden; }
            #${CONFIG.BAR_ID} { width: 0%; height: 100%; background: #38bdf8; transition: width 1s linear; }
            .status { font-size: 11px; color: #64748b; margin-top: 15px; font-family: monospace; }
            .remove-btn { 
                margin-top: 40px; 
                background: transparent; 
                border: 1px solid #334155; 
                color: #475569; 
                padding: 6px 12px; 
                font-size: 10px; 
                text-transform: uppercase; 
                cursor: pointer; 
                letter-spacing: 1px;
                border-radius: 4px;
                transition: all 0.2s;
            }
            .remove-btn:hover { border-color: #f87171; color: #f87171; }
        `;
        document.documentElement.appendChild(style);

        const overlay = document.createElement('div');
        overlay.id = CONFIG.OVERLAY_ID;
        overlay.innerHTML = `
            <div class="bypass-box">
                <div class="header">Bypassing</div>
                <div id="${CONFIG.TIMER_ID}" class="timer">--s</div>
                <div class="progress-bg"><div id="${CONFIG.BAR_ID}"></div></div>
                <div id="${CONFIG.STATUS_ID}" class="status">Intercepting handshake...</div>
                <button class="remove-btn" onclick="document.getElementById('${CONFIG.OVERLAY_ID}').remove()">Remove Overlay</button>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    /**
     * NETWORK HOOKS
     * Monitoring WebSocket and Fetch channels for the real link delivery.
     */

    // 1. WebSocket Hook
    const NativeWebSocket = window.WebSocket;
    window.WebSocket = function(...args) {
        const socket = new NativeWebSocket(...args);
        socket.addEventListener('message', (event) => {
            if (typeof event.data === 'string' && event.data.startsWith('r:')) {
                const decrypted = decryptUrl(event.data.replace('r:', ''));
                if (decrypted) instantRedirect(decrypted);
            }
        });
        return socket;
    };

    // 2. Fetch Hook
    const nativeFetch = window.fetch;
    window.fetch = async (...args) => {
        const response = await nativeFetch(...args);
        const clone = response.clone();
        clone.json().then(data => {
            const possibleLink = data.url || data.link || data.destination;
            if (typeof possibleLink === 'string' && possibleLink.includes('http')) {
                instantRedirect(possibleLink);
            }
        }).catch(() => {});
        return response;
    };

    /**
     * DOM AUTOMATION
     * Scans for tasks, reads estimated time, and starts automation.
     */
    function initializeAutomation() {
        const tasks = document.querySelectorAll(CONFIG.TASK_SELECTOR);
        if (tasks.length > 0 && !isRedirecting) {
            let maxSeconds = 15; // Fallback

            tasks.forEach(task => {
                const timeEl = task.querySelector(CONFIG.TIME_SELECTOR);
                if (timeEl) {
                    const parsed = parseInt(timeEl.innerText.replace(/\D/g, ''));
                    if (!isNaN(parsed) && parsed > maxSeconds) maxSeconds = parsed;
                }
                task.click(); // Start task
            });

            injectUI();
            startCountdown(maxSeconds);
            domObserver.disconnect();
        }
    }

    function startCountdown(seconds) {
        let remaining = seconds;
        const timerText = document.getElementById(CONFIG.TIMER_ID);
        const bar = document.getElementById(CONFIG.BAR_ID);

        const tick = setInterval(() => {
            if (isRedirecting || remaining <= 0 || !document.getElementById(CONFIG.OVERLAY_ID)) return clearInterval(tick);
            remaining--;
            if (timerText) timerText.innerText = `${remaining}s`;
            if (bar) bar.style.width = `${((seconds - remaining) / seconds) * 100}%`;
        }, 1000);
    }

    const domObserver = new MutationObserver(() => initializeAutomation());
    domObserver.observe(document.documentElement, { childList: true, subtree: true });

})();
