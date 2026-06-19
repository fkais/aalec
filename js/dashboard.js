const dashboardTypeNames = {
    single: "选择题",
    judge: "判断题",
    blank: "填空题",
    short: "简答题",
    multiple: "多选题",
    unknown: "其他题型"
};

let roseChart;

function shortAnonymousId(visitorId) {
    return `A-${String(visitorId).replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`;
}

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
    document.getElementById("anonymousId").textContent = data.anonymous_id || shortAnonymousId(window.quizAnalytics.getVisitorId());
    document.getElementById("ownRank").textContent = own.rank ? `#${own.rank}` : "-";
    document.getElementById("participantCount").textContent = data.participants || 0;
    document.getElementById("correctQuestions").textContent = own.correct_questions || 0;
    document.getElementById("ownAccuracy").textContent = `${Number(own.accuracy || 0).toFixed(1)}%`;
    renderRoseChart(data.type_stats || []);
    renderLeaderboard(data.leaderboard || []);
}

function renderRoseChart(stats) {
    const chartNode = document.getElementById("roseChart");
    if (!roseChart) roseChart = echarts.init(chartNode);

    const order = ["single", "judge", "blank", "short", "multiple", "unknown"];
    const statMap = new Map(stats.map(item => [item.type, item]));
    const chartData = order
        .filter(type => statMap.has(type))
        .map(type => {
            const item = statMap.get(type);
            return {
                name: dashboardTypeNames[type] || type,
                value: Number(item.accuracy || 0),
                attempts: item.attempts || 0
            };
        });

    if (!chartData.length) {
        chartData.push({ name: "暂无作答", value: 1, attempts: 0, itemStyle: { color: "#d8e6f2" } });
    }

    roseChart.setOption({
        color: ["#1677c8", "#3195d2", "#4b6fc2", "#1e9aaa", "#6d75cf", "#75a8ca"],
        tooltip: {
            trigger: "item",
            formatter: params => params.data.attempts
                ? `${params.name}<br>正确率：${params.value}%<br>作答：${params.data.attempts} 次`
                : "完成答题后生成题型统计"
        },
        legend: {
            bottom: 0,
            textStyle: { color: "#36546b" }
        },
        series: [{
            type: "pie",
            roseType: "radius",
            radius: ["18%", "72%"],
            center: ["50%", "45%"],
            minAngle: 12,
            itemStyle: {
                borderRadius: 6,
                borderColor: "#f4f8fc",
                borderWidth: 3
            },
            label: {
                color: "#172a3a",
                formatter: params => params.data.attempts ? `${params.name}\n${params.value}%` : params.name
            },
            data: chartData
        }]
    });
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

window.addEventListener("resize", () => roseChart?.resize());
document.getElementById("dashboardSubject").addEventListener("change", loadDashboard);
document.getElementById("anonymousId").textContent = shortAnonymousId(window.quizAnalytics.getVisitorId());
window.accessReady.then(() => {
    document.getElementById("anonymousId").textContent = shortAnonymousId(window.quizAnalytics.getVisitorId());
    loadDashboard();
});
