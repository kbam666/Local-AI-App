import { GGMLType, GGUFMetadata, GGUFParseResult, GGUFTensorInfo } from '../types/gguf';

const GGUF_MAGIC = 0x46554747; // 'GGUF' in LE

const GGML_TYPE_MAP: Record<number, GGMLType> = {
  0: 'F32',
  1: 'F16',
  2: 'Q4_0',
  3: 'Q4_1',
  6: 'Q5_0',
  7: 'Q5_1',
  8: 'Q8_0',
  9: 'Q8_1',
  10: 'Q2_K',
  11: 'Q3_K',
  12: 'Q4_K',
  13: 'Q5_K',
  14: 'Q6_K',
  15: 'Q8_K',
  16: 'IQ2_XXS',
  17: 'IQ2_XS',
  18: 'IQ3_XXS',
  19: 'IQ1_S',
  20: 'IQ4_NL',
  21: 'IQ3_S',
  22: 'IQ2_S',
  23: 'IQ4_XS',
};

enum GGUFValueType {
  UINT8 = 0,
  INT8 = 1,
  UINT16 = 2,
  INT16 = 3,
  UINT32 = 4,
  INT32 = 5,
  FLOAT32 = 6,
  BOOL = 7,
  STRING = 8,
  ARRAY = 9,
  UINT64 = 10,
  INT64 = 11,
  FLOAT64 = 12,
}

class BinaryReader {
  private view: DataView;
  private offset = 0;
  private textDecoder = new TextDecoder('utf-8');

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
  }

  getOffset() {
    return this.offset;
  }

  getRemaining() {
    return this.view.byteLength - this.offset;
  }

  hasBytes(n: number) {
    return this.offset + n <= this.view.byteLength;
  }

  readUint8(): number {
    const val = this.view.getUint8(this.offset);
    this.offset += 1;
    return val;
  }

  readInt8(): number {
    const val = this.view.getInt8(this.offset);
    this.offset += 1;
    return val;
  }

  readUint16(): number {
    const val = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return val;
  }

  readInt16(): number {
    const val = this.view.getInt16(this.offset, true);
    this.offset += 2;
    return val;
  }

  readUint32(): number {
    const val = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return val;
  }

  readInt32(): number {
    const val = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return val;
  }

  readFloat32(): number {
    const val = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return val;
  }

  readFloat64(): number {
    const val = this.view.getFloat64(this.offset, true);
    this.offset += 8;
    return val;
  }

  readUint64(): number {
    const low = this.view.getUint32(this.offset, true);
    const high = this.view.getUint32(this.offset + 4, true);
    this.offset += 8;
    return high * 4294967296 + low;
  }

  readInt64(): number {
    const low = this.view.getUint32(this.offset, true);
    const high = this.view.getInt32(this.offset + 4, true);
    this.offset += 8;
    return high * 4294967296 + low;
  }

  readBool(): boolean {
    return this.readUint8() !== 0;
  }

  readString(): string {
    const len = this.readUint64();
    if (len > 1024 * 1024) {
      throw new Error(`String length excessive: ${len}`);
    }
    if (!this.hasBytes(len)) {
      throw new Error('Buffer truncated while reading string');
    }
    const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, len);
    this.offset += len;
    return this.textDecoder.decode(bytes);
  }

  readValue(type: GGUFValueType): string | number | boolean | string[] {
    switch (type) {
      case GGUFValueType.UINT8:
        return this.readUint8();
      case GGUFValueType.INT8:
        return this.readInt8();
      case GGUFValueType.UINT16:
        return this.readUint16();
      case GGUFValueType.INT16:
        return this.readInt16();
      case GGUFValueType.UINT32:
        return this.readUint32();
      case GGUFValueType.INT32:
        return this.readInt32();
      case GGUFValueType.FLOAT32:
        return Math.round(this.readFloat32() * 1000) / 1000;
      case GGUFValueType.FLOAT64:
        return Math.round(this.readFloat64() * 1000) / 1000;
      case GGUFValueType.BOOL:
        return this.readBool();
      case GGUFValueType.STRING:
        return this.readString();
      case GGUFValueType.UINT64:
        return this.readUint64();
      case GGUFValueType.INT64:
        return this.readInt64();
      case GGUFValueType.ARRAY: {
        const itemType = this.readUint32() as GGUFValueType;
        const count = this.readUint64();
        // If large array (like tokenizer tokens 32000+), don't store all in rawKV to prevent memory spikes
        if (count > 100) {
          // Skip array items or read sample
          this.skipArrayItems(itemType, count);
          return `[Array of ${count} items]`;
        }
        const arr: string[] = [];
        for (let i = 0; i < count; i++) {
          arr.push(String(this.readValue(itemType)));
        }
        return arr;
      }
      default:
        throw new Error(`Unknown GGUF value type: ${type}`);
    }
  }

  private skipArrayItems(itemType: GGUFValueType, count: number) {
    if (itemType === GGUFValueType.STRING) {
      for (let i = 0; i < count; i++) {
        const len = this.readUint64();
        this.offset += len;
      }
    } else if (itemType === GGUFValueType.UINT8 || itemType === GGUFValueType.INT8 || itemType === GGUFValueType.BOOL) {
      this.offset += count;
    } else if (itemType === GGUFValueType.UINT16 || itemType === GGUFValueType.INT16) {
      this.offset += count * 2;
    } else if (itemType === GGUFValueType.UINT32 || itemType === GGUFValueType.INT32 || itemType === GGUFValueType.FLOAT32) {
      this.offset += count * 4;
    } else if (itemType === GGUFValueType.UINT64 || itemType === GGUFValueType.INT64 || itemType === GGUFValueType.FLOAT64) {
      this.offset += count * 8;
    }
  }
}

