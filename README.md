#OrangeAI

# 🤖 AI-Powered Service Job Management System

A revolutionary hands-free job management platform that connects customers via WhatsApp with contractors through an AI-powered mobile app. The system automatically creates invoices from voice transcripts while keeping customers informed in real-time.

## 📱 Overview

This platform transforms how service businesses handle jobs from booking to payment. Customers interact entirely through WhatsApp—no app download required. Contractors use a mobile app that listens to their work, automatically generates invoices from speech, and sends everything to customers seamlessly.

### Key Innovation

**Voice-to-Invoice AI**: Contractors simply speak while working, and the system:
- Transcribes their speech in real-time
- Extracts parts, labor, and services automatically
- Creates structured invoice items with pricing
- Updates customers via WhatsApp automatically
- Generates professional invoices ready to send

---

## 👥 User Personas

### 👩 Jessica (Customer)

- **Uses**: WhatsApp only
- **No app**: No download required
- **No signup**: Just messages the business like normal
- **Experience**: Natural, conversational booking and updates via WhatsApp

### 🧑‍🔧 Eric (Contractor)

- **Uses**: Mobile app (React + TypeScript)
- **Features**:
  - Start jobs with AI
  - Speak while working (hands-free)
  - See live transcript
  - Watch invoice items auto-generate
  - Finish and send invoices
  - Voice commands for control

---

## 🚀 Complete Workflow

### 📲 1. Jessica Messages the Business on WhatsApp

**Jessica sends:**
> "Hi, my boiler is leaking. Can someone come fix it?"

**Our WhatsApp AI assistant (WhatNot bot) replies instantly:**
- ✅ Collects details
- ✅ Gives estimated prices
- ✅ Schedules a job
- ✅ Confirms Eric is coming

**Jessica never leaves WhatsApp.** Everything feels natural.

---

### 📲 2. Eric Arrives and Opens the App

Eric opens our app and taps:

**"Start Job with AI"**

This activates the **Start Job Agent**:
- 🎤 Live transcription
- 🧠 Real-time understanding
- 💰 Auto-invoice creation
- 📱 Customer transparency updates (through WhatsApp)

Eric now puts the phone in his pocket or on a toolbox and starts working.

---

### 🎤 3. The Transcript AI (Inside Eric's App) Begins Listening

**The Live Work Screen shows:**

**TOP: Transcript**

Eric sees the last few things he said:
- "Inspecting boiler…"
- "Removing leaking valve…"
- "Installing replacement fitting…"

This helps him know the AI is tracking correctly.

**BOTTOM: Invoice Cards (Auto-scroll)**

Every time Eric mentions:
- a part
- a fix
- labour time
- or a price

**the AI creates a card:**
- 🔧 Leaking Valve Replacement — £35
- ⏱️ Labour — 30 mins — £30
- 📞 Call-out Fee — £20

Each new card slides in like a message in a chat.

**Eric doesn't touch a thing. The invoice builds itself.**

---

### 📩 4. Jessica Gets Live Updates on WhatsApp

While Eric works, the WhatsApp AI sends Jessica simple updates:

- "Eric is checking the issue…"
- "Replacing a part…"
- "Testing the repair…"

**No prices yet** — just transparency.

Jessica feels informed, respected, and calm.

---

### 🗣️ 5. Eric Can Control Everything by Voice

Eric says:

- **"Remove that."**
- **"Make that free."**
- **"Add a cleaning fee."**
- **"Pause listening."**
- **"Resume listening."**
- **"Add photo of the part."**

The app updates instantly.

**Hands-free. One-hand use. Fast and natural.**

---

### 🔚 6. Eric Finishes the Job

Eric says:

**"I'm done."**

The Start Job Agent now:
- ✅ Stops listening
- ✅ Compiles all invoice items
- ✅ Shows Eric the final invoice

**Example:**
```
Valve Replacement — £35
Labour — 45 mins — £45
Cleaning Fee — £10
--------------------------
Total: £90
```

Eric reviews:
- ✔️ edit
- ✔️ delete
- ✔️ adjust prices
- ✔️ add notes
- ✔️ attach photos

---

### 🧾 7. Eric Sends the Invoice to Jessica (via WhatsApp)

**With one tap:**

**"Send Invoice"**

Jessica receives:
- ✅ a clear breakdown
- ✅ parts + labour
- ✅ photos
- ✅ total cost
- ✅ a secure payment link

**No confusion. No explanations. No awkward money talk.**

---

### 💳 8. Jessica Pays Instantly

She taps the payment link on WhatsApp, pays, and both sides see:

**"Payment received."**

- ✅ Eric is done
- ✅ The job is saved in his app
- ✅ Jessica is happy
- ✅ The system handled everything

