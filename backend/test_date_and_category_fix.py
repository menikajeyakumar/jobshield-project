"""
Integration + unit tests for:
  - Category classification (unit)
  - Timestamp serialization (unit)
  - URL analysis pipeline — blocked/inaccessible URLs (integration)

Run: .\\venv\\Scripts\\python.exe -m pytest test_date_and_category_fix.py -v
"""
import unittest
from datetime import datetime, timezone
from app.utils.category import detect_category
from app.schemas import _serialize_utc_dt, UrlAnalyzeRequest
from app.routers.analyze import analyze_url
from app.database import SessionLocal


class TestCategoryClassifier(unittest.TestCase):
    """Unit tests for detect_category()."""

    def test_1_generic_careers_page_unclassified(self):
        """Generic company/careers page without explicit job-type → unclassified."""
        text = "Amazon.jobs: Help us build Earth's most customer-centric company. Search all job openings at Amazon."
        cat, conf = detect_category(text)
        self.assertEqual(cat, "unclassified")
        self.assertEqual(conf, 0.0)
        print("[PASS] Test 1: Generic careers/company page → unclassified")

    def test_2_explicit_part_time_text(self):
        """Explicit 'Part-time job' wording → part_time_job."""
        text = "ABC Pvt Ltd is hiring candidates for a Part-time job position in Data Entry."
        cat, conf = detect_category(text)
        self.assertEqual(cat, "part_time_job")
        self.assertGreater(conf, 0.0)
        print("[PASS] Test 2: Explicit Part-Time job text → part_time_job")

    def test_3_structured_field_job_type_part_time(self):
        """'Job Type: Part-Time' structured field → part_time_job (Tier-1 priority)."""
        text = "Job Type: Part-Time"
        cat, conf = detect_category(text)
        self.assertEqual(cat, "part_time_job")
        self.assertEqual(conf, 0.95)
        print("[PASS] Test 3: 'Job Type: Part-Time' structured field → part_time_job (conf=0.95)")

    def test_4_part_time_structured_beats_wfh_generic(self):
        """Structured Part-Time field + generic WFH keywords → part_time_job wins."""
        text = "Job Type: Part-Time. Work from home available."
        cat, conf = detect_category(text)
        self.assertEqual(cat, "part_time_job")
        self.assertEqual(conf, 0.95)
        print("[PASS] Test 4: Structured Part-Time + WFH generic → part_time_job wins")

    def test_5_explicit_work_from_home(self):
        """Explicit WFH text without Part-Time → work_from_home."""
        text = "Work from home typing job. Earn daily income from home based job. Job type: WFH."
        cat, conf = detect_category(text)
        self.assertEqual(cat, "work_from_home")
        self.assertEqual(conf, 0.95)  # Tier-1 structured field "job type: wfh"
        print("[PASS] Test 5: Explicit WFH with structured field → work_from_home")

    def test_6_explicit_internship(self):
        """Explicit internship wording → internship."""
        text = "XYZ Corp offers a Summer Internship Opportunity 2026 for Software Engineering interns. Job type: Internship."
        cat, conf = detect_category(text)
        self.assertEqual(cat, "internship")
        self.assertEqual(conf, 0.95)  # Tier-1 structured field "job type: internship"
        print("[PASS] Test 6: Explicit Internship with structured field → internship")

    def test_7_insufficient_unknown_content_unclassified(self):
        """Insufficient/unknown content → unclassified."""
        text = "Contact support@example.com for further inquiries."
        cat, conf = detect_category(text)
        self.assertEqual(cat, "unclassified")
        self.assertEqual(conf, 0.0)
        print("[PASS] Test 7: Insufficient/unknown content → unclassified")

    def test_8_wfh_generic_without_structured_field(self):
        """Generic WFH keywords (no structured field) → work_from_home via scoring."""
        text = "Work from home jobs in Delhi. Home based job opportunity available."
        cat, conf = detect_category(text)
        self.assertEqual(cat, "work_from_home")
        self.assertGreater(conf, 0.0)
        print("[PASS] Test 8: Generic WFH keywords → work_from_home")

    def test_9_part_time_generic_no_wfh(self):
        """Part-time keywords (no WFH, no structured field) → part_time_job via scoring."""
        text = "Part-time jobs available in Bangalore. Part time employment opportunity."
        cat, conf = detect_category(text)
        self.assertEqual(cat, "part_time_job")
        self.assertGreater(conf, 0.0)
        print("[PASS] Test 9: Part-time keywords → part_time_job")

    def test_10_url_content_unretrievable_sentinel_unclassified(self):
        """The inaccessible URL sentinel text must NOT trigger any category."""
        text = (
            "URL Content Unretrievable.\n"
            "Reason: HTTP 403 — server refused or blocked the request.\n"
            "The target website could not be accessed for analysis. "
            "No opportunity category, risk flags, or scam signals could be detected from this URL."
        )
        cat, conf = detect_category(text)
        self.assertEqual(cat, "unclassified")
        self.assertEqual(conf, 0.0)
        print("[PASS] Test 10: Inaccessible URL sentinel text → unclassified")


