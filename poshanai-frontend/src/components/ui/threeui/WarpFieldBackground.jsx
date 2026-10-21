import { useEffect, useRef } from 'react';
import { createWarpFieldRenderer, WARP_FIELD_DEFAULTS } from './warpFieldRenderer.js';

// Adapted from ThreeUI's Warp Field source bundle; renderer lifecycle is retained.
export default function WarpFieldBackground({ className = '', ...props }) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const options = { ...WARP_FIELD_DEFAULTS, ...props };
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return undefined;

    const renderer = createWarpFieldRenderer(canvas, () => optionsRef.current);
    let frame = 0;
    let visible = true;

    const resize = () => {
      const bounds = host.getBoundingClientRect();
      renderer.resize(bounds.width, bounds.height);
      renderer.render();
    };
    const tick = () => {
      renderer.render();
      frame = visible && !document.hidden ? requestAnimationFrame(tick) : 0;
    };
    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible && !frame) frame = requestAnimationFrame(tick);
      if (!visible && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });

    resizeObserver.observe(host);
    intersectionObserver.observe(host);
    resize();
    frame = requestAnimationFrame(tick);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={hostRef} className={`threeui-background warp-field${className ? ` ${className}` : ''}`}>
      <canvas
        ref={canvasRef}
        style={{
          filter: `hue-rotate(${options.hue}deg) saturate(${options.saturation}) brightness(${options.brightness})`,
        }}
      />
    </div>
  );
}
