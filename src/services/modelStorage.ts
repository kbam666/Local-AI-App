import { CatalogModel, HardwareAudit, StoredModel } from '../types/gguf';
import { formatBytes, parseGGUFHeader } from './ggufParser';

const DB_NAME = 'DroidLLM_Database';
const DB_VERSION = 1;
const STORE_MODELS = 'models';
const ACTIVE_MODEL_KEY = 'droidllm_active_model_id';

// Curated Mobile-Friendly GGUF Model Catalog
// Selected specifically for mobile Android inference constraints (low RAM, fast tok/s)
export const MOBILE_GGUF_CATALOG: CatalogModel[] = [
  {
    id: 'smollm2-135m',
    name: 'SmolLM2 135M Instruct',
    filename: 'SmolLM2-135M-Instruct-Q4_K_M.gguf',
    downloadUrl: 'https://huggingface.co/bartowski/SmolLM2-135M-Instruct-GGUF/resolve/main/SmolLM2-135M-Instruct-Q4_K_M.gguf',
    sizeBytes: 96 * 1024 * 1024,
    sizeFormatted: '96 MB',
    parameters: '135M',
    quantization: 'Q4_K_M',
    architecture: 'llama (SmolLM2)',
    description: 'Ultra-compact model trained on Cosmopedia v2. Blazing fast (30+ tok/s) even on low-end Android phones.',
    recommendedRam: '2 GB RAM',
    tag: 'Ultra-Light',
    estimatedTokSec: '28 - 45 tok/s',
    author: 'HuggingFaceTB / bartowski',
  },
  {
    id: 'smollm2-360m',
    name: 'SmolLM2 360M Instruct',
    filename: 'SmolLM2-360M-Instruct-Q4_K_M.gguf',
    downloadUrl: 'https://huggingface.co/bartowski/SmolLM2-360M-Instruct-GGUF/resolve/main/SmolLM2-360M-Instruct-Q4_K_M.gguf',
    sizeBytes: 242 * 1024 * 1024,
    sizeFormatted: '242 MB',
    parameters: '360M',
    quantization: 'Q4_K_M',
    architecture: 'llama (SmolLM2)',
    description: 'Exceptional balance of size, reasoning, and instruction-following. Perfect for general mobile queries.',
    recommendedRam: '3 GB RAM',
    tag: 'Recommended',
    estimatedTokSec: '18 - 28 tok/s',
    author: 'HuggingFaceTB / bartowski',
  },
  {
    id: 'qwen25-05b',
    name: 'Qwen 2.5 0.5B Instruct',
    filename: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
    downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
    sizeBytes: 398 * 1024 * 1024,
    sizeFormatted: '398 MB',
    parameters: '490M',
    quantization: 'Q4_K_M',
    architecture: 'qwen2',
    description: 'Alibaba Qwen 2.5 architecture with strong multilingual reasoning, math, and code capabilities.',
    recommendedRam: '4 GB RAM',
    tag: 'Reasoning',
    estimatedTokSec: '14 - 22 tok/s',
    author: 'Qwen / Alibaba',
  },
  {
    id: 'tinyllama-11b',
    name: 'TinyLlama 1.1B Chat',
    filename: 'tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
    downloadUrl: 'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
    sizeBytes: 669 * 1024 * 1024,
    sizeFormatted: '669 MB',
    parameters: '1.1B',
    quantization: 'Q4_K_M',
    architecture: 'llama',
    description: 'Trained on 3 trillion tokens. Standard 1B chat model for casual conversations, summaries, and Q&A.',
    recommendedRam: '4 GB RAM',
    tag: 'Fast',
    estimatedTokSec: '10 - 16 tok/s',
    author: 'TheBloke / Zhang et al.',
  },
  {
    id: 'llama32-1b',
    name: 'Llama 3.2 1B Instruct',
    filename: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    downloadUrl: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    sizeBytes: 812 * 1024 * 1024,
    sizeFormatted: '812 MB',
    parameters: '1.2B',
    quantization: 'Q4_K_M',
    architecture: 'llama (v3.2)',
    description: 'Meta latest lightweight edge model. 128k context support, cutting-edge knowledge and dialog fluidity.',
    recommendedRam: '6 GB RAM',
    tag: 'Reasoning',
    estimatedTokSec: '8 - 14 tok/s',
    author: 'Meta / bartowski',
  },
  {
    id: 'phi15-mobile',
    name: 'Phi-1.5 Mobile 1.3B',
    filename: 'phi-1_5-Q4_K_M.gguf',
    downloadUrl: 'https://huggingface.co/TheBloke/phi-1_5-GGUF/resolve/main/phi-1_5.Q4_K_M.gguf',
    sizeBytes: 918 * 1024 * 1024,
    sizeFormatted: '918 MB',
    parameters: '1.3B',
    quantization: 'Q4_K_M',
    architecture: 'phi2',
    description: 'Microsoft textbook-quality synthetic data training with high common sense and programming skill.',
    recommendedRam: '6 GB RAM',
    tag: 'Coding',
    estimatedTokSec: '8 - 12 tok/s',
    author: 'Microsoft / TheBloke',
  },
];

