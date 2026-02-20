import React, { useEffect, useRef, useState } from 'react';

interface SandboxFloatingCardProps {
  children: React.ReactNode;
  scrollContainerRef: React.RefObject<HTMLElement | null>;
}

/**
 * Floating card wrapper for the AI Sandbox.
 * Uses position: fixed to stay in the viewport, with a lerp spring
 * effect that makes it gently follow scroll with a delay.
 */
export function SandboxFloatingCard({ children, scrollContainerRef }: SandboxFloatingCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const [cardStyle, setCardStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const updatePosition = () => {
      const placeholder = placeholderRef.current;
      if (!placeholder) return;

      const rect = placeholder.getBoundingClientRect();
      // Get the top of the scroll container (tabs content area)
      const container = scrollContainerRef.current;
      const containerRect = container?.getBoundingClientRect();
      const top = containerRect?.top ?? rect.top;

      setCardStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `calc(100vh - ${top}px - 16px)`,
        maxHeight: '680px',
        zIndex: 30,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);

    // Also observe the placeholder for layout shifts
    const observer = new ResizeObserver(updatePosition);
    if (placeholderRef.current) observer.observe(placeholderRef.current);

    // Small delay to catch initial layout
    const timer = setTimeout(updatePosition, 100);

    return () => {
      window.removeEventListener('resize', updatePosition);
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [scrollContainerRef]);

  return (
    <>
      {/* Placeholder — reserves space in the grid */}
      <div ref={placeholderRef} className="lg:col-span-2 hidden lg:block" aria-hidden="true" />

      {/* Floating card — fixed to viewport */}
      <div
        ref={cardRef}
        style={cardStyle}
        className="hidden lg:flex flex-col overflow-hidden
                   bg-card/80 backdrop-blur-xl border border-border/50
                   rounded-l-2xl shadow-2xl shadow-black/20"
      >
        {children}
      </div>
    </>
  );
}
