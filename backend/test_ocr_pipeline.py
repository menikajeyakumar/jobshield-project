"""
Integration tests for complete OCR & Analysis Pipeline:
1. Clear PNG poster -> OCR text extracted -> analysis succeeds
2. Clear JPG poster -> OCR text extracted -> analysis succeeds
3. Clear WEBP image -> OCR text extracted -> analysis succeeds
4. WhatsApp screenshot -> OCR text extracted -> analysis succeeds
5. Truly blank/low-text image -> HTTP 422 readable-text error
6. PDF upload -> existing behavior preserved
7. >8MB file -> rejected with HTTP 413
8. Unsupported file type -> rejected with HTTP 422
"""
import io
import os
import sys
import pytest
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(__file__))
from app.main import app

client = TestClient(app)

def create_image_with_text(lines, fmt='PNG'):
    img = Image.new('RGB', (900, 700), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    y = 40
    for line in lines:
        d.text((40, y), line, fill=(0, 0, 0))
        y += 45
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()

def create_blank_image(fmt='PNG'):
    img = Image.new('RGB', (400, 400), color=(250, 250, 250))
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()

def create_pdf_with_text(text):
    import fitz
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), text)
    pdf_bytes = doc.write()
    doc.close()
    return pdf_bytes


def test_png_poster_ocr_analysis():
    lines = [
        "TechNova Hiring Internship",
        "Position: Software Development Intern",
        "Location: Chennai Office",
        "Stipend: Rs. 15000 per month",
        "Eligibility: BE / BTech / BCA passouts",
        "Apply Now send resume to careers@technova.com"
    ]
    img_bytes = create_image_with_text(lines, fmt='PNG')
    files = {"file": ("poster.png", img_bytes, "image/png")}
    data = {"category_hint": "internship"}
    resp = client.post("/api/analyze/upload", files=files, data=data)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    result = resp.json()
    assert "id" in result
    assert result["input_type"] == "upload"
    assert len(result["raw_text"]) > 10
    assert result["risk_score"] is not None
    assert result["classification"] in ["likely_genuine", "suspicious", "likely_fake"]


def test_jpg_poster_ocr_analysis():
    lines = [
        "Senior Frontend Engineer Job",
        "Company: Acme Software Solutions",
        "Location: Bangalore",
        "Salary: 12 LPA",
        "Contact: hr@acmesoftware.com",
        "Apply online at https://acmesoftware.com/careers"
    ]
    img_bytes = create_image_with_text(lines, fmt='JPEG')
    files = {"file": ("poster.jpg", img_bytes, "image/jpeg")}
    resp = client.post("/api/analyze/upload", files=files)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    result = resp.json()
    assert "id" in result
    assert result["risk_score"] is not None


def test_webp_image_ocr_analysis():
    lines = [
        "Data Entry Remote Job Opportunity",
        "Earn Rs 2000 per day working from home",
        "Requirements: Computer and Good Internet",
        "Contact: hr@dataentryworks.com"
    ]
    img_bytes = create_image_with_text(lines, fmt='WEBP')
    files = {"file": ("offer.webp", img_bytes, "image/webp")}
    resp = client.post("/api/analyze/upload", files=files)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    result = resp.json()
    assert "id" in result


def test_whatsapp_screenshot_ocr_analysis():
    lines = [
        "WhatsApp Message",
        "Urgent Hiring Work From Home",
        "Data Entry Executive Role",
        "Earn 25,000 per month",
        "Contact WhatsApp +91 9876543210"
    ]
    img_bytes = create_image_with_text(lines, fmt='PNG')
    files = {"file": ("whatsapp_ss.png", img_bytes, "image/png")}
    resp = client.post("/api/analyze/upload", files=files)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    result = resp.json()
    assert "id" in result
    assert result["raw_text"] != ""


def test_blank_image_returns_422():
    img_bytes = create_blank_image(fmt='PNG')
    files = {"file": ("blank.png", img_bytes, "image/png")}
    resp = client.post("/api/analyze/upload", files=files)
    assert resp.status_code == 422
    err_detail = resp.json().get("detail", "")
    assert "Could not extract readable text from the uploaded poster" in err_detail


def test_pdf_upload_preserved():
    pdf_text = "Software Engineer Job Opening at Global Tech Corp. Location: Hyderabad. Contact: jobs@globaltech.com"
    pdf_bytes = create_pdf_with_text(pdf_text)
    files = {"file": ("document.pdf", pdf_bytes, "application/pdf")}
    resp = client.post("/api/analyze/upload", files=files)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    result = resp.json()
    assert "Global Tech" in result["raw_text"]


def test_large_file_rejected_413():
    # File > 8MB
    large_bytes = b"0" * (8 * 1024 * 1024 + 100)
    files = {"file": ("huge.png", large_bytes, "image/png")}
    resp = client.post("/api/analyze/upload", files=files)
    assert resp.status_code == 413
    assert "8MB" in resp.json().get("detail", "")


def test_unsupported_file_type_rejected_422():
    files = {"file": ("script.exe", b"MZexecutable_bytes", "application/x-msdownload")}
    resp = client.post("/api/analyze/upload", files=files)
    assert resp.status_code == 422
    assert "Unsupported file format" in resp.json().get("detail", "")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
