import { AnimatePresence, motion } from 'framer-motion';
import { Activity, BookOpen, CircleAlert, Leaf, X } from 'lucide-react';

function DetailSection({ icon: Icon, title, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 sm:p-6">
      <h3 className="mb-3 flex items-center gap-2 font-[Poppins] text-base font-semibold text-white">
        <Icon aria-hidden="true" className="h-5 w-5 text-orange-300" />
        {title}
      </h3>
      {children}
    </section>
  );
}

export default function NutrientModal({ isOpen, onClose, nutrientData }) {
  return (
    <AnimatePresence>
      {isOpen && nutrientData && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-md sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.article
            role="dialog"
            aria-modal="true"
            aria-labelledby="nutrient-modal-title"
            className="relative my-auto w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/20 bg-slate-900/85 text-slate-100 shadow-2xl shadow-black/40 backdrop-blur-2xl"
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(30,86,49,0.42),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(245,124,0,0.16),transparent_45%)]" />
            <div className="relative max-h-[min(88vh,850px)] overflow-y-auto p-6 sm:p-10">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close nutrient details"
                className="absolute right-5 top-5 rounded-full border border-white/15 bg-white/10 p-2 text-slate-200 transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>

              <div className="max-w-2xl pr-10">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-orange-300">PoshanAI · Food library</p>
                <h2 id="nutrient-modal-title" className="font-[Poppins] text-3xl font-bold tracking-tight text-white sm:text-5xl">
                  {nutrientData.title}
                </h2>
                <p className="mt-2 font-[Poppins] text-lg text-emerald-200">{nutrientData.subtitle}</p>
                <p className="mt-5 text-sm leading-7 text-slate-200 sm:text-base">{nutrientData.overview}</p>
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <DetailSection icon={Activity} title="Functions">
                  <ul className="space-y-2 text-sm leading-6 text-slate-200">
                    {nutrientData.functions?.map((item) => <li key={item} className="flex gap-2"><span className="text-emerald-300">•</span><span>{item}</span></li>)}
                  </ul>
                </DetailSection>
                <DetailSection icon={Leaf} title="Sources">
                  <p className="text-sm leading-6 text-slate-200">{nutrientData.sources}</p>
                </DetailSection>
                {nutrientData.aminoAcids && (
                  <DetailSection icon={BookOpen} title="Essential amino acids">
                    <p className="text-sm leading-6 text-slate-200">{nutrientData.aminoAcids}</p>
                  </DetailSection>
                )}
                <DetailSection icon={CircleAlert} title="Deficiency">
                  <p className="text-sm leading-6 text-slate-200">{nutrientData.deficiency}</p>
                </DetailSection>
              </div>
              <p className="mt-6 text-xs leading-5 text-slate-400">General nutrition information only. Nutrient needs vary by person; consult a qualified health professional for individual advice.</p>
            </div>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
