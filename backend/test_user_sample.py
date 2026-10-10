import sys, os
sys.path.insert(0, '.')
from app.utils import extraction, red_flags, risk_score
from app.utils.ml_predict import predict_fraud_probability, blend_scores

SEP = '=' * 65

# ---- EXACT USER SAMPLE ----
TEXT = '''ABC Technologies is hiring a Software Engineer.
Candidates can apply through the official company careers website.
There is no registration fee, application fee, training fee, security deposit, or payment required at any stage of recruitment.
The company will contact shortlisted candidates through the official email address.'''

entities = extraction.extract_entities(TEXT)
flags, pos = red_flags.detect_red_flags(TEXT, entities, 'recruitment')
score, cls, bd = risk_score.calculate_risk_score(flags, [], [], {}, pos)
ml_prob = predict_fraud_probability(TEXT)
blended = blend_scores(score, ml_prob)

print(SEP)
print('EXACT USER SAMPLE - Legitimate job with no-fee statement')
print(SEP)
print('fee_keywords_found:', entities['fee_keywords_found'])
print('RED FLAGS:', [(f['code'], f['label']) for f in flags])
print('POSITIVES:', [p['code'] for p in pos])
print('Rule score:', score)
print('ML prob:', round(ml_prob or 0, 4))
print('Blended score:', blended)
print('Classification:', cls)

has_fee_flag = any(f['code'] == 'fee_request' for f in flags)
print()
if has_fee_flag:
    print('** FAIL ** fee_request flag still present!')
    sys.exit(1)
elif blended > 30:
    print('** FAIL ** blended score still > 30:', blended)
    sys.exit(1)
else:
    print('PASS - No fee_request flag, score', blended, '<=30, classification:', cls)

# ---- SCAM SAMPLE ----
print()
print(SEP)
print('SCAM SAMPLE - Real payment demand')
print(SEP)
TEXT2 = '''Urgent! Pay Rs 1500 registration fee before joining.
Training fee Rs 999 required. 100% job guarantee!
Send money via UPI: scamjob@paytm. Limited seats!'''

e2 = extraction.extract_entities(TEXT2)
f2, p2 = red_flags.detect_red_flags(TEXT2, e2, 'part_time_job')
s2, c2, _ = risk_score.calculate_risk_score(f2, [], [], {}, p2)
ml2 = predict_fraud_probability(TEXT2)
b2 = blend_scores(s2, ml2)

print('fee_keywords_found:', e2['fee_keywords_found'])
print('RED FLAGS:', [(f['code'], f['label']) for f in f2])
print('Blended score:', b2, 'Classification:', c2)
has_fee2 = any(f['code'] == 'fee_request' for f in f2)
if not has_fee2:
    print('** FAIL ** scam not detected!')
    sys.exit(1)
else:
    print('PASS - Scam correctly detected')

# ---- MIXED SAMPLE ----
print()
print(SEP)
print('MIXED SAMPLE - negated + real fee')
print(SEP)
TEXT3 = '''There is no registration fee, but selected candidates must pay Rs 2000 as a security deposit before joining.'''

e3 = extraction.extract_entities(TEXT3)
f3, p3 = red_flags.detect_red_flags(TEXT3, e3, 'recruitment')
print('fee_keywords_found:', e3['fee_keywords_found'])
has_reg = 'registration fee' in e3['fee_keywords_found']
has_sec = 'security deposit' in e3['fee_keywords_found']
print('registration fee in list (should be NO):', has_reg)
print('security deposit in list (should be YES):', has_sec)
if has_reg:
    print('** FAIL ** registration fee should be negated')
    sys.exit(1)
if not has_sec:
    print('** FAIL ** security deposit should be detected as real demand')
    sys.exit(1)
print('PASS - Mixed case handled correctly')

print()
print(SEP)
print('ALL TESTS PASSED')
print(SEP)
