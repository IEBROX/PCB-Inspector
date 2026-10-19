import React, { useState, useRef, useCallback, useEffect } from 'react';

interface SplitSliderProps {
  originalImage: string;
  annotatedImage: string;
  className?: string;
}

export const SplitSlider: React.FC<SplitSliderProps> = ({
  originalImage,
  annotatedImage,
  className = '',
}) => {
  const [sliderPos, setSliderPos] = useState<number>(50); // percentage 0-100
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const x = clientX - rect.left;
    const pct = Math.max(1, Math.min(99, (x / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updatePosition(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      setIsDragging(true);
      updatePosition(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        updatePosition(e.clientX);
      }
    };
    const onMouseUp = () => {
      setIsDragging(false);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length > 0) {
        updatePosition(e.touches[0].clientX);
      }
    };
    const onTouchEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging, updatePosition]);

  return (
    <div
      ref={containerRef}
      className={`relative min-w-0 min-h-0 w-full h-full select-none overflow-hidden rounded-xl border border-[#4C4F54] bg-[#0D0D0F] flex items-center justify-center ${className}`}
      style={{ cursor: isDragging ? 'ew-resize' : 'default' }}
      onClick={(e) => updatePosition(e.clientX)}
    >
      {/* Background Layer: Annotated Image (Revealed on Right) */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden pointer-events-none select-none">
        <img
          src={annotatedImage}
          alt="Annotated PCB Defect Map"
          className="max-h-full max-w-full w-auto h-auto object-contain pointer-events-none select-none"
        />
      </div>

      {/* Foreground Layer: Raw Original Image (Clipped at slider position from left) */}
      <div
        className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden pointer-events-none select-none"
        style={{
          clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`,
        }}
      >
        <img
          src={originalImage}
          alt="Original Raw PCB"
          className="max-h-full max-w-full w-auto h-auto object-contain pointer-events-none select-none"
        />
      </div>

      {/* Floating Mode Badges */}
      <div className="absolute top-3 left-3 px-2.5 py-1 rounded bg-[#0D0D0F]/90 border border-[#4C4F54] text-[10px] font-mono font-semibold text-[#B7B7BA] pointer-events-none select-none shadow z-10">
        RAW BOARD (ORIGINAL)
      </div>
      <div className="absolute top-3 right-3 px-2.5 py-1 rounded bg-[#380F17]/90 border border-[#8F0B13] text-[10px] font-mono font-semibold text-[#EFDFC5] pointer-events-none select-none shadow z-10">
        YOLO ANNOTATED DEFECTS
      </div>

      {/* Vertical Slider Divider Line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-[#DC2011] shadow-md z-20 cursor-ew-resize flex items-center justify-center"
        style={{ left: `${sliderPos}%` }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Grab Handle */}
        <div
          className="w-7 h-7 rounded-full bg-[#303438] border-2 border-[#DC2011] text-[#EFDFC5] flex items-center justify-center shadow-lg -translate-x-1/2 cursor-ew-resize hover:bg-[#8F0B13] transition-colors"
          title="Drag to compare original and annotated inspection"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m9 18-6-6 6-6M15 6l6 6-6 6" />
          </svg>
        </div>
      </div>
    </div>
  );
};
