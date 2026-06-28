const localSubjectCatalog = [
    {
        id: "javaweb",
        name: "Java Web",
        status: "ready",
        questionCount: 93,
        anchor: [0.22, 0.28],
        types: [["all", "全部"], ["single", "单选"], ["judge", "判断"], ["blank", "填空"], ["short", "简答"]]
    },
    {
        id: "os",
        name: "计算机组成原理",
        status: "reserved",
        questionCount: 0,
        anchor: [0.77, 0.27],
        types: []
    },
    {
        id: "bigdata",
        name: "大数据原理与应用",
        status: "ready",
        questionCount: 177,
        anchor: [0.79, 0.70],
        types: [["all", "全部"], ["single", "单选"], ["multiple", "多选"], ["judge", "判断"], ["blank", "填空"]]
    },
    {
        id: "se",
        name: "软件工程",
        status: "ready",
        questionCount: 78,
        anchor: [0.22, 0.72],
        types: [["all", "全部"], ["single", "单选"], ["judge", "判断"], ["blank", "填空"], ["short", "简答"]]
    }
];

const reviewMap = {
    release: {
        version: "题库版本 v2.0.0",
        note: "新增科目联动进度、总体学习细胞、个人细胞配色与匿名排名。"
    },
    subjects: localSubjectCatalog.map(subject => ({ ...subject, answeredCount: 0, progress: 0 })),
    users: []
};

const network = document.getElementById("knowledgeNetwork");
const lineLayer = document.getElementById("networkLines");
const subjectLayer = document.getElementById("subjectNodes");
const typeLayer = document.getElementById("typeNodes");
const centerNode = document.querySelector('[data-node="center"]');
const dataState = document.getElementById("networkDataState");
const dataMessage = document.getElementById("networkDataMessage");
const retryButton = document.getElementById("networkRetryBtn");
const profileCellButton = document.getElementById("profileCellBtn");
const profileCellPanel = document.getElementById("profileCellPanel");
const beakerCells = document.getElementById("beakerCells");
const overallProgressCells = document.getElementById("overallProgressCells");
const libraryUpdateCard = document.getElementById("libraryUpdateCard");
const libraryUpdateToggle = document.getElementById("libraryUpdateToggle");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const cellPalette = [
    { id: "slate", name: "雾蓝", color: "#7594a3", fill: "#c9d7dc" },
    { id: "ink", name: "深海", color: "#536f80", fill: "#b8c9d0" },
    { id: "cloud", name: "云灰", color: "#8ca1aa", fill: "#d5dee1" },
    { id: "lavender", name: "灰紫", color: "#777d9a", fill: "#c9cad8" },
    { id: "clay", name: "陶蓝", color: "#6f8794", fill: "#c1d0d5" },
    { id: "denim", name: "靛灰", color: "#5e788e", fill: "#bdcbd5" },
    { id: "sage", name: "鼠尾草", color: "#778d84", fill: "#c9d5cf" },
    { id: "mauve", name: "灰粉", color: "#927d87", fill: "#d9cbd1" },
    { id: "sand", name: "沙灰", color: "#948b7d", fill: "#d9d3c8" },
    { id: "plum", name: "灰梅", color: "#7f7184", fill: "#d0c7d2" },
    { id: "steel", name: "钢蓝", color: "#617f87", fill: "#bfd0d3" },
    { id: "mist", name: "浅雾", color: "#9aa7a9", fill: "#dde3e2" }
];

let subjectNodes = [];
let activeSubject = null;
let frameId = null;
let layoutState = [];
let currentCellColorId = cellPalette[0].id;
let progressSubjectId = "all";
let libraryUpdateTimer = null;

function localAnsweredCount(subjectId) {
    try {
        const answers = JSON.parse(localStorage.getItem(`quiz_${subjectId}_answered`) || "{}");
        return Object.keys(answers).length;
    } catch {
        return 0;
    }
}

function localSubjects() {
    return localSubjectCatalog.map(subject => {
        const answeredCount = Math.min(localAnsweredCount(subject.id), subject.questionCount);
        return {
            ...subject,
            answeredCount,
            progress: subject.questionCount ? Math.round(answeredCount / subject.questionCount * 100) : 0
        };
    });
}

