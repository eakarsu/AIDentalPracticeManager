// Shared helper: parse AI text into JSON using 3 strategies
// 1. Strip ```json fences and parse
// 2. Extract first {...} block via regex and parse
// 3. Return { raw_response } as fallback
function parseAIJson(text) {
  if (!text || typeof text !== 'string') return { raw_response: text };

  // Strategy 1: strip code fences
  try {
    const cleaned = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
    return JSON.parse(cleaned);
  } catch {
    // continue
  }

  // Strategy 2: extract first JSON object via regex
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch {
    // continue
  }

  // Strategy 3: fallback raw
  return { raw_response: text };
}

module.exports = { parseAIJson };
