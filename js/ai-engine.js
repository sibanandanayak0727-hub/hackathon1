// =============================================
// AI ENGINE — Client-side NLP Analysis
// No external API, No RAG — pure algorithmic
// =============================================

const AIEngine = (() => {

    // ── Stop words ───────────────────────────────
    const STOP_WORDS = new Set([
        'a', 'an', 'the', 'is', 'it', 'in', 'on', 'of', 'and', 'or', 'to', 'for', 'are', 'was',
        'be', 'has', 'had', 'by', 'at', 'this', 'that', 'with', 'from', 'as', 'its', 'not',
        'but', 'also', 'which', 'who', 'they', 'we', 'he', 'she', 'i', 'you', 'me', 'my', 'our',
        'their', 'what', 'when', 'where', 'how', 'so', 'if', 'then', 'than', 'do', 'does',
        'did', 'have', 'been', 'can', 'could', 'will', 'would', 'should', 'may', 'might',
        'each', 'some', 'any', 'no', 'one', 'two', 'three', 'all', 'both', 'more', 'very',
    ]);

    // ── Tokenize text ────────────────────────────
    const tokenize = text =>
        text.toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2 && !STOP_WORDS.has(w));

    // ── TF-IDF across a corpus of answers ────────
    const computeTFIDF = answers => {
        const N = answers.length;
        const tf = answers.map(ans => {
            const tokens = tokenize(ans);
            const freq = {};
            tokens.forEach(t => { freq[t] = (freq[t] || 0) + 1; });
            const total = tokens.length || 1;
            return Object.fromEntries(Object.entries(freq).map(([k, v]) => [k, v / total]));
        });

        // document frequency
        const df = {};
        tf.forEach(tfDoc => {
            Object.keys(tfDoc).forEach(t => { df[t] = (df[t] || 0) + 1; });
        });

        // tfidf map per doc
        return tf.map(tfDoc =>
            Object.fromEntries(
                Object.entries(tfDoc).map(([t, tfVal]) => [t, tfVal * Math.log((N + 1) / (df[t] + 1))])
            )
        );
    };

    // ── N-gram generator ─────────────────────────
    const ngrams = (tokens, n) => {
        const result = [];
        for (let i = 0; i <= tokens.length - n; i++) {
            result.push(tokens.slice(i, i + n).join(' '));
        }
        return result;
    };

    // ── Cosine similarity between two TF-IDF vecs ─
    const cosineSim = (a, b) => {
        const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
        let dot = 0, normA = 0, normB = 0;
        keys.forEach(k => {
            const va = a[k] || 0, vb = b[k] || 0;
            dot += va * vb;
            normA += va * va;
            normB += vb * vb;
        });
        const denom = Math.sqrt(normA) * Math.sqrt(normB);
        return denom === 0 ? 0 : dot / denom;
    };

    // ── Cluster answers by similarity ────────────
    const clusterAnswers = (answers, threshold = 0.25) => {
        const tfidf = computeTFIDF(answers);
        const clusters = [];
        const assigned = new Array(answers.length).fill(false);

        for (let i = 0; i < answers.length; i++) {
            if (assigned[i]) continue;
            const cluster = [i];
            assigned[i] = true;
            for (let j = i + 1; j < answers.length; j++) {
                if (!assigned[j] && cosineSim(tfidf[i], tfidf[j]) >= threshold) {
                    cluster.push(j);
                    assigned[j] = true;
                }
            }
            clusters.push(cluster);
        }
        return clusters;
    };

    // ── Score heuristic (if no explicit score given) ─
    const scoreAnswer = (answer, modelKeywords) => {
        if (!answer || answer.trim().length === 0) return 0;
        const tokens = new Set(tokenize(answer));
        let hits = 0;
        modelKeywords.forEach(kw => { if (tokens.has(kw)) hits++; });
        const keywordScore = modelKeywords.length > 0 ? (hits / modelKeywords.length) * 60 : 30;
        const lengthScore = Math.min(answer.split(' ').length / 20, 1) * 40;
        return Math.round(keywordScore + lengthScore);
    };

    // ── Extract common mistake patterns ──────────
    const extractCommonMistakes = (submissions, question) => {
        // Group wrong-ish answers (score < 60 or no score)
        const wrongAnswers = submissions
            .filter(s => s.question === question && (s.score == null ? true : s.score < 65))
            .map(s => s.answer);

        if (wrongAnswers.length === 0) return [];

        // Find frequent n-grams across wrong answers
        const ngramFreq = {};
        wrongAnswers.forEach(ans => {
            const tokens = tokenize(ans);
            [...ngrams(tokens, 2), ...ngrams(tokens, 3)].forEach(ng => {
                ngramFreq[ng] = (ngramFreq[ng] || 0) + 1;
            });
        });

        // Filter n-grams that appear in >25% of wrong answers
        const minCount = Math.max(2, Math.round(wrongAnswers.length * 0.25));
        const mistakes = Object.entries(ngramFreq)
            .filter(([, cnt]) => cnt >= minCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([phrase, cnt]) => ({
                phrase,
                count: cnt,
                confidence: Math.min(Math.round((cnt / wrongAnswers.length) * 100), 99),
                affectedStudents: wrongAnswers.length,
                examples: wrongAnswers
                    .filter(ans => ans.toLowerCase().includes(phrase))
                    .slice(0, 2)
                    .map(ans => ans.length > 120 ? ans.slice(0, 120) + '…' : ans),
            }));

        return mistakes;
    };

    // ── Performance band classification ──────────
    const classifyPerformance = submissions => {
        const byStudent = {};
        submissions.forEach(s => {
            if (!byStudent[s.studentId]) byStudent[s.studentId] = [];
            byStudent[s.studentId].push(s.score || 50);
        });

        const bands = { high: [], average: [], struggling: [] };
        Object.entries(byStudent).forEach(([sid, scores]) => {
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            if (avg >= 80) bands.high.push({ studentId: sid, avg: Math.round(avg) });
            else if (avg >= 50) bands.average.push({ studentId: sid, avg: Math.round(avg) });
            else bands.struggling.push({ studentId: sid, avg: Math.round(avg) });
        });

        return bands;
    };

    // ── Question-wise stats ───────────────────────
    const questionStats = (submissions, questions) => {
        return questions.map((q, qi) => {
            const qSubs = submissions.filter(s => s.question === qi);
            if (qSubs.length === 0) return { question: q, avg: 0, low: 0, high: 0, count: 0 };
            const scores = qSubs.map(s => s.score || 50);
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            return {
                question: q,
                avg: Math.round(avg),
                low: Math.min(...scores),
                high: Math.max(...scores),
                count: qSubs.length,
                difficulty: avg < 50 ? 'Hard' : avg < 75 ? 'Moderate' : 'Easy',
            };
        });
    };

    // ── Top keywords per question ─────────────────
    const topKeywords = (submissions, question, topN = 8) => {
        const answers = submissions.filter(s => s.question === question).map(s => s.answer);
        if (answers.length === 0) return [];
        const tfidf = computeTFIDF(answers);
        const agg = {};
        tfidf.forEach(doc => {
            Object.entries(doc).forEach(([t, v]) => { agg[t] = (agg[t] || 0) + v; });
        });
        return Object.entries(agg)
            .sort((a, b) => b[1] - a[1])
            .slice(0, topN)
            .map(([word, score]) => ({ word, score: +score.toFixed(4) }));
    };

    // ── Main analysis entry point ─────────────────
    const analyzeAssignment = (assignment, submissions) => {
        const { questions } = assignment;

        const qStats = questionStats(submissions, questions);
        const perfBands = classifyPerformance(submissions);

        const commonMistakes = questions.map((q, qi) => ({
            question: q,
            questionIndex: qi,
            mistakes: extractCommonMistakes(submissions, qi),
        }));

        const keywords = questions.map((q, qi) => ({
            question: q,
            questionIndex: qi,
            keywords: topKeywords(submissions, qi),
        }));

        // Cluster all answers per question
        const clusters = questions.map((q, qi) => {
            const qSubs = submissions.filter(s => s.question === qi);
            const answers = qSubs.map(s => s.answer);
            const clusterGroups = clusterAnswers(answers);
            return {
                question: q,
                questionIndex: qi,
                groups: clusterGroups.map(idxs => ({
                    size: idxs.length,
                    representative: answers[idxs[0]],
                    studentIds: idxs.map(i => qSubs[i]?.studentId),
                })).sort((a, b) => b.size - a.size).slice(0, 4),
            };
        });

        // Overall class stats
        const allScores = submissions.map(s => s.score || 50);
        const classAvg = Math.round(allScores.reduce((a, b) => a + b, 0) / (allScores.length || 1));

        return {
            classAvg,
            totalStudents: Object.keys(
                submissions.reduce((acc, s) => { acc[s.studentId] = 1; return acc; }, {})
            ).length,
            totalSubmissions: submissions.length,
            qStats,
            perfBands,
            commonMistakes,
            keywords,
            clusters,
            analyzedAt: Date.now(),
        };
    };

    return { analyzeAssignment, scoreAnswer, tokenize };
})();
