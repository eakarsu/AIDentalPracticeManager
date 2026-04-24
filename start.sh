#!/bin/bash

# ============================================
# AI Dental Practice Manager - Start Script
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo -e "${CYAN}"
echo "  ╔═══════════════════════════════════════════════╗"
echo "  ║     🦷  AI Dental Practice Manager  🦷       ║"
echo "  ║         Professional Edition v1.0              ║"
echo "  ╚═══════════════════════════════════════════════╝"
echo -e "${NC}"

# ---- Clean used ports ----
echo -e "${YELLOW}[1/7] Cleaning used ports...${NC}"
cleanup_port() {
  local port=$1
  local pids=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo -e "  ${RED}Killing processes on port $port: $pids${NC}"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  else
    echo -e "  ${GREEN}Port $port is free${NC}"
  fi
}

cleanup_port 3000
cleanup_port 3001

# ---- Check .env ----
echo -e "\n${YELLOW}[2/7] Checking environment configuration...${NC}"
if [ ! -f .env ]; then
  echo -e "  ${RED}ERROR: .env file not found!${NC}"
  echo -e "  Creating default .env file..."
  cat > .env << 'EOF'
DATABASE_URL=postgresql://dental_admin:dental_pass_2024@localhost:5432/dental_practice
OPENROUTER_API_KEY=your_openrouter_key_here
OPENROUTER_MODEL=anthropic/claude-haiku-4.5
JWT_SECRET=dental_practice_jwt_secret_2024_secure
BACKEND_PORT=3001
FRONTEND_PORT=3000
NODE_ENV=development
EOF
fi
echo -e "  ${GREEN}.env file configured${NC}"

# ---- Check PostgreSQL ----
echo -e "\n${YELLOW}[3/7] Checking PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
  echo -e "  ${RED}PostgreSQL not found. Please install PostgreSQL first.${NC}"
  exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -q 2>/dev/null; then
  echo -e "  ${YELLOW}Starting PostgreSQL...${NC}"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
  else
    sudo service postgresql start 2>/dev/null || true
  fi
  sleep 2
fi

# Create database and user if they don't exist
echo -e "  ${BLUE}Setting up database...${NC}"
psql postgres -tc "SELECT 1 FROM pg_roles WHERE rolname='dental_admin'" | grep -q 1 || \
  psql postgres -c "CREATE ROLE dental_admin WITH LOGIN PASSWORD 'dental_pass_2024' CREATEDB;" 2>/dev/null || true

psql postgres -tc "SELECT 1 FROM pg_database WHERE datname='dental_practice'" | grep -q 1 || \
  psql postgres -c "CREATE DATABASE dental_practice OWNER dental_admin;" 2>/dev/null || true

echo -e "  ${GREEN}PostgreSQL ready${NC}"

# ---- Install dependencies ----
echo -e "\n${YELLOW}[4/7] Installing backend dependencies...${NC}"
cd "$PROJECT_DIR/backend"
if [ ! -d node_modules ]; then
  npm install
else
  echo -e "  ${GREEN}Backend dependencies already installed${NC}"
fi

echo -e "\n${YELLOW}[5/7] Installing frontend dependencies...${NC}"
cd "$PROJECT_DIR/frontend"
if [ ! -d node_modules ]; then
  npm install
else
  echo -e "  ${GREEN}Frontend dependencies already installed${NC}"
fi

# ---- Seed database ----
echo -e "\n${YELLOW}[6/7] Seeding database...${NC}"
cd "$PROJECT_DIR/backend"
node db/seed.js

# ---- Start application ----
echo -e "\n${YELLOW}[7/7] Starting application with hot-reload...${NC}"
echo ""
echo -e "${GREEN}  ✅ Backend API:  http://localhost:3001${NC}"
echo -e "${GREEN}  ✅ Frontend App: http://localhost:3000${NC}"
echo ""
echo -e "${PURPLE}  📧 Demo Login: dr.smith@dentalcare.com / password123${NC}"
echo -e "${PURPLE}  🔑 Click 'Quick Login' button to auto-fill credentials${NC}"
echo ""
echo -e "${CYAN}  Hot-reload enabled - changes will auto-refresh!${NC}"
echo -e "${YELLOW}  Press Ctrl+C to stop all services${NC}"
echo ""

# Start backend with nodemon (hot-reload)
cd "$PROJECT_DIR/backend"
npx nodemon server.js &
BACKEND_PID=$!

# Start frontend with React dev server (hot-reload built-in)
cd "$PROJECT_DIR/frontend"
PORT=3000 BROWSER=none npm start &
FRONTEND_PID=$!

# Trap to clean up on exit
trap "echo -e '\n${RED}Shutting down...${NC}'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# Wait for both processes
wait
