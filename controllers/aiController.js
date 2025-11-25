const OpenAI = require('openai');


if (!process.env.OPENROUTER_API_KEY) {
    console.warn("WARNING: OPENROUTER_API_KEY is missing in .env file");
}

const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
        "HTTP-Referer": process.env.NODE_ENV === 'production'
            ? "https://pollarity-frontend.onrender.com"
            : "http://localhost:3000",
        "X-Title": "Pollarity",
    },
});

// Helper: Extracts JSON from markdown or raw text safely

const cleanAndParse = (text) => {
    if (!text) return [];

    try {

        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        // 1. Try finding a JSON array first (for generateSurvey)
        const arrayMatch = cleanText.match(/\[[\s\S]*\]/);
        if (arrayMatch) return JSON.parse(arrayMatch[0]);

        // 2. Try finding a JSON object (for refineQuestion)
        const objectMatch = cleanText.match(/\{[\s\S]*\}/);
        if (objectMatch) return JSON.parse(objectMatch[0]);

        // 3. Fallback
        return JSON.parse(cleanText);

    } catch (e) {
        console.error("JSON Parse Error. Raw AI Output:", text);
        return [];
    }
};

exports.generateSurvey = async (req, res) => {
    const { title, description, existing_questions } = req.body;

    // 1. Context Construction
    let historyContext = "Current Survey State: New Survey.";
    let avoidList = "";

    if (existing_questions && existing_questions.length > 0) {
        // We take the last 15 questions for context to ensure flow
        const recentQuestions = existing_questions.slice(-15);
        const questionList = recentQuestions
            .map((q, i) => `- ${q.question_text || q}`)
            .join("\n");

        historyContext = `PREVIOUS QUESTIONS (Context only):\n${questionList}`;
        avoidList = "CRITICAL: Do not repeat any questions from the list above. Do not ask the same thing in different words.";
    }

    // 2. The Task
    const taskInstruction = existing_questions && existing_questions.length > 0
        ? "Task: Generate 5 NEW follow-up questions that naturally continue the survey."
        : "Task: Generate 5 introductory questions to start the survey.";

    try {
        const completion = await openai.chat.completions.create({
            model: "meta-llama/llama-3.3-70b-instruct:free",
            temperature: 0.2,
            messages: [
                {
                    role: "system",
                    content: `You are a headless JSON API. You do not speak. You only output JSON.

### DATABASE SCHEMA (STRICT)
1. **question_text**: String. Clear, concise, professional.
2. **question_type**: Enum: 'multiple_choice', 'checkbox', 'short_answer'.
3. **is_required**: Boolean.
4. **options**: Array of objects { "option_text": "..." }. 
   - MUST have 3-5 options for 'multiple_choice'/'checkbox'.
   - MUST be empty [] for 'short_answer'.

### OUTPUT FORMAT
Return a valid JSON Object with a "questions" key containing the array.
Example:
{
  "questions": [
    {
      "question_text": "Select your age group.",
      "question_type": "multiple_choice",
      "is_required": true,
      "options": [
        { "option_text": "18-24" },
        { "option_text": "25-34" },
        { "option_text": "35+" }
      ]
    }
  ]
}`
                },
                {
                    role: "user",
                    content: `Survey Title: ${title}
Description: ${description}

${historyContext}

${avoidList}

${taskInstruction}
REMINDER: JSON ONLY. No markdown formatting. No conversational text.`
                }
            ]
        });

        const rawContent = completion.choices[0].message.content;
        const parsedData = cleanAndParse(rawContent);

        // Normalize: Llama 3.3 might return the array directly or wrapped in { questions: [] }
        // We check for both to be safe.
        const finalQuestions = Array.isArray(parsedData)
            ? parsedData
            : (parsedData.questions || parsedData.data || []);

        if (finalQuestions.length === 0) {
            throw new Error("Empty question set generated");
        }

        res.json(finalQuestions);

    } catch (error) {
        console.error("AI Generate Error:", error);
        res.status(500).json({ message: "Generation failed", error: error.message });
    }
};

exports.refineQuestion = async (req, res) => {
    const { question, survey_title, survey_description } = req.body;

    if (!question || !question.question_text) {
        return res.status(400).json({ message: "Question data is required" });
    }

    try {
        const completion = await openai.chat.completions.create({
            model: "meta-llama/llama-3.3-70b-instruct:free",
            temperature: 0.1, // Near-zero temperature for editing tasks to prevent hallucinations
            messages: [
                {
                    role: "system",
                    content: `You are a JSON Transformation Engine. 
Your task: Improve grammar, remove bias, and ensure professional tone.

INPUT: JSON Object
OUTPUT: JSON Object (Refined version)

Rules:
1. Maintain the original intent.
2. Fix spelling/grammar.
3. Ensure options are mutually exclusive.
4. Return ONLY the JSON.`
                },
                {
                    role: "user",
                    content: `Context: ${survey_title} - ${survey_description}

Refine this JSON:
${JSON.stringify(question)}`
                }
            ]
        });

        const parsedData = cleanAndParse(completion.choices[0].message.content);

        // Validation check to ensure Llama didn't hallucinate a wrapper key
        const result = parsedData.question_text ? parsedData : (parsedData.refined_question || parsedData.result);

        if (!result || !result.question_text) {
            console.error("Invalid Refine Data:", parsedData);
            throw new Error("Invalid structure returned");
        }

        res.json({ result });

    } catch (error) {
        console.error("AI Refine Error:", error);
        res.status(500).json({ message: "Refinement failed", error: error.message });
    }
};