---

## 🧠 The Three AI Agents

### 1. WhatsApp Bot (for Jessica)

**Purpose**: Customer-facing communication

**Responsibilities**:
- Handles booking
- Sends live updates
- Sends invoice
- Collects payment

**Technology**: WhatsApp Business API + Webhook integration

---

### 2. Start Job Agent (for Eric)

**Purpose**: Live job manager

**Responsibilities**:
- Controls job mode
- Knows context, service catalog, and pricing
- Manages transcription state
- Coordinates between transcript AI and WhatsApp bot

**Implementation**: React state management + OpenAI API integration

**Location**: `src/pages/Agent.tsx`

---

### 3. Transcript AI (for Eric)

**Purpose**: Converts speech → structured invoice items

**Responsibilities**:
- Transcribes audio to text
- Detects labour, parts, notes, changes
- Creates real-time invoice items
- Fetches part prices and images

**Technology**: 
- **Speech-to-Text**: Web Speech API / Browser MediaRecorder API
- **NLP & Extraction**: OpenAI GPT-4o-mini with structured JSON output
- **Part Pricing**: Comprehensive automotive parts database + AI fallback
- **Image Fetching**: Unsplash API / Pexels API for part images

**Implementation**: `src/lib/openai-agent.ts`

**Key Features**:
- Extracts specific part names (not generic)
- Estimates realistic prices for parts
- Categorizes items (part/labor/service)
- Fetches part images automatically
- Handles labor descriptions separately

---

## 🏗️ Technical Architecture

### Frontend (Mobile App)

**Framework**: React 18 + TypeScript  
**Build Tool**: Vite  
**UI Components**: shadcn/ui + Radix UI  
**Styling**: Tailwind CSS  
**State Management**: React Hooks + TanStack Query  
**Routing**: React Router v6  

**Key Libraries**:
- `@tanstack/react-query` - Server state management
- `recharts` - Charts and analytics
- `react-hook-form` - Form handling
- `zod` - Schema validation
- `lucide-react` - Icons
- `sonner` - Toast notifications

**Pages**:
- `/dashboard` - Main dashboard with stats and recent invoices
- `/agent` - Live job management with transcription and invoice creation
- `/invoices` - Invoice history and management

---

### AI Integration

**OpenAI API**:
- **Model**: GPT-4o-mini
- **Purpose**: Invoice item extraction from transcripts
- **Response Format**: Structured JSON
- **Temperature**: 0.3 (for consistency)

**Features**:
- Context-aware extraction (uses last 10 transcript entries)
- Specific part name recognition (not generic)
- Realistic price estimation
- Automatic categorization
- Labor description extraction

**Google Gemini API**:
- **Purpose**: Generate customer-friendly explanations
- **Model**: gemini-pro
- **Use Case**: WhatsApp message explanations for non-technical customers

---

### Backend Integration

**Webhook Service**: `src/lib/webhook-service.ts`

- Sends real-time updates to WhatsApp via webhook
- Formats messages for WhatsApp
- Handles job summaries and invoice delivery
- Environment variable: `VITE_WEBHOOK_URL`

**Update Types**:
- `item_added` - New part/labor added
- `item_updated` - Item modified
- `item_removed` - Item deleted
- `item_made_free` - Item set to free
- `labor_updated` - Labor entry updated

---

### Audio Processing

**Technology**: Browser MediaRecorder API

**Implementation**:
- Records audio from microphone
- Chunks audio for processing
- Sends to transcription service
- Processes with AI agent

**Features**:
- Start/pause/resume recording
- Real-time transcript display
- Automatic chunking for long sessions

---

## 📦 Technology Stack

### Core

- **React** `^18.3.1` - UI framework
- **TypeScript** `^5.8.3` - Type safety
- **Vite** `^5.4.19` - Build tool and dev server

### UI & Styling

- **Tailwind CSS** `^3.4.17` - Utility-first CSS
- **shadcn/ui** - Component library
- **Radix UI** - Unstyled accessible components
- **lucide-react** `^0.462.0` - Icon library
- **recharts** `^2.15.4` - Chart library

### State & Data

- **@tanstack/react-query** `^5.83.0` - Server state
- **react-router-dom** `^6.30.1` - Routing
- **react-hook-form** `^7.61.1` - Form management
- **zod** `^3.25.76` - Schema validation

### AI & APIs

- **OpenAI API** - GPT-4o-mini for invoice extraction
- **Google Gemini API** - Customer message generation
- **Unsplash API** - Part images
- **Pexels API** - Fallback images
- **Webhook Service** - WhatsApp integration

### Development

