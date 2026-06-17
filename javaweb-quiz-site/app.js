const questions = [
    { id: "s1", type: "single", title: "下面关于 HTML 的描述中，错误的是（ ）。", options: ["在 <head> 和 </head> 之间可以包含 <title> 和 <body> 等信息", "HTML 文件必须由 <html> 开头，</html> 标记结束", "文档头信息包含在 <head> 与 </head> 之间", "文档体包含在 <body> 和 </body> 标记之间"], answer: "A", explain: "body 不能写在 head 内。" },
    { id: "s2", type: "single", title: "<%! Date dateTime; %> 变量声明在（ ）范围内有效。", options: ["在整个页面内有效，被多个客户共享", "在整个页面内有效，客户之间不共享", "从定义开始处有效，客户之间不共享", "从定义开始处有效，被多个客户共享"], answer: "A", explain: "JSP 声明会成为 Servlet 成员变量，可能被多个请求共享。" },
    { id: "s3", type: "single", title: "创建 JSP 应用程序时，配置文件 web.xml 应该在（ ）目录中。", options: ["admin", "servlet", "WEB-INF", "WebRoot"], answer: "C", explain: "web.xml 位于 WEB-INF 下。" },
    { id: "s4", type: "single", title: "以下（ ）对象提供了访问和放置页面共享数据的方式。", options: ["pageContext", "response", "request", "session"], answer: "A", explain: "pageContext 可访问页面上下文及各作用域属性。" },
    { id: "s5", type: "single", title: "HttpServlet 类中，用来处理 POST 请求的方法是（ ）。", options: ["doHead", "doGet", "doPost", "doPut"], answer: "C", explain: "POST 请求对应 doPost 方法。" },
    { id: "s6", type: "single", title: "自定义标签的主要作用是（ ）。", options: ["编写和使用方便", "不用会显得不专业", "减少 JSP 中的 Java 代码，实现代码与界面分离", "连接数据库"], answer: "C", explain: "自定义标签常用于减少 JSP 中脚本代码。" },
    { id: "s7", type: "single", title: "下面（ ）项不是加载驱动程序的方法。", options: ["通过 DriverManager.getConnection 方法加载", "调用 Class.forName 方法", "添加系统 jdbc.drivers 属性", "通过 registerDriver 方法注册"], answer: "A", explain: "getConnection 是获取连接，不是典型的加载驱动方式。" },
    { id: "s8", type: "single", title: "JSP 的编译指令通常指（ ）。", options: ["page、include、taglib", "page、include、plugin", "forward、include、taglib", "page、forward、taglib"], answer: "A", explain: "JSP 指令包括 page、include、taglib。" },
    { id: "s9", type: "single", title: "在 JSP 标准语法中，<%= %> 属于（ ）。", options: ["JSP 声明", "JSP 动作指令", "JSP 表达式", "JSP 注释"], answer: "C", explain: "<%= 表达式 %> 会把表达式结果输出到页面。" },
    { id: "s10", type: "single", title: "关于 MVC 开发模式，C 指的是（ ）。", options: ["模型", "视图", "控制", "网络"], answer: "C", explain: "MVC 中 C 是 Controller 控制器。" },
    { id: "s11", type: "single", title: "设置字号大小书写正确的是（ ）。", options: ["{ font-size: 24px; }", "{ font: 24px; }", "{ fontSize: 24px; }", "{ size: 24px; }"], answer: "A", explain: "CSS 字号属性是 font-size。" },
    { id: "s12", type: "single", title: "JSP 的 page 编译指令 language 属性默认值是（ ）。", options: ["C++", "C", "Java", "SQL"], answer: "C", explain: "JSP 默认脚本语言是 Java。" },
    { id: "s13", type: "single", title: "程序中重定向到另一个页面，正确语句是（ ）。", options: ["request.sendRedirect(\"http://www.sohu.com\");", "request.sendRedirect();", "response.sendRedirect(\"http://www.sohu.com\");", "response.sendRedirect();"], answer: "C", explain: "重定向方法属于 response 对象。" },
    { id: "s14", type: "single", title: "下列选项中，不属于表单 <form> 常用属性的是（ ）。", options: ["action", "size", "method", "name"], answer: "B", explain: "form 常用 action、method、name 等，size 不是 form 的常用属性。" },

    { id: "j1", type: "judge", title: "JSP 的 page 编译指令一次只能设置一个属性值，不能同时设置多个属性值。", answer: "错", explain: "page 指令可以同时设置多个属性。" },
    { id: "j2", type: "judge", title: "jsp:param 动作标记不能单独使用，必须作为 jsp:include、jsp:forward 等标记的子标记。", answer: "对", explain: "jsp:param 用于向 include 或 forward 传递参数。" },
    { id: "j3", type: "judge", title: "在 JSP 中，过滤器主要是对请求与响应进行拦截与处理。", answer: "对", explain: "Filter 就是请求/响应拦截组件。" },
    { id: "j4", type: "judge", title: "JSP 页面本质也是 Servlet。", answer: "对", explain: "JSP 会被翻译和编译成 Servlet。" },
    { id: "j5", type: "judge", title: "所有数据库都是关系型数据库。", answer: "错", explain: "还有非关系型数据库。" },
    { id: "j6", type: "judge", title: "Ajax 异步请求过程中通常会发生整个页面跳转或刷新。", answer: "错", explain: "Ajax 的特点就是局部异步交互。" },
    { id: "j7", type: "judge", title: "表单信息的验证只能放在服务器端执行。", answer: "错", explain: "客户端和服务器端都可以验证，服务器端验证更关键。" },
    { id: "j8", type: "judge", title: "Core 标签库是 JSTL 中的核心标签库。", answer: "对", explain: "Core 包含通用控制、变量、输出等标签。" },
    { id: "j9", type: "judge", title: "在 JSP 中使用表达式，正确语法是 <%=表达式%>。", answer: "对", explain: "这是 JSP 表达式的标准写法。" },
    { id: "j10", type: "judge", title: "jQuery 功能强大，能完全取代 JavaScript。", answer: "错", explain: "jQuery 是 JavaScript 库，不能取代语言本身。" },
    { id: "j11", type: "judge", title: "Session 通常情况下默认存活时间是半小时。", answer: "对", explain: "Tomcat 中 session 默认超时时间常见为 30 分钟。" },
    { id: "j12", type: "judge", title: "response.sendRedirect 只能实现本网站内跳转，不能传递参数。", answer: "错", explain: "可以跳转站外，也可以在 URL 后拼接参数。" },

    { id: "b1", type: "blank", title: "Web 的基本工作原理是请求与 ____。", answer: "响应", alt: ["response"], explain: "浏览器发请求，服务器返回响应。" },
    { id: "b2", type: "blank", title: "Tomcat 服务器默认端口号是 ____。", answer: "8080", explain: "Tomcat 默认 HTTP 端口为 8080。" },
    { id: "b3", type: "blank", title: "JSP 中导入 java.util.* 包，要使用 ____ 编译指令。", answer: "page", explain: "写法：<%@ page import=\"java.util.*\" %>。" },
    { id: "b4", type: "blank", title: "HTML 表单 form 提交方式有 get 和 ____。", answer: "post", explain: "method 常用 get/post。" },
    { id: "b5", type: "blank", title: "获取 request 作用域中名为 uage 的值的 EL 表达式是 ____。", answer: "${requestScope.uage}", alt: ["${uage}"], explain: "明确 request 作用域时写 requestScope。" },
    { id: "b6", type: "blank", title: "JDBC 的主要任务是：建立连接、____、处理结果。", answer: "发送SQL语句", alt: ["执行SQL语句", "发送或执行SQL语句", "执行 SQL 语句"], explain: "核心流程是连接、执行 SQL、处理结果。" },
    { id: "b7", type: "blank", title: "Model1 模式是 JSP + ____ 的结合。", answer: "JavaBean", explain: "Model1 常见组合为 JSP + JavaBean。" },
    { id: "b8", type: "blank", title: "记录当前网站访问量最好采用 JSP 中的 ____ 对象。", answer: "application", explain: "application 是整个 Web 应用共享。" },
    { id: "b9", type: "blank", title: "B/S 架构中的 S 代表 ____。", answer: "Server", alt: ["服务器", "server"], explain: "B/S 即 Browser/Server。" },
    { id: "b10", type: "blank", title: "response 对象可以通过 ____ 方法进行重定向。", answer: "sendRedirect", alt: ["sendRedirect()"], explain: "重定向：response.sendRedirect(url)。" },
    { id: "b11", type: "blank", title: "在 HTTP 协议中，一个完整的请求消息由请求行、____ 和实体内容三部分组成。", answer: "请求头", explain: "HTTP 请求包括请求行、请求头、请求体。" },
    { id: "b12", type: "blank", title: "HTML 中文译为 ____，主要通过标签描述网页内容。", answer: "超文本标记语言", explain: "HTML = HyperText Markup Language。" },
    { id: "b13", type: "blank", title: "自定义 Servlet 可以继承 ____ 或 GenericServlet 类。", answer: "HttpServlet", explain: "Web 开发中常继承 HttpServlet。" },
    { id: "b14", type: "blank", title: "HTTP 请求行的构成包括请求方法、____ 以及 HTTP 协议版本。", answer: "资源路径", alt: ["请求资源路径"], explain: "如：GET /index.html HTTP/1.1。" },
    { id: "b15", type: "blank", title: "JSP 脚本元素包含脚本片段、____ 和输出表达式。", answer: "声明标识", alt: ["声明"], explain: "脚本元素包括声明、脚本片段、表达式。" },
    { id: "b16", type: "blank", title: "Connection 接口表示 Java 程序和数据库的 ____。", answer: "连接", explain: "得到 Connection 后才能访问数据库。" },
    { id: "b17", type: "blank", title: "ServletFileUpload 的 parseRequest 方法返回 ____ 列表。", answer: "List<FileItem>", alt: ["List<FileItem>列表", "FileItem"], explain: "用于解析上传表单项。" },
    { id: "b18", type: "blank", title: "Statement 的 executeUpdate(String sql) 方法适用于 insert、____ 和 delete 语句。", answer: "update", explain: "增删改都用 executeUpdate。" },
    { id: "b19", type: "blank", title: "JDBC 常用 API 中，____ 类用于加载 JDBC 驱动并创建数据库连接。", answer: "DriverManager", explain: "DriverManager.getConnection 获取连接。" },
    { id: "b20", type: "blank", title: "ResultSet 中，移动到最后一行的方法是 ____。", answer: "last()", alt: ["last"], explain: "rs.last() 移动到最后一行。" },
    { id: "b21", type: "blank", title: "Session 相对于 Cookie 安全性更高，因为它把关键数据保存在 ____ 端。", answer: "服务器", alt: ["服务器端", "server"], explain: "Session 数据在服务器端，客户端只保存 sessionId。" },
    { id: "b22", type: "blank", title: "MVC 模式将程序分为模型、视图和 ____。", answer: "控制器", alt: ["Controller", "controller"], explain: "C 是 Controller。" },
    { id: "b23", type: "blank", title: "Servlet 三大作用域对象分别是 request、application 和 ____。", answer: "session", explain: "三大域对象：request、session、application。" },

    { id: "q1", type: "short", title: "简述 JSP 的执行过程。", answer: "第一次请求 JSP 时，服务器先将 JSP 翻译成 Servlet 源文件，再编译成 class 文件，由 Servlet 容器加载执行，最后把结果响应给浏览器。再次访问且 JSP 未修改时，通常直接执行已编译的 Servlet。", explain: "关键词：翻译、编译、加载、执行、响应。" },
    { id: "q2", type: "short", title: "简述 GET 和 POST 的区别。", answer: "GET 常用于查询，参数显示在 URL 中，长度有限，安全性较低；POST 常用于提交数据，参数放在请求体中，数据量较大，安全性相对更高，不直接显示在地址栏。", explain: "从用途、参数位置、数据量、安全性四点答。" },
    { id: "q3", type: "short", title: "简述 Cookie 与 Session 的区别。", answer: "Cookie 保存在客户端，数据量小，安全性较低；Session 保存在服务器端，通过 sessionId 识别用户，安全性较高，但占用服务器资源。", explain: "核心是保存位置不同。" },
    { id: "q4", type: "short", title: "请说明 MVC 三层及每层采用什么技术实现。", answer: "Model 模型层负责数据和业务逻辑，常用 JavaBean/DAO；View 视图层负责页面显示，常用 JSP/HTML/CSS；Controller 控制层负责接收请求和调度，常用 Servlet。", explain: "Model、View、Controller 要对应技术。" },
    { id: "q5", type: "short", title: "简述 JDBC 编程步骤。", answer: "加载驱动；获取数据库连接；创建 Statement 或 PreparedStatement；执行 SQL；处理 ResultSet；关闭资源。", explain: "六步背熟即可。" },
    { id: "q6", type: "short", title: "简述 Filter 的生命周期过程。", answer: "Web 服务器启动时创建 Filter 实例并调用 init 初始化；请求目标资源时，符合映射条件的 Filter 按顺序调用 doFilter；服务器关闭时调用 destroy 销毁 Filter。", explain: "init、doFilter、destroy。" },
    { id: "q7", type: "short", title: "简述 Java Web 项目中登录功能的完整实现流程，包含过滤器权限拦截。", answer: "先编写登录页面提交账号密码到登录 Servlet；后端建立用户表，编写 DAO 查询用户；登录 Servlet 获取参数并校验，成功把用户信息存入 session 并跳转主页，失败返回登录页；编写 LoginFilter 拦截需要登录的资源，若 session 中有用户则放行，否则重定向登录页；最后在 web.xml 或注解中配置 Servlet 和 Filter。", explain: "按前端、数据层、Servlet、Filter、配置五块答。" },
    { id: "q8", type: "short", title: "简述 Servlet 监听器概念，并列举三种常用监听器及作用。", answer: "Servlet 监听器是 Java Web 的事件监听组件，用于监听 ServletContext、HttpSession、ServletRequest 等对象的创建、销毁或属性变化。常用 ServletContextListener 监听应用启动和关闭；HttpSessionListener 监听会话创建和销毁，可统计在线人数；ServletRequestListener 监听请求创建和销毁，可记录日志或计算耗时。", explain: "三类对象：Context、Session、Request。" },
    { id: "q9", type: "short", title: "简述如何将单独 CSS 文件引入 HTML 页面。", answer: "推荐在 HTML 的 head 中使用 link 标签：<link rel=\"stylesheet\" href=\"css/style.css\">。也可以在 style 标签或 CSS 文件顶部使用 @import url(\"文件路径\")，但性能较差，不推荐优先使用。", explain: "主流答案写 link 标签。" },
];

