import { useEffect, useRef, useState } from 'react';

// ThreeUI's original paper scene is served as a local, sandboxed iframe asset.
export function ThreeDPaper({ className = '', style, variant = 'original' }) {
  const hostRef = useRef(null);
  const [documentVisible, setDocumentVisible] = useState(
    () => typeof document === 'undefined' || !document.hidden,
  );
  const [hostVisible, setHostVisible] = useState(true);
  const [readyVariant, setReadyVariant] = useState(null);
  const mounted = hostVisible && documentVisible;
  const ready = readyVariant === variant;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(([entry]) => {
      setHostVisible(entry?.isIntersecting ?? true);
    }, { rootMargin: '80px' });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const update = () => setDocumentVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  return (
    <div
      ref={hostRef}
      className={`threeui-background three-d-paper${className ? ` ${className}` : ''}`}
      data-state={!mounted ? 'paused' : ready ? 'ready' : 'loading'}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: '#08080a',
        pointerEvents: 'none',
        ...style,
      }}
      aria-hidden="true"
    >
      {mounted && variant === 'original' && (
        <iframe
          title="ThreeUI 3D Paper"
          src="/threeui/3d-paper.html"
          sandbox="allow-scripts"
          loading="eager"
          onLoad={() => setReadyVariant(variant)}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'block',
            width: '100%',
            height: '100%',
            border: 0,
            background: '#08080a',
            opacity: ready ? 1 : 0,
            pointerEvents: 'none',
            transition: 'opacity 240ms ease-out',
          }}
        />
      )}
    </div>
  );
}
