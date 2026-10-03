import React, { ReactNode, useState, useEffect } from 'react';
import { Smartphone, Monitor } from 'lucide-react';

interface Props {
  children: ReactNode;
}

export const AndroidFrame: React.FC<Props> = ({ children }) => {
  const [isDeviceFrame, setIsDeviceFrame] = useState(false);

  // Auto-detect if user is on mobile screen or desktop
  useEffect(() => {
    const isMobileWidth = window.innerWidth <= 768;
    // On desktop, show device frame preview by default so it looks like an authentic Android phone!
    setIsDeviceFrame(!isMobileWidth);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center relative selection:bg-emerald-500/30 overflow-hidden">
      {/* Background Ambient Glow for high-tech look */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Toggle on Desktop: Phone Frame vs Full Screen */}
      <div className="fixed top-3 right-4 z-50 hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
        <button
          onClick={() => setIsDeviceFrame(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition ${
            isDeviceFrame ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Simulate Android Device Frame"
        >
          <Smartphone className="w-3.5 h-3.5" />
          Phone Frame
        </button>
        <button
          onClick={() => setIsDeviceFrame(false)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition ${
            !isDeviceFrame ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Full Window / Native Mobile Display"
        >
          <Monitor className="w-3.5 h-3.5" />
          Full Window
        </button>
      </div>

      {isDeviceFrame ? (
        // Phone Bezel Container
        <div className="relative my-4 transition-all duration-300">
          {/* Hardware Volume & Power Buttons */}
          <div className="absolute -left-2.5 top-28 w-1 h-12 bg-slate-700 rounded-l-md shadow-md" />
          <div className="absolute -left-2.5 top-44 w-1 h-12 bg-slate-700 rounded-l-md shadow-md" />
          <div className="absolute -right-2.5 top-32 w-1 h-14 bg-slate-700 rounded-r-md shadow-md" />

          {/* Android Phone Body */}
          <div className="w-[390px] h-[844px] bg-slate-950 rounded-[48px] p-2.5 ring-12 ring-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] border-4 border-slate-900 overflow-hidden flex flex-col relative">
            <div className="w-full h-full rounded-[38px] overflow-hidden flex flex-col bg-slate-950">
              {children}
            </div>
          </div>
        </div>
      ) : (
        // Native Edge-to-Edge Container
        <div className="w-full h-full min-h-screen max-w-lg md:max-w-2xl mx-auto flex flex-col bg-slate-950 relative shadow-2xl md:border-x md:border-slate-800/80">
          {children}
        </div>
      )}
    </div>
  );
};
