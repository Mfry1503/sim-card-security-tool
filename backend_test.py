import requests
import sys
import json
from datetime import datetime

class SimGuardAPITester:
    def __init__(self, base_url="https://ic-analyst.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_card_id = None
        self.test_contact_id = None
        self.test_sms_id = None
        self.test_clone_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.text[:200]}...")
                except:
                    pass

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

        return success, {}

    def test_health_check(self):
        """Test basic health endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_readers(self):
        """Test PC/SC readers endpoint"""
        success, response = self.run_test("Get Readers", "GET", "readers", 200)
        if success and isinstance(response, list) and len(response) > 0:
            print(f"   Found {len(response)} readers")
            return True
        return success

    def test_reader_connect(self):
        """Test connecting to a reader"""
        return self.run_test("Connect Reader", "POST", "readers/reader-001/connect", 200)

    def test_card_read(self):
        """Test reading a card"""
        success, response = self.run_test(
            "Read Card", 
            "POST", 
            "cards/read?reader_id=reader-001", 
            200
        )
        if success and "id" in response:
            self.test_card_id = response["id"]
            print(f"   Card ID: {self.test_card_id}")
        return success

    def test_get_cards(self):
        """Test getting all cards"""
        success, response = self.run_test("Get Cards", "GET", "cards", 200)
        if success and isinstance(response, list):
            print(f"   Found {len(response)} cards")
        return success

    def test_get_card_detail(self):
        """Test getting specific card details"""
        if not self.test_card_id:
            print("⚠️  Skipping card detail test - no card ID available")
            return True
        return self.run_test("Get Card Detail", "GET", f"cards/{self.test_card_id}", 200)

    def test_create_contact(self):
        """Test creating a contact"""
        if not self.test_card_id:
            print("⚠️  Skipping contact creation - no card ID available")
            return True
            
        contact_data = {
            "card_id": self.test_card_id,
            "name": "Test Contact",
            "number": "+15551234567",
            "group": "Test",
            "email": "test@example.com"
        }
        success, response = self.run_test("Create Contact", "POST", "contacts", 200, contact_data)
        if success and "id" in response:
            self.test_contact_id = response["id"]
            print(f"   Contact ID: {self.test_contact_id}")
        return success

    def test_get_contacts(self):
        """Test getting contacts"""
        params = {"card_id": self.test_card_id} if self.test_card_id else {}
        success, response = self.run_test("Get Contacts", "GET", "contacts", 200, params=params)
        if success and isinstance(response, list):
            print(f"   Found {len(response)} contacts")
        return success

    def test_update_contact(self):
        """Test updating a contact"""
        if not self.test_contact_id:
            print("⚠️  Skipping contact update - no contact ID available")
            return True
            
        update_data = {"name": "Updated Test Contact"}
        return self.run_test("Update Contact", "PUT", f"contacts/{self.test_contact_id}", 200, update_data)

    def test_create_sms(self):
        """Test creating an SMS"""
        if not self.test_card_id:
            print("⚠️  Skipping SMS creation - no card ID available")
            return True
            
        sms_data = {
            "card_id": self.test_card_id,
            "sender": "+15551234567",
            "recipient": "+15559876543",
            "message": "Test SMS message",
            "status": "draft"
        }
        success, response = self.run_test("Create SMS", "POST", "sms", 200, sms_data)
        if success and "id" in response:
            self.test_sms_id = response["id"]
            print(f"   SMS ID: {self.test_sms_id}")
        return success

    def test_get_sms(self):
        """Test getting SMS messages"""
        params = {"card_id": self.test_card_id} if self.test_card_id else {}
        success, response = self.run_test("Get SMS", "GET", "sms", 200, params=params)
        if success and isinstance(response, list):
            print(f"   Found {len(response)} SMS messages")
        return success

    def test_clone_card(self):
        """Test cloning a card"""
        if not self.test_card_id:
            print("⚠️  Skipping card clone - no card ID available")
            return True
            
        clone_data = {
            "source_card_id": self.test_card_id,
            "clone_contacts": True,
            "clone_sms": True,
            "clone_settings": True
        }
        success, response = self.run_test("Clone Card", "POST", "clone", 200, clone_data)
        if success and "cloned_card_id" in response:
            self.test_clone_id = response["cloned_card_id"]
            print(f"   Cloned Card ID: {self.test_clone_id}")
        return success

    def test_security_analysis(self):
        """Test security analysis"""
        if not self.test_card_id:
            print("⚠️  Skipping security analysis - no card ID available")
            return True
        return self.run_test("Security Analysis", "POST", f"analyze/{self.test_card_id}", 201)

    def test_esim_convert(self):
        """Test eSIM conversion"""
        if not self.test_card_id:
            print("⚠️  Skipping eSIM conversion - no card ID available")
            return True
            
        esim_data = {
            "card_id": self.test_card_id,
            "profile_name": "Test eSIM",
            "carrier": "test-carrier"
        }
        return self.run_test("eSIM Convert", "POST", "esim/convert", 201, esim_data)

    def test_export_json(self):
        """Test JSON export"""
        if not self.test_card_id:
            print("⚠️  Skipping JSON export - no card ID available")
            return True
        return self.run_test("Export JSON", "GET", f"export/{self.test_card_id}", 200, params={"format": "json"})

    def test_export_csv(self):
        """Test CSV export"""
        if not self.test_card_id:
            print("⚠️  Skipping CSV export - no card ID available")
            return True
        return self.run_test("Export CSV", "GET", f"export/{self.test_card_id}", 200, params={"format": "csv"})

    def test_import_data(self):
        """Test data import"""
        if not self.test_card_id:
            print("⚠️  Skipping data import - no card ID available")
            return True
            
        import_data = {
            "card_id": self.test_card_id,
            "data": {
                "contacts": [
                    {"name": "Import Test", "number": "+15551111111"}
                ]
            },
            "data_type": "contacts"
        }
        return self.run_test("Import Data", "POST", "import", 200, import_data)

    def test_activity_logs(self):
        """Test activity logs"""
        return self.run_test("Get Activity Logs", "GET", "activity", 200, params={"limit": 10})

    def test_delete_contact(self):
        """Test deleting a contact"""
        if not self.test_contact_id:
            print("⚠️  Skipping contact deletion - no contact ID available")
            return True
        return self.run_test("Delete Contact", "DELETE", f"contacts/{self.test_contact_id}", 200)

    def test_delete_sms(self):
        """Test deleting an SMS"""
        if not self.test_sms_id:
            print("⚠️  Skipping SMS deletion - no SMS ID available")
            return True
        return self.run_test("Delete SMS", "DELETE", f"sms/{self.test_sms_id}", 200)

    def test_delete_card(self):
        """Test deleting a card"""
        if not self.test_card_id:
            print("⚠️  Skipping card deletion - no card ID available")
            return True
        # Delete cloned card first if it exists
        if self.test_clone_id:
            self.run_test("Delete Cloned Card", "DELETE", f"cards/{self.test_clone_id}", 200)
        return self.run_test("Delete Card", "DELETE", f"cards/{self.test_card_id}", 200)

def main():
    print("🚀 Starting SimGuard Pro API Tests")
    print("=" * 50)
    
    tester = SimGuardAPITester()

    # Core API tests in logical order
    test_sequence = [
        ("Health Check", tester.test_health_check),
        ("PC/SC Readers", tester.test_readers),
        ("Reader Connect", tester.test_reader_connect),
        ("Card Read", tester.test_card_read),
        ("Get Cards", tester.test_get_cards),
        ("Get Card Detail", tester.test_get_card_detail),
        ("Create Contact", tester.test_create_contact),
        ("Get Contacts", tester.test_get_contacts),
        ("Update Contact", tester.test_update_contact),
        ("Create SMS", tester.test_create_sms),
        ("Get SMS", tester.test_get_sms),
        ("Clone Card", tester.test_clone_card),
        ("Security Analysis", tester.test_security_analysis),
        ("eSIM Convert", tester.test_esim_convert),
        ("Export JSON", tester.test_export_json),
        ("Export CSV", tester.test_export_csv),
        ("Import Data", tester.test_import_data),
        ("Activity Logs", tester.test_activity_logs),
        ("Delete Contact", tester.test_delete_contact),
        ("Delete SMS", tester.test_delete_sms),
        ("Delete Card", tester.test_delete_card),
    ]

    # Run all tests
    for test_name, test_func in test_sequence:
        try:
            test_func()
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")

    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())