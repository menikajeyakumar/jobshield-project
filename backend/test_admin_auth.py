import unittest
from app.routers.admin import admin_login, admin_stats
from app.schemas import AdminLoginRequest
from app.utils.auth import create_access_token, decode_token, require_role, get_current_user
from app.config import settings
from app.database import SessionLocal
from fastapi import HTTPException

class TestAdminAuth(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_case_a_correct_credentials(self):
        req = AdminLoginRequest(username=settings.admin_username, password=settings.admin_password)
        res = admin_login(req, self.db)
        self.assertIn("access_token", res)
        token = res["access_token"]
        payload = decode_token(token)
        self.assertEqual(payload.get("role"), "admin")
        self.assertEqual(payload.get("sub"), settings.admin_username)
        
        admin_user = get_current_user(token=token, db=self.db)
        self.assertEqual(admin_user.role, "admin")
        
        stats = admin_stats(db=self.db, admin=admin_user)
        self.assertIn("total_analyses", stats)
        print("\n[PASS] Case A: Correct admin credentials -> token with role='admin' generated & admin stats unlocked")

    def test_case_b_wrong_password(self):
        req = AdminLoginRequest(username=settings.admin_username, password="wrong_password_123")
        with self.assertRaises(HTTPException) as ctx:
            admin_login(req, self.db)
        self.assertEqual(ctx.exception.status_code, 401)
        print("[PASS] Case B: Wrong admin password -> 401 Unauthorized exception raised")

    def test_case_c_normal_user_access(self):
        user_token = create_access_token(subject="user_test_123", role="user")
        payload = decode_token(user_token)
        self.assertEqual(payload.get("role"), "user")
        
        # require_role("admin") must throw 403 when user is not admin
        checker = require_role("admin")
        class FakeUser:
            role = "user"
        with self.assertRaises(HTTPException) as ctx:
            checker(user=FakeUser())
        self.assertEqual(ctx.exception.status_code, 403)
        print("[PASS] Case C: Normal user role attempting admin check -> 403 Forbidden")

    def test_case_d_session_refresh(self):
        token = create_access_token(subject=settings.admin_username, role="admin")
        user1 = get_current_user(token=token, db=self.db)
        self.assertEqual(user1.role, "admin")
        
        # Second invocation simulating page refresh
        user2 = get_current_user(token=token, db=self.db)
        self.assertEqual(user2.role, "admin")
        print("[PASS] Case D: Admin session remains valid on page refresh / subsequent requests")

if __name__ == "__main__":
    unittest.main()