function currentUserFallback() {
    const subjects = localSubjects();
    const masteredCount = subjects.reduce((sum, subject) => sum + subject.answeredCount, 0);
    const questionCount = subjects.reduce((sum, subject) => sum + subject.questionCount, 0);
    return [{
        id: window.quizAnalytics?.getVisitorId() || "local-user",
        isCurrentUser: true,
        masteredCount,
        answeredCount: masteredCount,
        progress: questionCount ? masteredCount / questionCount * 100 : 0
    }];
}

function normalizeSubjects(rows) {
    const byId = new Map((rows || []).map(row => [row.id || row.subject_id, row]));
    return localSubjectCatalog.map(subject => {
        const row = byId.get(subject.id) || {};
        const questionCount = Number(row.question_count ?? row.questionCount ?? subject.questionCount);
        const answeredCount = Math.min(
            Number(row.answered_count ?? row.answeredCount ?? localAnsweredCount(subject.id)),
            questionCount
        );
        return {
            ...subject,
            name: row.name || subject.name,
            status: row.status || subject.status,
            questionCount,
            answeredCount,
            progress: questionCount ? Math.round(answeredCount / questionCount * 100) : 0
        };
    });
}

function normalizeUsers(rows) {
    return (rows || []).map(row => ({
        id: String(row.id || row.user_id || row.visitor_id),
        isCurrentUser: Boolean(row.is_current_user ?? row.isCurrentUser),
        masteredCount: Number(row.mastered_count ?? row.masteredCount ?? 0),
        answeredCount: Number(row.answered_count ?? row.answeredCount ?? 0),
        progress: Number(row.progress ?? 0)
    })).filter(user => user.id);
}

function setDataState(message = "", canRetry = false) {
    dataState.hidden = !message;
    dataMessage.textContent = message;
    retryButton.hidden = !canRetry;
}

async function loadNetworkData() {
    setDataState("正在同步复习进度…");

    if (!window.quizAnalytics) {
        reviewMap.subjects = localSubjects();
        reviewMap.users = currentUserFallback();
        renderDataLayers();
        setDataState("暂时使用本机进度", true);
        return;
    }

    try {
        await window.quizAnalytics.registerReviewUser();
        const [subjects, users, cellPreference] = await Promise.all([
            window.quizAnalytics.getReviewSubjects(),
            window.quizAnalytics.getReviewUsers(),
            window.quizAnalytics.getCellPreference().catch(error => {
                console.warn("细胞颜色同步接口暂不可用：", error);
                return { color_id: cellPalette[0].id };
            })
        ]);
        reviewMap.subjects = normalizeSubjects(subjects);
        reviewMap.users = normalizeUsers(users);
        if (cellPalette.some(color => color.id === cellPreference?.color_id)) {
            currentCellColorId = cellPreference.color_id;
        }
        if (!reviewMap.users.some(user => user.isCurrentUser)) {
            reviewMap.users.push(...currentUserFallback());
        }
        renderDataLayers();
        setDataState("");
    } catch (error) {
        console.warn("知识网络接口暂时不可用：", error);
        reviewMap.subjects = localSubjects();
        reviewMap.users = currentUserFallback();
        renderDataLayers();
        setDataState("同步失败，当前显示本机进度", true);
    }
}

function renderDataLayers() {
    renderSubjectNodes();
    renderBeakerCells();
    renderOverallProgress();
    renderProfileData();
    renderHabitatMessage();
    seedMotion();
    placeStaticLayout();
    restartAnimation();
}

function renderHabitatMessage() {
    const message = document.getElementById("habitatMessage");
    if (!message) return;
    const companions = Math.max(0, reviewMap.users.length - 1);
    message.textContent = companions
        ? `此刻还有 ${companions} 颗细胞与你共享这片培养液。`
        : "这里很安静，但你的 Cella 仍在等你回来。";
}

