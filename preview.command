#!/bin/zsh
# Double-click to try the site locally. Close this window to stop it.
cd "$(dirname "$0")"
export NVM_DIR="$HOME/.nvm"; source "$NVM_DIR/nvm.sh"
[ -d node_modules/astro ] || npm install --no-fund --no-audit
(sleep 4; open http://localhost:4321/) &
npx astro dev --port 4321
