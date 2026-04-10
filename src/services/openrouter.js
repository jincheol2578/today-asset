'use strict';

const config = require('../config');
const systemPrompt = require('../prompts/system');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Send a user message to OpenRouter and return the AI response text.
 * @param {string} userMessage - The user's market data / question
 * @returns {Promise<string>} AI response content
 */
async function analyze(userMessage) {
  if (!config.openrouter.apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set in environment variables.');
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.openrouter.apiKey}`,
      'HTTP-Referer': config.openrouter.siteUrl,
      'X-Title': config.openrouter.siteName,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.openrouter.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenRouter returned an empty response.');
  }
  return content;
}

module.exports = { analyze };
