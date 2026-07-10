# 🎥 Video Speed HUD & Question Time Watcher (v2.1.0)

> An open-source, ultra-lightweight, and feature-rich Chrome/Edge extension designed to optimize online learning, video lectures, and exam preparation. Master lecture playback with precision speed ramping, automatic silence skipping, real-time HUD overlays, and an interactive **Question Time Watcher** stopwatch.

---

## ✨ Features & Capabilities

### ⚡ Playback & Environmental Controls
* **Precision Speed Control**: Adjust video speed smoothly between **0.25x and 4.0x** using `Alt + Scroll` or `Alt + ← / →` (with smooth key-repeat support).
* **Speed Ramping (Progression Mode)**: Toggle with `Ctrl + /` to gradually increase video speed by `+0.1x` in scaling intervals (`waitTime = currentStep * 20` seconds) up to `2.5x` max.
* **Instant Hold Fast-Forward**: Hold `Spacebar` (for `> 250ms`) to temporarily accelerate playback to **2.0x**. Releasing the spacebar restores your previous speed, and a quick tap toggles standard Play/Pause.
* **Remaining Time Badge**: Toggle with `R` to display real remaining video time and speed-adjusted remaining time (e.g., `-10:00 | 05:00 at 2.0x`). Supports standard HTML5 players and VideoJS layouts.
* **Screen Brightness Adjuster**: Fine-tune video brightness overlay from **0.3x to 2.5x** using `Alt + ↑ / ↓`.

### ⏱️ Question Time Watcher (Stopwatch Widget)
* **Glassmorphism Frosted Overlay**: A translucent, liquid-glass widget floating on top of the video container so behind-content remains readable.
* **Exam Pace Benchmark ("Beat the Clock")**: Cycle target benchmarks (**1m / 2m / 3m / 5m**) with `Alt + B`. Visual glows reflect pacing:
  * 🟢 **Green Glass Glow**: Time spent is $\le$ 70% of benchmark.
  * 🟡 **Yellow Glass Glow**: Time spent is between 70% and 100%.
  * 🔴 **Red Glass Glow (Overtime)**: Time spent exceeds the benchmark limit.
* **Smart Auto-Timer**: When activated, the stopwatch automatically starts when you pause the video and logs laps (and pauses) when you resume video playback.
* **Click-Through Mode**: Toggle with `Alt + C` or click the 🎯 button on the widget to allow mouse events to pass directly through the widget onto video player controls behind it.
* **Per-URL Persistence**: All stopwatch states, logs, widget positions, and minimized states are stored in `chrome.storage.local` mapped to the specific URL.

### ⏩ Web Audio Silence Skipper
* **Real-time Dead-Air Suppression**: Uses the Web Audio API (`AnalyserNode`) to monitor real-time RMS volume.
* **Temporal Ramping**: If volume falls below the `0.02` threshold for more than `600ms`, playback accelerates to **2.0x** and ramps by **+0.1x per second** up to **4.0x max**.
* **Instant Restore**: Restores your exact previous speed the instant voice or speech is detected.
* **Silence Skip Suspension**: Hold `Shift` to temporarily suspend silence skipping while writing notes or studying.

### 📚 Productivity, Analytics & Integrations
* **Notes Instant Launcher**: Displays a sleek glass button at the top-left corner that opens the lecture PDF stored in `localStorage.PDF` in a new tab. Utilizes a main-world bridge to safely bypass Content Security Policies (CSP).
* **Focus Mode (Distraction-Free)**: Toggle with `Alt + F` to suppress all floating HUD notifications while keeping stopwatch widgets fully functional.
* **Study Hour Tracker & Streaks**: Automatically logs active video consumption. Tracks real clock hours spent vs. speed-adjusted content coverage, daily goals (4h, 6h, 8h, 10h), and streaks (🔥).
* **Sleek Popup Dashboard**: Tap `Alt + Shift + D` to open the control panel where you can manage toggles, view daily statistics, copy question logs, and export all sessions as `.csv`.

---

## 🎮 Complete Keyboard Shortcut Cheat Sheet

### 🎥 Playback & HUD Controls
| Shortcut | Action | Scope / Details |
| :--- | :--- | :--- |
| `Alt + Scroll` | Smooth Playback Speed Adjust | Increments by `0.1x` (Range: `0.25x - 4.0x`) |
| `Alt + →` | Increase Playback Speed | Increments by `0.1x` (with smooth keyhold repeat) |
| `Alt + ←` | Decrease Playback Speed | Decrements by `0.1x` (with smooth keyhold repeat) |
| `Alt + ↑` | Increase Screen Brightness | Increments by `0.1x` (Range: `0.3x - 2.5x`) |
| `Alt + ↓` | Decrease Screen Brightness | Decrements by `0.1x` (Range: `0.3x - 2.5x`) |
| `Hold Spacebar` | Fast-Forward at 2.0x | Accelerates after `250ms`; restores speed on release |
| `Tap Spacebar` | Toggle Play / Pause | Standard player control |
| `Ctrl + /` | Toggle Speed Ramp | Ramps playback speed by `+0.1x` in scaling time blocks |
| `R` | Toggle Remaining Time Badge | Toggles display of `(-Remaining | Adjusted)` badge |
| `Alt + S` | Toggle Auto-Skip Silence | Enables/disables Web Audio monitoring |
| `Hold Shift` | Suspend Silence Skip | Pauses silence skipper while key is pressed down |
| `Alt + F` | Toggle Focus Mode | Mutes HUD toast notifications (Stopwatch stays active) |
| `Alt + Shift + D` | Open Popup Dashboard | Global Chrome command shortcut |

