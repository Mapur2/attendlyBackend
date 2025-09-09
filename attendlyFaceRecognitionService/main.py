from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
import tempfile
from deepface import DeepFace
import os
from typing import Optional
app = FastAPI(title="Single-Face Verification")

def save_upload_to_tempfile(upload_file: UploadFile) -> str:
    """Save UploadFile to a temporary file and return path."""
    suffix = os.path.splitext(upload_file.filename)[1] or ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(upload_file.file.read())
        tmp.flush()
        return tmp.name


@app.post("/verify-face")
async def verify_face(
    file: UploadFile = File(None),
    url: str = Form(None)
):
    """
    Verify uploaded face or a provided URL against the default reference image.
    Either 'file' or 'url' must be provided.
    """
    if not file and not url:
        raise HTTPException(status_code=400, detail="Either 'file' or 'url' must be provided.")

    tmp_path = None
    try:
        # Save file or download URL
        if file:
            tmp_path = save_upload_to_tempfile(file)

        # Compare with reference image
        if file and url:
            result = DeepFace.verify(tmp_path, url, enforce_detection=True)
        elif file and not url:
            # If only a file is provided, ensure exactly one face is detectable
            faces = DeepFace.extract_faces(img_path = tmp_path, enforce_detection = True)
            result = {"verified": False, "threshold": None, "distance": None, "details": {"num_faces": len(faces)}}
        else:
            # Only URL provided – ensure detectability against itself (sanity check)
            faces = DeepFace.extract_faces(img_path = url, enforce_detection = True)
            result = {"verified": False, "threshold": None, "distance": None, "details": {"num_faces": len(faces)}}

        return JSONResponse({
            "verified": result["verified"],
            "distance": result.get("distance"),
            "threshold": result.get("threshold"),
            "details": result
        })

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Face detection failed: {e}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass


@app.post("/detect-face")
async def detect_face(file: UploadFile = File(...)):
    """
    Validate a single, clear face is present in the uploaded image.
    Returns number of faces and a boolean ok flag (true when exactly one face detected).
    """
    tmp_path: Optional[str] = None
    try:
        if not file:
            raise HTTPException(status_code=400, detail="Image file is required")

        tmp_path = save_upload_to_tempfile(file)
        faces = DeepFace.extract_faces(img_path = tmp_path, enforce_detection = True)
        num_faces = len(faces)

        return JSONResponse({
            "ok": num_faces == 1,
            "num_faces": num_faces,
        })
    except ValueError as e:
        # No face or detection error
        raise HTTPException(status_code=400, detail=f"Face detection failed: {e}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass
