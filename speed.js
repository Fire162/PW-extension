let hud = null;
let holdInterval = null;

let brightness = 1;
let brightnessStep = 0.1;

// 🧠 Smart state tracking for the Spacebar
let spaceTimer = null;
let originalSpeed = null;
let isHoldingSpace = false;

// 📈 Ramp-up Feature State
let rampTimeout = null;
let isRampRunning = false;

// Create HUD
function createHUD() {
    if (hud) return;

    hud = document.createElement("div");
    hud.id = "speed-hud";

    Object.assign(hud.style, {
        position: "fixed",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(0,0,0,0.8)",
        color: "white",
        padding: "8px 16px",
        fontSize: "16px",
        borderRadius: "8px",
        zIndex: 999999,
        fontFamily: "Arial, sans-serif",
        display: "none",
        transition: "opacity 0.2s ease"
    });

    document.body.appendChild(hud);
}

// Show HUD
function showHUD(text) {
    createHUD();

    hud.innerText = text;
    hud.style.display = "block";
    hud.style.opacity = "1";

    clearTimeout(hud.hideTimer);

    hud.hideTimer = setTimeout(() => {
        hud.style.opacity = "0";
    }, 1200);
}

// Clamp helper
function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

// Format numbers to at most 3 decimal places, removing trailing zeros
function formatNum(val) {
    return parseFloat(val.toFixed(3));
}

// 🛑 Stop Ramp
function clearRampProgression() {
    if (rampTimeout) clearTimeout(rampTimeout);

    rampTimeout = null;
    isRampRunning = false;
}

// 🚀 Ramp Logic
function toggleRampProgression(video) {

    if (isRampRunning) {
        clearRampProgression();
        showHUD(`🛑 Ramp Stopped at ${formatNum(video.playbackRate)}x`);
        return;
    }

    isRampRunning = true;

    function planNextStep() {

        const currentSpeed = formatNum(video.playbackRate);

        if (currentSpeed >= 2.5) {
            showHUD(`⚡ Target Max Reached: 2.5x`);
            clearRampProgression();
            return;
        }

        let currentStep = Math.round((currentSpeed - 1.0) * 10) + 1;

        if (currentStep < 1) currentStep = 1;

        let waitTime = currentStep * 25000;

        showHUD(`📈 Ramp Active: ${formatNum(currentSpeed)}x (Next delay: ${currentStep * 20}s)`);

        rampTimeout = setTimeout(() => {

            if (!isRampRunning) return;

            video.playbackRate = formatNum(clamp(video.playbackRate + 0.1, 1, 2.0));

            planNextStep();

        }, waitTime);
    }

    planNextStep();
}

// 🎯 ALT + SCROLL
document.addEventListener("wheel", e => {

    const video = document.querySelector("video");

    if (!video || !e.altKey) return;

    e.preventDefault();

    if (isRampRunning) {
        clearRampProgression();
        showHUD(`🛑 Ramp Interrupted`);
    }

    let change = e.deltaY < 0 ? 0.1 : -0.1;

    video.playbackRate = formatNum(clamp(video.playbackRate + change, 1, 3.5));

    showHUD(`⚡ ${formatNum(video.playbackRate)}x`);

}, { passive: false });