### ⏱️ Question Stopwatch Widget Controls
| Shortcut | Action | Scope / Details |
| :--- | :--- | :--- |
| `T` | Play / Pause Stopwatch | Toggles active stopwatch timing |
| `Shift + T` | Log Lap & Next Question | Saves current lap duration and resets stopwatch to `00:00` |
| `Alt + T` | Toggle Log Summary Modal | Displays session log overlay with stats and clipboard copy |
| `Alt + B` | Cycle Target Benchmark | Cycles between: `OFF` ➔ `1m` ➔ `2m` ➔ `3m` ➔ `5m` |
| `Alt + C` | Toggle Click-Through Mode | Passes click events through the widget to the webpage |
| `Shift + H` | Toggle Widget Visibility | Shows / Hides the stopwatch widget on screen |
| `Alt + Shift + T` | Hard Reset Widget | Resets current question index and purges logs for the URL |

### 🎯 PhysicsWallah Platform Enhancements (Scoped: `*.pw.live`)
| Shortcut | Action | Scope / Details |
| :--- | :--- | :--- |
| `\` | Trigger Poll Element | Clicks the active poll SVG path button on page |
| `'` | Trigger Chat Element | Clicks the live chat SVG path button on page |
| `/` | Trigger Poll Icon | Clicks the poll button element (`#poll-icon`) |

---

## 📂 Architecture & Directory Structure

```
video-speed-extension/
├── manifest.json            # Extension configuration (Manifest V3, permissions, content script scopes)
├── LICENSE                  # MIT License
├── CONTRIBUTING.md          # Open-source developer guidelines
├── README.md                # General documentation
├── icons/                   # Extension icons (16px, 48px, 128px assets)
└── src/
    ├── popup/
    │   ├── popup.html       # Translucent dashboard layout
    │   └── popup.js         # Settings synchronization, history aggregation, and CSV exporter
    ├── styles/
    │   ├── hud.css          # Glassmorphic styling for HUD, stopwatch, and modal overlays
    │   ├── popup.css        # Dashboard styling sheet
    │   └── pw-custom.css    # Clean styles for scoped PhysicsWallah layout adjustments
    ├── core/
    │   ├── hud.js           # Toast notification system and Focus Mode toggle listener
    │   ├── speed-controller.js # Precision speed, brightness, hold space, and ramp logic
    │   ├── remaining-time.js   # Calculations for actual and speed-adjusted remaining time
    │   ├── question-timer.js   # Stopwatch widget drag/drop, clicks, and storage persistence
    │   ├── silence-skipper.js  # Audio node analyzer and temporal silence skipper
    │   ├── study-tracker.js    # Activity-based study log aggregator and streak tracker
    │   ├── quick-notes.js      # Float notes button widget
    │   └── quick-notes-bridge.js # MAIN world bridge reading page localStorage to bypass CSP
    └── plugins/
        └── pw-enhancements.js  # Custom layout overrides and hotkeys for PhysicsWallah
```

---

## 📦 Developer Installation Guide

1. Clone or download this repository locally:
   ```bash
   git clone https://github.com/Fire162/PW-extension.git
   ```
2. Navigate to your browser's extension configuration settings:
   * Chrome: `chrome://extensions/`
   * Microsoft Edge: `edge://extensions/`
   * Brave: `brave://extensions/`
3. Toggle the **Developer Mode** switch in the top-right corner.
4. Click **Load Unpacked** in the top-left corner.
5. Choose the root `video-speed-extension` directory.
6. Pin the extension to your toolbar to quickly access the Popup Dashboard.

---

## 💾 Local Storage Schema

The extension utilizes `chrome.storage.local` to store settings and stats globally or on a per-URL basis:

1. **`qt_log_[encodedUrl]`** (Object): Mapped stopwatch logs, active question index, widget positions, and lap history.
2. **`studyTrackerData`** (Object): Aggregates daily goals, study history, streak progress, and platform breakdowns.
3. **Preferences**:
   * `autoTimerOnPause` (Boolean): Timer automatic triggers.
   * `autoSkipSilence` (Boolean): Silence skipper toggle.
   * `focusMode` (Boolean): Suppresses HUD overlays.
   * `quickNotesEnabled` (Boolean): Notes button overlay visibility.
   * `targetBenchmarkSec` (Number): Benchmark pacing limits.
   * `totalSilenceTimeSavedSec` (Number): Total accumulated silence time saved.

---

## 📜 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for more details.
