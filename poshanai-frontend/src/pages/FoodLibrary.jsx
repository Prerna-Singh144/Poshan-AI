import { useState } from 'react';
import { Apple, Bean, Citrus, Droplets, Leaf, Sprout, Wheat } from 'lucide-react';
import NutrientModal from '../components/library/NutrientModal.jsx';
import TiltCard from '../components/ui/TiltCard.jsx';
import { nutrientDetails } from '../data/nutrientDetails.js';

const nutrientIcons = {
  Protein: Bean,
  Grains: Wheat,
  Micronutrients: Citrus,
  Vegetables: Leaf,
  Fruits: Apple,
  'Diet & Calcium': Droplets,
  'Healthy Fats': Sprout,
};

export default function FoodLibrary() {
  const [selectedNutrient, setSelectedNutrient] = useState(null);

  return (
    <main className="min-h-[70vh] bg-[#F9FBF9] px-4 py-12 dark:bg-slate-950 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-7xl">
        <header className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-800 dark:text-emerald-300">
            PoshanAI · Food library
          </p>
          <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            Explore everyday nutrition
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
            Learn what different food groups contribute and discover familiar ways to add variety to your plate.
          </p>
        </header>

        <section aria-label="Nutrient categories" className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(nutrientDetails).map(([name, nutrient]) => (
            <TiltCard
              key={name}
              title={nutrient.title ?? name}
              description={nutrient.subtitle}
              badgeLabel="View Details"
              icon={nutrientIcons[name] ?? Leaf}
              onClick={() => setSelectedNutrient(nutrient)}
            />
          ))}
        </section>

        <p className="mx-auto mt-10 max-w-3xl text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
          General nutrition information only. Nutrient needs vary by person; consult a qualified health professional for individual advice.
        </p>
      </div>

      <NutrientModal
        isOpen={Boolean(selectedNutrient)}
        nutrientData={selectedNutrient}
        onClose={() => setSelectedNutrient(null)}
      />
    </main>
  );
}
