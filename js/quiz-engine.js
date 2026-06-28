const SUBJECTS = {
    javaweb: { name: "Java Web", file: "data/javaweb.json" },
    os: { name: "计算机组成原理", file: "data/os.json" },
    bigdata: { name: "大数据原理与应用", file: "data/bigdata.json" },
    se: { name: "软件工程", file: "data/se.json" }
};

const typeNames = { single: "单选题", multiple: "多选题", judge: "判断题", blank: "填空题", short: "简答题" };

const appState = {
    subject: "javaweb",
    data: null,
    questions: [],
    filter: "all",
    chapter: "all",
    search: "",
    answered: {},
    wrong: []
};

function initInviteGate() {
    const syncInput = document.getElementById("syncInput");
    const button = document.getElementById("inviteBtn");
    const demoButton = document.getElementById("demoBtn");
    const error = document.getElementById("inviteError");
    if (!syncInput || !button) return Promise.resolve();
    const originalButtonText = button.textContent;

    return new Promise(resolve => {
        function unlock() {
            document.body.classList.remove("locked");
            resolve();
        }

        async function checkCode() {
            if (syncInput.value.trim().length < 4) {
                error.textContent = "请输入至少 4 位学习同步码。";
                syncInput.focus();
                return;
            }

            button.disabled = true;
            button.textContent = "正在同步…";
            error.textContent = "";
            try {
                await window.quizAnalytics.setSyncIdentity(syncInput.value);
                unlock();
            } catch (syncError) {
                console.warn("同步身份设置失败：", syncError);
                error.textContent = "同步服务暂不可用，请确认已运行最新版数据库脚本。";
            } finally {
                button.disabled = false;
                button.textContent = originalButtonText;
            }
        }

        function enterDemo() {
            window.quizAnalytics?.startDemoMode();
            seedDemoProgress();
            unlock();
        }

        if (window.quizAnalytics?.hasSyncIdentity()) {
            unlock();
            return;
        }

        syncInput.focus();
        button.addEventListener("click", checkCode);
        demoButton?.addEventListener("click", enterDemo);
        syncInput.addEventListener("keydown", event => {
            if (event.key === "Enter") checkCode();
        });
    });
}

function seedDemoProgress() {
    const demoAnswered = {};
    ["q1", "q2", "q4", "q7", "q9", "q12"].forEach((id, index) => {
        demoAnswered[id] = index !== 4;
    });
    localStorage.setItem("quiz_javaweb_answered", JSON.stringify(demoAnswered));
    localStorage.setItem("quiz_javaweb_wrong", JSON.stringify(["q9"]));
}

function getSubjectFromUrl() {
    const subject = new URLSearchParams(window.location.search).get("subject") || "javaweb";
    return SUBJECTS[subject] ? subject : "javaweb";
}

function stateKey(name) {
    return `quiz_${appState.subject}_${name}`;
}

async function loadState() {
    appState.answered = JSON.parse(localStorage.getItem(stateKey("answered")) || "{}");
    appState.wrong = JSON.parse(localStorage.getItem(stateKey("wrong")) || "[]");

    if (!window.quizAnalytics) return;
    if (window.quizAnalytics.isDemoMode?.()) return;
    try {
        const rows = await window.quizAnalytics.getSubjectState(appState.subject);
        const remoteAnswered = {};
        const remoteWrong = [];
        rows.forEach(row => {
            const questionId = row.question_id || row.questionId;
            const mastered = Boolean(row.mastered);
            remoteAnswered[questionId] = mastered;
            if (!mastered) remoteWrong.push(questionId);
        });
        appState.answered = remoteAnswered;
        appState.wrong = remoteWrong;
        localStorage.setItem(stateKey("answered"), JSON.stringify(appState.answered));
        localStorage.setItem(stateKey("wrong"), JSON.stringify(appState.wrong));
    } catch (error) {
        console.warn("跨设备进度读取失败，继续使用本机进度：", error);
    }
}

