import React, { useState, useEffect, useCallback } from 'react';
import { TitleBar } from './components/TitleBar';
import { FloatingNavPill, NavTab } from './components/Navigation/FloatingNavPill';
import { DashboardView } from './components/Dashboard/DashboardView';
import { StudioView } from './components/Studio/StudioView';
import { ResultsView } from './components/Results/ResultsView';
import { ModelManagerView } from './components/ModelManager/ModelManagerView';
import { HistoryView } from './components/History/HistoryView';
import { DotGrid } from './components/DotGrid/DotGrid';
import { DetectionResult, ModelStatus } from './types';
import { api } from './api/backendClient';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [activeResult, setActiveResult] = useState<DetectionResult | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null);

  // Poll backend health & model status
  const checkHealth = useCallback(async () => {
    try {
      if (window.electronAPI?.checkBackendStatus) {
        const beStatus = await window.electronAPI.checkBackendStatus();
        if (beStatus?.url) {
          api.setBaseUrl(beStatus.url);
        }
      }
      await api.getHealth();
      setBackendConnected(true);
      const mStatus = await api.getModelStatus();
      setModelStatus(mStatus);
    } catch {
      setBackendConnected(false);
      setModelStatus(null);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 3000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const handleDetectionComplete = (result: DetectionResult) => {
    setActiveResult(result);
  };

  const handleClearActiveResult = () => {
    setActiveResult(null);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#100D0E] text-[#EFDFC5] overflow-hidden font-sans select-none relative">
      {/* Layer 2: Enhanced Global Interactive Dot Grid Background Layer */}
      <div
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
        aria-hidden="true"
      >
        <DotGrid
          baseColor="#5E1017"
          activeColor="#FF2E2E"
          shape="circle"
          dotSize={2.5}
          gap={22}
          proximity={120}
          strength={0.7}
          bounce={0.35}
          tension={0.25}
          returnDuration={0.6}
          shockRadius={200}
          shockStrength={1.5}
          swell={0.3}
          stretch={0.15}
          glow={0.12}
          fade={0.18}
          opacity={0.35}
          intro={false}
          mouseInteraction={true}
          clickShock={false}
          className="w-full h-full"
        />
      </div>

      {/* Layer 3: Subtle Burgundy Ambient Gradients */}
      <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden" aria-hidden="true">
        <div className="absolute -top-[15%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-[#8F0B13]/12 to-transparent blur-[130px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tl from-[#7A1720]/14 to-transparent blur-[150px]" />
      </div>

      {/* Frameless Top Window Bar */}
      <TitleBar
        backendConnected={backendConnected}
        modelStatus={modelStatus}
        onNavigateToModel={() => setCurrentTab('model')}
      />

      {/* Main App Workspace (Reclaimed full width, with bottom-anchored floating pill) */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden relative z-10">
        {/* View Switcher Container */}
        <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-transparent relative">
          {currentTab === 'dashboard' && (
            <DashboardView
              onStartInspection={() => setCurrentTab('studio')}
              onNavigateToModel={() => setCurrentTab('model')}
              onNavigateToHistory={() => setCurrentTab('history')}
              modelStatus={modelStatus}
            />
          )}

          {currentTab === 'studio' && (
            <StudioView
              modelStatus={modelStatus}
              onDetectionComplete={handleDetectionComplete}
              onClearActiveResult={handleClearActiveResult}
              onImageSelected={setSelectedImageName}
              onNavigateToResults={() => setCurrentTab('results')}
              onNavigateToModel={() => setCurrentTab('model')}
              activeResult={activeResult}
            />
          )}

          {currentTab === 'results' && (
            <ResultsView
              result={activeResult}
              onNavigateToStudio={() => setCurrentTab('studio')}
            />
          )}

          {currentTab === 'model' && (
            <ModelManagerView
              modelStatus={modelStatus}
              onModelStatusUpdated={checkHealth}
            />
          )}

          {currentTab === 'history' && (
            <HistoryView
              onOpenStudio={() => setCurrentTab('studio')}
            />
          )}
        </main>

        {/* Floating Pill Navigation: Centered 20px above the bottom of the content area */}
        <div
          className="absolute bottom-5 left-1/2 -translate-x-1/2 z-50 pointer-events-auto overflow-visible select-none"
          aria-label="Application Navigation"
        >
          <FloatingNavPill
            currentTab={currentTab}
            onSelectTab={setCurrentTab}
            modelStatus={modelStatus}
            activeResult={activeResult}
            selectedImageName={selectedImageName}
          />
        </div>
      </div>
    </div>
  );
}

export default App;

