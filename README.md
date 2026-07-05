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
  - **Per-URL Persistent Storage**: Auto-saves your stopwatch progress and question logs for each video URL so you can resume timing even after page refreshes or browser restarts.
  - Copy formatted time stats to clipboard or export question timing summaries with one click.

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
| `Ctrl + /` | Toggle Automatic Speed Ramp progression |
| `R` | Toggle remaining video time display |

### ⏱️ Question Time Watcher Controls

| Shortcut | Action |
| :--- | :--- |
| `T` | Start / Pause / Resume Question Stopwatch |
| `Shift + T` | Log current question time (Lap) & start timing next question |
| `Alt + T` | Open / Close Question Log Summary modal |
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
├── manifest.json            # Manifest V3 configuration with domain-scoped scripts
├── icons/                   # Extension icons (16px, 48px, 128px)
├── src/
│   ├── styles/
│   │   ├── hud.css          # Glassmorphism HUD, stopwatch overlay & modal styling
│   │   └── pw-custom.css    # Scoped site plugin styles
│   ├── core/
│   │   ├── hud.js           # Encapsulated HUD notification manager
│   │   ├── speed-controller.js # Speed, brightness, hold space & ramp logic
│   │   ├── remaining-time.js   # Universal video remaining time tracker
│   │   └── question-timer.js   # Question Time Watcher stopwatch module
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
