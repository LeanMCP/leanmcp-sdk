#!/bin/bash

# LeanMCP SDK - Synchronized Version Publish Script
# This script ensures ALL packages have the SAME version and creates git tags
#
# Usage:
#   ./scripts/publish-sync.sh patch    # 0.4.0 -> 0.4.1
#   ./scripts/publish-sync.sh minor    # 0.4.0 -> 0.5.0
#   ./scripts/publish-sync.sh major    # 0.4.0 -> 1.0.0
#   ./scripts/publish-sync.sh 0.5.0    # Set specific version

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PACKAGES_DIR="$ROOT_DIR/packages"

# Packages in dependency order
PACKAGES=(
  "utils"
  "env-injection"
  "elicitation"
  "auth"
  "core"
  "ui"
  "cli"
  "leanmcp"
)

# Get version argument
VERSION_ARG="${1:-patch}"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       LeanMCP SDK - Synchronized Version Publisher          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check npm auth
echo -e "${CYAN}[1/6] Checking npm authentication...${NC}"
if ! npm whoami &> /dev/null; then
  echo -e "${RED}Error: Not logged into npm. Run 'npm login' first.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Logged in as: $(npm whoami)${NC}"

# Check git status
echo -e "${CYAN}[2/6] Checking git status...${NC}"
cd "$ROOT_DIR"
if [[ -n $(git status --porcelain) ]]; then
  echo -e "${YELLOW}Warning: You have uncommitted changes.${NC}"
  git status --short
  echo ""
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Aborted. Commit your changes first.${NC}"
    exit 0
  fi
fi
echo -e "${GREEN}✓ Git status checked${NC}"

# Get current version from first package (they should all be synced)
CURRENT_VERSION=$(node -p "require('$PACKAGES_DIR/core/package.json').version")
echo -e "${CYAN}[3/6] Current version: ${YELLOW}v${CURRENT_VERSION}${NC}"

# Calculate new version
if [[ "$VERSION_ARG" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  # Explicit version provided
  NEW_VERSION="$VERSION_ARG"
else
  # Calculate based on bump type
  IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
  MAJOR=${VERSION_PARTS[0]}
  MINOR=${VERSION_PARTS[1]}
  PATCH=${VERSION_PARTS[2]}
  
  case "$VERSION_ARG" in
    major)
      NEW_VERSION="$((MAJOR + 1)).0.0"
      ;;
    minor)
      NEW_VERSION="${MAJOR}.$((MINOR + 1)).0"
      ;;
    patch)
      NEW_VERSION="${MAJOR}.${MINOR}.$((PATCH + 1))"
      ;;
    *)
      echo -e "${RED}Invalid version argument: $VERSION_ARG${NC}"
      echo "Usage: $0 [patch|minor|major|x.y.z]"
      exit 1
      ;;
  esac
fi

echo -e "${GREEN}New version: ${YELLOW}v${NEW_VERSION}${NC}"
echo ""

# Confirm
echo -e "${YELLOW}This will:${NC}"
echo "  1. Update ALL packages to version ${NEW_VERSION}"
echo "  2. Update internal dependencies to use ^${NEW_VERSION}"
echo "  3. Build all packages"
echo "  4. Publish all packages to npm"
echo "  5. Create git commit and tag v${NEW_VERSION}"
echo "  6. Push to remote"
echo ""

read -p "Proceed? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}Aborted.${NC}"
  exit 0
fi

echo ""

# Function to update package version and internal deps
update_package_version() {
  local pkg=$1
  local pkg_dir="$PACKAGES_DIR/$pkg"
  local pkg_json="$pkg_dir/package.json"
  
  echo -e "  ${BLUE}→ Updating @leanmcp/${pkg}${NC}"
  
  # Update version
  node -e "
    const fs = require('fs');
    const pkg = require('$pkg_json');
    pkg.version = '$NEW_VERSION';
    
    // Update @leanmcp/* dependencies
    ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'].forEach(depType => {
      if (pkg[depType]) {
        Object.keys(pkg[depType]).forEach(dep => {
          if (dep.startsWith('@leanmcp/')) {
            pkg[depType][dep] = '^$NEW_VERSION';
          }
        });
      }
    });
    
    fs.writeFileSync('$pkg_json', JSON.stringify(pkg, null, 2) + '\n');
  "
}

