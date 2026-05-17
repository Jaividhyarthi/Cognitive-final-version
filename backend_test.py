import requests
import sys
from datetime import datetime
import json

class CognitiveMirrorAPITester:
    def __init__(self, base_url="https://cognitive-mirror-7.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.user_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, params=params)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")

            return success, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_seed_demo_data(self):
        """Seed demo data first"""
        success, response = self.run_test(
            "Seed Demo Data",
            "POST",
            "api/seed/demo",
            200
        )
        return success

    def test_login(self, email, password):
        """Test login and get token"""
        success, response = self.run_test(
            "Login",
            "POST",
            "api/auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response.get('user', {}).get('id')
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_register(self, user_data):
        """Test user registration"""
        success, response = self.run_test(
            "Register New User",
            "POST",
            "api/auth/register",
            200,
            data=user_data
        )
        return success, response

    def test_get_me(self):
        """Test get current user"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "api/auth/me",
            200
        )
        return success, response

    def test_dashboard_current_state(self):
        """Test get current dashboard state"""
        success, response = self.run_test(
            "Get Current State",
            "GET",
            "api/dashboard/current-state",
            200
        )
        return success, response

    def test_dashboard_history(self):
        """Test get dashboard history"""
        success, response = self.run_test(
            "Get Dashboard History",
            "GET",
            "api/dashboard/history",
            200,
            params={"days": 7}
        )
        return success, response

    def test_dashboard_prediction(self):
        """Test get prediction data"""
        success, response = self.run_test(
            "Get 24-Hour Prediction",
            "GET",
            "api/dashboard/prediction",
            200,
            params={"hours": 24}
        )
        return success, response

    def test_mood_report(self):
        """Test mood reporting"""
        success, response = self.run_test(
            "Report Mood",
            "POST",
            "api/mood/report",
            200,
            params={
                "mood_score": 4,
                "notes": "Feeling good today",
                "stressor_tags": ["academic", "social"]
            }
        )
        return success, response

    def test_get_alerts(self):
        """Test get alerts"""
        success, response = self.run_test(
            "Get Alerts",
            "GET",
            "api/alerts",
            200
        )
        return success, response

    def test_get_interventions(self):
        """Test get interventions"""
        success, response = self.run_test(
            "Get Interventions",
            "GET",
            "api/interventions",
            200
        )
        return success, response

    def test_music_playlists(self):
        """Test get music playlists"""
        success, response = self.run_test(
            "Get Music Playlists",
            "GET",
            "api/music/playlists",
            200
        )
        return success, response

    def test_ai_explain(self):
        """Test AI explanation (with fallback)"""
        success, response = self.run_test(
            "AI Explanation",
            "GET",
            "api/ai/explain",
            200,
            params={
                "metric": "stress_level",
                "value": 65.5,
                "contributing_factors": "Elevated HRV, Poor Sleep"
            }
        )
        return success, response

    def test_onboarding_complete(self):
        """Test onboarding completion"""
        baseline_data = {
            "stress_personality": {
                "response_type": "threshold",
                "recovery_speed": "fast",
                "coping_style": "problem-focused"
            },
            "sleep_baseline": {
                "chronotype": "morning",
                "typical_hours": 7.5,
                "variability": "low"
            },
            "social_baseline": {
                "type": "introvert",
                "stress_behavior": "withdraw",
                "social_media_pattern": "moderate"
            },
            "academic_relationship": {
                "identity_weight": "high",
                "grade_impact": "significant",
                "primary_stressor": "exams"
            },
            "treatment_preferences": {
                "music_receptivity": "high",
                "preferred_modality": "digital",
                "best_intervention": "breathing"
            },
            "emotional_awareness": {}
        }
        
        success, response = self.run_test(
            "Complete Onboarding",
            "POST",
            "api/onboarding/complete",
            200,
            data=baseline_data
        )
        return success, response

def main():
    print("🧠 Cognitive Mirror AI - Backend API Testing")
    print("=" * 50)
    
    # Setup
    tester = CognitiveMirrorAPITester()
    
    # Test 1: Seed demo data (should already be done but let's verify)
    print("\n📊 SEEDING DEMO DATA")
    tester.test_seed_demo_data()
    
    # Test 2: Login with demo student account
    print("\n🔐 AUTHENTICATION TESTS")
    if not tester.test_login("demo@student.com", "demo123"):
        print("❌ Login failed, stopping tests")
        return 1

    # Test 3: Get current user
    tester.test_get_me()

    # Test 4: Dashboard APIs
    print("\n📈 DASHBOARD TESTS")
    tester.test_dashboard_current_state()
    tester.test_dashboard_history()
    tester.test_dashboard_prediction()

    # Test 5: Mood and Interventions
    print("\n💭 MOOD & INTERVENTION TESTS")
    tester.test_mood_report()
    tester.test_get_alerts()
    tester.test_get_interventions()

    # Test 6: Music and AI
    print("\n🎵 MUSIC & AI TESTS")
    tester.test_music_playlists()
    tester.test_ai_explain()

    # Test 7: Test registration with new user
    print("\n👤 REGISTRATION TEST")
    test_user_data = {
        "name": f"Test User {datetime.now().strftime('%H%M%S')}",
        "email": f"test_{datetime.now().strftime('%H%M%S')}@test.com",
        "password": "testpass123",
        "university": "Test University",
        "student_id": "TEST123",
        "role": "student"
    }
    reg_success, reg_response = tester.test_register(test_user_data)
    
    if reg_success:
        # Login with new user and test onboarding
        if tester.test_login(test_user_data["email"], test_user_data["password"]):
            print("\n🎯 ONBOARDING TEST")
            tester.test_onboarding_complete()

    # Print results
    print(f"\n📊 FINAL RESULTS")
    print("=" * 50)
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"Success rate: {success_rate:.1f}%")
    
    if success_rate >= 80:
        print("✅ Backend APIs are working well!")
        return 0
    else:
        print("❌ Multiple backend issues detected")
        return 1

if __name__ == "__main__":
    sys.exit(main())