function renderSubjectNodes() {
    subjectLayer.innerHTML = reviewMap.subjects.map(subject => {
        const reserved = subject.status === "reserved";
        return `
            <button class="study-node subject-node ${reserved ? "is-reserved" : "is-ready"}"
                data-node="${subject.id}" data-subject="${subject.id}" type="button"
                ${reserved ? 'aria-label="' + subject.name + '，题库预留"' : 'aria-label="' + subject.name + '，' + subject.questionCount + '题，已完成' + subject.progress + '%"'}>
                <span>${subject.name}</span>
                <small>${reserved ? "题库预留" : `${subject.questionCount} 题`}</small>
            </button>
        `;
    }).join("");

    subjectNodes = Array.from(subjectLayer.querySelectorAll(".subject-node"));
    subjectNodes.forEach(node => node.addEventListener("click", () => openSubject(node.dataset.subject)));
}

function shortAnonymousId(visitorId) {
    return `A-${String(visitorId || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`;
}

function getCurrentCellColor() {
    return cellPalette.find(item => item.id === currentCellColorId) || cellPalette[0];
}

function currentCellStyle() {
    const color = getCurrentCellColor();
    return `;--cell-color:${color.color};--cell-fill:${color.fill}`;
}

function renderBeakerCells() {
    if (!beakerCells) return;
    const users = [...reviewMap.users]
        .sort((a, b) => b.progress - a.progress)
        .slice(0, 16);
    beakerCells.innerHTML = users.map((user, index) => {
        const size = Math.round(15 + Math.min(100, Math.max(0, user.progress)) * 0.16);
        const column = index % 5;
        const row = Math.floor(index / 5);
        const left = 14 + column * 18 + (row % 2) * 5;
        const bottom = 8 + row * 18;
        return `<span class="beaker-cell cell-tone-${index % 6} ${user.isCurrentUser ? "is-current-user" : ""}"
            style="--beaker-cell-size:${size}px;left:${left}%;bottom:${bottom}px${user.isCurrentUser ? currentCellStyle() : ""}"></span>`;
    }).join("");
}

function progressData(subjectId = "all") {
    const readySubjects = reviewMap.subjects.filter(subject => subject.status === "ready");
    const selected = subjectId === "all"
        ? readySubjects
        : readySubjects.filter(subject => subject.id === subjectId);
    const answered = selected.reduce((sum, subject) => sum + subject.answeredCount, 0);
    const total = selected.reduce((sum, subject) => sum + subject.questionCount, 0);
    const percent = total ? Math.round(answered / total * 100) : 0;
    const label = subjectId === "all"
        ? "共同生长"
        : readySubjects.find(subject => subject.id === subjectId)?.name || "总览";
    return { answered, total, percent, label };
}

function renderOverallProgress() {
    if (!overallProgressCells) return;
    const { answered, total, percent, label } = progressData(progressSubjectId);
    document.getElementById("overallProgressLabel").textContent = label;
    document.getElementById("overallProgressCount").textContent = `${answered} / ${total}`;
    document.getElementById("overallProgressPercent").textContent = `${percent}%`;

    const dotCount = Math.min(180, Math.max(72, total));
    const filledCount = total ? Math.round(answered / total * dotCount) : 0;
    overallProgressCells.innerHTML = Array.from({ length: dotCount }, (_, index) => `
        <span class="${index < filledCount ? "is-filled" : ""}"
            style="--dot-delay:${(index % 9) * -0.17}s;--dot-tone:${index % 4}"></span>
    `).join("");
}

function setProgressSubject(subjectId) {
    progressSubjectId = subjectId;
    renderOverallProgress();
}

function setLibraryUpdateOpen(open) {
    libraryUpdateCard.classList.toggle("is-open", open);
    libraryUpdateToggle.setAttribute("aria-expanded", String(open));
    if (libraryUpdateTimer) clearTimeout(libraryUpdateTimer);
    if (open) {
        libraryUpdateTimer = setTimeout(() => setLibraryUpdateOpen(false), 4500);
    }
}

function initLibraryUpdate() {
    libraryUpdateToggle.addEventListener("click", () => {
        setLibraryUpdateOpen(!libraryUpdateCard.classList.contains("is-open"));
    });
    setLibraryUpdateOpen(true);
}

