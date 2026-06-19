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
    deadline: "2026-06-30T09:00:00+08:00",
    release: {
        version: "题库版本 v1.7.0",
        note: "本次更新：科目进度与用户地图接入数据接口；自己的细胞可拖动并自动回轨。"
    },
    subjects: localSubjectCatalog.map(subject => ({ ...subject, answeredCount: 0, progress: 0 })),
    users: []
};

const network = document.getElementById("knowledgeNetwork");
const lineLayer = document.getElementById("networkLines");
const subjectLayer = document.getElementById("subjectNodes");
const userLayer = document.getElementById("userCells");
const typeLayer = document.getElementById("typeNodes");
const centerNode = document.querySelector('[data-node="center"]');
const dataState = document.getElementById("networkDataState");
const dataMessage = document.getElementById("networkDataMessage");
const retryButton = document.getElementById("networkRetryBtn");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

let subjectNodes = [];
let userCells = [];
let activeSubject = null;
let frameId = null;
let layoutState = [];
let userState = [];
let dragState = null;

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
    return [{
        id: window.quizAnalytics?.getVisitorId() || "local-user",
        isCurrentUser: true
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
        isCurrentUser: Boolean(row.is_current_user ?? row.isCurrentUser)
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
        const [subjects, users] = await Promise.all([
            window.quizAnalytics.getReviewSubjects(),
            window.quizAnalytics.getReviewUsers()
        ]);
        reviewMap.subjects = normalizeSubjects(subjects);
        reviewMap.users = normalizeUsers(users);
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
    renderUserCells();
    seedMotion();
    placeStaticLayout();
    restartAnimation();
}

function renderSubjectNodes() {
    subjectLayer.innerHTML = reviewMap.subjects.map(subject => {
        const reserved = subject.status === "reserved";
        return `
            <button class="study-node subject-node ${reserved ? "is-reserved" : "is-ready"}"
                data-node="${subject.id}" data-subject="${subject.id}" type="button"
                ${reserved ? 'aria-label="' + subject.name + '，题库预留"' : 'aria-label="' + subject.name + '，' + subject.questionCount + '题，已完成' + subject.progress + '%"'}>
                <span>${subject.name}</span>
                <small>${reserved ? "题库预留" : `${subject.questionCount} 题 · 已刷 ${subject.answeredCount}`}</small>
                ${reserved ? "" : `
                    <span class="node-progress" aria-hidden="true">
                        <i style="width:${subject.progress}%"></i>
                    </span>
                `}
            </button>
        `;
    }).join("");

    subjectNodes = Array.from(subjectLayer.querySelectorAll(".subject-node"));
    subjectNodes.forEach(node => node.addEventListener("click", () => openSubject(node.dataset.subject)));
}

function renderUserCells() {
    userLayer.innerHTML = reviewMap.users.map((user, index) => `
        <button class="user-cell ${user.isCurrentUser ? "is-current-user" : ""}"
            data-user-index="${index}" type="button"
            aria-label="${user.isCurrentUser ? "当前用户，可拖动" : "复习用户"}"
            ${user.isCurrentUser ? "" : 'tabindex="-1"'}>
        </button>
    `).join("");
    userCells = Array.from(userLayer.querySelectorAll(".user-cell"));
    bindCellDrag();
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

    userState = userCells.map((node, index) => {
        const user = reviewMap.users[index];
        const ring = Math.floor(index / 10);
        return {
            node,
            user,
            x: 0,
            y: 0,
            orbitX: 0,
            orbitY: 0,
            angleOffset: index * 2.39996,
            radiusX: 250 + ring * 46 + (index % 3) * 12,
            radiusY: 170 + ring * 32 + (index % 4) * 8,
            speed: 0.000055 + (index % 7) * 0.000004,
            direction: index % 2 ? 1 : -1,
            dragging: false,
            returning: false,
            returnStartedAt: 0,
            returnFromX: 0,
            returnFromY: 0
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
    subjectNodes.forEach(node => node.classList.toggle("is-active", node.dataset.subject === subjectId));
    typeLayer.innerHTML = subject.types.map(([type, label]) =>
        `<a class="type-node" href="quiz.html?subject=${subjectId}&type=${type}">${label}</a>`
    ).join("");
}

function updateCountdown() {
    const target = new Date(reviewMap.deadline).getTime();
    const days = Math.max(0, Math.ceil((target - Date.now()) / 86400000));
    const countdown = document.getElementById("examCountdown");
    countdown.textContent = days ? `期末周倒计时 ${days} 天` : "期末周进行中";
    countdown.setAttribute("datetime", reviewMap.deadline);
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
    positionUserCells(0, rect, true);
    positionTypeNodes(rect);
    drawLines(rect);
}

function resolveNodeCollisions(rect) {
    const padding = rect.width < 720 ? 8 : 18;
    const topSafe = rect.width < 720 ? 100 : 112;
    const bottomSafe = rect.width < 720 ? 94 : 82;

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

function positionUserCells(time, rect, staticOnly = false) {
    const center = layoutState[0] || { x: rect.width / 2, y: rect.height / 2 };
    const reduceMotion = reducedMotionQuery.matches;

    userState.forEach((state, index) => {
        const angle = state.angleOffset + (reduceMotion || staticOnly ? 0 : time * state.speed * state.direction);
        state.orbitX = center.x + Math.cos(angle) * Math.min(state.radiusX, rect.width * 0.36);
        state.orbitY = center.y + Math.sin(angle) * Math.min(state.radiusY, rect.height * 0.30);

        if (!state.dragging) {
            if (state.returning) {
                const elapsed = Math.min(1, (time - state.returnStartedAt) / 720);
                const eased = 1 - Math.pow(1 - elapsed, 3);
                state.x = state.returnFromX + (state.orbitX - state.returnFromX) * eased;
                state.y = state.returnFromY + (state.orbitY - state.returnFromY) * eased;
                if (elapsed >= 1) state.returning = false;
            } else {
                state.x = state.orbitX;
                state.y = state.orbitY;
            }
        }

        constrainCell(state, rect);
        avoidObstacles(state, index);
        state.node.style.left = `${state.x}px`;
        state.node.style.top = `${state.y}px`;
    });
}

function constrainCell(state, rect) {
    const radius = state.node.offsetWidth / 2 + 4;
    state.x = Math.max(radius, Math.min(rect.width - radius, state.x));
    state.y = Math.max(96 + radius, Math.min(rect.height - 72 - radius, state.y));
}

function avoidObstacles(state, ownIndex) {
    const cellRadius = state.node.offsetWidth / 2 + 7;

    layoutState.forEach(nodeState => {
        const rx = nodeState.node.offsetWidth / 2 + cellRadius;
        const ry = nodeState.node.offsetHeight / 2 + cellRadius;
        const dx = state.x - nodeState.x;
        const dy = state.y - nodeState.y;
        const normalized = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
        if (normalized >= 1) return;

        const angle = Math.atan2(dy || ownIndex + 1, dx || ownIndex + 1);
        const scale = 1 / Math.sqrt(Math.max(normalized, 0.0001));
        state.x = nodeState.x + dx * scale + Math.cos(angle) * 2;
        state.y = nodeState.y + dy * scale + Math.sin(angle) * 2;
    });

    for (let index = 0; index < userState.length; index += 1) {
        if (index === ownIndex) continue;
        const other = userState[index];
        if (!Number.isFinite(other.x) || !Number.isFinite(other.y)) continue;
        const minDistance = cellRadius + other.node.offsetWidth / 2 + 5;
        const dx = state.x - other.x;
        const dy = state.y - other.y;
        const distance = Math.hypot(dx, dy);
        if (distance >= minDistance) continue;
        const angle = distance ? Math.atan2(dy, dx) : ownIndex * 1.7;
        state.x = other.x + Math.cos(angle) * minDistance;
        state.y = other.y + Math.sin(angle) * minDistance;
    }
}

function bindCellDrag() {
    userCells.forEach((node, index) => {
        const state = () => userState[index];
        if (!reviewMap.users[index]?.isCurrentUser) return;

        node.addEventListener("pointerdown", event => {
            const current = state();
            if (!current) return;
            event.preventDefault();
            node.setPointerCapture(event.pointerId);
            current.dragging = true;
            current.returning = false;
            node.classList.add("is-dragging");
            dragState = { pointerId: event.pointerId, state: current };
            restartAnimation();
        });

        node.addEventListener("pointermove", event => {
            if (!dragState || dragState.pointerId !== event.pointerId || dragState.state !== state()) return;
            const rect = network.getBoundingClientRect();
            dragState.state.x = event.clientX - rect.left;
            dragState.state.y = event.clientY - rect.top;
            constrainCell(dragState.state, rect);
            avoidObstacles(dragState.state, index);
            node.style.left = `${dragState.state.x}px`;
            node.style.top = `${dragState.state.y}px`;
        });

        const release = event => {
            if (!dragState || dragState.pointerId !== event.pointerId || dragState.state !== state()) return;
            const current = dragState.state;
            current.dragging = false;
            current.returning = true;
            current.returnStartedAt = performance.now();
            current.returnFromX = current.x;
            current.returnFromY = current.y;
            node.classList.remove("is-dragging");
            dragState = null;
            restartAnimation();
        };
        node.addEventListener("pointerup", release);
        node.addEventListener("pointercancel", release);
    });
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
        node.style.left = `${subjectState.x + Math.cos(angle) * radius}px`;
        node.style.top = `${subjectState.y + Math.sin(angle) * radius}px`;
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
    positionUserCells(time, rect);
    positionTypeNodes(rect);
    drawLines(rect);
    frameId = reduceMotion && !dragState && !userState.some(state => state.returning)
        ? null
        : requestAnimationFrame(animate);
}

function restartAnimation() {
    if (frameId) cancelAnimationFrame(frameId);
    if (document.body.classList.contains("locked")) return;
    frameId = requestAnimationFrame(animate);
}

centerNode.addEventListener("click", () => {
    activeSubject = null;
    typeLayer.innerHTML = "";
    subjectNodes.forEach(node => node.classList.remove("is-active"));
});
retryButton.addEventListener("click", loadNetworkData);

updateCountdown();
document.getElementById("libraryVersion").textContent = reviewMap.release.version;
document.getElementById("libraryUpdate").textContent = reviewMap.release.note;
renderDataLayers();
loadNetworkData();

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
