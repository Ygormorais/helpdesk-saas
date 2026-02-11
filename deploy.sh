#!/bin/bash

echo "🚀 HelpDesk SaaS - Deployment Script"
echo "===================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Functions
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
echo ""
echo "📋 Checking prerequisites..."

command -v node >/dev/null 2>&1 || { print_error "Node.js is not installed"; exit 1; }
command -v npm >/dev/null 2>&1 || { print_error "npm is not installed"; exit 1; }
command -v git >/dev/null 2>&1 || { print_error "Git is not installed"; exit 1; }
print_status "All prerequisites met"

# Get current directory
PROJECT_ROOT=$(pwd)

# Backend deployment
echo ""
echo "🔧 Deploying Backend..."

cd "$PROJECT_ROOT/backend"

# Install dependencies
echo "Installing backend dependencies..."
npm ci --only=production || npm install --only=production

if [ $? -eq 0 ]; then
    print_status "Backend dependencies installed"
else
    print_error "Failed to install backend dependencies"
    exit 1
fi

# Build
echo "Building backend..."
npm run build

if [ $? -eq 0 ]; then
    print_status "Backend built successfully"
else
    print_error "Backend build failed"
    exit 1
fi

# Frontend deployment
echo ""
echo "🎨 Deploying Frontend..."

cd "$PROJECT_ROOT/frontend"

# Install dependencies
echo "Installing frontend dependencies..."
npm ci || npm install

if [ $? -eq 0 ]; then
    print_status "Frontend dependencies installed"
else
    print_error "Failed to install frontend dependencies"
    exit 1
fi

# Build
echo "Building frontend..."
npm run build

if [ $? -eq 0 ]; then
    print_status "Frontend built successfully"
else
    print_error "Frontend build failed"
    exit 1
fi

echo ""
echo "✅ Build complete!"
echo ""
echo "📦 Next steps:"
echo "   1. Deploy 'backend/dist' to Railway/Render"
echo "   2. Deploy 'frontend/dist' to Vercel/Netlify"
echo "   3. Configure environment variables"
echo "   4. Update CORS settings with your URLs"
echo ""
echo "📚 For detailed instructions, see DEPLOY.md"