function saveState() {
    localStorage.setItem(stateKey("answered"), JSON.stringify(appState.answered));
    localStorage.setItem(stateKey("wrong"), JSON.stringify(appState.wrong));
    updateScore();
    updateStats();
}

async function initQuizPage() {
    appState.subject = getSubjectFromUrl();
    await loadState();

    try {
        const response = await fetch(SUBJECTS[appState.subject].file, { cache: "no-cache" });
        if (!response.ok) throw new Error(`题库加载失败：${response.status}`);
        appState.data = await response.json();
        appState.questions = normalizeQuestions(appState.data.questions || []);
        applyInitialFilters();
        renderSubjectShell();
        initFloatingCompanion();
        initFilters();
        initNav();
        initCopy();
        bindQuestionEvents();
        renderAll();
    } catch (error) {
        renderLoadError(error);
    }
}

function applyInitialFilters() {
    const requestedType = new URLSearchParams(window.location.search).get("type");
    const availableTypes = new Set(appState.questions.map(question => question.type));
    appState.filter = requestedType && availableTypes.has(requestedType) ? requestedType : "all";
}

function normalizeQuestions(list) {
    return list.map((item, index) => ({
        id: item.id || `q${index + 1}`,
        type: item.type || inferType(item),
        title: item["题干"] || item.title || "",
        options: item["选项"] || item.options || [],
        answer: item["正确答案"] || item.answer || "",
        alt: item["备选答案"] || item.alt || [],
        explain: item["解析"] || item.explain || "",
        chapter: item["所属章节"] || item.chapter || "综合",
        questionImages: item["题目图片"] || item.questionImages || [],
        answerImages: item["答案图片"] || item.answerImages || []
    }));
}

function inferType(item) {
    const options = item["选项"] || item.options || [];
    const answer = item["正确答案"] || item.answer || "";
    if (options.length) return "single";
    if (["对", "错"].includes(answer)) return "judge";
    return "blank";
}

function renderSubjectShell() {
    const title = appState.data.title || SUBJECTS[appState.subject].name;
    document.title = `cella - ${title}`;
    document.getElementById("subjectTitle").textContent = title;
    document.getElementById("subjectSubtitle").textContent = appState.data.subtitle || "通用刷题页面";
    setOptionalNav("review", (appState.data.reviews || []).length > 0);
    setOptionalNav("code", (appState.data.designs || []).length > 0);
}

function setCompanionMood(mood, message) {
    const companion = document.getElementById("floatingCompanion");
    const copy = document.getElementById("companionBubble");
    if (!companion || !copy) return;
    companion.dataset.mood = mood;
    copy.textContent = message;
    copy.classList.remove("is-speaking");
    requestAnimationFrame(() => copy.classList.add("is-speaking"));
}

function moveCompanionNear(target, mood, message) {
    const companion = document.getElementById("floatingCompanion");
    if (!companion || !target) return;
    const rect = target.getBoundingClientRect();
    const companionWidth = companion.offsetWidth || 190;
    const companionHeight = companion.offsetHeight || 118;
    const margin = 14;
    const preferredLeft = rect.right - companionWidth * 0.45;
    const preferredTop = rect.top + Math.min(110, rect.height * 0.35);
    const maxLeft = window.innerWidth - companionWidth - margin;
    const maxTop = window.innerHeight - companionHeight - margin;
    companion.style.right = "auto";
    companion.style.bottom = "auto";
    companion.style.left = `${Math.max(margin, Math.min(maxLeft, preferredLeft))}px`;
    companion.style.top = `${Math.max(92, Math.min(maxTop, preferredTop))}px`;
    companion.classList.add("is-guided");
    setCompanionMood(mood, message);
    window.clearTimeout(companion.guideTimer);
    companion.guideTimer = window.setTimeout(() => {
        companion.classList.remove("is-guided");
    }, 3200);
}

