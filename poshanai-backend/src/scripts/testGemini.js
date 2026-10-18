async function test() {
  try {
    const res = await fetch('http://127.0.0.1:20128/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-flash-latest',
        messages: [{ role: 'user', content: 'respond in json: {"status":"ok"}' }]
      })
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
