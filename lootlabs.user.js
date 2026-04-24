// ==UserScript==
// @name         Checkpoint 1 - Intelligence Sniper
// @namespace    http://tampermonkey.net/
// @version      6.0
// @description  Hides UI, detects task times from HTML, snipes link, and redirects.
// @author       AI Assistant
// @match        *://*.cloudfront.net/*
// @match        *://links.lootlabs.gg/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    let snipedLink = null;
    let bypassActive = false;

    // 1. Forceful "Curtain" Style
    const style = document.createElement('style');
    style.innerHTML = `
        #bypass-screen {
            position: fixed; inset: 0; z-index: 2147483647;
            background: #020617; color: #f8fafc;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        .container { text-align: center; width: 320px; }
        .header { font-size: 14px; font-weight: 800; letter-spacing: 0.2em; color: #38bdf8; margin-bottom: 5px; text-transform: uppercase; }
        .sub-header { font-size: 11px; color: #64748b; margin-bottom: 30px; }
        .progress-container { width: 100%; height: 6px; background: #1e293b; border-radius: 10px; overflow: hidden; margin-bottom: 15px; }
        #progress-bar { width: 0%; height: 100%; background: #0ea5e9; transition: width 1s linear; box-shadow: 0 0 15px #0ea5e9; }
        .timer-val { font-size: 32px; font-weight: 300; font-variant-numeric: tabular-nums; }
        .footer-note { font-size: 10px; color: #334155; margin-top: 40px; text-transform: uppercase; cursor: pointer; }
        .footer-note:hover { color: #475569; }
    `;
    document.documentElement.appendChild(style);

    // 2. Decoder Logic (The original logic from the site)
    function decrypt(encoded) {
        try {
            let raw = atob(encoded);
            let key = raw.substring(0, 5);
            let content = raw.substring(5);
            let decoded = '';
            for (let i = 0; i < content.length; i++) {
                decoded += String.fromCharCode(content.charCodeAt(i) ^ key.charCodeAt(i % 5));
            }
            return decoded.includes('http') ? decoded : null;
        } catch (e) { return null; }
    }

    function attemptRedirect(url) {
        if (snipedLink) return;
        snipedLink = url;
        const statusEl = document.querySelector('.sub-header');
        const timerEl = document.querySelector('.timer-val');
        if (statusEl) statusEl.innerText = "LINK ACQUIRED";
        if (timerEl) {
            timerEl.innerText = "GO";
            timerEl.style.color = "#10b981";
        }
        document.getElementById('progress-bar').style.width = "100%";
        document.getElementById('progress-bar').style.background = "#10b981";
        setTimeout(() => { window.location.href = url; }, 400);
    }

    // 3. Channel Sniffing (WS, Fetch, XHR)
    const WS = window.WebSocket;
    window.WebSocket = function(a, b) {
        const ws = new WS(a, b);
        ws.addEventListener('message', (e) => {
            if (typeof e.data === 'string' && e.data.startsWith('r:')) {
                const url = decrypt(e.data.replace('r:', ''));
                if (url) attemptRedirect(url);
            }
        });
        return ws;
    };

    const origFetch = window.fetch;
    window.fetch = async (...args) => {
        const response = await origFetch(...args);
        const clone = response.clone();
        try {
            const data = await clone.json();
            const possible = data.url || data.link || data.destination;
            if (possible && possible.includes('http')) attemptRedirect(possible);
        } catch (e) {}
        return response;
    };

    // 4. UI Creation
    function createUI(estimatedSeconds) {
        if (document.getElementById('bypass-screen')) return;
        const screen = document.createElement('div');
        screen.id = 'bypass-screen';
        screen.innerHTML = `
            <div class="container">
                <div class="header">Bypass Active</div>
                <div class="sub-header">Analyzing security protocols...</div>
                <div class="timer-val" id="b-timer">${estimatedSeconds}s</div>
                <div class="progress-container">
                    <div id="progress-bar"></div>
                </div>
                <div class="footer-note" onclick="document.getElementById('bypass-screen').remove()">Hide Overlay</div>
            </div>
        `;
        document.body.appendChild(screen);

        let current = estimatedSeconds;
        const tick = setInterval(() => {
            if (snipedLink || current <= 0) {
                clearInterval(tick);
                return;
            }
            current--;
            document.getElementById('b-timer').innerText = current + 's';
            let percent = ((estimatedSeconds - current) / estimatedSeconds) * 100;
            document.getElementById('progress-bar').style.width = percent + "%";
        }, 1000);
    }

    // 5. Intelligent Task Detection
    const findAndStartTasks = () => {
        const tasks = document.querySelectorAll('.task');
        if (tasks.length > 0 && !bypassActive) {
            bypassActive = true;

            let maxTaskTime = 15; // Minimum fallback
            
            tasks.forEach(task => {
                // Look for the task-time div provided in your prompt
                const timeDiv = task.querySelector('.task-time');
                if (timeDiv) {
                    const foundTime = parseInt(timeDiv.innerText.replace(/\D/g, ''));
                    if (!isNaN(foundTime) && foundTime > maxTaskTime) {
                        maxTaskTime = foundTime;
                    }
                }
                task.click(); // Trigger the task
            });

            createUI(maxTaskTime);
            console.log(`Bypass: Tasks started. Longest wait: ${maxTaskTime}s`);
        }
    };

    // Use MutationObserver to wait for tasks to appear in the DOM
    const observer = new MutationObserver(() => {
        findAndStartTasks();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

})();
