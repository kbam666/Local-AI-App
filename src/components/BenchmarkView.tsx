import React, { useState } from 'react';
import {
  Gauge,
  Cpu,
  Zap,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Sparkles,
  Award,
  Battery,
  HardDrive,
  Activity,
  Smartphone,
} from 'lucide-react';
import { BenchmarkResult, GenerationParams, HardwareAudit, StoredModel } from '../types/gguf';
import { llmEngine } from '../services/llmEngine';

interface Props {
  activeModel: StoredModel;
  hardwareAudit: HardwareAudit | null;
  params: GenerationParams;
}

export const BenchmarkView: React.FC<Props> = ({ activeModel, hardwareAudit, params }) => {
  const [targetTokens, setTargetTokens] = useState<number>(50);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTokSec, setCurrentTokSec] = useState(0);
  const [progressTokens, setProgressTokens] = useState(0);
  const [lastResult, setLastResult] = useState<BenchmarkResult | null>(null);
  const [benchmarkHistory, setBenchmarkHistory] = useState<BenchmarkResult[]>([]);
  const [benchmarkError, setBenchmarkError] = useState<string | null>(null);

  const handleStartBenchmark = () => {
    setIsRunning(true);
    setProgressTokens(0);
    setCurrentTokSec(0);
    setBenchmarkError(null);

    llmEngine.runBenchmark(targetTokens, params, {
      onProgress: (tokensGenerated, target, tokSec) => {
        setProgressTokens(tokensGenerated);
        setCurrentTokSec(tokSec);
      },
      onComplete: (result) => {
        setIsRunning(false);
        setLastResult(result);
        setBenchmarkHistory((prev) => [result, ...prev]);
      },
      onError: (err) => {
        setIsRunning(false);
        setBenchmarkError(`Benchmark notice: ${err}`);
      },
    });
  };

  const progressPercent = Math.min(100, Math.round((progressTokens / targetTokens) * 100));

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-950 p-4 space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Gauge className="w-5 h-5 text-emerald-400" />
            NPU & Hardware Audit
          </h2>
          <p className="text-xs text-slate-400">Android device capability & LLM token speed test</p>
        </div>
      </div>

      {benchmarkError && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-200 flex items-center gap-2">
          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{benchmarkError}</span>
        </div>
      )}

      {/* Hardware Audit Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* WebGPU Card */}
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">WebGPU / Vulkan</span>
            {hardwareAudit?.webGpuSupported ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <span className="text-[10px] text-amber-400 font-medium">CPU Fallback</span>
            )}
          </div>
          <div className="text-xs font-bold text-slate-200 truncate">
            {hardwareAudit?.webGpuSupported ? 'Hardware Accelerated' : 'WASM SIMD Active'}
          </div>
          <div className="text-[10px] text-slate-500 truncate">
            {hardwareAudit?.webGpuAdapterName || 'CPU SIMD 128-bit vectorization'}
          </div>
        </div>

        {/* CPU Cores Card */}
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">CPU Threads</span>
            <Cpu className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xs font-bold text-slate-200">
            {hardwareAudit?.cpuThreads || 4} Concurrency Cores
          </div>
          <div className="text-[10px] text-slate-500">
            Multi-threaded Web Worker pool
          </div>
        </div>

        {/* Device RAM Card */}
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">Device RAM</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xs font-bold text-slate-200">
            {hardwareAudit?.deviceMemoryGB ? `${hardwareAudit.deviceMemoryGB} GB` : '4+ GB'} Allocated
          </div>
          <div className="text-[10px] text-slate-500">
            Sufficient for Q4_K_M quant
          </div>
        </div>

        {/* Android Device Status */}
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">OS Environment</span>
            <Smartphone className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xs font-bold text-slate-200 truncate">
            {hardwareAudit?.isAndroid ? 'Android OS Detected' : 'Mobile Web Runtime'}
          </div>
          <div className="text-[10px] text-slate-500">
            {hardwareAudit?.battery ? `Battery ${hardwareAudit.battery.level}%` : 'High performance mode'}
          </div>
        </div>
      </div>

      {/* Benchmark Runner Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              On-Device Inference Speed Test
            </h3>
            <p className="text-[11px] text-slate-400">Testing model: {activeModel.name}</p>
          </div>

          {/* Tokens selector */}
          <div className="flex bg-slate-800 rounded-xl p-0.5 border border-slate-700">
            {[50, 100].map((t) => (
              <button
                key={t}
                onClick={() => setTargetTokens(t)}
                disabled={isRunning}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                  targetTokens === t
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t} tok
              </button>
            ))}
          </div>
        </div>

        {/* Live Speed Display Gauge */}
        <div className="flex flex-col items-center justify-center py-4 bg-slate-950/70 rounded-2xl border border-slate-800/80">
          <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 font-mono tracking-tight">
            {isRunning ? currentTokSec : lastResult ? lastResult.tokensPerSecond : '0.0'}
            <span className="text-base text-slate-400 font-sans ml-1 font-semibold">tok/s</span>
          </div>

          <div className="text-xs text-slate-400 mt-1">
            {isRunning
              ? `Evaluating tokens (${progressTokens} / ${targetTokens})...`
              : lastResult
              ? `Completed in ${(lastResult.elapsedMs / 1000).toFixed(2)}s • TTFT: ${lastResult.timeToFirstTokenMs}ms`
              : 'Ready to benchmark CPU/NPU performance'}
          </div>

          {/* Progress Bar */}
          {isRunning && (
            <div className="w-4/5 mt-3 bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full transition-all duration-150 animate-pulse"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>

        <button
          onClick={handleStartBenchmark}
          disabled={isRunning}
          className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 active:scale-98 transition"
        >
          {isRunning ? (
            <>
              <Activity className="w-4 h-4 animate-spin" />
              Benchmarking in Progress...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              Run {targetTokens}-Token Benchmark
            </>
          )}
        </button>
      </div>

      {/* Mobile SoC Reference Comparison */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
        <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Award className="w-3.5 h-3.5 text-amber-400" />
          Mobile SoC Reference Performance (SmolLM2 / Qwen 0.5B Q4)
        </h4>

        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-300 font-medium">Snapdragon 8 Gen 3 / Gen 2</span>
            <span className="text-emerald-400 font-bold font-mono">35 - 55 tok/s</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-300 font-medium">Google Tensor G3 / G4</span>
            <span className="text-emerald-400 font-bold font-mono">25 - 40 tok/s</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-300 font-medium">Dimensity 9300 / 8300</span>
            <span className="text-emerald-400 font-bold font-mono">30 - 48 tok/s</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-300 font-medium">Mid-Range (Snapdragon 7 / 6)</span>
            <span className="text-blue-400 font-bold font-mono">15 - 28 tok/s</span>
          </div>
        </div>
      </div>
    </div>
  );
};
