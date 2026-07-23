// api/chat.js - Vercel Serverless Function using LangChain JS to query NVIDIA NIM API
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";

export default async function handler(req, res) {
  // Restrict the prototype proxy to its configured origin.
  res.setHeader('Access-Control-Allow-Origin', process.env.AGENT_WEB_ORIGIN || 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { model, messages, temperature, max_tokens } = req.body ?? {};
    const key = process.env.NVIDIA_API_KEY;
    if (!key) return res.status(503).json({ error: 'AI service is not configured' });
    const allowedModels = new Set([
      'meta/llama-3.1-8b-instruct',
      'meta/llama-3.1-70b-instruct',
      'nvidia/llama-3.1-nemotron-70b-instruct',
    ]);
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 12) {
      return res.status(400).json({ error: 'Invalid messages' });
    }
    if (messages.some((message) => !['system', 'user', 'assistant'].includes(message?.role) || typeof message?.content !== 'string' || message.content.length > 8000)) {
      return res.status(400).json({ error: 'Invalid message content' });
    }

    // 1. Initialize LangChain ChatOpenAI configured for NVIDIA NIM
    const chatModel = new ChatOpenAI({
      openAIApiKey: key,
      configuration: {
        baseURL: "https://integrate.api.nvidia.com/v1"
      },
      modelName: allowedModels.has(model) ? model : "meta/llama-3.1-70b-instruct",
      temperature: Number.isFinite(Number(temperature)) ? Math.min(Math.max(Number(temperature), 0), 0.3) : 0.2,
      maxTokens: Number.isFinite(Number(max_tokens)) ? Math.min(Math.max(Number(max_tokens), 1), 1024) : 512
    });

    // 2. Map standard messages to LangChain Message objects (SystemMessage, HumanMessage, AIMessage)
    const langchainMessages = messages.map(msg => {
      if (msg.role === 'system') {
        return new SystemMessage(msg.content);
      } else if (msg.role === 'assistant') {
        return new AIMessage(msg.content);
      } else {
        return new HumanMessage(msg.content);
      }
    });

    // 3. Call the LangChain model
    console.log(`[LangChain Agent] Calling model ${model} via NVIDIA NIM...`);
    const response = await chatModel.invoke(langchainMessages);

    // 4. Return standard response payload matching OpenAI format for compatibility
    return res.status(200).json({
      choices: [
        {
          message: {
            role: 'assistant',
            content: response.content
          }
        }
      ]
    });
  } catch (error) {
    console.error('LangChain Proxy Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
