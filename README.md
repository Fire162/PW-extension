# 🎥 Video Speed HUD & Question Time Watcher

> An open-source, lightweight Chrome/Edge Extension to master online video lectures with precision speed controls, HUD overlays, video time calculators, and an interactive **Question Time Watcher** stopwatch.

---

## ✨ Features

- ⚡ **Precision Speed Control**
  - Adjust speed smoothly using `Alt + Scroll` or `Alt + ← / →`.
  - Smart HUD notification displays the active playback speed in real time.

- 🚀 **Hold Space to Fast-Forward (2.0x)**
  - Hold `Spacebar` to temporarily speed up to 2.0x while watching. Releasing returns to your previous speed!
  - Quick tap toggles Play / Pause without lag.

- ⏱️ **Question Time Watcher (Stopwatch)**
  - Track exactly how much time you spend solving each practice question during lectures.
  - Works universally across all video sites (**YouTube**, **PhysicsWallah**, **Coursera**, **Udemy**, etc.).
  - **💧 Liquid Frosted Glass Water UI**: Translucent glass design so underlying video content remains visible.
  - **🖐️ Fully Draggable & Minimizable**: Drag the stopwatch widget anywhere on the screen; minimize or hide it whenever needed.
  - **🎯 Click-Through Mode**: Pass mouse clicks directly through the overlay to interact with video controls behind it!
  - **🧠 Smart Auto-Timer Mode**: Option to auto-start stopwatch when you pause the video and log question laps when you hit play!
  - **Per-URL Persistent Storage**: Auto-saves your stopwatch progress and question logs for each video URL so you can resume timing even after page refreshes or browser restarts.

- ⚙️ **Popup Dashboard & Master CSV Export**
  - Click the toolbar extension icon to open a sleek liquid-glass dashboard.
  - Toggle Smart Auto-Timer mode, inspect live session stats across all videos, copy stats, and export all study logs to `.csv`.

- 📚 **Auto Study Hour Calculator**
  - Automatically calculates real-world study clock hours vs. speed-adjusted lecture content coverage achieved (e.g. 1 hour at 2.0x = 2 hours of content covered).
  - Set custom daily study goals (4h, 6h, 8h, 10h), track daily study progress, and maintain active study streaks (🔥).

- ⏩ **Auto-Skip Silence & Dead Air (Gradual Ramping)**
  - Uses Web Audio API real-time audio analysis to detect silent moments in lectures (when the teacher is writing on the board or taking a break).
  - Starts at **2.0x** when silence begins, gradually ramps up by **+0.1x every second** up to **4.0x max**, and instantly restores your normal speed when speech resumes.
  - Toggle anytime via **`Alt + S`** or the Popup Dashboard.

- 🧘 **Focus Mode (Distraction-Free)**
  - Mutes and suppresses all floating HUD toast notification popups while studying.
  - Keeps the Question Stopwatch/Timer widget intact and fully functional as usual.
  - Toggle anytime via **`Alt + F`** or the Popup Dashboard.

- 📈 **Automatic Speed Ramping**
  - Toggle `Ctrl + /` to gradually increase playback speed over time in steps until reaching 2.5x max.

- ⏳ **Remaining & Playback-Adjusted Time Display**
  - Shows how much actual time remains in the video, plus speed-adjusted time (e.g. `-10:00 | 05:00 at 2.0x`).
  - Toggle visibility instantly with `R`.

- ☀️ **Video Brightness Control**
  - Easily adjust video screen brightness using `Alt + ↑ / ↓`.

- 🎯 **Domain-Scoped Plugins**
  - Isolated site plugins for PhysicsWallah (PW) batch view layout cleanup & custom shortcuts (`\`, `'`, `/`).

---

## 🎮 Keyboard Controls

### 🎥 Video Playback & HUD Controls

| Shortcut | Action |
| :--- | :--- |
| `Alt + Scroll` | Adjust video playback rate (0.25x - 4.0x) |
| `Alt + → / ←` | Increase / decrease video speed |
| `Alt + ↑ / ↓` | Increase / decrease video brightness |
| `Hold Space` | Fast forward at 2.0x speed while held |
| `Tap Space` | Toggle Play / Pause |
| `Alt + F` | Toggle Focus Mode (Mute toast popups, keep stopwatch) |
| `Alt + S` | Toggle Auto-Skip Silence in lectures (2.0x ➔ 4.0x ramping) |
| `Ctrl + /` | Toggle Automatic Speed Ramp progression |
| `R` | Toggle remaining video time display |

### ⏱️ Question Time Watcher Controls

| Shortcut | Action |
| :--- | :--- |
| `T` | Start / Pause / Resume Question Stopwatch |
| `Shift + T` | Log current question time (Lap) & start timing next question |
| `Alt + T` | Open / Close Question Log Summary modal |
| `Alt + B` | Cycle Exam Target Time Benchmark (1m / 2m / 3m / 5m) |
| `Alt + C` | Toggle Click-Through Mode (pass clicks to underlying video) |
| `Shift + H` | Toggle Hide / Show Stopwatch Overlay |
| `Alt + Shift + T` | Reset stopwatch & clear question history |

---

## 📦 Installation Guide

### Chrome & Chromium Browsers (Edge, Brave, Opera)

1. Clone or download this repository:
   ```bash
   git clone https://github.com/Fire162/PW-extension.git
   ```
2. Open your browser extensions page:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
   - Brave: `brave://extensions/`
3. Enable **Developer Mode** (toggle in top right corner).
4. Click **Load Unpacked**.
5. Select the `PW-extension` folder.

---

## 🏗️ Architecture & Folder Structure

```
PW-extension/
├── manifest.json            # Manifest V3 configuration with popup action & domain-scoped scripts
├── icons/                   # Extension icons (16px, 48px, 128px)
├── src/
│   ├── popup/
│   │   ├── popup.html       # Extension Popup Dashboard HTML
│   │   └── popup.js         # Dashboard logic & CSV exporter
│   ├── styles/
│   │   ├── hud.css          # Glassmorphism HUD, stopwatch overlay & modal styling
│   │   ├── popup.css        # Liquid glass popup dashboard stylesheet
│   │   └── pw-custom.css    # Scoped site plugin styles
│   ├── core/
│   │   ├── hud.js           # Encapsulated HUD notification manager
│   │   ├── speed-controller.js # Speed, brightness, hold space & ramp logic
│   │   ├── remaining-time.js   # Universal video remaining time tracker
│   │   ├── question-timer.js   # Question Time Watcher & Smart Auto-Timer module
│   │   ├── silence-skipper.js  # Real-time Web Audio silence detection & auto-skip
│   │   └── study-tracker.js    # Auto Study Hour Calculator & Streak Tracker
│   └── plugins/
│       └── pw-enhancements.js  # Scoped PhysicsWallah DOM tweaks & shortcuts
├── LICENSE                  # MIT License
├── CONTRIBUTING.md          # Open source contribution guidelines
└── README.md
```

---

## 💡 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening pull requests or issues.

---

## 📜 License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
