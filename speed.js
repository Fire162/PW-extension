let hud = null;

// Create top HUD
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
function showHUD(speed) {
    createHUD();
    hud.innerText = `Speed: ${speed.toFixed(1)}x`;
    hud.style.display = "block";
    hud.style.opacity = "1";

    clearTimeout(hud.hideTimer);
    hud.hideTimer = setTimeout(() => {
        hud.style.opacity = "0";
    }, 1200);
}

// Main logic
document.addEventListener("wheel", e => {
    const video = document.querySelector("video");
    if (!video) return;

    if (!e.altKey) return;

    let change = e.deltaY < 0 ? 0.1 : -0.1;

    let newRate = video.playbackRate + change;

    // Clamp between 1 and 3.5
    newRate = Math.max(1, Math.min(3.5, newRate));

    video.playbackRate = newRate;

    showHUD(newRate);
});
