import OpenAI from 'openai';
import { createChildLogger } from '../lib/logger';
import { getLeadById } from './crm.service';
import type { AiLeadSummary, AiQualificationScore, AiNextAction, AiDraftReply, AiResponse } from '../types';

const log = createChildLogger('ai-service');

// ─── AI Provider: OpenAI-compatible (Gemini, OpenAI, etc.) ───────
function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const baseURL = process.env.OPENAI_BASE_URL || undefined;
  if (baseURL) {
    log.info({ baseURL }, 'Using OpenAI-compatible endpoint');
  }

  return new OpenAI({ apiKey, baseURL });
}

async function callOpenAIProvider(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const client = getOpenAIClient();
  if (!client) return null;

  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gemini-2.0-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content || null;
  } catch (error) {
    log.error({ error }, 'OpenAI-compatible API call failed');
    return null;
  }
}

// ─── AI Provider: Custom Gateway (http://host:port/chat/json) ────
async function callGatewayProvider(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const gatewayUrl = process.env.AI_GATEWAY_URL;
  const gatewayKey = process.env.AI_GATEWAY_API_KEY;
  if (!gatewayUrl) return null;

  try {
    const response = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(gatewayKey ? { 'X-API-Key': gatewayKey } : {}),
      },
      body: JSON.stringify({
        prompt: userPrompt,
        system_instruction: systemPrompt,
        model: process.env.AI_GATEWAY_MODEL || 'gemini-2.5-flash',
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      log.error({ status: response.status }, 'Gateway API call failed');
      return null;
    }

    const data = await response.json();
    // Support common gateway response formats
    return data.response || data.text || data.content || data.result || JSON.stringify(data);
  } catch (error) {
    log.error({ error }, 'Gateway API call failed');
    return null;
  }
}

// ─── AI Router: เลือก provider ตาม AI_PROVIDER env ───────────────
async function callAI(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const provider = process.env.AI_PROVIDER || 'openai';

  log.info({ provider }, 'AI call using provider');

  switch (provider) {
    case 'gateway':
      return callGatewayProvider(systemPrompt, userPrompt);

    case 'openai':
    default:
      return callOpenAIProvider(systemPrompt, userPrompt);
  }
}

function buildLeadContext(lead: Awaited<ReturnType<typeof getLeadById>>): string {
  if (!lead) return 'No lead data available';

  const activities = lead.activities
    ?.slice(0, 10)
    .map((a) => `[${a.type}] ${a.description} (${new Date(a.createdAt).toLocaleDateString()})`)
    .join('\n') || 'No activities';

  const messages = lead.messages
    ?.slice(-5)
    .map((m) => `[${m.direction}] ${m.content}`)
    .join('\n') || 'No messages';

  return `
LEAD INFORMATION:
- Title: ${lead.title}
- Stage: ${lead.stage}
- Value: ${lead.value ? `฿${Number(lead.value).toLocaleString()}` : 'Not specified'}
- Source: ${lead.source}
- Company: ${lead.company?.name || 'N/A'} (${lead.company?.industry || 'N/A'})
- Contact: ${lead.contact ? `${lead.contact.firstName} ${lead.contact.lastName} - ${lead.contact.position || 'N/A'}` : 'N/A'}
- Owner: ${lead.owner.name}
- Expected Close: ${lead.expectedClose ? new Date(lead.expectedClose).toLocaleDateString() : 'Not set'}
- Notes: ${lead.notes || 'None'}
- Created: ${new Date(lead.createdAt).toLocaleDateString()}

RECENT ACTIVITIES:
${activities}

RECENT MESSAGES:
${messages}
`.trim();
}

