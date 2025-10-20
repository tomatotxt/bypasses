// ==UserScript==
// @name         Auto-Click Enabled Button on key.volcano.wtf
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Waits for the 'primaryButton' to be enabled, then waits 1 second and clicks it.
// @author       Your Name
// @match        *://key.volcano.wtf/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const targetButtonId = 'primaryButton';

    // Function to handle the button click after a delay
    const clickButton = (button) => {
        setTimeout(() => {
            button.click();
        }, 1000); // 1-second delay
    };

    // Use MutationObserver to efficiently watch for changes to the button
    const observer = new MutationObserver((mutationsList, observer) => {
        for(const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'disabled') {
                const button = mutation.target;
                if (!button.disabled) {
                    // Button is no longer disabled, disconnect the observer and click
                    observer.disconnect();
                    clickButton(button);
                }
            }
        }
    });

    // Start observing the button for attribute changes
    const startObserver = () => {
        const button = document.getElementById(targetButtonId);
        if (button) {
            // Check if the button is already enabled when the script runs
            if (!button.disabled) {
                clickButton(button);
            } else {
                // If disabled, start observing for changes
                observer.observe(button, { attributes: true });
            }
        }
    };

    // Initial check in case the element is not immediately present
    const initialCheck = setInterval(() => {
        if (document.getElementById(targetButtonId)) {
            clearInterval(initialCheck);
            startObserver();
        }
    }, 50); // Check every 500 milliseconds

})();