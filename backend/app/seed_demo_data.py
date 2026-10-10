"""
Seeds the database with clearly-labelled DEMO DATA covering all 10
categories, plus a couple of sample scam-pattern entries, so the dashboard,
history and admin views have something to show out of the box.

Run with:  python -m app.seed_demo_data
"""
from .database import Base, engine, SessionLocal
from . import models
from .utils import extraction, category as category_util, red_flags as red_flag_engine
from .utils import risk_score as risk_engine
from .utils.payment_risk import build_payment_risk

Base.metadata.create_all(bind=engine)

DEMO_SAMPLES = [
    ("part_time_job", """DEMO DATA - FOR TESTING ONLY
Easy Online Data Entry Job!! Earn Rs 5000 per day from home!! No investment,
100% guaranteed income. Limited seats, register immediately by paying a
refundable registration fee of Rs 499 to UPI ID quickfake@ybl.
Contact: 9876543210, email: quickjobs123@gmail.com"""),

    ("internship", """DEMO DATA - FOR TESTING ONLY
Company: BrightFuture Innovations Pvt Ltd
Internship Title: HR Intern (Work From Home)
We offer a guaranteed internship certificate and guaranteed placement after
2 weeks. Pay a training fee of Rs 999 to confirm your seat. Hurry, only
today! Contact: brightfuture.hr@gmail.com, 9123456780"""),

    ("work_from_home", """DEMO DATA - FOR TESTING ONLY
Work From Home! No experience needed. Earn 3000 per day! Small security
deposit of Rs 1500 required before kit dispatch. UPI: homejob@paytm.
Act now, few slots left!"""),

    ("course_training", """DEMO DATA - FOR TESTING ONLY
Institute: SkillMax Training Institute
Certification Course in Digital Marketing - guaranteed placement in top MNC
companies. Course fee Rs 15000, limited seats, register today.
Website: www.skillmaxfake-example.com, email: admissions@gmail.com"""),

    ("scholarship", """DEMO DATA - FOR TESTING ONLY
National Merit Scholarship Scheme 2026 - get Rs 50,000 scholarship!
A processing fee of Rs 350 is required to activate your application.
Apply now at the link, limited seats. Contact: scholarship.help@gmail.com"""),

    ("government_scheme", """DEMO DATA - FOR TESTING ONLY
Government of India Skill Development Subsidy Scheme - get Rs 25,000
subsidy directly to your account! Registration fee Rs 199 required.
Pay via UPI: govtscheme@ok. Register before the scheme closes today."""),

    ("recruitment", """DEMO DATA - FOR TESTING ONLY
Company: Apex Global Solutions
We are hiring! Offer letter will be issued after payment of Rs 2000
onboarding/verification fee. 100% job guarantee, no interview required.
HR Contact: apexhr2024@gmail.com, 9988776655"""),

    ("certificate", """DEMO DATA - FOR TESTING ONLY
This is to certify that the candidate has completed the Data Analytics
Internship Program. Certificate ID: DA-2024-88231. Organization: NextGen
Analytics. Issued: 12/03/2024."""),

    ("freelance", """DEMO DATA - FOR TESTING ONLY
Freelance content writing project available! Client offers Rs 8000 for a
short project, but requires an advance registration fee of Rs 500 to
'activate' your freelancer account. UPI: freelanceclient@ybl."""),

    ("placement_job_fair", """DEMO DATA - FOR TESTING ONLY
Mega Placement Drive 2026! 50+ participating companies, guaranteed job
offers for all attendees. Registration fee Rs 299 payable at the gate or
via UPI: placementdrive@paytm. Limited seats, register immediately."""),
]


def run():
    db = SessionLocal()
    try:
        existing = db.query(models.Analysis).filter(models.Analysis.is_demo == True).count()
        if existing:
            print(f"Demo data already present ({existing} records). Skipping.")
            return

        for cat_hint, text in DEMO_SAMPLES:
            entities = extraction.extract_entities(text)
            category, confidence = category_util.detect_category(text, cat_hint)
            flags, positives = red_flag_engine.detect_red_flags(text, entities, category)
            payment_risk = build_payment_risk(entities)
            wv = {"status": "could_not_verify", "message": "Demo data - verification not run."}
            score, classification, breakdown = risk_engine.calculate_risk_score(flags, [], [], wv, positives)
            explanation = risk_engine.build_explanation(classification, flags, [], score)
            recommendations = risk_engine.build_recommendations(classification, entities)

            analysis = models.Analysis(
                session_id="demo",
                input_type="text",
                category=category,
                category_confidence=confidence,
                raw_text=text,
                extracted_entities=entities,
                red_flags=flags,
                positive_indicators=positives,
                payment_risk=payment_risk,
                web_verification={**wv, "risk_breakdown": breakdown},
                scam_pattern_matches=[],
                duplicate_matches=[],
                certificate_verification={},
                risk_score=score,
                classification=classification,
                explanation=explanation,
                recommendations=recommendations,
                is_demo=True,
            )
            db.add(analysis)

        # A couple of confirmed scam patterns for the admin/scam-pattern-match demo
        db.add(models.ScamPattern(
            pattern_type="upi", value="quickfake@ybl", category="part_time_job",
            risk_level="high", status="confirmed", report_count=7, source="admin",
            notes="DEMO DATA - repeatedly reported UPI ID in fake data-entry job ads.",
        ))
        db.add(models.ScamPattern(
            pattern_type="phone", value="9876543210", category="part_time_job",
            risk_level="high", status="confirmed", report_count=5, source="admin",
            notes="DEMO DATA - sample confirmed suspicious number.",
        ))

        db.commit()
        print(f"Seeded {len(DEMO_SAMPLES)} demo analyses and 2 demo scam patterns.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