const reviews = [
    ["JSP 执行过程", "JSP -> Servlet 源文件 -> class 文件 -> 容器加载执行 -> HTML 响应。"],
    ["JDBC 六步", "加载驱动；获取连接；创建语句对象；执行 SQL；处理结果；关闭资源。"],
    ["四大作用域", "pageContext 当前页；request 一次请求；session 一次会话；application 整个应用。"],
    ["转发与重定向", "转发用 request.getRequestDispatcher().forward()，地址栏不变，可共享 request；重定向用 response.sendRedirect()，地址栏改变，是新请求。"],
    ["监听器三件套", "ServletContextListener 管应用；HttpSessionListener 管会话；ServletRequestListener 管请求。"],
    ["Filter 生命周期", "init 初始化，doFilter 拦截处理，destroy 销毁。"],
    ["登录权限拦截", "登录成功存 session；过滤器检查 session 中是否有用户；有用户放行，无用户回登录页。"],
    ["JavaBean 特点", "public 类、无参构造、属性私有、getter/setter、可复用。"]
];

const codeTemplates = [
    {
        title: "RegisterServlet 参数非空校验标准答案",
        source: "截图真题无参考答案：AI 根据题目要求整理",
        code: `// RegisterServlet：接收 username、age、email，非空校验后使用请求转发
public class RegisterServlet extends HttpServlet {
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        // 1. 设置请求和响应编码，解决中文乱码
        request.setCharacterEncoding("UTF-8");
        response.setContentType("text/html;charset=UTF-8");

        // 2. 获取前端 JSP 表单提交的三个参数
        String username = request.getParameter("username");
        String age = request.getParameter("age");
        String email = request.getParameter("email");

        // 3. 非空校验：任意一个为空，都转发回注册页并提示错误
        if (isEmpty(username) || isEmpty(age) || isEmpty(email)) {
            request.setAttribute("error", "用户名、年龄和邮箱不能为空");
            request.getRequestDispatcher("/register.jsp").forward(request, response);
            return;
        }

        // 4. 校验通过后，把用户数据保存到 request 域
        request.setAttribute("username", username);
        request.setAttribute("age", age);
        request.setAttribute("email", email);

        // 5. 使用请求转发跳转成功页，题目要求不能使用重定向
        request.getRequestDispatcher("/success.jsp").forward(request, response);
    }

    // 判断字符串是否为空
    private boolean isEmpty(String value) {
        return value == null || value.trim().length() == 0;
    }
}`
    },
    {
        title: "ChineseServlet 输出中文标准答案",
        source: "题库设计题：按标准答案格式整理",
        code: `// ChineseServlet：向浏览器输出中文内容
public class ChineseServlet extends HttpServlet {
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        // 设置响应内容类型和字符编码，防止中文乱码
        response.setContentType("text/html;charset=UTF-8");

        // 获取字符输出流，向浏览器输出中文
        PrintWriter out = response.getWriter();
        out.println("欢迎学习程序设计课程");
        out.close();
    }
}`
    },
    {
        title: "两个 Servlet 转发求和标准答案",
        source: "题库设计题：按标准答案格式整理",
        code: `// Servlet1：接收 first 和 second 参数，计算和后保存到 request 域
public class Servlet1 extends HttpServlet {
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        // 获取请求参数并转换为 int 类型
        int first = Integer.parseInt(request.getParameter("first"));
        int second = Integer.parseInt(request.getParameter("second"));

        // 把计算结果保存到请求作用域
        request.setAttribute("sum", first + second);

        // 请求转发给 url 为 /output 的 Servlet2
        request.getRequestDispatcher("/output").forward(request, response);
    }
}

// Servlet2：取出 request 域中的 sum 并输出到浏览器
public class Servlet2 extends HttpServlet {
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        // 设置响应编码，解决中文乱码
        response.setContentType("text/html;charset=UTF-8");

        // 输出 Servlet1 计算出的结果
        PrintWriter out = response.getWriter();
        out.println("计算结果为：" + request.getAttribute("sum"));
        out.close();
    }
}`
    },
    {
        title: "JDBC 增删改标准答案",
        source: "来自 jw2(1).docx：已规范化并补充注释",
        code: `// 1. 加载 MySQL 数据库驱动
Class.forName("com.mysql.jdbc.Driver");

// 2. 准备数据库连接信息
String url = "jdbc:mysql://localhost:3306/test?useUnicode=true&characterEncoding=UTF-8";
String username = "root";
String password = "root";

// 3. 获取数据库连接
Connection conn = DriverManager.getConnection(url, username, password);

// 4. 创建 Statement 对象，用于执行 SQL
Statement st = conn.createStatement();

// 5. 执行增加操作
st.executeUpdate("insert into user values('5','2202','nv')");

// 执行修改操作
// st.executeUpdate("update user set name='2306' where name='2202'");

// 执行删除操作
// st.executeUpdate("delete from user where name='2302'");

// 6. 关闭资源，先关闭 Statement，再关闭 Connection
st.close();
conn.close();`
    },
    {
        title: "JavaBean User 类标准答案",
        source: "来自题库/JW2 文件：已按 JavaBean 规范整理",
        code: `// User 类：标准 JavaBean，属性私有，并提供 getter/setter 方法
public class User {
    // 用户名
    private String uname;

    // 用户密码
    private String upassword;

    // 获取用户名
    public String getUname() {
        return uname;
    }

    // 设置用户名
    public void setUname(String uname) {
        this.uname = uname;
    }

    // 获取用户密码
    public String getUpassword() {
        return upassword;
    }

    // 设置用户密码
    public void setUpassword(String upassword) {
        this.upassword = upassword;
    }
}`
    }
];

