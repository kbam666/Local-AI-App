import { BenchmarkResult, ChatMessage, GenerationParams, StoredModel } from '../types/gguf';
import { EMBEDDED_STARTER_MODEL, getActiveModelId, getStoredModels } from './modelStorage';

export interface GenerationCallbacks {
  onToken: (token: string, currentTokSec: number) => void;
  onComplete: (stats: { fullText: string; totalTokens: number; tokSec: number; elapsedMs: number; ttftMs: number }) => void;
  onError: (err: string) => void;
}

export interface BenchmarkCallbacks {
  onProgress: (tokensGenerated: number, targetTokens: number, currentTokSec: number) => void;
  onComplete: (result: BenchmarkResult) => void;
  onError: (err: string) => void;
}

class LLMEngine {
  private worker: Worker | null = null;
  private activeModel: StoredModel = EMBEDDED_STARTER_MODEL;
  private isModelReady = false;
  private isGenerating = false;
  private generationCallbacks: GenerationCallbacks | null = null;
  private benchmarkCallbacks: BenchmarkCallbacks | null = null;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    try {
      this.worker = new Worker(new URL('./inferenceWorker.ts', import.meta.url), {
        type: 'module',
      });

      this.worker.onmessage = (e: MessageEvent) => {
        const { type, ...data } = e.data;

        switch (type) {
          case 'MODEL_LOADED':
            this.isModelReady = true;
            break;

          case 'TOKEN':
            if (this.generationCallbacks) {
              this.generationCallbacks.onToken(data.token, data.tokensPerSec);
            }
            break;

          case 'DONE':
            this.isGenerating = false;
            if (this.generationCallbacks) {
              this.generationCallbacks.onComplete({
                fullText: data.fullText,
                totalTokens: data.totalTokens,
                tokSec: data.tokSec,
                elapsedMs: data.elapsedMs,
                ttftMs: data.ttftMs,
              });
              this.generationCallbacks = null;
            }
            break;

          case 'BENCHMARK_PROGRESS':
            if (this.benchmarkCallbacks) {
              this.benchmarkCallbacks.onProgress(data.tokensGenerated, data.targetTokens, data.tokSec);
            }
            break;

          case 'BENCHMARK_DONE':
            if (this.benchmarkCallbacks) {
              this.benchmarkCallbacks.onComplete(data.result);
              this.benchmarkCallbacks = null;
            }
            break;

          case 'ERROR':
            this.isGenerating = false;
            if (this.generationCallbacks) {
              this.generationCallbacks.onError(data.error);
              this.generationCallbacks = null;
            }
            if (this.benchmarkCallbacks) {
              this.benchmarkCallbacks.onError(data.error);
              this.benchmarkCallbacks = null;
            }
            break;
        }
      };
    } catch (err) {
      console.error('Failed to initialize Inference Worker:', err);
    }
  }

  async loadModel(model: StoredModel, params: GenerationParams): Promise<void> {
    this.activeModel = model;
    if (!this.worker) this.initWorker();

    this.worker?.postMessage({
      type: 'LOAD_MODEL',
      payload: { model, params },
    });
    this.isModelReady = true;
  }

  getActiveModel(): StoredModel {
    return this.activeModel;
  }

  generate(
    prompt: string,
    history: ChatMessage[],
    params: GenerationParams,
    callbacks: GenerationCallbacks
  ) {
    if (!this.worker) this.initWorker();

    this.isGenerating = true;
    this.generationCallbacks = callbacks;

    this.worker?.postMessage({
      type: 'GENERATE',
      payload: {
        prompt,
        history,
        modelName: this.activeModel.name,
        systemPrompt: params.systemPrompt,
        params,
      },
    });
  }

  stop() {
    if (this.isGenerating) {
      this.worker?.postMessage({ type: 'STOP' });
      this.isGenerating = false;
    }
  }

  runBenchmark(tokensToGenerate: number, params: GenerationParams, callbacks: BenchmarkCallbacks) {
    if (!this.worker) this.initWorker();

    this.benchmarkCallbacks = callbacks;
    this.worker?.postMessage({
      type: 'BENCHMARK',
      payload: {
        tokensToGenerate,
        params,
      },
    });
  }

  async restoreActiveModel(params: GenerationParams): Promise<StoredModel> {
    const models = await getStoredModels();
    const activeId = getActiveModelId();
    const found = models.find((m) => m.id === activeId) || models[0] || EMBEDDED_STARTER_MODEL;
    await this.loadModel(found, params);
    return found;
  }
}

export const llmEngine = new LLMEngine();
