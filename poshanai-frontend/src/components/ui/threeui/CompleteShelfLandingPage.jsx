import { useEffect, useMemo, useRef, useState } from 'react';
import { nutrientDetails } from '../../../data/nutrientDetails.js';
import NutrientModal from '../../library/NutrientModal.jsx';
// Vite handles this HTML raw import; eslint-plugin-import does not understand the ?raw suffix.
// eslint-disable-next-line import/no-unresolved
import shelfSource from './sources/complete-shelf-v2.html?raw';
import './threeui.css';

// Based on the ThreeUI CompleteShelfLandingPage source bundle and companion page asset.
const FOOD_CATEGORIES = [
  { id: 'codex', title: 'Grains', discipline: 'Everyday staples', note: 'Familiar foundations for satisfying meals.', deck: 'Rice, roti, millets and other everyday grains bring energy and comfort to the Indian plate.', theme: 'Grains · the everyday foundation', motif: 'Layered grain heads', color: '#1E5631', foil: '#F57C00' },
  { id: 'claude-code', title: 'Proteins', discipline: 'Strength and repair', note: 'Build your plate with nourishing protein.', deck: 'Dal, eggs, paneer, fish and lean meats can all help make meals more satisfying.', theme: 'Proteins · strength for every day', motif: 'Interwoven lentils', color: '#287448', foil: '#F57C00' },
  { id: 'cursor', title: 'Dairy & Calcium', discipline: 'Bones and balance', note: 'Small daily choices add up over time.', deck: 'Dairy and fortified alternatives can contribute calcium and other useful nutrients.', theme: 'Dairy · a calcium boost', motif: 'Soft milk ripples', color: '#54795B', foil: '#1E5631' },
  { id: 'antigravity', title: 'Healthy Fats', discipline: 'Heart-friendly choices', note: 'Make room for thoughtful fats.', deck: 'Nuts, seeds and suitable cooking oils bring flavour and fats to balanced meals.', theme: 'Healthy fats · balance with flavour', motif: 'Seeded orbit', color: '#F57C00', foil: '#1E5631' },
  { id: 'figma', title: 'Vegetables', discipline: 'Colour and variety', note: 'Add colour across the week.', deck: 'Seasonal vegetables offer variety, fibre and a broad range of naturally occurring nutrients.', theme: 'Vegetables · colour on the plate', motif: 'Garden leaves', color: '#728F5B', foil: '#F57C00' },
  { id: 'framer', title: 'Fruits', discipline: 'Seasonal goodness', note: 'A simple way to add natural variety.', deck: 'Seasonal fruits make a bright, practical addition to snacks and everyday meals.', theme: 'Fruits · nature’s seasonal mix', motif: 'Fruit blossoms', color: '#C26A2B', foil: '#1E5631' },
  { id: 'xcode', title: 'Micronutrients', discipline: 'The little essentials', note: 'A varied diet supports many needs.', deck: 'A varied mix of foods helps bring vitamins and minerals into everyday eating.', theme: 'Micronutrients · small but essential', motif: 'Mineral facets', color: '#34495E', foil: '#F57C00' },
];

function updateBook(source, book) {
  const start = source.search(new RegExp(`id: ["']${book.id}["']`));
  if (start < 0) return source;
  const end = source.indexOf('\n      },', start) >= 0
    ? source.indexOf('\n      },', start)
    : source.indexOf('\n      }\n    ];', start);
  if (end < 0) return source;
  const block = source.slice(start, end);
  const updated = block.replace(/(title|discipline|note|deck|theme|motif|color|foil): "[^"]*"/g, (match, key) => {
    const value = book[key];
    return value ? `${key}: ${JSON.stringify(value)}` : match;
  });
  return source.slice(0, start) + updated + source.slice(end);
}

export default function CompleteShelfLandingPage({
  className = '',
  primaryColor = '#1E5631',
  headingFont = 'Poppins',
  bodyFont = 'Inter',
}) {
  const shelfFrame = useRef(null);
  const [selectedNutrient, setSelectedNutrient] = useState(null);
  const safePrimaryColor = /^#[\da-f]{6}$/i.test(primaryColor) ? primaryColor : '#1E5631';
  const safeHeadingFont = ['Poppins', 'Inter'].includes(headingFont) ? headingFont : 'Poppins';
  const safeBodyFont = ['Poppins', 'Inter'].includes(bodyFont) ? bodyFont : 'Inter';

  useEffect(() => {
    function handleShelfMessage(event) {
      if (event.source !== shelfFrame.current?.contentWindow) return;
      if (event.data?.type !== 'poshanai:nutrient-open') return;

      const titleToKey = {
        Proteins: 'Protein',
        'Dairy & Calcium': 'Diet & Calcium',
      };
      const nutrient = nutrientDetails[titleToKey[event.data.title] || event.data.title];
      if (nutrient) setSelectedNutrient(nutrient);
    }

    window.addEventListener('message', handleShelfMessage);
    return () => window.removeEventListener('message', handleShelfMessage);
  }, []);

  const srcDoc = useMemo(() => {
    let documentSource = shelfSource;
    FOOD_CATEGORIES.forEach((book) => { documentSource = updateBook(documentSource, book); });
    const brandStyles = `
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        :root { --accent: ${safePrimaryColor}; --paper: #F9FBF9; --ink: #1E5631; }
        body { font-family: '${safeBodyFont}', Inter, sans-serif !important; }
        h1, h2, h3, h4, .book-title, .selection__title, .detail-title { font-family: '${safeHeadingFont}', Poppins, sans-serif !important; }
        .fallback-book strong { font-family: '${safeHeadingFont}', Poppins, sans-serif !important; }
      </style>
    `;
    documentSource = documentSource.replace(
      'activeBook = bookRigs[selectedIndex];',
      `activeBook = bookRigs[selectedIndex];\n      window.parent.postMessage({ type: "poshanai:nutrient-open", title: activeBook.data.title }, "*");`,
    );
    return documentSource.replace('</head>', `${brandStyles}</head>`);
  }, [safePrimaryColor, safeHeadingFont, safeBodyFont]);

  return (
    <>
      <div className={`threeui-shelf-frame ${className}`.trim()}>
        <iframe
          ref={shelfFrame}
          title="PoshanAI food library: interactive 3D shelf"
          srcDoc={srcDoc}
          sandbox="allow-scripts"
          loading="eager"
        />
      </div>
      <NutrientModal
        isOpen={Boolean(selectedNutrient)}
        nutrientData={selectedNutrient}
        onClose={() => setSelectedNutrient(null)}
      />
    </>
  );
}