const typeNames = {
    single: "选择题",
    judge: "判断题",
    blank: "填空题",
    short: "简答题"
};

const state = {
    filter: "all",
    answered: JSON.parse(localStorage.getItem("jw_answered") || "{}"),
    wrong: JSON.parse(localStorage.getItem("jw_wrong") || "[]")
};

function normalize(value) {
    return String(value || "").replace(/\s+/g, "").toLowerCase();
}

function saveState() {
    localStorage.setItem("jw_answered", JSON.stringify(state.answered));
    localStorage.setItem("jw_wrong", JSON.stringify(state.wrong));
    updateScore();
}

function updateScore() {
    const total = questions.length;
    const correct = Object.values(state.answered).filter(Boolean).length;
    document.getElementById("scoreText").textContent = `${correct} / ${total}`;
}

function filteredQuestions() {
    if (state.filter === "all") return questions;
    return questions.filter(q => q.type === state.filter);
}

function renderQuestions(list, targetId) {
    const target = document.getElementById(targetId);
    if (!list.length) {
        target.innerHTML = `<div class="question-card"><p class="muted">这里暂时没有题。</p></div>`;
        return;
    }

    target.innerHTML = list.map((q, index) => {
        const controls = renderControls(q);
        return `<article class="question-card" data-id="${q.id}">
            <div class="q-meta">
                <span>${typeNames[q.type]} · ${index + 1}</span>
                <span>${state.answered[q.id] ? "已掌握" : "待练习"}</span>
            </div>
            <div class="q-title">${escapeHtml(q.title)}</div>
            ${controls}
            <div class="card-actions">
                <button class="primary check-btn">提交答案</button>
                <button class="show-answer">看答案</button>
            </div>
            <div class="result"></div>
        </article>`;
    }).join("");
}

