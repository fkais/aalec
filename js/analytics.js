const SUPABASE_URL = "https://jdnlerckpwdngbhokbzi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_cqh6u1atYzGWMkKy83-lZg_cNu5Dnqr";
const VISITOR_KEY = "aalec_anonymous_visitor_id";
const SYNC_ID_KEY = "aalec_sync_identity";
const SYNC_CODE_KEY = "aalec_sync_code";
const DEMO_MODE_KEY = "cella_demo_mode";

const demoSubjects = [
    { id: "javaweb", name: "Java Web", status: "ready", question_count: 93, answered_count: 42, progress: 45.2 },
    { id: "os", name: "计算机组成原理", status: "reserved", question_count: 0, answered_count: 0, progress: 0 },
    { id: "bigdata", name: "大数据原理与应用", status: "ready", question_count: 177, answered_count: 68, progress: 38.4 },
    { id: "se", name: "软件工程", status: "ready", question_count: 78, answered_count: 31, progress: 39.7 }
];

const demoUsers = [
    { id: "demo-cella", is_current_user: true, mastered_count: 116, answered_count: 141, progress: 40.5 },
    { id: "quiet-orbit", is_current_user: false, mastered_count: 153, answered_count: 176, progress: 50.8 },
    { id: "soft-signal", is_current_user: false, mastered_count: 104, answered_count: 138, progress: 36.2 },
    { id: "night-spore", is_current_user: false, mastered_count: 87, answered_count: 121, progress: 29.4 },
    { id: "blue-membrane", is_current_user: false, mastered_count: 61, answered_count: 92, progress: 20.6 }
];

function isDemoMode() {
    return sessionStorage.getItem(DEMO_MODE_KEY) === "true";
}

function startDemoMode() {
    sessionStorage.setItem(DEMO_MODE_KEY, "true");
    return "demo-cella";
}

function supabaseHeaders() {
    return {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        "Content-Type": "application/json"
    };
}

async function callRpc(name, payload) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
        method: "POST",
        headers: supabaseHeaders(),
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`${name} 接口请求失败：${response.status}`);
    }
    return response.json();
}

function getAnonymousVisitorId() {
    if (isDemoMode()) return "demo-cella";
    const syncedId = localStorage.getItem(SYNC_ID_KEY);
    if (syncedId) return syncedId;

    let visitorId = localStorage.getItem(VISITOR_KEY);
    if (visitorId) return visitorId;

    visitorId = crypto.randomUUID
        ? crypto.randomUUID()
        : `visitor_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(VISITOR_KEY, visitorId);
    return visitorId;
}

async function hashSyncCode(syncCode) {
    const normalized = syncCode.trim().toLowerCase();
    const bytes = new TextEncoder().encode(`aalec-sync-v1:${normalized}`);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return `account_${Array.from(new Uint8Array(digest))
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("")}`;
}

async function setSyncIdentity(syncCode) {
    sessionStorage.removeItem(DEMO_MODE_KEY);
    const normalizedCode = syncCode.trim();
    const oldVisitorId = getAnonymousVisitorId();
    const newVisitorId = await hashSyncCode(normalizedCode);
    if (oldVisitorId !== newVisitorId) {
        await callRpc("claim_review_identity", {
            p_old_visitor_id: oldVisitorId,
            p_new_visitor_id: newVisitorId
        });
    }
    localStorage.setItem(SYNC_ID_KEY, newVisitorId);
    localStorage.setItem(SYNC_CODE_KEY, normalizedCode);
    return newVisitorId;
}

function hasSyncIdentity() {
    return isDemoMode() || Boolean(localStorage.getItem(SYNC_ID_KEY));
}

function getSyncCode() {
    if (isDemoMode()) return "演示中的 Cella";
    return localStorage.getItem(SYNC_CODE_KEY) || "";
}

async function trackQuizAnswer({ subject, questionId, questionType, correct }) {
    if (isDemoMode()) return;
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/quiz_events`, {
            method: "POST",
            headers: {
                apikey: SUPABASE_PUBLISHABLE_KEY,
                Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
                "Content-Type": "application/json",
                Prefer: "return=minimal"
            },
            body: JSON.stringify({
                visitor_id: getAnonymousVisitorId(),
                subject,
                question_id: questionId,
                question_type: questionType,
                correct
            })
        });

        if (!response.ok) {
            console.warn("答题统计写入失败：", response.status);
        }
    } catch (error) {
        console.warn("答题统计暂时不可用：", error);
    }
}

async function getQuizDashboard(subject = null) {
    if (isDemoMode()) {
        const selected = subject ? demoSubjects.find(item => item.id === subject) : null;
        const answered = selected ? selected.answered_count : 141;
        const mastered = selected ? Math.round(answered * 0.82) : 116;
        return {
            own: { rank: 2, correct_questions: mastered, answered_questions: answered, accuracy: 82.3 },
            participants: demoUsers.length,
            leaderboard: demoUsers
                .map((user, index) => ({
                    rank: index + 1,
                    anonymous_id: `CELL-${String(index + 1).padStart(2, "0")}`,
                    correct_questions: user.mastered_count,
                    answered_questions: user.answered_count,
                    accuracy: user.answered_count ? user.mastered_count / user.answered_count * 100 : 0,
                    is_me: user.is_current_user
                }))
                .sort((a, b) => b.correct_questions - a.correct_questions)
                .map((row, index) => ({ ...row, rank: index + 1 }))
        };
    }
    return callRpc("get_quiz_dashboard", {
        p_visitor_id: getAnonymousVisitorId(),
        p_subject: subject || null
    });
}

async function registerReviewUser() {
    if (isDemoMode()) return;
    return callRpc("register_review_user", {
        p_visitor_id: getAnonymousVisitorId()
    });
}

async function getReviewSubjects() {
    if (isDemoMode()) return demoSubjects;
    return callRpc("get_review_subjects", {
        p_visitor_id: getAnonymousVisitorId()
    });
}

async function getReviewUsers() {
    if (isDemoMode()) return demoUsers;
    return callRpc("get_review_users", {
        p_visitor_id: getAnonymousVisitorId()
    });
}

async function getCellPreference() {
    if (isDemoMode()) return { color_id: "sage" };
    return callRpc("get_review_cell_preference", {
        p_visitor_id: getAnonymousVisitorId()
    });
}

async function setCellPreference(colorId) {
    if (isDemoMode()) return { color_id: colorId };
    return callRpc("set_review_cell_preference", {
        p_visitor_id: getAnonymousVisitorId(),
        p_color_id: colorId
    });
}

async function getSubjectState(subject) {
    if (isDemoMode()) return [];
    return callRpc("get_subject_state", {
        p_visitor_id: getAnonymousVisitorId(),
        p_subject: subject
    });
}

async function resetSubjectProgress(subject) {
    if (isDemoMode()) return;
    return callRpc("reset_subject_progress", {
        p_visitor_id: getAnonymousVisitorId(),
        p_subject: subject
    });
}

window.quizAnalytics = {
    getVisitorId: getAnonymousVisitorId,
    startDemoMode,
    isDemoMode,
    setSyncIdentity,
    hasSyncIdentity,
    getSyncCode,
    trackAnswer: trackQuizAnswer,
    getDashboard: getQuizDashboard,
    registerReviewUser,
    getReviewSubjects,
    getReviewUsers,
    getCellPreference,
    setCellPreference,
    getSubjectState,
    resetSubjectProgress
};
