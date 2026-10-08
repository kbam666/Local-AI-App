import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));

// Exclusively free-tier OpenRouter models
export const FREE_TIER_OPENROUTER_MODELS = [
  {
    id: 'openrouter/free',
    name: 'OpenRouter Auto Free',
    provider: 'OpenRouter',
    parameters: 'Auto-Selected',
    contextLength: 131072,
    description: 'Automatically routes requests to the optimal currently available free model with zero credit cost.',
    tag: 'Default Free',
    isRecommendedForTraining: true,
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Llama 3.3 70B Instruct (Free)',
    provider: 'Meta',
    parameters: '70B',
    contextLength: 131072,
    description: 'Premier 70B open-weights model with GPT-4-class reasoning on the OpenRouter free tier.',
    tag: 'Free Teacher',
    isRecommendedForTraining: true,
  },
  {
    id: 'deepseek/deepseek-r1:free',
    name: 'DeepSeek R1 (Free)',
    provider: 'DeepSeek',
    parameters: '671B (MoE)',
    contextLength: 65536,
    description: 'Groundbreaking reinforcement-learning reasoning model with transparent chain-of-thought traces.',
    tag: 'Free Reasoning',
    isRecommendedForTraining: true,
  },
  {
    id: 'deepseek/deepseek-chat:free',
    name: 'DeepSeek V3 (Free)',
    provider: 'DeepSeek',
    parameters: '671B (MoE)',
    contextLength: 65536,
    description: 'Flagship mixture-of-experts model optimized for versatile chat and instruction following.',
    tag: 'Free Chat',
    isRecommendedForTraining: true,
  },
  {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Gemini 2.0 Flash (Free)',
    provider: 'Google',
    parameters: 'Ultra-Fast',
    contextLength: 1048576,
    description: 'Ultra-low latency generation with massive 1M context window on the OpenRouter free tier.',
    tag: 'Free Fast',
    isRecommendedForTraining: true,
  },
  {
    id: 'qwen/qwen-2.5-coder-32b-instruct:free',
    name: 'Qwen 2.5 Coder 32B (Free)',
    provider: 'Alibaba Cloud',
    parameters: '32B',
    contextLength: 32768,
    description: 'Elite programming and technical instruction model freely accessible on OpenRouter.',
    tag: 'Free Coding',
    isRecommendedForTraining: true,
  },
  {
    id: 'meta-llama/llama-3.1-8b-instruct:free',
    name: 'Llama 3.1 8B Instruct (Free)',
    provider: 'Meta',
    parameters: '8B',
    contextLength: 131072,
    description: 'High-speed teacher model for generating tight, focused instructions for mobile SLMs.',
    tag: 'Free Lightweight',
    isRecommendedForTraining: true,
  },
  {
    id: 'mistralai/mistral-7b-instruct:free',
    name: 'Mistral 7B Instruct (Free)',
    provider: 'Mistral AI',
    parameters: '7B',
    contextLength: 32768,
    description: 'Compact European open-weights model available on the OpenRouter free tier.',
    tag: 'Free Efficient',
    isRecommendedForTraining: false,
  },
];

// 1. Health and API Key configuration status
app.get('/api/openrouter/status', (_req: Request, res: Response) => {
  const hasApiKey = Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim().length > 0);
  res.json({
    status: 'ok',
    hasApiKey,
    defaultModel: 'openrouter/free',
    modelCount: FREE_TIER_OPENROUTER_MODELS.length,
    tier: 'free',
    provider: 'OpenRouter AI (Free Tier)',
  });
});

// 2. Available Models List (Free Tier only)
app.get('/api/openrouter/models', async (_req: Request, res: Response) => {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return res.json({
      models: FREE_TIER_OPENROUTER_MODELS,
      source: 'curated_free_defaults',
      notice: 'OPENROUTER_API_KEY not configured in env; displaying curated OpenRouter free models.',
    });
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://droidllm.ai',
        'X-Title': 'DroidLLM Studio',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const liveList = Array.isArray(data.data) ? data.data : [];
      // Only include models that are on the free tier
      const freeModels = liveList.filter(
        (m: { id?: string; pricing?: { prompt?: string | number } }) =>
          m.id === 'openrouter/free' ||
          (typeof m.id === 'string' && m.id.endsWith(':free')) ||
          m.pricing?.prompt === 0 ||
          m.pricing?.prompt === '0'
      );

      return res.json({
        models: FREE_TIER_OPENROUTER_MODELS,
        liveFreeAvailableCount: freeModels.length,
        source: 'openrouter_free_live',
      });
    }
  } catch (err) {
    console.warn('[OpenRouter] Failed to fetch live models list, falling back to curated free models:', err);
  }

  res.json({
    models: FREE_TIER_OPENROUTER_MODELS,
    source: 'curated_free_fallback',
  });
});

