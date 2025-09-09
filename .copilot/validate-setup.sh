#!/bin/bash
# Test script to validate the Copilot environment setup commands
# This simulates what would happen during environment setup

set -e

echo "🧪 Testing Copilot Environment Setup Commands..."
echo ""

# Test that required base tools are available
echo "🔍 Checking base requirements..."
command -v node >/dev/null 2>&1 && echo "✅ Node.js available" || echo "❌ Node.js not found"
command -v npm >/dev/null 2>&1 && echo "✅ npm available" || echo "❌ npm not found"
command -v git >/dev/null 2>&1 && echo "✅ git available" || echo "❌ git not found"

echo ""
echo "📋 Node.js version info:"
node --version
npm --version

echo ""
echo "📁 Checking project structure..."
for dir in app backend contract; do
    if [ -d "$dir" ]; then
        echo "✅ $dir/ directory exists"
        if [ -f "$dir/package.json" ]; then
            echo "  ✅ $dir/package.json exists"
        else
            echo "  ❌ $dir/package.json missing"
        fi
    else
        echo "❌ $dir/ directory missing"
    fi
done

echo ""
echo "🛠️ Checking required scripts in package.json files..."

# Check app scripts
if [ -f "app/package.json" ]; then
    echo "📱 Frontend (app) scripts:"
    jq -r '.scripts | keys[]' app/package.json | grep -E '(dev|build|test|lint|format)' | sed 's/^/  ✅ /'
fi

# Check backend scripts  
if [ -f "backend/package.json" ]; then
    echo "🔧 Backend scripts:"
    jq -r '.scripts | keys[]' backend/package.json | grep -E '(start|build|test|lint|format)' | sed 's/^/  ✅ /'
fi

# Check contract scripts
if [ -f "contract/package.json" ]; then
    echo "⛓️ Contract scripts:"
    jq -r '.scripts | keys[]' contract/package.json | grep -E '(node|compile|test|lint|format)' | sed 's/^/  ✅ /'
fi

echo ""
echo "📄 Checking Copilot configuration files..."
if [ -f ".copilot/environment.yml" ]; then
    echo "✅ .copilot/environment.yml exists"
    echo "  📊 File size: $(wc -c < .copilot/environment.yml) bytes"
else
    echo "❌ .copilot/environment.yml missing"
fi

if [ -f ".devcontainer/devcontainer.json" ]; then
    echo "✅ .devcontainer/devcontainer.json exists"
    echo "  📊 File size: $(wc -c < .devcontainer/devcontainer.json) bytes"
else
    echo "❌ .devcontainer/devcontainer.json missing"
fi

if [ -f ".copilot/README.md" ]; then
    echo "✅ .copilot/README.md exists"
    echo "  📊 File size: $(wc -c < .copilot/README.md) bytes"
else
    echo "❌ .copilot/README.md missing"
fi

echo ""
echo "🎯 Configuration validation complete!"
echo ""
echo "💡 To test dependency installation (requires network access):"
echo "   cd app && npm install --dry-run"
echo "   cd backend && npm install --dry-run"  
echo "   cd contract && npm install --dry-run"