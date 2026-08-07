# AI CRM MVP — Jenosize

An AI-powered CRM system for sales teams with LINE OA integration, built as a test assignment for the Lead AI Software Engineer position at Jenosize.

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [🚀 Deployment Guide](docs/DEPLOYMENT.md) | การติดตั้ง, Production deploy, LINE OA, Cloudflare Tunnel |
| [📖 User Manual](docs/USER_MANUAL.md) | คู่มือการใช้งานระบบอย่างละเอียด (ภาษาไทย) |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (or Supabase free tier)
- (Optional) OpenAI API key
- (Optional) LINE Official Account

### 1. Clone & Install
```bash
git clone https://github.com/tiannys/ai-crm-mvp.git
cd ai-crm-mvp
npm install
cd backend && npm install && cd ..
```

### 2. Environment Setup
```bash
cp .env.example .env.local
cp backend/.env.example backend/.env

# Frontend: set NEXT_PUBLIC_API_URL (for example, http://localhost:4000)
# Backend: set DATABASE_URL, JWT_SECRET, FRONTEND_URL, TRUST_PROXY_HOPS, and provider credentials
# Optional: set WEBSITE_LEAD_OWNER_EMAIL to an active CRM user who should receive website leads
```

### 3. Database Setup
```bash
cd /opt/ai-crm-mvp

# Start PostgreSQL first when using the included Docker Compose service.
# Skip this step when DATABASE_URL points to an existing PostgreSQL server.
docker compose up -d db
docker compose ps db

# Prisma migrations are stored at the project root, while DATABASE_URL is in
# backend/.env. Use a subshell so backend variables such as NODE_ENV do not
# remain exported in the shell used to build the frontend.
(
  set -a
  source backend/.env
  set +a

  # Recommended: apply versioned migrations
  npx prisma migrate deploy

  # Development alternative (use instead of migrate deploy): npm run db:push

  # Optional: seed synthetic data. Set SEED_PASSWORD (minimum 12 characters)
  # in backend/.env first; never commit it.
  # npm run db:seed
)
```

### 4. Run Development Servers
```bash
# Terminal 1 — frontend
npm run dev
# Open http://localhost:3000

# Terminal 2 — backend
cd backend
npm run dev
# API runs at http://localhost:4000 and loads backend/.env automatically
```

### 5. Production Build on Linux

Do not export `NODE_ENV=development` from `backend/.env` into the shell used to
build Next.js. On a production server, set `NODE_ENV="production"` in
`backend/.env` and run:

```bash
cd /opt/ai-crm-mvp
unset NODE_ENV
NODE_ENV=production npm run build
npm --prefix backend run build
```

