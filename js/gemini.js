// =============================================
// GEMINI BRIDGE — AI Integration
// =============================================

import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

const Gemini = (() => {

    let genAI = null;
    let model = null;

    const init = () => {
        const settings = Storage.getSettings();
        if (settings.geminiKey) {
            genAI = new GoogleGenerativeAI(settings.geminiKey);
            model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            return true;
        }
        return false;
    };

    const isReady = () => {
        if (!genAI || !model) return init();
        return true;
    };

    /**
     * Explain a mistake pattern found by the local engine.
     */
    const explainMistake = async (question, mistakePhrase, examples) => {
        if (!isReady()) throw new Error("Gemini API key not configured.");

        const prompt = `
            As an expert educator, explain why students are making this specific mistake in their answer.
            
            Question: ${question}
            Mistake Pattern Found: "${mistakePhrase}"
            Examples of student answers containing this: ${JSON.stringify(examples)}
            
            Provide:
            1. A concise explanation of the conceptual gap (2-3 sentences).
            2. A specific teaching suggestion to address this mistake (1-2 sentences).
        `;

        try {
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            console.error("Gemini Error:", error);
            throw error;
        }
    };

    /**
     * Generate high-quality feedback draft using Gemini.
     */
    const generateFeedback = async (context) => {
        if (!isReady()) throw new Error("Gemini API key not configured.");

        const prompt = `
            Generate insightful, professional, and encouraging feedback for a teacher to share with their class.
            
            Assignment: ${context.assignmentTitle}
            Subject: ${context.subject}
            Class Average: ${context.classAvg}%
            
            Key Insights:
            ${JSON.stringify(context.insights)}
            
            Format:
            - Class Summary (A high-level overview of performance and general themes)
            - Actionable Advice (What the class should focus on next)
            Keep it professional but supportive.
        `;

        try {
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            console.error("Gemini Error:", error);
            throw error;
        }
    };

    return {
        explainMistake,
        generateFeedback,
        isReady
    };
})();

window.Gemini = Gemini;
export default Gemini;