function initFloatingCompanion() {
    const companion = document.getElementById("floatingCompanion");
    const cell = document.getElementById("companionCell");
    if (!companion || !cell) return;

    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    function place(clientX, clientY) {
        const maxLeft = window.innerWidth - companion.offsetWidth - 10;
        const maxTop = window.innerHeight - companion.offsetHeight - 10;
        companion.style.right = "auto";
        companion.style.bottom = "auto";
        companion.style.left = `${Math.max(10, Math.min(maxLeft, clientX - offsetX))}px`;
        companion.style.top = `${Math.max(76, Math.min(maxTop, clientY - offsetY))}px`;
    }

    cell.addEventListener("pointerdown", event => {
        dragging = true;
        const rect = companion.getBoundingClientRect();
        offsetX = event.clientX - rect.left;
        offsetY = event.clientY - rect.top;
        companion.classList.add("is-dragging", "is-guided");
        cell.setPointerCapture(event.pointerId);
    });

    cell.addEventListener("pointermove", event => {
        if (dragging) place(event.clientX, event.clientY);
    });

    cell.addEventListener("pointerup", event => {
        dragging = false;
        companion.classList.remove("is-dragging");
        cell.releasePointerCapture(event.pointerId);
        setCompanionMood("curious", "这里也可以。我会待在不挡题目的地方。");
    });

    cell.addEventListener("click", () => {
        if (!dragging) setCompanionMood("curious", "我在。慢慢来，不用赶。");
    });
}

function companionFeedback(q, outcome) {
    const topic = q.chapter || typeNames[q.type] || "这段知识";
    const variations = {
        correct: {
            single: [`${topic} 的轮廓清楚了一点。`, "你认出了关键线索，我的细胞膜也亮起来了。"],
            multiple: ["这些知识彼此连上了，像新的细胞组织。", `${topic} 的几个分支都被你找到了。`],
            judge: ["你的判断让这段记忆稳定下来了。", `${topic} 的边界现在很清楚。`],
            blank: ["空缺被填上后，我的内部也完整了一点。", `${topic} 已经长进记忆里了。`],
            short: ["你用自己的话养出了这段记忆。", `${topic} 不再只是答案，它开始属于你了。`]
        },
        wrong: {
            single: ["这个选项留下了一道小划痕，我替你记住它。", `${topic} 还有一处需要慢慢辨认。`],
            multiple: ["有一条知识触须还没接上，我们下次再试。", `${topic} 的组合有点复杂，我陪你拆开看。`],
            judge: ["这次边界有点模糊，没关系，我们已经发现它了。", `${topic} 还在摇晃，之后会稳定下来。`],
            blank: ["这里暂时还是一小块空白，我不会让它丢失。", `${topic} 正在形成，还差最后一点。`],
            short: ["表达还在生长，不需要一次就长成标准答案。", `${topic} 值得再用自己的话讲一次。`]
        },
        reveal: {
            single: ["我陪你看清这个选项为什么不同。", `${topic} 的答案先放进待修复记忆。`],
            multiple: ["我们先观察这些选项如何连接。", `${topic} 的组合关系已经被标记。`],
            judge: ["先看清判断依据，下次就会更笃定。", `${topic} 的边界我替你保存好了。`],
            blank: ["答案先填进来，理解可以慢一点长。", `${topic} 的空缺已经有了形状。`],
            short: ["先读参考答案，再试着说成你自己的话。", `${topic} 的表达方式值得慢慢吸收。`]
        }
    };
    const pool = variations[outcome]?.[q.type] || [`${topic} 正在成为新的记忆。`];
    const seed = Array.from(String(q.id)).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return pool[seed % pool.length];
}

function setOptionalNav(view, visible) {
    const btn = document.querySelector(`.nav-btn[data-view="${view}"]`);
    if (btn) btn.hidden = !visible;
}

