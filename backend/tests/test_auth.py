import unittest
from app.core.security import verify_password, get_password_hash, create_access_token, decode_access_token
from app.domains.auth.service import AuthService

class TestAuthService(unittest.TestCase):

    def setUp(self):
        self.auth_service = AuthService()

    def test_password_hashing(self):
        hashed = get_password_hash("secret123")
        self.assertTrue(verify_password("secret123", hashed))
        self.assertFalse(verify_password("wrongpassword", hashed))

    def test_authenticate_operator(self):
        user = self.auth_service.authenticate_user("operator", "operator123")
        self.assertIsNotNone(user)
        self.assertEqual(user.username, "operator")
        self.assertEqual(user.role, "Plant Operator")

    def test_authenticate_engineer(self):
        user = self.auth_service.authenticate_user("engineer", "engineer123")
        self.assertIsNotNone(user)
        self.assertEqual(user.username, "engineer")
        self.assertEqual(user.role, "Process Engineer")

    def test_authenticate_invalid_credentials(self):
        user = self.auth_service.authenticate_user("operator", "wrongpass")
        self.assertIsNone(user)
        user_invalid = self.auth_service.authenticate_user("nonexistent", "operator123")
        self.assertIsNone(user_invalid)

    def test_jwt_token_generation_and_decoding(self):
        token = create_access_token(data={"sub": "engineer", "role": "Process Engineer"})
        self.assertIsInstance(token, str)
        payload = decode_access_token(token)
        self.assertIsNotNone(payload)
        self.assertEqual(payload.get("sub"), "engineer")
        self.assertEqual(payload.get("role"), "Process Engineer")

if __name__ == "__main__":
    unittest.main()
