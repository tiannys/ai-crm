'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders children into a portal mounted directly on document.body.
 * This avoids issues with backdrop-filter / transform on ancestor elements
 * that break "fixed" positioning.
 */
export default function Portal({ children }: { children: React.ReactNode }) {
  const elRef = useRef<HTMLDivElement | null>(null);

  if (!elRef.current && typeof document !== 'undefined') {
    elRef.current = document.createElement('div');
  }

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    document.body.appendChild(el);
    return () => {
      document.body.removeChild(el);
    };
  }, []);

  if (!elRef.current) return null;
  return createPortal(children, elRef.current);
}
