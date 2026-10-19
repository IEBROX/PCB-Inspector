import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';

interface ZoomViewerProps {
  imageSrc: string;
  altText: string;
  className?: string;
  onFocusBox?: [number, number, number, number] | null; // [x1, y1, x2, y2]
  naturalWidth?: number;
  naturalHeight?: number;
}

export const ZoomViewer: React.FC<ZoomViewerProps> = ({
  imageSrc,
  altText,
  className = '',
  onFocusBox,
  naturalWidth,
  naturalHeight,
}) => {
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setScale((prev) => Math.min(prev * 1.3, 8));
  const handleZoomOut = () => setScale((prev) => Math.max(prev / 1.3, 0.4));
  const handleFitToScreen = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsPanning(true);
    startPosRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPosition({
      x: e.clientX - startPosRef.current.x,
      y: e.clientY - startPosRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Zoom to box if focus box changes
  useEffect(() => {
    if (onFocusBox && naturalWidth && naturalHeight && containerRef.current) {
      const [x1, y1, x2, y2] = onFocusBox;
      const boxCenterX = (x1 + x2) / 2;
      const boxCenterY = (y1 + y2) / 2;
      
      const rect = containerRef.current.getBoundingClientRect();
      const targetScale = 2.5;
      
      const normX = (boxCenterX / naturalWidth - 0.5) * rect.width;
      const normY = (boxCenterY / naturalHeight - 0.5) * rect.height;

      setScale(targetScale);
      setPosition({
        x: -normX * targetScale,
        y: -normY * targetScale,
      });
    }
  }, [onFocusBox, naturalWidth, naturalHeight]);

  return (
    <div
      ref={containerRef}
      className={`relative min-w-0 min-h-0 w-full h-full overflow-hidden select-none bg-[#0D0D0F] flex items-center justify-center border border-[#4C4F54] rounded-xl ${className}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
    >
      <img
        src={imageSrc}
        alt={altText}
        draggable={false}
        className="max-h-full max-w-full w-auto h-auto object-contain pointer-events-none transition-transform duration-75 select-none"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: 'center center',
        }}
      />

      {/* Floating Zoom Controls Bar */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#252B2B]/95 border border-[#4C4F54] backdrop-blur shadow-lg z-30">
        <span className="text-[10px] font-mono text-[#EFDFC5] px-1 font-bold">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-1 rounded text-[#B7B7BA] hover:text-[#EFDFC5] hover:bg-[#303438] transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1 rounded text-[#B7B7BA] hover:text-[#EFDFC5] hover:bg-[#303438] transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleFitToScreen}
          className="p-1 rounded text-[#B7B7BA] hover:text-[#EFDFC5] hover:bg-[#303438] transition-colors"
          title="Fit to Screen"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleReset}
          className="p-1 rounded text-[#B7B7BA] hover:text-[#EFDFC5] hover:bg-[#303438] transition-colors"
          title="Reset Position & Zoom"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