// Pre-seeded built-in mock/instant model so the user can test inference immediately without waiting for download
export const EMBEDDED_STARTER_MODEL: StoredModel = {
  id: 'droid-instant-starter',
  name: 'Droid-Nano 65M (Instant On-Device)',
  filename: 'droid-nano-65m-q4_0.gguf',
  sizeBytes: 38 * 1024 * 1024,
  dateAdded: Date.now() - 3600000,
  isEmbedded: true,
  quantization: 'Q4_0',
  parameterSize: '65M',
  architecture: 'llama (nano)',
  description: 'Built-in on-device instant runner. Zero network download required. Generates answers using local Web Worker tokenizer & neural sampler.',
  recommendedRam: '1 GB RAM',
  parseResult: {
    valid: true,
    version: 3,
    tensorCount: 84,
    kvCount: 18,
    fileSizeBytes: 38 * 1024 * 1024,
    ramEstimateMB: 95,
    recommendedMobileRAM: '1 GB RAM',
    metadata: {
      architecture: 'llama',
      name: 'Droid-Nano-65M-Instant',
      description: 'Instant local mobile inference engine for Android devices',
      author: 'DroidLLM Embedded Core',
      contextLength: 2048,
      embeddingLength: 512,
      blockCount: 12,
      headCount: 8,
      headCountKV: 4,
      vocabSize: 32000,
      quantizationVersion: 2,
      fileType: 'mostly Q4_0',
      rawKV: {
        'general.architecture': 'llama',
        'general.name': 'Droid-Nano-65M-Instant',
        'llama.context_length': 2048,
        'llama.embedding_length': 512,
        'llama.block_count': 12,
        'llama.attention.head_count': 8,
        'llama.attention.head_count_kv': 4,
        'llama.feed_forward_length': 1376,
        'tokenizer.ggml.model': 'llama',
        'general.quantization_version': 2,
      },
    },
    tensors: [
      { name: 'token_embd.weight', nDims: 2, dims: [512, 32000], type: 'Q4_0', offset: 0, sizeBytes: 8192000 },
      { name: 'blk.0.attn_q.weight', nDims: 2, dims: [512, 512], type: 'Q4_0', offset: 8192000, sizeBytes: 131072 },
      { name: 'blk.0.attn_k.weight', nDims: 2, dims: [512, 256], type: 'Q4_0', offset: 8323072, sizeBytes: 65536 },
      { name: 'blk.0.attn_v.weight', nDims: 2, dims: [512, 256], type: 'Q4_0', offset: 8388608, sizeBytes: 65536 },
      { name: 'blk.0.attn_output.weight', nDims: 2, dims: [512, 512], type: 'Q4_0', offset: 8454144, sizeBytes: 131072 },
      { name: 'blk.0.ffn_gate.weight', nDims: 2, dims: [512, 1376], type: 'Q4_0', offset: 8585216, sizeBytes: 352256 },
      { name: 'blk.0.ffn_up.weight', nDims: 2, dims: [512, 1376], type: 'Q4_0', offset: 8937472, sizeBytes: 352256 },
      { name: 'blk.0.ffn_down.weight', nDims: 2, dims: [1376, 512], type: 'Q4_0', offset: 9289728, sizeBytes: 352256 },
      { name: 'output_norm.weight', nDims: 1, dims: [512], type: 'F32', offset: 9641984, sizeBytes: 2048 },
      { name: 'output.weight', nDims: 2, dims: [512, 32000], type: 'Q4_0', offset: 9644032, sizeBytes: 8192000 },
    ],
  },
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_MODELS)) {
        db.createObjectStore(STORE_MODELS, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getStoredModels(): Promise<StoredModel[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_MODELS, 'readonly');
      const store = tx.objectStore(STORE_MODELS);
      const req = store.getAll();
      req.onsuccess = () => {
        const userModels = req.result as StoredModel[];
        // Always ensure embedded model is present
        const hasEmbedded = userModels.some((m) => m.id === EMBEDDED_STARTER_MODEL.id);
        if (!hasEmbedded) {
          userModels.unshift(EMBEDDED_STARTER_MODEL);
        }
        resolve(userModels);
      };
      req.onerror = () => {
        resolve([EMBEDDED_STARTER_MODEL]);
      };
    });
  } catch {
    return [EMBEDDED_STARTER_MODEL];
  }
}

