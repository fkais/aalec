const SUPABASE_URL = "https://jdnlerckpwdngbhokbzi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_cqh6u1atYzGWMkKy83-lZg_cNu5Dnqr";
const VISITOR_KEY = "aalec_anonymous_visitor_id";
const SYNC_ID_KEY = "aalec_sync_identity";

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
    const oldVisitorId = getAnonymousVisitorId();
    const newVisitorId = await hashSyncCode(syncCode);
    if (oldVisitorId !== newVisitorId) {
        await callRpc("claim_review_identity", {
            p_old_visitor_id: oldVisitorId,
            p_new_visitor_id: newVisitorId
        });
    }
    localStorage.setItem(SYNC_ID_KEY, newVisitorId);
    return newVisitorId;
}

function hasSyncIdentity() {
    return Boolean(localStorage.getItem(SYNC_ID_KEY));
}

async function trackQuizAnswer({ subject, questionId, questionType, correct }) {
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
    return callRpc("get_quiz_dashboard", {
        p_visitor_id: getAnonymousVisitorId(),
        p_subject: subject || null
    });
}

async function registerReviewUser() {
    return callRpc("register_review_user", {
        p_visitor_id: getAnonymousVisitorId()
    });
}

async function getReviewSubjects() {
    return callRpc("get_review_subjects", {
        p_visitor_id: getAnonymousVisitorId()
    });
}

async function getReviewUsers() {
    return callRpc("get_review_users", {
        p_visitor_id: getAnonymousVisitorId()
    });
}

async function getSubjectState(subject) {
    return callRpc("get_subject_state", {
        p_visitor_id: getAnonymousVisitorId(),
        p_subject: subject
    });
}

async function resetSubjectProgress(subject) {
    return callRpc("reset_subject_progress", {
        p_visitor_id: getAnonymousVisitorId(),
        p_subject: subject
    });
}

window.quizAnalytics = {
    getVisitorId: getAnonymousVisitorId,
    setSyncIdentity,
    hasSyncIdentity,
    trackAnswer: trackQuizAnswer,
    getDashboard: getQuizDashboard,
    registerReviewUser,
    getReviewSubjects,
    getReviewUsers,
    getSubjectState,
    resetSubjectProgress
};
