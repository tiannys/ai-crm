---
name: crm-copilot
description: >
  AI CRM Copilot skill for Jenosize AI CRM. Provides lead analysis,
  qualification scoring, next-best-action recommendations, and draft
  LINE reply generation using CRM context.
---

# CRM Copilot Skill

## Purpose

The CRM Copilot provides AI-powered assistance to the sales team by analyzing
CRM data (leads, activities, messages, contacts) and generating actionable
insights. It helps salespeople prioritize leads, understand deal context quickly,
and respond to LINE conversations efficiently.

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `leadId` | UUID | Yes | The ID of the lead to analyze |
| CRM Context | Auto-gathered | Yes | Lead details, activities, messages, contact info, company info |

The skill automatically gathers context from:
- Lead record (title, stage, value, source, notes, timestamps)
- Activity timeline (last 10 entries)
- Message history (last 5 messages)
- Contact information (name, position, LINE status)
- Company information (name, industry)

## Outputs

### 1. Lead Summary
```json
{
  "summary": "2-3 sentence overview of lead status and relationship",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "sentiment": "positive | neutral | negative"
}
```

### 2. Qualification Score
```json
{
  "score": 0-100,
  "reasons": ["reason 1", "reason 2"],
  "confidence": "high | medium | low"
}
```

Scoring criteria:
- Budget/value clarity (0-25 points)
- Decision maker engagement (0-25 points)
- Timeline urgency (0-25 points)
- Requirements clarity (0-25 points)

### 3. Next Best Action
```json
{
  "action": "Specific recommended action",
  "priority": "high | medium | low",
  "reasoning": "Why this action matters",
  "suggestedTimeline": "When to take action"
}
```

### 4. Draft LINE Reply
```json
{
  "content": "Draft message text (max 200 chars)",
  "tone": "professional | friendly | formal",
  "context": "Why this reply was generated"
}
```

## Allowed Actions

| Action | Scope | Auto/Manual |
|--------|-------|-------------|
| Generate summary | Read-only | Auto |
| Generate score | Read-only | Auto |
| Suggest next action | Read-only | Auto |
| Draft LINE reply | Creates DRAFT message | Manual approval required |
| Save AI score to lead | Updates lead.aiScore | Auto (after generation) |

### ⚠️ Guardrails

1. **AI suggestions are NEVER auto-executed.** All outputs are labeled as suggestions.
2. **LINE replies require human approval** before sending. The flow is:
   Draft → Review → Approve/Edit → Send.
3. **No direct database mutations** from AI output, except storing the
   AI-generated score/summary on the lead record itself.
4. **No access to credentials or secrets.** The skill receives pre-authenticated
   API clients.
5. **Rate limiting:** Maximum 10 AI calls per minute per user to prevent abuse.
6. **Content filtering:** AI-generated replies are flagged if they contain
   pricing commitments, contractual language, or PII.

## Failure Behavior

| Failure | Behavior |
|---------|----------|
| OpenAI API timeout (>10s) | Return fallback response with `fallback: true` flag |
| OpenAI API key missing | Return rule-based fallback immediately |
| OpenAI rate limit (429) | Retry once after 2s, then fallback |
| Invalid JSON from model | Parse as plain text, wrap in default structure |
| Lead not found | Return `{ success: false, error: "Lead not found" }` |
| Network error | Return fallback with cached previous result if available |

### Fallback Logic

When OpenAI is unavailable, the skill uses rule-based heuristics:

- **Summary**: Constructed from lead fields (title, stage, value, activity count)
- **Score**: Calculated from presence of budget, contact, activities, close date
- **Next Action**: Stage-based lookup table (e.g., NEW → "Schedule discovery call")
- **Draft Reply**: Template-based greeting using contact name

## Evaluation Cases

### Case 1: High-Value Lead with Active Engagement
**Input**: Lead with ฿2M value, 5 activities, PROPOSAL stage, recent meeting
**Expected**: Score ≥ 75, Summary sentiment: positive, Action: Follow up on proposal

### Case 2: New Lead from LINE with No History
**Input**: Lead from LINE, NEW stage, 1 message, no activities
**Expected**: Score ≤ 40, Action: Schedule discovery call, Draft reply: greeting

### Case 3: Lost Deal
**Input**: Lead in LOST stage, competitor won on price
**Expected**: Score ≤ 20, Sentiment: negative, Action: Send follow-up, maintain relationship

### Case 4: OpenAI Unavailable
**Input**: Any lead, but OPENAI_API_KEY not set
**Expected**: All 4 functions return fallback responses with `fallback: true`

### Case 5: Lead with LINE Messages
**Input**: Lead with 4 LINE messages (2 inbound, 2 outbound)
**Expected**: Draft reply references conversation context, uses matching language (Thai/English)

### Case 6: Stale Lead (No Activity in 30+ Days)
**Input**: QUALIFIED lead, last activity 35 days ago
**Expected**: Score includes penalty for inactivity, Action priority: high (re-engage)