function initFilters() {
    const typeFilters = document.getElementById("typeFilters");
    const chapterFilters = document.getElementById("chapterFilters");
    const typeOrder = ["all", "single", "multiple", "judge", "blank", "short"];
    const presentTypes = new Set(appState.questions.map(q => q.type));

    typeFilters.innerHTML = typeOrder
        .filter(type => type === "all" || presentTypes.has(type))
        .map(type => `<button class="chip ${type === appState.filter ? "active" : ""}" data-filter-type="${type}">${type === "all" ? "全部" : typeNames[type]}</button>`)
        .join("");

    const chapters = ["all", ...Array.from(new Set(appState.questions.map(q => q.chapter))).filter(Boolean)];
    chapterFilters.innerHTML = chapters.map(chapter => `
        <button class="chip ${chapter === "all" ? "active" : ""}" data-filter-chapter="${escapeHtml(chapter)}">${chapter === "all" ? "全部章节" : escapeHtml(chapter)}</button>
    `).join("");
}

function initNav() {
    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.addEventListener("click", () => switchView(btn.dataset.view));
    });

    document.querySelectorAll("[data-filter-type]").forEach(chip => {
        chip.addEventListener("click", () => {
            appState.filter = chip.dataset.filterType;
            document.querySelectorAll("[data-filter-type]").forEach(item => item.classList.toggle("active", item === chip));
            renderPractice();
        });
    });

    document.querySelectorAll("[data-filter-chapter]").forEach(chip => {
        chip.addEventListener("click", () => {
            appState.chapter = chip.dataset.filterChapter;
            document.querySelectorAll("[data-filter-chapter]").forEach(item => item.classList.toggle("active", item === chip));
            renderPractice();
        });
    });

    document.getElementById("randomBtn").addEventListener("click", () => {
        const list = filteredQuestions();
        if (!list.length) return renderQuestions([], "questionList");
        renderQuestions([list[Math.floor(Math.random() * list.length)]], "questionList");
        moveCompanionNear(
            document.querySelector("#questionList .question-card"),
            "curious",
            "我替我们选了这题。先凭感觉看看。"
        );
    });

    document.getElementById("resetBtn").addEventListener("click", async () => {
        if (!confirm("确定重置当前科目的答题数据吗？")) return;
        try {
            await window.quizAnalytics?.resetSubjectProgress(appState.subject);
        } catch (error) {
            console.warn("线上进度重置失败：", error);
        }
        appState.answered = {};
        appState.wrong = [];
        saveState();
        renderPractice();
        renderWrong();
    });

    document.getElementById("searchInput").addEventListener("input", event => {
        appState.search = event.target.value;
        renderPractice();
    });

    document.getElementById("clearWrongBtn").addEventListener("click", () => {
        appState.wrong = [];
        saveState();
        renderWrong();
        setCompanionMood("glowing", "这些记忆都修复好了，我感觉轻了一点。");
    });
}

function switchView(name) {
    document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.view === name));
    document.querySelectorAll(".view").forEach(view => view.classList.remove("active"));
    document.getElementById(`${name}View`).classList.add("active");
}

function renderAll() {
    renderPractice();
    renderWrong();
    renderReview();
    renderCode();
    updateScore();
    updateStats();
}

function filteredQuestions() {
    let list = appState.questions;
    if (appState.filter !== "all") list = list.filter(q => q.type === appState.filter);
    if (appState.chapter !== "all") list = list.filter(q => q.chapter === appState.chapter);

    const keyword = normalize(appState.search);
    if (!keyword) return list;
    return list.filter(q => normalize([q.title, q.answer, q.explain, q.chapter, ...q.options, ...q.alt].join(" ")).includes(keyword));
}

function renderPractice() {
    if (!appState.questions.length) {
        document.getElementById("questionList").innerHTML = placeholderHtml(appState.data.placeholder || "这个科目的题库还没录入。");
        return;
    }
    renderQuestions(filteredQuestions(), "questionList");
}