# Function to build package
build_package() {
  local pkg=$1
  local pkg_dir="$PACKAGES_DIR/$pkg"
  
  cd "$pkg_dir"
  
  if node -p "require('./package.json').scripts?.build" 2>/dev/null | grep -q -v "undefined"; then
    echo -e "  ${BLUE}→ Building @leanmcp/${pkg}${NC}"
    npm run build --silent || {
      echo -e "${RED}Build failed for @leanmcp/${pkg}${NC}"
      return 1
    }
  fi
  
  cd "$ROOT_DIR"
}

# Function to publish package
publish_package() {
  local pkg=$1
  local pkg_dir="$PACKAGES_DIR/$pkg"
  
  cd "$pkg_dir"
  
  echo -e "  ${BLUE}→ Publishing @leanmcp/${pkg}@${NEW_VERSION}${NC}"
  npm publish --access public || {
    echo -e "${RED}Publish failed for @leanmcp/${pkg}${NC}"
    return 1
  }
  
  cd "$ROOT_DIR"
}

# Step 4: Update all versions
echo -e "${CYAN}[4/6] Updating package versions to ${NEW_VERSION}...${NC}"
for pkg in "${PACKAGES[@]}"; do
  update_package_version "$pkg"
done
echo -e "${GREEN}✓ All versions updated${NC}"
echo ""

# Step 5: Build all packages
echo -e "${CYAN}[5/6] Building all packages...${NC}"
FAILED_BUILD=()
for pkg in "${PACKAGES[@]}"; do
  if ! build_package "$pkg"; then
    FAILED_BUILD+=("$pkg")
  fi
done

if [ ${#FAILED_BUILD[@]} -gt 0 ]; then
  echo -e "${RED}Build failed for: ${FAILED_BUILD[*]}${NC}"
  echo -e "${YELLOW}Fix build errors and try again.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ All packages built${NC}"
echo ""

# Step 6: Publish all packages
echo -e "${CYAN}[6/6] Publishing to npm...${NC}"
FAILED_PUBLISH=()
SUCCESSFUL=()

for pkg in "${PACKAGES[@]}"; do
  if publish_package "$pkg"; then
    SUCCESSFUL+=("$pkg")
  else
    FAILED_PUBLISH+=("$pkg")
  fi
done

echo ""

if [ ${#FAILED_PUBLISH[@]} -gt 0 ]; then
  echo -e "${RED}Some packages failed to publish: ${FAILED_PUBLISH[*]}${NC}"
else
  echo -e "${GREEN}✓ All packages published${NC}"
fi

# Git commit and tag
echo ""
echo -e "${CYAN}Creating git commit and tag...${NC}"

cd "$ROOT_DIR"
git add -A
git commit -m "chore: release v${NEW_VERSION}

Published packages:
$(for pkg in "${SUCCESSFUL[@]}"; do echo "- @leanmcp/${pkg}@${NEW_VERSION}"; done)
"

git tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION}"

echo -e "${GREEN}✓ Created tag v${NEW_VERSION}${NC}"

# Push
read -p "Push to remote? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  git push && git push --tags
  echo -e "${GREEN}✓ Pushed to remote${NC}"
fi

# Summary
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                        Summary                               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo -e "${GREEN}Version: v${NEW_VERSION}${NC}"
echo -e "${GREEN}Git tag: v${NEW_VERSION}${NC}"
echo ""
echo -e "${GREEN}Published packages:${NC}"
for pkg in "${SUCCESSFUL[@]}"; do
  echo -e "  ${GREEN}✓ @leanmcp/${pkg}@${NEW_VERSION}${NC}"
done

if [ ${#FAILED_PUBLISH[@]} -gt 0 ]; then
  echo -e "${RED}Failed packages:${NC}"
  for pkg in "${FAILED_PUBLISH[@]}"; do
    echo -e "  ${RED}✗ @leanmcp/${pkg}${NC}"
  done
fi

echo ""
echo -e "${GREEN}Done!${NC}"
