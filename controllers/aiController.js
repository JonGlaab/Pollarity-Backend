const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
});

// Helper to ensure we get clean JSON
const cleanAndParse = (text) => {
    try {
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("JSON Parse Error:", text);
        throw new Error("AI returned invalid JSON format");
    }
};

exports.generateSurvey = async (req, res) => {
    const { title, description, existing_questions } = req.body;

    // 1. Parse Existing Questions
    let historyContext = "No questions created yet. Start from the beginning.";

    if (existing_questions && Array.isArray(existing_questions) && existing_questions.length > 0) {
        const questionList = existing_questions
            .map((q, index) => `${index + 1}. ${q.question_text || q}`)
            .join("\n");

        historyContext = `THE FOLLOWING QUESTIONS ALREADY EXIST (DO NOT REPEAT THEM):\n${questionList}`;
    }


    const taskInstruction = existing_questions && existing_questions.length > 0
        ? "Generate 5 NEW follow-up questions. They must be distinct from the existing list. Dig deeper into the topic."
        : "Generate 5 introductory questions to start the survey.";

    try {
        const completion = await openai.chat.completions.create({
            model: "google/gemini-2.0-flash-exp:free",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `You are a Database-Aware Survey Architect. 
Your goal is to expand a survey without repeating existing questions.

### DATABASE SCHEMA (STRICT)
1. **Question Types**: ONLY use 'multiple_choice', 'checkbox', 'short_answer'.
2. **Lengths**: "question_text" < 500 chars. "option_text" < 255 chars.
3. **Required**: Set "is_required" to true only for essential data.

### OUTPUT JSON
{
  "questions": [
    {
      "question_text": "String",
      "question_type": "Enum",
      "is_required": boolean,
      "options": [ { "option_text": "String" } ]
    }
  ]
}

### LOGIC RULES
1. **No Duplicates**: Compare against the "ALREADY EXIST" list.
2. **Short Answer**: "options" array MUST be empty [].
3. **Options**: For multiple_choice/checkbox, provide 3-5 distinct options.`
                },
                {
                    role: "user",
                    content: `**Survey Title**: ${title}
**Description**: ${description}

${historyContext}

**Current Task**: ${taskInstruction}`
                }
            ],
            temperature: 0.7,
        });

        const parsedData = cleanAndParse(completion.choices[0].message.content);

        // Handle root object or array
        const questionsArray = parsedData.questions || parsedData;

        if (!Array.isArray(questionsArray)) {
            return res.status(500).json({ message: "AI format error: Expected array." });
        }

        res.json(questionsArray);

    } catch (error) {
        console.error("AI Generate Error:", error);
        res.status(500).json({ message: "Failed to generate questions", error: error.message });
    }
};

exports.refineQuestion = async (req, res) => {
    const { question, survey_title, survey_description } = req.body;

    if (!question || !question.question_text) {
        return res.status(400).json({ message: "Question data is required" });
    }

    try {
        const completion = await openai.chat.completions.create({
            model: "google/gemini-2.0-flash-exp:free",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `You are an expert Survey Editor. Refine the question to be unbiased, clear, and professional.
                    Fix grammar. Ensure options are mutually exclusive.
                    Return JSON format: { "question_text": "...", "options": [{ "option_text": "..." }] }`
                },
                {
                    role: "user",
                    content: `Context: ${survey_title} - ${survey_description}.
                    Refine this: ${JSON.stringify(question)}`
                }
            ],
            temperature: 0.7,
        });

        const refinedData = cleanAndParse(completion.choices[0].message.content);
        res.json({ result: refinedData });

    } catch (error) {
        console.error("AI Refine Error:", error);
        res.status(500).json({ message: "Failed to refine question", error: error.message });
    }
};