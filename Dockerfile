# Stage 1: Build CSS with Node.js
FROM node:20-alpine AS css-builder

WORKDIR /build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build


# Stage 2: Python runtime
FROM python:3.10-slim

# Install system dependencies for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast Python package management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Copy Python dependency files
COPY pyproject.toml uv.lock ./

# Install Python dependencies
RUN uv sync --frozen --no-dev

# Copy application code
COPY . .

# Copy built CSS from Stage 1
COPY --from=css-builder /build/static/css ./static/css

# Create necessary directories
RUN mkdir -p uploads/videos uploads/frames uploads/outputs weights instance

# Expose Flask port
EXPOSE 5000

# Environment variables
ENV FLASK_APP=app.py
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

# Run with uv
CMD ["uv", "run", "python", "app.py"]