function renderProfileData() {
    const visitorId = window.quizAnalytics?.getVisitorId() || "local-user";
    document.getElementById("profileAnonymousId").textContent = shortAnonymousId(visitorId);
    document.getElementById("profileSyncCode").textContent = window.quizAnalytics?.getSyncCode() || "未设置";

    const selectedColor = getCurrentCellColor();
    document.getElementById("cellColorOptions").innerHTML = cellPalette.map(color => `
        <button class="cell-color-option ${color.id === selectedColor.id ? "is-selected" : ""}"
            type="button" data-cell-color="${color.id}" aria-label="${color.name}"
            aria-pressed="${color.id === selectedColor.id}"
            style="--option-color:${color.color};--option-fill:${color.fill}">
            <span aria-hidden="true"></span>
        </button>
    `).join("");

    const rankedUsers = [...reviewMap.users]
        .sort((a, b) => b.masteredCount - a.masteredCount || b.answeredCount - a.answeredCount);
    const rankingList = document.getElementById("profileRankingList");
    rankingList.innerHTML = rankedUsers.length ? rankedUsers.slice(0, 8).map((user, index) => `
        <li class="${user.isCurrentUser ? "is-current-user" : ""}">
            <span class="ranking-position">${index + 1}</span>
            <span>${user.isCurrentUser ? "我" : shortAnonymousId(user.id)}</span>
            <strong>${user.masteredCount} 题</strong>
        </li>
    `).join("") : "<li class=\"ranking-empty\">暂无排名数据</li>";
}

async function applyCurrentCellColor(colorId, trigger) {
    const color = cellPalette.find(item => item.id === colorId);
    if (!color) return;
    const previousColorId = currentCellColorId;
    currentCellColorId = color.id;
    document.querySelectorAll(".beaker-cell.is-current-user, .profile-cell-btn")
        .forEach(node => {
            node.style.setProperty("--cell-color", color.color);
            node.style.setProperty("--cell-fill", color.fill);
        });
    document.querySelectorAll(".cell-color-option").forEach(option => {
        const selected = option.dataset.cellColor === color.id;
        option.classList.toggle("is-selected", selected);
        option.setAttribute("aria-pressed", String(selected));
    });

    if (trigger) trigger.disabled = true;
    try {
        await window.quizAnalytics.setCellPreference(color.id);
    } catch (error) {
        console.warn("细胞颜色同步失败：", error);
        currentCellColorId = previousColorId;
        const previous = getCurrentCellColor();
        document.querySelectorAll(".beaker-cell.is-current-user, .profile-cell-btn")
            .forEach(node => {
                node.style.setProperty("--cell-color", previous.color);
                node.style.setProperty("--cell-fill", previous.fill);
            });
        renderProfileData();
        alert("颜色同步失败，请先在 Supabase 执行 cell-preferences-migration.sql。");
    } finally {
        if (trigger) trigger.disabled = false;
    }
}

function setProfileTab(tabName) {
    document.querySelectorAll("[data-profile-tab]").forEach(tab => {
        const active = tab.dataset.profileTab === tabName;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll("[data-profile-panel]").forEach(panel => {
        const active = panel.dataset.profilePanel === tabName;
        panel.classList.toggle("is-active", active);
        panel.hidden = !active;
    });
}

function closeProfilePanel() {
    profileCellPanel.hidden = true;
    profileCellButton.setAttribute("aria-expanded", "false");
}

function initProfileCellMenu() {
    const color = getCurrentCellColor();
    profileCellButton.style.setProperty("--cell-color", color.color);
    profileCellButton.style.setProperty("--cell-fill", color.fill);

    profileCellButton.addEventListener("click", event => {
        event.stopPropagation();
        const opening = profileCellPanel.hidden;
        profileCellPanel.hidden = !opening;
        profileCellButton.setAttribute("aria-expanded", String(opening));
        if (opening) renderProfileData();
    });
    profileCellPanel.addEventListener("click", event => {
        event.stopPropagation();
        const tab = event.target.closest("[data-profile-tab]");
        if (tab) setProfileTab(tab.dataset.profileTab);
        const colorOption = event.target.closest("[data-cell-color]");
        if (colorOption) applyCurrentCellColor(colorOption.dataset.cellColor, colorOption);
    });
    document.addEventListener("click", closeProfilePanel);
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeProfilePanel();
    });
}

