// ==UserScript==
// @name         Work.ink Auto-Clicker (Cooldown + Focus Detection)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Adds a UI to set a custom cooldown before automatically clicking "Go To Destination" or "Accept". Stops when the tab loses focus.
// @author       You
// @match        *://work.ink/*
// @match        *://*.work.ink/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration (from original script) ---
    const TEXTS_TO_CLICK = ['Go To Destination', 'Accept'];
    const CLICK_INTERVAL = 50; // The fast 50ms interval is preserved.
    const ENABLE_LOGGING = true;

    // --- UI and Styling ---
    GM_addStyle(`
        #cooldown-container {
            position: fixed; top: 20px; right: 20px; background-color: #2c2c2e; border: 1px solid #444;
            padding: 15px; z-index: 9999; text-align: center; border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2); cursor: move; color: #f0f0f0;
        }
        #cooldown-container h3 {
            margin-top: 0; margin-bottom: 10px; font-family: Arial, sans-serif; font-size: 16px;
        }
        #cooldown-input {
            width: 80px; padding: 5px; margin: 5px 0 10px 0; border: 1px solid #555;
            border-radius: 4px; background-color: #3a3a3c; color: #f0f0f0;
        }
        #save-cooldown-btn {
            width: 100%; padding: 8px; background-color: #007aff; color: white;
            border: none; border-radius: 4px; cursor: pointer; transition: background-color 0.2s;
        }
        #save-cooldown-btn:hover { background-color: #0056b3; }
        #status-message { margin-top: 10px; font-family: Arial, sans-serif; font-size: 12px; color: #aaa; }
    `);

    const container = document.createElement('div');
    container.id = 'cooldown-container';
    container.innerHTML = `
        <h3>Clicker Cooldown</h3>
        <label for="cooldown-input">Wait (seconds):</label><br>
        <input type="number" id="cooldown-input" min="0">
        <button id="save-cooldown-btn">Save & Reload</button>
        <div id="status-message"></div>
    `;
    document.body.appendChild(container);

    // --- UI Functionality ---
    const cooldownInput = document.getElementById('cooldown-input');
    const saveButton = document.getElementById('save-cooldown-btn');
    const statusMessage = document.getElementById('status-message');

    // Load saved cooldown value, default to 3 seconds if not set
    let savedCooldown = GM_getValue('cooldown', 3);
    cooldownInput.value = savedCooldown;

    saveButton.addEventListener('click', () => {
        const newCooldown = parseInt(cooldownInput.value, 10);
        if (!isNaN(newCooldown) && newCooldown >= 0) {
            GM_setValue('cooldown', newCooldown);
            statusMessage.textContent = `Saved! Reloading...`;
            setTimeout(() => location.reload(), 1000);
        } else {
            statusMessage.textContent = 'Invalid number.';
        }
    });

    // Make the panel draggable
    let isDragging = false, offsetX, offsetY;
    container.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - container.offsetLeft;
        offsetY = e.clientY - container.offsetTop;
    });
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            container.style.left = `${e.clientX - offsetX}px`;
            container.style.top = `${e.clientY - offsetY}px`;
        }
    });
    document.addEventListener('mouseup', () => { isDragging = false; });


    // --- Main Logic (from original script, wrapped in cooldown) ---
    let clickIntervalId = null;
    let isActive = true;

    const log = (message, ...args) => {
        if (ENABLE_LOGGING) {
            console.log('%cWork.ink Auto-Clicker:%c ' + message, 'font-weight: bold; color: magenta;', '', ...args);
        }
    };

    const clickElements = () => {
        if (!isActive) {
            log("🛑 Stopping click loop due to loss of focus.");
            clearInterval(clickIntervalId);
            clickIntervalId = null;
            return;
        }
        try {
            const containsConditions = TEXTS_TO_CLICK.map(text => `contains(., '${text}')`).join(' or ');
            const xpath = `//*[self::button or self::a or self::div or self::span][${containsConditions}]`;
            const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

            for (let i = 0; i < result.snapshotLength; i++) {
                const element = result.snapshotItem(i);
                if (element && element.offsetParent !== null) { // Check if visible
                    log('Clicking element ->', element);
                    element.click();
                }
            }
        } catch (error) {
            console.error('Work.ink Auto-Clicker: An error occurred during the click loop.', error);
        }
    };

    // --- Focus Loss Detection and Cleanup (from original script) ---
    const onBlur = () => {
        log("🛑 Tab lost focus. Stopping the script.");
        isActive = false;
    };

    window.addEventListener('blur', onBlur);
    window.addEventListener('beforeunload', () => {
        if (clickIntervalId !== null) {
            clearInterval(clickIntervalId);
        }
        window.removeEventListener('blur', onBlur);
    });


    // --- Start the Script with Cooldown ---
    log(`Script active. Waiting for ${savedCooldown} second(s) before starting.`);
    statusMessage.textContent = `Waiting ${savedCooldown}s...`;

    setTimeout(() => {
        if (!isActive) {
            log("Tab lost focus during cooldown. Not starting clicker.");
            statusMessage.textContent = "Stopped (focus loss).";
            return;
        }

        log(`Cooldown finished. Starting click loop every ${CLICK_INTERVAL}ms.`);
        statusMessage.textContent = "Clicker is active.";

        // Start the original clicking loop
        clickIntervalId = setInterval(clickElements, CLICK_INTERVAL);

    }, savedCooldown * 1000); // Convert seconds to milliseconds

})();