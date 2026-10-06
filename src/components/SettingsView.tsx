import React, { useState } from 'react';
import {
  Settings,
  Sliders,
  Terminal,
  DownloadCloud,
  CheckCircle,
  Smartphone,
  Cpu,
  RefreshCw,
  Info,
} from 'lucide-react';
import { GenerationParams, HardwareAudit } from '../types/gguf';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface Props {
  params: GenerationParams;
  onChangeParams: (params: GenerationParams) => void;
  hardwareAudit: HardwareAudit | null;
}

const SYSTEM_PROMPT_PRESETS = [
  {
    name: 'Helpful Mobile Assistant',
    prompt: 'You are DroidLLM, a helpful, precise AI assistant running 100% locally and privately on an Android device.',
  },
  {
    name: 'Concise Mobile Responder',
    prompt: 'Provide ultra-concise, direct answers optimized for quick reading on a mobile phone screen.',
  },
  {
    name: 'Code & Tech Expert',
    prompt: 'You are an expert software engineer. Provide clean, well-formatted code snippets and architectural explanations.',
  },
];

export const SettingsView: React.FC<Props> = ({ params, onChangeParams, hardwareAudit }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [installSuccess, setInstallSuccess] = useState(false);

  const handleInstallClick = async () => {
    const success = await install();
    if (success) setInstallSuccess(true);
  };

  const maxThreads = hardwareAudit?.cpuThreads || 8;

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-950 p-4 space-y-4">
      {/* Title */}
      <div>
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-400" />
          Inference & Device Config
        </h2>
        <p className="text-xs text-slate-400">Tune local sampling, thread allocation & app install</p>
      </div>

      {/* PWA / Android Install Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950/40 border border-emerald-500/30 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-100">Android PWA Installation</h3>
              <p className="text-[11px] text-slate-400">
                {isInstalled
                  ? 'Installed as Standalone Android App'
                  : 'Install to Home screen for full offline APK-like experience'}
              </p>
            </div>
          </div>

          {isInstalled && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
              <CheckCircle className="w-3 h-3" />
              Installed
            </span>
          )}
        </div>

        {!isInstalled && (
          <div>
            {isInstallable ? (
              <button
                onClick={handleInstallClick}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-98 shadow-sm"
              >
                <DownloadCloud className="w-4 h-4" />
                Install DroidLLM on Android
              </button>
            ) : isIOS ? (
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300">
                Tap <strong>Share</strong> in Safari, then tap <strong>Add to Home Screen</strong>.
              </div>
            ) : (
              <div className="text-[11px] text-slate-400">
                Tap your browser menu (⋮) and select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong> to install directly to your Android launcher.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sampling Parameters */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-emerald-400" />
          Sampling Parameters
        </h3>

        {/* Temperature */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300">Temperature</span>
            <span className="font-mono text-emerald-400 font-bold">{params.temperature}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.5"
            step="0.05"
            value={params.temperature}
            onChange={(e) => onChangeParams({ ...params, temperature: parseFloat(e.target.value) })}
            className="w-full accent-emerald-500 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Deterministic (0.1)</span>
            <span>Creative (1.5)</span>
          </div>
        </div>

        {/* Top-P */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300">Top-P (Nucleus Sampling)</span>
            <span className="font-mono text-emerald-400 font-bold">{params.topP}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={params.topP}
            onChange={(e) => onChangeParams({ ...params, topP: parseFloat(e.target.value) })}
            className="w-full accent-emerald-500 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Max Tokens */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300">Max Generated Tokens</span>
            <span className="font-mono text-emerald-400 font-bold">{params.maxTokens} tok</span>
          </div>
          <input
            type="range"
            min="64"
            max="1024"
            step="32"
            value={params.maxTokens}
            onChange={(e) => onChangeParams({ ...params, maxTokens: parseInt(e.target.value, 10) })}
            className="w-full accent-emerald-500 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* CPU Threads */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300">Inference CPU Threads</span>
            <span className="font-mono text-emerald-400 font-bold">{params.threads} threads</span>
          </div>
          <input
            type="range"
            min="1"
            max={maxThreads}
            step="1"
            value={params.threads}
            onChange={(e) => onChangeParams({ ...params, threads: parseInt(e.target.value, 10) })}
            className="w-full accent-emerald-500 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="text-[10px] text-slate-500">
            Recommended: {Math.max(2, Math.min(4, maxThreads))} threads on mobile to balance thermal throttling
          </div>
        </div>
      </div>

      {/* System Prompt Customizer */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
          <Terminal className="w-4 h-4 text-emerald-400" />
          System Prompt
        </h3>

        <div className="flex flex-wrap gap-1.5">
          {SYSTEM_PROMPT_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => onChangeParams({ ...params, systemPrompt: preset.prompt })}
              className="text-[10px] px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            >
              {preset.name}
            </button>
          ))}
        </div>

        <textarea
          rows={3}
          value={params.systemPrompt}
          onChange={(e) => onChangeParams({ ...params, systemPrompt: e.target.value })}
          className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
        />
      </div>
    </div>
  );
};