function renderQuestions(list, targetId) {
    const target = document.getElementById(targetId);
    if (!list.length) {
        target.innerHTML = `<div class="question-card"><p class="muted">这里暂时没有题。</p></div>`;
        return;
    }

    target.innerHTML = list.map((q, index) => `
        <article class="question-card" data-id="${escapeHtml(q.id)}">
            <div class="q-meta">
                <span>${typeNames[q.type] || "题目"} · ${index + 1} · ${escapeHtml(q.chapter)}</span>
                <span>${appState.answered[q.id] ? "已掌握" : "待练习"}</span>
            </div>
            ${q.type === "blank" ? "" : `<div class="q-title">${escapeHtml(q.title)}</div>`}
            ${renderQuestionImages(q.questionImages, "题目配图")}
            ${renderControls(q)}
            <div class="card-actions">
                ${q.type === "single" || q.type === "judge" ? "" : `<button class="primary check-btn">提交答案</button>`}
                <button class="show-answer">看答案</button>
            </div>
            <div class="result"></div>
        </article>
    `).join("");
}

function renderControls(q) {
    if (q.type === "single") {
        return `<div class="options">${q.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            return `<label class="option"><input type="radio" name="${escapeHtml(q.id)}" value="${letter}"><span>${letter}. ${escapeHtml(opt)}</span></label>`;
        }).join("")}</div>`;
    }
    if (q.type === "multiple") {
        return `<div class="options">${q.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            return `<label class="option"><input type="checkbox" name="${escapeHtml(q.id)}" value="${letter}"><span>${letter}. ${escapeHtml(opt)}</span></label>`;
        }).join("")}</div>`;
    }
    if (q.type === "judge") {
        return `<div class="options"><label class="option"><input type="radio" name="${escapeHtml(q.id)}" value="对"><span>对</span></label><label class="option"><input type="radio" name="${escapeHtml(q.id)}" value="错"><span>错</span></label></div>`;
    }
    if (q.type === "blank") return renderBlankControls(q);
    if (q.type === "short") return `<textarea class="answer-input" rows="4" placeholder="先自己默写，再点提交查看参考答案"></textarea>`;
    return `<input class="answer-input" placeholder="输入答案">`;
}

function renderBlankControls(q) {
    const markerPattern = /_{2,}|\*{2,}/g;
    const matches = Array.from(q.title.matchAll(markerPattern));
    if (!matches.length) {
        return `<div class="blank-exercise"><p class="q-title">${escapeHtml(q.title)}</p><input class="blank-input" data-blank-index="0" placeholder="填写答案"></div>`;
    }

    let html = "";
    let lastIndex = 0;
    matches.forEach((match, index) => {
        html += escapeHtml(q.title.slice(lastIndex, match.index));
        html += `<input class="blank-input" data-blank-index="${index}" aria-label="第 ${index + 1} 个空" placeholder="第${index + 1}空">`;
        lastIndex = match.index + match[0].length;
    });
    html += escapeHtml(q.title.slice(lastIndex));
    return `<div class="blank-exercise">${html}</div>`;
}

function bindQuestionEvents() {
    document.addEventListener("click", event => {
        const checkBtn = event.target.closest(".check-btn");
        const showBtn = event.target.closest(".show-answer");
        if (!checkBtn && !showBtn) return;

        const card = event.target.closest(".question-card");
        const q = appState.questions.find(item => item.id === card.dataset.id);
        if (!q) return;

        if (showBtn) {
            showResult(card, q, false, true);
            markWrong(q.id, true);
            saveState();
            renderWrong();
            moveCompanionNear(card, "comforting", companionFeedback(q, "reveal"));
            return;
        }

        const correct = isCorrect(q, getUserAnswer(card, q));
        appState.answered[q.id] = correct;
        markWrong(q.id, !correct);
        showResult(card, q, correct);
        saveState();
        renderWrong();
        trackAnswer(q.id, q.type, correct);
        moveCompanionNear(
            card,
            correct ? "glowing" : "comforting",
            companionFeedback(q, correct ? "correct" : "wrong")
        );
    });

    document.addEventListener("change", event => {
        const input = event.target.closest(".option input");
        if (!input) return;

        const card = event.target.closest(".question-card");
        const q = appState.questions.find(item => item.id === card.dataset.id);
        if (!q || (q.type !== "single" && q.type !== "judge")) return;

        const correct = isCorrect(q, input.value);
        appState.answered[q.id] = correct;
        markWrong(q.id, !correct);
        showResult(card, q, correct);
        saveState();
        renderWrong();
        trackAnswer(q.id, q.type, correct);
        moveCompanionNear(
            card,
            correct ? "glowing" : "comforting",
            companionFeedback(q, correct ? "correct" : "wrong")
        );
    });
}

