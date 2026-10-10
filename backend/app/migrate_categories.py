from app.database import SessionLocal
from app.models import Analysis

def migrate_legacy_categories():
    db = SessionLocal()
    try:
        updated = db.query(Analysis).filter(
            (Analysis.category == 'part_time_job') & (Analysis.category_confidence <= 0.2)
        ).update(
            {Analysis.category: 'unclassified', Analysis.category_confidence: 0.0},
            synchronize_session=False
        )
        db.commit()
        print(f"[Migration] Successfully updated {updated} legacy fallback records to 'unclassified'.")
    except Exception as e:
        db.rollback()
        print(f"[Migration Error] {e}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate_legacy_categories()
