"""
OCR (Tesseract / WinOCR) and QR-code extraction for uploaded posters / certificates / PDFs.
"""
import io
import os
import asyncio
import concurrent.futures
from typing import Tuple, List, Optional
from PIL import Image, ImageOps, ImageEnhance
import pytesseract

from ..config import settings

# Auto-detect Tesseract installation path on Windows if default command fails
tesseract_cmd = settings.tesseract_cmd
if os.name == 'nt':
    possible_paths = [
        tesseract_cmd,
        r'C:\Program Files\Tesseract-OCR\tesseract.exe',
        r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
        os.path.expanduser(r'~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe'),
    ]
    for p in possible_paths:
        if p and os.path.exists(p):
            tesseract_cmd = p
            break

pytesseract.pytesseract.tesseract_cmd = tesseract_cmd


def preprocess_image_bytes(image_bytes: bytes) -> Image.Image:
    """Preprocess image for optimal OCR extraction."""
    img = Image.open(io.BytesIO(image_bytes))
    img = ImageOps.exif_transpose(img)
    if img.mode not in ('RGB', 'L'):
        img = img.convert('RGB')

    # Auto-rescale small images to improve text legibility for OCR
    w, h = img.size
    if w > 0 and h > 0 and (w < 800 or h < 800):
        scale = max(2.0, 800.0 / min(w, h))
        new_w, new_h = int(w * scale), int(h * scale)
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    # Mild contrast boost
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.15)
    return img


def _clean_ocr_text(text: str) -> str:
    if not text:
        return ""
    text = text.replace('\ufffd', ' ')
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return "\n".join(lines).strip()


def _run_winocr_sync(img: Image.Image) -> str:
    try:
        import winocr

        async def _do_ocr(pi):
            res = await winocr.recognize_pil(pi, lang='en-US')
            return res.text if res else ''

        def _worker():
            return asyncio.run(_do_ocr(img))

        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            with concurrent.futures.ThreadPoolExecutor() as ex:
                f = ex.submit(_worker)
                res_text = f.result(timeout=15)
        else:
            res_text = _worker()

        return (res_text or "").strip()
    except Exception as err:
        print(f"[JobShield OCR Notice] WinOCR engine unavailable or failed: {err}")
        return ""


def ocr_image_bytes(image_bytes: bytes) -> str:
    """Run OCR on a single image and return extracted text.
    Uses multi-engine architecture (WinOCR -> Pytesseract -> Image info -> EXIF)."""
    if not image_bytes:
        return ""

    try:
        img = preprocess_image_bytes(image_bytes)
    except Exception:
        try:
            img = Image.open(io.BytesIO(image_bytes))
        except Exception:
            return ""

    # 1. Primary Engine for Windows: WinOCR (Windows 10/11 built-in native OCR)
    if os.name == 'nt':
        win_text = _run_winocr_sync(img)
        cleaned = _clean_ocr_text(win_text)
        if len(cleaned) >= 5:
            return cleaned

    # 2. Secondary Engine: Pytesseract
    try:
        text = pytesseract.image_to_string(img).strip()
        cleaned = _clean_ocr_text(text)
        if len(cleaned) >= 5:
            return cleaned
    except Exception as err:
        print(f"[JobShield OCR Notice] Tesseract unavailable or failed ({err}).")

    # 3. Check Image info / EXIF text tags as fallback
    try:
        raw_img = Image.open(io.BytesIO(image_bytes))
        if hasattr(raw_img, 'info') and isinstance(raw_img.info, dict):
            info_texts = []
            for k, v in raw_img.info.items():
                if isinstance(v, str) and len(v.strip()) > 5:
                    info_texts.append(v.strip())
            if info_texts:
                return _clean_ocr_text("\n".join(info_texts))
    except Exception:
        pass

    return ""


def ocr_pdf_bytes(pdf_bytes: bytes) -> str:
    """Extract text from a PDF: first try embedded text layer (fast, accurate),
    fall back to rasterizing pages and running OCR (for scanned PDFs)."""
    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise RuntimeError("PyMuPDF (pymupdf) is required for PDF support. pip install pymupdf")

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    text_parts = []
    for page in doc:
        page_text = page.get_text().strip()
        if page_text:
            text_parts.append(page_text)
        else:
            # scanned page with no text layer -> rasterize + OCR
            pix = page.get_pixmap(dpi=200)
            img_bytes = pix.tobytes("png")
            try:
                ocr_text = ocr_image_bytes(img_bytes)
                if ocr_text:
                    text_parts.append(ocr_text)
            except Exception:
                pass
    doc.close()
    return "\n".join(text_parts).strip()


def extract_qr_codes(image_bytes: bytes) -> List[str]:
    """Detect and decode any QR codes present in an image. Returns list of
    decoded string payloads (usually verification URLs or contact text)."""
    payloads: List[str] = []

    # 1. Try pyzbar decoder
    try:
        from pyzbar.pyzbar import decode
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        results = decode(img)
        for r in results:
            val = r.data.decode("utf-8", errors="ignore").strip()
            if val and val not in payloads:
                payloads.append(val)
    except Exception:
        pass

    # 2. Try OpenCV QRCodeDetector decoder fallback
    if not payloads:
        try:
            import cv2
            import numpy as np
            nparr = np.frombuffer(image_bytes, np.uint8)
            cv_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if cv_img is not None:
                detector = cv2.QRCodeDetector()
                val, points, straight_qrcode = detector.detectAndDecode(cv_img)
                if val and val.strip():
                    payloads.append(val.strip())
        except Exception:
            pass

    return payloads


def process_upload(filename: str, content_type: str, file_bytes: bytes) -> Tuple[str, List[str]]:
    """Route an uploaded file to the right extractor.
    Returns (extracted_text, qr_payloads)."""
    qr_payloads: List[str] = []
    text = ""

    is_pdf = (content_type == "application/pdf" or filename.lower().endswith(".pdf"))

    if is_pdf:
        try:
            text = ocr_pdf_bytes(file_bytes)
        except Exception as e:
            print(f"[JobShield OCR Notice] PDF text extraction failed: {e}")
            text = ""
    else:
        try:
            text = ocr_image_bytes(file_bytes)
        except Exception as e:
            print(f"[JobShield OCR Notice] Image OCR failed: {e}")
            text = ""

        # QR code detection runs independently for all image uploads
        qr_payloads = extract_qr_codes(file_bytes)

        # If OCR text is empty but a QR payload exists, use QR payload as text
        if not text and qr_payloads:
            text = "Scanned QR Code payload:\n" + "\n".join(qr_payloads)

    return text, qr_payloads
