import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export default function Modal({ isOpen, onClose, title, children, className = '' }) {
  const dialogRef = useRef(null);
  const previousFocus = useRef(null);
  useEffect(() => {
    if (!isOpen) return undefined;
    previousFocus.current = document.activeElement;
    const dialog = dialogRef.current;
    const focusable = () => [
      ...dialog.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ];
    focusable()[0]?.focus();
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose?.();
      if (event.key === 'Tab') {
        const items = focusable();
        if (!items.length) {
          event.preventDefault();
          dialog.focus();
          return;
        }
        if (event.shiftKey && document.activeElement === items[0]) {
          event.preventDefault();
          items.at(-1).focus();
        } else if (!event.shiftKey && document.activeElement === items.at(-1)) {
          event.preventDefault();
          items[0].focus();
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus.current?.focus?.();
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close dialog"
            tabIndex={-1}
            className="absolute inset-0 cursor-default bg-slate-950/60"
            onClick={onClose}
          />
          <motion.section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="common-modal-title"
            tabIndex={-1}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className={`relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 ${className}`}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 id="common-modal-title" className="text-xl font-semibold">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-xl leading-none text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ×
              </button>
            </div>
            {children}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
