// api/chat.js - Zero-dependency Vercel Serverless Function Proxy to bypass CORS for NVIDIA NIM API
export default async function handler(req, res) {
  // Allow CORS from localhost for local testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { model, messages, temperature, max_tokens, apiKey } = req.body;
    
    const key = apiKey || process.env.NVIDIA_API_KEY || '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';

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: model || 'meta/llama-3.1-70b-instruct',
        messages: messages,
        temperature: temperature !== undefined ? temperature : 0.2,
        max_tokens: max_tokens || 1024
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).end(errText);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Proxy Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
