from fastapi import FastAPI, APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
from datetime import datetime
from bson import ObjectId
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        # Update user online status
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"online": True, "last_seen": datetime.utcnow()}}
        )
        
    async def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        # Update user offline status
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"online": False, "last_seen": datetime.utcnow()}}
        )
        
    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
            except:
                await self.disconnect(user_id)
                
    async def broadcast_to_chat(self, message: dict, chat_id: str, sender_id: str):
        """Send message to all users in a chat except sender"""
        # Get all users in the chat
        chat = await db.chats.find_one({"_id": ObjectId(chat_id)})
        if chat:
            for user_id in chat.get("participants", []):
                if str(user_id) != sender_id:
                    await self.send_personal_message(message, str(user_id))

manager = ConnectionManager()

# Pydantic Models
class UserRegister(BaseModel):
    name: str
    email: EmailStr

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    online: bool = False
    last_seen: Optional[datetime] = None
    created_at: datetime

class ChatCreate(BaseModel):
    participant_id: str
    is_group: bool = False
    group_name: Optional[str] = None

class GroupChatCreate(BaseModel):
    name: str
    participant_ids: List[str]

class MessageCreate(BaseModel):
    chat_id: str
    text: str

class MessageResponse(BaseModel):
    id: str
    chat_id: str
    sender_id: str
    sender_name: str
    text: str
    timestamp: datetime
    delivered: bool = False
    read: bool = False

class ChatResponse(BaseModel):
    id: str
    is_group: bool
    name: Optional[str] = None
    participants: List[UserResponse]
    last_message: Optional[MessageResponse] = None
    unread_count: int = 0
    created_at: datetime

# Helper function to convert ObjectId to string
def serialize_doc(doc):
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    # Convert all ObjectId fields to strings
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            doc[key] = str(value)
        elif isinstance(value, list):
            doc[key] = [str(v) if isinstance(v, ObjectId) else v for v in value]
    return doc

# API Routes
@api_router.get("/")
async def root():
    return {"message": "My Chat API - Private Messenger"}

@api_router.post("/register", response_model=UserResponse)
async def register_user(user: UserRegister):
    """Simple registration with name and email"""
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        return serialize_doc(existing_user)
    
    # Create new user
    user_dict = {
        "name": user.name,
        "email": user.email,
        "online": False,
        "last_seen": None,
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_dict)
    user_dict["_id"] = result.inserted_id
    
    return serialize_doc(user_dict)

@api_router.get("/users", response_model=List[UserResponse])
async def get_all_users():
    """Get all registered users"""
    users = await db.users.find().to_list(1000)
    return [serialize_doc(user) for user in users]

@api_router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    """Get user by ID"""
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return serialize_doc(user)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")

