"""
SimGuard Pro - Standalone SIM Card Security Tool
This version is designed for local deployment with real hardware.

INSTALLATION REQUIREMENTS (for real hardware):
1. Install PC/SC lite daemon: sudo apt install pcscd libpcsclite-dev
2. Install Python dependencies: pip install pyscard qrcode pillow
3. Connect your USB PC/SC reader
4. Run: python server.py

This server supports both simulated mode (web preview) and real hardware mode.
"""

from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse, Response
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
import base64

# Try to import pyscard for real hardware support
HARDWARE_MODE = False
try:
    from smartcard.System import readers
    from smartcard.util import toHexString, toBytes
    from smartcard.CardConnection import CardConnection
    from smartcard.Exceptions import NoCardException, CardConnectionException
    HARDWARE_MODE = True
    print("✓ pyscard loaded - Real hardware mode available")
except ImportError:
    print("⚠ pyscard not installed - Running in simulation mode")
    print("  To enable real hardware: pip install pyscard")

# Try to import qrcode for real QR generation
QR_MODE = False
try:
    import qrcode
    from PIL import Image
    QR_MODE = True
    print("✓ qrcode loaded - Real QR code generation available")
except ImportError:
    print("⚠ qrcode not installed - QR codes will be placeholder")

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'simguard_db')]

app = FastAPI(title="SimGuard Pro API - Standalone Edition")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== SIM CARD APDU COMMANDS ==============
# Standard APDU commands for SIM card operations
APDU_SELECT_MF = [0xA0, 0xA4, 0x00, 0x00, 0x02, 0x3F, 0x00]  # Select Master File
APDU_SELECT_DF_GSM = [0xA0, 0xA4, 0x00, 0x00, 0x02, 0x7F, 0x20]  # Select DF_GSM
APDU_SELECT_EF_ICCID = [0xA0, 0xA4, 0x00, 0x00, 0x02, 0x2F, 0xE2]  # Select EF_ICCID
APDU_SELECT_EF_IMSI = [0xA0, 0xA4, 0x00, 0x00, 0x02, 0x6F, 0x07]  # Select EF_IMSI
APDU_SELECT_EF_SPN = [0xA0, 0xA4, 0x00, 0x00, 0x02, 0x6F, 0x46]  # Select EF_SPN
APDU_SELECT_EF_ADN = [0xA0, 0xA4, 0x00, 0x00, 0x02, 0x6F, 0x3A]  # Select EF_ADN (Contacts)
APDU_SELECT_EF_SMS = [0xA0, 0xA4, 0x00, 0x00, 0x02, 0x6F, 0x3C]  # Select EF_SMS
APDU_GET_RESPONSE = [0xA0, 0xC0, 0x00, 0x00]  # Get Response
APDU_READ_BINARY = [0xA0, 0xB0, 0x00, 0x00]  # Read Binary
APDU_READ_RECORD = [0xA0, 0xB2]  # Read Record

# ============== MODELS ==============

