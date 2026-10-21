import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';

const springConfig = { damping: 18, stiffness: 220, mass: 0.6 };

export default function Tilt({
  children,
  className = '',
  maxTilt = 10,
  onClick,
  onHoverChange,
  ...props
}) {
  const prefersReducedMotion = useReducedMotion();
  const rotateXValue = useMotionValue(0);
  const rotateYValue = useMotionValue(0);
  const rotateX = useSpring(rotateXValue, springConfig);
  const rotateY = useSpring(rotateYValue, springConfig);

  const handlePointerMove = (event) => {
    if (prefersReducedMotion || event.pointerType === 'touch') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    rotateXValue.set((0.5 - y) * maxTilt * 2);
    rotateYValue.set((x - 0.5) * maxTilt * 2);
  };

  const resetTilt = () => {
    rotateXValue.set(0);
    rotateYValue.set(0);
    onHoverChange?.(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick?.(event);
    }
  };

  return (
    <motion.div
      {...props}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onPointerEnter={() => onHoverChange?.(true)}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      onFocus={() => onHoverChange?.(true)}
      onBlur={resetTilt}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 900,
        transformStyle: 'preserve-3d',
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