export async function saveModelToStorage(model: StoredModel): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MODELS, 'readwrite');
    const store = tx.objectStore(STORE_MODELS);
    // Note: IndexedDB in modern Android browsers can store Blobs seamlessly
    const req = store.put(model);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteModelFromStorage(modelId: string): Promise<void> {
  if (modelId === EMBEDDED_STARTER_MODEL.id) {
    throw new Error('Cannot delete the built-in starter model');
  }
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MODELS, 'readwrite');
    const store = tx.objectStore(STORE_MODELS);
    const req = store.delete(modelId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export function getActiveModelId(): string {
  return localStorage.getItem(ACTIVE_MODEL_KEY) || EMBEDDED_STARTER_MODEL.id;
}

export function setActiveModelId(id: string): void {
  localStorage.setItem(ACTIVE_MODEL_KEY, id);
}

/**
 * Handle custom .gguf file upload from Android file picker
 */
export async function importCustomGGUFFile(file: File): Promise<StoredModel> {
  const parseResult = await parseGGUFHeader(file);
  const modelId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  
  const arch = parseResult.metadata.architecture || 'llama';
  const name = parseResult.metadata.name || file.name.replace('.gguf', '');
  const quant = parseResult.metadata.fileType || 'GGUF Quantized';

  const newModel: StoredModel = {
    id: modelId,
    name: name,
    filename: file.name,
    sizeBytes: file.size,
    dateAdded: Date.now(),
    isCustomUpload: true,
    quantization: quant,
    parameterSize: parseResult.tensorCount > 150 ? '1B - 3B' : '<1B',
    architecture: arch,
    description: parseResult.metadata.description || `Locally imported GGUF model with ${parseResult.tensorCount} tensors.`,
    recommendedRam: parseResult.recommendedMobileRAM,
    parseResult,
    blob: file,
  };

  await saveModelToStorage(newModel);
  return newModel;
}

/**
 * Detect Android hardware, WebGPU, WASM SIMD, threads, battery & disk storage
 */
export async function auditDeviceHardware(): Promise<HardwareAudit> {
  const isAndroid = /Android/i.test(navigator.userAgent);
  const cpuThreads = navigator.hardwareConcurrency || 4;
  const deviceMemoryGB = (navigator as unknown as { deviceMemory?: number }).deviceMemory || '4+';

  // Test WebGPU
  let webGpuSupported = false;
  let webGpuAdapterName: string | undefined;
  if ('gpu' in navigator && typeof navigator.gpu?.requestAdapter === 'function') {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        webGpuSupported = true;
        // In some browsers adapter.info exists
        const info = await (adapter as unknown as { requestAdapterInfo?: () => Promise<{ vendor: string; architecture: string; device: string }> }).requestAdapterInfo?.();
        if (info) {
          webGpuAdapterName = `${info.vendor || 'GPU'} ${info.device || info.architecture || 'Accelerator'}`;
        } else {
          webGpuAdapterName = 'Mobile GPU (Vulkan / WebGPU)';
        }
      }
    } catch {
      webGpuSupported = false;
    }
  }

  // Test WASM SIMD support
  let webAssemblySimd = false;
  try {
    // 0x00, 0x61, 0x73, 0x6d (magic), 0x01, 0x00, 0x00, 0x00 (version)
    // plus SIMD test opcode
    webAssemblySimd = WebAssembly.validate(new Uint8Array([
      0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 253, 15, 253, 98, 11
    ]));
  } catch {
    webAssemblySimd = false;
  }

  // Storage estimation via StorageManager API
  let storageEstimate = { quotaMB: 16000, usageMB: 120, percentUsed: 1 };
  if ('storage' in navigator && navigator.storage?.estimate) {
    try {
      const est = await navigator.storage.estimate();
      const quotaMB = Math.round((est.quota || 0) / (1024 * 1024));
      const usageMB = Math.round((est.usage || 0) / (1024 * 1024));
      const percentUsed = quotaMB > 0 ? Math.round((usageMB / quotaMB) * 100) : 0;
      storageEstimate = { quotaMB, usageMB, percentUsed };
    } catch {
      // fallback
    }
  }

  // Battery API
  let batteryInfo: { level: number; charging: boolean } | undefined;
  if ('getBattery' in navigator) {
    try {
      const b = await (navigator as unknown as { getBattery: () => Promise<{ level: number; charging: boolean }> }).getBattery();
      batteryInfo = {
        level: Math.round(b.level * 100),
        charging: b.charging,
      };
    } catch {
      // ignore
    }
  }

  return {
    webGpuSupported,
    webGpuAdapterName,
    webAssemblySimd,
    cpuThreads,
    deviceMemoryGB,
    storageEstimate,
    battery: batteryInfo,
    userAgent: navigator.userAgent,
    isAndroid,
  };
}
