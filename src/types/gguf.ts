export type GGMLType =
  | 'F32'
  | 'F16'
  | 'Q4_0'
  | 'Q4_1'
  | 'Q5_0'
  | 'Q5_1'
  | 'Q8_0'
  | 'Q8_1'
  | 'Q2_K'
  | 'Q3_K'
  | 'Q4_K'
  | 'Q5_K'
  | 'Q6_K'
  | 'Q8_K'
  | 'IQ2_XXS'
  | 'IQ2_XS'
  | 'IQ3_XXS'
  | 'IQ1_S'
  | 'IQ4_NL'
  | 'IQ3_S'
  | 'IQ2_S'
  | 'IQ4_XS'
  | 'UNKNOWN';

export interface GGUFTensorInfo {
  name: string;
  nDims: number;
  dims: number[];
  type: GGMLType;
  offset: number;
  sizeBytes: number;
}

export interface GGUFMetadata {
  architecture?: string;
  name?: string;
  description?: string;
  author?: string;
  contextLength?: number;
  embeddingLength?: number;
  blockCount?: number; // Number of layers
  feedForwardLength?: number;
  headCount?: number;
  headCountKV?: number;
  vocabSize?: number;
  quantizationVersion?: number;
  fileType?: string;
  rawKV: Record<string, string | number | boolean | string[]>;
}

export interface GGUFParseResult {
  valid: boolean;
  version: number;
  tensorCount: number;
  kvCount: number;
  metadata: GGUFMetadata;
  tensors: GGUFTensorInfo[];
  fileSizeBytes: number;
  ramEstimateMB: number;
  recommendedMobileRAM: string;
  error?: string;
}

export interface StoredModel {
  id: string;
  name: string;
  filename: string;
  sizeBytes: number;
  dateAdded: number;
  isCustomUpload?: boolean;
  isEmbedded?: boolean;
  parseResult?: GGUFParseResult;
  blob?: Blob;
  downloadUrl?: string;
  quantization: string;
  parameterSize: string;
  architecture: string;
  description: string;
  recommendedRam: string;
}

export interface CatalogModel {
  id: string;
  name: string;
  filename: string;
  downloadUrl: string;
  sizeBytes: number;
  sizeFormatted: string;
  parameters: string;
  quantization: string;
  architecture: string;
  description: string;
  recommendedRam: string;
  tag: 'Recommended' | 'Ultra-Light' | 'Reasoning' | 'Coding' | 'Fast';
  estimatedTokSec: string;
  author: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  tokensGenerated?: number;
  tokensPerSec?: number;
  timeToFirstTokenMs?: number;
  totalTimeMs?: number;
  modelUsed?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  modelId: string;
  modelName: string;
  messages: ChatMessage[];
}

export type Conversation = ChatSession;

export interface GenerationParams {
  temperature: number;
  topP: number;
  topK: number;
  maxTokens: number;
  repeatPenalty: number;
  systemPrompt: string;
  threads: number;
  useWebGPU: boolean;
  contextLength: number;
}

export interface HardwareAudit {
  webGpuSupported: boolean;
  webGpuAdapterName?: string;
  webAssemblySimd: boolean;
  cpuThreads: number;
  deviceMemoryGB: number | string;
  storageEstimate: {
    quotaMB: number;
    usageMB: number;
    percentUsed: number;
  };
  battery?: {
    level: number;
    charging: boolean;
  };
  userAgent: string;
  isAndroid: boolean;
}

export interface BenchmarkResult {
  timestamp: number;
  modelName: string;
  tokensGenerated: number;
  elapsedMs: number;
  tokensPerSecond: number;
  timeToFirstTokenMs: number;
  ramUsageMB: number;
  acceleration: 'WebGPU (Hardware)' | 'WASM SIMD (CPU)' | 'JavaScript Engine';
}

export interface DownloadProgress {
  modelId: string;
  modelName: string;
  bytesReceived: number;
  totalBytes: number;
  percentage: number;
  speedMBs: number;
  etaSeconds: number;
  isPaused: boolean;
  error?: string;
}

export interface TrainingExample {
  id: string;
  prompt: string;
  response: string;
  category?: string;
}

export interface TrainingDataset {
  id: string;
  name: string;
  description: string;
  category: string;
  examples: TrainingExample[];
  createdAt: number;
  updatedAt: number;
  isPreset?: boolean;
}

export interface FineTuningHyperparams {
  rank: number; // LoRA rank r: 4, 8, 16, 32
  alpha: number; // LoRA scaling alpha: 8, 16, 32, 64
  learningRate: number; // e.g. 0.0003
  epochs: number; // 1 to 10
  batchSize: number; // 1 to 4
  optimizer: 'AdamW' | 'SGD' | 'AdaFactor';
  targetModules: string[]; // ['q_proj', 'v_proj', 'k_proj', 'o_proj']
  warmupRatio: number;
  weightDecay: number;
}

export interface TrainingStepRecord {
  step: number;
  epoch: number;
  loss: number;
  learningRate: number;
  tokSec: number;
}

export interface TrainingTelemetry {
  step: number;
  totalSteps: number;
  epoch: number;
  totalEpochs: number;
  currentLoss: number;
  initialLoss: number;
  lossHistory: TrainingStepRecord[];
  learningRate: number;
  tokensPerSec: number;
  elapsedSec: number;
  estimatedRemainingSec: number;
  status: 'idle' | 'preparing' | 'training' | 'paused' | 'completed' | 'failed';
  currentExamplePrompt?: string;
  logMessages: string[];
}

export interface LoRAAdapter {
  id: string;
  name: string;
  baseModelId: string;
  baseModelName: string;
  appliedModelId?: string;
  appliedModelName?: string;
  datasetName: string;
  datasetSize: number;
  hyperparams: FineTuningHyperparams;
  initialLoss: number;
  finalLoss: number;
  createdAt: number;
  isActive: boolean;
  adapterSizeFormatted: string;
  weightsMatrixSummary: {
    rank: number;
    alpha: number;
    targetModules: string[];
    parametersTrained: number;
    matrixANorm?: number;
    matrixBNorm?: number;
  };
  samplePrompt?: string;
  sampleResponse?: string;
  learnedInstructions?: { prompt: string; response: string; loss: number }[];
}
