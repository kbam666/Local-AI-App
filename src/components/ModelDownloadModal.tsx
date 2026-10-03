import React from 'react';
import { Download, X, AlertCircle, Sparkles, HardDrive } from 'lucide-react';
import { DownloadProgress } from '../types/gguf';
import { formatBytes } from '../services/ggufParser';

interface Props {
  progress: DownloadProgress | null;
  onCancel: () => void;
}

export const ModelDownloadModal: React.FC<Props> = ({ progress, onCancel }) => {
  if (!progress) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Download className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Downloading Model</h3>
              <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                {progress.modelName}
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar & Percent */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-300">Writing to Local Storage</span>
            <span className="text-emerald-400 font-mono">{progress.percentage}%</span>
          </div>

          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-200"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>

          {/* Download Stats */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
            <span>
              {formatBytes(progress.bytesReceived)} / {formatBytes(progress.totalBytes)}
            </span>
            <span>
              {progress.speedMBs > 0 ? `${progress.speedMBs} MB/s` : 'Buffering...'}
            </span>
          </div>

          {progress.etaSeconds > 0 && (
            <div className="text-center text-[10px] text-slate-500">
              Estimated time remaining: ~{progress.etaSeconds} seconds
            </div>
          )}
        </div>

        {/* Info note */}
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2 text-[11px] text-slate-400">
          <HardDrive className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>Streamed directly into Android browser IndexedDB storage.</span>
        </div>

        {/* Cancel Button */}
        <button
          onClick={onCancel}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-xs font-semibold text-slate-300 transition"
        >
          Cancel Download
        </button>
      </div>
    </div>
  );
};
