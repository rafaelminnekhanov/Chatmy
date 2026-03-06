#!/usr/bin/env python3
"""
Comprehensive Backend Testing for My Chat Messenger
Tests all backend APIs including WebSocket endpoint
"""

import requests
import json
import sys
import threading
import time
from datetime import datetime

# Try to import websocket for WebSocket testing
try:
    import websocket
    WEBSOCKET_AVAILABLE = True
except ImportError:
    WEBSOCKET_AVAILABLE = False
    print("⚠️  WebSocket client not available - WebSocket tests will be skipped")

# Get backend URL from environment
BACKEND_URL = "https://chat-minimal-1.preview.emergentagent.com/api"
WS_URL = "wss://private-messenger-136.preview.emergentagent.com/ws"

# Global test results
test_results = []
created_users = []
created_chats = []
created_messages = []

def log_test(name, success, details=""):
    """Log test result"""
    status = "✅ PASS" if success else "❌ FAIL"
    result = {
        "test": name,
        "status": status,
        "success": success,
        "details": details,
        "timestamp": datetime.now().isoformat()
    }
    test_results.append(result)
    print(f"{status} {name}")
    if details and not success:
        print(f"    Details: {details}")

def test_user_registration():
    """Test 1: User Registration API - POST /api/register"""
    print("\n=== Testing User Registration API ===")
    
    # Test 1a: Create first user
    user1_data = {
        "name": "Alice Johnson", 
        "email": "alice.johnson@example.com"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/register", json=user1_data, timeout=10)
        if response.status_code == 200:
            user1 = response.json()
            if user1.get('id') and user1.get('name') == user1_data['name']:
                created_users.append(user1)
                log_test("Register User 1 (Alice)", True, f"User ID: {user1['id']}")
            else:
                log_test("Register User 1 (Alice)", False, f"Invalid response structure: {user1}")
        else:
            log_test("Register User 1 (Alice)", False, f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        log_test("Register User 1 (Alice)", False, f"Request failed: {str(e)}")
    
    # Test 1b: Create second user
    user2_data = {
        "name": "Bob Smith", 
        "email": "bob.smith@example.com"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/register", json=user2_data, timeout=10)
        if response.status_code == 200:
            user2 = response.json()
            if user2.get('id') and user2.get('name') == user2_data['name']:
                created_users.append(user2)
                log_test("Register User 2 (Bob)", True, f"User ID: {user2['id']}")
            else:
                log_test("Register User 2 (Bob)", False, f"Invalid response structure: {user2}")
        else:
            log_test("Register User 2 (Bob)", False, f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        log_test("Register User 2 (Bob)", False, f"Request failed: {str(e)}")
    
    # Test 1c: Create third user
    user3_data = {
        "name": "Charlie Davis", 
        "email": "charlie.davis@example.com"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/register", json=user3_data, timeout=10)
        if response.status_code == 200:
            user3 = response.json()
            if user3.get('id') and user3.get('name') == user3_data['name']:
                created_users.append(user3)
                log_test("Register User 3 (Charlie)", True, f"User ID: {user3['id']}")
            else:
                log_test("Register User 3 (Charlie)", False, f"Invalid response structure: {user3}")
        else:
            log_test("Register User 3 (Charlie)", False, f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        log_test("Register User 3 (Charlie)", False, f"Request failed: {str(e)}")
    
    # Test 1d: Duplicate registration (should return existing user)
    try:
        response = requests.post(f"{BACKEND_URL}/register", json=user1_data, timeout=10)
        if response.status_code == 200:
            duplicate_user = response.json()
            if duplicate_user.get('id') == created_users[0]['id']:
                log_test("Duplicate Registration Handling", True, "Returns existing user correctly")
            else:
                log_test("Duplicate Registration Handling", False, f"Created new user instead of returning existing")
        else:
            log_test("Duplicate Registration Handling", False, f"Status: {response.status_code}")
    except Exception as e:
        log_test("Duplicate Registration Handling", False, f"Request failed: {str(e)}")

def test_get_all_users():
    """Test 2: Get All Users API - GET /api/users"""
    print("\n=== Testing Get All Users API ===")
    
    try:
        response = requests.get(f"{BACKEND_URL}/users", timeout=10)
        if response.status_code == 200:
            users = response.json()
            if isinstance(users, list) and len(users) >= 3:
                # Check if our created users are in the list
                user_ids = [user.get('id') for user in users]
                created_user_ids = [user['id'] for user in created_users]
                
                if all(uid in user_ids for uid in created_user_ids):
                    log_test("Get All Users", True, f"Found {len(users)} users including all created users")
                else:
                    log_test("Get All Users", False, "Missing some created users in response")
            else:
                log_test("Get All Users", False, f"Expected list with >=3 users, got: {type(users)} with {len(users) if isinstance(users, list) else 'N/A'} items")
        else:
            log_test("Get All Users", False, f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        log_test("Get All Users", False, f"Request failed: {str(e)}")

def test_create_private_chat():
    """Test 3: Create Private Chat API - POST /api/chats"""
    print("\n=== Testing Create Private Chat API ===")
    
    if len(created_users) < 2:
        log_test("Create Private Chat", False, "Not enough users created for testing")
        return
    
    alice = created_users[0]
    bob = created_users[1]
    
    # Test 3a: Create private chat between Alice and Bob
    chat_data = {
        "participant_id": bob['id'],
        "is_group": False
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/chats?current_user_id={alice['id']}", 
                               json=chat_data, timeout=10)
        if response.status_code == 200:
            chat = response.json()
            if (chat.get('id') and chat.get('is_group') == False and 
                len(chat.get('participants', [])) == 2):
                created_chats.append(chat)
                log_test("Create Private Chat (Alice-Bob)", True, f"Chat ID: {chat['id']}")
            else:
                log_test("Create Private Chat (Alice-Bob)", False, f"Invalid response structure: {chat}")
        else:
            log_test("Create Private Chat (Alice-Bob)", False, f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        log_test("Create Private Chat (Alice-Bob)", False, f"Request failed: {str(e)}")
    
    # Test 3b: Test duplicate chat prevention
    try:
        response = requests.post(f"{BACKEND_URL}/chats?current_user_id={alice['id']}", 
                               json=chat_data, timeout=10)
        if response.status_code == 200:
            duplicate_chat = response.json()
            if duplicate_chat.get('id') == created_chats[0]['id']:
                log_test("Duplicate Chat Prevention", True, "Returns existing chat correctly")
            else:
                log_test("Duplicate Chat Prevention", False, "Created new chat instead of returning existing")
        else:
            log_test("Duplicate Chat Prevention", False, f"Status: {response.status_code}")
    except Exception as e:
        log_test("Duplicate Chat Prevention", False, f"Request failed: {str(e)}")

def test_create_group_chat():
    """Test 4: Create Group Chat API - POST /api/chats/group"""
    print("\n=== Testing Create Group Chat API ===")
    
    if len(created_users) < 3:
        log_test("Create Group Chat", False, "Not enough users created for testing")
        return
    
    alice = created_users[0]
    bob = created_users[1]
    charlie = created_users[2]
    
    # Create group chat with Alice, Bob, and Charlie
    group_data = {
        "name": "Team Chat",
        "participant_ids": [bob['id'], charlie['id']]  # Alice will be added automatically as current_user
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/chats/group?current_user_id={alice['id']}", 
                               json=group_data, timeout=10)
        if response.status_code == 200:
            group_chat = response.json()
            if (group_chat.get('id') and group_chat.get('is_group') == True and 
                group_chat.get('name') == "Team Chat" and 
                len(group_chat.get('participants', [])) == 3):
                created_chats.append(group_chat)
                log_test("Create Group Chat", True, f"Group Chat ID: {group_chat['id']}")
            else:
                log_test("Create Group Chat", False, f"Invalid response structure: {group_chat}")
        else:
            log_test("Create Group Chat", False, f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        log_test("Create Group Chat", False, f"Request failed: {str(e)}")

def test_get_user_chats():
    """Test 5: Get User Chats API - GET /api/chats?user_id=X"""
    print("\n=== Testing Get User Chats API ===")
    
    if not created_users:
        log_test("Get User Chats", False, "No users created for testing")
        return
    
    alice = created_users[0]
    
    try:
        response = requests.get(f"{BACKEND_URL}/chats?user_id={alice['id']}", timeout=10)
        if response.status_code == 200:
            chats = response.json()
            if isinstance(chats, list):
                expected_count = len(created_chats)
                if len(chats) >= expected_count:
                    log_test("Get User Chats", True, f"Found {len(chats)} chats for Alice")
                else:
                    log_test("Get User Chats", False, f"Expected at least {expected_count} chats, got {len(chats)}")
            else:
                log_test("Get User Chats", False, f"Expected list, got: {type(chats)}")
        else:
            log_test("Get User Chats", False, f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        log_test("Get User Chats", False, f"Request failed: {str(e)}")

def test_send_message():
    """Test 6: Send Message API - POST /api/messages?sender_id=X"""
    print("\n=== Testing Send Message API ===")
    
    if not created_chats or not created_users:
        log_test("Send Message", False, "No chats or users created for testing")
        return
    
    alice = created_users[0]
    private_chat = created_chats[0]  # Alice-Bob private chat
    
    # Test 6a: Send message in private chat
    message_data = {
        "chat_id": private_chat['id'],
        "text": "Hello Bob! This is Alice testing the messaging system."
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/messages?sender_id={alice['id']}", 
                               json=message_data, timeout=10)
        if response.status_code == 200:
            message = response.json()
            if (message.get('id') and message.get('text') == message_data['text'] and 
                message.get('sender_id') == alice['id']):
                created_messages.append(message)
                log_test("Send Message (Private Chat)", True, f"Message ID: {message['id']}")
            else:
                log_test("Send Message (Private Chat)", False, f"Invalid response structure: {message}")
        else:
            log_test("Send Message (Private Chat)", False, f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        log_test("Send Message (Private Chat)", False, f"Request failed: {str(e)}")
    
    # Test 6b: Send message in group chat (if available)
    if len(created_chats) > 1:
        group_chat = created_chats[1]  # Team Chat group
        group_message_data = {
            "chat_id": group_chat['id'],
            "text": "Hello team! Group message from Alice."
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/messages?sender_id={alice['id']}", 
                                   json=group_message_data, timeout=10)
            if response.status_code == 200:
                group_message = response.json()
                if (group_message.get('id') and 
                    group_message.get('text') == group_message_data['text']):
                    created_messages.append(group_message)
                    log_test("Send Message (Group Chat)", True, f"Group Message ID: {group_message['id']}")
                else:
                    log_test("Send Message (Group Chat)", False, f"Invalid response structure: {group_message}")
            else:
                log_test("Send Message (Group Chat)", False, f"Status: {response.status_code}, Body: {response.text}")
        except Exception as e:
            log_test("Send Message (Group Chat)", False, f"Request failed: {str(e)}")
    
    # Test 6c: Send message from Bob to Alice
    if len(created_users) > 1:
        bob = created_users[1]
        bob_message_data = {
            "chat_id": private_chat['id'],
            "text": "Hi Alice! This is Bob replying back."
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/messages?sender_id={bob['id']}", 
                                   json=bob_message_data, timeout=10)
            if response.status_code == 200:
                bob_message = response.json()
                if bob_message.get('id') and bob_message.get('sender_id') == bob['id']:
                    created_messages.append(bob_message)
                    log_test("Send Message (Bob Reply)", True, f"Bob's Message ID: {bob_message['id']}")
                else:
                    log_test("Send Message (Bob Reply)", False, f"Invalid response structure")
            else:
                log_test("Send Message (Bob Reply)", False, f"Status: {response.status_code}")
        except Exception as e:
            log_test("Send Message (Bob Reply)", False, f"Request failed: {str(e)}")

def test_get_chat_messages():
    """Test 7: Get Chat Messages API - GET /api/chats/{chat_id}/messages"""
    print("\n=== Testing Get Chat Messages API ===")
    
    if not created_chats:
        log_test("Get Chat Messages", False, "No chats created for testing")
        return
    
    private_chat = created_chats[0]
    
    try:
        response = requests.get(f"{BACKEND_URL}/chats/{private_chat['id']}/messages", timeout=10)
        if response.status_code == 200:
            messages = response.json()
            if isinstance(messages, list):
                expected_count = len([msg for msg in created_messages if msg.get('chat_id') == private_chat['id']])
                if len(messages) >= expected_count:
                    log_test("Get Chat Messages", True, f"Retrieved {len(messages)} messages from private chat")
                else:
                    log_test("Get Chat Messages", False, f"Expected at least {expected_count} messages, got {len(messages)}")
            else:
                log_test("Get Chat Messages", False, f"Expected list, got: {type(messages)}")
        else:
            log_test("Get Chat Messages", False, f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        log_test("Get Chat Messages", False, f"Request failed: {str(e)}")

def test_mark_message_read():
    """Test 8: Mark Message as Read - PUT /api/messages/{message_id}/read?user_id=X"""
    print("\n=== Testing Mark Message as Read API ===")
    
    if not created_messages or not created_users:
        log_test("Mark Message Read", False, "No messages or users created for testing")
        return
    
    message = created_messages[0]
    bob = created_users[1] if len(created_users) > 1 else created_users[0]
    
    try:
        response = requests.put(f"{BACKEND_URL}/messages/{message['id']}/read?user_id={bob['id']}", timeout=10)
        if response.status_code == 200:
            result = response.json()
            if result.get('success') == True:
                log_test("Mark Message Read", True, f"Message {message['id']} marked as read")
            else:
                log_test("Mark Message Read", False, f"Unexpected response: {result}")
        else:
            log_test("Mark Message Read", False, f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        log_test("Mark Message Read", False, f"Request failed: {str(e)}")

def test_participant_verification():
    """Test 9: Verify participant restrictions"""
    print("\n=== Testing Participant Verification ===")
    
    if len(created_users) < 3 or not created_chats:
        log_test("Participant Verification", False, "Not enough data for testing")
        return
    
    charlie = created_users[2]  # Charlie should not be in Alice-Bob private chat
    private_chat = created_chats[0]
    
    # Try to send message as Charlie in Alice-Bob chat
    unauthorized_message = {
        "chat_id": private_chat['id'],
        "text": "This should fail - Charlie trying to message in Alice-Bob chat"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/messages?sender_id={charlie['id']}", 
                               json=unauthorized_message, timeout=10)
        if response.status_code == 403:
            log_test("Participant Verification", True, "Correctly blocked unauthorized participant")
        elif response.status_code == 400:
            log_test("Participant Verification", True, "Blocked with 400 error (acceptable)")
        else:
            log_test("Participant Verification", False, f"Expected 403, got {response.status_code}")
    except Exception as e:
        log_test("Participant Verification", False, f"Request failed: {str(e)}")

def test_websocket_connection():
    """Test 10: WebSocket endpoint - WS /ws/{user_id}"""
    print("\n=== Testing WebSocket Connection ===")
    
    if not WEBSOCKET_AVAILABLE:
        log_test("WebSocket Connection", False, "WebSocket client library not available - skipped")
        return
    
    if not created_users:
        log_test("WebSocket Connection", False, "No users created for testing")
        return
    
    alice = created_users[0]
    ws_connected = False
    connection_error = None
    
    def on_open(ws):
        nonlocal ws_connected
        ws_connected = True
        print(f"WebSocket connected for user {alice['id']}")
    
    def on_error(ws, error):
        nonlocal connection_error
        connection_error = str(error)
        print(f"WebSocket error: {error}")
    
    def on_close(ws, close_status_code, close_msg):
        print(f"WebSocket closed: {close_status_code} - {close_msg}")
    
    try:
        ws = websocket.WebSocketApp(
            f"{WS_URL}/{alice['id']}",
            on_open=on_open,
            on_error=on_error,
            on_close=on_close
        )
        
        # Run WebSocket in a separate thread
        ws_thread = threading.Thread(target=ws.run_forever)
        ws_thread.daemon = True
        ws_thread.start()
        
        # Wait for connection
        time.sleep(3)
        
        if ws_connected:
            log_test("WebSocket Connection", True, f"Successfully connected WebSocket for user {alice['id']}")
            ws.close()
        else:
            error_msg = connection_error or "Connection timeout"
            log_test("WebSocket Connection", False, f"Failed to connect: {error_msg}")
    
    except Exception as e:
        log_test("WebSocket Connection", False, f"WebSocket test failed: {str(e)}")

def print_test_summary():
    """Print comprehensive test summary"""
    print("\n" + "="*80)
    print("COMPREHENSIVE TEST RESULTS SUMMARY")
    print("="*80)
    
    total_tests = len(test_results)
    passed_tests = sum(1 for result in test_results if result['success'])
    failed_tests = total_tests - passed_tests
    
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {failed_tests}")
    print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
    
    print("\n📋 DETAILED RESULTS:")
    print("-" * 60)
    
    for result in test_results:
        status_icon = "✅" if result['success'] else "❌"
        print(f"{status_icon} {result['test']}")
        if not result['success'] and result['details']:
            print(f"    └─ {result['details']}")
    
    print("\n🔧 CRITICAL ISSUES FOUND:")
    print("-" * 30)
    
    critical_failures = [r for r in test_results if not r['success']]
    if critical_failures:
        for failure in critical_failures:
            print(f"❌ {failure['test']}")
            if failure['details']:
                print(f"    Problem: {failure['details']}")
    else:
        print("✅ No critical issues found - All tests passed!")
    
    print("\n📊 CREATED TEST DATA:")
    print(f"    • Users: {len(created_users)}")
    print(f"    • Chats: {len(created_chats)}")
    print(f"    • Messages: {len(created_messages)}")
    
    return failed_tests == 0

def main():
    """Run all backend tests"""
    print("🚀 STARTING COMPREHENSIVE MY CHAT BACKEND TESTING")
    print("="*80)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"WebSocket URL: {WS_URL}")
    print("="*80)
    
    # Run all tests in sequence
    test_user_registration()
    test_get_all_users()
    test_create_private_chat()
    test_create_group_chat()
    test_get_user_chats()
    test_send_message()
    test_get_chat_messages()
    test_mark_message_read()
    test_participant_verification()
    test_websocket_connection()
    
    # Print summary
    all_passed = print_test_summary()
    
    # Return appropriate exit code
    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()