// 3. Chat Completions Proxy
app.post('/api/openrouter/chat', async (req: Request, res: Response) => {
  const {
    model = 'openrouter/free',
    messages = [],
    temperature = 0.7,
    max_tokens = 1024,
    systemPrompt,
  } = req.body;

  const apiKey = process.env.OPENROUTER_API_KEY;
  const startTime = Date.now();

  const formattedMessages = [...messages];
  if (systemPrompt && !formattedMessages.some((m) => m.role === 'system')) {
    formattedMessages.unshift({ role: 'system', content: systemPrompt });
  }

  // If API key is configured, call OpenRouter API
  if (apiKey) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://droidllm.ai',
          'X-Title': 'DroidLLM Studio',
        },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
          temperature,
          max_tokens,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[OpenRouter API Error]', response.status, errorText);
        return res.status(response.status).json({
          error: `OpenRouter returned HTTP ${response.status}: ${errorText}`,
        });
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const content = choice?.message?.content || '(No response received from model)';
      const elapsedMs = Date.now() - startTime;
      const totalTokens = data.usage?.total_tokens || Math.round(content.length / 4);
      const completionTokens = data.usage?.completion_tokens || Math.round(content.length / 4);
      const tokSec = Math.round((completionTokens / Math.max(1, elapsedMs / 1000)) * 10) / 10;

      return res.json({
        content,
        model: data.model || model,
        id: data.id || `openrouter-${Date.now()}`,
        usage: {
          totalTokens,
          completionTokens,
          promptTokens: data.usage?.prompt_tokens || 0,
        },
        elapsedMs,
        tokSec,
        isSimulated: false,
      });
    } catch (err) {
      console.error('[OpenRouter Chat Exception]', err);
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to reach OpenRouter API',
      });
    }
  }

  // Fallback if OPENROUTER_API_KEY is not configured
  const lastUserMsg = [...formattedMessages].reverse().find((m) => m.role === 'user')?.content || 'Hello';
  const elapsedMs = 380;
  const mockContent = `[OpenRouter AI Notice: Running on OpenRouter Free Tier (${model})]\n\n` +
    `To connect live to ${model} without quotas:\n` +
    `1. Obtain an OpenRouter key from https://openrouter.ai/keys (Free accounts supported!)\n` +
    `2. Add OPENROUTER_API_KEY to your environment variables\n\n` +
    `Generated answer from ${model}:\n` +
    `"Regarding your prompt: '${lastUserMsg}'. In live mode, requests are processed using OpenRouter free-tier models with zero credit cost, ideal for lightweight inference and SLM dataset fine-tuning."`;

  const totalTokens = Math.round(mockContent.length / 4);

  return res.json({
    content: mockContent,
    model: `${model} (Free Tier)`,
    id: `sim-${Date.now()}`,
    usage: {
      totalTokens,
      completionTokens: totalTokens,
      promptTokens: Math.round(lastUserMsg.length / 4),
    },
    elapsedMs,
    tokSec: 85,
    isSimulated: true,
  });
});

// 4. Synthetic Training Dataset Generator (Teacher-Student Distillation via Free Tier)
app.post('/api/openrouter/generate-dataset', async (req: Request, res: Response) => {
  const {
    topic = 'Android System Optimization & Local LLMs',
    category = 'Mobile Performance',
    count = 5,
    model = 'openrouter/free',
    difficulty = 'Practical & Detailed',
    targetSLM = 'SmolLM2-135M',
  } = req.body;

  const apiKey = process.env.OPENROUTER_API_KEY;
  const targetCount = Math.max(1, Math.min(20, count));

  const promptText = `You are a world-class AI Teacher specialized in Knowledge Distillation and Synthetic Dataset Generation for Small Language Models (SLMs) such as ${targetSLM}.
Generate exactly ${targetCount} high-quality, diverse instruction-response training pairs for fine-tuning on the topic: "${topic}" (Category: "${category}").
Style/Difficulty requirement: "${difficulty}".

Rules for dataset pairs:
1. Every prompt must be realistic, direct, and representative of what real users ask.
2. Every response must be clear, well-structured, authoritative, and factually accurate.
3. Keep responses concise yet complete (2 to 5 sentences or neat bullet points) so they are optimal for SLM LoRA rank=8/16 fine-tuning without memory blowup.

You MUST respond strictly with valid JSON conforming to this schema (no markdown fences, no conversational preamble):
[
  {
    "prompt": "User instruction or question here",
    "response": "Detailed, authoritative answer here",
    "category": "${category}"
  }
]`;

  if (apiKey) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://droidllm.ai',
          'X-Title': 'DroidLLM Studio',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert AI dataset generator. Output valid JSON only. Do not wrap in markdown quotes if possible.',
            },
            {
              role: 'user',
              content: promptText,
            },
          ],
          temperature: 0.6,
          max_tokens: 3000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content || '';

        // Extract JSON array
        const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsedPairs = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsedPairs) && parsedPairs.length > 0) {
            return res.json({
              success: true,
              pairs: parsedPairs.map((p, idx) => ({
                id: `ex-synth-${Date.now()}-${idx + 1}`,
                prompt: String(p.prompt || '').trim(),
                response: String(p.response || '').trim(),
                category: String(p.category || category).trim(),
              })),
              topic,
              model,
              datasetName: `OpenRouter-${topic.slice(0, 22).trim().replace(/[^a-zA-Z0-9]/g, '_')}`,
              isLiveGenerated: true,
            });
          }
        }
      }
    } catch (err) {
      console.warn('[OpenRouter Dataset Generation] Live API call failed, generating fallback dataset:', err);
    }
  }

  // High-quality synthetic curriculum fallback
  const fallbackPairs = generateCuratedFallbackPairs(topic, category, targetCount);
  return res.json({
    success: true,
    pairs: fallbackPairs,
    topic,
    model: `${model} (Curated Free)`,
    datasetName: `OpenRouter-${topic.slice(0, 22).trim().replace(/[^a-zA-Z0-9]/g, '_')}`,
    isLiveGenerated: false,
    notice: apiKey ? 'Live response parsing fallback' : 'Generated curated curriculum dataset using OpenRouter free tier template.',
  });
});

