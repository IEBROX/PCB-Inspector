import React from 'react';
import {
  LayoutDashboard,
  ScanLine,
  ListChecks,
  Cpu,
  History,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { ModelStatus } from '../types';

export type NavTab = 'dashboard' | 'studio' | 'results' | 'model' | 'history';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  defectCount: number | null;
  modelStatus: ModelStatus | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  defectCount,
  modelStatus,
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
      badgeVariant: undefined,
    },
    {
      id: 'studio' as NavTab,
      label: 'Inspection Studio',
      icon: ScanLine,
      badge: null,
      badgeVariant: undefined,
    },
    {
      id: 'results' as NavTab,
      label: 'Results & Bounding Boxes',
      icon: ListChecks,
      badge: defectCount !== null && defectCount > 0 ? defectCount : null,
      badgeVariant: 'crimson' as const,
    },
    {
      id: 'model' as NavTab,
      label: 'Model Manager',
      icon: Cpu,
      badge: modelStatus?.loaded ? 'Ready' : null,
      badgeVariant: 'ready' as const,
    },
    {
      id: 'history' as NavTab,
      label: 'History & Reports',
      icon: History,
      badge: null,
      badgeVariant: undefined,
    },
  ];

  return (
    <aside
      className={`h-[calc(100vh-2.5rem)] bg-[#111112] border-r border-[rgba(255,255,255,0.07)] flex flex-col justify-between transition-all duration-200 ease-in-out relative select-none z-30 shadow-xl overflow-visible flex-shrink-0 ${
        collapsed ? 'w-[64px]' : 'w-[220px]'
      }`}
      aria-label="Sidebar Navigation"
    >
      {/* Top: Nav Links Rail */}
      <div className="flex flex-col overflow-visible">
        {/* Navigation Items Rail */}
        <nav
          className={`flex flex-col gap-1.5 py-3 overflow-visible ${
            collapsed ? 'items-center px-2' : 'items-stretch px-2.5'
          }`}
          aria-label="Main Navigation"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`relative group flex items-center rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#DC2011] ${
                  collapsed
                    ? 'w-9 h-9 justify-center'
                    : 'w-full px-3 py-2 gap-3 justify-start'
                } ${
                  isActive
                    ? 'bg-[rgba(143,11,19,0.25)] text-[#EFDFC5] border border-[rgba(220,32,17,0.35)] shadow-[0_2px_10px_rgba(143,11,19,0.2)]'
                    : 'text-[#85858A] hover:text-[#EFDFC5] hover:bg-[rgba(255,255,255,0.07)] border border-transparent'
                }`}
              >
                {/* Thin crimson accent along the left edge of active item */}
                {isActive && (
                  <span
                    className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] bg-[#DC2011] rounded-r-sm shadow-[0_0_8px_rgba(220,32,17,0.85)]"
                    aria-hidden="true"
                  />
                )}

                {/* Icon */}
                <Icon
                  className={`w-[17px] h-[17px] stroke-[1.8] flex-shrink-0 transition-colors ${
                    isActive
                      ? 'text-[#EFDFC5]'
                      : 'text-[#85858A] group-hover:text-[#EFDFC5]'
                  }`}
                />

                {/* Collapsed Mode Badge Dot Indicator */}
                {collapsed && item.badge !== null && (
                  <span
                    className={`absolute top-1 right-1 w-2 h-2 rounded-full ring-2 ring-[#111112] ${
                      item.badgeVariant === 'crimson'
                        ? 'bg-[#DC2011] shadow-[0_0_6px_rgba(220,32,17,0.8)]'
                        : 'bg-emerald-400'
                    }`}
                    aria-hidden="true"
                  />
                )}

                {/* Expanded Mode: Text Label & Badge */}
                {!collapsed && (
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className="text-xs font-medium truncate">{item.label}</span>
                    {item.badge !== null && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ml-auto ${
                          item.badgeVariant === 'crimson'
                            ? 'bg-[rgba(143,11,19,0.6)] text-[#EFDFC5] border border-[rgba(220,32,17,0.5)]'
                            : 'bg-[rgba(6,78,59,0.4)] text-emerald-300 border border-emerald-700/60'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}

                {/* Collapsed Mode Tooltip: Pops out horizontally to the right without clipping */}
                {collapsed && (
                  <div
                    role="tooltip"
                    className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 z-50 flex items-center gap-2 rounded-md bg-[#1B191B] px-2.5 py-1 text-xs font-sans font-medium text-[#EFDFC5] shadow-2xl border border-[rgba(255,255,255,0.12)] whitespace-nowrap opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 origin-left"
                  >
                    <span>{item.label}</span>
                    {item.badge !== null && (
                      <span
                        className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                          item.badgeVariant === 'crimson'
                            ? 'bg-[#8F0B13] text-[#EFDFC5] border border-[#DC2011]/50'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {/* Tooltip Caret */}
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#1B191B] border-l border-b border-[rgba(255,255,255,0.12)] rotate-45" />
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Divider, Telemetry Status, & Expand/Collapse Toggle */}
      <div className="border-t border-[rgba(255,255,255,0.07)] p-2.5 flex flex-col gap-2 bg-[#111112]">
        {/* Device Telemetry / Model Status */}
        {collapsed ? (
          <div className="flex justify-center">
            <div
              className="relative w-9 h-9 rounded-lg flex items-center justify-center text-[#85858A] hover:text-[#EFDFC5] hover:bg-[rgba(255,255,255,0.07)] transition-all group cursor-default"
              aria-label={`Inspection Engine: ${modelStatus?.loaded ? 'Online' : 'Standby'}`}
            >
              <ShieldCheck className="w-[17px] h-[17px] stroke-[1.8]" />
              <span
                className={`absolute top-1 right-1 w-2 h-2 rounded-full ring-2 ring-[#111112] ${
                  modelStatus?.loaded ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />

              {/* Status Tooltip */}
              <div
                role="tooltip"
                className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 z-50 flex items-center gap-2 rounded-md bg-[#1B191B] px-2.5 py-1 text-xs font-sans font-medium text-[#EFDFC5] shadow-2xl border border-[rgba(255,255,255,0.12)] whitespace-nowrap opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 origin-left"
              >
                <span>
                  Engine: {modelStatus?.loaded ? 'Online' : 'Standby'} ({modelStatus?.device || 'CPU'})
                </span>
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#1B191B] border-l border-b border-[rgba(255,255,255,0.12)] rotate-45" />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-[11px] flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[#EFDFC5]">
              <span className="flex items-center gap-1.5 font-medium text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-[#DC2011]" />
                Engine
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                  modelStatus?.loaded
                    ? 'text-emerald-300 bg-emerald-950/60 border border-emerald-800/60'
                    : 'text-amber-300 bg-amber-950/60 border border-amber-800/60'
                }`}
              >
                {modelStatus?.loaded ? 'Online' : 'Standby'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[#85858A] text-[10px] pt-1 border-t border-[rgba(255,255,255,0.06)]">
              <span>Device:</span>
              <span className="text-[#EFDFC5] font-mono uppercase font-semibold">
                {modelStatus?.device || 'CPU'}
              </span>
            </div>
          </div>
        )}

        {/* Expand / Collapse Control */}
        {collapsed ? (
          <div className="flex justify-center">
            <button
              onClick={onToggleCollapse}
              className="relative w-9 h-9 rounded-lg flex items-center justify-center text-[#85858A] hover:text-[#EFDFC5] hover:bg-[rgba(255,255,255,0.07)] transition-all group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#DC2011]"
              aria-label="Expand Sidebar"
            >
              <ChevronRight className="w-[17px] h-[17px] stroke-[1.8]" />
              <div
                role="tooltip"
                className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 z-50 flex items-center gap-2 rounded-md bg-[#1B191B] px-2.5 py-1 text-xs font-sans font-medium text-[#EFDFC5] shadow-2xl border border-[rgba(255,255,255,0.12)] whitespace-nowrap opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 origin-left"
              >
                <span>Expand Sidebar</span>
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#1B191B] border-l border-b border-[rgba(255,255,255,0.12)] rotate-45" />
              </div>
            </button>
          </div>
        ) : (
          <button
            onClick={onToggleCollapse}
            className="w-full px-3 py-2 rounded-lg flex items-center justify-between text-xs text-[#85858A] hover:text-[#EFDFC5] hover:bg-[rgba(255,255,255,0.07)] transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#DC2011]"
            aria-label="Collapse Sidebar"
          >
            <span className="font-medium">Collapse</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
