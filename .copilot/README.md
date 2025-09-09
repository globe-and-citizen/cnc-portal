# GitHub Copilot Agent Environment Setup

This directory contains configuration files to customize the GitHub Copilot coding agent environment for the CNC Portal project.

## Files

### `.copilot/environment.yml`
Primary GitHub Copilot agent environment configuration that:
- Sets up Node.js 20.10.0 development environment (matching CI/CD)
- Pre-installs dependencies for all project components (app, backend, contract)
- Configures global development tools (nodemon, typescript, prettier, eslint)
- Sets up environment variables for development
- Provides helpful setup completion messages

### `.devcontainer/devcontainer.json`
Alternative/complementary dev container configuration for:
- VS Code Dev Containers compatibility
- GitHub Codespaces support
- Enhanced VS Code experience with relevant extensions
- Port forwarding for development servers
- Editor settings optimized for the project

## What Gets Pre-installed

### Global Tools
- `nodemon` - Auto-restart Node.js applications during development
- `typescript` - TypeScript compiler
- `ts-node` - TypeScript execution for Node.js
- `prettier` - Code formatter
- `eslint` - Code linter

### Project Dependencies
- **Frontend (app/)**: Vue.js, Vite, TypeScript, and all frontend dependencies
- **Backend (backend/)**: Express.js, Prisma, and all backend dependencies  
- **Contracts (contract/)**: Hardhat, Solidity tools, and smart contract dependencies

### System Tools
- Git, curl, vim, jq for general development tasks
- Python3 for any auxiliary scripting needs

## Environment Variables

The following development environment variables are pre-configured:
- `NODE_ENV=development`
- `FRONTEND_URL=http://localhost:5173`
- `HARDHAT_NETWORK=hardhat`

## Port Forwarding

The configuration automatically forwards these development ports:
- `5173` - Vite frontend development server
- `3000` - Express.js backend API server
- `8545` - Hardhat local blockchain node

## Quick Start Commands

Once the environment is set up, you can use these commands:

```bash
# Start frontend development server
cd app && npm run dev

# Start backend server
cd backend && npm run start

# Start local blockchain node
cd contract && npm run node
```

## Development Workflow Commands

In each component directory (app/, backend/, contract/):

```bash
npm run build     # Build the component
npm run test      # Run tests
npm run lint      # Lint code
npm run format    # Format code with Prettier
npm run type-check # TypeScript type checking (app only)
```

## Benefits for Copilot Agent

This setup provides the Copilot coding agent with:

1. **Ready-to-use environment** - No setup time needed when starting work
2. **Full project context** - All dependencies pre-installed and ready
3. **Consistent tooling** - Same tools used in CI/CD and local development
4. **Optimized performance** - Dependencies cached and pre-compiled where possible
5. **Development efficiency** - All common tools and commands immediately available

## Troubleshooting

If setup encounters issues:

- **Prisma generation fails**: Normal if no database connection available
- **Contract compilation fails**: May require network access for some dependencies
- **Dependency installation issues**: Check network connectivity and npm registry access

The environment is designed to gracefully handle these scenarios and continue with partial setup.

## Compatibility

This configuration is compatible with:
- GitHub Copilot coding agent
- GitHub Codespaces
- VS Code Dev Containers
- Docker-based development environments

## Updating

When updating dependencies or tools:
1. Update the relevant package.json files in app/, backend/, or contract/
2. Update the `.copilot/environment.yml` if global tools change
3. Update the `.devcontainer/devcontainer.json` if VS Code extensions change
4. Test the setup to ensure it works correctly

For more information about GitHub Copilot environment customization, see:
https://docs.github.com/en/enterprise-cloud@latest/copilot/how-tos/use-copilot-agents/coding-agent/customize-the-agent-environment