function trackAnswer(questionId, questionType, correct) {
    if (!window.quizAnalytics) return;
    window.quizAnalytics.trackAnswer({
        subject: appState.subject,
        questionId,
        questionType,
        correct
    });
}

function getUserAnswer(card, q) {
    if (q.type === "single" || q.type === "judge") {
        const checked = card.querySelector("input:checked");
        return checked ? checked.value : "";
    }
    if (q.type === "multiple") {
        return Array.from(card.querySelectorAll("input:checked")).map(input => input.value).sort().join("");
    }
    if (q.type === "blank") {
        return Array.from(card.querySelectorAll(".blank-input")).map(input => input.value).join("、");
    }
    return card.querySelector(".answer-input").value;
}

function isCorrect(q, value) {
    if (q.type === "short") return normalize(value).length >= 8;
    if (q.type === "blank") {
        return [q.answer, ...q.alt].map(normalizeBlankAnswer).includes(normalizeBlankAnswer(value));
    }
    if (q.type === "multiple") {
        const sorted = String(value || "").toUpperCase().replace(/[^A-Z]/g, "").split("").sort().join("");
        return [q.answer, ...q.alt].some(answer =>
            String(answer || "").toUpperCase().replace(/[^A-Z]/g, "").split("").sort().join("") === sorted
        );
    }
    return [q.answer, ...q.alt].map(normalize).includes(normalize(value));
}

function normalizeBlankAnswer(value) {
    return normalize(value).replace(/[，,；;、]/g, "|");
}

function showResult(card, q, correct, forceAnswer = false) {
    const result = card.querySelector(".result");
    result.className = `result visible ${correct ? "correct" : "wrong"}`;
    const label = correct ? "记住了" : "还在生长";
    const answerLabel = q.type === "short" || forceAnswer ? "参考答案" : "正确答案";
    result.innerHTML = `<strong>${label}</strong><br><strong>${answerLabel}：</strong>${escapeHtml(q.answer)}<br><strong>解析：</strong>${escapeHtml(q.explain || "")}${renderQuestionImages(q.answerImages, "参考答案图")}`;
}

function renderQuestionImages(images, altPrefix) {
    if (!images || !images.length) return "";
    return `<div class="question-images">${images.map((src, index) => `
        <img src="${escapeHtml(src)}" alt="${escapeHtml(altPrefix)} ${index + 1}" loading="lazy">
    `).join("")}</div>`;
}

function markWrong(id, wrong) {
    const set = new Set(appState.wrong);
    if (wrong) set.add(id);
    else set.delete(id);
    appState.wrong = Array.from(set);
}

function renderWrong() {
    renderQuestions(appState.wrong.map(id => appState.questions.find(q => q.id === id)).filter(Boolean), "wrongList");
}

function renderReview() {
    const reviews = appState.data.reviews || [];
    document.getElementById("reviewList").innerHTML = reviews.length ? reviews.map(item => `
        <article class="review-card"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.body)}</p></article>
    `).join("") : placeholderHtml("这个科目暂时没有背诵卡片。");
}