// 🎯 KEYDOWN
document.addEventListener("keydown", e => {

    // ⛔ Ignore typing areas
    const active = document.activeElement;

    if (
        ["INPUT", "TEXTAREA"].includes(active.tagName) ||
        active.isContentEditable
    ) {
        return;
    }

    // 🔥 "\" → SVG poll button
    if (e.key === "\\") {

        e.preventDefault();
        e.stopImmediatePropagation();

        document.querySelector('path[d^="M10.2993 28.3004"]')
            ?.closest("svg")
            ?.parentElement
            ?.click();

        return;
    }

    // 🔥 "'" → chat/message button
    if (e.key === "'") {

        e.preventDefault();
        e.stopImmediatePropagation();

        document.querySelector('path[d^="M26.982 21.097"]')
            ?.closest("svg")
            ?.parentElement
            ?.click();

        return;
    }

    // 🔥 "/" → old poll icon
    if (e.key === "/" && !e.ctrlKey) {

        e.preventDefault();
        e.stopImmediatePropagation();

        document.getElementById("poll-icon")?.click();

        return;
    }

    const video = document.querySelector("video");

    if (!video) return;

    // 🔥 CTRL + /
    if (e.ctrlKey && (e.key === "/" || e.code === "Slash")) {

        e.preventDefault();
        e.stopImmediatePropagation();

        toggleRampProgression(video);

        return;
    }

    // 🔥 HOLD SPACE
    if (e.key === " " || e.code === "Space") {

        e.preventDefault();
        e.stopImmediatePropagation();

        if (isHoldingSpace) return;

        if (!spaceTimer) {

            originalSpeed = video.playbackRate;

            spaceTimer = setTimeout(() => {

                isHoldingSpace = true;

                video.playbackRate = 2.0;

                showHUD(`⚡ ${formatNum(video.playbackRate)}x (Held)`);

                if (video.paused) {
                    video.play();
                }

            }, 250);
        }

        return;
    }

    // 🎯 ALT + ARROWS
    if (!e.altKey) return;

    let action = null;

    if (e.key === "ArrowRight") action = "speedUp";
    if (e.key === "ArrowLeft") action = "speedDown";
    if (e.key === "ArrowUp") action = "brightUp";
    if (e.key === "ArrowDown") action = "brightDown";

    if (!action) return;

    e.preventDefault();

    if (["speedUp", "speedDown"].includes(action) && isRampRunning) {
        clearRampProgression();
        showHUD(`🛑 Ramp Interrupted`);
    }

    function apply() {

        if (action === "speedUp") {

            video.playbackRate = formatNum(clamp(video.playbackRate + 0.1, 1, 3.5));

            showHUD(`⚡ ${formatNum(video.playbackRate)}x`);
        }

        if (action === "speedDown") {

            video.playbackRate = formatNum(clamp(video.playbackRate - 0.1, 1, 3.5));

            showHUD(`⚡ ${formatNum(video.playbackRate)}x`);
        }

        if (action === "brightUp") {

            brightness = formatNum(clamp(brightness + brightnessStep, 0.5, 2));

            video.style.filter = `brightness(${brightness})`;

            showHUD(`☀️ ${formatNum(brightness)}x`);
        }

        if (action === "brightDown") {

            brightness = formatNum(clamp(brightness - brightnessStep, 0.5, 2));

            video.style.filter = `brightness(${brightness})`;

            showHUD(`☀️ ${formatNum(brightness)}x`);
        }
    }

    if (!holdInterval) {

        apply();

        holdInterval = setInterval(apply, 120);
    }

}, true);

// 🎯 KEYUP
document.addEventListener("keyup", e => {

    // ⛔ Ignore typing areas
    const active = document.activeElement;

    if (
        ["INPUT", "TEXTAREA"].includes(active.tagName) ||
        active.isContentEditable
    ) {
        return;
    }

    const video = document.querySelector("video");

    if (holdInterval) {

        clearInterval(holdInterval);

        holdInterval = null;
    }

    if (e.key === " " || e.code === "Space") {

        e.preventDefault();
        e.stopImmediatePropagation();

        clearTimeout(spaceTimer);

        spaceTimer = null;

        if (isHoldingSpace) {

            if (video && originalSpeed !== null) {

                video.playbackRate = formatNum(originalSpeed);

                showHUD(`⚡ ${formatNum(video.playbackRate)}x`);
            }

            isHoldingSpace = false;

        } else {

            if (video) {

                if (video.paused) {
                    video.play();
                } else {
                    video.pause();
                }
            }
        }
    }

}, true);
