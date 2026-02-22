// =============================================
// FEEDBACK GENERATOR — Draft creation engine
// =============================================

const FeedbackGenerator = (() => {

    // ── Class-level summary template ─────────────
    const classLevelSummary = (assignment, insights) => {
        const { classAvg, totalStudents, perfBands, qStats } = insights;
        const highCount = perfBands.high.length;
        const avgCount = perfBands.average.length;
        const strugglingCount = perfBands.struggling.length;
        const hardestQ = [...qStats].sort((a, b) => a.avg - b.avg)[0];
        const easiestQ = [...qStats].sort((a, b) => b.avg - a.avg)[0];

        return `Class Performance Summary — ${assignment.title}

Overall class average: ${classAvg}%
Total students assessed: ${totalStudents}

Performance Distribution:
• High performers (≥80%): ${highCount} student(s)
• Average performers (50–79%): ${avgCount} student(s)
• Struggling students (<50%): ${strugglingCount} student(s)

${hardestQ ? `Most challenging question: "${hardestQ.question}" (avg ${hardestQ.avg}%)` : ''}
${easiestQ && easiestQ !== hardestQ ? `Best performed question: "${easiestQ.question}" (avg ${easiestQ.avg}%)` : ''}

${strugglingCount > 0
                ? `⚠️ ${strugglingCount} student(s) need immediate intervention. Consider scheduling office hours or providing supplemental materials.`
                : '✅ The class overall demonstrated a solid understanding of the material.'}

[Edit this summary before sharing with students or department heads]`.trim();
    };

    // ── Question-wise improvement suggestions ────
    const questionFeedback = (qStat, commonMistakes) => {
        const { question, avg, difficulty, count } = qStat;
        const mistakes = commonMistakes?.mistakes || [];

        let text = `Question: "${question}"\nAverage Score: ${avg}% | Difficulty: ${difficulty} | Responses: ${count}\n\n`;

        if (avg >= 80) {
            text += `✅ Students performed well on this question. Most demonstrated a clear understanding of the core concept.\n`;
        } else if (avg >= 60) {
            text += `⚡ Moderate performance. While many students grasped the basics, there are gaps that need addressing.\n`;
        } else {
            text += `❌ This question had low performance. This concept should be revisited in the next class session.\n`;
        }

        if (mistakes.length > 0) {
            text += `\nCommon Mistakes Detected:\n`;
            mistakes.forEach((m, i) => {
                text += `  ${i + 1}. Pattern: "${m.phrase}" — appeared in ${m.count} responses (Confidence: ${m.confidence}%)\n`;
                if (m.examples.length > 0) {
                    text += `     Example: "${m.examples[0]}"\n`;
                }
            });
            text += `\nImprovement Suggestion: Focus revision on the specific misconceptions listed above. Provide worked examples that directly contrast the correct concept with these common incorrect statements.\n`;
        } else {
            text += `\nNo significant repeated mistakes detected for this question.\n`;
        }

        return text.trim();
    };

    // ── Per-student feedback draft ───────────────
    const studentFeedback = (studentId, submissions, insights) => {
        const studentSubs = submissions.filter(s => s.studentId === studentId);
        if (studentSubs.length === 0) return null;

        const scores = studentSubs.map(s => s.score || 50);
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        const band = avg >= 80 ? 'High Performer' : avg >= 50 ? 'Average Performer' : 'Needs Support';

        const weakQs = studentSubs
            .filter(s => (s.score || 50) < 60)
            .map(s => `Question ${s.question + 1}`);

        let text = `Feedback for Student ${studentId}\n`;
        text += `Overall Average: ${avg}% — ${band}\n\n`;

        if (avg >= 80) {
            text += `Excellent work! You demonstrated strong understanding across most questions. `;
            text += `Keep applying this analytical approach in upcoming assessments.\n`;
        } else if (avg >= 50) {
            text += `Good effort. You have a foundational understanding but there are areas for improvement. `;
            text += `Review the class notes for concepts you found challenging.\n`;
        } else {
            text += `This was a challenging assessment for you. Don't be discouraged — targeted revision will help. `;
            text += `Please consider attending office hours to discuss the material.\n`;
        }

        if (weakQs.length > 0) {
            text += `\nAreas to focus on: ${weakQs.join(', ')}\n`;
        }

        return text.trim();
    };

    // ── Generate full feedback package ───────────
    const generateAll = (assignment, submissions, insights) => {
        const summary = classLevelSummary(assignment, insights);

        const questionDrafts = insights.qStats.map((qStat, qi) => {
            const cm = insights.commonMistakes.find(c => c.questionIndex === qi);
            return {
                questionIndex: qi,
                question: qStat.question,
                draft: questionFeedback(qStat, cm),
                status: 'pending', // 'pending' | 'approved' | 'rejected'
            };
        });

        // Get unique student IDs
        const studentIds = [...new Set(submissions.map(s => s.studentId))];
        const studentDrafts = studentIds.map(sid => ({
            studentId: sid,
            draft: studentFeedback(sid, submissions, insights),
            status: 'pending',
        }));

        return {
            summary,
            summaryStatus: 'pending',
            questionDrafts,
            studentDrafts,
            generatedAt: Date.now(),
        };
    };

    return { generateAll, classLevelSummary, questionFeedback, studentFeedback };
})();
