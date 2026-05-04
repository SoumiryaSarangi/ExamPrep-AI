
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');

async function testGemini() {
  console.log('Testing Gemini Flashcards...');
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_FLASHCARD_KEY_1;
  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });
  
  try {
    const result = await model.generateContent('Say hello in JSON format {"hello": "world"}');
    console.log('Gemini Result:', result.response.text());
  } catch (err) {
    console.error('Gemini Error:', err.message, err.status);
  }
}

async function testGroq() {
  console.log('Testing Groq Quiz...');
  const apiKey = process.env.NEXT_PUBLIC_GROQ_QUIZ_KEY_1;
  const client = new Groq({ apiKey });
  
  try {
    const completion = await client.chat.completions.create({
      messages: [{ role: 'user', content: 'Say hello in JSON format {"hello": "world"}' }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 2048,
    });
    console.log('Groq Result:', completion.choices[0]?.message?.content);
  } catch (err) {
    console.error('Groq Error:', err.message);
  }
}

async function main() {
  await testGemini();
  await testGroq();
}

main();
