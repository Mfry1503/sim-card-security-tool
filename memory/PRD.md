# SimGuard Pro - SIM Card Security Tool

## Original Problem Statement
Build an app that functions with USB smart card reader IC card reader, SIM card adapter/SIM breakout board that simplifies research and work as a security and program development engineer. A user-friendly interface with less code language, more common wordage, easy to read/write/clone and analyze data on personal SIMs and cards. Functions similar to pysim, MOBILedit but less complicated.

## User Choices
- All primary functions (read, write, clone, analyze)
- USB PC/SC reader support
- JSON and CSV export/import
- No authentication (single-user personal tool)
- Support for nano SIM and IC cards
- Physical to eSIM conversion feature

## User Personas
1. **Security Researcher**: Needs to analyze SIM card security, test authentication algorithms, identify vulnerabilities
2. **Telecom Engineer**: Manages SIM card data, clones profiles for testing, exports data for analysis
3. **Developer**: Creates and tests eSIM profiles, writes contacts/SMS programmatically

## Core Requirements (Static)
- PC/SC USB reader detection and connection
- SIM card data reading (ICCID, IMSI, MSISDN, MCC, MNC, SPN)
- Contact CRUD operations
- SMS management
- Card cloning functionality
- Security analysis (auth algorithm, encryption detection)
- Physical to eSIM conversion
- JSON/CSV export/import

## What's Been Implemented (Jan 2026)

### Backend (FastAPI)
- ✅ Reader management endpoints (/api/readers, connect, disconnect)
- ✅ Card management (/api/cards, read, delete)
- ✅ Contact CRUD (/api/contacts)
- ✅ SMS CRUD (/api/sms)
- ✅ Clone operation (/api/clone)
- ✅ Security analysis (/api/analyze/{card_id})
- ✅ eSIM conversion (/api/esim/convert)
- ✅ Export/Import (/api/export/{card_id}, /api/import)
- ✅ Activity logging (/api/activity)

### Frontend (React)
- ✅ Dashboard with quick actions and stats
- ✅ Card Reader page with reader selection
- ✅ Contact Manager with full CRUD
- ✅ SMS Manager with inbox/sent/draft tabs
- ✅ Clone Tool with wizard workflow
- ✅ Security Analyzer with risk visualization
- ✅ eSIM Converter with QR code display
- ✅ Export/Import panel

### Design
- Dark theme optimized for security work
- Barlow Condensed + IBM Plex Sans + JetBrains Mono fonts
- SIM card visual component
- Hex viewer for raw data
- Activity log panel

## Note: MOCKED Features
- PC/SC reader detection (simulated - real implementation needs pyscard)
- Card read operation (returns demo data)
- Security analysis (simulated results)
- eSIM profile generation (simulated QR data)

## Prioritized Backlog

### P0 - Critical (Future)
- Integrate actual pyscard library for real hardware communication
- Implement APDU command execution for real card reading

### P1 - High Priority
- Real Ki/OPc extraction (requires specialized hardware)
- Actual QR code generation library (qrcode)
- File-based data persistence backup

### P2 - Medium Priority
- Multi-card comparison view
- Batch operations for contacts/SMS
- Card profile templates
- Dark/light theme toggle

## Next Tasks
1. User to connect actual PC/SC reader hardware for real testing
2. Consider adding pyscard dependency for actual card communication
3. Add QR code generation library for real eSIM QR codes