If backend variables are needed for a one-off command, load them inside a
subshell as shown in [Database Setup](#3-database-setup). `set +a` stops future
automatic exports but does not unset variables that were already exported.

### RBAC Permission Matrix
| Action | Admin | Manager | Sales |
|--------|-------|---------|-------|
| View all leads | ✅ | ✅ | ❌ own only |
| Create lead | ✅ | ✅ | ✅ |
| Edit lead | ✅ | ✅ | ✅ own only |
| Delete lead/contact/company | ✅ | ❌ | ❌ |
| Manage users (create/disable/delete) | ✅ | ❌ | ❌ |
| Dashboard (all data) | ✅ | ✅ | ❌ own leads only |
| AI copilot | ✅ | ✅ | ✅ |
| LINE integration | ✅ | ✅ | ✅ |

---

## 🏗 Architecture

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, Custom dark design system |
| Backend | Express.js + TypeScript (standalone, port 4000) |
| Database | PostgreSQL 16 + Prisma ORM |
| AI | Multi-provider: OpenAI / Gemini Gateway / Heuristic Fallback |
| LINE | LINE Messaging API (Real + Mock adapter) |
| Auth | JWT (stateless, bcrypt password hash) |
| Security | Rate limiting (express-rate-limit), RBAC (3 roles) |
| Attachments | Authenticated upload/download, local filesystem metadata in PostgreSQL |
| Audit | Comprehensive audit log (login/logout, CRUD, exports) |
| CI/CD | GitHub Actions (lint + test + build on every push/PR) |
| Tunnel | Cloudflare Tunnel (ai-crm / ai-crm-api subdomains) |

### System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Browser["🌐 CRM User<br/>React + Tailwind"]
        Visitor["🌐 Public Visitor<br/>Landing & Form"]
        LINEAPP["💬 LINE App<br/>End User"]
    end

    subgraph "Local Application"
        subgraph "Frontend - App Router"
            Landing["Landing Page /"]
            Inquiry["Inquiry Form /inquiry"]
            Login["Login Page"]
            Dashboard["Dashboard"]
            Leads["Leads List"]
            LeadDetail["Lead Detail<br/>Timeline | Messages | AI"]
            Contacts["Contacts"]
            Companies["Companies"]
        end

        subgraph "API Routes"
            PUBLIC_API["/api/public/*<br/>Public Lead Capture"]
            CRM_API["/api/crm/*<br/>CRUD + Search"]
            AI_API["/api/ai/*<br/>Summary | Score | Action | Reply"]
            LINE_API["/api/line/*<br/>Webhook | Reply"]
            AUTH_API["/api/auth/*<br/>NextAuth.js"]
        end

        subgraph "Service Layer"
            CRM_SVC["CRM Service<br/>Business Logic"]
            PUBLIC_SVC["Public Lead Service<br/>Lead Capture & Assignment"]
            AI_SVC["AI Service<br/>OpenAI + Fallback"]
            LINE_SVC["LINE Service<br/>Real / Mock Adapter"]
        end
    end

    subgraph "External Services"
        OpenAI["🤖 OpenAI<br/>GPT-4o-mini"]
        LINE_MSG["💚 LINE Messaging API"]
    end

    subgraph "Data Layer"
        PG["🐘 PostgreSQL 16<br/>7 Tables"]
        Prisma["Prisma ORM"]
    end

    Visitor --> Landing & Inquiry
    Inquiry --> PUBLIC_API
    Browser --> Login & Dashboard & Leads & LeadDetail & Contacts & Companies
    Login --> AUTH_API
    Dashboard & Leads & LeadDetail & Contacts & Companies --> CRM_API
    LeadDetail --> AI_API
    LINEAPP --> LINE_MSG --> LINE_API

    PUBLIC_API --> PUBLIC_SVC
    CRM_API --> CRM_SVC
    AI_API --> AI_SVC
    LINE_API --> LINE_SVC

    PUBLIC_SVC --> Prisma
    CRM_SVC --> Prisma
    AI_SVC --> OpenAI
    AI_SVC -.->|fallback| CRM_SVC
    LINE_SVC --> LINE_MSG
    LINE_SVC --> Prisma

    Prisma --> PG
```

### Data Flow Diagram

```mermaid
flowchart LR
    subgraph "Inbound Channels"
        WEB["🌐 Website Form"]
        MANUAL["✍️ Manual Entry"]
        LINE_IN["💬 LINE Message"]
    end

    subgraph "Processing"
        WEBHOOK["Webhook Handler<br/>Signature Verify<br/>Idempotency Check"]
        CRM["CRM Service<br/>Create/Update Lead<br/>Log Activity"]
        AI["AI Service<br/>Summary | Score<br/>Next Action | Draft"]
    end

    subgraph "Data Store"
        DB[("PostgreSQL<br/>Users · Companies<br/>Contacts · Leads<br/>Activities · Messages<br/>LineEvents")]
    end

    subgraph "Outbound"
        UI["📊 CRM Dashboard"]
        LINE_OUT["💬 LINE Reply<br/>(Approval Required)"]
    end

    WEB --> CRM
    MANUAL --> CRM
    LINE_IN --> WEBHOOK --> CRM
    CRM --> DB
    DB --> AI
    DB --> UI
    AI -->|"draft (human review)"| LINE_OUT
    CRM -->|"approved reply"| LINE_OUT
```

### LINE Reply Flow (Human-in-the-Loop)

```mermaid
sequenceDiagram
    participant User as LINE User
    participant LINE as LINE Platform
    participant WH as Webhook Handler
    participant DB as Database
    participant AI as AI Service
    participant Sales as Sales Rep
    
    User->>LINE: Send message
    LINE->>WH: POST /api/line/webhook
    WH->>WH: Verify HMAC-SHA256 signature
    WH->>DB: Check webhookEventId (idempotency)
    WH->>DB: Find/create Contact by lineUserId
    WH->>DB: Save Message (INBOUND)
    WH->>DB: Save LineEvent (PROCESSED)
    
    Sales->>AI: Request draft reply
    AI->>DB: Gather lead context
    AI-->>Sales: Draft reply (suggestion only)
    
    Sales->>Sales: Review & edit draft
    
    alt Approve
        Sales->>DB: Update Message status → APPROVED
        DB->>LINE: Send reply via Messaging API
        DB->>DB: Log Activity (LINE_MESSAGE)
    else Reject
        Sales->>DB: Update Message status → FAILED
    end
```

### Key Design Decisions
1. **Next.js monolith** over separate backend — reduces deployment complexity for MVP
2. **AI suggestions ≠ confirmed actions** — human-in-the-loop for all AI outputs
3. **LINE reply requires approval** — draft → approve → send flow with audit trail
4. **Idempotent webhook processing** — LineEvent table prevents duplicate processing
5. **Graceful AI fallback** — rule-based heuristics when OpenAI is unavailable

---

## 📡 API Reference

Backend runs on `http://localhost:4000`. All `/api/crm/*` and `/api/ai/*` routes require `Authorization: Bearer <token>`.

Login attempts are rate-limited independently. Authenticated `/api/auth/me` and `/api/auth/logout` requests do not consume the login-attempt quota.

### Reverse Proxy Configuration

`TRUST_PROXY_HOPS` must match the production network path so Express and the rate limiter derive the correct client IP. The secure default is `0`.

| Deployment path | Value |
|-----------------|-------|
| Client → Express directly | `TRUST_PROXY_HOPS=0` |
| Client → Nginx or Cloudflare Tunnel → Express | `TRUST_PROXY_HOPS=1` |
| Client → CDN → load balancer → Express | Set the exact verified proxy-hop count |

Do not set a non-zero value when Express is directly internet-facing: clients could spoof forwarded IP headers and bypass per-IP rate limits. If production has routes with different proxy-chain lengths, configure trusted proxy IP ranges instead of a numeric hop count.

### Auth (`/api/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | No | Login with email/password → returns JWT token |
| GET | `/api/auth/me` | Yes | Get current user info from token |

### CRM (`/api/crm`) — All require auth

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/crm/dashboard` | Dashboard stats (counts, pipeline, recent activity) |
| GET | `/api/crm/search?q=` | Global search across leads, contacts, companies |
| **Leads** | | |
| GET | `/api/crm/leads?page=&stage=&source=&search=` | List leads with pagination + filters |
| GET | `/api/crm/leads/:id` | Lead detail with relations (company, contact, activities, messages) |
| POST | `/api/crm/leads` | Create lead `{ title, ownerId, companyId?, contactId?, value?, source? }` |
| PUT | `/api/crm/leads/:id` | Update lead fields (including stage transitions) |
| DELETE | `/api/crm/leads/:id` | Delete lead (cascades activities/attachments) |
| GET | `/api/crm/leads/:id/activities` | List activities for a lead |
| POST | `/api/crm/leads/:id/activities` | Add activity `{ type, description }` |
| GET | `/api/crm/leads/:id/messages` | List messages for a lead |
| GET | `/api/crm/leads/:id/attachments` | List attachments for a lead |
| POST | `/api/crm/leads/:id/attachments` | Upload file (multipart, 20MB max) |
| GET | `/api/crm/attachments/:id/download` | Download attachment using the Bearer token header |
| DELETE | `/api/crm/attachments/:id` | Delete attachment |
| **Contacts** | | |
| GET | `/api/crm/contacts?page=&search=` | List contacts with pagination |
| GET | `/api/crm/contacts/:id` | Contact detail with company, leads, messages |
| POST | `/api/crm/contacts` | Create contact `{ firstName, lastName, email?, phone?, companyId? }` |
| PUT | `/api/crm/contacts/:id` | Update contact fields |
| DELETE | `/api/crm/contacts/:id` | Delete contact |
| GET | `/api/crm/contacts/:id/messages` | List messages for a contact |
| POST | `/api/crm/contacts/:id/create-lead` | Create lead directly from contact |
| **Companies** | | |
| GET | `/api/crm/companies?page=&search=` | List companies with pagination |
| GET | `/api/crm/companies/:id` | Company detail with contacts, leads |
| POST | `/api/crm/companies` | Create company `{ name, industry?, website? }` |
| PUT | `/api/crm/companies/:id` | Update company fields |
| DELETE | `/api/crm/companies/:id` | Delete company |
| **Tasks** | | |
| GET | `/api/crm/tasks?leadId=&status=` | List tasks with filters |
| POST | `/api/crm/tasks` | Create task `{ title, leadId?, assigneeId, priority?, dueDate? }` |
| PUT | `/api/crm/tasks/:id` | Update task (status, title, etc.) |
| DELETE | `/api/crm/tasks/:id` | Delete task |

### Public Website Lead Capture

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/public/leads` | No | Validate an inquiry and create Contact, Company (when supplied), and a `NEW`/`WEBSITE` Lead in a single transaction |

**Features & Workflow:**
- **Public Entry Points**: `/` serves as the public landing page and `/inquiry` provides the customer lead capture form.
- **Immediate Lead Creation**: Creates `Company`, `Contact`, and `Lead` in a single database transaction. Lead stage is automatically set to `NEW` and source to `WEBSITE` for team review.
- **Smart Owner Assignment**: Assigns the lead to `WEBSITE_LEAD_OWNER_EMAIL`. If unset or inactive, assigns to the oldest active `SALES` user, falling back to active `MANAGER`/`ADMIN`.
- **Activity & Audit Trail**: Automatically logs the creation in the Lead Activity timeline and system Audit Log (`LEAD`, `CREATE`).
- **Security & Bot Protection**: Rate-limited to 5 submissions / 15 minutes / IP with a honeypot field. Public clients cannot set `ownerId`, `stage`, or `source`.

### AI (`/api/ai`) — All require auth

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/ai/summarize` | `{ leadId }` | Generate AI lead summary (with fallback) |
| POST | `/api/ai/score` | `{ leadId }` | Generate qualification score 0-100 (with fallback) |
| POST | `/api/ai/next-action` | `{ leadId }` | Suggest next best action (with fallback) |
| POST | `/api/ai/draft-reply` | `{ leadId }` | Generate draft LINE reply (with fallback) |

### LINE (`/api/line`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/line/webhook` | LINE signature | Receive LINE webhook events (HMAC-SHA256 verified) |
| GET | `/api/line/webhook` | No | Health check for LINE webhook |
| POST | `/api/line/draft` | Yes | Create outbound draft message for a lead |
| POST | `/api/line/reply` | Yes | Approve/edit/reject a draft message `{ messageId, action }` |
| POST | `/api/line/push` | Yes | Push message directly to a LINE contact |

### Users (`/api/users`) — ADMIN only

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users` | List all users with stats |
| POST | `/api/users` | Create user `{ email, name, password, role? }` |
| PUT | `/api/users/:id` | Update user name/role/password |
| PUT | `/api/users/:id/toggle-active` | Enable/disable user (cannot self-disable) |
| DELETE | `/api/users/:id` | Delete user (cannot self-delete, must reassign leads first) |

### Audit Log (`/api/audit`) — ADMIN only

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/audit` | Query audit logs with filters `?entity=LEAD&action=CREATE&page=1&limit=50` |

### Data Export (`/api/export`) — Auth required

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/export/leads` | Export leads as CSV (SALES: own leads only) |
| GET | `/api/export/contacts` | Export all contacts as CSV |

### Common Response Formats

**Success**: `{ data: ..., total?, page?, totalPages? }`

**Error**: `{ error: "message" }` with appropriate HTTP status code

**AI Response**: `{ success: true, data: { ... }, fallback?: true }` — `fallback: true` indicates heuristic response

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

### Test Coverage
- `tests/crm.test.ts` — Core CRM CRUD, stage transitions, search
- `tests/ai-skill.test.ts` — AI behaviors, fallback when API unavailable
- `tests/line-webhook.test.ts` — Webhook signature verification, idempotency
- `tests/public-lead.test.ts` — Public website lead capture (rate limiting, single transaction, owner assignment, honeypot)

---

## 🤖 AI CRM Copilot

See [`skills/crm-copilot/SKILL.md`](skills/crm-copilot/SKILL.md) for the full skill definition.

### Features
1. **Lead Summary** — AI-generated overview with key points and sentiment
2. **Qualification Score** — 0-100 score with breakdown reasons
3. **Next Best Action** — Prioritized recommendation with timeline
4. **Draft LINE Reply** — Context-aware message draft requiring approval

### Guardrails
- AI outputs are labeled as suggestions, never auto-executed
- LINE replies require human approval before sending
- Fallback to rule-based logic when OpenAI is unavailable
- All AI actions logged in activity timeline

---

## 💬 LINE OA Integration

### Setup
1. Create a LINE Official Account at https://developers.line.biz
2. Enable Messaging API
3. Set webhook URL: `https://your-domain.com/api/line/webhook`
4. Copy Channel ID, Secret, and Access Token to `backend/.env`

### Features
- Webhook signature verification (HMAC-SHA256)
- Inbound message capture and contact mapping
- Approval-based reply flow
- Idempotent event processing (retry-safe)
- Mock adapter for local testing (`LINE_USE_MOCK=true`)

---

## 📦 Local Setup

### Run the application

The application currently runs locally as two processes. PostgreSQL may be
local or hosted, depending on the `DATABASE_URL` value.

```bash
# Terminal 1: start the Next.js frontend
npm run dev

# Terminal 2: start the Express backend
cd backend
npm run dev
```

Open `http://localhost:3000`; the backend API runs at
`http://localhost:4000`. Copy the root and backend `.env.example` files before
starting, then apply migrations and seed synthetic data as described in
[Quick Start](#-quick-start).

---

## 🤖 AI Usage Log

See [`docs/AI_USAGE_LOG.md`](docs/AI_USAGE_LOG.md) for the full log including:
- Sample tasks/prompts given to AI coding assistant
- What was reviewed, modified, and rejected after human inspection
- One meaningful change: AI auto-send → human approval flow

**Key stats**: ~30 AI-assisted tasks, ~40% accepted as-is, ~45% modified, ~15% rejected.

---

## 📊 Monitoring & Observability

### Current Implementation
- **Structured logging** via Pino with child loggers per service (`crm`, `ai`, `line-webhook`)
- **Request-level context**: All API errors logged with stack traces and request metadata
- **LINE event tracking**: Every webhook event persisted with processing status (RECEIVED → PROCESSED/FAILED)
- **AI usage tracking**: All AI calls logged with fallback flag

### Production Recommendations
- **Error tracking**: Sentry for frontend + backend error capture
- **APM**: Datadog or New Relic for request latency, DB query performance
- **Alerting**: PagerDuty/Opsgenie for webhook failure rate > 5%
- **Dashboards**: Grafana for pipeline conversion rates, AI usage metrics
- **Log aggregation**: Ship Pino JSON logs to ELK/Loki

---

## 💬 LINE OA Test Instructions

### Local Testing (Mock Mode)
The CRM runs with `LINE_USE_MOCK=true` by default. The mock adapter:
- Accepts all webhook requests without signature verification
- Logs outbound messages to console instead of sending to LINE
- Returns success responses for all reply operations

### With Real LINE OA Account
1. Create a LINE Official Account at [developers.line.biz](https://developers.line.biz)
2. Enable **Messaging API** in the channel settings
3. Copy credentials to `backend/.env`:
   ```
   LINE_CHANNEL_ID=<your-channel-id>
   LINE_CHANNEL_SECRET=<your-channel-secret>
   LINE_CHANNEL_ACCESS_TOKEN=<your-access-token>
   LINE_USE_MOCK=false
   ```
4. Set webhook URL: `https://<your-domain>/api/line/webhook`
5. Enable "Use webhook" in LINE console
6. Scan QR code in LINE console to add the bot as a friend
7. Send a message → it appears in CRM under the mapped contact

---

## 📋 Known Limitations & Production Next Steps

### Known Limitations
- Auth uses JWT credential provider (not OAuth/SSO)
- No real-time updates (polling-based)
- No email integration (LINE OA and manual only)
- Attachments use local disk storage; multi-instance production deployments need shared object storage

### Production Roadmap
- [ ] WebSocket/SSE for real-time lead updates
- [ ] Redis cache for AI responses
- [ ] Email integration (SendGrid/SES)
- [ ] Move attachments to S3-compatible object storage
- [ ] Monitoring & alerting (Sentry, Datadog)

---

## 📝 License

This is a test assignment project. Not for production use.