function renderControls(q) {
    if (q.type === "single") {
        return `<div class="options">${q.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            return `<label class="option">
                <input type="radio" name="${q.id}" value="${letter}">
                <span>${letter}. ${escapeHtml(opt)}</span>
            </label>`;
        }).join("")}</div>`;
    }

    if (q.type === "judge") {
        return `<div class="options">
            <label class="option"><input type="radio" name="${q.id}" value="对"><span>对</span></label>
            <label class="option"><input type="radio" name="${q.id}" value="错"><span>错</span></label>
        </div>`;
    }

    if (q.type === "short") {
        return `<textarea class="answer-input" rows="4" placeholder="先自己默写，再点提交查看参考答案"></textarea>`;
    }

    return `<input class="answer-input" placeholder="输入答案">`;
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

function getQuestion(id) {
    return questions.find(q => q.id === id);
}

function getUserAnswer(card, q) {
    if (q.type === "single" || q.type === "judge") {
        const checked = card.querySelector("input:checked");
        return checked ? checked.value : "";
    }
    return card.querySelector(".answer-input").value;
}

function isCorrect(q, value) {
    if (q.type === "short") {
        return normalize(value).length >= 8;
    }
    const answers = [q.answer, ...(q.alt || [])].map(normalize);
    return answers.includes(normalize(value));
}

function showResult(card, q, correct, forceAnswer = false) {
    const result = card.querySelector(".result");
    result.className = `result visible ${correct ? "correct" : "wrong"}`;
    const label = correct ? "答对了" : "再背一下";
    const answer = q.type === "short" || forceAnswer ? `<br><strong>参考答案：</strong>${escapeHtml(q.answer)}` : `<br><strong>正确答案：</strong>${escapeHtml(q.answer)}`;
    result.innerHTML = `<strong>${label}</strong>${answer}<br><strong>解析：</strong>${escapeHtml(q.explain || "")}`;
}

function markWrong(id, wrong) {
    const set = new Set(state.wrong);
    if (wrong) set.add(id);
    else set.delete(id);
    state.wrong = Array.from(set);
}

function bindQuestionEvents() {
    document.addEventListener("click", event => {
        const checkBtn = event.target.closest(".check-btn");
        const showBtn = event.target.closest(".show-answer");
        if (!checkBtn && !showBtn) return;

        const card = event.target.closest(".question-card");
        const q = getQuestion(card.dataset.id);
        const value = getUserAnswer(card, q);

        if (showBtn) {
            showResult(card, q, false, true);
            markWrong(q.id, true);
            saveState();
            renderWrong();
            return;
        }

        const correct = isCorrect(q, value);
        state.answered[q.id] = correct;
        markWrong(q.id, !correct);
        showResult(card, q, correct);
        saveState();
        renderWrong();
    });
}

function renderPractice() {
    renderQuestions(filteredQuestions(), "questionList");
}

function renderWrong() {
    const wrongQs = state.wrong.map(getQuestion).filter(Boolean);
    renderQuestions(wrongQs, "wrongList");
}

function renderReview() {
    document.getElementById("reviewList").innerHTML = reviews.map(([title, body]) => `
        <article class="review-card">
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(body)}</p>
        </article>
    `).join("");
}

function renderCode() {
    document.getElementById("codeList").innerHTML = codeTemplates.map((item, i) => `
        <article class="code-card">
            <header>
                <div class="code-title">
                    <h3>${escapeHtml(item.title)}</h3>
                    <span class="source-tag">${escapeHtml(item.source)}</span>
                </div>
                <button class="copy-btn" data-code="${i}">复制</button>
            </header>
            <pre><code>${escapeHtml(item.code)}</code></pre>
        </article>
    `).join("");
}

function switchView(name) {
    document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.view === name));
    document.querySelectorAll(".view").forEach(view => view.classList.remove("active"));
    document.getElementById(`${name}View`).classList.add("active");
}

