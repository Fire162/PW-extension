# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
All release timestamps are recorded in the `Asia/Kolkata` (India/Kolkata) timezone (IST).

## [2.2.2] - 2026-09-09 19:53 IST

### Removed
* Reverted experimental <kbd>Alt</kbd> hold for 1.0x to eliminate collisions with <kbd>Alt</kbd> + Scroll and other system/browser hotkeys.

### Improved
* Enhanced cache-busting in extension update checker with dynamic timestamp query parameters and `no-store` headers to bypass CDN edge cache.

## [2.2.1] - 2026-09-09 19:22 IST

### Added
* **Hold <kbd>Shift</kbd> for 1.5x Speed**: Holding <kbd>Shift</kbd> for >250ms accelerates video playback to `1.5x`; releasing restores previous speed.

### Fixed
* Cancelled <kbd>Shift</kbd> hold timer when modifier key combinations are pressed (<kbd>Shift</kbd> + T, <kbd>Shift</kbd> + S), preventing accidental speed rollbacks on key release.

## [2.2.0] - 2026-09-07 19:10 IST

### Added
* Automation Macros system (`macro-runner.js`):
  * Real-time click recorder with floating liquid-glass pill indicator (`#macro-record-indicator`), live step counter, and save/cancel actions.
  * 10-second quick-launch prompt (`#macro-quick-launcher`) on page load with 1-click execution and auto-dismiss countdown.
  * Strict parent URL matching (`originUrl`) using `normalizeUrl()` helper to prevent prompts on child or intermediate URLs.
  * Replay engine with cyan highlight glow, smooth center scrolling, and navigation fallbacks.
  * "⚡ Automation Macros" glass card in popup dashboard with record, run, and delete controls.
* Lecture Slides drawer for PhysicsWallah watch pages (`pw-enhancements.js`):
  * Slide timeline drawer fetching lecture slides with high-resolution thumbnails and seek timestamps.
  * Quick drawer toggle with <kbd>D</kbd> or <kbd>Shift</kbd> + <kbd>S</kbd> hotkey, or floating button.
  * Automatic active slide detection and smooth center-scrolling based on current video playback time.
  * Automatic browser tab `document.title` synchronization with current lecture topic name.

### Removed
* Deprecated Quick Notes launcher:
  * Removed `quick-notes.js` and MAIN world bridge `quick-notes-bridge.js`.
  * Removed notes toggle and obsolete styles across popup and overlays.

## [2.1.5] - 2026-09-07 18:02 IST

### Fixed
* Prevent keyboard shortcut collisions across content scripts and native browser/OS keys ([#8](https://github.com/Fire162/PW-extension/issues/8), [#9](https://github.com/Fire162/PW-extension/pull/9)):
  * Guard <kbd>S</kbd> key toggle in `speed-controller.js` so <kbd>Alt</kbd> + <kbd>S</kbd> reaches `silence-skipper.js` and browser <kbd>Ctrl</kbd> + <kbd>S</kbd> is not hijacked.
  * Restrict <kbd>Shift</kbd> + <kbd>T</kbd> to prevent intercepting the browser's restore closed tab shortcut (<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>T</kbd>).
  * Restrict <kbd>Alt</kbd> + <kbd>T</kbd> to prevent hijacking the Linux global terminal shortcut (<kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>T</kbd>).
  * Guard <kbd>Alt</kbd> + Arrows from colliding with Linux workspace switching hotkeys (<kbd>Ctrl</kbd> + <kbd>Alt</kbd> + Arrows).
  * Use `isTyping(e)` check and modifier guards in `keyup` to prevent accidental video play/pause while typing in rich-text or Shadow DOM editors.
  * Guard platform shortcuts (<kbd>\</kbd>, <kbd>'</kbd>, <kbd>/</kbd>) in `pw-enhancements.js` from activating with modifiers.

### Added
* <kbd>S</kbd> key toggle for instant 2.0x playback speed with automatic state restore ([`5eacfb3`](https://github.com/Fire162/PW-extension/commit/5eacfb3172fcd74ab85dbd4d842551b2399e535f)).

## [2.1.4] - 2026-08-29 14:16 IST

### Added
* In-extension update notification card in popup dashboard with 1-click update scripts for Windows and Linux ([`611a4d8`](https://github.com/Fire162/PW-extension/commit/611a4d818a74c2b6d91983170e10f80fe33c8fa1)).

### Changed
* Reduced playback speed step from `0.1x` to `0.05x` for finer adjustment granularity ([#7](https://github.com/Fire162/PW-extension/issues/7)).

## [2.1.3] - 2026-08-19 17:12 IST

### Fixed
* PhysicsWallah SPA navigation and lecture PDF redirect handler ([`e825453`](https://github.com/Fire162/PW-extension/commit/e825453315998a4da49e7b2559ec1107ea85dd36)).

## [2.1.2] - 2026-08-19 17:06 IST

### Added
* Declarative Net Request rules for redirecting PW batch notes to native PDF viewer ([`9252eda`](https://github.com/Fire162/PW-extension/commit/9252eda811340aa41d6be1033481e3532c578ae1)).

## [2.1.1] - 2026-07-10 19:04 IST

### Fixed
* Switched Silence Skipper temporary suspension key from <kbd>Alt</kbd> to <kbd>Shift</kbd> to avoid OS menu blur and window focus loss ([`dc0a706`](https://github.com/Fire162/PW-extension/commit/dc0a7069ddaa81054df5607e0b51bf5199ff95ea)).

## [2.1.0] - 2026-07-07 10:42 IST

### Added
* Quick Notes launcher glass button to open lecture PDF notes from `localStorage` ([`58128ac`](https://github.com/Fire162/PW-extension/commit/58128ac7f017e8c07dd5e45a271aa2cf68305f63)).
* Focus Mode (<kbd>Alt</kbd> + <kbd>F</kbd>) to silence HUD toast popups while keeping Stopwatch overlay visible ([`a9c2705`](https://github.com/Fire162/PW-extension/commit/a9c270557451528659d877a544ca18a7cce65b16)).
* Speed ramp progression for Silence Skipper and speed controller.

### Fixed
* Resolved CSP violation by running storage bridge in native `MAIN` world ([`9164160`](https://github.com/Fire162/PW-extension/commit/9164160a28f73117498c42cb6471d53018861968)).
* Made extension popup dashboard scrollable to prevent card clipping on smaller screens ([`35b7ee6`](https://github.com/Fire162/PW-extension/commit/35b7ee69fa9436e2f75b7a13c9e6ce546aa99e19)).