@api_router.post("/chats", response_model=ChatResponse)
async def create_chat(chat_data: ChatCreate, current_user_id: str):
    """Create a new chat (private or group)"""
    try:
        participants = [ObjectId(current_user_id), ObjectId(chat_data.participant_id)]
        
        # Check if chat already exists for private chats
        if not chat_data.is_group:
            existing_chat = await db.chats.find_one({
                "is_group": False,
                "participants": {"$all": participants}
            })
            if existing_chat:
                return await get_chat_response(existing_chat, current_user_id)
        
        chat_dict = {
            "is_group": chat_data.is_group,
            "name": chat_data.group_name if chat_data.is_group else None,
            "participants": participants,
            "created_at": datetime.utcnow()
        }
        
        result = await db.chats.insert_one(chat_dict)
        chat_dict["_id"] = result.inserted_id
        
        return await get_chat_response(chat_dict, current_user_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/chats/group", response_model=ChatResponse)
async def create_group_chat(group_data: GroupChatCreate, current_user_id: str):
    """Create a group chat"""
    try:
        participants = [ObjectId(current_user_id)] + [ObjectId(pid) for pid in group_data.participant_ids]
        
        chat_dict = {
            "is_group": True,
            "name": group_data.name,
            "participants": participants,
            "created_at": datetime.utcnow()
        }
        
        result = await db.chats.insert_one(chat_dict)
        chat_dict["_id"] = result.inserted_id
        
        return await get_chat_response(chat_dict, current_user_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

async def get_chat_response(chat_doc, current_user_id: str):
    """Helper to build chat response with participants and last message"""
    # Get participant details
    participant_ids = chat_doc.get("participants", [])
    participants = []
    for pid in participant_ids:
        user = await db.users.find_one({"_id": pid})
        if user:
            participants.append(serialize_doc(user))
    
    # Get last message
    last_message = await db.messages.find_one(
        {"chat_id": chat_doc["_id"]},
        sort=[("timestamp", -1)]
    )
    
    last_msg_response = None
    if last_message:
        sender = await db.users.find_one({"_id": ObjectId(last_message["sender_id"])})
        last_msg_response = {
            "id": str(last_message["_id"]),
            "chat_id": str(last_message["chat_id"]),
            "sender_id": last_message["sender_id"],
            "sender_name": sender["name"] if sender else "Unknown",
            "text": last_message["text"],
            "timestamp": last_message["timestamp"],
            "delivered": last_message.get("delivered", False),
            "read": last_message.get("read", False)
        }
    
    # Count unread messages
    unread_count = await db.messages.count_documents({
        "chat_id": chat_doc["_id"],
        "sender_id": {"$ne": current_user_id},
        "read": False
    })
    
    # Determine chat name
    chat_name = chat_doc.get("name")
    if not chat_name and not chat_doc.get("is_group"):
        # For private chats, use the other user's name
        other_user = next((p for p in participants if p["id"] != current_user_id), None)
        chat_name = other_user["name"] if other_user else "Unknown"
    
    return {
        "id": str(chat_doc["_id"]),
        "is_group": chat_doc.get("is_group", False),
        "name": chat_name,
        "participants": participants,
        "last_message": last_msg_response,
        "unread_count": unread_count,
        "created_at": chat_doc["created_at"]
    }

@api_router.get("/chats", response_model=List[ChatResponse])
async def get_user_chats(user_id: str):
    """Get all chats for a user"""
    try:
        chats = await db.chats.find({
            "participants": ObjectId(user_id)
        }).sort("created_at", -1).to_list(1000)
        
        result = []
        for chat in chats:
            result.append(await get_chat_response(chat, user_id))
        
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/chats/{chat_id}/messages", response_model=List[MessageResponse])
async def get_chat_messages(chat_id: str, limit: int = 50):
    """Get messages for a chat"""
    try:
        messages = await db.messages.find({
            "chat_id": ObjectId(chat_id)
        }).sort("timestamp", -1).limit(limit).to_list(limit)
        
        result = []
        for msg in messages:
            sender = await db.users.find_one({"_id": ObjectId(msg["sender_id"])})
            result.append({
                "id": str(msg["_id"]),
                "chat_id": str(msg["chat_id"]),
                "sender_id": msg["sender_id"],
                "sender_name": sender["name"] if sender else "Unknown",
                "text": msg["text"],
                "timestamp": msg["timestamp"],
                "delivered": msg.get("delivered", False),
                "read": msg.get("read", False)
            })
        
        return list(reversed(result))  # Return oldest first
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/messages", response_model=MessageResponse)
async def send_message(message: MessageCreate, sender_id: str):
    """Send a message to a chat"""
    try:
        # Verify chat exists and user is participant
        chat = await db.chats.find_one({"_id": ObjectId(message.chat_id)})
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        if ObjectId(sender_id) not in chat["participants"]:
            raise HTTPException(status_code=403, detail="Not a participant of this chat")
        
        # Create message
        msg_dict = {
            "chat_id": ObjectId(message.chat_id),
            "sender_id": sender_id,
            "text": message.text,
            "timestamp": datetime.utcnow(),
            "delivered": True,
            "read": False
        }
        
        result = await db.messages.insert_one(msg_dict)
        msg_dict["_id"] = result.inserted_id
        
        # Get sender info
        sender = await db.users.find_one({"_id": ObjectId(sender_id)})
        
        response = {
            "id": str(msg_dict["_id"]),
            "chat_id": str(msg_dict["chat_id"]),
            "sender_id": msg_dict["sender_id"],
            "sender_name": sender["name"] if sender else "Unknown",
            "text": msg_dict["text"],
            "timestamp": msg_dict["timestamp"],
            "delivered": msg_dict["delivered"],
            "read": msg_dict["read"]
        }
        
        # Broadcast to other participants via WebSocket
        await manager.broadcast_to_chat(
            {"type": "new_message", "data": response},
            message.chat_id,
            sender_id
        )
        
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.put("/messages/{message_id}/read")
async def mark_message_read(message_id: str, user_id: str):
    """Mark a message as read"""
    try:
        result = await db.messages.update_one(
            {"_id": ObjectId(message_id)},
            {"$set": {"read": True}}
        )
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# WebSocket endpoint
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming WebSocket messages if needed
            pass
    except WebSocketDisconnect:
        await manager.disconnect(user_id)

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
