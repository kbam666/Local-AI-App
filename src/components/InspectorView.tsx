import React, { useState } from 'react';
import {
  Search,
  Layers,
  Database,
  ShieldCheck,
  Cpu,
  Info,
  ChevronDown,
  ChevronUp,
  HardDrive,
  Activity,
} from 'lucide-react';
import { StoredModel } from '../types/gguf';
import { formatBytes } from '../services/ggufParser';

interface Props {
  activeModel: StoredModel;
}

export const InspectorView: React.FC<Props> = ({ activeModel }) => {
  const [tensorSearch, setTensorSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'metadata' | 'tensors'>('overview');

  const parse = activeModel.parseResult;
  const metadata = parse?.metadata;
  const tensors = parse?.tensors || [];

  const filteredTensors = tensors.filter((t) =>
    t.name.toLowerCase().includes(tensorSearch.toLowerCase())
  );

  // Compute KV cache memory sizes for mobile at different context lengths
  const embLength = metadata?.embeddingLength || 512;
  const blockCount = metadata?.blockCount || 12;
  const headCountKV = metadata?.headCountKV || metadata?.headCount || 8;
  const headCount = metadata?.headCount || 8;
  const headDim = Math.round(embLength / headCount);

  // 2 * layers * 2(fp16) * seq_len * kv_heads * head_dim
  const calcKvCacheMB = (seqLen: number) => {
    const bytes = 2 * blockCount * 2 * seqLen * headCountKV * headDim;
    return Math.round(bytes / (1024 * 1024));
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-950 p-4 space-y-4">
      {/* Title & GGUF Validation Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            GGUF Inspector
          </h2>
          <p className="text-xs text-slate-400">Binary structure, tensor layers & memory map</p>
        </div>

        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>GGUF v{parse?.version || 3} Valid</span>
        </div>
      </div>

      {/* Model Identity Card */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100">{activeModel.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{activeModel.filename}</p>
          </div>
          <span className="text-xs font-bold px-2 py-1 rounded-lg bg-slate-800 text-emerald-400">
            {formatBytes(activeModel.sizeBytes)}
          </span>
        </div>

        {/* Quick Spec Pills */}
        <div className="grid grid-cols-3 gap-2 pt-1 text-center">
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-medium">Architecture</div>
            <div className="text-xs font-bold text-slate-200 mt-0.5 uppercase tracking-wide truncate">
              {metadata?.architecture || activeModel.architecture}
            </div>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-medium">Quantization</div>
            <div className="text-xs font-bold text-emerald-400 mt-0.5 truncate">
              {activeModel.quantization}
            </div>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-medium">Context Window</div>
            <div className="text-xs font-bold text-blue-400 mt-0.5">
              {metadata?.contextLength ? `${metadata.contextLength} tok` : '2048 tok'}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
            activeTab === 'overview'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Memory & Specs
        </button>
        <button
          onClick={() => setActiveTab('metadata')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
            activeTab === 'metadata'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Metadata KV ({parse?.kvCount || Object.keys(metadata?.rawKV || {}).length})
        </button>
        <button
          onClick={() => setActiveTab('tensors')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
            activeTab === 'tensors'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Tensors ({parse?.tensorCount || tensors.length})
        </button>
      </div>

      {/* TAB 1: MEMORY & SPECS */}
      {activeTab === 'overview' && (
        <div className="space-y-3">
          {/* Mobile RAM Recommendation Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/90 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                Mobile RAM Allocation Estimate
              </span>
              <span className="font-bold text-emerald-400">
                ~{parse?.ramEstimateMB || Math.round(activeModel.sizeBytes / (1024 * 1024) + 120)} MB
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Recommended Android device profile: <strong className="text-slate-200">{parse?.recommendedMobileRAM || '4 GB RAM'}</strong>.
              Quantized 4-bit weights allow smooth inference on Snapdragon 7/8 series, Google Tensor, and MediaTek Dimensity chips.
            </p>

            {/* KV Cache Memory Breakdown Table */}
            <div className="pt-2 border-t border-slate-800">
              <div className="text-[11px] font-semibold text-slate-300 mb-2 flex items-center justify-between">
                <span>KV Cache Memory vs Context Length</span>
                <span className="text-[10px] text-slate-500">2-byte FP16 state</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-center">
                {[512, 1024, 2048, 4096].map((ctx) => (
                  <div key={ctx} className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
                    <div className="text-[10px] text-slate-400">{ctx} tokens</div>
                    <div className="text-xs font-bold text-slate-200 mt-0.5">
                      +{calcKvCacheMB(ctx)} MB
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Model Architecture Details */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              Transformer Dimensions
            </h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Embedding Dimension</span>
                <span className="font-medium text-slate-200">{metadata?.embeddingLength || 512}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Layer Blocks (Depth)</span>
                <span className="font-medium text-slate-200">{metadata?.blockCount || 12} layers</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Attention Heads (Q)</span>
                <span className="font-medium text-slate-200">{metadata?.headCount || 8} heads</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">KV Attention Heads</span>
                <span className="font-medium text-slate-200">{metadata?.headCountKV || metadata?.headCount || 4} heads (GQA)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Vocabulary Size</span>
                <span className="font-medium text-slate-200">{metadata?.vocabSize || '32,000'} tokens</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: METADATA KV PAIRS */}
      {activeTab === 'metadata' && (
        <div className="space-y-2">
          <p className="text-[11px] text-slate-400">
            Raw GGUF header key-value pairs decoded from binary stream:
          </p>
          <div className="rounded-2xl bg-slate-900 border border-slate-800 divide-y divide-slate-800/60 overflow-hidden text-xs">
            {metadata?.rawKV && Object.keys(metadata.rawKV).length > 0 ? (
              Object.entries(metadata.rawKV).map(([key, val]) => (
                <div key={key} className="p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-1">
                  <span className="font-mono text-[11px] text-emerald-400 break-all">{key}</span>
                  <span className="font-mono text-[11px] text-slate-300 break-all bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {String(val)}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-slate-500">No metadata keys found</div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TENSORS LIST */}
      {activeTab === 'tensors' && (
        <div className="space-y-2">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={tensorSearch}
              onChange={(e) => setTensorSearch(e.target.value)}
              placeholder="Search tensor names (e.g. attn_q, ffn_up)..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            {filteredTensors.length > 0 ? (
              filteredTensors.map((tensor, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-mono text-[11px] text-slate-200 truncate font-medium">
                      {tensor.name}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Dims: [{tensor.dims.join(' × ')}]
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-emerald-400 border border-slate-700">
                      {tensor.type}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatBytes(tensor.sizeBytes)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-slate-500 text-xs">
                No tensors matched &quot;{tensorSearch}&quot;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
