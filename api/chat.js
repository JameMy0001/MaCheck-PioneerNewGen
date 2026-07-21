// api/chat.js - Vercel Serverless Function using LangChain JS to query NVIDIA NIM API
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";

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

    // 1. Initialize LangChain ChatOpenAI configured for NVIDIA NIM
    const chatModel = new ChatOpenAI({
      openAIApiKey: key,
      configuration: {
        baseURL: "https://integrate.api.nvidia.com/v1"
      },
      modelName: model || "meta/llama-3.1-70b-instruct",
      temperature: temperature !== undefined ? temperature : 0.2,
      maxTokens: max_tokens || 1024
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

    // 3. Call the LangChain model (invoke/call)
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
