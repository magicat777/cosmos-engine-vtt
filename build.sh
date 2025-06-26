#!/bin/bash

# Build script for Cosmos Engine VTT
# Copies src to docs for GitHub Pages deployment

echo "Building Cosmos Engine VTT for GitHub Pages..."

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Create docs directory if it doesn't exist
mkdir -p "$SCRIPT_DIR/docs"

# Clean docs directory (but preserve .gitkeep if exists)
find "$SCRIPT_DIR/docs" -mindepth 1 -not -name '.gitkeep' -delete

# Copy all files from src to docs
cp -r "$SCRIPT_DIR/src"/* "$SCRIPT_DIR/docs/"

# Copy index.html from root if it exists
if [ -f "$SCRIPT_DIR/index.html" ]; then
    cp "$SCRIPT_DIR/index.html" "$SCRIPT_DIR/docs/"
fi

# Create a simple index.html if it doesn't exist
if [ ! -f "$SCRIPT_DIR/docs/index.html" ]; then
    cat > "$SCRIPT_DIR/docs/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cosmos Engine VTT</title>
    <link rel="stylesheet" href="styles/main.css">
</head>
<body>
    <div class="app-loading">
        <div class="loading-spinner"></div>
        <h2>Loading Cosmos Engine VTT...</h2>
    </div>

    <div id="app" class="app-container" style="display: none;">
        <header class="app-header">
            <h1>Cosmos Engine VTT</h1>
            <nav id="main-nav" class="app-nav">
                <!-- Navigation will be populated by router -->
            </nav>
        </header>
        
        <main id="main-content" class="app-main">
            <!-- Content panels will be rendered here -->
        </main>
        
        <footer class="app-footer">
            <p>Cosmos Engine RPG © 2025 | <a href="https://github.com/magicat777/cosmos-engine-vtt" target="_blank">GitHub</a></p>
        </footer>
    </div>

    <noscript>
        <div class="noscript-warning">
            <h2>JavaScript Required</h2>
            <p>Cosmos Engine VTT requires JavaScript to be enabled in your browser.</p>
        </div>
    </noscript>

    <script type="module">
        // Show app after load
        window.addEventListener('load', () => {
            document.querySelector('.app-loading').style.display = 'none';
            document.getElementById('app').style.display = 'flex';
        });
    </script>
    <script type="module" src="app.js"></script>
</body>
</html>
EOF
fi

echo "Build complete! Files copied to docs/ directory."
echo "Don't forget to commit and push the docs/ directory to GitHub."