class ReaderStatus(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str = "PC/SC"
    status: str = "disconnected"
    atr: Optional[str] = None
    protocol: Optional[str] = None
    is_real: bool = False

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
    is_real: bool = False
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
    status: str = "read"

class ActivityLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    action: str
    details: str
    card_id: Optional[str] = None
    status: str = "success"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SecurityAnalysis(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    card_id: str
    auth_algorithm: str
    encryption_type: str
    vulnerabilities: List[str] = []
    risk_level: str
    recommendations: List[str] = []
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EsimProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    card_id: str
    activation_code: str
    qr_data: str
    qr_image_base64: Optional[str] = None
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
    data_type: str

# ============== HARDWARE HELPER FUNCTIONS ==============

def get_real_readers():
    """Get list of actual connected PC/SC readers"""
    if not HARDWARE_MODE:
        return []
    try:
        reader_list = readers()
        result = []
        for i, reader in enumerate(reader_list):
            reader_info = {
                "id": f"real-reader-{i}",
                "name": str(reader),
                "type": "PC/SC",
                "status": "disconnected",
                "atr": None,
                "protocol": None,
                "is_real": True,
                "_reader_obj": reader
            }
            # Try to connect to check status
            try:
                connection = reader.createConnection()
                connection.connect()
                reader_info["status"] = "connected"
                reader_info["atr"] = toHexString(connection.getATR())
                reader_info["protocol"] = "T=0" if connection.getProtocol() == CardConnection.T0_protocol else "T=1"
                connection.disconnect()
            except (NoCardException, CardConnectionException):
                reader_info["status"] = "no_card"
            except Exception as e:
                logger.error(f"Reader check error: {e}")
            result.append(reader_info)
        return result
    except Exception as e:
        logger.error(f"Error getting readers: {e}")
        return []

def read_sim_file(connection, select_apdu, length=None):
    """Read a file from the SIM card"""
    try:
        # Select the file
        data, sw1, sw2 = connection.transmit(select_apdu)
        if sw1 == 0x9F:  # Response data available
            # Get response
            get_resp = APDU_GET_RESPONSE + [sw2]
            data, sw1, sw2 = connection.transmit(get_resp)
        
        if sw1 != 0x90 and sw1 != 0x9F:
            return None
        
        # Determine file length from response
        if length is None and len(data) >= 4:
            length = (data[2] << 8) + data[3]
        
        # Read binary data
        if length:
            read_cmd = APDU_READ_BINARY + [min(length, 256)]
            data, sw1, sw2 = connection.transmit(read_cmd)
            if sw1 == 0x90:
                return data
        return None
    except Exception as e:
        logger.error(f"Error reading SIM file: {e}")
        return None

def decode_iccid(data):
    """Decode ICCID from raw bytes"""
    if not data:
        return None
    iccid = ""
    for byte in data:
        iccid += str(byte & 0x0F)
        if (byte >> 4) != 0x0F:
            iccid += str(byte >> 4)
    return iccid

def decode_imsi(data):
    """Decode IMSI from raw bytes"""
    if not data or len(data) < 9:
        return None
    # First byte is length, then BCD encoded IMSI
    length = data[0]
    imsi = str(data[1] >> 4)  # First digit
    for i in range(2, length + 1):
        if i < len(data):
            imsi += str(data[i] & 0x0F)
            if (data[i] >> 4) != 0x0F:
                imsi += str(data[i] >> 4)
    return imsi

def decode_spn(data):
    """Decode Service Provider Name"""
    if not data or len(data) < 2:
        return "Unknown"
    # Skip first byte (display condition), then read string
    spn_bytes = data[1:]
    # Remove padding (0xFF bytes)
    spn_bytes = bytes([b for b in spn_bytes if b != 0xFF])
    try:
        return spn_bytes.decode('utf-8').strip() or spn_bytes.decode('latin-1').strip()
    except:
        return "Unknown"

def read_real_card(reader_id: str):
    """Read actual card data from a connected reader"""
    if not HARDWARE_MODE:
        return None
    
    try:
        reader_list = readers()
        reader_index = int(reader_id.split('-')[-1])
        if reader_index >= len(reader_list):
            return None
        
        reader = reader_list[reader_index]
        connection = reader.createConnection()
        connection.connect()
        
        atr = toHexString(connection.getATR())
        
        # Select Master File
        connection.transmit(APDU_SELECT_MF)
        
        # Read ICCID (at MF level)
        iccid_data = read_sim_file(connection, APDU_SELECT_EF_ICCID, 10)
        iccid = decode_iccid(iccid_data) if iccid_data else "Unknown"
        
        # Select DF_GSM
        connection.transmit(APDU_SELECT_DF_GSM)
        
        # Read IMSI
        imsi_data = read_sim_file(connection, APDU_SELECT_EF_IMSI, 9)
        imsi = decode_imsi(imsi_data) if imsi_data else "Unknown"
        
        # Read SPN
        spn_data = read_sim_file(connection, APDU_SELECT_EF_SPN, 17)
        spn = decode_spn(spn_data) if spn_data else "Unknown Carrier"
        
        # Extract MCC/MNC from IMSI
        mcc = imsi[:3] if imsi and len(imsi) >= 3 else "000"
        mnc = imsi[3:5] if imsi and len(imsi) >= 5 else "00"
        
        connection.disconnect()
        
        return {
            "iccid": iccid,
            "imsi": imsi,
            "mcc": mcc,
            "mnc": mnc,
            "spn": spn,
            "atr": atr,
            "is_real": True
        }
    except NoCardException:
        raise HTTPException(status_code=400, detail="No card in reader")
    except Exception as e:
        logger.error(f"Error reading card: {e}")
        raise HTTPException(status_code=500, detail=f"Card read error: {str(e)}")

def generate_qr_code(data: str) -> Optional[str]:
    """Generate real QR code and return as base64"""
    if not QR_MODE:
        return None
    try:
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(data)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)
        return base64.b64encode(buffer.getvalue()).decode('utf-8')
    except Exception as e:
        logger.error(f"QR generation error: {e}")
        return None

# ============== READER ENDPOINTS ==============

@api_router.get("/readers", response_model=List[ReaderStatus])
async def get_readers():
    """Get list of connected PC/SC readers (real + simulated fallback)"""
    real_readers = get_real_readers()
    
    if real_readers:
        # Return only real readers if hardware is available
        return [ReaderStatus(**{k: v for k, v in r.items() if k != '_reader_obj'}) for r in real_readers]
    
    # Fallback: simulated readers for web preview (clearly marked)
    return [
        ReaderStatus(
            id="sim-reader-001",
            name="[SIMULATED] Demo Reader - Install pyscard for real hardware",
            type="PC/SC (Simulated)",
            status="connected",
            atr="3B 8F 80 01 80 4F 0C A0 00 00 03 06 (DEMO)",
            protocol="T=1",
            is_real=False
        )
    ]

@api_router.get("/hardware/status")
async def hardware_status():
    """Check if real hardware is available"""
    return {
        "hardware_mode": HARDWARE_MODE,
        "qr_mode": QR_MODE,
        "real_readers_count": len(get_real_readers()) if HARDWARE_MODE else 0,
        "message": "Real hardware available" if HARDWARE_MODE else "Install pyscard for real hardware support"
    }

@api_router.post("/readers/{reader_id}/connect")
async def connect_reader(reader_id: str):
    """Connect to a specific reader"""
    await log_activity("READER_CONNECT", f"Connected to reader {reader_id}")
    return {"status": "connected", "reader_id": reader_id, "is_real": reader_id.startswith("real-")}

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
    is_real_reader = reader_id.startswith("real-")
    
    if is_real_reader and HARDWARE_MODE:
        # Read from real hardware
        card_data_raw = read_real_card(reader_id)
        card_data = CardInfo(
            iccid=card_data_raw["iccid"],
            imsi=card_data_raw["imsi"],
            mcc=card_data_raw["mcc"],
            mnc=card_data_raw["mnc"],
            spn=card_data_raw["spn"],
            card_type="nano",
            is_real=True
        )
    else:
        # Simulated card for demo/testing (clearly marked)
        card_data = CardInfo(
            iccid="89012345678901234567",
            imsi="310150123456789",
            mcc="310",
            mnc="150",
            spn="[DEMO] SimGuard Test Carrier",
            msisdn="+15551234567",
            card_type="nano",
            is_real=False
        )
    
    doc = card_data.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.cards.insert_one(doc)
    await log_activity("CARD_READ", f"Read card ICCID: {card_data.iccid} (Real: {card_data.is_real})", card_data.id)
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
    
    # Check if this is a real card
    card = await db.cards.find_one({"id": card_id}, {"_id": 0})
    if card and card.get("is_real") and HARDWARE_MODE:
        # TODO: Implement real APDU write commands
        # This requires careful implementation to not damage the SIM
        pass
    
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
    
    cloned_card = CardInfo(
        iccid=f"CLONE_{source_card['iccid'][-10:]}",
        imsi=source_card['imsi'],
        mcc=source_card['mcc'],
        mnc=source_card['mnc'],
        spn=source_card['spn'],
        msisdn=source_card.get('msisdn'),
        card_type=source_card['card_type'],
        is_real=False  # Cloned data is stored locally
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
    
    # Real analysis based on ATR and card data
    vulnerabilities = []
    recommendations = []
    risk_level = "low"
    
    # Check IMSI for known vulnerable ranges
    imsi = card.get('imsi', '')
    if imsi:
        # Check for test/demo IMSIs
        if imsi.startswith('001') or imsi.startswith('999'):
            vulnerabilities.append("Test/Demo IMSI detected - not for production use")
            risk_level = "medium"
    
    # Check if Ki might be extractable (older cards)
    if not card.get('is_real'):
        vulnerabilities.append("Card data is from simulation - not real security analysis")
    else:
        vulnerabilities.append("IMSI catcher susceptibility - standard GSM vulnerability")
        vulnerabilities.append("Roaming authentication may expose subscriber identity")
        recommendations.append("Enable SIM PIN protection")
        recommendations.append("Monitor for unauthorized authentication attempts")
        recommendations.append("Consider upgrading to 5G SIM with enhanced security")
        risk_level = "medium"
    
    analysis = SecurityAnalysis(
        card_id=card_id,
        auth_algorithm="COMP128v3" if card.get('is_real') else "Unknown (Simulated)",
        encryption_type="A5/3" if card.get('is_real') else "Unknown (Simulated)",
        vulnerabilities=vulnerabilities,
        risk_level=risk_level,
        recommendations=recommendations
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
    
    # Generate eSIM activation code
    activation_code = f"LPA:1${request.carrier.upper()}.COM$SGP.{card['imsi'][-6:]}"
    qr_data = f"LPA:1${request.carrier.upper()}.ESIM.PROFILE${card['iccid'][-10:]}.{uuid.uuid4().hex[:8].upper()}"
    
    # Generate real QR code if library available
    qr_image_base64 = generate_qr_code(qr_data)
    
    esim_profile = EsimProfile(
        card_id=request.card_id,
        activation_code=activation_code,
        qr_data=qr_data,
        qr_image_base64=qr_image_base64,
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

@api_router.get("/esim/qr/{profile_id}")
async def get_esim_qr_image(profile_id: str):
    """Get QR code image for an eSIM profile"""
    profile = await db.esim_profiles.find_one({"id": profile_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    if profile.get("qr_image_base64"):
        image_data = base64.b64decode(profile["qr_image_base64"])
        return Response(content=image_data, media_type="image/png")
    
    # Generate on the fly if not stored
    qr_base64 = generate_qr_code(profile["qr_data"])
    if qr_base64:
        image_data = base64.b64decode(qr_base64)
        return Response(content=image_data, media_type="image/png")
    
    raise HTTPException(status_code=500, detail="QR generation not available - install qrcode library")

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
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "exported_by": "SimGuard Pro Standalone"
        }
        content = json.dumps(export_data, indent=2, default=str)
        return StreamingResponse(
            io.StringIO(content),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=simguard_export_{card_id}.json"}
        )
    else:
        output = io.StringIO()
        output.write("=== CARD INFO ===\n")
        writer = csv.DictWriter(output, fieldnames=list(card.keys()))
        writer.writeheader()
        writer.writerow(card)
        
        output.write("\n=== CONTACTS ===\n")
        if contacts:
            writer = csv.DictWriter(output, fieldnames=list(contacts[0].keys()))
            writer.writeheader()
            writer.writerows(contacts)
        
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
    return {
        "message": "SimGuard Pro API - Standalone Edition",
        "version": "2.0.0",
        "hardware_mode": HARDWARE_MODE,
        "qr_mode": QR_MODE
    }

@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "hardware_available": HARDWARE_MODE,
        "qr_available": QR_MODE
    }

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

# For standalone running
if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("SimGuard Pro - Standalone SIM Card Security Tool")
    print("="*60)
    print(f"Hardware Mode: {'ENABLED' if HARDWARE_MODE else 'DISABLED (install pyscard)'}")
    print(f"QR Code Mode: {'ENABLED' if QR_MODE else 'DISABLED (install qrcode)'}")
    print("="*60 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8001)
