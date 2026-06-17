const SUBJECTS = {
    javaweb: { name: "Java Web", file: "data/javaweb.json" },
    os: { name: "计算机组成原理", file: "data/os.json" },
    bigdata: { name: "大数据原理与应用", file: "data/bigdata.json" },
    se: { name: "软件工程", file: "data/se.json" }
};

const INVITE_CODE = "050317";
const ACCESS_KEY = "effort_site_invite_ok";
const typeNames = { single: "选择题", judge: "判断题", blank: "填空题", short: "简答题" };

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
    const input = document.getElementById("inviteInput");
    const button = document.getElementById("inviteBtn");
    const error = document.getElementById("inviteError");
    if (!input || !button) return;

    function unlock() {
        document.body.classList.remove("locked");
        localStorage.setItem(ACCESS_KEY, "1");
    }

    function checkCode() {
        if (input.value.trim() === INVITE_CODE) {
            error.textContent = "";
            unlock();
            return;
        }
        error.textContent = "邀请码不对，再检查一下。";
        input.select();
    }

    if (localStorage.getItem(ACCESS_KEY) === "1") {
        unlock();
        return;
    }

    input.focus();
    button.addEventListener("click", checkCode);
    input.addEventListener("keydown", event => {
        if (event.key === "Enter") checkCode();
    });
}

function getSubjectFromUrl() {
    const subject = new URLSearchParams(window.location.search).get("subject") || "javaweb";
    return SUBJECTS[subject] ? subject : "javaweb";
}

function stateKey(name) {
    return `quiz_${appState.subject}_${name}`;
}

function loadState() {
    appState.answered = JSON.parse(localStorage.getItem(stateKey("answered")) || "{}");
    appState.wrong = JSON.parse(localStorage.getItem(stateKey("wrong")) || "[]");
}

function saveState() {
    localStorage.setItem(stateKey("answered"), JSON.stringify(appState.answered));
    localStorage.setItem(stateKey("wrong"), JSON.stringify(appState.wrong));
    updateScore();
    updateStats();
}

async function initQuizPage() {
    appState.subject = getSubjectFromUrl();
    loadState();

    try {
        const response = await fetch(SUBJECTS[appState.subject].file, { cache: "no-cache" });
        if (!response.ok) throw new Error(`题库加载失败：${response.status}`);
        appState.data = await response.json();
        appState.questions = normalizeQuestions(appState.data.questions || []);
        renderSubjectShell();
        initFilters();
        initNav();
        initCopy();
        bindQuestionEvents();
        renderAll();
    } catch (error) {
        renderLoadError(error);
    }
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
        chapter: item["所属章节"] || item.chapter || "综合"
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
    document.title = `努力抱佛脚 - ${title}`;
    document.getElementById("subjectTitle").textContent = title;
    document.getElementById("subjectSubtitle").textContent = appState.data.subtitle || "通用刷题页面";
    setOptionalNav("review", (appState.data.reviews || []).length > 0);
    setOptionalNav("code", (appState.data.designs || []).length > 0);
}

function setOptionalNav(view, visible) {
    const btn = document.querySelector(`.nav-btn[data-view="${view}"]`);
    if (btn) btn.hidden = !visible;
}

function initFilters() {
    const typeFilters = document.getElementById("typeFilters");
    const chapterFilters = document.getElementById("chapterFilters");
    const typeOrder = ["all", "single", "judge", "blank", "short"];
    const presentTypes = new Set(appState.questions.map(q => q.type));

    typeFilters.innerHTML = typeOrder
        .filter(type => type === "all" || presentTypes.has(type))
        .map(type => `<button class="chip ${type === "all" ? "active" : ""}" data-filter-type="${type}">${type === "all" ? "全部" : typeNames[type]}</button>`)
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
    });

    document.getElementById("resetBtn").addEventListener("click", () => {
        if (!confirm("确定清空当前科目的练习进度吗？")) return;
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
            <div class="q-title">${escapeHtml(q.title)}</div>
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
    if (q.type === "judge") {
        return `<div class="options"><label class="option"><input type="radio" name="${escapeHtml(q.id)}" value="对"><span>对</span></label><label class="option"><input type="radio" name="${escapeHtml(q.id)}" value="错"><span>错</span></label></div>`;
    }
    if (q.type === "short") return `<textarea class="answer-input" rows="4" placeholder="先自己默写，再点提交查看参考答案"></textarea>`;
    return `<input class="answer-input" placeholder="输入答案">`;
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
            return;
        }

        const correct = isCorrect(q, getUserAnswer(card, q));
        appState.answered[q.id] = correct;
        markWrong(q.id, !correct);
        showResult(card, q, correct);
        saveState();
        renderWrong();
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
    });
}

function getUserAnswer(card, q) {
    if (q.type === "single" || q.type === "judge") {
        const checked = card.querySelector("input:checked");
        return checked ? checked.value : "";
    }
    return card.querySelector(".answer-input").value;
}

function isCorrect(q, value) {
    if (q.type === "short") return normalize(value).length >= 8;
    return [q.answer, ...q.alt].map(normalize).includes(normalize(value));
}

function showResult(card, q, correct, forceAnswer = false) {
    const result = card.querySelector(".result");
    result.className = `result visible ${correct ? "correct" : "wrong"}`;
    const label = correct ? "答对了" : "再背一下";
    const answerLabel = q.type === "short" || forceAnswer ? "参考答案" : "正确答案";
    result.innerHTML = `<strong>${label}</strong><br><strong>${answerLabel}：</strong>${escapeHtml(q.answer)}<br><strong>解析：</strong>${escapeHtml(q.explain || "")}`;
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
    return `<div class="placeholder-page"><div><h2>努力抱佛脚</h2><p>${escapeHtml(text)}</p></div></div>`;
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

initInviteGate();
if (document.body.dataset.page === "quiz") initQuizPage();
