# E2E Testing Quick Reference

## 🚀 Quick Start Commands

### First Time Setup

```bash
cd app
npm install
npx playwright install chromium --with-deps
npm run test:build:cache
```

### Running Tests

```bash
# Run all tests (requires app stack running)
npm run test:e2e

# Run with visible browser
npm run test:e2e:headed

# Run with interactive UI
npm run test:e2e:ui

# Debug mode (step through tests)
npm run test:e2e:debug

# View last test report
npm run test:e2e:report

# Run specific test file
npx playwright test test/e2e/dashboard.spec.ts

# Run tests matching pattern
npx playwright test --grep "should be able to access"
```

### Cache Management

```bash
# Build cache (first time)
npm run test:build:cache

# Rebuild cache (if corrupted)
npm run test:build:cache:force

# Check cache
ls -la .cache-synpress/

# Clear cache
rm -rf .cache-synpress/
```

## 🏗️ Full Stack Setup (Required for Tests)

### Terminal 1 - Backend

```bash
cd backend
npm install
npm run dev
# Backend runs on http://localhost:3000
```

### Terminal 2 - Local Blockchain

```bash
cd app
anvil --load-state ./local-node-state.json
# Anvil runs on http://localhost:8545
```

### Terminal 3 - Frontend

```bash
cd app
VITE_APP_NETWORK_ALIAS=hardhat npm run dev
# Frontend runs on http://localhost:5173
```

### Terminal 4 - Tests

```bash
cd app
npm run test:e2e
```

## 🐛 Common Issues & Quick Fixes

### "Cache does not exist"

```bash
npm run test:build:cache:force
```

### "Browser not found"

```bash
npx playwright install chromium --with-deps
```

### Tests timeout

```bash
# Ensure all services are running
lsof -i :3000  # Backend
lsof -i :5173  # Frontend
lsof -i :8545  # Anvil
```

### Port already in use

```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Or use different ports
PORT=5174 npm run dev
```

### Clear test artifacts

```bash
rm -rf test-results/
rm -rf playwright-report/
```

## 📊 Test File Quick Reference

| Test File | Description | Status |
|-----------|-------------|--------|
| `dashboard.spec.ts` | Dashboard page tests | Simple ✓ |
| `login.spec.ts` | SIWE authentication | Needs MetaMask flow |
| `navbar.spec.ts` | Navigation and profile | Multiple tests |
| `teams.spec.ts` | Team management | Complex, many commented |

## 🔧 Configuration Files

| File | Purpose |
|------|---------|
| `playwright.config.ts` | Playwright configuration |
| `.env.e2e` | Test environment variables |
| `test/wallet-setup/connected.setup.ts` | MetaMask wallet setup |
| `.cache-synpress/` | Synpress cache directory |
| `.github/workflows/app-e2e.yml` | CI/CD workflow |

## 📝 Environment Variables

```bash
# .env.e2e
BASE_URL=http://localhost:5173
SKIP_SERVER=false
HEADLESS=true
VITE_APP_BACKEND_URL=http://localhost:3000
VITE_APP_NETWORK_ALIAS=hardhat
VITE_APP_CHAIN_ID=31337
```

## 🎭 Playwright CLI

```bash
# List all tests
npx playwright test --list

# Run with trace
npx playwright test --trace on

# Generate test code
npx playwright codegen http://localhost:5173

# Show trace
npx playwright show-trace test-results/.../trace.zip

# Open last HTML report
npx playwright show-report
```

## 🔍 Debugging

```bash
# Run single test in debug mode
HEADLESS=false npx playwright test test/e2e/dashboard.spec.ts --debug

# Headed mode (see browser)
HEADLESS=false npm run test:e2e

# With Playwright Inspector
PWDEBUG=1 npm run test:e2e

# Verbose output
DEBUG=pw:api npm run test:e2e
```

## 📦 Package Versions

```json
{
  "@playwright/test": "1.48.2",
  "@synthetixio/synpress": "^4.0.3"
}
```

## 🔗 Useful Links

- [Test Documentation](./app/test/README.md)
- [Setup Summary](./E2E_SETUP_SUMMARY.md)
- [Synpress Docs](https://synpress.io/)
- [Playwright Docs](https://playwright.dev/)

## ⚠️ Remember

1. **Cache must be built first**: `npm run test:build:cache`
2. **Full stack required**: Backend + Blockchain + Frontend must be running
3. **Headless by default**: Set `HEADLESS=false` to see browser
4. **Test wallet**: Using Hardhat account #0 (publicly known test account)
5. **No real funds**: Only use test ETH on local blockchain

## 🎯 Quick Health Check

```bash
# Check if everything is ready
cd app

# 1. Dependencies installed?
[ -d "node_modules" ] && echo "✓ Dependencies OK" || echo "✗ Run: npm install"

# 2. Browsers installed?
[ -d "$HOME/.cache/ms-playwright/chromium-1140" ] && echo "✓ Browser OK" || echo "✗ Run: npx playwright install chromium"

# 3. Cache built?
[ -d ".cache-synpress/532f685e346606c2a803" ] && echo "✓ Cache OK" || echo "✗ Run: npm run test:build:cache"

# 4. Services running?
curl -s http://localhost:5173 > /dev/null && echo "✓ Frontend OK" || echo "✗ Start: npm run dev"
curl -s http://localhost:3000/api/health > /dev/null 2>&1 && echo "✓ Backend OK" || echo "⚠ Backend not required for all tests"
curl -s http://localhost:8545 -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null 2>&1 && echo "✓ Anvil OK" || echo "✗ Start: anvil --load-state ./local-node-state.json"
```

## 📞 Getting Help

1. Check [test/README.md](./app/test/README.md) for detailed guide
2. Check [E2E_SETUP_SUMMARY.md](./E2E_SETUP_SUMMARY.md) for known issues
3. Run tests with `--debug` flag for step-by-step execution
4. Check Playwright trace: `npx playwright show-trace <trace-file>`
5. Review test output in `playwright-report/index.html`
