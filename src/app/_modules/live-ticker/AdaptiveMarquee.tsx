'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import Marquee from 'react-fast-marquee';
import { cn } from '@/app/_utils/cn';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';

type AdaptiveMarqueeProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  measureKey?: string;
  speed?: number;
};

export default function AdaptiveMarquee({
  children,
  className,
  contentClassName,
  measureKey,
  speed = 50,
}: AdaptiveMarqueeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);

  const content = useMemo(
    () => <div className={contentClassName}>{children}</div>,
    [children, contentClassName],
  );

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const checkOverflow = () => {
      setOverflow(measure.scrollWidth > container.clientWidth);
    };

    checkOverflow();

    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(container);

    void document.fonts?.ready.then(checkOverflow);

    return () => resizeObserver.disconnect();
  }, [measureKey, contentClassName]);

  return (
    <div
      ref={containerRef}
      className={cn('relative min-w-0 overflow-hidden', className)}
    >
      <div
        ref={measureRef}
        aria-hidden
        className={cn(
          'pointer-events-none invisible absolute left-0 top-0 w-max',
          contentClassName,
        )}
      >
        {children}
      </div>
      {overflow ? (
        <Marquee
          gradient={false}
          gradientWidth={25}
          speed={speed}
          pauseOnHover={true}
        >
          {content}
        </Marquee>
      ) : (
        content
      )}
    </div>
  );
}
