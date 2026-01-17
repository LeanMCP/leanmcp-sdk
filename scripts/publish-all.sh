#!/bin/bash

# LeanMCP SDK - Publish All Packages Script
# This script bumps the minor version and publishes all packages to npm

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the root directory (one level up from scripts)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PACKAGES_DIR="$ROOT_DIR/packages"

# Packages in dependency order (dependencies first, dependents last)
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

# Version bump type (default: minor)
VERSION_TYPE="${1:-minor}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  LeanMCP SDK - Publish All Packages${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Version bump type: ${VERSION_TYPE}${NC}"
echo -e "${YELLOW}Packages directory: ${PACKAGES_DIR}${NC}"
echo ""

# Check if logged into npm
echo -e "${BLUE}Checking npm authentication...${NC}"
if ! npm whoami &> /dev/null; then
  echo -e "${RED}Error: Not logged into npm. Please run 'npm login' first.${NC}"
  exit 1
fi
NPM_USER=$(npm whoami)
echo -e "${GREEN}Logged in as: ${NPM_USER}${NC}"
echo ""

# Function to publish a single package
publish_package() {
  local pkg=$1
  local pkg_dir="$PACKAGES_DIR/$pkg"
  
  if [ ! -d "$pkg_dir" ]; then
    echo -e "${RED}Package directory not found: $pkg_dir${NC}"
    return 1
  fi
  
  echo -e "${BLUE}----------------------------------------${NC}"
  echo -e "${BLUE}Processing: @leanmcp/${pkg}${NC}"
  echo -e "${BLUE}----------------------------------------${NC}"
  
  cd "$pkg_dir"
  
  # Get current version
  CURRENT_VERSION=$(node -p "require('./package.json').version")
  echo -e "${YELLOW}Current version: ${CURRENT_VERSION}${NC}"
  
  # Bump version
  echo -e "${YELLOW}Bumping ${VERSION_TYPE} version...${NC}"
  if ! npm version "$VERSION_TYPE" --no-git-tag-version; then
    echo -e "${RED}Failed to bump version for @leanmcp/${pkg}${NC}"
    cd "$ROOT_DIR"
    return 1
  fi
  
  # Get new version
  NEW_VERSION=$(node -p "require('./package.json').version")
  echo -e "${GREEN}New version: ${NEW_VERSION}${NC}"
  
  # Build if build script exists
  if node -p "require('./package.json').scripts?.build" | grep -q -v "undefined"; then
    echo -e "${YELLOW}Building package...${NC}"
    if ! npm run build; then
      echo -e "${RED}Build failed for @leanmcp/${pkg}${NC}"
      cd "$ROOT_DIR"
      return 1
    fi
  fi
  
  # Publish
  echo -e "${YELLOW}Publishing to npm...${NC}"
  if ! npm publish --access public; then
    echo -e "${RED}Publish failed for @leanmcp/${pkg}@${NEW_VERSION}${NC}"
    cd "$ROOT_DIR"
    return 1
  fi
  
  echo -e "${GREEN}✓ Successfully published @leanmcp/${pkg}@${NEW_VERSION}${NC}"
  echo ""
  
  cd "$ROOT_DIR"
  return 0
}

# Confirm before proceeding
echo -e "${YELLOW}The following packages will be updated and published:${NC}"
for pkg in "${PACKAGES[@]}"; do
  echo "  - @leanmcp/$pkg"
done
echo ""

read -p "Do you want to proceed? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}Aborted.${NC}"
  exit 0
fi

echo ""

# Publish each package
FAILED_PACKAGES=()
SUCCESSFUL_PACKAGES=()

for pkg in "${PACKAGES[@]}"; do
  if publish_package "$pkg"; then
    SUCCESSFUL_PACKAGES+=("$pkg")
  else
    FAILED_PACKAGES+=("$pkg")
    echo -e "${RED}Failed to publish @leanmcp/${pkg}${NC}"
  fi
done

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Summary${NC}"
echo -e "${BLUE}========================================${NC}"

if [ ${#SUCCESSFUL_PACKAGES[@]} -gt 0 ]; then
  echo -e "${GREEN}Successfully published:${NC}"
  for pkg in "${SUCCESSFUL_PACKAGES[@]}"; do
    echo -e "  ${GREEN}✓ @leanmcp/${pkg}${NC}"
  done
fi

if [ ${#FAILED_PACKAGES[@]} -gt 0 ]; then
  echo -e "${RED}Failed to publish:${NC}"
  for pkg in "${FAILED_PACKAGES[@]}"; do
    echo -e "  ${RED}✗ @leanmcp/${pkg}${NC}"
  done
  exit 1
fi

echo ""
echo -e "${GREEN}All packages published successfully!${NC}"
