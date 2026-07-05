# Contributing to Video Speed HUD & Question Time Watcher

Thank you for your interest in contributing! We welcome all bug reports, feature suggestions, and pull requests to make video learning faster and more productive for everyone.

---

## 🛠️ Project Structure

- `manifest.json`: Manifest V3 browser extension configuration.
- `src/core/`: Universal modules running across all web video players (`<all_urls>`).
  - `hud.js`: Heads-Up Display (HUD) overlay notification manager.
  - `speed-controller.js`: Speed controls, spacebar hold to fast-forward, speed ramping, brightness adjustment.
  - `remaining-time.js`: Real-time remaining and speed-adjusted video time calculator.
  - `question-timer.js`: Interactive stopwatch for tracking time spent per question.
- `src/plugins/`: Platform-specific content scripts scoped strictly to matched domains (e.g. `pw-enhancements.js`).
- `src/styles/`: CSS stylesheets for HUD, modal dialogs, and custom layouts.
- `icons/`: Extension icon assets.

---

## 🚀 How to Contribute

1. **Fork the Repository**
2. **Create a Feature Branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to your Branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

---

## 📋 Coding Guidelines

- Keep core scripts domain-agnostic so they work on any generic HTML5 `<video>` player.
- Place site-specific DOM tweaks inside `src/plugins/` and add appropriate scope match rules to `manifest.json`.
- Maintain clean variable scoping (use IIFEs or modules) to prevent global window pollution.
- Avoid inline CSS strings; add CSS styles to `src/styles/hud.css`.
- Ensure keyboard shortcuts ignore typing inside `INPUT`, `TEXTAREA`, or `contenteditable` elements.

Thank you for contributing! ❤️
