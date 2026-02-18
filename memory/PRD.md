# SimGuard Pro - Standalone SIM Card Security Tool

## Original Problem Statement
Build an app that functions with USB smart card reader IC card reader, SIM card adapter/SIM breakout board that simplifies research and work as a security engineer. User-friendly interface, less code language, easy to read/write/clone and analyze data. Must be standalone - no ongoing costs or external service dependencies.

## User Choices
- All primary functions (read, write, clone, analyze)
- USB PC/SC reader support
- JSON and CSV export/import
- No authentication (single-user personal tool)
- Support for nano SIM and IC cards
- Physical to eSIM conversion feature
- **STANDALONE** - Must work independently without external paid services

## Architecture

### Tech Stack (All Local/Free)
- **Backend**: FastAPI + pyscard (PC/SC)
- **Frontend**: React + Tailwind + shadcn/ui
- **Database**: MongoDB (local)
- **QR Generation**: qrcode + Pillow (local)

### Hardware Integration
- Uses `pyscard` library for PC/SC protocol
- Supports any standard USB smart card reader
- APDU commands for SIM file access (EF_ICCID, EF_IMSI, EF_SPN, EF_ADN, EF_SMS)

## What's Been Implemented (Jan 2026)

### Backend (FastAPI)
- ✅ PC/SC reader detection (real hardware when pyscard installed)
- ✅ APDU-based card reading (ICCID, IMSI, SPN, MCC, MNC)
- ✅ Hardware status endpoint (`/api/hardware/status`)
- ✅ Contact CRUD with SIM write capability
- ✅ SMS management
- ✅ Clone operation (data duplication)
- ✅ Security analysis
- ✅ Real QR code generation for eSIM profiles
- ✅ JSON/CSV export/import
- ✅ Activity logging

### Frontend (React)
- ✅ Hardware mode indicator (DEMO vs HARDWARE badge)
- ✅ Clear labeling of simulated vs real data
- ✅ All management pages working
- ✅ Real QR code display from backend

## Deployment Modes

### 1. Demo Mode (Current - Web Preview)
- No pyscard installed
- Shows simulated readers/data
- Clearly labeled as "[SIMULATED]"
- Good for UI preview and testing

### 2. Hardware Mode (Local Deployment)
- Install pyscard + system dependencies
- Real USB reader detection
- Real card data extraction
- Full standalone operation

## Local Installation Requirements

```bash
# System dependencies
sudo apt install pcscd libpcsclite-dev swig mongodb

# Python dependencies
pip install pyscard qrcode pillow

# Connect USB reader, insert SIM, run app
```

## No External Dependencies

✅ No Emergent credits required
✅ No cloud API calls
✅ No subscriptions
✅ Runs 100% offline
✅ Data stays local (MongoDB)
✅ All processing local (no AI/LLM calls)

## Next Tasks (for user)
1. Download code from Emergent
2. Follow README.md for local setup
3. Install pyscard for real hardware
4. Connect USB reader
5. Start using with real SIM cards
