# 📖 AI CRM — คู่มือการใช้งาน (User Manual)

คู่มือการใช้งานระบบ AI CRM อย่างละเอียด สำหรับผู้ใช้งานทุกระดับ

---

## 📋 สารบัญ

1. [เริ่มต้นใช้งาน (Getting Started)](#1-เริ่มต้นใช้งาน)
2. [Dashboard — ภาพรวมธุรกิจ](#2-dashboard--ภาพรวมธุรกิจ)
3. [Leads — จัดการโอกาสขาย](#3-leads--จัดการโอกาสขาย)
4. [Contacts — จัดการผู้ติดต่อ](#4-contacts--จัดการผู้ติดต่อ)
5. [Companies — จัดการบริษัท](#5-companies--จัดการบริษัท)
6. [ฟีเจอร์เพิ่มเติม](#6-ฟีเจอร์เพิ่มเติม)
7. [คำถามที่พบบ่อย (FAQ)](#7-คำถามที่พบบ่อย)

---

## 1. เริ่มต้นใช้งาน

### 1.1 เข้าสู่ระบบ (Login)

1. เปิด browser ไปที่ URL ของระบบ (เช่น `https://ai-crm.your-domain.com`)
2. ระบบจะแสดงหน้า Login
3. กรอก **Email** และ **Password**
4. คลิก **Sign In**

> 💡 **บัญชีเริ่มต้น:** `seed-admin-legacy@example.invalid` / `[removed]` (ควรเปลี่ยนรหัสผ่านหลังใช้งานจริง)

### 1.2 ส่วนประกอบของระบบ

หลังจาก Login สำเร็จ จะเห็นหน้า Dashboard พร้อม:

| ส่วนประกอบ | ตำแหน่ง | หน้าที่ |
|-----------|---------|--------|
| **Sidebar** | ด้านซ้าย | เมนูหลัก (Dashboard, Leads, Contacts, Companies) |
| **Header** | ด้านบน | ชื่อหน้าปัจจุบัน + ปุ่ม Search (⌘K) |
| **Content** | ตรงกลาง | เนื้อหาของหน้าที่เลือก |
| **User Info** | ล่างซ้าย | ชื่อผู้ใช้ + ปุ่ม Logout |

### 1.3 Global Search (ค้นหาทั้งระบบ)

- กดปุ่ม **Search** ที่มุมขวาบน หรือกด `Ctrl + K` (Windows) / `⌘ + K` (Mac)
- พิมพ์คำค้นหา → ระบบจะค้นใน Leads, Contacts, Companies พร้อมกัน
- คลิกผลลัพธ์เพื่อไปยังหน้ารายละเอียด

---

## 2. Dashboard — ภาพรวมธุรกิจ

Dashboard แสดงข้อมูลสรุปทั้งหมดในหน้าเดียว:

### 2.1 สถิติหลัก (Stat Cards)

| การ์ด | แสดงอะไร |
|-------|---------|
| **Total Leads** | จำนวน Lead ทั้งหมดในระบบ |
| **Pipeline Value** | มูลค่ารวมของ Lead ที่ยังอยู่ใน pipeline |
| **Won Deals** | จำนวน Lead ที่ปิดการขายสำเร็จ (WON) |
| **Contacts** | จำนวน Contact ทั้งหมด |

### 2.2 กราฟและข้อมูลเพิ่มเติม

- **Pipeline by Stage** — แสดงสัดส่วน Lead ในแต่ละ Stage
- **Recent Activities** — กิจกรรมล่าสุดในระบบ
- **Latest Leads** — รายการ Lead ที่สร้างล่าสุด

---

## 3. Leads — จัดการโอกาสขาย

Lead คือ "โอกาสขาย" หรือ "ดีล" ที่กำลังดำเนินการ

### 3.1 มุมมอง (Views)

ระบบมี 2 มุมมอง สลับได้ที่ปุ่มมุมขวาบน:

#### 🟦 Kanban View (ค่าเริ่มต้น)
- แสดง Lead เป็นบอร์ดแบ่งตาม Stage (New → Qualified → Proposal → Won/Lost)
- **ลาก-วาง (Drag & Drop)** การ์ดเพื่อเปลี่ยน Stage ได้ทันที
- ระบบจะ auto-log การเปลี่ยน Stage ลง Timeline

#### 📋 List View
- แสดง Lead เป็นตาราง ดูข้อมูลได้ครบกว่า
- มีปุ่ม filter ตาม Stage (All / New / Qualified / Proposal / Won / Lost)
- เรียงตามวันที่อัพเดตล่าสุด

### 3.2 สร้าง Lead ใหม่

1. คลิกปุ่ม **+ New Lead** (มุมขวาบน)
2. กรอกข้อมูล:
   - **Title** * — ชื่อดีล เช่น "Website Redesign Project"
   - **Stage** — สถานะ (New, Qualified, Proposal, Won, Lost)
   - **Source** — แหล่งที่มา (Manual, Website, LINE)
   - **Contact** — เลือกผู้ติดต่อ → **Company จะ auto-fill** จาก Contact
   - **Company** — บริษัท (override ได้ถ้าต่างจาก Contact)
   - **Value (฿)** — มูลค่าดีล
   - **Expected Close** — วันที่คาดว่าจะปิดดีล
   - **Notes** — หมายเหตุ
3. คลิก **Create Lead**

> 💡 **Auto-fill Logic:** เมื่อเลือก Contact ที่ผูกกับ Company อยู่ ระบบจะ auto-fill Company ให้ทันที แต่ยังแก้ไข Company เป็นอันอื่นได้

### 3.3 Filter & Search

ระบบมี filter หลายระดับ:

| Filter | ใช้ทำอะไร |
|--------|----------|
| 🔍 **Search** | ค้นหาจากชื่อ Lead, Company, Contact |
| 🏢 **Company** | กรอง Lead ตามบริษัท |
| 👤 **Contact** | กรอง Lead ตามผู้ติดต่อ |
| 👥 **Owner** | กรอง Lead ตามเจ้าของ Lead |
| **Stage pills** | กรอง Lead ตาม Stage (เฉพาะ List View) |

กดปุ่ม **✕ Clear** เพื่อล้าง filter ทั้งหมด

### 3.4 Lead Detail Page

คลิก Lead เพื่อเข้าหน้ารายละเอียด:

#### 📊 Header Section
- แสดง Title, Stage badge, Source, Value, Expected Close
- ปุ่มเปลี่ยน Stage ด่วน (คลิก stage อื่น)
- ปุ่ม Edit / Delete

#### 📜 Timeline Tab
- แสดงประวัติกิจกรรมทั้งหมดของ Lead ตามลำดับเวลา
- **ประเภทกิจกรรมที่บันทึกอัตโนมัติ:**
  - 🔄 **STAGE_CHANGE** — เปลี่ยน Stage
  - ✏️ **LEAD_UPDATED** — แก้ไขข้อมูล Lead (บอกรายละเอียดว่าเปลี่ยนอะไร)
  - ✅ **TASK_CREATED** — สร้าง Task ใหม่
  - ☑️ **TASK_COMPLETED** — Task เสร็จ
  - 📎 **FILE_ATTACHED** — แนบไฟล์
  - 💬 **LINE_MESSAGE** — ข้อความ LINE
- **เพิ่ม Note ด้วยตัวเอง:** พิมพ์ในช่อง "Add a note..." แล้วกด Send
- **Filter timeline:** กรอง All / Notes / Messages / Calls / Changes

#### ✅ Tasks Section (Sidebar)
- สร้าง Task ใหม่ — กรอกชื่อ + เลือก Priority (🔴 High / 🟡 Medium / 🔵 Low)
- ติ๊กเสร็จ — คลิก checkbox หน้า task → ระบบ log ลง timeline อัตโนมัติ
- ลบ Task — คลิกไอคอนถังขยะ

#### 📎 Attachments Section (Sidebar)
- **อัพโหลดไฟล์:** คลิก Upload → เลือกไฟล์ → เลือก Category
- **Categories:** Quotation, SOW, TOR, Contract, Invoice, Other
- **ดาวน์โหลด:** คลิกไอคอนดาวน์โหลดที่ไฟล์
- **ลบไฟล์:** คลิกไอคอนถังขยะ
- ทุกการแนบไฟล์จะ auto-log ลง timeline

#### 💬 Conversations Tab
- แสดงข้อความ LINE ที่เชื่อมกับ Lead นี้
- สามารถตอบกลับ LINE ได้จากในระบบ

#### 🧠 AI Insights Tab
- AI Score — คะแนนความน่าจะปิดดีลสำเร็จ (0-100)
- AI Summary — สรุปสถานการณ์ของ Lead
- Key Factors — ปัจจัยที่ส่งผลต่อ Score

---

## 4. Contacts — จัดการผู้ติดต่อ

Contact คือ "คนที่ติดต่อมา" ไม่ว่าจะจาก LINE, Email, หรือช่องทางอื่น

### 4.1 รายการ Contact

- แสดงเป็น Card Grid (3 คอลัมน์)
- แต่ละ Card แสดง: ชื่อ, ตำแหน่ง, บริษัท, อีเมล, โทรศัพท์, สถานะ LINE
- **ตัวเลขด้านล่าง:** จำนวน Leads + Messages ที่เกี่ยวข้อง

### 4.2 Filter Contact

| Filter | ใช้ทำอะไร |
|--------|----------|
| 🔍 **Search** | ค้นหาจากชื่อ, อีเมล, เบอร์โทร |
| 🏢 **Company** | กรอง Contact ตามบริษัท |

### 4.3 สร้าง Contact ใหม่

1. คลิก **+ New Contact**
2. กรอกข้อมูล:
   - **First Name** * / **Last Name** * — ชื่อ-นามสกุล (บังคับ)
   - **Email** / **Phone** — ข้อมูลติดต่อ
   - **Position** — ตำแหน่ง
   - **Company** — เลือกบริษัทจาก dropdown
   - **Notes** — หมายเหตุ
3. คลิก **Create Contact**

> 💡 เมื่อเปลี่ยน Company ของ Contact → **Lead ทุกตัวที่ผูกกับ Contact นี้จะเปลี่ยน Company ตามอัตโนมัติ**

### 4.4 Contact Detail Page

คลิก Contact card เพื่อเข้าหน้ารายละเอียด:

- **ข้อมูลส่วนตัว** — ชื่อ, ตำแหน่ง, อีเมล, โทรศัพท์, บริษัท
- **LINE Chat** — ดูประวัติแชท + ตอบข้อความ LINE ได้โดยตรง
- **Leads ที่เกี่ยวข้อง** — ดู Lead ทุกตัวที่ผูกกับ Contact นี้

### 4.5 Chat กับ Contact (LINE)

สำหรับ Contact ที่มี LINE เชื่อมต่ออยู่:

1. เข้าหน้า Contact Detail
2. จะเห็นประวัติแชท LINE ทั้งหมด
3. พิมพ์ข้อความในช่อง Reply แล้วกด Send
4. ข้อความจะส่งไป LINE ของลูกค้าโดยตรง

> 💡 สามารถคุยกับ Contact ได้ **ก่อนสร้าง Lead** — เหมาะสำหรับ qualify ลูกค้าก่อน

---

## 5. Companies — จัดการบริษัท

Company คือ "องค์กร/บริษัท" ที่เป็นลูกค้าหรือ prospect

### 5.1 รายการ Company

- แสดงเป็น Card Grid
- แต่ละ Card แสดง: ชื่อบริษัท, อุตสาหกรรม, เว็บไซต์, เบอร์โทร, ที่อยู่
- ตัวเลข: จำนวน Contacts + Leads

### 5.2 สร้าง Company ใหม่

1. คลิก **+ New Company**
2. กรอกข้อมูล:
   - **Name** * — ชื่อบริษัท (บังคับ)
   - **Industry** — อุตสาหกรรม
   - **Website** — เว็บไซต์
   - **Phone** — เบอร์โทร
   - **Address** — ที่อยู่
   - **Notes** — หมายเหตุ
3. คลิก **Create Company**

### 5.3 Company Detail Page

- ข้อมูลบริษัท
- รายการ Contacts ในบริษัทนี้
- รายการ Leads ที่เกี่ยวกับบริษัทนี้

---

## 6. ฟีเจอร์เพิ่มเติม

### 6.1 LINE OA Integration

เมื่อลูกค้าส่งข้อความใน LINE OA:

```
ลูกค้าส่ง LINE → Webhook → ระบบสร้าง Contact อัตโนมัติ
                           → ข้อความเก็บใน Messages
                           → สามารถสร้าง Lead จาก Contact ได้
                           → AI วิเคราะห์ข้อความ + สรุป
```

### 6.2 AI Features

| ฟีเจอร์ | ทำอะไร |
|---------|--------|
| **AI Score** | ประเมินโอกาสปิดดีล (0-100) จาก value, stage, activities |
| **AI Summary** | สรุปสถานการณ์ Lead แบบอัตโนมัติ |
| **Message Analysis** | วิเคราะห์ข้อความ LINE เพื่อดึง context |

### 6.3 Audit Trail (Timeline)

ทุก action ในระบบจะถูกบันทึกลง Timeline อัตโนมัติ:

| Action | บันทึกเป็น | ตัวอย่าง |
|--------|-----------|---------|
| เปลี่ยน Stage | `STAGE_CHANGE` | "Stage changed from NEW to QUALIFIED" |
| แก้ไข Lead | `LEAD_UPDATED` | "Lead updated: Title: Old → New, Value: ฿100K → ฿200K" |
| สร้าง Task | `TASK_CREATED` | "Task created: ส่งใบเสนอราคา (Priority: HIGH)" |
| Task เสร็จ | `TASK_COMPLETED` | "Task completed: ส่งใบเสนอราคา" |
| แนบไฟล์ | `FILE_ATTACHED` | "File attached: quotation.pdf (Category: Quotation)" |
| ข้อความ LINE | `LINE_MESSAGE` | แสดงเนื้อหาข้อความ |
| เพิ่ม Note | `NOTE` | แสดงเนื้อหา note |

### 6.4 ความสัมพันธ์ของข้อมูล

```
Company (บริษัท)
  └─ Contact (คนติดต่อ) ← LINE messages เข้าที่นี่
       └─ Lead (โอกาสขาย) ← สร้างเมื่อพร้อม qualify
            ├─ Activities (timeline/audit trail)
            ├─ Tasks (สิ่งที่ต้องทำ)
            └─ Attachments (ไฟล์ใบเสนอราคา/SOW/สัญญา)
```

**กฎสำคัญ:**
- เลือก Contact ที่ Lead → Company auto-fill จาก Contact
- Company ที่ Lead สามารถ override ได้ (กรณี deal กับบริษัทอื่น)
- เปลี่ยน Company ที่ Contact → Lead ที่ผูกอยู่จะ sync ตาม

### 6.5 Keyboard Shortcuts

| ปุ่มลัด | ทำอะไร |
|---------|--------|
| `Ctrl + K` / `⌘ + K` | เปิด Global Search |
| `Esc` | ปิด Modal / Dialog |

---

## 7. คำถามที่พบบ่อย

### Q: ลืมรหัสผ่านทำอย่างไร?
**A:** ติดต่อ Admin เพื่อ reset รหัสผ่าน (ระบบยังไม่มี self-service reset)

### Q: ข้อความ LINE ไม่เข้าระบบ?
**A:** ตรวจสอบ:
1. Webhook URL ถูกต้อง
2. `LINE_USE_MOCK="false"` ใน backend/.env
3. LINE Channel Access Token ยังไม่หมดอายุ

### Q: Lead ที่สร้างจาก LINE ต่างจากสร้างเองอย่างไร?
**A:** Lead จาก LINE จะมี:
- Source = "LINE" (แสดงไอคอน 💬)
- Contact เชื่อมกับ LINE User อัตโนมัติ
- ข้อความ LINE ปรากฏใน Conversations tab

### Q: ทำไมไม่เห็น Company ที่หน้า Contact / Lead?
**A:** ต้องเลือก Company จาก dropdown ตอนสร้าง/แก้ไข Contact หรือ Lead

### Q: ไฟล์แนบเก็บที่ไหน?
**A:** เก็บใน folder `backend/uploads/` ของ server ระบบรองรับ Categories: Quotation, SOW, TOR, Contract, Invoice, Other

### Q: AI Score คำนวณจากอะไร?
**A:** AI วิเคราะห์จาก: มูลค่า deal, Stage ปัจจุบัน, จำนวน activities, ระยะเวลาใน pipeline, ข้อมูลจาก notes/messages

---

> 📝 **คู่มือนี้อัพเดตล่าสุด:** August 2026 | **เวอร์ชัน:** AI CRM MVP 0.1.0
