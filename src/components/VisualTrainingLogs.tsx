import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Activity,
  TrendingDown,
  Layers,
  Terminal,
  CheckCircle,
  Clock,
  Zap,
  Copy,
  Check,
  Lock,
  Unlock,
  Sparkles,
  Info,
  Gauge,
  Brain,
  Cpu,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { TrainingTelemetry, TrainingStepRecord, LoRAAdapter, FineTuningHyperparams } from '../types/gguf';

interface VisualTrainingLogsProps {
  telemetry: TrainingTelemetry | null;
  isTraining: boolean;
  isPaused: boolean;
  hyperparams: FineTuningHyperparams;
  modelName: string;
  datasetName: string;
  lastTrainedAdapter?: LoRAAdapter | null;
  onOpenAdaptersTab?: () => void;
  onOpenTestBench?: () => void;
}

export const VisualTrainingLogs: React.FC<VisualTrainingLogsProps> = ({
  telemetry,
  isTraining,
  isPaused,
  hyperparams,
  modelName,
  datasetName,
  lastTrainedAdapter,
  onOpenAdaptersTab,
  onOpenTestBench,
}) => {
  // UI States
  const [chartMetric, setChartMetric] = useState<'loss' | 'perplexity' | 'lr'>('loss');
  const [hoveredPoint, setHoveredPoint] = useState<TrainingStepRecord | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'epochs' | 'steps' | 'config'>('all');
  const [isExpanded, setIsExpanded] = useState(false);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [telemetry?.logMessages, autoScroll]);

  // Copy Logs to Clipboard
  const handleCopyLogs = async () => {
    if (!telemetry?.logMessages || telemetry.logMessages.length === 0) return;
    try {
      const text = telemetry.logMessages.join('\n');
      await navigator.clipboard.writeText(text);
      setCopiedLogs(true);
      setTimeout(() => setCopiedLogs(false), 2000);
    } catch {
      // fallback
    }
  };

  // Format Elapsed / ETA seconds
  const formatTime = (seconds: number) => {
    if (seconds <= 0 || !isFinite(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Filtered log messages
  const filteredLogs = useMemo(() => {
    if (!telemetry?.logMessages) return [];
    if (logFilter === 'all') return telemetry.logMessages;
    if (logFilter === 'epochs') return telemetry.logMessages.filter((m) => m.toLowerCase().includes('epoch'));
    if (logFilter === 'steps') return telemetry.logMessages.filter((m) => m.toLowerCase().includes('step '));
    if (logFilter === 'config') return telemetry.logMessages.filter((m) => m.startsWith('[') && !m.toLowerCase().includes('epoch'));
    return telemetry.logMessages;
  }, [telemetry?.logMessages, logFilter]);

  // Derived metrics
  const lossHistory = telemetry?.lossHistory || [];
  const currentLoss = telemetry?.currentLoss ?? 0;
  const initialLoss = telemetry?.initialLoss ?? 0;
  const lossDropPct = initialLoss > 0
    ? Math.max(0, Math.round(((initialLoss - currentLoss) / initialLoss) * 100))
    : 0;

  // Best / Min loss recorded
  const minLossRecorded = useMemo(() => {
    if (lossHistory.length === 0) return currentLoss;
    return Math.min(...lossHistory.map((h) => h.loss));
  }, [lossHistory, currentLoss]);

  // Perplexity = exp(loss)
  const currentPerplexity = Math.exp(Math.min(10, currentLoss));
  const initialPerplexity = Math.exp(Math.min(10, initialLoss));

  // Step percentage
  const globalProgressPct = telemetry
    ? Math.min(100, Math.max(0, Math.round((telemetry.step / Math.max(1, telemetry.totalSteps)) * 100)))
    : 0;

  // Steps per epoch calculation
  const totalEpochs = telemetry?.totalEpochs || hyperparams.epochs;
  const currentEpoch = telemetry?.epoch || 1;
  const stepsPerEpoch = telemetry?.totalSteps ? Math.ceil(telemetry.totalSteps / totalEpochs) : 10;
  const epochStepProgress = telemetry
    ? ((telemetry.step - (currentEpoch - 1) * stepsPerEpoch) / stepsPerEpoch) * 100
    : 0;
  const clampedEpochProgress = Math.min(100, Math.max(0, Math.round(epochStepProgress)));

  // SVG Chart Geometry Calculations
  const chartData = useMemo(() => {
    if (lossHistory.length < 2) return null;

    let values: number[] = [];
    if (chartMetric === 'loss') {
      values = lossHistory.map((p) => p.loss);
    } else if (chartMetric === 'perplexity') {
      values = lossHistory.map((p) => Math.exp(Math.min(10, p.loss)));
    } else {
      values = lossHistory.map((p) => p.learningRate);
    }

    const maxVal = Math.max(...values) * 1.05;
    const minVal = Math.min(...values) * 0.95;
    const valRange = maxVal - minVal || 1;

    const width = 1000;
    const height = 300;
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const points = lossHistory.map((rec, i) => {
      const x = padding.left + (i / (lossHistory.length - 1)) * chartWidth;
      const val = chartMetric === 'loss'
        ? rec.loss
        : chartMetric === 'perplexity'
        ? Math.exp(Math.min(10, rec.loss))
        : rec.learningRate;
      const y = padding.top + chartHeight - ((val - minVal) / valRange) * chartHeight;
      return { x, y, record: rec, val };
    });

    const polylineStr = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    // Area closed path for SVG gradient fill
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    const areaPath = `M ${firstPoint.x.toFixed(1)},${(padding.top + chartHeight).toFixed(1)} ` +
      points.map((p) => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
      ` L ${lastPoint.x.toFixed(1)},${(padding.top + chartHeight).toFixed(1)} Z`;

    // Epoch boundary step indices
    const epochDividers = [];
    for (let ep = 1; ep < totalEpochs; ep++) {
      const stepTarget = ep * stepsPerEpoch;
      const foundIdx = lossHistory.findIndex((h) => h.step >= stepTarget);
      if (foundIdx > 0 && foundIdx < lossHistory.length) {
        const x = padding.left + (foundIdx / (lossHistory.length - 1)) * chartWidth;
        epochDividers.push({ epoch: ep, x });
      }
    }

    return {
      points,
      polylineStr,
      areaPath,
      minVal,
      maxVal,
      width,
      height,
      padding,
      chartWidth,
      chartHeight,
      epochDividers,
    };
  }, [lossHistory, chartMetric, totalEpochs, stepsPerEpoch]);

  // If no telemetry yet, show the standby visual radar component
  if (!telemetry && !isTraining) {
    return (
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 space-y-3.5 text-slate-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-600 animate-pulse" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Activity className="w-3.5 h-3.5 text-slate-400" />
              Visual Training Monitor & Real-Time Loss Logs
            </span>
          </div>
          <span className="text-[10px] text-slate-400 bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 rounded-md font-mono">
            Standby Mode
          </span>
        </div>

        {/* Blueprint Preview Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/60 text-center">
            <span className="text-[10px] text-slate-400 block font-medium">Target Projections</span>
            <span className="text-xs font-mono font-bold text-emerald-400 mt-0.5 block">
              {hyperparams.targetModules.join(', ')}
            </span>
            <span className="text-[9px] text-slate-400">Attention Layers</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/60 text-center">
            <span className="text-[10px] text-slate-400 block font-medium">Rank & Scaling</span>
            <span className="text-xs font-mono font-bold text-teal-300 mt-0.5 block">
              r={hyperparams.rank} · α={hyperparams.alpha}
            </span>
            <span className="text-[9px] text-slate-400">{(hyperparams.alpha / hyperparams.rank).toFixed(1)}x Factor</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/60 text-center">
            <span className="text-[10px] text-slate-400 block font-medium">Epochs Config</span>
            <span className="text-xs font-mono font-bold text-sky-400 mt-0.5 block">
              {hyperparams.epochs} Epochs
            </span>
            <span className="text-[9px] text-slate-400">AdamW Optimizer</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/60 text-center">
            <span className="text-[10px] text-slate-400 block font-medium">Learning Rate</span>
            <span className="text-xs font-mono font-bold text-amber-300 mt-0.5 block">
              {hyperparams.learningRate.toExponential(1)}
            </span>
            <span className="text-[9px] text-slate-400">Cosine Warmup</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/50 border border-dashed border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400/80 shrink-0" />
            <span>
              Real-time cross-entropy loss, perplexity, epoch milestones, and streaming logs will display dynamically during fine-tuning.
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-2xl bg-slate-900 border ${
      telemetry?.status === 'completed'
        ? 'border-emerald-500/40 shadow-lg shadow-emerald-950/20'
        : isTraining
        ? 'border-emerald-500/60 shadow-lg shadow-emerald-950/30'
        : 'border-slate-800'
    } space-y-4 transition-all duration-300 animate-in fade-in`}>

      {/* TOP HEADER: Status, Model info, & Live Telemetry Flags */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          {/* Animated Status Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono tracking-wider border shadow-sm ${
            telemetry?.status === 'completed'
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
              : isPaused
              ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
              : isTraining
              ? 'bg-emerald-950/90 text-emerald-400 border-emerald-500/60 animate-pulse'
              : 'bg-slate-800 text-slate-300 border-slate-700'
          }">
            <span className={`w-2 h-2 rounded-full ${
              telemetry?.status === 'completed'
                ? 'bg-emerald-400'
                : isPaused
                ? 'bg-amber-400'
                : isTraining
                ? 'bg-emerald-400 animate-ping'
                : 'bg-slate-400'
            }`} />
            {telemetry?.status === 'completed'
              ? 'CONVERGED & SAVED'
              : isPaused
              ? 'TRAINING PAUSED'
              : isTraining
              ? 'TRAINING (ADAMW)'
              : 'TRAINING STOPPED'}
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-emerald-400" />
              {modelName}
            </h3>
            <span className="text-[10px] text-slate-400 block">
              Dataset: <span className="text-slate-300 font-medium">{datasetName}</span>
            </span>
          </div>
        </div>

        {/* Real-time Clock / Timers */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1 text-slate-300" title="Elapsed Time">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatTime(telemetry?.elapsedSec || 0)}</span>
          </div>
          {isTraining && (
            <div className="flex items-center gap-1 text-teal-300" title="Estimated Time Remaining">
              <span className="text-[10px] text-slate-400">ETA:</span>
              <span>{formatTime(telemetry?.estimatedRemainingSec || 0)}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-emerald-400 font-bold" title="Tokens Per Second">
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>{telemetry?.tokensPerSec || 0} tok/s</span>
          </div>
        </div>
      </div>

      {/* EPOCH PROGRESS & MULTI-TIER PROGRESS BAR */}
      <div className="space-y-2.5 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Epoch {currentEpoch} of {totalEpochs}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              ({clampedEpochProgress}% of current epoch)
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono">
            <span className="text-slate-400 text-[11px]">
              Step <span className="text-emerald-400 font-bold">{telemetry?.step}</span> / {telemetry?.totalSteps}
            </span>
            <span className="text-emerald-400 font-bold bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded text-[11px]">
              {globalProgressPct}%
            </span>
          </div>
        </div>

        {/* Global Animated Progress Bar */}
        <div className="w-full h-3 rounded-full bg-slate-900 border border-slate-800 overflow-hidden relative p-0.5">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-200 relative overflow-hidden"
            style={{ width: `${globalProgressPct}%` }}
          >
            {isTraining && !isPaused && (
              <div className="absolute inset-0 bg-white/20 -skew-x-12 animate-pulse" />
            )}
          </div>
        </div>

        {/* Segmented Epoch Pills Indicator */}
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-1.5 pt-1">
          {Array.from({ length: totalEpochs }).map((_, idx) => {
            const epNum = idx + 1;
            const isDone = epNum < currentEpoch || (epNum === currentEpoch && telemetry?.status === 'completed');
            const isCurrent = epNum === currentEpoch && telemetry?.status !== 'completed';

            return (
              <div
                key={epNum}
                className={`py-1 px-2 rounded-lg text-[10px] font-mono flex items-center justify-between border transition ${
                  isDone
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : isCurrent
                    ? 'bg-slate-800 border-emerald-500/80 text-emerald-400 font-bold ring-1 ring-emerald-500/30'
                    : 'bg-slate-900/50 border-slate-800/80 text-slate-500'
                }`}
              >
                <span>Epoch {epNum}</span>
                {isDone ? (
                  <Check className="w-3 h-3 text-emerald-400 stroke-[2.5]" />
                ) : isCurrent ? (
                  <span className="text-[9px] text-teal-300 animate-pulse">{clampedEpochProgress}%</span>
                ) : (
                  <span className="text-[9px] opacity-40">pending</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Live Active Sample Prompt */}
        {telemetry?.currentExamplePrompt && isTraining && (
          <div className="pt-1.5 border-t border-slate-800/60 flex items-center gap-2 text-[11px] text-slate-400 truncate">
            <span className="text-[10px] uppercase font-mono text-emerald-400 shrink-0 font-bold flex items-center gap-1">
              <Cpu className="w-3 h-3" />
              Active Pass:
            </span>
            <span className="text-slate-300 italic truncate font-sans">
              "{telemetry.currentExamplePrompt}"
            </span>
          </div>
        )}
      </div>

      {/* METRICS DASHBOARD GRID: 4 Live KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Card 1: Current Loss */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 relative overflow-hidden group">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
            <span>Cross-Entropy Loss</span>
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-emerald-400">
              {currentLoss.toFixed(4)}
            </span>
          </div>
          <div className="mt-1 text-[10px] text-slate-400 flex items-center justify-between font-mono">
            <span>Start: {initialLoss.toFixed(2)}</span>
            <span className="text-teal-400 font-bold">Min: {minLossRecorded.toFixed(3)}</span>
          </div>
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Card 2: Loss Drop & Convergence */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 relative overflow-hidden">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
            <span>Loss Reduction</span>
            <TrendingDown className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-teal-300 flex items-center gap-0.5">
              -{lossDropPct}%
            </span>
          </div>
          <div className="mt-1 text-[10px] text-slate-400 font-mono truncate">
            {lossDropPct > 50 ? 'Strong convergence' : 'Learning weights...'}
          </div>
          <div className="absolute top-0 right-0 w-16 h-16 bg-teal-500/5 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Card 3: Perplexity */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 relative overflow-hidden">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
            <span>Model Perplexity (PPL)</span>
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-cyan-300">
              {currentPerplexity.toFixed(2)}
            </span>
          </div>
          <div className="mt-1 text-[10px] text-slate-400 font-mono flex items-center justify-between">
            <span>PPL = e^loss</span>
            <span className="text-cyan-400/80">↓ {(initialPerplexity - currentPerplexity).toFixed(1)}</span>
          </div>
          <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Card 4: Learning Rate */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 relative overflow-hidden">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
            <span>Learning Rate</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-amber-300">
              {telemetry?.learningRate ? telemetry.learningRate.toExponential(2) : hyperparams.learningRate.toExponential(2)}
            </span>
          </div>
          <div className="mt-1 text-[10px] text-slate-400 font-mono">
            Cosine Annealing
          </div>
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
        </div>
      </div>

      {/* VISUAL REAL-TIME LOSS TRAJECTORY CHART (SVG) */}
      <div className="space-y-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-mono">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Dynamic Loss Trajectory Curve
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              ({lossHistory.length} checkpoints recorded)
            </span>
          </div>

          {/* Metric Selector Toggle (Loss / Perplexity / LR) */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setChartMetric('loss')}
              className={`px-2 py-0.5 rounded transition ${
                chartMetric === 'loss' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Loss (Cross-Entropy)
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('perplexity')}
              className={`px-2 py-0.5 rounded transition ${
                chartMetric === 'perplexity' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Perplexity
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('lr')}
              className={`px-2 py-0.5 rounded transition ${
                chartMetric === 'lr' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              LR Curve
            </button>
          </div>
        </div>

        {/* Hover / Point Inspection Tooltip Banner */}
        <div className="h-6 flex items-center justify-between text-[11px] font-mono text-slate-300 px-1 border-b border-slate-900 pb-1">
          {hoveredPoint ? (
            <div className="flex items-center gap-3">
              <span className="text-emerald-400 font-bold">Step {hoveredPoint.step}</span>
              <span>Epoch {hoveredPoint.epoch}</span>
              <span>Loss: <strong className="text-emerald-300">{hoveredPoint.loss.toFixed(4)}</strong></span>
              <span>LR: {hoveredPoint.learningRate.toExponential(2)}</span>
              <span>{hoveredPoint.tokSec} tok/s</span>
            </div>
          ) : (
            <span className="text-[10px] text-slate-400 italic">
              Touch or hover over checkpoints on the curve to inspect precise loss values and step metrics.
            </span>
          )}
          <span className="text-[10px] text-slate-400">
            {chartMetric === 'loss' ? 'Target: Minimizing Cross-Entropy' : chartMetric === 'perplexity' ? 'Target: Minimizing Perplexity' : 'Cosine Schedule'}
          </span>
        </div>

        {/* Rendered SVG Chart */}
        {chartData ? (
          <div className="w-full h-44 relative select-none pt-1">
            <svg
              className="w-full h-full overflow-visible"
              viewBox={`0 0 ${chartData.width} ${chartData.height}`}
              preserveAspectRatio="none"
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <defs>
                <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                  <stop offset="60%" stopColor="#14b8a6" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#064e3b" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="perplexityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#0891b2" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="lrGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = chartData.padding.top + chartData.chartHeight * ratio;
                const val = chartData.maxVal - ratio * (chartData.maxVal - chartData.minVal);
                return (
                  <g key={ratio}>
                    <line
                      x1={chartData.padding.left}
                      y1={y}
                      x2={chartData.width - chartData.padding.right}
                      y2={y}
                      stroke="#334155"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                      strokeOpacity="0.5"
                    />
                    <text
                      x={chartData.padding.left - 8}
                      y={y + 4}
                      fill="#94a3b8"
                      fontSize="14"
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      {val < 0.01 ? val.toExponential(1) : val.toFixed(2)}
                    </text>
                  </g>
                );
              })}

              {/* Epoch Divider Lines */}
              {chartData.epochDividers.map((div) => (
                <g key={div.epoch}>
                  <line
                    x1={div.x}
                    y1={chartData.padding.top}
                    x2={div.x}
                    y2={chartData.padding.top + chartData.chartHeight}
                    stroke="#047857"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={div.x + 5}
                    y={chartData.padding.top + 16}
                    fill="#34d399"
                    fontSize="13"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    Epoch {div.epoch + 1}
                  </text>
                </g>
              ))}

              {/* Area fill under curve */}
              <path
                d={chartData.areaPath}
                fill={
                  chartMetric === 'loss'
                    ? 'url(#lossGradient)'
                    : chartMetric === 'perplexity'
                    ? 'url(#perplexityGradient)'
                    : 'url(#lrGradient)'
                }
              />

              {/* Trajectory Stroke Line */}
              <polyline
                fill="none"
                stroke={chartMetric === 'loss' ? '#10b981' : chartMetric === 'perplexity' ? '#06b6d4' : '#f59e0b'}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={chartData.polylineStr}
              />

              {/* Checkpoint Circles for interactive hovering */}
              {chartData.points.map((pt, i) => (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r={hoveredPoint?.step === pt.record.step ? 6.5 : 3.5}
                  fill={hoveredPoint?.step === pt.record.step ? '#ffffff' : chartMetric === 'loss' ? '#10b981' : '#06b6d4'}
                  stroke="#020617"
                  strokeWidth="2"
                  className="cursor-pointer transition-all duration-100"
                  onMouseEnter={() => setHoveredPoint(pt.record)}
                  onTouchStart={() => setHoveredPoint(pt.record)}
                />
              ))}
            </svg>
          </div>
        ) : (
          <div className="w-full h-32 flex items-center justify-center text-xs text-slate-400 font-mono">
            <span>Collecting forward/backward training steps to plot real loss trajectory...</span>
          </div>
        )}
      </div>

      {/* STREAMING TERMINAL & LOGS CONSOLE */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-mono">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              Live Gradient & Loss Stream ({telemetry?.logMessages.length || 0})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Filter pills */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setLogFilter('all')}
                className={`px-1.5 py-0.5 rounded transition ${logFilter === 'all' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400'}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setLogFilter('epochs')}
                className={`px-1.5 py-0.5 rounded transition ${logFilter === 'epochs' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400'}`}
              >
                Epochs
              </button>
              <button
                type="button"
                onClick={() => setLogFilter('steps')}
                className={`px-1.5 py-0.5 rounded transition ${logFilter === 'steps' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400'}`}
              >
                Steps
              </button>
            </div>

            {/* Auto-scroll toggle */}
            <button
              type="button"
              onClick={() => setAutoScroll(!autoScroll)}
              title={autoScroll ? 'Auto-scroll is ON' : 'Auto-scroll is OFF'}
              className={`p-1.5 rounded-lg border text-xs transition ${
                autoScroll
                  ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              {autoScroll ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            </button>

            {/* Copy Logs */}
            <button
              type="button"
              onClick={handleCopyLogs}
              title="Copy All Logs to Clipboard"
              className="p-1.5 rounded-lg border bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition"
            >
              {copiedLogs ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>

            {/* Expand / Minimize Terminal Height */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-2 py-1 rounded-lg border bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 text-[10px] font-mono transition"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
        </div>

        {/* Terminal Window Box */}
        <div
          className={`w-full ${
            isExpanded ? 'h-72' : 'h-36'
          } bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-300 overflow-y-auto space-y-1.5 transition-all duration-200 shadow-inner`}
        >
          {filteredLogs.map((msg, i) => {
            const isEpoch = msg.toLowerCase().includes('epoch');
            const isStep = msg.toLowerCase().includes('step ');
            const isInit = msg.startsWith('[LoRA Init]') || msg.startsWith('[Config]') || msg.startsWith('[Targets]');
            const isFinished = msg.toLowerCase().includes('converged') || msg.toLowerCase().includes('completed');

            return (
              <div
                key={i}
                className={`leading-relaxed flex items-start gap-1.5 ${
                  isEpoch
                    ? 'text-teal-300 font-semibold bg-teal-950/20 py-0.5 px-1 rounded'
                    : isFinished
                    ? 'text-emerald-400 font-bold bg-emerald-950/30 py-0.5 px-1 rounded'
                    : isStep
                    ? 'text-slate-200'
                    : isInit
                    ? 'text-cyan-400/90'
                    : 'text-slate-300'
                }`}
              >
                <span className="text-emerald-500 font-bold select-none shrink-0">›</span>
                <span className="break-all">{msg}</span>
              </div>
            );
          })}
          {isTraining && !isPaused && (
            <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[10px] pt-1">
              <span className="w-1.5 h-3 bg-emerald-400 animate-pulse" />
              <span>Backpropagating gradients across rank={hyperparams.rank} matrices...</span>
            </div>
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>

      {/* COMPLETED SUCCESS CARD & CTA */}
      {telemetry?.status === 'completed' && lastTrainedAdapter && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 flex flex-wrap items-center justify-between gap-3 animate-in zoom-in-95">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="text-xs font-bold text-emerald-200 block">
                LoRA Adapter "{lastTrainedAdapter.name}" Ready & Activated!
              </span>
              <span className="text-[11px] text-emerald-300/80 block">
                Initial Loss: {lastTrainedAdapter.initialLoss} → Final Loss: {lastTrainedAdapter.finalLoss} ({lastTrainedAdapter.adapterSizeFormatted})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAdaptersTab && (
              <button
                type="button"
                onClick={onOpenAdaptersTab}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-300 text-xs font-semibold hover:bg-slate-800 transition"
              >
                Inspect Adapter
              </button>
            )}
            {onOpenTestBench && (
              <button
                type="button"
                onClick={onOpenTestBench}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition active:scale-95 shadow-md shadow-emerald-950/40"
              >
                Run Before/After Test
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
