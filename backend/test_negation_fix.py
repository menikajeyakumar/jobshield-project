"""
JobShield - Negation-Aware Fee Detection Tests
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.utils import extraction, red_flags, risk_score
from app.utils.ml_predict import predict_fraud_probability, blend_scores

SEP = "=" * 65
failures = 0

def check(label, cond, detail=""):
    global failures
    status = "PASS" if cond else "FAIL"
    print(f"  [{status}] {label}")
    if not cond:
        failures += 1
        if detail:
            print(f"         Detail: {detail}")

# --- TEST A: Legit internship ---
print(SEP)
print("TEST A: Legitimate internship with 'no fee' statement")
TEXT_A = """Software Engineer Intern. Company: Acme Corp. Location: Bangalore.
Position: Python Intern. Stipend: Rs. 25,000 per month.
There is no registration fee, application fee, training fee, or payment required from candidates.
Apply at https://acmecorp.com/careers or email careers@acmecorp.com"""
e_a = extraction.extract_entities(TEXT_A)
flags_a, pos_a = red_flags.detect_red_flags(TEXT_A, e_a, "internship")
score_a, cls_a, _ = risk_score.calculate_risk_score(flags_a, [], [], {}, pos_a)
ml_a = predict_fraud_probability(TEXT_A)
blended_a = blend_scores(score_a, ml_a)
check("fee_keywords_found is empty", e_a["fee_keywords_found"] == [], f"found: {e_a['fee_keywords_found']}")
check("No fee_request red flag", not any(f["code"] == "fee_request" for f in flags_a))
check("no_upfront_payment_request positive present", any(p["code"] == "no_upfront_payment_request" for p in pos_a))
check("Blended score <= 30", blended_a <= 30, f"blended={blended_a}, cls={cls_a}")

# --- TEST B: Scam job ---
print()
print(SEP)
print("TEST B: Scam job demanding registration/payment fees")
TEXT_B = """Urgent Hiring! Work from Home! Pay Rs.1500 registration fee before joining.
Training fee Rs 999 required. 100% job guarantee, no interview required!
Send money via UPI: scamjob@paytm immediately. Limited seats only!"""
e_b = extraction.extract_entities(TEXT_B)
flags_b, pos_b = red_flags.detect_red_flags(TEXT_B, e_b, "part_time_job")
score_b, cls_b, _ = risk_score.calculate_risk_score(flags_b, [], [], {}, pos_b)
ml_b = predict_fraud_probability(TEXT_B)
blended_b = blend_scores(score_b, ml_b)
check("registration fee detected (scam)", "registration fee" in e_b["fee_keywords_found"], f"found: {e_b['fee_keywords_found']}")
check("fee_request red flag raised", any(f["code"] == "fee_request" for f in flags_b))
check("Blended score > 30 (suspicious/fake)", blended_b > 30, f"blended={blended_b}, cls={cls_b}")

# --- TEST C: Negation mid-text ---
print()
print(SEP)
print("TEST C: 'absolutely no training fee or security deposit'")
TEXT_C = """Company X Internship. There is absolutely no training fee or security deposit.
All work compensated. Stipend Rs 15000/month. hr@companyx.com"""
e_c = extraction.extract_entities(TEXT_C)
flags_c, _ = red_flags.detect_red_flags(TEXT_C, e_c, "internship")
check("No fee_keywords_found", e_c["fee_keywords_found"] == [], f"found: {e_c['fee_keywords_found']}")
check("No fee_request flag", not any(f["code"] == "fee_request" for f in flags_c))

# --- TEST D: Mixed ---
print()
print(SEP)
print("TEST D: Mixed - negated fee + real fee coexist")
TEXT_D = """We do NOT charge any application fee. However, you must pay a refundable deposit of Rs. 999.
Registration fee Rs 500 required before onboarding."""
e_d = extraction.extract_entities(TEXT_D)
check("application fee NOT detected (negated)", "application fee" not in e_d["fee_keywords_found"], f"found: {e_d['fee_keywords_found']}")
check("refundable deposit IS detected (real)", "refundable deposit" in e_d["fee_keywords_found"], f"found: {e_d['fee_keywords_found']}")
check("registration fee IS detected (real)", "registration fee" in e_d["fee_keywords_found"], f"found: {e_d['fee_keywords_found']}")

# --- TEST E: Exact bug report phrase ---
print()
print(SEP)
print("TEST E: Exact phrase from bug report")
TEXT_E = "There is no registration fee, application fee, training fee, or payment required from candidates."
e_e = extraction.extract_entities(TEXT_E)
flags_e, _ = red_flags.detect_red_flags(TEXT_E, e_e, "internship")
check("fee_keywords_found is empty (bug-report)", e_e["fee_keywords_found"] == [], f"found: {e_e['fee_keywords_found']}")
check("No fee_request flag (bug-report)", not any(f["code"] == "fee_request" for f in flags_e))

# --- Summary ---
print()
print(SEP)
if __name__ == "__main__":
    sys.exit(1 if failures else 0)
