from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
import tempfile
import os
import requests
from io import BytesIO
from PIL import Image
import numpy as np
import cv2
from datetime import datetime

from insightface.app import FaceAnalysis

# ============================================================
# APP INIT
# ============================================================

app = FastAPI(
    title="Single-Face Verification Service",
    version="1.0.0"
)

# ============================================================
# LOAD INSIGHTFACE MODEL (CPU ONLY)
# ============================================================

face_app = FaceAnalysis(
    name="buffalo_l",                      # ✅ includes detection + recognition
    providers=["CPUExecutionProvider"]     # CPU-safe
)

face_app.prepare(
    ctx_id=-1,                             # CPU only
    det_size=(640, 640)                    # REQUIRED
)

# ============================================================
# UTILITIES
# ============================================================

def load_image(path_or_url: str) -> np.ndarray:
    """
    Load image from URL or local path → RGB numpy array
    """
    if path_or_url.startswith("http://") or path_or_url.startswith("https://"):
        r = requests.get(path_or_url, timeout=10)
        if r.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch image from URL")
        img = Image.open(BytesIO(r.content)).convert("RGB")
        return np.array(img)

    if os.path.exists(path_or_url):
        img = Image.open(path_or_url).convert("RGB")
        return np.array(img)

    raise HTTPException(status_code=400, detail="Invalid image path")


def get_single_face_embedding(image: np.ndarray) -> np.ndarray:
    """
    Detect exactly ONE face and return its embedding
    """
    faces = face_app.get(image)

    if len(faces) == 0:
        raise HTTPException(status_code=400, detail="No face detected")
    if len(faces) > 1:
        raise HTTPException(status_code=400, detail="Multiple faces detected")

    return faces[0].embedding


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """
    Compute cosine similarity between two embeddings
    """
    a = a / np.linalg.norm(a)
    b = b / np.linalg.norm(b)
    return float(np.dot(a, b))

@app.get("/")
def server_running():
    return {
        "status": "ok",
        "message": "Face Recognition API is running",
        "timestamp": datetime.now().isoformat()
    }

# ============================================================
# FACE VERIFICATION ENDPOINT
# ============================================================

@app.post("/verify-face")
async def verify_face(
    file: UploadFile = File(...),
    url: str = Form(...)
):
    """
    Compare uploaded face with reference image URL
    """
    start_time = datetime.now()
    tmp_path = None

    try:
        # Save uploaded file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        # Load images
        reference_img = load_image(url)
        test_img = load_image(tmp_path)

        # Extract embeddings
        emb_ref = get_single_face_embedding(reference_img)
        emb_test = get_single_face_embedding(test_img)

        # Compare
        similarity = cosine_similarity(emb_ref, emb_test)
        threshold = 0.45
        verified = similarity >= threshold

        duration = (datetime.now() - start_time).total_seconds()

        return JSONResponse({
            "verified": verified,
            "similarity": round(similarity, 3),
            "threshold": threshold,
            "filename": file.filename,
            "reference_url": url,
            "duration_seconds": duration,
            "timestamp": datetime.now().isoformat()
        })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


# ============================================================
# FACE DETECTION ENDPOINT
# ============================================================

@app.post("/detect-face")
async def detect_face(file: UploadFile = File(...)):
    """
    Detect faces in uploaded image
    """
    start_time = datetime.now()
    tmp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        img = load_image(tmp_path)
        faces = face_app.get(img)

        duration = (datetime.now() - start_time).total_seconds()

        return JSONResponse({
            "ok": len(faces) == 1,
            "num_faces": len(faces),
            "duration_seconds": duration
        })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)