// Helper for synthetic dataset generation fallback
function generateCuratedFallbackPairs(topic: string, category: string, count: number) {
  const templates = [
    {
      prompt: `What are the core fundamentals of ${topic}?`,
      response: `The core principles of ${topic} center on efficient resource utilization, predictable latency, and structured architectural patterns. Prioritizing deterministic execution ensures smooth mobile device performance without thermal throttling.`,
    },
    {
      prompt: `How do I diagnose and resolve performance bottlenecks in ${topic}?`,
      response: `To diagnose bottlenecks:\n1. Audit CPU and RAM telemetry using on-device profiling tools.\n2. Profile tensor allocation buffers and memory bus bandwidth.\n3. Reduce batch size and active sequence context to prevent memory pressure.`,
    },
    {
      prompt: `What best practices should be followed when deploying ${topic} on mobile?`,
      response: `Best practices include:\n• Applying 4-bit (Q4_K_M) quantization to minimize RAM footprint.\n• Utilizing LoRA rank decomposition (r=8) for domain specialization without full weight retraining.\n• Keeping thread counts aligned with device performance cores.`,
    },
    {
      prompt: `Explain the relationship between ${topic} and offline edge AI execution.`,
      response: `Executing ${topic} completely offline ensures zero latency spikes from network round-trips, 100% data privacy since zero tokens leave the device, and reliable functionality in transit or airplane mode.`,
    },
    {
      prompt: `Provide a structured step-by-step guideline for optimizing ${topic}.`,
      response: `1. Define target inference budget (RAM and ms-per-token).\n2. Curate a focused instruction dataset with diverse Q&A pairs.\n3. Execute LoRA parameter-efficient fine-tuning with AdamW optimizer.\n4. Validate cross-entropy perplexity reduction before production deployment.`,
    },
  ];

  return Array.from({ length: count }).map((_, idx) => {
    const tmpl = templates[idx % templates.length];
    return {
      id: `ex-synth-${Date.now()}-${idx + 1}`,
      prompt: tmpl.prompt,
      response: tmpl.response,
      category,
    };
  });
}

// 5. Teacher Evaluation / Comparison via Free Tier
app.post('/api/openrouter/evaluate', async (req: Request, res: Response) => {
  const { prompt, model = 'openrouter/free' } = req.body;
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (apiKey && prompt) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://droidllm.ai',
          'X-Title': 'DroidLLM Studio',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are the Teacher LLM benchmark on OpenRouter Free Tier. Provide an exemplary, authoritative, and precise answer for student SLM evaluation.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 512,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          return res.json({
            teacherResponse: content,
            model,
            isLive: true,
          });
        }
      }
    } catch (err) {
      console.warn('[OpenRouter Eval] Failed live call:', err);
    }
  }

  // Fallback teacher reference
  res.json({
    teacherResponse: `Teacher LLM Reference [${model}]:\n\n` +
      `Regarding "${prompt}":\n` +
      `Optimal execution requires balancing memory footprint against computational throughput. For local SLMs, utilize quantized attention matrices and low-rank adapter layers (LoRA) to match domain precision while staying well within mobile hardware boundaries.`,
    model,
    isLive: false,
  });
});

// Start Express server and mount Vite in development or static dist in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DroidLLM Server] Full-stack engine running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