class TestTimestampSerialization(unittest.TestCase):
    """Unit tests for UTC timestamp serialization."""

    def test_11_timestamp_stored_utc_serialized_iso(self):
        utc_dt = datetime(2026, 9, 20, 4, 23, 0)
        serialized = _serialize_utc_dt(utc_dt)
        self.assertTrue(serialized.endswith("Z"))
        self.assertEqual(serialized, "2026-09-20T04:23:00Z")
        print("[PASS] Test 11: UTC timestamp serialized as ISO 8601 with 'Z' suffix")

    def test_12_midnight_utc_rollover(self):
        utc_midnight_near = datetime(2026, 9, 20, 21, 0, 0)
        serialized = _serialize_utc_dt(utc_midnight_near)
        self.assertEqual(serialized, "2026-09-20T21:00:00Z")
        print("[PASS] Test 12: Near-midnight UTC timestamp correctly formatted for IST rollover")


class TestUrlAnalysisPipeline(unittest.TestCase):
    """Integration tests for analyze_url() end-to-end pipeline."""

    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_13_blocked_url_returns_unclassified_result(self):
        """
        Indeed URL (403 anti-bot protected) must return a STORED unclassified
        Analysis record — NOT a 422 error. The UI navigates to /result/{id}.
        """
        req = UrlAnalyzeRequest(url="https://in.indeed.com/Part-Time-jobs-in-India")
        res = analyze_url(req, self.db)
        # Must be stored — has an ID
        self.assertIsNotNone(res.id)
        # Category must be unclassified — no guessing from URL text
        self.assertEqual(res.category, "unclassified")
        self.assertEqual(res.category_confidence, 0.0)
        # Risk score must be 0 — no content = no evidence of fraud either
        self.assertEqual(res.risk_score, 0)
        # source_url must match the submitted URL
        self.assertIn("indeed.com", res.source_url)
        print(f"[PASS] Test 13: Blocked URL → stored unclassified result (id={res.id[:8]})")


class TestFileUploadPipeline(unittest.TestCase):
    """Integration tests for POST /api/analyze/upload end-to-end flow."""

    def setUp(self):
        from fastapi.testclient import TestClient
        from app.main import app
        self.client = TestClient(app)

    def test_14_png_image_upload_success(self):
        """PNG image with info metadata must return 200 OK stored Analysis record."""
        import io
        from PIL import Image
        from PIL.PngImagePlugin import PngInfo

        info = PngInfo()
        info.add_text("Description", "Part-Time Job Opportunity at ABC Ltd. Salary Rs 2000 per day.")
        img = Image.new("RGB", (300, 150), color=(255, 255, 255))
        buf = io.BytesIO()
        img.save(buf, format="PNG", pnginfo=info)

        res = self.client.post(
            "/api/analyze/upload",
            files={"file": ("job_poster.png", buf.getvalue(), "image/png")}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNotNone(data.get("id"))
        self.assertEqual(data.get("input_type"), "upload")
        print(f"[PASS] Test 14: PNG poster upload → 200 OK stored result (id={data['id'][:8]})")

    def test_15_pdf_upload_success(self):
        """PDF file with embedded text layer must return 200 OK stored Analysis record."""
        import fitz
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((50, 50), "Job Offer: Part-Time Data Entry Position at XYZ Solutions.")
        pdf_bytes = doc.write()
        doc.close()

        res = self.client.post(
            "/api/analyze/upload",
            files={"file": ("offer_letter.pdf", pdf_bytes, "application/pdf")}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNotNone(data.get("id"))
        self.assertEqual(data.get("input_type"), "upload")
        self.assertEqual(data.get("category"), "part_time_job")
        print(f"[PASS] Test 15: PDF offer letter upload → 200 OK stored result (id={data['id'][:8]})")

    def test_16_oversized_file_upload_rejected(self):
        """Files > 8MB must be rejected with HTTP 413 Payload Too Large."""
        big_bytes = b"0" * (9 * 1024 * 1024)
        res = self.client.post(
            "/api/analyze/upload",
            files={"file": ("large_poster.png", big_bytes, "image/png")}
        )
        self.assertEqual(res.status_code, 413)
        self.assertIn("exceeds 8MB limit", res.json().get("detail", ""))
        print("[PASS] Test 16: Oversized file (>8MB) → 413 Payload Too Large")

    def test_17_unsupported_file_format_rejected(self):
        """Unsupported file extensions (.exe) must be rejected with HTTP 422."""
        res = self.client.post(
            "/api/analyze/upload",
            files={"file": ("file.exe", b"executable_data", "application/octet-stream")}
        )
        self.assertEqual(res.status_code, 422)
        self.assertIn("Unsupported file format", res.json().get("detail", ""))
        print("[PASS] Test 17: Unsupported file format (.exe) → 422 Unprocessable Entity")


if __name__ == "__main__":
    unittest.main()

