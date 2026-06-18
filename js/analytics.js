const SUPABASE_URL = "https://jdnlerckpwdngbhokbzi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_cqh6u1atYzGWMkKy83-lZg_cNu5Dnqr";
const VISITOR_KEY = "aalec_anonymous_visitor_id";

function getAnonymousVisitorId() {
    let visitorId = localStorage.getItem(VISITOR_KEY);
    if (visitorId) return visitorId;

    visitorId = crypto.randomUUID
        ? crypto.randomUUID()
        : `visitor_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(VISITOR_KEY, visitorId);
    return visitorId;
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
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_quiz_dashboard`, {
        method: "POST",
        headers: {
            apikey: SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            p_visitor_id: getAnonymousVisitorId(),
            p_subject: subject || null
        })
    });

    if (!response.ok) {
        throw new Error(`统计数据读取失败：${response.status}`);
    }
    return response.json();
}

window.quizAnalytics = {
    getVisitorId: getAnonymousVisitorId,
    trackAnswer: trackQuizAnswer,
    getDashboard: getQuizDashboard
};
