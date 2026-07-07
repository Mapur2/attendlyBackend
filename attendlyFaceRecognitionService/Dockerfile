FROM python:3.10-slim

WORKDIR /app

# 1. Install system dependencies (Adding build-essential for C++ compilation)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    libsm6 \
    libxext6 \
    libgl1 \
    wget \
  && rm -rf /var/lib/apt/lists/*

# 2. Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3. Copy application code
COPY . .

# 4. PRE-DOWNLOAD THE MODEL DURING BUILD
RUN python -c "from insightface.app import FaceAnalysis; FaceAnalysis(name='buffalo_s', providers=['CPUExecutionProvider']).prepare(ctx_id=-1, det_size=(640, 640))"

# 5. Optimize CPU usage for ONNX Runtime
ENV OMP_NUM_THREADS=2
ENV PORT=8000

EXPOSE 8000

# 6. Run with exactly 1 worker
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 1"]