import { forwardRef, useId, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from './cn.js';

const spring = { type: 'spring', stiffness: 500, damping: 30, mass: 0.5 };

const SmoothInput = forwardRef(function SmoothInput(
  { label, error, helperText, icon, id, className, onFocus, onBlur, onChange, onClick, onKeyUp, onSelect, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const [caretLeft, setCaretLeft] = useState(12);

  const updateCaret = (input) => {
    const styles = window.getComputedStyle(input);
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return;
    context.font = `${styles.fontStyle} ${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`;
    const selection = input.selectionStart ?? input.value.length;
    const text = input.type === 'password' ? '•'.repeat(selection) : input.value.slice(0, selection);
    const leftPadding = Number.parseFloat(styles.paddingLeft) || 0;
    const rightPadding = Number.parseFloat(styles.paddingRight) || 0;
    const measured = leftPadding + context.measureText(text).width - input.scrollLeft;
    setCaretLeft(Math.max(leftPadding, Math.min(measured, input.clientWidth - rightPadding - 2)));
  };

  return (
    <div className="w-full">
      {label && <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-800 dark:text-slate-100">{label}</label>}
      <motion.div
        animate={{ y: focused ? -1 : 0, boxShadow: focused ? '4px 4px 0 #000' : '0 0 0 0 #000' }}
        transition={spring}
        className={cn('relative rounded-none border-4 border-black bg-white', icon && 'pl-10')}
      >
        {icon && <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center text-slate-400">{icon}</span>}
        <input
          {...props}
          ref={(node) => {
            inputRef.current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;
          }}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error || helperText ? messageId : undefined}
          onFocus={(event) => { setFocused(true); updateCaret(event.currentTarget); onFocus?.(event); }}
          onBlur={(event) => { setFocused(false); onBlur?.(event); }}
          onChange={(event) => { updateCaret(event.currentTarget); onChange?.(event); }}
          onClick={(event) => { updateCaret(event.currentTarget); onClick?.(event); }}
          onKeyUp={(event) => { updateCaret(event.currentTarget); onKeyUp?.(event); }}
          onSelect={(event) => { updateCaret(event.currentTarget); onSelect?.(event); }}
          className={cn('relative z-[1] w-full rounded-none border-0 bg-white px-3 py-2.5 font-minecraft text-black caret-black outline-none placeholder:text-slate-500 focus:caret-transparent dark:bg-white dark:text-black', icon && 'pl-0', error && 'text-red-700', className)}
        />
        <motion.span aria-hidden="true" animate={{ left: caretLeft, opacity: focused ? 1 : 0, scaleY: focused ? 1 : 0.65 }} transition={spring} className="pointer-events-none absolute top-1/2 z-[2] h-[1.2em] w-0.5 -translate-y-1/2 rounded-none bg-black" />
      </motion.div>
      {(error || helperText) && <p id={messageId} className={cn('mt-1.5 text-sm', error ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400')} role={error ? 'alert' : undefined}>{error || helperText}</p>}
    </div>
  );
});

export default SmoothInput;
