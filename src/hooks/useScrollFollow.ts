import { useEffect, useRef } from 'react';

/**
 * Makes an element follow scroll with a spring/lerp effect.
 * @param scrollContainerRef - ref to the scrollable parent
 * @param factor - follow speed (0.05 = slow/smooth, 0.2 = fast)
 */
export function useScrollFollow(
  scrollContainerRef: React.RefObject<HTMLElement | null> | { current: HTMLElement | null },
  factor = 0.08
) {
  const ref = useRef<HTMLDivElement>(null);
  const currentY = useRef(0);
  const targetY = useRef(0);
  const rafId = useRef<number>();

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const onScroll = () => {
      targetY.current = container.scrollTop;
    };

    const animate = () => {
      currentY.current += (targetY.current - currentY.current) * factor;

      if (ref.current) {
        ref.current.style.transform = `translateY(${currentY.current}px)`;
      }

      rafId.current = requestAnimationFrame(animate);
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    rafId.current = requestAnimationFrame(animate);

    return () => {
      container.removeEventListener('scroll', onScroll);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [scrollContainerRef, factor]);

  return ref;
}
