import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.resolve('package/index.csv');
const outputPath = path.resolve(__dirname, '../../data/ifct_2017.json');

const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split('\n');

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

const round = (val) => (val === null || val === undefined || isNaN(val) ? 0 : Math.round(Number(val) * 100) / 100);

const records = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  const row = parseCsvLine(line);
  const ifctCode = row[0].replace(/"/g, '').trim();
  const foodName = row[1].replace(/"/g, '').trim();
  const category = row[4].replace(/"/g, '').trim();
  const regn = parseInt(row[5].replace(/"/g, '').trim(), 10) || 6;
  const tagsStr = (row[6] || '').replace(/"/g, '').toLowerCase();

  let dietTags = [];
  const lowerCat = category.toLowerCase();
  const lowerName = foodName.toLowerCase();

  if (lowerCat.includes('egg')) {
    dietTags = ['eggetarian', 'fishetarian', 'nonveg'];
  } else if (lowerCat.includes('fish') || lowerCat.includes('shellfish') || lowerCat.includes('mollusk')) {
    dietTags = ['fishetarian', 'nonveg'];
  } else if (lowerCat.includes('poultry') || lowerCat.includes('meat')) {
    dietTags = ['nonveg'];
  } else if (tagsStr.includes('nonveg')) {
    dietTags = ['nonveg'];
  } else {
    dietTags = ['veg', 'eggetarian', 'fishetarian'];
  }

  const allergens = new Set();
  if (lowerCat.includes('grain legumes') || lowerCat.includes('pulses')) {
    allergens.add('legumes');
    if (lowerName.includes('peanut')) {
      allergens.add('peanuts');
      allergens.add('nuts');
    }
    if (lowerName.includes('soy')) {
      allergens.add('soy');
    }
  } else if (lowerCat.includes('milk')) {
    allergens.add('dairy');
  } else if (lowerCat.includes('egg')) {
    allergens.add('eggs');
  } else if (lowerCat.includes('poultry')) {
    allergens.add('poultry');
  } else if (lowerCat.includes('marine fish') || lowerCat.includes('fresh water fish')) {
    allergens.add('fish');
  } else if (lowerCat.includes('shellfish') || lowerCat.includes('mollusk')) {
    allergens.add('shellfish');
  } else if (lowerCat.includes('mushroom')) {
    allergens.add('mushrooms');
  } else if (lowerCat.includes('nuts and oil seeds')) {
    if (/walnut|almond|cashew|pista|hazelnut|pecan|nut/i.test(lowerName)) {
      allergens.add('nuts');
    }
    if (/sesame|til/i.test(lowerName)) {
      allergens.add('sesame');
      allergens.add('seeds');
    }
    if (/mustard|sunflower|flax|chia|pumpkin/i.test(lowerName)) {
      allergens.add('seeds');
    }
    if (allergens.size === 0) allergens.add('nuts');
  } else if (lowerCat.includes('cereals and millets')) {
    if (/wheat|barley|rye|semolina|maida/i.test(lowerName)) {
      allergens.add('gluten');
    }
  }

  // Energy in kJ -> kcal (kJ / 4.184)
  const enercVal = parseFloat(row[7]);
  const calories = !isNaN(enercVal) && enercVal > 0 ? round(enercVal / 4.184) : 0;

  // Fat (col 15) in g
  const fatVal = parseFloat(row[15]);
  const fat = !isNaN(fatVal) && fatVal >= 0 ? round(fatVal) : 0;

  // Carbohydrate (col 21) in g
  const carbVal = parseFloat(row[21]);
  const carbs = !isNaN(carbVal) && carbVal >= 0 ? round(carbVal) : 0;

  // Protein (col 23) in g
  const protVal = parseFloat(row[23]);
  const protein = !isNaN(protVal) && protVal >= 0 ? round(protVal) : 0;

  // Vitamin D (col 59) in g -> mcg (* 1e6)
  const vitdVal = parseFloat(row[59]);
  const vitaminD = !isNaN(vitdVal) && vitdVal >= 0 ? round(vitdVal * 1e6) : 0;

  // Calcium (col 169) in g -> mg (* 1000)
  const caVal = parseFloat(row[169]);
  const calcium = !isNaN(caVal) && caVal >= 0 ? round(caVal * 1000) : 0;

  // Iron (col 177) in g -> mg (* 1000)
  const feVal = parseFloat(row[177]);
  const iron = !isNaN(feVal) && feVal >= 0 ? round(feVal * 1000) : 0;

  records.push({
    ifctCode,
    foodName,
    category,
    regionCode: regn,
    dietTags,
    allergens: Array.from(allergens),
    nutrients: {
      calories,
      protein,
      carbs,
      fat,
      iron,
      calcium,
      vitaminD,
      vitaminB12: null,
    },
  });
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(records, null, 2), 'utf8');
console.log(`Generated ${records.length} IFCT 2017 foods in ${outputPath}`);
