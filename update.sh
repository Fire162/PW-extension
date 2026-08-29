#!/usr/bin/env bash
# Video Speed HUD & Question Time Watcher Updater Script
set -e

echo "========================================================"
echo "  Video Speed HUD & Question Time Watcher Updater"
echo "========================================================"
echo ""

if ! command -v git &> /dev/null; then
    echo "❌ Error: 'git' command not found. Please install git or download updates from:"
    echo "   https://github.com/Fire162/PW-extension/releases"
    exit 1
fi

echo "🔄 Pulling latest updates from GitHub..."
echo ""

git pull

echo ""
echo "========================================================"
echo "✅ Extension files updated to latest version!"
echo "========================================================"
echo ""
echo "Next Steps to apply updates in Chrome/Edge:"
echo "  1. Open browser to chrome://extensions (or edge://extensions)"
echo "  2. Click the 🔄 Reload button on the extension card."
echo ""
