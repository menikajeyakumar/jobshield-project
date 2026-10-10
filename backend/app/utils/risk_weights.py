# Central configuration for hybrid risk scoring weights
# All weights sum to 100. Adjust as needed without code changes.
DEFAULT_WEIGHTS = {
    "ml": 30,
    "red_flags": 20,
    "payment": 15,
    "website": 10,
    "company": 10,
    "duplicate": 5,
    "scam_db": 5,
    "qr_upi": 5,
}

def get_weights():
    """Return the current weights dictionary.
    In a real system this could load from environment variables or a JSON config file.
    For now it simply returns the defaults.
    """
    return DEFAULT_WEIGHTS
