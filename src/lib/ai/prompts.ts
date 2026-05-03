/**
 * Prompt templates for AI content generation
 */

export const PROMPTS = {
  notes: (content: string, filename: string) => `Analyze this lecture content and create comprehensive study notes.

Content from "${filename}":
${content}

Generate structured notes with:
1. Main Topic Overview (2-3 sentences)
2. Key Concepts with clear definitions
3. Important Points as bullet points
4. Formulas/Equations (if applicable)
5. Examples (if mentioned)
6. Summary (3-5 key takeaways)

Format the response as clean, well-organized Markdown with proper headers (##, ###), bullet points, and **bold** for key terms.`,

  flashcards: (content: string, filename: string) => `Create flashcards from this educational content.

Content from "${filename}":
${content}

Generate 15-20 high-quality flashcards focusing on:
- Key definitions and terminology
- Important concepts and their explanations
- Formulas and their applications
- Potential exam questions

For each flashcard, provide:
- Front: A clear question or term
- Back: A concise but complete answer
- Difficulty: easy, medium, or hard

Return as JSON array: [{ "front": "", "back": "", "difficulty": "" }]`,

  quiz: (content: string, filename: string) => `Create a comprehensive quiz from this content.

Content from "${filename}":
${content}

Generate 10 multiple-choice questions with:
- Clear, unambiguous questions
- 4 options each (A, B, C, D)
- One clearly correct answer
- Brief explanation for the correct answer

Mix difficulty: 30% easy, 50% medium, 20% hard

Return as JSON: { "questions": [{ "question": "", "options": [], "correct": 0, "explanation": "", "difficulty": "" }] }`,

  diagram: (content: string, filename: string) => `Create visual diagrams for this content using Mermaid.js syntax.

Content from "${filename}":
${content}

Generate:
1. A mind map showing the topic hierarchy and relationships
2. A flowchart showing any processes or sequences

Use valid Mermaid syntax:
- mindmap for concept maps
- flowchart TD for process flows

Return as JSON: { "mindmap": "mermaid code", "flowchart": "mermaid code" }`
}
