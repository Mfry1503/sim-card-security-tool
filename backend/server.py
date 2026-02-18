from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import json
import csv
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="SimGuard Pro API")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class ReaderStatus(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str = "PC/SC"
    status: str = "disconnected"  # connected, disconnected, busy
    atr: Optional[str] = None
    protocol: Optional[str] = None

class CardInfo(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    iccid: str
    imsi: str
    mcc: str
    mnc: str
    spn: str
    msisdn: Optional[str] = None
    ki: Optional[str] = None
    opc: Optional[str] = None
    card_type: str = "nano"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Contact(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    card_id: str
    index: int
    name: str
    number: str
    group: Optional[str] = None
    email: Optional[str] = None

class SMS(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    card_id: str
    index: int
    sender: str
    recipient: str
    message: str
    timestamp: datetime
    status: str = "read"  # read, unread, sent, draft

class ActivityLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    action: str
    details: str
    card_id: Optional[str] = None
    status: str = "success"  # success, error, warning
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SecurityAnalysis(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    card_id: str
    auth_algorithm: str
    encryption_type: str
    vulnerabilities: List[str] = []
    risk_level: str  # low, medium, high, critical
    recommendations: List[str] = []
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EsimProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    card_id: str
    activation_code: str
    qr_data: str
    profile_name: str
    carrier: str
    status: str = "pending"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Input models
class ContactCreate(BaseModel):
    card_id: str
    name: str
    number: str
    group: Optional[str] = None
    email: Optional[str] = None

class ContactUpdate(BaseModel):
    name: Optional[str] = None
    number: Optional[str] = None
    group: Optional[str] = None
    email: Optional[str] = None

class SMSCreate(BaseModel):
    card_id: str
    sender: str
    recipient: str
    message: str
    status: str = "draft"

class CloneRequest(BaseModel):
    source_card_id: str
    clone_contacts: bool = True
    clone_sms: bool = True
    clone_settings: bool = True

class EsimConvertRequest(BaseModel):
    card_id: str
    profile_name: str
    carrier: str

class ImportData(BaseModel):
    card_id: str
    data: dict
    data_type: str  # contacts, sms, all

# ============== READER ENDPOINTS ==============

@api_router.get("/readers", response_model=List[ReaderStatus])
async def get_readers():
    """Get list of connected PC/SC readers"""
    # Simulated readers (real implementation would use pyscard)
    readers = [
        {
            "id": "reader-001",
            "name": "ACS ACR122U PICC Interface",
            "type": "PC/SC",
            "status": "connected",
            "atr": "3B 8F 80 01 80 4F 0C A0 00 00 03 06 03 00 01 00 00 00 00 6A",
            "protocol": "T=1"
        },
        {
            "id": "reader-002",
            "name": "Gemalto PC Twin Reader",
            "type": "PC/SC",
            "status": "disconnected",
            "atr": None,
            "protocol": None
        }
    ]
    return readers

@api_router.post("/readers/{reader_id}/connect")
async def connect_reader(reader_id: str):
    """Connect to a specific reader"""
    await log_activity("READER_CONNECT", f"Connected to reader {reader_id}")
    return {"status": "connected", "reader_id": reader_id, "message": "Reader connected successfully"}

@api_router.post("/readers/{reader_id}/disconnect")
async def disconnect_reader(reader_id: str):
    """Disconnect from a reader"""
    await log_activity("READER_DISCONNECT", f"Disconnected from reader {reader_id}")
    return {"status": "disconnected", "reader_id": reader_id}

# ============== CARD ENDPOINTS ==============

@api_router.get("/cards", response_model=List[CardInfo])
async def get_cards():
    """Get all scanned cards"""
    cards = await db.cards.find({}, {"_id": 0}).to_list(100)
    for card in cards:
        if isinstance(card.get('timestamp'), str):
            card['timestamp'] = datetime.fromisoformat(card['timestamp'])
    return cards

@api_router.get("/cards/{card_id}", response_model=CardInfo)
async def get_card(card_id: str):
    """Get specific card details"""
    card = await db.cards.find_one({"id": card_id}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    if isinstance(card.get('timestamp'), str):
        card['timestamp'] = datetime.fromisoformat(card['timestamp'])
    return card

@api_router.post("/cards/read")
async def read_card(reader_id: str = Query(...)):
    """Read card data from the connected reader"""
    # Simulated card read (real implementation would use pyscard APDU commands)
    card_data = CardInfo(
        iccid="89012345678901234567",
        imsi="310150123456789",
        mcc="310",
        mnc="150",
        spn="SimGuard Test Carrier",
        msisdn="+15551234567",
        card_type="nano"
    )
    doc = card_data.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.cards.insert_one(doc)
    await log_activity("CARD_READ", f"Read card ICCID: {card_data.iccid}", card_data.id)
    return card_data

@api_router.delete("/cards/{card_id}")
async def delete_card(card_id: str):
    """Delete a card and all associated data"""
    result = await db.cards.delete_one({"id": card_id})
    await db.contacts.delete_many({"card_id": card_id})
    await db.sms.delete_many({"card_id": card_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Card not found")
    await log_activity("CARD_DELETE", f"Deleted card {card_id}", card_id)
    return {"status": "deleted", "card_id": card_id}

# ============== CONTACTS ENDPOINTS ==============

@api_router.get("/contacts", response_model=List[Contact])
async def get_contacts(card_id: Optional[str] = None):
    """Get contacts, optionally filtered by card"""
    query = {"card_id": card_id} if card_id else {}
    contacts = await db.contacts.find(query, {"_id": 0}).to_list(1000)
    return contacts

@api_router.post("/contacts", response_model=Contact)
async def create_contact(contact: ContactCreate):
    """Create a new contact"""
    count = await db.contacts.count_documents({"card_id": contact.card_id})
    new_contact = Contact(
        card_id=contact.card_id,
        index=count + 1,
        name=contact.name,
        number=contact.number,
        group=contact.group,
        email=contact.email
    )
    await db.contacts.insert_one(new_contact.model_dump())
    await log_activity("CONTACT_CREATE", f"Created contact: {contact.name}", contact.card_id)
    return new_contact

@api_router.put("/contacts/{contact_id}", response_model=Contact)
async def update_contact(contact_id: str, update: ContactUpdate):
    """Update a contact"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    result = await db.contacts.update_one({"id": contact_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    await log_activity("CONTACT_UPDATE", f"Updated contact: {contact_id}")
    return contact

@api_router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str):
    """Delete a contact"""
    result = await db.contacts.delete_one({"id": contact_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    await log_activity("CONTACT_DELETE", f"Deleted contact: {contact_id}")
    return {"status": "deleted", "contact_id": contact_id}

@api_router.post("/contacts/write/{card_id}")
async def write_contacts_to_card(card_id: str):
    """Write all contacts to the physical SIM card"""
    contacts = await db.contacts.find({"card_id": card_id}, {"_id": 0}).to_list(1000)
    # Simulated write operation
    await log_activity("CONTACTS_WRITE", f"Wrote {len(contacts)} contacts to card", card_id)
    return {"status": "success", "contacts_written": len(contacts)}

# ============== SMS ENDPOINTS ==============

@api_router.get("/sms", response_model=List[SMS])
async def get_sms(card_id: Optional[str] = None):
    """Get SMS messages, optionally filtered by card"""
    query = {"card_id": card_id} if card_id else {}
    messages = await db.sms.find(query, {"_id": 0}).to_list(1000)
    for msg in messages:
        if isinstance(msg.get('timestamp'), str):
            msg['timestamp'] = datetime.fromisoformat(msg['timestamp'])
    return messages

@api_router.post("/sms", response_model=SMS)
async def create_sms(sms: SMSCreate):
    """Create a new SMS entry"""
    count = await db.sms.count_documents({"card_id": sms.card_id})
    new_sms = SMS(
        card_id=sms.card_id,
        index=count + 1,
        sender=sms.sender,
        recipient=sms.recipient,
        message=sms.message,
        timestamp=datetime.now(timezone.utc),
        status=sms.status
    )
    doc = new_sms.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.sms.insert_one(doc)
    await log_activity("SMS_CREATE", f"Created SMS from {sms.sender}", sms.card_id)
    return new_sms

@api_router.delete("/sms/{sms_id}")
async def delete_sms(sms_id: str):
    """Delete an SMS"""
    result = await db.sms.delete_one({"id": sms_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="SMS not found")
    await log_activity("SMS_DELETE", f"Deleted SMS: {sms_id}")
    return {"status": "deleted", "sms_id": sms_id}

# ============== CLONE ENDPOINTS ==============

@api_router.post("/clone")
async def clone_card(request: CloneRequest):
    """Clone card data to a new card"""
    source_card = await db.cards.find_one({"id": request.source_card_id}, {"_id": 0})
    if not source_card:
        raise HTTPException(status_code=404, detail="Source card not found")
    
    # Create cloned card entry
    cloned_card = CardInfo(
        iccid=f"CLONE_{source_card['iccid'][-10:]}",
        imsi=source_card['imsi'],
        mcc=source_card['mcc'],
        mnc=source_card['mnc'],
        spn=source_card['spn'],
        msisdn=source_card.get('msisdn'),
        card_type=source_card['card_type']
    )
    doc = cloned_card.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.cards.insert_one(doc)
    
    cloned_contacts = 0
    cloned_sms = 0
    
    if request.clone_contacts:
        contacts = await db.contacts.find({"card_id": request.source_card_id}, {"_id": 0}).to_list(1000)
        for contact in contacts:
            new_contact = Contact(
                card_id=cloned_card.id,
                index=contact['index'],
                name=contact['name'],
                number=contact['number'],
                group=contact.get('group'),
                email=contact.get('email')
            )
            await db.contacts.insert_one(new_contact.model_dump())
            cloned_contacts += 1
    
    if request.clone_sms:
        messages = await db.sms.find({"card_id": request.source_card_id}, {"_id": 0}).to_list(1000)
        for msg in messages:
            new_sms = SMS(
                card_id=cloned_card.id,
                index=msg['index'],
                sender=msg['sender'],
                recipient=msg['recipient'],
                message=msg['message'],
                timestamp=datetime.fromisoformat(msg['timestamp']) if isinstance(msg['timestamp'], str) else msg['timestamp'],
                status=msg['status']
            )
            doc = new_sms.model_dump()
            doc['timestamp'] = doc['timestamp'].isoformat()
            await db.sms.insert_one(doc)
            cloned_sms += 1
    
    await log_activity("CARD_CLONE", f"Cloned card {request.source_card_id} to {cloned_card.id}", cloned_card.id)
    
    return {
        "status": "success",
        "cloned_card_id": cloned_card.id,
        "contacts_cloned": cloned_contacts,
        "sms_cloned": cloned_sms
    }

# ============== SECURITY ANALYSIS ==============

@api_router.post("/analyze/{card_id}", response_model=SecurityAnalysis)
async def analyze_card_security(card_id: str):
    """Perform security analysis on a card"""
    card = await db.cards.find_one({"id": card_id}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    # Simulated security analysis
    analysis = SecurityAnalysis(
        card_id=card_id,
        auth_algorithm="COMP128v3",
        encryption_type="A5/3",
        vulnerabilities=[
            "IMSI catcher susceptibility detected",
            "Roaming authentication may expose Ki"
        ],
        risk_level="medium",
        recommendations=[
            "Enable SIM PIN protection",
            "Monitor for unauthorized authentication attempts",
            "Consider upgrading to 5G SIM with enhanced security"
        ]
    )
    
    doc = analysis.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.security_analysis.insert_one(doc)
    await log_activity("SECURITY_ANALYSIS", f"Security analysis completed for card {card_id}", card_id)
    
    return analysis

@api_router.get("/analyze/{card_id}/history", response_model=List[SecurityAnalysis])
async def get_analysis_history(card_id: str):
    """Get security analysis history for a card"""
    analyses = await db.security_analysis.find({"card_id": card_id}, {"_id": 0}).to_list(100)
    for analysis in analyses:
        if isinstance(analysis.get('timestamp'), str):
            analysis['timestamp'] = datetime.fromisoformat(analysis['timestamp'])
    return analyses

# ============== ESIM CONVERSION ==============

@api_router.post("/esim/convert", response_model=EsimProfile)
async def convert_to_esim(request: EsimConvertRequest):
    """Convert physical SIM profile to eSIM format"""
    card = await db.cards.find_one({"id": request.card_id}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    # Generate eSIM activation code (simulated)
    activation_code = f"LPA:1${request.carrier.upper()}.COM$SGP.{card['imsi'][-6:]}"
    qr_data = f"LPA:1${request.carrier.upper()}.ESIM.PROFILE${card['iccid'][-10:]}.{uuid.uuid4().hex[:8].upper()}"
    
    esim_profile = EsimProfile(
        card_id=request.card_id,
        activation_code=activation_code,
        qr_data=qr_data,
        profile_name=request.profile_name,
        carrier=request.carrier,
        status="ready"
    )
    
    doc = esim_profile.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.esim_profiles.insert_one(doc)
    await log_activity("ESIM_CONVERT", f"Generated eSIM profile for card {request.card_id}", request.card_id)
    
    return esim_profile

@api_router.get("/esim/{card_id}", response_model=List[EsimProfile])
async def get_esim_profiles(card_id: str):
    """Get eSIM profiles for a card"""
    profiles = await db.esim_profiles.find({"card_id": card_id}, {"_id": 0}).to_list(100)
    for profile in profiles:
        if isinstance(profile.get('timestamp'), str):
            profile['timestamp'] = datetime.fromisoformat(profile['timestamp'])
    return profiles

# ============== EXPORT/IMPORT ==============

@api_router.get("/export/{card_id}")
async def export_card_data(card_id: str, format: str = Query("json", enum=["json", "csv"])):
    """Export card data in JSON or CSV format"""
    card = await db.cards.find_one({"id": card_id}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    contacts = await db.contacts.find({"card_id": card_id}, {"_id": 0}).to_list(1000)
    messages = await db.sms.find({"card_id": card_id}, {"_id": 0}).to_list(1000)
    
    if format == "json":
        export_data = {
            "card": card,
            "contacts": contacts,
            "sms": messages,
            "exported_at": datetime.now(timezone.utc).isoformat()
        }
        content = json.dumps(export_data, indent=2, default=str)
        return StreamingResponse(
            io.StringIO(content),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=simguard_export_{card_id}.json"}
        )
    else:  # CSV
        output = io.StringIO()
        
        # Write card info
        output.write("=== CARD INFO ===\n")
        writer = csv.DictWriter(output, fieldnames=list(card.keys()))
        writer.writeheader()
        writer.writerow(card)
        
        # Write contacts
        output.write("\n=== CONTACTS ===\n")
        if contacts:
            writer = csv.DictWriter(output, fieldnames=list(contacts[0].keys()))
            writer.writeheader()
            writer.writerows(contacts)
        
        # Write SMS
        output.write("\n=== SMS ===\n")
        if messages:
            writer = csv.DictWriter(output, fieldnames=list(messages[0].keys()))
            writer.writeheader()
            writer.writerows(messages)
        
        output.seek(0)
        await log_activity("DATA_EXPORT", f"Exported card data in {format} format", card_id)
        return StreamingResponse(
            output,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=simguard_export_{card_id}.csv"}
        )

@api_router.post("/import")
async def import_card_data(data: ImportData):
    """Import card data from JSON"""
    card = await db.cards.find_one({"id": data.card_id}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    imported_contacts = 0
    imported_sms = 0
    
    if data.data_type in ["contacts", "all"] and "contacts" in data.data:
        for contact_data in data.data["contacts"]:
            contact = ContactCreate(
                card_id=data.card_id,
                name=contact_data["name"],
                number=contact_data["number"],
                group=contact_data.get("group"),
                email=contact_data.get("email")
            )
            await create_contact(contact)
            imported_contacts += 1
    
    if data.data_type in ["sms", "all"] and "sms" in data.data:
        for sms_data in data.data["sms"]:
            sms = SMSCreate(
                card_id=data.card_id,
                sender=sms_data["sender"],
                recipient=sms_data["recipient"],
                message=sms_data["message"],
                status=sms_data.get("status", "read")
            )
            await create_sms(sms)
            imported_sms += 1
    
    await log_activity("DATA_IMPORT", f"Imported {imported_contacts} contacts, {imported_sms} SMS", data.card_id)
    
    return {
        "status": "success",
        "contacts_imported": imported_contacts,
        "sms_imported": imported_sms
    }

# ============== ACTIVITY LOG ==============

async def log_activity(action: str, details: str, card_id: Optional[str] = None, status: str = "success"):
    """Helper function to log activities"""
    log = ActivityLog(action=action, details=details, card_id=card_id, status=status)
    doc = log.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.activity_logs.insert_one(doc)
    return log

@api_router.get("/activity", response_model=List[ActivityLog])
async def get_activity_logs(limit: int = 50, card_id: Optional[str] = None):
    """Get activity logs"""
    query = {"card_id": card_id} if card_id else {}
    logs = await db.activity_logs.find(query, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    for log in logs:
        if isinstance(log.get('timestamp'), str):
            log['timestamp'] = datetime.fromisoformat(log['timestamp'])
    return logs

@api_router.delete("/activity/clear")
async def clear_activity_logs():
    """Clear all activity logs"""
    await db.activity_logs.delete_many({})
    return {"status": "cleared"}

# ============== ROOT & HEALTH ==============

@api_router.get("/")
async def root():
    return {"message": "SimGuard Pro API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