// ─── Lead Summary ────────────────────────────────────────────────
export async function generateLeadSummary(leadId: string): Promise<AiResponse<AiLeadSummary>> {
  const lead = await getLeadById(leadId);
  if (!lead) return { success: false, error: 'Lead not found' };

  const context = buildLeadContext(lead);

  const systemPrompt = `You are an AI CRM assistant for Jenosize, a tech agency. Analyze the lead data and provide a concise summary.
Return JSON with this exact structure:
{
  "summary": "2-3 sentence overview of the lead status and relationship",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "sentiment": "positive" | "neutral" | "negative"
}`;

  const result = await callAI(systemPrompt, context);

  if (!result) {
    // Fallback response
    return {
      success: true,
      fallback: true,
      data: {
        summary: `${lead.title} is currently in ${lead.stage} stage${lead.value ? ` with a value of ฿${Number(lead.value).toLocaleString()}` : ''}. ${lead.company ? `Company: ${lead.company.name}.` : ''} ${lead.activities?.length || 0} activities recorded.`,
        keyPoints: [
          `Stage: ${lead.stage}`,
          `${lead.activities?.length || 0} activities logged`,
          `Source: ${lead.source}`,
        ],
        sentiment: lead.stage === 'WON' ? 'positive' : lead.stage === 'LOST' ? 'negative' : 'neutral',
        generatedAt: new Date().toISOString(),
      },
    };
  }

  try {
    const parsed = JSON.parse(result);
    return {
      success: true,
      data: { ...parsed, generatedAt: new Date().toISOString() },
    };
  } catch {
    return {
      success: true,
      data: {
        summary: result,
        keyPoints: [],
        sentiment: 'neutral' as const,
        generatedAt: new Date().toISOString(),
      },
    };
  }
}

