import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.lineEvent.deleteMany();
  await prisma.message.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();

  // ─── Users ───────────────────────────────────────────────────
  const seedPassword = process.env.SEED_PASSWORD!;
  const passwordHash = await bcrypt.hash(seedPassword, 10);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'seed-admin@example.invalid',
        name: 'Somsak Admin',
        passwordHash,
        role: 'ADMIN',
      },
    }),
    prisma.user.create({
      data: {
        email: 'seed-sales-1@example.invalid',
        name: 'Nattapong Sales',
        passwordHash,
        role: 'SALES',
      },
    }),
    prisma.user.create({
      data: {
        email: 'seed-sales-2@example.invalid',
        name: 'Ploy Srisuwan',
        passwordHash,
        role: 'SALES',
      },
    }),
    prisma.user.create({
      data: {
        email: 'seed-user@example.invalid',
        name: 'Demo User',
        passwordHash,
        role: 'SALES',
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // ─── Companies ─────────────────────────────────────────────────
  const companies = await Promise.all([
    prisma.company.create({
      data: {
        name: 'TechVision Co., Ltd.',
        industry: 'Technology',
        website: 'https://techvision.co.th',
        phone: '+66-2-123-4567',
        address: 'Sathorn, Bangkok',
        notes: 'Fast-growing SaaS startup, interested in AI solutions',
      },
    }),
    prisma.company.create({
      data: {
        name: 'Bangkok Retail Group',
        industry: 'Retail',
        website: 'https://bangkokretail.com',
        phone: '+66-2-234-5678',
        address: 'Sukhumvit, Bangkok',
        notes: 'Chain of 50 stores, looking for CRM & automation',
      },
    }),
    prisma.company.create({
      data: {
        name: 'Siam Financial Services',
        industry: 'Finance',
        website: 'https://siamfinancial.co.th',
        phone: '+66-2-345-6789',
        address: 'Silom, Bangkok',
        notes: 'Fintech company, needs chatbot & LINE integration',
      },
    }),
    prisma.company.create({
      data: {
        name: 'Green Earth Foods',
        industry: 'Food & Beverage',
        website: 'https://greenearthfoods.com',
        phone: '+66-2-456-7890',
        address: 'Ratchadaphisek, Bangkok',
        notes: 'Organic food delivery, needs order management system',
      },
    }),
    prisma.company.create({
      data: {
        name: 'MediCare Hospital',
        industry: 'Healthcare',
        website: 'https://medicare.co.th',
        phone: '+66-2-567-8901',
        address: 'Phahonyothin, Bangkok',
        notes: 'Private hospital group, interested in patient engagement platform',
      },
    }),
    prisma.company.create({
      data: {
        name: 'Digital Academy',
        industry: 'Education',
        website: 'https://digitalacademy.co.th',
        phone: '+66-2-678-9012',
        address: 'Asok, Bangkok',
      },
    }),
    prisma.company.create({
      data: {
        name: 'PropTech Solutions',
        industry: 'Real Estate',
        website: 'https://proptech.co.th',
        phone: '+66-2-789-0123',
        address: 'Thonglor, Bangkok',
        notes: 'Property management platform',
      },
    }),
    prisma.company.create({
      data: {
        name: 'AutoParts Thailand',
        industry: 'Automotive',
        phone: '+66-2-890-1234',
        address: 'Bangna, Bangkok',
      },
    }),
  ]);

  console.log(`✅ Created ${companies.length} companies`);

  // ─── Contacts ──────────────────────────────────────────────────
  const contactsData = [
    { firstName: 'Arthit', lastName: 'Charoensuk', email: 'arthit@techvision.co.th', phone: '+66-81-111-1111', position: 'CTO', companyId: companies[0].id },
    { firstName: 'Wanida', lastName: 'Pongpat', email: 'wanida@techvision.co.th', phone: '+66-81-111-2222', position: 'Product Manager', companyId: companies[0].id },
    { firstName: 'Kittisak', lastName: 'Thongdee', email: 'kittisak@bangkokretail.com', phone: '+66-82-222-3333', position: 'CEO', companyId: companies[1].id },
    { firstName: 'Supaporn', lastName: 'Siriwat', email: 'supaporn@bangkokretail.com', phone: '+66-82-222-4444', position: 'Marketing Director', companyId: companies[1].id },
    { firstName: 'Tanakorn', lastName: 'Vejjajiva', email: 'tanakorn@siamfinancial.co.th', phone: '+66-83-333-5555', position: 'VP Engineering', companyId: companies[2].id },
    { firstName: 'Kanokwan', lastName: 'Prasertchai', email: 'kanokwan@siamfinancial.co.th', phone: '+66-83-333-6666', position: 'Head of Digital', companyId: companies[2].id },
    { firstName: 'Natthawut', lastName: 'Sangthong', email: 'natthawut@greenearthfoods.com', phone: '+66-84-444-7777', position: 'COO', companyId: companies[3].id },
    { firstName: 'Parichat', lastName: 'Wongsawat', email: 'parichat@medicare.co.th', phone: '+66-85-555-8888', position: 'IT Director', companyId: companies[4].id },
    { firstName: 'Siriporn', lastName: 'Raksak', email: 'siriporn@medicare.co.th', phone: '+66-85-555-9999', position: 'CMO', companyId: companies[4].id },
    { firstName: 'Chatree', lastName: 'Klinpratoom', email: 'chatree@digitalacademy.co.th', phone: '+66-86-666-0000', position: 'Founder', companyId: companies[5].id },
    { firstName: 'Wilawan', lastName: 'Sethaphan', email: 'wilawan@proptech.co.th', phone: '+66-87-777-1111', position: 'Business Development', companyId: companies[6].id },
    { firstName: 'Pramote', lastName: 'Chaisuwan', email: 'pramote@autoparts.co.th', phone: '+66-88-888-2222', position: 'Managing Director', companyId: companies[7].id },
    { firstName: 'Apinya', lastName: 'Nimitkul', email: 'apinya.n@gmail.com', phone: '+66-89-999-3333', position: 'Freelance Consultant', companyId: null, lineUserId: 'U_line_demo_001', lineDisplayName: 'Apinya N.' },
    { firstName: 'Surasak', lastName: 'Prompan', email: 'surasak.p@outlook.com', phone: '+66-80-000-4444', position: 'Independent', companyId: null, lineUserId: 'U_line_demo_002', lineDisplayName: 'Surasak P.' },
  ];

  const contacts = await Promise.all(
    contactsData.map((c) => prisma.contact.create({ data: c }))
  );

  console.log(`✅ Created ${contacts.length} contacts`);

  // ─── Leads ─────────────────────────────────────────────────────
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
  const daysLater = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

  const leadsData = [
    { title: 'AI Chatbot for Customer Support', companyId: companies[0].id, contactId: contacts[0].id, ownerId: users[1].id, stage: 'PROPOSAL' as const, value: 850000, source: 'WEBSITE' as const, expectedClose: daysLater(14), notes: 'They want GPT-powered chatbot with Thai language support. Budget confirmed.', aiScore: 82, aiScoreReasons: 'High budget, engaged contact, clear requirements, timeline aligned', aiSummary: 'TechVision needs an AI chatbot for their SaaS platform. CTO Arthit is the decision maker. They have compared 3 vendors and we are in final round.' },
    { title: 'E-commerce Platform Redesign', companyId: companies[1].id, contactId: contacts[2].id, ownerId: users[1].id, stage: 'QUALIFIED' as const, value: 1200000, source: 'MANUAL' as const, expectedClose: daysLater(30), notes: 'CEO wants full redesign with LINE integration for all 50 stores.' },
    { title: 'LINE OA Chatbot + CRM Integration', companyId: companies[2].id, contactId: contacts[4].id, ownerId: users[2].id, stage: 'NEW' as const, value: 500000, source: 'LINE' as const, expectedClose: daysLater(45), notes: 'Incoming from LINE. Need chatbot for financial product inquiries.' },
    { title: 'Food Delivery App Backend', companyId: companies[3].id, contactId: contacts[6].id, ownerId: users[2].id, stage: 'PROPOSAL' as const, value: 1500000, source: 'WEBSITE' as const, expectedClose: daysLater(21), notes: 'Full backend rewrite. Current system cannot scale. Needs real-time order tracking.' },
    { title: 'Patient Engagement Portal', companyId: companies[4].id, contactId: contacts[7].id, ownerId: users[1].id, stage: 'WON' as const, value: 2000000, source: 'MANUAL' as const, expectedClose: daysAgo(7), notes: 'Contract signed! Phase 1 starts next month.' },
    { title: 'Online Learning Platform', companyId: companies[5].id, contactId: contacts[9].id, ownerId: users[3].id, stage: 'QUALIFIED' as const, value: 750000, source: 'WEBSITE' as const, expectedClose: daysLater(60), notes: 'Need LMS with live streaming and AI-powered quiz generation.' },
    { title: 'Property Management Dashboard', companyId: companies[6].id, contactId: contacts[10].id, ownerId: users[2].id, stage: 'NEW' as const, value: 600000, source: 'LINE' as const, expectedClose: daysLater(30), notes: 'Initial inquiry via LINE. Want dashboard for 200+ properties.' },
    { title: 'Inventory Management System', companyId: companies[7].id, contactId: contacts[11].id, ownerId: users[3].id, stage: 'LOST' as const, value: 400000, source: 'MANUAL' as const, expectedClose: daysAgo(14), notes: 'Lost to competitor. Price was the main factor.' },
    { title: 'HR Analytics Dashboard', companyId: companies[0].id, contactId: contacts[1].id, ownerId: users[1].id, stage: 'NEW' as const, value: 350000, source: 'MANUAL' as const, expectedClose: daysLater(45), notes: 'Follow-up project from chatbot deal. Wanida reached out.' },
    { title: 'Loyalty Program App', companyId: companies[1].id, contactId: contacts[3].id, ownerId: users[2].id, stage: 'QUALIFIED' as const, value: 900000, source: 'WEBSITE' as const, expectedClose: daysLater(30), notes: 'Points system + LINE rewards for retail customers.' },
    { title: 'Financial Advisory Chatbot', companyId: null, contactId: contacts[12].id, ownerId: users[1].id, stage: 'NEW' as const, value: 200000, source: 'LINE' as const, expectedClose: daysLater(60), notes: 'Freelance consultant wants personal advisory bot prototype.' },
    { title: 'Supply Chain Automation', companyId: companies[7].id, contactId: contacts[11].id, ownerId: users[3].id, stage: 'PROPOSAL' as const, value: 1800000, source: 'MANUAL' as const, expectedClose: daysLater(20), notes: 'Separate from inventory deal. Automation focus.' },
  ];

  const leads = await Promise.all(
    leadsData.map((l) => prisma.lead.create({ data: l }))
  );

  console.log(`✅ Created ${leads.length} leads`);

  // ─── Activities ────────────────────────────────────────────────
  const activitiesData = [
    // Lead 0 - AI Chatbot
    { leadId: leads[0].id, userId: users[1].id, type: 'NOTE' as const, description: 'Initial meeting with CTO Arthit. Discussed requirements for Thai NLP chatbot.', createdAt: daysAgo(10) },
    { leadId: leads[0].id, userId: users[1].id, type: 'CALL' as const, description: 'Follow-up call to discuss technical architecture and API integration.', createdAt: daysAgo(7) },
    { leadId: leads[0].id, userId: users[1].id, type: 'STAGE_CHANGE' as const, description: 'Moved from QUALIFIED to PROPOSAL. Sending proposal document.', metadata: { from: 'QUALIFIED', to: 'PROPOSAL' }, createdAt: daysAgo(5) },
    { leadId: leads[0].id, userId: users[1].id, type: 'EMAIL' as const, description: 'Sent proposal document with pricing and timeline.', createdAt: daysAgo(4) },
    { leadId: leads[0].id, userId: users[1].id, type: 'MEETING' as const, description: 'Demo session showing chatbot prototype. Arthit was impressed with response quality.', createdAt: daysAgo(2) },

    // Lead 1 - E-commerce
    { leadId: leads[1].id, userId: users[1].id, type: 'NOTE' as const, description: 'Met CEO Kittisak at industry event. Exchanged business cards.', createdAt: daysAgo(15) },
    { leadId: leads[1].id, userId: users[1].id, type: 'CALL' as const, description: 'Discovery call: 50 stores, need unified platform with LINE for each store.', createdAt: daysAgo(12) },
    { leadId: leads[1].id, userId: users[1].id, type: 'STAGE_CHANGE' as const, description: 'Moved from NEW to QUALIFIED. Budget and timeline confirmed.', metadata: { from: 'NEW', to: 'QUALIFIED' }, createdAt: daysAgo(10) },

    // Lead 2 - LINE Chatbot
    { leadId: leads[2].id, userId: users[2].id, type: 'LINE_MESSAGE' as const, description: 'Received initial inquiry via LINE about chatbot for financial products.', createdAt: daysAgo(3) },
    { leadId: leads[2].id, userId: users[2].id, type: 'NOTE' as const, description: 'Tanakorn interested in AI-powered FAQ and product recommendation.', createdAt: daysAgo(2) },

    // Lead 3 - Food Delivery
    { leadId: leads[3].id, userId: users[2].id, type: 'MEETING' as const, description: 'On-site visit to Green Earth HQ. Reviewed current system limitations.', createdAt: daysAgo(8) },
    { leadId: leads[3].id, userId: users[2].id, type: 'STAGE_CHANGE' as const, description: 'Moved from QUALIFIED to PROPOSAL after technical assessment.', metadata: { from: 'QUALIFIED', to: 'PROPOSAL' }, createdAt: daysAgo(5) },

    // Lead 4 - Patient Portal (WON)
    { leadId: leads[4].id, userId: users[1].id, type: 'STAGE_CHANGE' as const, description: 'Deal WON! Contract signed for ฿2M. Phase 1 begins next month.', metadata: { from: 'PROPOSAL', to: 'WON' }, createdAt: daysAgo(7) },
    { leadId: leads[4].id, userId: users[1].id, type: 'NOTE' as const, description: 'Kickoff meeting scheduled. Team assigned: 2 FE, 1 BE, 1 QA.', createdAt: daysAgo(5) },

    // Lead 7 - Inventory (LOST)
    { leadId: leads[7].id, userId: users[3].id, type: 'STAGE_CHANGE' as const, description: 'Deal LOST. Competitor offered 30% lower price. Client chose budget option.', metadata: { from: 'PROPOSAL', to: 'LOST' }, createdAt: daysAgo(14) },
  ];

  await Promise.all(
    activitiesData.map((a) => prisma.activity.create({ data: a }))
  );

  console.log(`✅ Created ${activitiesData.length} activities`);

  // ─── Messages (LINE conversations) ────────────────────────────
  const messagesData = [
    { contactId: contacts[12].id, leadId: leads[10].id, channel: 'LINE' as const, direction: 'INBOUND' as const, content: 'สวัสดีครับ สนใจสร้าง chatbot สำหรับให้คำปรึกษาการเงินครับ', status: 'RECEIVED' as const, createdAt: daysAgo(5) },
    { contactId: contacts[12].id, leadId: leads[10].id, channel: 'LINE' as const, direction: 'OUTBOUND' as const, content: 'สวัสดีค่ะคุณ Apinya ขอบคุณที่สนใจค่ะ เราสามารถสร้าง chatbot ที่ตอบคำถามเรื่องการลงทุนและวางแผนการเงินได้ค่ะ สะดวกคุยรายละเอียดเพิ่มเติมไหมคะ?', status: 'SENT' as const, createdAt: daysAgo(5) },
    { contactId: contacts[12].id, leadId: leads[10].id, channel: 'LINE' as const, direction: 'INBOUND' as const, content: 'สะดวกครับ งบประมาณประมาณ 200,000 บาท ได้ไหมครับ', status: 'RECEIVED' as const, createdAt: daysAgo(4) },
    { contactId: contacts[12].id, leadId: leads[10].id, channel: 'LINE' as const, direction: 'OUTBOUND' as const, content: 'ได้ค่ะ ด้วยงบ 200,000 บาท เราสามารถสร้าง chatbot prototype ที่ตอบคำถาม FAQ ได้ประมาณ 50 หัวข้อ และมีระบบ AI ช่วยวิเคราะห์ข้อมูลเบื้องต้นค่ะ', status: 'SENT' as const, createdAt: daysAgo(4) },

    { contactId: contacts[13].id, channel: 'LINE' as const, direction: 'INBOUND' as const, content: 'สวัสดีครับ อยากถามเรื่องราคา AI solution ครับ', status: 'RECEIVED' as const, createdAt: daysAgo(2) },
    { contactId: contacts[13].id, channel: 'LINE' as const, direction: 'OUTBOUND' as const, content: 'สวัสดีค่ะ ยินดีให้ข้อมูลค่ะ สนใจ AI solution ด้านไหนคะ? เช่น chatbot, data analytics, หรือ automation ค่ะ', status: 'SENT' as const, createdAt: daysAgo(2) },

    { contactId: contacts[4].id, leadId: leads[2].id, channel: 'LINE' as const, direction: 'INBOUND' as const, content: 'Hello, we need a LINE chatbot for our financial products. Can Jenosize help?', status: 'RECEIVED' as const, createdAt: daysAgo(3) },
    { contactId: contacts[4].id, leadId: leads[2].id, channel: 'LINE' as const, direction: 'OUTBOUND' as const, content: 'Hello Tanakorn! Absolutely, we specialize in LINE OA chatbots with AI capabilities. We can build a chatbot that handles product inquiries, FAQs, and even personalized recommendations. Would you like to schedule a quick call to discuss?', status: 'SENT' as const, createdAt: daysAgo(3) },
  ];

  await Promise.all(
    messagesData.map((m) => prisma.message.create({ data: m }))
  );

  console.log(`✅ Created ${messagesData.length} messages`);

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Credentials removed:');
  console.log(`   Admin:  seed-admin@example.invalid / ${seedPassword}`);
  console.log(`   Sales:  seed-sales-1@example.invalid / ${seedPassword}`);
  console.log(`   Sales:  seed-sales-2@example.invalid / ${seedPassword}`);
  console.log(`   Demo:   seed-user@example.invalid / ${seedPassword}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