/**
 * Fast GGUF file header parser.
 * Reads only the first slice (e.g. 2MB - 6MB) so mobile devices never OOM when opening multi-GB models.
 */
export async function parseGGUFHeader(fileOrBlob: Blob): Promise<GGUFParseResult> {
  const fileSizeBytes = fileOrBlob.size;
  // Slice header: first 4MB is usually plenty for GGUF metadata
  const sliceSize = Math.min(fileSizeBytes, 4 * 1024 * 1024);
  const buffer = await fileOrBlob.slice(0, sliceSize).arrayBuffer();

  const reader = new BinaryReader(buffer);

  try {
    if (!reader.hasBytes(16)) {
      return createErrorResult(fileSizeBytes, 'File too small to be a valid GGUF model');
    }

    const magic = reader.readUint32();
    if (magic !== GGUF_MAGIC) {
      return createErrorResult(
        fileSizeBytes,
        `Invalid GGUF magic bytes (0x${magic.toString(16)}). Ensure this is a genuine .gguf file.`
      );
    }

    const version = reader.readUint32();
    if (version < 1 || version > 3) {
      return createErrorResult(fileSizeBytes, `Unsupported GGUF version: ${version}`);
    }

    const tensorCount = reader.readUint64();
    const kvCount = reader.readUint64();

    const rawKV: Record<string, string | number | boolean | string[]> = {};
    const metadata: GGUFMetadata = { rawKV };

    for (let i = 0; i < kvCount; i++) {
      if (!reader.hasBytes(12)) break;
      const key = reader.readString();
      const valType = reader.readUint32() as GGUFValueType;
      const val = reader.readValue(valType);
      rawKV[key] = val;

      // Extract well-known LLM metadata keys
      if (key === 'general.architecture') metadata.architecture = String(val);
      if (key === 'general.name') metadata.name = String(val);
      if (key === 'general.description') metadata.description = String(val);
      if (key === 'general.author') metadata.author = String(val);
      if (key === 'general.quantization_version') metadata.quantizationVersion = Number(val);
      if (key === 'general.file_type') metadata.fileType = String(val);

      // Architecture-specific keys (e.g. llama.context_length or qwen2.context_length)
      if (key.endsWith('.context_length')) metadata.contextLength = Number(val);
      if (key.endsWith('.embedding_length')) metadata.embeddingLength = Number(val);
      if (key.endsWith('.block_count')) metadata.blockCount = Number(val);
      if (key.endsWith('.feed_forward_length')) metadata.feedForwardLength = Number(val);
      if (key.endsWith('.attention.head_count')) metadata.headCount = Number(val);
      if (key.endsWith('.attention.head_count_kv')) metadata.headCountKV = Number(val);
      if (key === 'tokenizer.ggml.tokens' && Array.isArray(val)) {
        metadata.vocabSize = val.length;
      }
    }

    // Read tensors if reader still has bytes
    const tensors: GGUFTensorInfo[] = [];
    const maxTensorsToRead = Math.min(tensorCount, 250);

    for (let i = 0; i < maxTensorsToRead; i++) {
      if (!reader.hasBytes(24)) break;
      try {
        const tensorName = reader.readString();
        const nDims = reader.readUint32();
        const dims: number[] = [];
        for (let d = 0; d < nDims; d++) {
          dims.push(reader.readUint64());
        }
        const typeId = reader.readUint32();
        const offset = reader.readUint64();
        const type = GGML_TYPE_MAP[typeId] || 'UNKNOWN';

        // Calculate size in bytes
        const elements = dims.reduce((acc, v) => acc * v, 1);
        let bytesPerElem = 2; // rough default for quantized
        if (type === 'F32') bytesPerElem = 4;
        if (type === 'F16') bytesPerElem = 2;
        if (type === 'Q8_0') bytesPerElem = 1;
        if (type === 'Q4_K' || type === 'Q4_0') bytesPerElem = 0.55;
        const sizeBytes = Math.round(elements * bytesPerElem);

        tensors.push({
          name: tensorName,
          nDims,
          dims,
          type,
          offset,
          sizeBytes,
        });
      } catch {
        // If we reached the end of the 4MB preview slice, stop tensor parsing safely
        break;
      }
    }

    // Mobile RAM calculation & estimation
    const ramEstimateMB = Math.round(fileSizeBytes / (1024 * 1024) * 1.25 + 250); // Model + 250MB KV cache buffer
    let recommendedMobileRAM = '4 GB RAM';
    if (ramEstimateMB > 3000) recommendedMobileRAM = '8 GB RAM';
    if (ramEstimateMB > 5500) recommendedMobileRAM = '12 GB RAM';
    if (ramEstimateMB < 600) recommendedMobileRAM = '2 GB RAM (Lightweight)';

    return {
      valid: true,
      version,
      tensorCount,
      kvCount,
      metadata,
      tensors,
      fileSizeBytes,
      ramEstimateMB,
      recommendedMobileRAM,
    };
  } catch (err) {
    return createErrorResult(
      fileSizeBytes,
      `Error parsing GGUF: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

function createErrorResult(fileSizeBytes: number, errorMsg: string): GGUFParseResult {
  return {
    valid: false,
    version: 0,
    tensorCount: 0,
    kvCount: 0,
    metadata: { rawKV: {} },
    tensors: [],
    fileSizeBytes,
    ramEstimateMB: Math.round(fileSizeBytes / (1024 * 1024)),
    recommendedMobileRAM: '4 GB RAM',
    error: errorMsg,
  };
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