function seedMotion() {
    const allNodes = [centerNode, ...subjectNodes];
    layoutState = allNodes.map((node, index) => {
        const subject = index ? reviewMap.subjects[index - 1] : null;
        const anchor = subject ? subject.anchor : [0.5, 0.5];
        return {
            node,
            subject,
            anchorX: anchor[0],
            anchorY: anchor[1],
            x: 0,
            y: 0,
            amplitudeX: 6 + (index * 1.7) % 5,
            amplitudeY: 6 + (index * 2.3) % 5,
            speedX: 0.00090 + index * 0.000055,
            speedY: 0.00078 + index * 0.000061,
            phaseX: index * 1.31,
            phaseY: index * 0.83 + 0.6
        };
    });

}

function openSubject(subjectId) {
    const subject = reviewMap.subjects.find(item => item.id === subjectId);
    if (!subject || subject.status === "reserved") return;

    if (activeSubject === subjectId) {
        window.location.href = `quiz.html?subject=${subjectId}`;
        return;
    }

    activeSubject = subjectId;
    setProgressSubject(subjectId);
    subjectNodes.forEach(node => node.classList.toggle("is-active", node.dataset.subject === subjectId));
    typeLayer.innerHTML = subject.types.map(([type, label], index) =>
        `<a class="type-node type-shape-${index % 5}" href="quiz.html?subject=${subjectId}&type=${type}"
            style="--type-phase:${index * 1.2}">${label}</a>`
    ).join("");
}

function placeStaticLayout() {
    const rect = network.getBoundingClientRect();
    layoutState.forEach(state => {
        state.x = state.anchorX * rect.width;
        state.y = state.anchorY * rect.height;
        state.node.style.left = `${state.x}px`;
        state.node.style.top = `${state.y}px`;
    });
    resolveNodeCollisions(rect);
    positionTypeNodes(rect);
    drawLines(rect);
}

function resolveNodeCollisions(rect) {
    const padding = rect.width < 720 ? 8 : 18;
    const topSafe = rect.width < 720 ? 100 : 112;
    const bottomSafe = rect.width < 720 ? 188 : 190;

    for (let pass = 0; pass < 4; pass += 1) {
        for (let i = 0; i < layoutState.length; i += 1) {
            const a = layoutState[i];
            const aw = a.node.offsetWidth / 2 + padding;
            const ah = a.node.offsetHeight / 2 + padding;

            a.x = Math.max(aw, Math.min(rect.width - aw, a.x));
            a.y = Math.max(topSafe + ah, Math.min(rect.height - bottomSafe - ah, a.y));

            for (let j = i + 1; j < layoutState.length; j += 1) {
                const b = layoutState[j];
                separateRectangles(a, b, aw, ah, b.node.offsetWidth / 2 + padding, b.node.offsetHeight / 2 + padding);
            }
        }
    }

    layoutState.forEach(state => {
        state.node.style.left = `${state.x}px`;
        state.node.style.top = `${state.y}px`;
    });
}

function separateRectangles(a, b, aw, ah, bw, bh) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const overlapX = aw + bw - Math.abs(dx);
    const overlapY = ah + bh - Math.abs(dy);
    if (overlapX <= 0 || overlapY <= 0) return;

    if (overlapX < overlapY) {
        const push = overlapX / 2 + 0.5;
        const direction = dx >= 0 ? 1 : -1;
        a.x -= push * direction;
        b.x += push * direction;
    } else {
        const push = overlapY / 2 + 0.5;
        const direction = dy >= 0 ? 1 : -1;
        a.y -= push * direction;
        b.y += push * direction;
    }
}

function ellipseEdge(from, to, node) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const rx = Math.max(1, node.offsetWidth / 2);
    const ry = Math.max(1, node.offsetHeight / 2);
    const scale = 1 / Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
    return { x: from.x + dx * scale, y: from.y + dy * scale };
}

