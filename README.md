# SimGuard Pro - Standalone SIM Card Security Tool

A fully standalone, self-hosted SIM card security and management application for security researchers and telecom professionals.

## Features

- **Card Reader**: Connect to PC/SC USB readers and read SIM card data (ICCID, IMSI, MSISDN, MCC, MNC, SPN)
- **Contact Manager**: Full CRUD operations for phonebook entries
- **SMS Manager**: Read, write, and manage SMS messages
- **Clone Tool**: Duplicate SIM card data with step-by-step wizard
- **Security Analyzer**: Analyze authentication algorithms, encryption, and vulnerabilities
- **eSIM Converter**: Generate eSIM profiles with QR codes from physical SIM data
- **Export/Import**: Backup and restore data in JSON or CSV format

## Standalone Deployment (No External Services Required)

This application runs 100% locally with no ongoing costs or external API dependencies.

### System Requirements

- **Operating System**: Linux (Ubuntu/Debian recommended), macOS, or Windows
- **Python**: 3.9+
- **Node.js**: 18+
- **MongoDB**: 5.0+ (local installation)
- **PC/SC Daemon**: Required for real hardware (pcscd on Linux)

### Quick Start - Local Installation

#### 1. Install System Dependencies

**Ubuntu/Debian:**
```bash
# Install PC/SC daemon for hardware support
sudo apt update
sudo apt install pcscd libpcsclite-dev swig

# Install MongoDB
sudo apt install mongodb

# Start services
sudo systemctl start pcscd mongodb
sudo systemctl enable pcscd mongodb
```

**macOS:**
```bash
# Install via Homebrew
brew install pcsc-lite swig
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community
```

**Windows:**
- Download and install [MongoDB Community Server](https://www.mongodb.com/try/download/community)
- PC/SC is built into Windows (no additional install needed)

#### 2. Clone and Setup Backend

```bash
# Clone the repository
git clone <your-repo-url> simguard-pro
cd simguard-pro/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/macOS
# or: .\venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Install hardware support (REQUIRED for real card reading)
pip install pyscard qrcode pillow

# Create .env file
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=simguard_db
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
EOF

# Start the backend
python server.py
```

#### 3. Setup Frontend

```bash
cd ../frontend

# Install dependencies
npm install  # or yarn install

# Create .env file
cat > .env << EOF
REACT_APP_BACKEND_URL=http://localhost:8001
EOF

# Start the frontend
npm start  # or yarn start
```

#### 4. Access the Application

Open your browser to: **http://localhost:3000**

### Hardware Setup

#### Supported Readers

Any PC/SC compatible USB reader works. Tested with:
- ACS ACR122U
- Gemalto PC Twin Reader
- Omnikey 3121
- Cherry SmartTerminal
- Generic USB Smart Card readers

#### Connecting Your Reader

1. Connect the USB reader to your computer
2. Insert a SIM card (nano, micro, or standard with adapter)
3. Refresh readers in the app (top-right button)
4. Click "Connect" on your reader
5. Click "Read Card" to extract data

### Project Structure

```
simguard-pro/
├── backend/
│   ├── server.py          # FastAPI backend with PC/SC integration
│   ├── requirements.txt   # Python dependencies
│   └── .env              # Environment variables
├── frontend/
│   ├── src/
│   │   ├── App.js        # Main React app
│   │   ├── pages/        # All page components
│   │   └── components/   # Reusable UI components
│   ├── package.json
│   └── .env              # Frontend environment
└── README.md
```

### Docker Deployment (Alternative)

```dockerfile
# docker-compose.yml
version: '3.8'
services:
  mongodb:
    image: mongo:5.0
    volumes:
      - mongo-data:/data/db
    ports:
      - "27017:27017"

  backend:
    build: ./backend
    ports:
      - "8001:8001"
    environment:
      - MONGO_URL=mongodb://mongodb:27017
      - DB_NAME=simguard_db
    depends_on:
      - mongodb
    # For hardware access in Docker, you need:
    # privileged: true
    # devices:
    #   - /dev/bus/usb:/dev/bus/usb

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_BACKEND_URL=http://localhost:8001
    depends_on:
      - backend

volumes:
  mongo-data:
```

### API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/readers` | GET | List connected readers |
| `/api/hardware/status` | GET | Check hardware mode status |
| `/api/cards/read` | POST | Read card from reader |
| `/api/cards` | GET | List all scanned cards |
| `/api/contacts` | GET/POST | Manage contacts |
| `/api/sms` | GET/POST | Manage SMS |
| `/api/clone` | POST | Clone card data |
| `/api/analyze/{card_id}` | POST | Security analysis |
| `/api/esim/convert` | POST | Generate eSIM profile |
| `/api/export/{card_id}` | GET | Export card data |

### Troubleshooting

**"pyscard not installed" warning:**
```bash
pip install pyscard
# If build fails, install system dependencies first:
# Ubuntu: sudo apt install libpcsclite-dev swig
# macOS: brew install pcsc-lite swig
```

**"No readers detected":**
```bash
# Check if PC/SC daemon is running
sudo systemctl status pcscd

# Restart if needed
sudo systemctl restart pcscd

# Check USB connection
lsusb | grep -i smart
```

**MongoDB connection error:**
```bash
# Check if MongoDB is running
sudo systemctl status mongodb

# Start if needed
sudo systemctl start mongodb
```

### Security Notice

- This tool is for personal research and authorized testing only
- Never use on SIM cards you don't own
- Ki extraction requires specialized hardware and may be illegal
- eSIM profiles generated are for backup/testing purposes

### License

MIT License - Free for personal and commercial use.

### No External Dependencies

✅ **No Emergent credits required**  
✅ **No cloud API calls**  
✅ **No subscriptions**  
✅ **Runs 100% offline**  
✅ **Your data stays local**
