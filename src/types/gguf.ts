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

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  modelId: string;
  modelName: string;
  messages: ChatMessage[];
}

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
