import React, { useEffect, useState } from 'react';
import { Wifi, Signal, Battery, BatteryCharging, Sparkles } from 'lucide-react';
import { StoredModel } from '../types/gguf';

interface Props {
  activeModel: StoredModel;
  isGenerating: boolean;
  batteryInfo?: { level: number; charging: boolean };
}

export const AndroidStatusBar: React.FC<Props> = ({ activeModel, isGenerating, batteryInfo }) => {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="shrink-0 flex items-center justify-between px-5 pt-3 pb-2 text-xs font-medium text-slate-300 select-none bg-slate-950/80 backdrop-blur-md z-40 border-b border-slate-900/60">
      {/* Time & Active LLM Pill */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-slate-200 tracking-tight text-[13px]">{time || '09:41'}</span>
        {isGenerating && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-medium border border-emerald-500/30 animate-pulse">
            <Sparkles className="w-2.5 h-2.5" />
            NPU Inferencing
          </span>
        )}
      </div>

      {/* Android Camera Punch-Hole Simulation */}
      <div className="w-3.5 h-3.5 rounded-full bg-black border border-slate-800 shadow-inner flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-slate-900/80" />
      </div>

      {/* Android Status Icons */}
      <div className="flex items-center gap-2 text-slate-300">
        <span className="text-[10px] font-bold text-slate-400 tracking-wider">5G</span>
        <Signal className="w-3.5 h-3.5 text-slate-200" />
        <Wifi className="w-3.5 h-3.5 text-slate-200" />
        
        {/* Battery with real percentage */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-medium text-slate-300">
            {batteryInfo?.level !== undefined ? `${batteryInfo.level}%` : '85%'}
          </span>
          {batteryInfo?.charging ? (
            <BatteryCharging className="w-4 h-4 text-emerald-400" />
          ) : (
            <Battery className="w-4 h-4 text-slate-200" />
          )}
        </div>
      </div>
    </div>
  );
};
