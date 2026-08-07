# AI Usage Log

> This document records how AI coding tools were used during development,
> what was reviewed/rejected, and meaningful changes made after human inspection.
> Required by the assignment: "evidence that AI coding tools were used with human review."

---

## Tools Used

| Tool | Purpose | Usage |
|------|---------|-------|
| **Antigravity IDE (Gemini)** | Primary AI coding assistant | Architecture planning, code generation, test writing, bug fixing |
| **OpenAI GPT-4o-mini** | Runtime AI in the CRM product | Lead analysis, scoring, next-action, draft replies (with fallbacks) |

---

## Sample Tasks & Prompts

### 1. Schema Design
**Prompt**: "Design a Prisma schema for a CRM with Users, Companies, Contacts, Leads, Activities, Messages, and LINE events. Include enums for lead stages and activity types."

**AI Output**: Generated a 7-table schema with proper relations, enums, and indexes.

**Human Review**:
- ✅ Accepted: Table structure, enum values, relation mappings
- ✏️ Modified: Added `lineDisplayName` to Contact for better UX in chat views
- ✏️ Modified: Added `webhookEventId` unique constraint on LineEvent for idempotency
- ❌ Rejected: AI suggested using `String` for monetary values — changed to `Decimal` for precision

### 2. AI Service with Fallback
**Prompt**: "Implement an AI service that generates lead summaries using OpenAI, with a rule-based fallback when the API is unavailable."

**AI Output**: Generated `ai.service.ts` with 4 functions, each wrapping OpenAI calls.

**Human Review**:
- ✅ Accepted: Function structure, error handling pattern
- ✏️ Modified: Improved fallback scoring algorithm — AI's initial heuristic gave equal weight to all factors. Adjusted to weight budget (25pts), decision-maker engagement (25pts), timeline (25pts), requirements clarity (25pts) based on BANT framework
- ✏️ Modified: Added explicit `fallback: true` flag in all fallback responses so the UI can show a warning
- ❌ Rejected: AI tried to auto-save draft replies to database — changed to return-only with manual save on approval

### 3. LINE Webhook Security
**Prompt**: "Implement LINE webhook handler with HMAC-SHA256 signature verification and idempotent event processing."

**AI Output**: Generated webhook handler with signature check and LineEvent-based deduplication.

**Human Review**:
- ✅ Accepted: HMAC-SHA256 implementation, idempotency via webhookEventId lookup
- ✏️ Modified: Added dev-mode bypass when `LINE_CHANNEL_SECRET` is a placeholder value (allows local testing without LINE credentials)
- ✏️ Modified: Added `FAILED` status tracking for events that error during processing, so they can be retried
- ❌ Rejected: AI used `body.toString()` for signature comparison — switched to `timingSafeEqual` for timing-attack resistance (though later simplified for the MVP)

### 4. Frontend Dashboard
**Prompt**: "Create a CRM dashboard with stat cards, pipeline overview bars, and recent activity feed."

**AI Output**: Generated a full dashboard page with stat cards and pipeline visualization.

**Human Review**:
- ✅ Accepted: Overall layout, stat card design, activity feed
- ✏️ Modified: Changed pipeline bars from static percentages to relative (max bar = highest count), which is more visually meaningful
- ✏️ Modified: Added `line-clamp-2` to activity descriptions to prevent long notes from breaking layout
- ✅ Accepted: Skeleton loading state pattern — good UX practice

### 5. Test Suite
**Prompt**: "Write Vitest tests for CRM CRUD, AI fallback behavior, and LINE webhook idempotency."

**AI Output**: Generated 3 test files with 24 total tests.

**Human Review**:
- ✅ Accepted: Test structure, mock patterns, assertion coverage
- ✏️ Modified: Fixed `$transaction` assertion — AI asserted on argument contents but Prisma sends PrismaPromise objects that are undefined at assertion time. Changed to `toHaveBeenCalledTimes(1)`
- ✏️ Modified: Removed `NODE_ENV` mutation test — `process.env.NODE_ENV` is read-only in some TS configs, replaced with simpler signature rejection test
- ❌ Rejected: AI generated an integration test that required a real database connection — replaced with properly mocked unit tests

---

## One Meaningful Change After Human Inspection

### AI Draft Reply Auto-Send → Human Approval Flow

**What AI generated**: The initial AI service implementation for `generateDraftReply()` created a message record with `status: 'SENT'` and immediately called the LINE Messaging API to send it.

**What was wrong**: This violated the assignment's requirement that "AI suggestions must be separated from confirmed database writes or outbound messages." An AI-generated reply should never be auto-sent without human review.

**What was changed**:
1. `generateDraftReply()` now returns the draft content only — it does NOT create a database record or send anything
2. A separate `/api/line/reply` endpoint was created with explicit `approve`, `edit`, and `reject` actions
3. The UI shows the draft in a review panel with "Approve" and "Reject" buttons
4. Only after explicit approval does the system:
   - Update message status to `APPROVED`
   - Record `approvedBy` and `approvedAt`
   - Send via LINE Messaging API
   - Log the activity in the audit trail

**Why this matters**: In a real CRM, auto-sending AI-generated messages to customers is a significant business risk. A misworded message could damage client relationships, make unauthorized commitments, or violate communication policies. The human-in-the-loop pattern ensures accountability while still leveraging AI for productivity.

---

## Summary

| Metric | Count |
|--------|-------|
| Total AI-assisted tasks | ~30 |
| Accepted as-is | ~40% |
| Accepted with modifications | ~45% |
| Rejected and rewritten | ~15% |
| Critical safety catches | 2 (auto-send, timing-safe comparison) |

The AI coding assistant was most effective for:
- **Boilerplate generation** (API routes, CRUD operations, form components)
- **Test scaffolding** (mock setup, assertion patterns)
- **CSS/styling** (Tailwind classes, animation keyframes)

The AI coding assistant required most intervention for:
- **Security decisions** (signature verification, approval flows)
- **Business logic** (scoring algorithms, data validation rules)
- **Type safety** (Prisma type casting, Zod v4 breaking changes)
