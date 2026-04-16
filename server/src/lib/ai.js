import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function classifyComplaint(text) {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: `Classify this camp complaint. Respond ONLY with JSON:
{
  "category": "Water Issue|Electricity|AC / Cooling|Plumbing|Maintenance|Hygiene / Cleaning|Security|Noise|Other",
  "priority": "low|medium|high|urgent",
  "title": "short summary, max 80 chars"
}

Complaint: "${text}"`
    }]
  });
  return JSON.parse(response.content[0].text);
}

// ============================================================
// narrateAnomaly — dashboard insight sentence
// from BARTAWI_BACKEND_AUDIT_AND_FIXES.md Section 9.2
// ============================================================

export async function narrateAnomaly(metric, currentValue, baseline, breakdown) {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Write 1-2 sentences explaining this camp management anomaly. Be concrete, not generic.

Metric: ${metric}
Current: ${currentValue}
Baseline (historical avg): ${baseline}
Breakdown by block: ${JSON.stringify(breakdown)}

Output only the sentences, no preamble.`
    }]
  })
  return response.content[0].text
}

// ============================================================
// matchEntity — AI fuzzy dedup on check-in
// from BARTAWI_BACKEND_AUDIT_AND_FIXES.md Section 9.3
// ============================================================

export async function matchEntity(newName, candidates) {
  if (candidates.length === 0) return null
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Which of these existing entities (if any) is the same as the new name? Respond with JSON only.

New name: "${newName}"

Existing candidates:
${candidates.map((c, i) => `${i}. "${c.name}"`).join('\n')}

Respond:
{
  "match_index": <number or null>,
  "confidence": <0-1>,
  "reason": "short explanation"
}`
    }]
  })
  // Parse JSON from the response
  const text = response.content[0].text.trim()
  try {
    return JSON.parse(text)
  } catch {
    // If the model wrapped in markdown fences, strip them
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim()
    return JSON.parse(cleaned)
  }
}
