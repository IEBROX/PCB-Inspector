import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LayoutDashboard,
  ScanLine,
  ListChecks,
  Cpu,
  History,
  LucideIcon
} from 'lucide-react';
import { NavPreviewCard, NavTab } from './NavPreviewCard';
import { DetectionResult, ModelStatus, InspectionStats, InspectionRecord } from '../../types';
import { api } from '../../api/backendClient';

export type { NavTab };

interface FloatingNavPillProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  modelStatus: ModelStatus | null;
  activeResult: DetectionResult | null;
  selectedImageName?: string | null;
  className?: string;
}

interface NavItemConfig {
  id: NavTab;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  badge?: string | number | null;
  badgeType?: 'crimson' | 'emerald';
}

export const FloatingNavPill: React.FC<FloatingNavPillProps> = ({
  currentTab,
  onSelectTab,
  modelStatus,
  activeResult,
  selectedImageName,
  className = '',
}) => {
  const [hoveredTab, setHoveredTab] = useState<NavTab | null>(null);
  const [stats, setStats] = useState<InspectionStats | null>(null);
  const [recentRecords, setRecentRecords] = useState<InspectionRecord[]>([]);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);

  // Load lightweight preview data from backend
  const loadPreviewData = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([
        api.getStats().catch(() => null),
        api.getHistory(3, 0).catch(() => [])
      ]);
      if (s) setStats(s);
      if (h && Array.isArray(h)) setRecentRecords(h);
    } catch (e) {
      // Graceful fallback for offline mode
    }
  }, []);

  useEffect(() => {
    loadPreviewData();
  }, [loadPreviewData, activeResult]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  // Navigation Items Specification
  const navItems: NavItemConfig[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      shortLabel: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'studio',
      label: 'Inspection Studio',
      shortLabel: 'Studio',
      icon: ScanLine,
    },
    {
      id: 'results',
      label: 'Results & Bounding Boxes',
      shortLabel: 'Results',
      icon: ListChecks,
      badge: activeResult && activeResult.defect_count > 0 ? activeResult.defect_count : null,
      badgeType: 'crimson',
    },
    {
      id: 'model',
      label: 'Model Manager',
      shortLabel: 'Model',
      icon: Cpu,
      badge: modelStatus?.loaded ? 'Ready' : null,
      badgeType: 'emerald',
    },
    {
      id: 'history',
      label: 'History & Reports',
      shortLabel: 'History',
      icon: History,
    },
  ];

  // Hover State Machine with 200ms close delay
  const handleItemMouseEnter = (tab: NavTab) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setHoveredTab(tab);
  };

  const handleItemMouseLeave = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      setHoveredTab(null);
    }, 200);
  };

  const handlePreviewMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handlePreviewMouseLeave = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      setHoveredTab(null);
    }, 200);
  };

  const handleSelect = (tab: NavTab) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setHoveredTab(null);
    if (currentTab !== tab) {
      onSelectTab(tab);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, tab: NavTab) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(tab);
    } else if (e.key === 'Escape') {
      setHoveredTab(null);
    }
  };

  // Preview card positioning offsets relative to capsule container (Opens Upward)
  const getPreviewAlignmentClass = (tab: NavTab) => {
    switch (tab) {
      case 'dashboard':
        return 'left-0 origin-bottom-left';
      case 'studio':
        return 'left-2 sm:left-14 origin-bottom-left';
      case 'results':
        return 'left-1/2 -translate-x-1/2 origin-bottom';
      case 'model':
        return 'right-2 sm:right-14 origin-bottom-right';
      case 'history':
        return 'right-0 origin-bottom-right';
      default:
        return 'left-1/2 -translate-x-1/2 origin-bottom';
    }
  };

  return (
    <nav
      ref={navContainerRef}
      aria-label="PCB Inspector Navigation Pill"
      className={`relative inline-flex items-center z-40 ${className}`}
    >
      {/* Floating Horizontal Pill Container with opaque dark glass styling */}
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="flex items-center gap-1 sm:gap-1.5 p-1 px-1.5 rounded-full bg-[#1C1819]/96 backdrop-blur-xl border border-[rgba(239,223,197,0.16)] shadow-[0_12px_40px_rgba(0,0,0,0.75)] select-none"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          const isHovered = hoveredTab === item.id;

          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={isActive}
              aria-label={item.label}
              tabIndex={0}
              onClick={() => handleSelect(item.id)}
              onMouseEnter={() => handleItemMouseEnter(item.id)}
              onMouseLeave={handleItemMouseLeave}
              onFocus={() => handleItemMouseEnter(item.id)}
              onBlur={handleItemMouseLeave}
              onKeyDown={(e) => handleKeyDown(e, item.id)}
              className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2011] focus-visible:ring-offset-1 focus-visible:ring-offset-[#100F10] ${
                isActive
                  ? 'bg-[#380F17]/90 text-[#EFDFC5] border border-[#8F0B13]/80 shadow-[0_2px_12px_rgba(143,11,19,0.35)]'
                  : 'text-[#B7B7BA] hover:text-[#EFDFC5] hover:bg-[rgba(255,255,255,0.06)] border border-transparent'
              } ${isHovered && !isActive ? 'text-[#EFDFC5] bg-[rgba(255,255,255,0.04)]' : ''}`}
            >
              {/* Crimson Accent Dot on Active Tab */}
              {isActive && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[#DC2011] shadow-[0_0_6px_rgba(220,32,17,0.85)] flex-shrink-0 animate-pulse"
                  aria-hidden="true"
                />
              )}

              {/* Icon */}
              <Icon
                className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${
                  isActive
                    ? 'text-[#DC2011]'
                    : isHovered
                    ? 'text-[#EFDFC5]'
                    : 'text-[#B7B7BA]'
                }`}
              />

              {/* Responsive Text Label */}
              <span className="hidden md:inline whitespace-nowrap tracking-wide">{item.label}</span>
              <span className="inline md:hidden whitespace-nowrap tracking-wide">{item.shortLabel || item.label}</span>

              {/* Contextual Badges */}
              {item.badge !== undefined && item.badge !== null && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-semibold ml-0.5 ${
                    item.badgeType === 'crimson'
                      ? 'bg-[rgba(143,11,19,0.8)] text-[#EFDFC5] border border-[rgba(220,32,17,0.6)] shadow-[0_0_8px_rgba(220,32,17,0.3)]'
                      : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Floating Interactive Hover Preview Card (Opens Upward Above Pill) */}
      {hoveredTab && (
        <div
          className={`absolute bottom-[calc(100%+12px)] z-[60] transition-all duration-150 ease-out ${getPreviewAlignmentClass(
            hoveredTab
          )}`}
          onMouseEnter={handlePreviewMouseEnter}
          onMouseLeave={handlePreviewMouseLeave}
        >
          {/* Invisible mouse travel bridge over the 12px gap to prevent jitter when moving cursor UP into preview */}
          <div className="absolute -bottom-3 left-0 right-0 h-4 bg-transparent" aria-hidden="true" />

          {/* Nav Preview Card */}
          <NavPreviewCard
            tab={hoveredTab}
            onNavigate={() => handleSelect(hoveredTab)}
            stats={stats}
            recentRecords={recentRecords}
            modelStatus={modelStatus}
            activeResult={activeResult}
            selectedImageName={selectedImageName}
          />
        </div>
      )}
    </nav>
  );
};
