(function () {
  let show = true;
  let el = null;

  function init() {
    const video = document.querySelector("video");
    const durationEl = document.querySelector(".vjs-duration");

    if (!video || !durationEl) return;

    // prevent duplicate
    if (document.querySelector("#remaining-time")) return;

    el = document.createElement("span");
    el.id = "remaining-time";

    Object.assign(el.style, {
      marginLeft: "8px",
      fontSize: "12px",
      opacity: "0.9",
      fontFamily: "Arial, sans-serif"
    });

    durationEl.appendChild(el);

    function format(sec) {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = Math.floor(sec % 60);

      return [
        h > 0 ? String(h).padStart(2, "0") : null,
        String(m).padStart(2, "0"),
        String(s).padStart(2, "0"),
      ].filter(Boolean).join(":");
    }

    function update() {
      if (!show) {
        el.style.display = "none";
        return;
      }

      el.style.display = "inline";

      const duration = video.duration;
      const current = video.currentTime;

      if (!duration || isNaN(duration)) return;

      const left = duration - current;
      el.innerText = ` (-${format(left)})`;
    }

    video.addEventListener("timeupdate", update);

    console.log("✅ Remaining time + toggle ready (press R)");
  }

  // 🔥 Wait for player to load (important for PW)
  const wait = setInterval(() => {
    if (document.querySelector("video") && document.querySelector(".vjs-duration")) {
      clearInterval(wait);
      init();
    }
  }, 500);

  // 🔥 Toggle with R key
  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "r") {
      show = !show;

      if (el) {
        el.style.display = show ? "inline" : "none";
      }

      console.log("Remaining time:", show ? "ON" : "OFF");
    }
  });
})();
