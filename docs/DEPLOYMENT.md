# 🚀 AI CRM — Deployment Guide

คู่มือการติดตั้งและ Deploy ระบบ AI CRM อย่างละเอียด

---

## 📋 สารบัญ

1. [System Requirements](#system-requirements)
2. [Architecture Overview](#architecture-overview)
3. [Local Development Setup](#local-development-setup)
4. [Production Deployment](#production-deployment)
5. [LINE OA Integration](#line-oa-integration)
6. [Cloudflare Tunnel Setup](#cloudflare-tunnel-setup)
7. [Troubleshooting](#troubleshooting)

---

## System Requirements

### ซอฟต์แวร์ที่ต้องติดตั้ง

| ซอฟต์แวร์ | เวอร์ชันขั้นต่ำ | หมายเหตุ |
|-----------|---------------|----------|
| **Node.js** | 18.x+ | แนะนำ 20.x LTS |
| **npm** | 9.x+ | มาพร้อม Node.js |
| **PostgreSQL** | 15+ | หรือใช้ Docker |
| **Docker** (optional) | 20+ | สำหรับรัน PostgreSQL |
| **Git** | 2.x+ | สำหรับ clone repo |
| **cloudflared** (optional) | latest | สำหรับ expose ผ่าน Cloudflare Tunnel |

### Hardware Requirements

| Environment | CPU | RAM | Disk |
|-------------|-----|-----|------|
| Development | 2 cores | 4 GB | 2 GB |
| Production | 2+ cores | 4+ GB | 10+ GB |

---

## Architecture Overview

```
┌────────────────────────────────────────────────────┐
│                   INTERNET                         │
│                                                    │
│  ┌──────────┐    ┌───────────┐    ┌────────────┐  │
│  │ Browser  │    │ LINE OA   │    │ Cloudflare │  │
│  │ (Users)  │    │ Platform  │    │   Tunnel   │  │
│  └────┬─────┘    └─────┬─────┘    └─────┬──────┘  │
└───────┼────────────────┼────────────────┼──────────┘
        │                │                │
        ▼                ▼                ▼
┌───────────────┐ ┌─────────────┐ ┌────────────────┐
│   Frontend    │ │   Backend   │ │   PostgreSQL   │
│   Next.js     │ │   Express   │ │   Database     │
│   Port 3000   │ │   Port 4000 │ │   Port 5432    │
│               │ │             │ │                │
│ • Dashboard   │ │ • REST API  │ │ • Users        │
│ • Leads       │ │ • Auth/JWT  │ │ • Companies    │
│ • Contacts    │ │ • LINE Hook │ │ • Contacts     │
│ • Companies   │ │ • AI Engine │ │ • Leads        │
│ • Login       │ │ • File Mgmt │ │ • Activities   │
└───────────────┘ └─────────────┘ │ • Messages     │
                                  │ • Tasks        │
                                  │ • Attachments  │
                                  └────────────────┘
```

### Tech Stack

- **Frontend:** Next.js 16, React 19, TailwindCSS 4, Lucide Icons
- **Backend:** Express 5, Prisma ORM, JWT Auth, Multer (file upload)
- **Database:** PostgreSQL 16
- **AI:** OpenAI-compatible API (Gemini / GPT / Custom Gateway)
- **Messaging:** LINE Messaging API

---

## Local Development Setup

### Step 1: Clone Repository

```bash
git clone https://github.com/tiannys/ai-crm-mvp.git
cd ai-crm-mvp
```

### Step 2: Start PostgreSQL

**Option A: ใช้ Docker (แนะนำ)**

```bash
docker compose up -d
```

ระบบจะสร้าง PostgreSQL container:
- Host: `localhost:5432`
- Database: `ai_crm`
- User: `crm_user`
- Password: `crm_secret_2026`

**Option B: ใช้ PostgreSQL ที่ติดตั้งเอง**

```sql
CREATE DATABASE ai_crm;
CREATE USER crm_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE ai_crm TO crm_user;
```

### Step 3: ตั้งค่า Environment Variables

#### Frontend (.env.local)

```bash
cp .env.example .env.local
```

แก้ไข `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

#### Backend (backend/.env)

```bash
cp backend/.env.example backend/.env
```

แก้ไข `backend/.env`:

```env
# ─── Database ────────────────────────────────────────
DATABASE_URL="postgresql://crm_user:crm_secret_2026@localhost:5432/ai_crm?schema=public"

# ─── Auth ────────────────────────────────────────────
JWT_SECRET="your-random-secret-at-least-32-chars-long"

# ─── AI Provider (เลือกอย่างใดอย่างหนึ่ง) ───────────
# Google Gemini (ฟรี)
OPENAI_API_KEY="your-gemini-api-key"
OPENAI_BASE_URL="https://generativelanguage.googleapis.com/v1beta/openai/"
OPENAI_MODEL="gemini-2.0-flash"

# ─── LINE OA (ข้ามได้ถ้ายังไม่ใช้) ──────────────────
LINE_CHANNEL_ID=""
LINE_CHANNEL_SECRET=""
LINE_CHANNEL_ACCESS_TOKEN=""
LINE_USE_MOCK="true"

# ─── CORS ────────────────────────────────────────────
FRONTEND_URL="http://localhost:3000"

# ─── Server ──────────────────────────────────────────
PORT=4000
NODE_ENV="development"
```

### Step 4: ติดตั้ง Dependencies

```bash
# Frontend
npm install

# Backend
cd backend
npm install
cd ..
```

### Step 5: Initialize Database

```bash
cd backend
npx prisma db push --schema=../prisma/schema.prisma
npx prisma generate --schema=../prisma/schema.prisma
```

### Step 6: Seed ข้อมูลตัวอย่าง (Optional)

```bash
cd backend
npm run db:seed
```

ระบบจะสร้าง:
- **Sample users:** passwords are set from the required `SEED_PASSWORD` environment variable
- **Sample contacts, companies, leads** สำหรับทดสอบ

### Step 7: รัน Development Servers

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```
→ Backend รันที่ `http://localhost:4000`

**Terminal 2 — Frontend:**
```bash
npm run dev
```
→ Frontend รันที่ `http://localhost:3000`

### Step 8: เปิดใช้งาน

เปิด browser ไปที่ `http://localhost:3000`

Login with an account created by the seed process and the configured `SEED_PASSWORD`.

---

## Production Deployment

### Option A: Traditional Server (VPS / Bare Metal)

#### 1. Build Frontend

```bash
npm run build
```

#### 2. Build Backend

```bash
cd backend
npm run build
```

#### 3. รัน Production

```bash
# Backend
cd backend
NODE_ENV=production node dist/server.js

# Frontend
cd ..
npm start
```

#### 4. ใช้ Process Manager (แนะนำ PM2)

```bash
npm install -g pm2

# Backend
pm2 start backend/dist/server.js --name ai-crm-backend

# Frontend
pm2 start npm --name ai-crm-frontend -- start

# Save & auto-restart
pm2 save
pm2 startup
```

### Option B: Docker Deployment

สร้าง `Dockerfile` สำหรับ production:

```dockerfile
# Backend
FROM node:20-alpine AS backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --production
COPY backend/ ./
COPY prisma/ ../prisma/
RUN npx prisma generate --schema=../prisma/schema.prisma
RUN npm run build

# Frontend
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

EXPOSE 3000 4000
```

### Environment Variables สำหรับ Production

```env
# Backend
DATABASE_URL="postgresql://user:password@db-host:5432/ai_crm"
JWT_SECRET="super-long-random-secret-string-production"
FRONTEND_URL="https://your-domain.com"
NODE_ENV="production"
PORT=4000

# Frontend (.env.local)
NEXT_PUBLIC_API_URL="https://api.your-domain.com"
```

---

## LINE OA Integration

### Step 1: สร้าง LINE Messaging API Channel

1. ไปที่ [LINE Developers Console](https://developers.line.biz/console/)
2. สร้าง Provider → สร้าง Messaging API Channel
3. เข้า Channel Settings → คัดลอก:
   - **Channel ID**
   - **Channel Secret**
   - **Channel Access Token** (ต้องกด Issue ก่อน)

### Step 2: ตั้งค่า Webhook URL

ใน LINE Developers Console → Messaging API:

```
Webhook URL: https://your-api-domain.com/api/line/webhook
```

- ✅ Use webhook: เปิด
- ❌ Auto-reply messages: ปิด
- ❌ Greeting messages: ปิด

### Step 3: อัพเดต Environment Variables

```env
LINE_CHANNEL_ID="your-channel-id"
LINE_CHANNEL_SECRET="your-channel-secret"
LINE_CHANNEL_ACCESS_TOKEN="your-access-token"
LINE_USE_MOCK="false"    # ← เปลี่ยนเป็น false
```

### Step 4: ทดสอบ

1. เพิ่ม LINE OA เป็นเพื่อน (QR Code จาก Developers Console)
2. ส่งข้อความใน LINE
3. ตรวจสอบว่าข้อความปรากฏในระบบ CRM → Contacts

---

## Cloudflare Tunnel Setup

สำหรับ expose local server สู่ internet โดยไม่ต้อง port forward:

### Step 1: ติดตั้ง cloudflared

```bash
# Windows (winget)
winget install cloudflare.cloudflared

# macOS
brew install cloudflared

# Linux
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
```

### Step 2: Login & สร้าง Tunnel

```bash
cloudflared tunnel login
cloudflared tunnel create ai-crm
```

### Step 3: สร้าง Config File

สร้างไฟล์ `~/.cloudflared/config-ai-crm.yml`:

```yaml
tunnel: <TUNNEL_ID>
credentials-file: ~/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: ai-crm.your-domain.com
    service: http://localhost:3000
  - hostname: ai-crm-api.your-domain.com
    service: http://localhost:4000
  - service: http_status:404
```

### Step 4: ตั้ง DNS

```bash
cloudflared tunnel route dns ai-crm ai-crm.your-domain.com
cloudflared tunnel route dns ai-crm ai-crm-api.your-domain.com
```

### Step 5: รัน Tunnel

```bash
cloudflared tunnel --config ~/.cloudflared/config-ai-crm.yml run ai-crm
```

---

## Troubleshooting

### ปัญหาที่พบบ่อย

| ปัญหา | สาเหตุ | วิธีแก้ |
|--------|--------|---------|
| `ECONNREFUSED :5432` | PostgreSQL ไม่ได้รัน | `docker compose up -d` |
| `401 Unauthorized` | Token หมดอายุ/ผิด | Logout แล้ว Login ใหม่ |
| CORS Error | FRONTEND_URL ไม่ตรง | ตรวจสอบ `FRONTEND_URL` ใน backend/.env |
| `Invalid DateTime` | expectedClose format ผิด | Backend จะ auto-convert ให้แล้ว |
| Modal ตกไปข้างล่าง | backdrop-filter CSS issue | ใช้ Portal component (แก้แล้ว) |
| 500 on Lead update | Prisma validation | ตรวจสอบ field types ใน request body |

### ตรวจสอบ Logs

```bash
# Backend logs (development)
cd backend && npm run dev

# Backend logs มี structured JSON logging ผ่าน Pino
# ดู error ได้จาก console output โดยตรง
```

### Database Reset

```bash
cd backend
npx prisma db push --schema=../prisma/schema.prisma --force-reset
npm run db:seed
```

> ⚠️ **คำเตือน:** คำสั่งนี้จะลบข้อมูลทั้งหมดในฐานข้อมูล

---

## Project Structure

```
ai-crm/
├── src/                          # Frontend (Next.js)
│   ├── app/
│   │   ├── dashboard/            # หน้า Dashboard หลัก
│   │   │   ├── leads/            # จัดการ Leads
│   │   │   ├── contacts/         # จัดการ Contacts
│   │   │   ├── companies/        # จัดการ Companies
│   │   │   ├── layout.tsx        # Dashboard layout + sidebar
│   │   │   └── page.tsx          # Dashboard overview
│   │   ├── login/                # หน้า Login
│   │   ├── globals.css           # Design system CSS
│   │   └── layout.tsx            # Root layout
│   ├── components/
│   │   ├── modals/               # Form modals (Lead, Contact, Company)
│   │   ├── KanbanBoard.tsx       # Kanban board component
│   │   ├── GlobalSearch.tsx      # Global search (Ctrl+K)
│   │   └── Portal.tsx            # React Portal for modals
│   └── lib/
│       ├── api.ts                # API client + auth helpers
│       └── utils.ts              # Utility functions
├── backend/                      # Backend (Express)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts           # Login/register/me
│   │   │   ├── crm.ts            # CRUD leads/contacts/companies
│   │   │   └── line.ts           # LINE webhook + messaging
│   │   ├── services/
│   │   │   ├── crm.service.ts    # Business logic
│   │   │   └── ai.service.ts     # AI scoring & summaries
│   │   ├── lib/
│   │   │   ├── auth.ts           # JWT middleware
│   │   │   └── prisma.ts         # Prisma client
│   │   └── server.ts             # Express server entry
│   └── uploads/                  # File attachments storage
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── seed.ts                   # Seed data
├── docker-compose.yml            # PostgreSQL container
└── .env.example                  # Environment template
```
