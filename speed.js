let hud = null;
let holdInterval = null;

let brightness = 1;
let brightnessStep = 0.1;

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

// 🎯 ALT + SCROLL (speed control)
document.addEventListener("wheel", e => {
    const video = document.querySelector("video");
    if (!video || !e.altKey) return;

    e.preventDefault();

    let change = e.deltaY < 0 ? 0.1 : -0.1;
    video.playbackRate = clamp(video.playbackRate + change, 1, 3.5);

    showHUD(`⚡ ${video.playbackRate.toFixed(1)}x`);
}, { passive: false });

// 🎯 ALT + ARROW KEYS
document.addEventListener("keydown", e => {
    const video = document.querySelector("video");
    if (!video || !e.altKey) return;

    let action = null;

    if (e.key === "ArrowRight") action = "speedUp";
    if (e.key === "ArrowLeft") action = "speedDown";
    if (e.key === "ArrowUp") action = "brightUp";
    if (e.key === "ArrowDown") action = "brightDown";

    if (!action) return;

    e.preventDefault();

    function apply() {
        if (action === "speedUp") {
            video.playbackRate = clamp(video.playbackRate + 0.1, 1, 3.5);
            showHUD(`⚡ ${video.playbackRate.toFixed(1)}x`);
        }

        if (action === "speedDown") {
            video.playbackRate = clamp(video.playbackRate - 0.1, 1, 3.5);
            showHUD(`⚡ ${video.playbackRate.toFixed(1)}x`);
        }

        if (action === "brightUp") {
            brightness = clamp(brightness + brightnessStep, 0.5, 2);
            video.style.filter = `brightness(${brightness})`;
            showHUD(`☀️ ${brightness.toFixed(1)}x`);
        }

        if (action === "brightDown") {
            brightness = clamp(brightness - brightnessStep, 0.5, 2);
            video.style.filter = `brightness(${brightness})`;
            showHUD(`☀️ ${brightness.toFixed(1)}x`);
        }
    }

    if (!holdInterval) {
        apply();
        holdInterval = setInterval(apply, 120);
    }
});

// stop hold
document.addEventListener("keyup", () => {
    if (holdInterval) {
        clearInterval(holdInterval);
        holdInterval = null;
    }
});
