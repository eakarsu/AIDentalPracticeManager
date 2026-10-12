const fetch = require('node-fetch');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function queryOpenRouter(prompt, systemPrompt = 'You are an expert dental AI assistant.', { signal } = {}) {
  signal?.throwIfAborted();
  if (!process.env.OPENROUTER_API_KEY) {
    const error = new Error('OpenRouter is not configured. Configure the native AI provider before generating.');
    error.statusCode = 503;
    throw error;
  }
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AI Dental Practice Manager',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  }).catch(failure => {
    if (signal?.aborted) throw failure;
    const error = new Error('OpenRouter could not be reached. Try again later.');
    error.statusCode = 502;
    throw error;
  });

  if (!response.ok) {
    const error = new Error('OpenRouter could not complete the request (HTTP ' + response.status + '). Try again later.');
    error.statusCode = 502;
    throw error;
  }

  let data;
  try { data = await response.json(); } catch (failure) {
    if (signal?.aborted) throw failure;
    const error = new Error('OpenRouter returned an invalid response. Generate the report again.');
    error.statusCode = 502;
    throw error;
  }
  signal?.throwIfAborted();
  const choice = data.choices?.[0];
  if (data.error || choice?.message?.refusal || ['length', 'content_filter'].includes(choice?.finish_reason) || typeof choice?.message?.content !== 'string' || !choice.message.content.trim()) {
    const error = new Error('OpenRouter did not return a complete AI response. Revise the request or try again.');
    error.statusCode = 502;
    throw error;
  }
  return {
    content: choice.message.content,
    model: data.model,
    usage: data.usage,
    id: data.id,
  };
}

module.exports = { queryOpenRouter };
