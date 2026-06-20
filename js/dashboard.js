async function loadDashboard() {
    const loading = document.getElementById("dashboardLoading");
    const errorBox = document.getElementById("dashboardError");
    const content = document.getElementById("dashboardContent");
    const subject = document.getElementById("dashboardSubject").value || null;

    loading.hidden = false;
    errorBox.hidden = true;
    content.hidden = true;

    try {
        const data = await window.quizAnalytics.getDashboard(subject);
        renderDashboard(data);
        loading.hidden = true;
        content.hidden = false;
    } catch (error) {
        loading.hidden = true;
        errorBox.hidden = false;
        errorBox.textContent = `${error.message}。请先在 Supabase SQL Editor 运行 supabase-stats-v2.sql。`;
    }
}

function renderDashboard(data) {
    const own = data.own || {};
    document.getElementById("ownRank").textContent = own.rank ? `#${own.rank}` : "-";
    document.getElementById("participantCount").textContent = data.participants || 0;
    document.getElementById("correctQuestions").textContent = own.correct_questions || 0;
    document.getElementById("ownAccuracy").textContent = `${Number(own.accuracy || 0).toFixed(1)}%`;
    renderLeaderboard(data.leaderboard || []);
}

function renderLeaderboard(rows) {
    const body = document.getElementById("leaderboardBody");
    if (!rows.length) {
        body.innerHTML = `<tr><td colspan="5" class="empty-table">完成答题后，这里会出现匿名排行。</td></tr>`;
        return;
    }

    body.innerHTML = rows.map(row => `
        <tr class="${row.is_me ? "is-me" : ""}">
            <td>#${row.rank}</td>
            <td>${escapeDashboardHtml(row.anonymous_id)}${row.is_me ? "（我）" : ""}</td>
            <td>${row.correct_questions}</td>
            <td>${row.answered_questions}</td>
            <td>${Number(row.accuracy || 0).toFixed(1)}%</td>
        </tr>
    `).join("");
}

function escapeDashboardHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#039;"
    }[char]));
}

document.getElementById("dashboardSubject").addEventListener("change", loadDashboard);
window.accessReady.then(() => {
    loadDashboard();
});
