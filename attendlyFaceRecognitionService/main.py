from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
import tempfile
# from deepface import DeepFace
import os
from typing import Optional
import face_recognition
import requests
from io import BytesIO
from PIL import Image
import numpy as np
import os
from datetime import datetime

app = FastAPI(title="Single-Face Verification")

# def save_upload_to_tempfile(upload_file: UploadFile) -> str:
#     """Save UploadFile to a temporary file and return path."""
#     suffix = os.path.splitext(upload_file.filename)[1] or ".jpg"
#     with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
#         tmp.write(upload_file.file.read())
#         tmp.flush()
#         return tmp.name


# @app.post("/verify-face")
# async def verify_face(
#     file: UploadFile = File(None),
#     url: str = Form(None)
# ):
#     """
#     Verify uploaded face or a provided URL against the default reference image.
#     Either 'file' or 'url' must be provided.
#     """
#     if not file and not url:
#         raise HTTPException(status_code=400, detail="Either 'file' or 'url' must be provided.")

#     tmp_path = None
#     try:
#         # Save file or download URL
#         if file:
#             tmp_path = save_upload_to_tempfile(file)

#         # Compare with reference image
#         if file and url:
#             result = DeepFace.verify(tmp_path, url, enforce_detection=True)
#         elif file and not url:
#             # If only a file is provided, ensure exactly one face is detectable
#             faces = DeepFace.extract_faces(img_path = tmp_path, enforce_detection = True)
#             result = {"verified": False, "threshold": None, "distance": None, "details": {"num_faces": len(faces)}}
#         else:
#             # Only URL provided – ensure detectability against itself (sanity check)
#             faces = DeepFace.extract_faces(img_path = url, enforce_detection = True)
#             result = {"verified": False, "threshold": None, "distance": None, "details": {"num_faces": len(faces)}}

#         return JSONResponse({
#             "verified": result["verified"],
#             "distance": result.get("distance"),
#             "threshold": result.get("threshold"),
#             "details": result
#         })

#     except ValueError as e:
#         raise HTTPException(status_code=400, detail=f"Face detection failed: {e}")
#     finally:
#         if tmp_path and os.path.exists(tmp_path):
#             try:
#                 os.remove(tmp_path)
#             except Exception:
#                 pass

def load_image(path_or_url: str):
    """Load image from URL or local path into numpy array."""
    if path_or_url.startswith("http://") or path_or_url.startswith("https://"):
        response = requests.get(path_or_url)
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Failed to fetch image from URL: {path_or_url}")
        return np.array(Image.open(BytesIO(response.content)))
    elif os.path.exists(path_or_url):
        return face_recognition.load_image_file(path_or_url)
    else:
        raise HTTPException(status_code=400, detail=f"Invalid image path: {path_or_url}")

@app.post("/verify-face")
async def verify_face(
    file: UploadFile = File(...),
    url: str = Form(...)
):
    """
    Compare the uploaded 'file' image against the 'url' reference image.
    'url' is treated as the reference face (known person).
    """
    tmp_path = None
    start_time = datetime.now()

    try:
        # Save the uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        # --- Load images ---
        reference_image = load_image(url)
        test_image = load_image(tmp_path)

        # --- Encode faces ---
        reference_encodings = face_recognition.face_encodings(reference_image)
        if len(reference_encodings) == 0:
            raise HTTPException(status_code=400, detail="No face found in the reference image.")
        reference_encoding = reference_encodings[0]

        test_encodings = face_recognition.face_encodings(test_image)
        if len(test_encodings) == 0:
            raise HTTPException(status_code=400, detail="No face found in the test image.")
        test_encoding = test_encodings[0]

        # --- Compare faces ---
        results = face_recognition.compare_faces([reference_encoding], test_encoding)
        distance = face_recognition.face_distance([reference_encoding], test_encoding)[0]

        verified = bool(results[0])
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()

        # --- Response ---
        return JSONResponse({
            "verified": verified,
            "distance": round(float(distance), 3),
            "reference_url": url,
            "filename": file.filename,
            "duration_seconds": duration,
            "timestamp": end_time.isoformat()
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error verifying face: {str(e)}")

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)

# @app.post("/detect-face")
# async def detect_face(file: UploadFile = File(...)):
#     """
#     Validate a single, clear face is present in the uploaded image.
#     Returns number of faces and a boolean ok flag (true when exactly one face detected).
#     """
#     tmp_path: Optional[str] = None
#     try:
#         if not file:
#             raise HTTPException(status_code=400, detail="Image file is required")

#         tmp_path = save_upload_to_tempfile(file)
#         faces = DeepFace.extract_faces(img_path = tmp_path, enforce_detection = True)
#         num_faces = len(faces)

#         return JSONResponse({
#             "ok": num_faces == 1,
#             "num_faces": num_faces,
#         })
#     except ValueError as e:
#         # No face or detection error
#         raise HTTPException(status_code=400, detail=f"Face detection failed: {e}")
#     finally:
#         if tmp_path and os.path.exists(tmp_path):
#             try:
#                 os.remove(tmp_path)
#             except Exception:
#                 pass

@app.post("/detect-face")
async def detect_face(file: UploadFile = File(...)):
    """
    Detect faces in an uploaded image.
    Returns:
      - ok: True if exactly one face is detected
      - num_faces: Number of faces found
    """
    tmp_path = None
    
    start_time = datetime.now()
    try:
        if not file:
            raise HTTPException(status_code=400, detail="Image file is required")

        # Save uploaded image temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        # Load the image
        image = face_recognition.load_image_file(tmp_path)

        # Detect face locations
        face_locations = face_recognition.face_locations(image)
        num_faces = len(face_locations)
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        # Return result
        return JSONResponse({
            "ok": num_faces == 1,
            "num_faces": num_faces,
            "duration":duration
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Face detection failed: {str(e)}")

    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass