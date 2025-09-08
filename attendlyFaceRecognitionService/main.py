from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
import tempfile
from deepface import DeepFace
import os
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
        raise HTTPException(status_code=400, detail="Either 'file' and 'url' must be provided.")

    tmp_path = None
    try:
        # Save file or download URL
        if file:
            tmp_path = save_upload_to_tempfile(file)

        # Compare with reference image
        result = DeepFace.verify(tmp_path, url, enforce_detection=True)

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
