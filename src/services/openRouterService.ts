import { ChatMessage, StoredModel, TrainingExample } from '../types/gguf';

export interface OpenRouterModelInfo {
  id: string;
  name: string;
  provider: string;
  parameters: string;
  contextLength: number;
  description: string;
  tag: string;
  isRecommendedForTraining?: boolean;
}

// Exclusively free tier models on OpenRouter
export const FREE_TIER_OPENROUTER_MODELS: OpenRouterModelInfo[] = [
  {
    id: 'openrouter/free',
    name: 'OpenRouter Auto Free',
    provider: 'OpenRouter',
    parameters: 'Auto-Selected',
    contextLength: 131072,
    description: 'Default free router that automatically picks the highest-capacity currently available free model.',
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
    description: 'Groundbreaking RL reasoning model with explicit step-by-step logic traces on the free tier.',
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
    description: 'Lightning-fast generation with 1M context window on OpenRouter free tier for rapid dataset synthesis.',
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
    description: 'High-speed teacher model for generating tight, focused instructions aligned with mobile SLMs.',
    tag: 'Free Lightweight',
    isRecommendedForTraining: true,
  },
  {
    id: 'mistralai/mistral-7b-instruct:free',
    name: 'Mistral 7B Instruct (Free)',
    provider: 'Mistral AI',
    parameters: '7B',
    contextLength: 32768,
    description: 'Compact European open-weights powerhouse freely accessible on OpenRouter.',
    tag: 'Free Efficient',
    isRecommendedForTraining: false,
  },
];

// Alias for backwards compatibility
export const POPULAR_OPENROUTER_MODELS = FREE_TIER_OPENROUTER_MODELS;

export function createStoredModelFromOpenRouter(m: OpenRouterModelInfo): StoredModel {
  return {
    id: `openrouter-${m.id.replace(/[/:]/g, '-')}`,
    name: `[Free Cloud] ${m.name}`,
    filename: `openrouter/${m.id}`,
    sizeBytes: 0,
    dateAdded: Date.now(),
    isOpenRouter: true,
    openRouterModelId: m.id,
    quantization: 'Free Cloud API',
    parameterSize: m.parameters,
    architecture: `OpenRouter (${m.provider})`,
    description: m.description,
    recommendedRam: '0 MB (Free Cloud)',
  };
}

export async function getOpenRouterStatus(): Promise<{ hasApiKey: boolean; defaultModel: string; tier?: string }> {
  try {
    const res = await fetch('/api/openrouter/status');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[OpenRouter] Status check failed:', err);
  }
  return { hasApiKey: false, defaultModel: 'openrouter/free', tier: 'free' };
}

export async function getOpenRouterModels(): Promise<OpenRouterModelInfo[]> {
  try {
    const res = await fetch('/api/openrouter/models');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.models) && data.models.length > 0) {
        return data.models;
      }
    }
  } catch (err) {
    console.warn('[OpenRouter] Models list fetch failed:', err);
  }
  return FREE_TIER_OPENROUTER_MODELS;
}

export async function sendOpenRouterChat(
  messages: ChatMessage[],
  modelId: string = 'openrouter/free',
  options?: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<{
  content: string;
  model: string;
  totalTokens: number;
  tokSec: number;
  elapsedMs: number;
  isSimulated?: boolean;
}> {
  const formatted = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const res = await fetch('/api/openrouter/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelId,
      messages: formatted,
      systemPrompt: options?.systemPrompt,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1024,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenRouter Error: ${errorText}`);
  }

  const data = await res.json();
  return {
    content: data.content || '',
    model: data.model || modelId,
    totalTokens: data.usage?.totalTokens || 0,
    tokSec: data.tokSec || 40,
    elapsedMs: data.elapsedMs || 300,
    isSimulated: data.isSimulated,
  };
}

export async function generateSyntheticDataset(params: {
  topic: string;
  category?: string;
  count?: number;
  model?: string;
  difficulty?: string;
  targetSLM?: string;
}): Promise<{
  pairs: TrainingExample[];
  datasetName: string;
  model: string;
  isLiveGenerated: boolean;
  notice?: string;
}> {
  const res = await fetch('/api/openrouter/generate-dataset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...params,
      model: params.model || 'openrouter/free',
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to generate dataset with OpenRouter: ${errorText}`);
  }

  const data = await res.json();
  return {
    pairs: data.pairs || [],
    datasetName: data.datasetName || `OpenRouter-${params.topic.slice(0, 16)}`,
    model: data.model || params.model || 'openrouter/free',
    isLiveGenerated: Boolean(data.isLiveGenerated),
    notice: data.notice,
  };
}

export async function getTeacherEvaluation(
  prompt: string,
  modelId: string = 'openrouter/free'
): Promise<{
  teacherResponse: string;
  model: string;
  isLive: boolean;
}> {
  const res = await fetch('/api/openrouter/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, model: modelId }),
  });

  if (!res.ok) {
    throw new Error('Failed to retrieve Teacher LLM evaluation from OpenRouter');
  }

  return await res.json();
}