- **ESLint** `^9.32.0` - Linting
- **TypeScript ESLint** `^8.38.0` - TS linting
- **PostCSS** `^8.5.6` - CSS processing
- **Autoprefixer** `^10.4.21` - CSS vendor prefixes

---

## 🔧 Setup & Installation

### Prerequisites

- **Node.js** 18+ (recommend using [nvm](https://github.com/nvm-sh/nvm))
- **npm** or **yarn** or **bun**
- **API Keys** (see Environment Variables below)

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd <PROJECT_NAME>

# Install dependencies
npm install
# or
yarn install
# or
bun install
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# OpenAI API Key (Required for invoice extraction)
VITE_OPENAI_API_KEY=your_openai_api_key_here

# Google Gemini API Key (Optional, for customer message generation)
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Webhook URL (Required for WhatsApp integration)
VITE_WEBHOOK_URL=https://your-webhook-endpoint.com/api/messages

# Unsplash Access Key (Optional, for part images)
VITE_UNSPLASH_ACCESS_KEY=your_unsplash_access_key

# Pexels API Key (Optional, fallback for part images)
VITE_PEXELS_API_KEY=your_pexels_api_key
```

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Getting API Keys

1. **OpenAI**: https://platform.openai.com/api-keys
2. **Google Gemini**: https://makersuite.google.com/app/apikey
3. **Unsplash**: https://unsplash.com/developers
4. **Pexels**: https://www.pexels.com/api/

---

## 📁 Project Structure

```
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── Layout.tsx      # Main layout wrapper
│   │   └── NavLink.tsx     # Navigation component
│   ├── pages/              # Page components
│   │   ├── Dashboard.tsx   # Main dashboard
│   │   ├── Agent.tsx       # Job management & transcription
│   │   ├── Invoices.tsx    # Invoice history
│   │   └── NotFound.tsx    # 404 page
│   ├── lib/                # Core utilities
│   │   ├── openai-agent.ts # AI invoice extraction
│   │   ├── webhook-service.ts # WhatsApp webhook integration
│   │   └── utils.ts        # Utility functions
│   ├── hooks/              # Custom React hooks
│   ├── App.tsx             # Root component
│   └── main.tsx            # Entry point
├── public/                 # Static assets
├── package.json            # Dependencies
├── vite.config.ts          # Vite configuration
├── tailwind.config.ts      # Tailwind configuration
└── tsconfig.json           # TypeScript configuration
```

---

## ✨ Key Features

### For Eric (Contractor)

- ✅ **No typing** - Everything is voice-controlled
- ✅ **No admin** - Invoice generates automatically
- ✅ **No missed charges** - AI catches everything mentioned
- ✅ **Hands-free** - Work while the app listens
- ✅ **Automatic invoices** - Structured, professional invoices
- ✅ **More professionalism** - Clean, detailed invoices

### For Jessica (Customer)

- ✅ **Total transparency** - Live updates on progress
- ✅ **Clear updates** - Simple, understandable messages
- ✅ **Trusted pricing** - Clear breakdown before payment
- ✅ **Smooth payment** - One-click payment link
- ✅ **No app required** - Everything via WhatsApp

### For the Business

- ✅ **Faster jobs** - Less time on paperwork
- ✅ **Repeat customers** - Better experience = loyalty
- ✅ **Clear audit trail** - Complete job history
- ✅ **Zero paperwork** - Fully digital
- ✅ **Professional experience at scale** - Consistent quality

---

## 🎯 Why This Flow Is Perfect

### Hands-Free Efficiency
Contractors can work naturally while the system captures everything automatically. No stopping to type or fill forms.

### Customer Trust
Real-time updates via WhatsApp keep customers informed without being intrusive. Transparency builds trust.

### Professional Invoices
Automatically generated invoices are detailed, accurate, and ready to send. No manual compilation needed.

### Seamless Payment
Integrated payment links in WhatsApp make payment instant and frictionless.

### Scalable
AI handles the heavy lifting, allowing businesses to scale without proportionally increasing admin overhead.

---

## 🔮 Future Enhancements

- [ ] Multi-language support
- [ ] Offline mode for contractors
- [ ] Advanced analytics dashboard
- [ ] Customer feedback integration
- [ ] Automated scheduling optimization
- [ ] Integration with accounting software
- [ ] Mobile app (native iOS/Android)
- [ ] Voice command training/customization
- [ ] Team management features
- [ ] Customer portal

---

## 🤝 Contributing

This is a proprietary project. For contributions or questions, please contact the project maintainers.

---

## 📄 License

Proprietary - All rights reserved

---

## 🙏 Acknowledgments

Built with:
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [shadcn/ui](https://ui.shadcn.com/)
- [OpenAI](https://openai.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

**Built with ❤️ for service professionals who deserve better tools.**