function initNav() {
    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.addEventListener("click", () => switchView(btn.dataset.view));
    });

    document.querySelectorAll(".chip").forEach(chip => {
        chip.addEventListener("click", () => {
            state.filter = chip.dataset.type;
            document.querySelectorAll(".chip").forEach(item => item.classList.toggle("active", item === chip));
            renderPractice();
        });
    });

    document.getElementById("randomBtn").addEventListener("click", () => {
        const list = filteredQuestions();
        const q = list[Math.floor(Math.random() * list.length)];
        renderQuestions([q], "questionList");
    });

    document.getElementById("resetBtn").addEventListener("click", () => {
        if (!confirm("确定清空全部练习进度吗？")) return;
        state.answered = {};
        state.wrong = [];
        saveState();
        renderPractice();
        renderWrong();
    });

    document.getElementById("clearWrongBtn").addEventListener("click", () => {
        state.wrong = [];
        saveState();
        renderWrong();
    });
}

function initCopy() {
    document.addEventListener("click", async event => {
        const btn = event.target.closest(".copy-btn");
        if (!btn) return;
        const code = codeTemplates[Number(btn.dataset.code)].code;
        await navigator.clipboard.writeText(code);
        btn.textContent = "已复制";
        setTimeout(() => btn.textContent = "复制", 1200);
    });
}

