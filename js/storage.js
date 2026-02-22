// =============================================
// STORAGE MANAGER — localStorage CRUD helpers
// =============================================

const Storage = (() => {
  const KEYS = {
    ASSIGNMENTS: 'aia_assignments',
    SUBMISSIONS: 'aia_submissions',
    INSIGHTS: 'aia_insights',
    FEEDBACK: 'aia_feedback',
    SETTINGS: 'aia_settings',
    ACTIVITY: 'aia_activity',
  };

  const get = key => {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  };

  const set = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  };

  const push = (key, item) => {
    const arr = get(key);
    arr.push(item);
    set(key, arr);
    return item;
  };

  const update = (key, id, patch) => {
    const arr = get(key).map(x => x.id === id ? { ...x, ...patch } : x);
    set(key, arr);
  };

  const remove = (key, id) => {
    set(key, get(key).filter(x => x.id !== id));
  };

  const clear = key => set(key, []);

  // ── Assignments ──────────────────────────────
  const saveAssignment = assignment => push(KEYS.ASSIGNMENTS, assignment);
  const getAssignments = () => get(KEYS.ASSIGNMENTS);
  const deleteAssignment = id => remove(KEYS.ASSIGNMENTS, id);
  const updateAssignment = (id, patch) => update(KEYS.ASSIGNMENTS, id, patch);

  // ── Submissions ──────────────────────────────
  const saveSubmissions = submissions => {
    const existing = get(KEYS.SUBMISSIONS);
    const merged = [...existing, ...submissions];
    set(KEYS.SUBMISSIONS, merged);
  };
  const getSubmissions = (assignmentId = null) => {
    const all = get(KEYS.SUBMISSIONS);
    return assignmentId ? all.filter(s => s.assignmentId === assignmentId) : all;
  };
  const clearSubmissions = assignmentId => {
    set(KEYS.SUBMISSIONS, get(KEYS.SUBMISSIONS).filter(s => s.assignmentId !== assignmentId));
  };

  // ── Insights ─────────────────────────────────
  const saveInsights = (assignmentId, insights) => {
    const all = get(KEYS.INSIGHTS).filter(i => i.assignmentId !== assignmentId);
    all.push({ assignmentId, insights, generatedAt: Date.now() });
    set(KEYS.INSIGHTS, all);
  };
  const getInsights = assignmentId => {
    const rec = get(KEYS.INSIGHTS).find(i => i.assignmentId === assignmentId);
    return rec ? rec.insights : null;
  };

  // ── Feedback ─────────────────────────────────
  const saveFeedback = (assignmentId, feedback) => {
    const all = get(KEYS.FEEDBACK).filter(f => f.assignmentId !== assignmentId);
    all.push({ assignmentId, feedback, savedAt: Date.now() });
    set(KEYS.FEEDBACK, all);
  };
  const getFeedback = assignmentId => {
    const rec = get(KEYS.FEEDBACK).find(f => f.assignmentId === assignmentId);
    return rec ? rec.feedback : null;
  };

  // ── Activity Log ─────────────────────────────
  const logActivity = (msg, type = 'info') => {
    const log = get(KEYS.ACTIVITY);
    log.unshift({ msg, type, ts: Date.now() });
    set(KEYS.ACTIVITY, log.slice(0, 50)); // keep last 50
  };
  const getActivity = () => get(KEYS.ACTIVITY);

  // ── Stats ────────────────────────────────────
  const getStats = () => {
    const assignments = getAssignments();
    const submissions = get(KEYS.SUBMISSIONS);
    const insights = get(KEYS.INSIGHTS);
    const feedback = get(KEYS.FEEDBACK);
    return {
      assignments: assignments.length,
      submissions: submissions.length,
      insights: insights.reduce((n, i) => n + (i.insights?.commonMistakes?.length || 0), 0),
      feedbackDrafts: feedback.length,
    };
  };

  // ── Seed demo data if empty ──────────────────
  const seedDemoData = () => {
    if (getAssignments().length > 0) return;

    const aId = 'demo-001';
    saveAssignment({
      id: aId,
      title: 'Data Structures — Midterm Q&A',
      subject: 'Computer Science',
      totalStudents: 32,
      createdAt: Date.now() - 86400000 * 2,
      questions: ['What is a linked list?', 'Explain time complexity of binary search.', 'What is a hash collision?'],
    });

    const demoSubmissions = [
      // Q1
      { id: 's1', assignmentId: aId, studentId: 'S01', question: 0, answer: 'A linked list is a sequence of nodes where each node points to the next.', score: 90 },
      { id: 's2', assignmentId: aId, studentId: 'S02', question: 0, answer: 'Linked list stores data in arrays', score: 40 },
      { id: 's3', assignmentId: aId, studentId: 'S03', question: 0, answer: 'It is a data structure with nodes connected by pointers.', score: 88 },
      { id: 's4', assignmentId: aId, studentId: 'S04', question: 0, answer: 'A linked list is like an array but elements are stored in random memory locations.', score: 65 },
      { id: 's5', assignmentId: aId, studentId: 'S05', question: 0, answer: 'Nodes with data and next pointer forming a chain.', score: 92 },
      { id: 's6', assignmentId: aId, studentId: 'S06', question: 0, answer: 'Linked lists store elements in memory directly without pointers', score: 35 },
      { id: 's7', assignmentId: aId, studentId: 'S07', question: 0, answer: 'A list of elements linked using pointers, first is head.', score: 85 },
      { id: 's8', assignmentId: aId, studentId: 'S08', question: 0, answer: 'It stores data in arrays and uses index to access', score: 30 },
      // Q2
      { id: 's9', assignmentId: aId, studentId: 'S01', question: 1, answer: 'Binary search has time complexity O(log n) because it halves the search space each step.', score: 95 },
      { id: 's10', assignmentId: aId, studentId: 'S02', question: 1, answer: 'Binary search is O(n) because it checks all elements', score: 20 },
      { id: 's11', assignmentId: aId, studentId: 'S03', question: 1, answer: 'O(log n) — each iteration halves the array.', score: 93 },
      { id: 's12', assignmentId: aId, studentId: 'S04', question: 1, answer: 'It is O(n log n) because sorting is required', score: 45 },
      { id: 's13', assignmentId: aId, studentId: 'S05', question: 1, answer: 'O(log n) complexity since we divide by 2 every time.', score: 91 },
      { id: 's14', assignmentId: aId, studentId: 'S06', question: 1, answer: 'O(n) time complexity searching through the list', score: 20 },
      { id: 's15', assignmentId: aId, studentId: 'S07', question: 1, answer: 'Binary search is O(log n) as it divides problem in half.', score: 90 },
      { id: 's16', assignmentId: aId, studentId: 'S08', question: 1, answer: 'O(n log n) because it sorts and searches', score: 40 },
      // Q3
      { id: 's17', assignmentId: aId, studentId: 'S01', question: 2, answer: 'A hash collision occurs when two keys hash to the same index.', score: 94 },
      { id: 's18', assignmentId: aId, studentId: 'S02', question: 2, answer: 'Collision is when the hash table is full', score: 25 },
      { id: 's19', assignmentId: aId, studentId: 'S03', question: 2, answer: 'When two different keys produce the same hash value, it is a collision.', score: 96 },
      { id: 's20', assignmentId: aId, studentId: 'S04', question: 2, answer: 'Collision means the key is not found in the table', score: 20 },
      { id: 's21', assignmentId: aId, studentId: 'S05', question: 2, answer: 'Two keys map to same bucket causing a collision, resolved by chaining or probing.', score: 98 },
      { id: 's22', assignmentId: aId, studentId: 'S06', question: 2, answer: 'Hash collision is when the algorithm crashes', score: 10 },
      { id: 's23', assignmentId: aId, studentId: 'S07', question: 2, answer: 'Same hash index for different keys; resolved by open addressing.', score: 90 },
      { id: 's24', assignmentId: aId, studentId: 'S08', question: 2, answer: 'When hash function returns error for duplicate key', score: 15 },
    ];
    saveSubmissions(demoSubmissions);
    logActivity('Demo data seeded — 8 students, 3 questions', 'success');
  };

  // ── Settings ─────────────────────────────────
  const saveSettings = settings => set(KEYS.SETTINGS, settings);
  const getSettings = () => {
    const s = localStorage.getItem(KEYS.SETTINGS);
    return s ? JSON.parse(s) : { geminiKey: '' };
  };

  return {
    KEYS,
    saveAssignment, getAssignments, deleteAssignment, updateAssignment,
    saveSubmissions, getSubmissions, clearSubmissions,
    saveInsights, getInsights,
    saveFeedback, getFeedback,
    logActivity, getActivity,
    getStats,
    getSettings, saveSettings,
    seedDemoData,
  };
})();
