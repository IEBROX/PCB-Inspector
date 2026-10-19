import React from 'react';
import {
  Minus,
  Square,
  X,
  Layers
} from 'lucide-react';
import { ModelStatus } from '../types';

interface TitleBarProps {
  backendConnected?: boolean;
  modelStatus?: ModelStatus | null;
  onNavigateToModel?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = () => {
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow();
  };

  const handleMaximize = () => {
    window.electronAPI?.maximizeWindow();
  };

  const handleClose = () => {
    window.electronAPI?.closeWindow();
  };

  return (
    <div className="h-10 bg-[rgba(20,16,18,0.85)] backdrop-blur-md border-b border-[rgba(239,223,197,0.12)] flex items-center justify-between px-3 select-none app-drag-region z-50 relative shadow-sm">
      {/* Left: Branding & App Title Only */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-[rgba(56,15,23,0.7)] border border-[rgba(143,11,19,0.6)] flex items-center justify-center text-[#EFDFC5] shadow-[0_0_8px_rgba(220,32,17,0.25)]">
          <Layers className="w-3.5 h-3.5 text-[#DC2011]" />
        </div>
        <span className="font-semibold text-xs tracking-wider text-[#EFDFC5]">
          PCB <span className="text-[#DC2011] font-bold">INSPECTOR</span>
        </span>
      </div>

      {/* Right: Window Controls */}
      <div className="flex items-center gap-1 app-no-drag">
        {isElectron && (
          <>
            <button
              onClick={handleMinimize}
              className="w-8 h-7 flex items-center justify-center rounded-md text-[#B7B7BA] hover:text-[#EFDFC5] hover:bg-[rgba(48,40,43,0.6)] transition-colors"
              title="Minimize"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleMaximize}
              className="w-8 h-7 flex items-center justify-center rounded-md text-[#B7B7BA] hover:text-[#EFDFC5] hover:bg-[rgba(48,40,43,0.6)] transition-colors"
              title="Maximize"
            >
              <Square className="w-3 h-3" />
            </button>
            <button
              onClick={handleClose}
              className="w-8 h-7 flex items-center justify-center rounded-md text-[#B7B7BA] hover:text-white hover:bg-[#8F0B13] transition-colors"
              title="Close Application"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default TitleBar;
