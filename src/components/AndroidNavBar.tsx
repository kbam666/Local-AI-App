import React from 'react';
import { MessageSquare, Cpu, Brain, Search, Gauge, Settings } from 'lucide-react';

export type NavTab = 'chat' | 'models' | 'train' | 'inspector' | 'benchmark' | 'settings';

interface Props {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  modelsCount: number;
}

export const AndroidNavBar: React.FC<Props> = ({ activeTab, onChangeTab, modelsCount }) => {
  const tabs = [
    { id: 'chat' as NavTab, label: 'Chat', icon: MessageSquare },
    { id: 'models' as NavTab, label: 'Models', icon: Cpu, badge: modelsCount },
    { id: 'train' as NavTab, label: 'Fine-Tune', icon: Brain },
    { id: 'inspector' as NavTab, label: 'GGUF', icon: Search },
    { id: 'benchmark' as NavTab, label: 'Bench', icon: Gauge },
    { id: 'settings' as NavTab, label: 'Config', icon: Settings },
  ];

  return (
    <nav className="sticky bottom-0 shrink-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-1.5 shadow-2xl safe-area-pb">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className="flex flex-col items-center justify-center py-1 px-3 relative transition-all duration-200 group"
            >
              {/* Material You active pill indicator */}
              <div
                className={`relative px-4 py-1 rounded-full transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400 shadow-sm shadow-emerald-950'
                    : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-slate-950">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] mt-0.5 font-medium tracking-tight transition-colors ${
                  isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Android Gesture Bar / Home Pill at bottom */}
      <div className="w-full flex justify-center pt-2 pb-1">
        <div className="w-32 h-1 bg-slate-600/70 rounded-full" />
      </div>
    </nav>
  );
};
