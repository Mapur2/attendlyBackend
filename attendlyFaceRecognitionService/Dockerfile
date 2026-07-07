FROM python:3.10-slim

WORKDIR /app

# 1. Install system dependencies (Adding build-essential and patchelf)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    patchelf \
    ffmpeg \
    libsm6 \
    libxext6 \
    libgl1 \
    wget \
  && rm -rf /var/lib/apt/lists/*

# 2. Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3. STRIP EXECSTACK TO FIX ONNXRUNTIME IMPORT ERROR
# This prevents Docker from blocking the C++ shared objects
RUN find /usr/local/lib/python3.10/site-packages/onnxruntime -name "*.so" -exec patchelf --clear-execstack {} \;

# 4. Copy application code
COPY . .

# 5. PRE-DOWNLOAD THE MODEL DURING BUILD
RUN python -c "from insightface.app import FaceAnalysis; FaceAnalysis(name='buffalo_s', providers=['CPUExecutionProvider']).prepare(ctx_id=-1, det_size=(640, 640))"

# 6. Optimize CPU usage for ONNX Runtime
ENV OMP_NUM_THREADS=2
ENV PORT=8000

EXPOSE 8000

# 7. Run with exactly 1 worker
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 1"]