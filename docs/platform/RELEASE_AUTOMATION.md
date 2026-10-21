# Release Automation

This document explains how releases and tags are automated in the CNC Portal project.

## 🚀 Automated Workflow

### Release via GitHub PR (`release-pr.yml`) 🌟

Main workflow for your process: `release/*` branch → PR to `main` → merge → automation.

**Triggers:**

- Closed and merged PR from a repository-owned `release/*` branch to `main`

**Actions:**

- ✅ Automatic version extraction from branch name
- ✅ Creation of annotated Git tag
- ✅ Complete changelog generation with metrics
- ✅ GitHub release creation with artifacts
- ✅ Build of all 4 components (app, backend, contracts, dashboard)
- ✅ Upload of compressed artifacts

## 📋 Usage

### GitHub PR (Recommended for your workflow) 🌟

```bash
# 1. Create a release branch from develop
git checkout develop
git pull origin develop
git checkout -b release/v0.7.2

# 2. Make your changes (bump version, changelog, etc.)
# Update package.json versions manually if needed

# 3. Push the branch
git push origin release/v0.7.2

# 4. Create a PR release/v0.7.2 → main on GitHub
# 5. Merge the PR → Automation triggers! ✨
```

### 🎯 Recommended Workflow (GitHub PR)

Your current process is perfectly supported:

1. **Release branch:** `git checkout -b release/v0.7.2`
2. **Changes:** Bump version, changelog, etc.
3. **Push:** `git push origin release/v0.7.2`
4. **PR on GitHub:** `release/v0.7.2` → `main`
5. **Merge:** GitHub merges the PR
6. **Automation:** The `release-pr.yml` workflow triggers automatically! 🚀

## 🔧 Configuration

### Required Variables

Workflows use the automatic GitHub token (`GITHUB_TOKEN`), no additional configuration needed.

### Permissions

Workflows need the following permissions (configured automatically):

- `contents: write` (to create tags and releases)
- `pull-requests: read` (to detect release PRs)

## 📝 Version Format

- **Accepted format:** `v0.7.2`, `0.7.2`, `v1.0.0-alpha.1`
- **Prerelease versions:** Versions containing `alpha`, `beta`, or `rc` are marked as "prerelease"

## 📊 Release Structure

Each created release contains:

### Information

- **Tag:** Version (e.g., v0.7.2)
- **Title:** Release v0.7.2
- **Description:** Automatic changelog since last version
- **Date:** Creation timestamp

### Artifacts

- `cnc-portal-app-v0.7.2.tar.gz` - Vue.js application build
- `cnc-portal-backend-v0.7.2.tar.gz` - Express.js backend build
- `cnc-portal-contracts-v0.7.2.tar.gz` - Smart contract artifacts
- `cnc-portal-dashboard-v0.7.2.tar.gz` - Nuxt.js dashboard build

### Automatic Changelog

````markdown
# 🚀 Release v0.7.2

## 📊 Summary

- **15 commits** since last release
- **Branch:** `release/v0.7.2` → `main`

## 📝 Changes

- feat(components): add new token selector
- fix(api): handle network timeouts
- docs: update installation guide

## 🔧 Installation

### Frontend (Vue.js)

```bash
cd app
npm install
npm run build
```
````

### Backend (Express.js)

```bash
cd backend
npm install
npm run build
```

### Smart Contracts (Hardhat)

```bash
cd contract
npm install
npm run compile
```

### Dashboard (Nuxt.js)

```bash
cd dashboard
npm install
npm run build
```

```

## 🔍 Monitoring and Debug

### Check Status
- **GitHub Actions:** https://github.com/globe-and-citizen/cnc-portal/actions
- **Releases:** https://github.com/globe-and-citizen/cnc-portal/releases

### Useful Logs
Workflows log:
- Detected version
- Validated release branch version
- Created tags
- Build errors

### Common Issues

#### Tag already exists
```

⚠️ Tag v0.7.2 already exists, skipping

```
**Solution:** Use a new version or delete the existing tag

#### Invalid release version
```

❌ Invalid release version or PR number

```
**Solution:** Use a `release/<version>` branch with a supported version format before merging the PR.

#### Tests fail
```

❌ Tests failed

````
**Solution:** Fix tests before finalizing the release

## 🚀 Recommended Workflow

1. **Development on feature branches**
   ```bash
   git flow feature start new-feature
   # development...
   git flow feature finish new-feature
````

2. **Prepare a release**

   ```bash
   # Manual process - create release branch
   git checkout develop
   git pull origin develop
   git checkout -b release/v0.7.2

   # Update versions in package.json files
   # Update CHANGELOG.md
   # Commit changes

   git push origin release/v0.7.2
   # Create PR on GitHub → main
   ```

3. **Verify the release**
   - Go to GitHub Releases
   - Check artifacts
   - Test installation

4. **Hotfix if necessary**
   ```bash
   git flow hotfix start v0.7.3
   # fixes...
   git flow hotfix finish v0.7.3
   ```

## 📈 Benefits of This Approach

- ✅ **Complete automation**: No more manual tag and release creation
- ✅ **Consistency**: Standardized format for all releases
- ✅ **Traceability**: Automatic and detailed changelog
- ✅ **Artifacts**: Automatic builds attached to each release
- ✅ **Git-flow compatible**: Integrates perfectly with git-flow
- ✅ **Automatic testing**: Validation before each release

It's now fully automated! 🎉