function initImageModal() {
    const modal = document.getElementById("imageModal");
    const img = document.getElementById("modalImage");
    const zoomText = document.getElementById("zoomText");
    let zoom = 1;

    function applyZoom() {
        img.style.transform = `scale(${zoom})`;
        zoomText.textContent = `${Math.round(zoom * 100)}%`;
    }

    document.querySelectorAll(".source-card").forEach(card => {
        card.addEventListener("click", () => {
            zoom = 1;
            img.src = card.dataset.img;
            modal.hidden = false;
            applyZoom();
        });
    });

    document.getElementById("closeModalBtn").addEventListener("click", () => modal.hidden = true);
    document.getElementById("zoomInBtn").addEventListener("click", () => {
        zoom = Math.min(4, zoom + 0.25);
        applyZoom();
    });
    document.getElementById("zoomOutBtn").addEventListener("click", () => {
        zoom = Math.max(0.25, zoom - 0.25);
        applyZoom();
    });
    modal.addEventListener("wheel", event => {
        if (modal.hidden) return;
        event.preventDefault();
        zoom = Math.max(0.25, Math.min(4, zoom + (event.deltaY < 0 ? 0.1 : -0.1)));
        applyZoom();
    }, { passive: false });
}

initNav();
bindQuestionEvents();
initCopy();
initImageModal();
renderPractice();
renderWrong();
renderReview();
renderCode();
updateScore();