function createLine(start, end, className) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", start.x);
    line.setAttribute("y1", start.y);
    line.setAttribute("x2", end.x);
    line.setAttribute("y2", end.y);
    line.setAttribute("class", className);
    lineLayer.appendChild(line);
}

function drawLines(rect) {
    lineLayer.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
    lineLayer.innerHTML = "";
    const center = layoutState[0];
    if (!center) return;

    layoutState.slice(1).forEach(state => {
        const start = ellipseEdge(center, state, center.node);
        const end = ellipseEdge(state, center, state.node);
        const kind = state.subject.status === "reserved" ? "is-reserved" : "is-ready";
        const active = state.subject.id === activeSubject ? " is-active" : "";
        createLine(start, end, `network-connection ${kind}${active}`);
    });

    if (!activeSubject) return;
    const subjectState = layoutState.find(state => state.subject?.id === activeSubject);
    Array.from(typeLayer.querySelectorAll(".type-node")).forEach(node => {
        const nodeRect = node.getBoundingClientRect();
        const point = {
            x: nodeRect.left - rect.left + nodeRect.width / 2,
            y: nodeRect.top - rect.top + nodeRect.height / 2
        };
        const start = ellipseEdge(subjectState, point, subjectState.node);
        createLine(start, point, "network-connection type-connection is-ready");
    });
}

function positionTypeNodes(rect) {
    if (!activeSubject) return;
    const subjectState = layoutState.find(state => state.subject?.id === activeSubject);
    const nodes = Array.from(typeLayer.querySelectorAll(".type-node"));
    const compact = rect.width < 720;
    const radius = compact ? 108 : 142;
    const pointsLeft = subjectState.x > rect.width / 2;
    const startAngle = pointsLeft ? 2.2 : -0.95;
    const span = compact ? 1.3 : 1.55;

    nodes.forEach((node, index) => {
        const angle = startAngle + (nodes.length === 1 ? 0 : index * span / (nodes.length - 1));
        const time = performance.now();
        const driftX = reducedMotionQuery.matches ? 0 : Math.sin(time * 0.00072 + index * 1.27) * 7;
        const driftY = reducedMotionQuery.matches ? 0 : Math.cos(time * 0.00061 + index * 0.94) * 6;
        node.style.left = `${subjectState.x + Math.cos(angle) * radius + driftX}px`;
        node.style.top = `${subjectState.y + Math.sin(angle) * radius + driftY}px`;
    });
}

function animate(time) {
    const rect = network.getBoundingClientRect();
    const reduceMotion = reducedMotionQuery.matches;

    layoutState.forEach(state => {
        const baseX = state.anchorX * rect.width;
        const baseY = state.anchorY * rect.height;
        state.x = baseX + (reduceMotion ? 0 : Math.sin(time * state.speedX + state.phaseX) * state.amplitudeX);
        state.y = baseY + (reduceMotion ? 0 : Math.cos(time * state.speedY + state.phaseY) * state.amplitudeY);
    });

    resolveNodeCollisions(rect);
    positionTypeNodes(rect);
    drawLines(rect);
    frameId = reduceMotion ? null : requestAnimationFrame(animate);
}

function restartAnimation() {
    if (frameId) cancelAnimationFrame(frameId);
    if (document.body.classList.contains("locked")) return;
    frameId = requestAnimationFrame(animate);
}

centerNode.addEventListener("click", () => {
    activeSubject = null;
    setProgressSubject("all");
    typeLayer.innerHTML = "";
    subjectNodes.forEach(node => node.classList.remove("is-active"));
});
retryButton.addEventListener("click", loadNetworkData);

initProfileCellMenu();
initLibraryUpdate();
document.getElementById("libraryVersion").textContent = reviewMap.release.version;
document.getElementById("libraryUpdate").textContent = reviewMap.release.note;
renderDataLayers();
window.accessReady.then(loadNetworkData);

window.addEventListener("resize", restartAnimation);
reducedMotionQuery.addEventListener("change", restartAnimation);

const accessObserver = new MutationObserver(() => {
    if (!document.body.classList.contains("locked")) {
        seedMotion();
        placeStaticLayout();
        restartAnimation();
    }
});
accessObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
