import React, { useRef, useState, useEffect } from 'react';

interface MarqueeTitleProps {
  text: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'span' | 'p' | 'div';
  title?: string;
  speed?: number; // pixels per second, default 28
  onlyMobile?: boolean; // default false
  gap?: number; // space in px between repeats, default 32
}

export const MarqueeTitle: React.FC<MarqueeTitleProps> = ({
  text,
  className = '',
  as: Component = 'span',
  title,
  speed = 28,
  onlyMobile = false,
  gap = 32
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768;
  });
  const [duration, setDuration] = useState(10);

  useEffect(() => {
    const handleCheck = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);

      if (containerRef.current && measureRef.current) {
        const textWidth = measureRef.current.offsetWidth;
        const containerWidth = containerRef.current.clientWidth;
        // Text overflows if its measured single-line width exceeds container visible width
        const overflowing = textWidth > containerWidth + 2;
        setIsOverflowing(overflowing);

        if (overflowing) {
          const cycleDistance = textWidth + gap;
          const calculatedDuration = Math.max(5, Math.round(cycleDistance / speed));
          setDuration(calculatedDuration);
        }
      }
    };

    handleCheck();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      ro = new ResizeObserver(() => {
        handleCheck();
      });
      ro.observe(containerRef.current);
    }

    window.addEventListener('resize', handleCheck);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', handleCheck);
    };
  }, [text, speed, gap]);

  const shouldMarquee = isOverflowing && (!onlyMobile || isMobile);

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden relative max-w-full ${shouldMarquee ? 'marquee-mask' : ''}`}
      title={title || text}
    >
      {/* Invisible single-line measurer with exact same typography */}
      <span
        ref={measureRef}
        className={`invisible absolute pointer-events-none whitespace-nowrap opacity-0 left-0 top-0 ${className}`}
        aria-hidden="true"
      >
        {text}
      </span>

      {shouldMarquee ? (
        <div
          className="animate-marquee-continuous whitespace-nowrap select-none"
          style={{ animationDuration: `${duration}s` }}
        >
          <Component className={`shrink-0 ${className}`} style={{ paddingRight: `${gap}px` }}>
            {text}
          </Component>
          <Component className={`shrink-0 ${className}`} style={{ paddingRight: `${gap}px` }} aria-hidden="true">
            {text}
          </Component>
        </div>
      ) : (
        <Component className={`truncate block ${className}`}>
          {text}
        </Component>
      )}
    </div>
  );
};