// ─── Qualification Score ─────────────────────────────────────────
export async function generateQualificationScore(leadId: string): Promise<AiResponse<AiQualificationScore>> {
  const lead = await getLeadById(leadId);
  if (!lead) return { success: false, error: 'Lead not found' };

  const context = buildLeadContext(lead);

  const systemPrompt = `You are an AI CRM assistant. Score the lead's qualification on 0-100 based on:
- Budget/value clarity (0-25)
- Decision maker engagement (0-25)
- Timeline urgency (0-25)
- Requirements clarity (0-25)

Return JSON:
{
  "score": 75,
  "reasons": ["reason 1", "reason 2", "reason 3"],
  "confidence": "high" | "medium" | "low"
}`;

  const result = await callAI(systemPrompt, context);

  if (!result) {
    // Fallback: simple heuristic scoring
    let score = 30;
    const reasons: string[] = [];

    if (lead.value && Number(lead.value) > 0) {
      score += 15;
      reasons.push(`Budget specified: ฿${Number(lead.value).toLocaleString()}`);
    } else {
      reasons.push('No budget specified');
    }

    if (lead.contact) {
      score += 10;
      reasons.push(`Primary contact: ${lead.contact.firstName} ${lead.contact.lastName}`);
    }

    if ((lead.activities?.length || 0) > 3) {
      score += 15;
      reasons.push(`${lead.activities?.length} activities show active engagement`);
    }

    if (lead.expectedClose) {
      score += 10;
      reasons.push('Expected close date set');
    }

    if (lead.stage === 'PROPOSAL' || lead.stage === 'WON') {
      score += 10;
      reasons.push(`Advanced stage: ${lead.stage}`);
    }

    return {
      success: true,
      fallback: true,
      data: {
        score: Math.min(score, 100),
        reasons,
        confidence: 'low' as const,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  try {
    const parsed = JSON.parse(result);
    return {
      success: true,
      data: { ...parsed, generatedAt: new Date().toISOString() },
    };
  } catch {
    return {
      success: true,
      data: {
        score: 50,
        reasons: [result],
        confidence: 'low' as const,
        generatedAt: new Date().toISOString(),
      },
    };
  }
}

// ─── Next Best Action ────────────────────────────────────────────
export async function generateNextAction(leadId: string): Promise<AiResponse<AiNextAction>> {
  const lead = await getLeadById(leadId);
  if (!lead) return { success: false, error: 'Lead not found' };

  const context = buildLeadContext(lead);

  const systemPrompt = `You are an AI CRM assistant. Based on the lead data, suggest the single best next action for the salesperson.
Return JSON:
{
  "action": "Clear, specific action step",
  "priority": "high" | "medium" | "low",
  "reasoning": "Why this action is recommended",
  "suggestedTimeline": "e.g., Within 2 days"
}`;

  const result = await callAI(systemPrompt, context);

  if (!result) {
    // Fallback: rule-based suggestions
    const stageActions: Record<string, AiNextAction> = {
      NEW: { action: 'Schedule discovery call to understand requirements', priority: 'high', reasoning: 'New leads should be contacted within 24 hours', suggestedTimeline: 'Within 1 day', generatedAt: new Date().toISOString() },
      QUALIFIED: { action: 'Prepare and send proposal with pricing', priority: 'high', reasoning: 'Lead is qualified, move to proposal stage', suggestedTimeline: 'Within 3 days', generatedAt: new Date().toISOString() },
      PROPOSAL: { action: 'Follow up on proposal and address any concerns', priority: 'medium', reasoning: 'Proposal sent, need to maintain momentum', suggestedTimeline: 'Within 2 days', generatedAt: new Date().toISOString() },
      WON: { action: 'Schedule kickoff meeting and assign team', priority: 'high', reasoning: 'Deal won, begin delivery', suggestedTimeline: 'Within 1 week', generatedAt: new Date().toISOString() },
      LOST: { action: 'Send follow-up email and document lessons learned', priority: 'low', reasoning: 'Maintain relationship for future opportunities', suggestedTimeline: 'Within 1 week', generatedAt: new Date().toISOString() },
    };

    return {
      success: true,
      fallback: true,
      data: stageActions[lead.stage] || stageActions.NEW,
    };
  }

  try {
    const parsed = JSON.parse(result);
    return {
      success: true,
      data: { ...parsed, generatedAt: new Date().toISOString() },
    };
  } catch {
    return {
      success: true,
      data: {
        action: result,
        priority: 'medium' as const,
        reasoning: 'AI-generated suggestion',
        suggestedTimeline: 'Soon',
        generatedAt: new Date().toISOString(),
      },
    };
  }
}

// ─── Draft LINE Reply ────────────────────────────────────────────
export async function generateDraftReply(leadId: string): Promise<AiResponse<AiDraftReply>> {
  const lead = await getLeadById(leadId);
  if (!lead) return { success: false, error: 'Lead not found' };

  const context = buildLeadContext(lead);

  const systemPrompt = `You are an AI CRM assistant for Jenosize. Draft a professional, friendly LINE reply in the same language as the conversation (Thai or English).
Keep it concise (under 200 characters for LINE).
Return JSON:
{
  "content": "The draft reply message",
  "tone": "professional" | "friendly" | "formal",
  "context": "Brief explanation of why this reply"
}`;

  const result = await callAI(systemPrompt, context);

  if (!result) {
    // Fallback
    const lastInbound = lead.messages?.filter(m => m.direction === 'INBOUND').pop();
    const contactName = lead.contact ? lead.contact.firstName : 'Customer';

    return {
      success: true,
      fallback: true,
      data: {
        content: lastInbound
          ? `สวัสดีค่ะคุณ${contactName} ขอบคุณสำหรับข้อความค่ะ เราจะติดต่อกลับโดยเร็วค่ะ`
          : `สวัสดีค่ะคุณ${contactName} ยินดีให้บริการค่ะ มีอะไรให้ช่วยเหลือคะ?`,
        tone: 'friendly',
        context: 'Fallback reply: AI service unavailable',
        generatedAt: new Date().toISOString(),
      },
    };
  }

  try {
    const parsed = JSON.parse(result);
    return {
      success: true,
      data: { ...parsed, generatedAt: new Date().toISOString() },
    };
  } catch {
    return {
      success: true,
      data: {
        content: result.slice(0, 200),
        tone: 'professional',
        context: 'AI-generated reply',
        generatedAt: new Date().toISOString(),
      },
    };
  }
}
