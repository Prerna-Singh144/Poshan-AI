import { retrieveFoodsForDeficiencies } from '../rag/ragService.js';
import { buildMealPlanPrompt, mealPlanSystemPrompt } from '../rag/promptBuilder.js';

async function testMealPlanPrompt() {
  const deficiencies = [{ nutrient: 'Iron' }];
  const preferences = { dietType: 'veg', age: 28, weight: 65 };
  const foods = retrieveFoodsForDeficiencies(deficiencies, preferences);

  console.log(`Retrieved ${foods.length} IFCT foods.`);

  const prompt = buildMealPlanPrompt(preferences, deficiencies, foods);

  console.log('\nSending prompt to OmniRoute / Gemini...');
  const startTime = Date.now();
  const res = await fetch('http://127.0.0.1:20128/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gemini-flash-latest',
      messages: [
        { role: 'system', content: mealPlanSystemPrompt },
        { role: 'user', content: prompt },
      ],
    }),
  });

  console.log(`HTTP Status: ${res.status} (took ${Date.now() - startTime}ms)`);
  const text = await res.text();
  console.log('Raw body response:', text);

  if (res.ok) {
    const data = JSON.parse(text);
    const content = data?.choices?.[0]?.message?.content;
    console.log('\n--- Gemini Content ---');
    console.log(content);
  }
}

testMealPlanPrompt().catch(console.error);