function renderCode() {
    const designs = appState.data.designs || [];
    const themes = ["theme-blue", "theme-green", "theme-amber", "theme-rose", "theme-cyan", "theme-violet"];
    document.getElementById("codeList").innerHTML = designs.length ? designs.map((item, i) => `
        <article class="code-card ${themes[i % themes.length]}">
            <header><div class="code-title"><h3>${escapeHtml(item.title)}</h3><span class="source-tag">${escapeHtml(item.source || "题库整理")}</span></div></header>
            <div class="design-body">
                <section class="design-section"><h4>题目</h4><p>${escapeHtml(item.question || "")}</p></section>
                <section class="design-section"><h4>操作流程</h4><ol>${(item.steps || []).map(step => `<li>${escapeHtml(step)}</li>`).join("")}</ol></section>
                <section class="design-section"><h4>标准答案代码</h4><div class="file-blocks">
                    ${(item.files || []).map((file, fileIndex) => `
                        <div class="file-block"><div class="file-head"><span>${escapeHtml(file.label)}</span><button class="copy-btn" data-task="${i}" data-file="${fileIndex}">复制这段</button></div><pre class="code-pre" data-lang="${escapeHtml(file.lang || "text")}"><code>${highlightCode(file.code || "")}</code></pre></div>
                    `).join("")}
                </div></section>
            </div>
        </article>
    `).join("") : placeholderHtml("这个科目暂时没有设计题。");
}

function initCopy() {
    document.addEventListener("click", async event => {
        const btn = event.target.closest(".copy-btn");
        if (!btn) return;
        const task = (appState.data.designs || [])[Number(btn.dataset.task)];
        const code = task.files[Number(btn.dataset.file)].code;
        await copyText(code);
        btn.textContent = "已复制";
        setTimeout(() => btn.textContent = "复制这段", 1200);
    });
}

async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.inset = "0 auto auto 0";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
}

function updateScore() {
    const total = appState.questions.length;
    const correct = Object.values(appState.answered).filter(Boolean).length;
    document.getElementById("scoreText").textContent = `${correct} / ${total}`;
}

function updateStats() {
    const counts = appState.questions.reduce((acc, q) => {
        acc[q.type] = (acc[q.type] || 0) + 1;
        return acc;
    }, {});
    const total = appState.questions.length;
    const correct = Object.values(appState.answered).filter(Boolean).length;
    const rate = total ? Math.round((correct / total) * 100) : 0;
    document.getElementById("statsBar").innerHTML = [
        `总题量 ${total}`,
        `已掌握 ${correct}`,
        `错题 ${appState.wrong.length}`,
        `正确率 ${rate}%`,
        `选择 ${counts.single || 0}`,
        `判断 ${counts.judge || 0}`,
        `填空 ${counts.blank || 0}`,
        `简答 ${counts.short || 0}`
    ].map(text => `<span class="stat-pill">${text}</span>`).join("");
}

function renderLoadError(error) {
    document.getElementById("subjectTitle").textContent = "题库加载失败";
    document.getElementById("subjectSubtitle").textContent = error.message;
    document.getElementById("questionList").innerHTML = placeholderHtml("请检查 data 目录和 subject 参数。");
}

function placeholderHtml(text) {
    return `<div class="placeholder-page"><div><h2 class="brand-script">cella</h2><p>${escapeHtml(text)}</p></div></div>`;
}

function normalize(value) {
    return String(value || "").replace(/\s+/g, "").toLowerCase();
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, ch => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#039;"
    }[ch]));
}

function highlightCode(code) {
    const tokenPattern = /(\/\/[^\n]*|<!--[\s\S]*?-->|"(?:\\.|[^"\\])*"|@\w+|\b(?:package|import|public|private|protected|class|extends|static|void|int|double|boolean|String|return|if|else|new|throws|try|catch|finally|while|for)\b)/g;
    let html = "";
    let lastIndex = 0;
    for (const match of code.matchAll(tokenPattern)) {
        const token = match[0];
        html += escapeHtml(code.slice(lastIndex, match.index));
        let cls = "tok-keyword";
        if (token.startsWith("//") || token.startsWith("<!--")) cls = "tok-comment";
        else if (token.startsWith("\"")) cls = "tok-string";
        else if (token.startsWith("@")) cls = "tok-annotation";
        html += `<span class="${cls}">${escapeHtml(token)}</span>`;
        lastIndex = match.index + token.length;
    }
    html += escapeHtml(code.slice(lastIndex));
    return html;
}

window.accessReady = initInviteGate();
if (document.body.dataset.page === "quiz") {
    window.accessReady.then(initQuizPage);
}
