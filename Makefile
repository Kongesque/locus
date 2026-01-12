.PHONY: dev dev-backend dev-frontend install

# Run both backend and frontend in parallel
dev:
	@echo "Starting Locus development environment..."
	@$(MAKE) -j2 dev-backend dev-frontend

dev-backend:
	@echo "Starting Backend..."
	cd backend && uv run uvicorn app.main:app --reload --port 8000

dev-frontend:
	@echo "Starting Frontend..."
	cd frontend && npm run dev

# Helper to install dependencies for both
install:
	@echo "Installing Backend dependencies..."
	cd backend && uv sync
	@echo "Installing Frontend dependencies..."
	cd frontend && npm install
