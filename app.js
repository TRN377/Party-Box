(() => {
  "use strict";

  const STORAGE_KEY = "party-box-game-v1";
  const games = [
    { id: "quick", name: "تحدي ٥ ثوانٍ", icon: "⚡" },
    { id: "charades", name: "بدون كلام", icon: "🎭" },
    { id: "auction", name: "المزاد", icon: "🔨" },
    { id: "connection", name: "وش الرابط؟", icon: "🧩" },
    { id: "bomb", name: "قنبلة الحروف", icon: "💣" },
    { id: "closest", name: "الأقرب يكسب", icon: "🎯" }
  ];
  const questions = {
    quick: [
      "اذكر ٣ أشياء تجدها في المطار", "اذكر ٣ أندية إسبانية", "اذكر ٣ دول تبدأ بحرف الميم",
      "اذكر ٣ أشياء لونها أحمر", "اذكر ٣ أكلات تؤكل باردة", "اذكر ٣ أشياء نأخذها في رحلة تخييم",
      "اذكر ٣ حيوانات تعيش في البحر", "اذكر ٣ أشياء تستخدمها في المطبخ", "اذكر ٣ مدن عربية",
      "اذكر ٣ أشياء تصدر صوتًا", "اذكر ٣ رياضات تلعب بالكرة", "اذكر ٣ أشياء تجدها في المدرسة"
    ],
    charades: [
      "طبيب أسنان", "رائد فضاء", "قطة خائفة", "لاعب كرة يسجل هدفًا", "طاهٍ يحرق الطعام",
      "شخص يبحث عن هاتفه", "بطريق يمشي", "سائق عالق في الزحام", "مصور يلتقط صورة",
      "شخص يفتح هدية", "مظلة في يوم عاصف", "روبوت يتعلم الرقص", "صياد سمك", "نجم سينمائي"
    ],
    auction: [
      "كم عاصمة لدولة أوروبية تستطيعون ذكرها؟", "كم حيوانًا يبدأ اسمه بحرف (س) تستطيعون ذكره؟",
      "كم دولة أفريقية تستطيعون تسميتها؟", "كم فيلمًا كرتونيًا تستطيعون ذكره؟",
      "كم نوعًا من الفاكهة تستطيعون تسميته؟", "كم لاعبًا عربيًا مشهورًا تستطيعون ذكره؟"
    ],
    connection: [
      { words: ["برج إيفل", "كرواسون", "زيدان", "نابليون"], answer: "فرنسا" },
      { words: ["قهوة", "تمر", "دلة", "مجلس"], answer: "الضيافة العربية" },
      { words: ["عقرب", "جمل", "واحة", "كثبان"], answer: "الصحراء" },
      { words: ["مفتاح", "باب", "قفل", "جرس"], answer: "المنزل" },
      { words: ["قمر", "نجوم", "مركبة", "رائد"], answer: "الفضاء" },
      { words: ["موز", "قرد", "غابة", "كرمة"], answer: "الغابة الاستوائية" },
      { words: ["ملعب", "صافرة", "حكم", "مدرج"], answer: "مباراة كرة القدم" }
    ],
    bomb: [
      { letter: "م", category: "اسم أكلة" }, { letter: "س", category: "اسم حيوان" },
      { letter: "ب", category: "اسم مدينة" }, { letter: "ك", category: "شيء في المنزل" },
      { letter: "ع", category: "اسم دولة" }, { letter: "ت", category: "اسم فاكهة" },
      { letter: "ن", category: "مهنة" }, { letter: "ر", category: "شيء في المدرسة" }
    ],
    closest: [
      { question: "كم يبلغ ارتفاع برج خليفة بالمتر؟", answer: 828, unit: "متر" },
      { question: "كم عدد عظام جسم الإنسان البالغ؟", answer: 206, unit: "عظمة" },
      { question: "كم عدد ألوان قوس قزح؟", answer: 7, unit: "ألوان" },
      { question: "في أي عام هبط الإنسان على القمر؟", answer: 1969, unit: "ميلادي" },
      { question: "كم عدد كواكب المجموعة الشمسية؟", answer: 8, unit: "كواكب" },
      { question: "كم يبلغ طول ملعب كرة القدم تقريبًا بالمتر؟", answer: 105, unit: "متر" },
      { question: "كم عدد مفاتيح البيانو القياسي؟", answer: 88, unit: "مفتاحًا" },
      { question: "ما درجة غليان الماء عند سطح البحر بالسلسيوس؟", answer: 100, unit: "درجة" }
    ]
  };
  const initialState = {
    screen: "welcome",
    teams: [{ name: "فريق A", score: 0 }, { name: "فريق B", score: 0 }],
    totalRounds: 5,
    round: 0,
    doublePoints: true,
    sound: true,
    volume: .45,
    previousGame: null,
    currentGame: null,
    challenge: null,
    paused: false,
    timer: null,
    suddenDeath: false,
    spinBusy: false
  };
  const query = new URLSearchParams(location.search);
  const validRoles = ["judge", "display", "team-a", "team-b"];
  const networkMode = location.protocol === "http:" || location.protocol === "https:";
  const supabaseConfig = window.PARTYBOX_SUPABASE || {};
  const cloudMode = networkMode && Boolean(supabaseConfig.url && supabaseConfig.publishableKey);
  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(location.hostname) || location.port === "8000";
  const cloudConfigMissing = networkMode && !cloudMode && !isLocalHost;
  let screenRole = networkMode && validRoles.includes(query.get("screen")) ? query.get("screen") : null;
  let roomCode = networkMode ? (query.get("room") || "").toUpperCase() : "";
  let roomReady = !networkMode || !screenRole;
  const activeStorageKey = cloudMode && roomCode ? `${STORAGE_KEY}-${roomCode}` : STORAGE_KEY;
  const roleTokens = {
    judge: query.get("jt") || "",
    display: query.get("dt") || "",
    "team-a": query.get("at") || "",
    "team-b": query.get("bt") || ""
  };
  if (screenRole && query.get("token")) roleTokens[screenRole] = query.get("token");
  let serverRevision = 0;
  let lastActionId = 0;
  let writeQueue = Promise.resolve();
  let polling = false;
  let realtimeStart = null;
  let realtimeClient = null;
  let realtimeActionChannel = null;
  let realtimePresenceChannel = null;
  let realtimePublishChannels = {};
  let supabaseSdkPromise = null;
  let qrCodePromise = null;
  let lastTimerSync = 0;
  let connectedRoles = [];
  let pairedSignature = "";
  let networkMessage = "";
  let pollDelay = 350;
  let teamDraft = { bid: "", count: "", guess: "" };
  let state = loadState() || structuredClone(initialState);
  if (cloudMode && screenRole === "judge" && state.screen !== "welcome") roomReady = true;
  let ticker = null;
  let spinTimeout = null;
  let toastTimeout = null;
  let audioContext = null;
  let lastBeepSecond = null;

  const screen = document.querySelector("#screen");
  const scoreboard = document.querySelector("#scoreboard");
  const roomTools = document.querySelector("#room-tools");
  const toast = document.querySelector("#toast");

  function loadState() {
    try {
      const saved = localStorage.getItem(activeStorageKey);
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (!parsed || !Array.isArray(parsed.teams) || parsed.teams.length !== 2) return null;
      const restored = { ...structuredClone(initialState), ...parsed, paused: Boolean(parsed.paused), spinBusy: false };
      if (restored.currentGame === "charades" && restored.challenge) {
        const c = restored.challenge;
        const firstTeam = restored.round % 2;
        c.turnOrder = Array.isArray(c.turnOrder) ? c.turnOrder : [firstTeam, 1 - firstTeam];
        c.turnIndex = Number.isInteger(c.turnIndex) && c.turnIndex >= 0 && c.turnIndex < 2 ? c.turnIndex : 0;
        c.turn = c.turnOrder[c.turnIndex];
        c.skips = Array.isArray(c.skips) ? c.skips : [Number(c.skips) || 0, 0];
      }
      return restored;
    } catch (error) {
      console.warn("تعذر استعادة اللعبة المحفوظة:", error);
      return null;
    }
  }

  function saveState() {
    try { localStorage.setItem(activeStorageKey, JSON.stringify(state)); }
    catch (error) { console.warn("تعذر حفظ حالة اللعبة:", error); }
    if (!networkMode || screenRole !== "judge" || !roomCode || !roomReady) return;
    const snapshot = JSON.parse(JSON.stringify(state));
    if (cloudMode) {
      writeQueue = writeQueue.then(async () => {
        await connectRealtime();
        await publishRealtimeState(snapshot);
      }).catch(error => {
        console.error("تعذرت مزامنة حالة اللعبة:", error);
        showToast(friendlyNetworkError(error));
      });
      return;
    }
    writeQueue = writeQueue.then(async () => {
      const response = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: roomCode, role: screenRole, state: snapshot })
      });
      const result = await readApiResponse(response);
      serverRevision = result.revision;
    }).catch(error => {
      console.error("تعذرت مزامنة حالة اللعبة:", error);
      showToast(friendlyNetworkError(error));
    });
  }

  async function readApiResponse(response) {
    const body = await response.text();
    let result;
    try { result = body ? JSON.parse(body) : null; }
    catch { result = null; }
    if (!result || typeof result !== "object") {
      throw new Error("ردّ الخادم غير صالح. شغّلوا python server.py وافتحوا العنوان الذي يظهر في نافذته، بدل Live Server.");
    }
    if (!response.ok) throw new Error(result.error || `تعذر الطلب (${response.status}).`);
    return result;
  }

  function friendlyNetworkError(error) {
    if (cloudMode) {
      return "تعذر الاتصال بخدمات Supabase. تحققوا من الإنترنت وإعدادات المشروع في supabase-config.js.";
    }
    if (error instanceof TypeError) {
      return "تعذر الاتصال بخادم اللعبة. شغّلوا python server.py وافتحوا العنوان الذي يظهر في نافذته.";
    }
    return error.message;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }
  function gameById(id) { return games.find(game => game.id === id); }
  function teamName(index) { return state.teams[index].name; }
  function activeTeam() { return state.round % 2; }
  function isDoubleRound() { return state.doublePoints && !state.suddenDeath && state.round >= state.totalRounds - 2; }
  function multiplier() { return isDoubleRound() ? 2 : 1; }
  function currentTimerMs() {
    if (!state.timer) return 0;
    return state.timer.active ? Math.max(0, state.timer.endsAt - Date.now()) : state.timer.remainingMs;
  }

  function render() {
    if (networkMode) {
      if (!screenRole || !roomCode) {
        roomTools.hidden = true;
        scoreboard.hidden = true;
        if (cloudConfigMissing) renderCloudSetupRequired();
        else renderNetworkHome(screenRole);
        return;
      }
      if (cloudMode && (!roleTokens[screenRole] || !roleTokens.display)) {
        roomTools.hidden = true;
        scoreboard.hidden = true;
        screen.innerHTML = `<section class="page narrow center"><div class="hero-mark">🔒</div>
          <div class="eyebrow">رابط غير مكتمل</div><h2>امسحوا رمز QR الخاص بجهازكم</h2>
          <p class="lead center">رابط هذا الدور يحتاج رمز اتصال خاصًا. ارجعوا إلى شاشة العرض وامسحوا رمز QR الصحيح.</p></section>`;
        return;
      }
      renderRoomTools();
      if (!roomReady) {
        renderWaitingScreen();
        return;
      }
      if (screenRole !== "judge") {
        if (screenRole === "display") renderDisplayScreen();
        else renderTeamScreen();
        saveState();
        return;
      }
    }
    renderScoreboard();
    if (state.paused) { renderPause(); saveState(); return; }
    if (state.screen === "welcome") renderWelcome();
    else if (state.screen === "setup") renderSetup();
    else if (state.screen === "wheel") renderWheel();
    else if (state.screen === "game") renderGame();
    else if (state.screen === "results") renderResults();
    saveState();
  }

  function renderScoreboard() {
    const active = ["wheel", "game", "results"].includes(state.screen);
    scoreboard.hidden = !active;
    if (!active) return;
    const roundLabel = state.suddenDeath ? "جولة فاصلة" : `الجولة ${Math.min(state.round + 1, state.totalRounds)}`;
    scoreboard.innerHTML = `${scoreTeamMarkup(0)}
      <div class="round-indicator"><strong>${roundLabel}</strong><span>${state.suddenDeath ? "كسر التعادل" : `من ${state.totalRounds}`}</span></div>
      ${scoreTeamMarkup(1)}`;
  }

  function scoreTeamMarkup(index) {
    const team = state.teams[index];
    const tools = state.screen === "results" || (networkMode && screenRole !== "judge") ? "" : `<div class="score-tools" aria-label="تعديل نقاط ${escapeHtml(team.name)}">
      <button data-score="${index}:1" aria-label="إضافة نقطة">+</button>
      <button data-score="${index}:-1" aria-label="خصم نقطة">−</button>
    </div>`;
    return `<div class="team-score team-${index ? "b" : "a"}">
      <div class="team-identity"><span class="team-label">الفريق ${index ? "B" : "A"}</span><span class="team-name">${escapeHtml(team.name)}</span></div>
      <strong class="score-number">${team.score}</strong>
      ${tools}
    </div>`;
  }

  function renderRoomTools() {
    const visible = (screenRole === "judge" || screenRole === "display") && Boolean(roomCode);
    roomTools.hidden = !visible;
    if (!visible) return;
    if (screenRole === "judge") {
      roomTools.innerHTML = `<div class="room-summary"><strong>رمز الغرفة: ${escapeHtml(roomCode)}</strong><span>أجهزة متصلة: ${connectedRoles.length}/٤</span>
        <p>شاشة العرض تعرض الجولة، وكل فريق يتحكم من جواله. شاشة الممثل تعرض كلمته فقط.</p>
        ${networkMessage ? `<div class="notice">${escapeHtml(networkMessage)}</div>` : ""}</div>`;
      return;
    }
    const steps = [
      { role: "judge", label: "١ · الحكم", instruction: "خلّ الحكم يمسح الرمز أولًا من جواله." },
      { role: "team-a", label: "٢ · الفريق الأول", instruction: "الحكم اتصل. امسحوا الرمز بجوال الفريق الأول." },
      { role: "team-b", label: "٣ · الفريق الثاني", instruction: "الفريق الأول اتصل. امسحوا الرمز بجوال الفريق الثاني." }
    ];
    const step = steps.find(item => !connectedRoles.includes(item.role));
    if (!step) {
      roomTools.innerHTML = `<div class="room-summary"><strong>اكتمل الربط · ${escapeHtml(roomCode)}</strong><span>الحكم والفريقان متصلون</span></div>`;
      return;
    }
    roomTools.innerHTML = `<div class="pairing-layout"><div><div class="eyebrow">ربط الجوالات · ${step.label}</div>
        <h2>${step.instruction}</h2><p class="lead">امسحوا الرمز بكاميرا الجوال. سيفتح دوركم مباشرة في المتصفح.</p>
        <div class="room-summary"><strong>رمز الغرفة: ${escapeHtml(roomCode)}</strong><span>${connectedRoles.length}/٤ أجهزة متصلة</span></div>
          ${networkMessage ? `<div class="notice">${escapeHtml(networkMessage)}</div>` : ""}
      </div>${cloudMode
        ? `<div id="pairing-qr" class="pairing-qr" role="img" aria-label="رمز QR لربط ${escapeHtml(step.label)}"></div>`
        : `<img class="pairing-qr" src="/api/qr?room=${encodeURIComponent(roomCode)}&role=${encodeURIComponent(step.role)}&v=${step.role}" alt="رمز QR لربط ${escapeHtml(step.label)}">`}
      </div>`;
    if (cloudMode) {
      const qrTarget = roomTools.querySelector("#pairing-qr");
      if (typeof window.QRCode !== "function") {
        qrTarget.textContent = "جارٍ تحميل رمز QR…";
        loadQrCodeLibrary().then(() => renderRoomTools()).catch(error => {
          qrTarget.textContent = "تعذر تحميل مولّد QR. تحققوا من اتصال الإنترنت.";
          console.error("تعذر تحميل مكتبة QR:", error);
        });
        return;
      }
      new window.QRCode(qrTarget, {
        text: makeRoleUrl(step.role),
        width: 240,
        height: 240,
        colorDark: "#11142b",
        colorLight: "#ffffff",
        correctLevel: window.QRCode.CorrectLevel.M
      });
    }
  }

  function renderCloudSetupRequired() {
    screen.innerHTML = `<section class="page narrow">
      <div class="hero-mark">☁</div><div class="eyebrow">اللعب عبر الإنترنت</div>
      <div class="card setup-card">
        <h2>أكملوا إعداد Supabase</h2>
        <p class="lead">أضيفوا رابط مشروع Supabase والمفتاح العام إلى <code>supabase-config.js</code>، ثم انشروا الموقع على GitHub Pages. لا تضعوا مفتاح secret أو service_role في الموقع.</p>
        ${networkMessage ? `<div class="notice">${escapeHtml(networkMessage)}</div>` : ""}
      </div>
    </section>`;
  }

  function renderNetworkHome(preselectedRole = null) {
    const requestedRole = preselectedRole && preselectedRole !== "judge";
    screen.innerHTML = `<section class="page narrow">
      <div class="hero-mark">✦</div><div class="eyebrow">${cloudMode ? "اللعب عبر الإنترنت" : "اللعب على الشبكة المحلية"}</div>
      <div class="card setup-card">
        <h2>أربع شاشات، <span class="gradient-text">لعبة واحدة</span></h2>
        <p class="lead">${cloudMode
          ? "تعمل الشاشات عبر الإنترنت. أنشئوا الغرفة من شاشة العرض، ثم امسحوا الرموز بالتتابع: الحكم، والفريق الأول، والفريق الثاني."
          : "اتصلوا بنفس شبكة Wi‑Fi. شاشة العرض تنشئ الغرفة، ثم امسحوا الرموز بالتتابع: الحكم، والفريق الأول، والفريق الثاني."}</p>
        ${networkMessage ? `<div class="notice">${escapeHtml(networkMessage)}</div>` : ""}
        ${requestedRole && cloudMode ? `<p class="notice">للانضمام عبر الإنترنت، امسحوا رمز QR المخصص لهذا الدور من شاشة العرض.</p>` : ""}
        ${requestedRole && !cloudMode ? `<p class="notice">أدخلوا رمز الغرفة للانضمام إلى ${preselectedRole === "display" ? "شاشة العرض" : preselectedRole === "team-a" ? "الفريق الأول" : "الفريق الثاني"}.</p>` : ""}
        ${requestedRole && !cloudMode ? `<div class="field"><label for="room-code-input">رمز الغرفة</label><input id="room-code-input" maxlength="5" autocomplete="off" placeholder="مثال: A2BCD" style="text-transform:uppercase"></div>` : ""}
        <div class="actions" style="margin-top:20px">
          ${requestedRole && !cloudMode ? `<button class="button gold" data-action="join-room" data-role="${preselectedRole}">انضم إلى الشاشة</button>` : ""}
          ${!requestedRole ? `<button class="button gold" data-action="create-room">ابدأ الربط واعرض رمز الحكم</button>` : ""}
        </div>
      </div>
    </section>`;
  }

  function renderWaitingScreen() {
    if (!roomCode) {
      renderNetworkHome(screenRole);
      return;
    }
    if (screenRole === "judge") {
      screen.innerHTML = `<section class="page narrow center"><div class="hero-mark">📱</div><div class="eyebrow">الحكم · رمز ${escapeHtml(roomCode)}</div><h2>تم ربط الحكم</h2>
        <p class="lead center">بعد ربط الفريقين، أدخلوا أسماءهم واختاروا الجولات ثم ابدؤوا اللعب.</p>
        ${networkMessage ? `<div class="notice">${escapeHtml(networkMessage)}</div>` : ""}
        <button class="button gold" data-action="prepare-game">تجهيز اللعبة</button></section>`;
      return;
    }
    if (screenRole === "display") {
      const paired = ["judge", "team-a", "team-b"].every(role => connectedRoles.includes(role));
      screen.innerHTML = `<section class="page center"><div class="eyebrow">شاشة العرض · ${escapeHtml(roomCode)}</div>
        <h2>${paired ? "اكتمل ربط الحكم والفريقين" : "اربطوا الجوالات بالترتيب"}</h2>
        <p class="lead center">${paired ? "الحكم يستطيع الآن تجهيز اللعبة من جواله." : "الحكم أولًا، ثم الفريق الأول، ثم الفريق الثاني. يتغير رمز QR تلقائيًا بعد كل اتصال."}</p>
        ${networkMessage ? `<div class="notice">${escapeHtml(networkMessage)}</div>` : ""}</section>`;
      return;
    }
    screen.innerHTML = `<section class="page narrow center"><div class="hero-mark">⌛</div><div class="eyebrow">${screenRole === "display" ? "شاشة العرض" : screenRole === "team-a" ? "الفريق الأول" : "الفريق الثاني"}</div>
      <h2>بانتظار الحكم</h2><p class="lead center">رمز الغرفة <strong>${escapeHtml(roomCode)}</strong>. ستبدأ الشاشة تلقائيًا عند تجهيز اللعبة.</p>
      ${networkMessage ? `<div class="notice">${escapeHtml(networkMessage)}</div>` : ""}</section>`;
  }

  function applyRemoteState(remoteState) {
    if (!remoteState || typeof remoteState !== "object") return;
    state = { ...structuredClone(initialState), ...remoteState, paused: Boolean(remoteState.paused), spinBusy: false };
    if (state.currentGame === "charades" && state.challenge) {
      const c = state.challenge;
      const firstTeam = state.round % 2;
      c.turnOrder = Array.isArray(c.turnOrder) ? c.turnOrder : [firstTeam, 1 - firstTeam];
      c.turnIndex = Number.isInteger(c.turnIndex) && c.turnIndex >= 0 && c.turnIndex < 2 ? c.turnIndex : 0;
      c.turn = c.turnOrder[c.turnIndex];
      c.skips = Array.isArray(c.skips) ? c.skips : [Number(c.skips) || 0, 0];
    }
    if (screenRole === "judge" && state.timer?.active) {
      state.timer.remainingMs = currentTimerMs();
      state.timer.active = false;
      state.paused = true;
    }
    roomReady = true;
  }

  function renderDisplayScreen() {
    renderScoreboard();
    if (state.paused) renderPause();
    else if (state.screen === "setup") {
      screen.innerHTML = `<section class="page center"><div class="hero-mark">✦</div><div class="eyebrow">استعدوا</div><h2>الحكم يجهّز المنافسة</h2><p class="lead center">ستظهر الجولة الأولى هنا قريبًا.</p></section>`;
    } else if (state.screen === "welcome") renderWelcome();
    else if (state.screen === "wheel") renderWheel();
    else if (state.screen === "game") renderGame();
    else if (state.screen === "results") renderResults();
    if (screenRole === "display" && state.currentGame === "charades" && state.challenge && state.challenge.mode !== "public") {
      const privateWord = screen.querySelector(".secret-word");
      if (privateWord) privateWord.textContent = "الكلمة تظهر للممثل على جواله";
    }
    screen.querySelectorAll("button, input, select, label").forEach(element => element.remove());
  }

  function renderTeamScreen() {
    scoreboard.hidden = true;
    if (state.paused) {
      screen.innerHTML = `<section class="page narrow center"><div class="hero-mark">Ⅱ</div><div class="eyebrow">استراحة</div><h2>اللعبة متوقفة مؤقتًا</h2><p class="lead center">انتظروا الحكم ليستأنف اللعب.</p></section>`;
      return;
    }
    if (state.screen === "setup" || state.screen === "welcome") {
      screen.innerHTML = `<section class="page narrow center"><div class="hero-mark">⌛</div><h2>بانتظار بداية اللعبة</h2><p class="lead center">سيظهر التحدي هنا بعد أن يبدأ الحكم.</p></section>`;
      return;
    }
    const team = screenRole === "team-a" ? 0 : 1;
    const name = teamName(team);
    let content = "";
    if (state.screen === "results") {
      const winner = state.teams[0].score === state.teams[1].score ? null : state.teams[0].score > state.teams[1].score ? 0 : 1;
      content = `<div class="notice">${winner === null ? "انتهت اللعبة بالتعادل." : `الفائز: ${escapeHtml(teamName(winner))}`}</div>`;
    } else if (state.screen === "wheel") {
      content = `<div class="notice">الحكم يختار تحدي الجولة ${state.round + 1}.</div>`;
    } else if (state.screen === "game" && state.challenge) {
      content = teamGameMarkup(team);
    }
    screen.innerHTML = `<section class="page narrow team-page">
      <div class="team-phone-score"><div><span>الفريق ${team ? "الثاني" : "الأول"}</span><strong>${escapeHtml(name)}</strong></div><b>${state.teams[team].score}</b></div>
      <div class="card setup-card"><div class="eyebrow">${state.screen === "game" ? `${gameById(state.currentGame).icon} ${gameById(state.currentGame).name}` : "شاشة الفريق"}</div>
        <div class="challenge-sub">${state.screen === "game" ? `الجولة ${state.round + 1} من ${state.totalRounds}` : "متصل بالغرفة"}</div>${content}</div>
    </section>`;
  }

  function teamGameMarkup(team) {
    const c = state.challenge;
    const game = state.currentGame;
    if (c.done) return `<div class="notice">${escapeHtml(c.outcome || "انتهى التحدي.")}</div><p class="lead center">انتظروا الجولة التالية.</p>`;
    if (game === "quick") {
      const myTurn = team === activeTeam();
      return `<h2 class="challenge-question">${escapeHtml(c.question)}</h2>${timerMarkup()}
        ${myTurn && state.timer ? `<button class="button gold block touch-button" data-remote-action="team-answer" ${c.buzzed === team ? "disabled" : ""}>${c.buzzed === team ? "وصل طلب الإجابة للحكم" : "نريد الإجابة 🔔"}</button>` : myTurn ? `<div class="notice">انتظروا الحكم لبدء المؤقت.</div>` : `<div class="notice">الدور الآن على ${escapeHtml(teamName(activeTeam()))}.</div>`}`;
    }
    if (game === "charades") {
      const myTurn = c.turn === team;
      return `<div class="team-turn"><i class="team-dot ${team ? "b" : ""}"></i> ${myTurn ? "هذا دوركم في التمثيل" : `الدور على ${escapeHtml(teamName(c.turn))}`}</div>
        ${myTurn ? `<div class="actor-word">${c.word ? escapeHtml(c.word) : "جهّزوا التمثيل"}</div>${timerMarkup()}
          <button class="button gold block touch-button" data-remote-action="charades-claim" ${!state.timer || c.claimTeam === team ? "disabled" : ""}>${c.claimTeam === team ? "أرسلنا طلب احتساب الكلمة" : "خمنّا الكلمة ✓"}</button>` : `<p class="lead center">مرّروا الجوال للممثل عندما يبدأ دوركم.</p>`}`;
    }
    if (game === "auction") {
      if (c.phase === "bidding" && c.turn === team) {
        return `<h2 class="challenge-question">${escapeHtml(c.question)}</h2><div class="notice">أعلى مزايدة: ${c.highestBid || "لا توجد"} ${c.highestTeam !== null ? `· ${escapeHtml(teamName(c.highestTeam))}` : ""}</div>
          <div class="field"><label for="team-bid">مزايدتكم</label><input class="number-input" id="team-bid" type="number" min="${c.highestBid + 1}" value="${escapeHtml(teamDraft.bid || String(c.highestBid + 1))}"></div>
          <div class="game-controls"><button class="button gold block touch-button" data-remote-action="bid">زايد</button><button class="button secondary block touch-button" data-remote-action="auction-pass">انسحاب</button></div>`;
      }
      if (c.phase === "attempt" && c.highestTeam === team) {
        return `<h2 class="challenge-question">${escapeHtml(c.question)}</h2><div class="notice">رهانكم: ${c.highestBid} إجابة</div>${timerMarkup()}
          ${state.timer?.active ? `
          <div class="field"><label for="team-count">كم إجابة صحيحة ذكرتم؟</label><input class="number-input" id="team-count" type="number" min="0" value="${escapeHtml(teamDraft.count)}"></div>
          <button class="button gold block touch-button" data-remote-action="auction-submit">إرسال النتيجة للحكم</button>` : `<div class="notice">انتظروا الحكم لبدء مؤقت الـ٣٠ ثانية.</div>`}`;
      }
      return `<h2 class="challenge-question">${escapeHtml(c.question)}</h2><div class="notice">${c.phase === "attempt" ? `التحدي على ${escapeHtml(teamName(c.highestTeam))}.` : `الدور على ${escapeHtml(teamName(c.turn))} للمزايدة.`}</div>`;
    }
    if (game === "connection") {
      const canBuzz = c.buzzed === null && c.lockedTeam !== team;
      return `<h2 class="challenge-question">وش الرابط؟</h2><p class="lead center">اضغطوا الجرس عندما تعرفون الإجابة.</p>
        ${c.buzzed === team ? `<div class="notice">وصل جرسكم — أجيبوا شفهيًا!</div>` : c.buzzed !== null ? `<div class="notice">${escapeHtml(teamName(c.buzzed))} يجيب الآن.</div>` : ""}
        ${canBuzz ? `<button class="button gold block touch-button" data-remote-action="buzz">🔔 اضغطوا للإجابة</button>` : ""}`;
    }
    if (game === "bomb") {
      return `<div class="bomb active" aria-hidden="true">💣</div><div class="team-turn"><i class="team-dot ${team ? "b" : ""}"></i> ${c.turn === team ? "القنبلة عندكم!" : `القنبلة عند ${escapeHtml(teamName(c.turn))}`}</div>
        <h2 class="challenge-question">حرف ${escapeHtml(c.letter)} · ${escapeHtml(c.category)}</h2>
        ${c.turn === team && state.timer ? `<button class="button gold block touch-button" data-remote-action="bomb-pass">قلنا كلمة صحيحة — مرّروا القنبلة</button>` : ""}`;
    }
    if (game === "closest") {
      const savedGuess = c.guesses?.[team];
      return `<h2 class="challenge-question">${escapeHtml(c.question)}</h2>
        ${savedGuess !== null && savedGuess !== undefined ? `<div class="notice">تم إرسال تخمينكم: ${savedGuess}</div>` : `<div class="field"><label for="team-guess">تخمينكم</label><input class="number-input" id="team-guess" type="number" value="${escapeHtml(teamDraft.guess)}"></div>
          <button class="button gold block touch-button" data-remote-action="closest-submit">إرسال التخمين للحكم</button>`}`;
    }
    return `<div class="notice">انتظروا تعليمات الحكم.</div>`;
  }

  function roomLinkActionMessage() {
    return "تم نسخ الرابط.";
  }

  function renderWelcome() {
    screen.innerHTML = `<section class="page hero">
      <div class="hero-mark" aria-hidden="true">✦</div><div class="eyebrow">PARTY BOX PRESENTS</div>
      <h1>ليلة <span class="gradient-text">التحدي</span></h1>
      <p class="lead">ست ألعاب، فريقان، وذكريات ما تنسى. اجمعوا فريقكم واستعدوا لمواجهة مليئة بالضحك والحماس!</p>
      <div class="actions"><button class="button gold" data-action="setup">ابدأوا اللعب <span aria-hidden="true">←</span></button></div>
      <div class="hero-stats"><div><strong>٦</strong> ألعاب مصغرة</div><div><strong>٢</strong> فريقان</div><div><strong>١٠٠٪</strong> حماس</div></div>
    </section>`;
  }

  function renderSetup() {
    screen.innerHTML = `<section class="page narrow">
      <div class="eyebrow">قبل صافرة البداية</div><div class="card setup-card">
        <h2>جهّزوا <span class="gradient-text">المنافسة</span></h2><p class="lead">أدخلوا أسماء الفرق واختاروا طول المواجهة.</p>
        <form id="setup-form"><div class="form-grid">
          <div class="field"><label for="team-a">اسم الفريق الأول</label><input id="team-a" name="teamA" maxlength="24" value="${escapeHtml(state.teams[0].name)}" required></div>
          <div class="field"><label for="team-b">اسم الفريق الثاني</label><input id="team-b" name="teamB" maxlength="24" value="${escapeHtml(state.teams[1].name)}" required></div>
          <div class="field full"><span class="field-title">عدد الجولات</span><div class="choice-row">
            <label class="choice"><input type="radio" name="rounds" value="5" ${state.totalRounds === 5 ? "checked" : ""}> قصيرة · ٥</label>
            <label class="choice"><input type="radio" name="rounds" value="8" ${state.totalRounds === 8 ? "checked" : ""}> متوسطة · ٨</label>
            <label class="choice"><input type="radio" name="rounds" value="12" ${state.totalRounds === 12 ? "checked" : ""}> طويلة · ١٢</label>
          </div></div>
        </div>
        <div class="settings-row">
          <label><input type="checkbox" name="sound" ${state.sound ? "checked" : ""}> المؤثرات الصوتية</label>
          <label><input type="checkbox" name="double" ${state.doublePoints ? "checked" : ""}> مضاعفة نقاط آخر جولتين</label>
          <label class="volume-control">مستوى الصوت <input name="volume" type="range" min="0" max="100" value="${Math.round(state.volume * 100)}"></label>
        </div>
        <div class="actions"><button class="button secondary" type="button" data-action="welcome">رجوع</button><button class="button gold" type="submit">ابدأ اللعبة ✦</button></div>
        </form></div></section>`;
  }

  function renderWheel() {
    const title = state.currentGame ? gameById(state.currentGame).name : "مستعدون؟";
    screen.innerHTML = `<section class="page wheel-page">
      <div class="eyebrow">الجولة ${state.suddenDeath ? "الفاصلة" : state.round + 1} ${isDoubleRound() ? " · نقاط مضاعفة ×٢" : ""}</div>
      <h2>${state.spinBusy ? "العجلة تختار لكم..." : "ما هو التحدي التالي؟"}</h2>
      <p class="lead center">${state.spinBusy ? "شدّوا الحماس... اقتربت النتيجة!" : "كل لعبة فرصة جديدة لقلب النتيجة."}</p>
      <div class="wheel-stage"><span class="wheel-pointer">▼</span><div id="wheel-ring" class="wheel-ring ${state.spinBusy ? "spinning" : ""}"><span id="wheel-icon" class="wheel-icon">${state.spinBusy ? "✦" : (state.currentGame ? gameById(state.currentGame).icon : "🎡")}</span></div></div>
      <div id="wheel-title" class="wheel-title">${state.spinBusy ? "جاري الاختيار..." : title}</div>
      <div class="mini-grid">${games.map(game => `<div class="mini-tile"><span>${game.icon}</span><strong>${game.name}</strong></div>`).join("")}</div>
      <div class="wheel-actions">${state.currentGame && !state.spinBusy
        ? `<button class="button gold" data-action="play">ابدأ التحدي ${gameById(state.currentGame).icon}</button>`
        : `<button class="button gold" data-action="spin" ${state.spinBusy ? "disabled" : ""}>ابدأ العجلة 🎡</button>`}
        ${!state.spinBusy ? `<button class="button secondary" data-action="pause">إيقاف مؤقت</button>` : ""}
      </div></section>`;
  }

  function gameShell(game, content, footer = "") {
    const doubleBadge = isDoubleRound() ? `<div class="notice">🔥 جولة مضاعفة! النقاط ×٢</div>` : "";
    return `<section class="page"><div class="card challenge-card">
      <div class="challenge-head"><div><span class="game-tag">${game.icon} ${game.name}</span><div class="challenge-sub">الجولة ${state.suddenDeath ? "الفاصلة" : `${state.round + 1} من ${state.totalRounds}`}</div></div>
        <button class="button secondary small" data-action="pause">Ⅱ إيقاف مؤقت <kbd>P</kbd></button></div>
      ${doubleBadge}<div class="challenge-content">${content}</div>
      ${footer ? `<div class="challenge-footer">${footer}</div>` : ""}
    </div></section>`;
  }

  function renderGame() {
    if (!state.challenge) { state.screen = "wheel"; render(); return; }
    const game = gameById(state.currentGame);
    const c = state.challenge;
    let content = "";
    let footer = `<button class="button secondary" data-action="finish-round">إنهاء الجولة</button>`;
    if (game.id === "quick") content = quickMarkup(c);
    if (game.id === "charades") content = charadesMarkup(c);
    if (game.id === "auction") content = auctionMarkup(c);
    if (game.id === "connection") content = connectionMarkup(c);
    if (game.id === "bomb") content = bombMarkup(c);
    if (game.id === "closest") content = closestMarkup(c);
    if (!c.done) footer = "";
    screen.innerHTML = gameShell(game, content, footer);
    renderTimerBits();
  }

  function quickMarkup(c) {
    const team = activeTeam();
    return `${timerMarkup()}<h2 class="challenge-question">${escapeHtml(c.question)}</h2>
      <div class="team-turn"><i class="team-dot ${team ? "b" : ""}"></i> الدور على ${escapeHtml(teamName(team))}</div>
      ${c.buzzed !== null && c.buzzed !== undefined ? `<div class="notice">${escapeHtml(teamName(c.buzzed))} يطلب الإجابة!</div>` : ""}
      ${c.done ? `<div class="notice">${c.outcome || "انتهى التحدي."}</div>` : `<p class="challenge-sub">${c.expired ? "انتهى الوقت — قرروا هل كانت الإجابة صحيحة." : "لديكم ٥ ثوانٍ — اذكروا ٣ إجابات!"}</p>`}
      <div class="game-controls">${!c.done && !c.expired && !state.timer ? `<button class="button gold" data-action="start-timer">ابدأ المؤقت · ٥ ثوانٍ</button>` : ""}
        <button class="button success" data-action="award" data-team="${c.buzzed ?? team}" ${c.done ? "disabled" : ""}>✓ إجابة صحيحة · +${multiplier()}</button>
        ${c.buzzed !== null && c.buzzed !== undefined ? `<button class="button danger" data-action="quick-answer-wrong" ${c.done ? "disabled" : ""}>إجابة غير صحيحة</button>` : ""}
        <button class="button danger" data-action="quick-miss" ${c.done ? "disabled" : ""}>انتهى الوقت / تخطّي</button></div>`;
  }

  function charadesMarkup(c) {
    const team = c.turn;
    const isShown = c.mode === "public" || c.revealed;
    const word = isShown
      ? `<span class="secret-word">${escapeHtml(c.word)}</span>`
      : c.done
        ? `<span class="challenge-sub">انتهى وقت التمثيل</span>`
        : `<button class="button secondary" data-action="reveal-word">اضغط ليشاهد الممثل الكلمة 👁</button>`;
    return `${timerMarkup()}<div class="team-turn"><i class="team-dot ${team ? "b" : ""}"></i> الممثل من ${escapeHtml(teamName(team))}</div>
      <p class="challenge-sub">لكل فريق ٤٥ ثانية. اختاروا وضع العرض ومرّروا الشاشة للممثل فقط عند إخفاء الكلمة.</p>
      ${!c.done ? `<div class="game-controls" style="margin-bottom:12px">
        <button class="button small ${c.mode === "actor" ? "gold" : "secondary"}" data-action="charades-mode" data-mode="actor">وضع الممثل</button>
        <button class="button small ${c.mode === "public" ? "gold" : "secondary"}" data-action="charades-mode" data-mode="public">الكلمة للجميع</button>
      </div>` : ""}
      <div class="word-hidden">${word}</div>
      ${c.claimTeam !== null && c.claimTeam !== undefined ? `<div class="notice">${escapeHtml(teamName(c.claimTeam))} يطلب احتساب الكلمة.</div>
        <div class="game-controls"><button class="button success" data-action="charades-accept">صحيح · +${multiplier()}</button><button class="button danger" data-action="charades-reject">غير صحيح</button></div>` : ""}
      ${c.notice ? `<div class="notice">${escapeHtml(c.notice)}</div>` : ""}
      ${c.done ? `<div class="notice">${escapeHtml(c.outcome)}</div>` : `<div class="challenge-sub">التخطيات: ${c.skips[team]} من ٢ لهذا الفريق</div>`}
      <div class="game-controls">
        ${!state.timer && !c.done ? `<button class="button gold" data-action="start-timer">ابدأ دور ${escapeHtml(teamName(team))} · ٤٥ ثانية</button>` : ""}
        <button class="button success" data-action="charades-point" ${c.done ? "disabled" : ""}>✓ خمنتم الكلمة · +${multiplier()}</button>
        <button class="button secondary" data-action="charades-skip" ${c.done || c.skips[team] >= 2 ? "disabled" : ""}>تخطي (${c.skips[team]}/٢)</button>
      </div>`;
  }

  function auctionMarkup(c) {
    let body;
    if (c.phase === "bidding") {
      body = `<p class="challenge-sub">تناوبوا على المزايدة أو الانسحاب. آخر فريق زايد ينفّذ التحدي!</p>
        <div class="auction-status">${c.highestBid ? `أعلى مزايدة: ${c.highestBid} · ${escapeHtml(teamName(c.highestTeam))}` : "لم تبدأ المزايدة بعد"}</div>
        <div class="team-turn"><i class="team-dot ${c.turn ? "b" : ""}"></i> المزايدة الآن على ${escapeHtml(teamName(c.turn))}</div>
        <div class="game-controls"><label>عدد تستطيعون ذكره <input class="number-input" id="bid-value" type="number" min="${c.highestBid + 1}" value="${Math.max(1, c.highestBid + 1)}" style="width:130px"></label>
          <button class="button gold" data-action="bid">زايد</button><button class="button secondary" data-action="auction-pass">انسحب</button></div>`;
    } else if (c.phase === "attempt") {
      body = `<div class="notice">${escapeHtml(teamName(c.highestTeam))} يراهن على ذكر ${c.highestBid} إجابة. لديكم ٣٠ ثانية!</div>
        ${timerMarkup()}<div class="field" style="max-width:220px;margin:0 auto 16px"><label for="auction-count">كم إجابة صحيحة ذكرتم؟</label><input id="auction-count" type="number" min="0" value="${Number(c.answerCount || 0)}"></div>
        <div class="game-controls"><button class="button gold" data-action="start-timer" ${state.timer || c.expired ? "hidden" : ""}>ابدأ · ٣٠ ثانية</button>
          <button class="button success" data-action="auction-submit" ${c.done ? "disabled" : ""}>تأكيد النتيجة</button></div>`;
    } else body = `<div class="notice">${c.outcome || "انتهى المزاد."}</div>`;
    return `<h2 class="challenge-question">${escapeHtml(c.question)}</h2>${body}`;
  }

  function connectionMarkup(c) {
    const words = c.words.map((word, i) => `<div class="connection-word ${i >= c.revealed ? "hidden-word" : ""}">${i < c.revealed ? escapeHtml(word) : "؟"}</div>`).join("");
    let decision = "";
    if (c.buzzed !== null) {
      decision = `<div class="notice">${escapeHtml(teamName(c.buzzed))} يجيب الآن!</div>
        <div class="game-controls"><button class="button success" data-action="connection-correct">إجابة صحيحة · +${multiplier()}</button><button class="button danger" data-action="connection-wrong">إجابة خاطئة</button></div>`;
    } else if (c.done) {
      decision = `<div class="notice">${c.outcome}</div><div class="answer-reveal">الرابط: ${escapeHtml(c.answer)}</div>`;
    }
    return `<p class="challenge-sub">اكشفوا الكلمات واكتشفوا الرابط المشترك.</p><div class="connection-words">${words}</div>
      <div class="game-controls">${c.revealed < c.words.length && !c.done ? `<button class="button secondary" data-action="reveal-connection">اكشف كلمة أخرى</button>` : ""}</div>
      ${!c.done && c.buzzed === null ? `<div class="buzzer-row"><button class="buzz-button a" data-action="buzz" data-team="0" ${c.lockedTeam === 0 ? "disabled" : ""}>🔔 ${escapeHtml(teamName(0))} يرنّ</button>
        <button class="buzz-button b" data-action="buzz" data-team="1" ${c.lockedTeam === 1 ? "disabled" : ""}>🔔 ${escapeHtml(teamName(1))} يرنّ</button></div>` : ""}
      ${decision}`;
  }

  function bombMarkup(c) {
    const elapsed = state.timer ? 1 - currentTimerMs() / state.timer.durationMs : 0;
    return `<div class="team-turn"><i class="team-dot ${c.turn ? "b" : ""}"></i> الدور على ${escapeHtml(teamName(c.turn))}</div>
      <div id="bomb-visual" class="bomb ${state.timer ? "active" : ""} ${elapsed > .72 ? "danger" : ""}">💣</div>
      <div class="range-track"><div class="range-fill" style="width:${Math.max(0, Math.min(100, elapsed * 100))}%"></div></div>
      <h2 class="challenge-question">حرف <span class="gradient-text">${escapeHtml(c.letter)}</span> · ${escapeHtml(c.category)}</h2>
      <p class="challenge-sub">قولوا كلمة صحيحة ثم مرّروا الدور بسرعة! الوقت المتبقي مخفي.</p>
      ${c.done ? `<div class="notice">${c.outcome}</div>` : `<div class="game-controls">
        ${!state.timer ? `<button class="button gold" data-action="start-bomb">ابدأ القنبلة</button>` : ""}
        <button class="button secondary" data-action="bomb-pass" ${!state.timer ? "disabled" : ""}>✓ إجابة صحيحة — مرّر الدور</button>
      </div>`}`;
  }

  function closestMarkup(c) {
    return `<h2 class="challenge-question">${escapeHtml(c.question)}</h2><p class="challenge-sub">أدخلوا التقدير الأقرب — الإجابة مخفية حتى تثبيت التخمينين.</p>
      <div class="guess-grid">
        <div class="guess-field a"><label for="guess-a">${escapeHtml(teamName(0))}</label><input class="number-input" id="guess-a" type="number" ${c.done ? "disabled" : ""} value="${c.guesses[0] ?? ""}" placeholder="تخمين الفريق"></div>
        <div class="guess-field b"><label for="guess-b">${escapeHtml(teamName(1))}</label><input class="number-input" id="guess-b" type="number" ${c.done ? "disabled" : ""} value="${c.guesses[1] ?? ""}" placeholder="تخمين الفريق"></div>
      </div>
      ${c.done ? `<div class="answer-reveal">الإجابة: ${c.answer} ${escapeHtml(c.unit)}<br>${escapeHtml(c.outcome)}</div>` : ""}
      <div class="game-controls">${c.done ? "" : `<button class="button gold" data-action="closest-submit">اكشف النتيجة</button>`}</div>`;
  }

  function timerMarkup() {
    if (!state.timer) return "";
    const seconds = Math.ceil(currentTimerMs() / 1000);
    return `<div class="timer-wrap"><div id="timer-display" class="timer ${seconds <= 3 ? "urgent" : ""}">${seconds}</div><span class="timer-caption">الوقت المتبقي</span></div>`;
  }

  function renderTimerBits() {
    const display = document.querySelector("#timer-display");
    if (!display || !state.timer) return;
    const seconds = Math.ceil(currentTimerMs() / 1000);
    display.textContent = String(seconds);
    display.classList.toggle("urgent", seconds <= 3);
    const fill = document.querySelector(".range-fill");
    if (fill) fill.style.width = `${Math.max(0, Math.min(100, (1 - currentTimerMs() / state.timer.durationMs) * 100))}%`;
    const bomb = document.querySelector("#bomb-visual");
    if (bomb) bomb.classList.toggle("danger", currentTimerMs() / state.timer.durationMs < .28);
  }

  function renderPause() {
    scoreboard.hidden = !["wheel", "game", "results"].includes(state.screen);
    screen.innerHTML = `<div class="pause-overlay"><section class="card pause-card">
      <div class="hero-mark">Ⅱ</div><div class="eyebrow">استراحة قصيرة</div><h2>اللعبة متوقفة</h2>
      <p class="lead center">خذوا نفسًا... التحدي ينتظركم!</p>
      <div class="actions"><button class="button gold" data-action="resume">استئناف اللعب</button><button class="button secondary" data-action="setup">إعدادات جديدة</button></div>
    </section></div>`;
  }

  function renderResults() {
    const a = state.teams[0], b = state.teams[1];
    const winner = a.score === b.score ? null : a.score > b.score ? 0 : 1;
    screen.innerHTML = `<section class="page narrow center">
      <div class="hero-mark">${winner === null ? "🤝" : "🏆"}</div><div class="eyebrow">${winner === null ? "تعادل!" : "انتهت المنافسة"}</div>
      <h2>${winner === null ? "ما زال الحسم مؤجلاً" : "يا لها من مواجهة!"}</h2>
      <div class="result-winner">${winner === null ? "تعادل!" : `الفائز: ${escapeHtml(teamName(winner))}`}</div>
      <div class="result-scores"><div class="result-team a"><strong>${escapeHtml(a.name)}</strong><span>${a.score}</span></div><b>:</b><div class="result-team b"><strong>${escapeHtml(b.name)}</strong><span>${b.score}</span></div></div>
      <div class="actions">${winner === null ? `<button class="button gold" data-action="tiebreak">جولة فاصلة ⚡</button>` : ""}
        <button class="button ${winner === null ? "secondary" : "gold"}" data-action="new-game">العبوا من جديد ↻</button></div>
    </section>`;
    if (winner !== null) playSound("win");
  }

  function randomItem(list) { return list[Math.floor(Math.random() * list.length)]; }
  function chooseGame() {
    let options = games;
    if (state.previousGame && games.length > 1) options = games.filter(game => game.id !== state.previousGame);
    return randomItem(options).id;
  }

  function beginGame() {
    stopTimer();
    const data = new FormData(document.querySelector("#setup-form"));
    state.teams = [
      { name: String(data.get("teamA")).trim() || "فريق A", score: 0 },
      { name: String(data.get("teamB")).trim() || "فريق B", score: 0 }
    ];
    state.totalRounds = Number(data.get("rounds"));
    state.doublePoints = data.has("double");
    state.sound = data.has("sound");
    state.volume = Number(data.get("volume")) / 100;
    state.round = 0;
    state.previousGame = null;
    state.currentGame = null;
    state.challenge = null;
    state.suddenDeath = false;
    state.paused = false;
    state.screen = "wheel";
    render();
  }

  function spinWheel() {
    if (state.spinBusy || state.screen !== "wheel") return;
    state.spinBusy = true;
    const selected = chooseGame();
    render();
    const icon = document.querySelector("#wheel-icon");
    const title = document.querySelector("#wheel-title");
    const ring = document.querySelector("#wheel-ring");
    const start = Date.now();
    let ticks = 0;
    const spin = () => {
      if (!state.spinBusy || state.paused) return;
      const elapsed = Date.now() - start;
      if (elapsed < 2500) {
        const delay = elapsed < 500 ? 180 - elapsed * .2 : 80 + Math.min(280, (elapsed - 500) / 5);
        const game = games[ticks++ % games.length];
        if (icon) icon.textContent = game.icon;
        if (title) title.textContent = game.name;
        if (ring) ring.classList.add("spinning");
        playSound("tick", .15);
        spinTimeout = setTimeout(spin, delay);
      } else {
        state.currentGame = selected;
        state.previousGame = selected;
        state.spinBusy = false;
        playSound("success");
        render();
      }
    };
    spin();
  }

  function startChallenge() {
    const id = state.currentGame;
    if (!id) return;
    const c = { done: false };
    if (id === "quick") Object.assign(c, { question: randomItem(questions.quick), buzzed: null });
    if (id === "charades") Object.assign(c, {
      word: randomItem(questions.charades),
      skips: [0, 0],
      revealed: false,
      mode: "actor",
      turn: activeTeam(),
      turnOrder: [activeTeam(), 1 - activeTeam()],
      turnIndex: 0
    });
    if (id === "auction") Object.assign(c, { question: randomItem(questions.auction), phase: "bidding", turn: activeTeam(), highestBid: 0, highestTeam: null, passes: 0 });
    if (id === "connection") Object.assign(c, { ...randomItem(questions.connection), revealed: 1, buzzed: null, lockedTeam: null, wrongTeams: [] });
    if (id === "bomb") Object.assign(c, { ...randomItem(questions.bomb), turn: activeTeam() });
    if (id === "closest") Object.assign(c, { ...randomItem(questions.closest), guesses: [null, null] });
    state.challenge = c;
    state.screen = "game";
    render();
  }

  function startTimer(seconds) {
    if (state.timer || state.paused) return;
    state.timer = { durationMs: seconds * 1000, remainingMs: seconds * 1000, endsAt: Date.now() + seconds * 1000, active: true };
    armTimer();
    render();
  }

  function armTimer() {
    if (ticker) clearInterval(ticker);
    lastBeepSecond = null;
    ticker = setInterval(() => {
      if (!state.timer || !state.timer.active || state.paused) return;
      const ms = currentTimerMs();
      const remaining = Math.ceil(ms / 1000);
      if (remaining <= 3 && remaining > 0 && remaining !== lastBeepSecond) {
        lastBeepSecond = remaining;
        playSound("tick");
      }
      if (ms <= 0) {
        stopTimer(false);
        playSound(state.currentGame === "bomb" ? "explosion" : "alarm");
        handleTimerExpired();
        render();
      } else {
        renderTimerBits();
        if (state.currentGame === "bomb" && remaining % 2 === 0) saveState();
        if (networkMode && screenRole === "judge" && Date.now() - lastTimerSync >= 500) {
          lastTimerSync = Date.now();
          saveState();
        }
      }
    }, 100);
  }

  function stopTimer(preserve = false) {
    if (state.timer && preserve && state.timer.active) {
      state.timer.remainingMs = currentTimerMs();
      state.timer.active = false;
    } else state.timer = null;
    if (ticker) { clearInterval(ticker); ticker = null; }
  }

  function handleTimerExpired() {
    const c = state.challenge;
    if (!c) return;
    if (state.currentGame === "bomb") {
      const loser = c.turn;
      c.done = true;
      c.outcome = `${teamName(loser)} لم يُجب في الوقت المناسب. نقطة لـ ${teamName(1 - loser)}!`;
      award(1 - loser, 1);
    } else if (state.currentGame === "charades") {
      if (c.turnIndex === 0) {
        c.turnIndex = 1;
        c.turn = c.turnOrder[1];
        c.word = randomItem(questions.charades);
        c.revealed = false;
        c.notice = `انتهى دور ${teamName(c.turnOrder[0])}. الآن دور ${teamName(c.turn)} — لديكم ٤٥ ثانية جديدة.`;
      } else {
        c.done = true;
        c.notice = "";
        c.outcome = `انتهى دور الفريقين. ${teamName(c.turnOrder[0])}: ${c.skips[c.turnOrder[0]]} تخطيات، ${teamName(c.turnOrder[1])}: ${c.skips[c.turnOrder[1]]} تخطيات.`;
      }
    } else if (state.currentGame === "auction") {
      c.done = true;
      c.phase = "result";
      settleAuction(Number(c.answerCount || 0));
      c.outcome = c.outcome || "انتهى الوقت!";
    } else if (state.currentGame === "quick") {
      c.expired = true;
      c.outcome = "انتهى الوقت!";
    }
  }

  function pauseGame() {
    if (state.paused || !["wheel", "game"].includes(state.screen)) return;
    state.paused = true;
    if (state.timer) stopTimer(true);
    if (spinTimeout) { clearTimeout(spinTimeout); spinTimeout = null; state.spinBusy = false; }
    render();
  }

  function resumeGame() {
    if (!state.paused) return;
    state.paused = false;
    if (state.timer && !state.timer.active) {
      state.timer.endsAt = Date.now() + state.timer.remainingMs;
      state.timer.active = true;
      armTimer();
    }
    render();
  }

  function award(team, points) {
    if (!Number.isInteger(team) || team < 0 || team > 1 || !Number.isFinite(points)) return;
    state.teams[team].score = Math.max(0, state.teams[team].score + points * multiplier());
    playSound(points > 0 ? "success" : "error");
    renderScoreboard();
    saveState();
  }

  function completeChallenge(outcome) {
    if (!state.challenge || state.challenge.done) return false;
    stopTimer();
    state.challenge.done = true;
    if (outcome) state.challenge.outcome = outcome;
    playSound("success");
    render();
    return true;
  }

  function finishRound() {
    stopTimer();
    state.challenge = null;
    state.currentGame = null;
    state.round += 1;
    const suddenDeathResolved = state.suddenDeath && state.teams[0].score !== state.teams[1].score;
    if (suddenDeathResolved || (!state.suddenDeath && state.round >= state.totalRounds)) {
      state.screen = "results";
      playSound(state.teams[0].score === state.teams[1].score ? "success" : "win");
    } else state.screen = "wheel";
    render();
  }

  function settleAuction(count) {
    const c = state.challenge;
    if (!c || c.highestTeam === null) return;
    const winner = count >= c.highestBid ? c.highestTeam : 1 - c.highestTeam;
    award(winner, 1);
    c.outcome = count >= c.highestBid
      ? `${teamName(winner)} حققوا الرهان (${count}/${c.highestBid}) وحصلوا على ${multiplier()} نقطة!`
      : `لم يكتمل الرهان (${count}/${c.highestBid}) — النقطة لـ ${teamName(winner)}!`;
  }

  function startTieBreak() {
    state.suddenDeath = true;
    state.round = 0;
    state.currentGame = null;
    state.challenge = null;
    state.screen = "wheel";
    render();
  }

  function newGame() {
    stopTimer();
    if (ticker) clearInterval(ticker);
    if (spinTimeout) clearTimeout(spinTimeout);
    state = structuredClone(initialState);
    state.screen = "setup";
    render();
  }

  function playSound(type, scale = 1) {
    if (!state.sound || state.volume <= 0 || (networkMode && screenRole !== "judge")) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      if (!audioContext) audioContext = new Audio();
      if (audioContext.state === "suspended") audioContext.resume();
      const now = audioContext.currentTime;
      const frequencies = {
        tick: [740], success: [523, 784], error: [230], alarm: [440, 330, 220],
        explosion: [120, 70], win: [523, 659, 784, 1047]
      }[type] || [440];
      frequencies.forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = type === "explosion" ? "sawtooth" : "sine";
        oscillator.frequency.setValueAtTime(frequency, now + index * .11);
        if (type === "explosion") oscillator.frequency.exponentialRampToValueAtTime(35, now + .38);
        gain.gain.setValueAtTime(Math.max(.001, state.volume * .13 * scale), now + index * .11);
        gain.gain.exponentialRampToValueAtTime(.001, now + index * .11 + (type === "explosion" ? .42 : .12));
        oscillator.connect(gain); gain.connect(audioContext.destination);
        oscillator.start(now + index * .11); oscillator.stop(now + index * .11 + (type === "explosion" ? .45 : .14));
      });
    } catch (error) { console.warn("تعذر تشغيل المؤثر الصوتي:", error); }
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function setRoomUrl(role, code) {
    screenRole = role;
    roomCode = code.toUpperCase();
    const url = new URL(location.href);
    url.search = "";
    url.searchParams.set("screen", screenRole);
    url.searchParams.set("room", roomCode);
    if (cloudMode) {
      if (role === "display" || role === "judge") {
        for (const [key, tokenRole] of Object.entries({ jt: "judge", dt: "display", at: "team-a", bt: "team-b" })) {
          url.searchParams.set(key, roleTokens[tokenRole]);
        }
      } else url.searchParams.set("token", roleTokens[role]);
    }
    history.replaceState(null, "", url);
    lastActionId = Number(sessionStorage.getItem(`party-box-actions-${roomCode}`) || 0);
    roomReady = false;
    serverRevision = 0;
  }

  function makeRoleUrl(role) {
    const url = new URL(location.href);
    url.search = "";
    url.searchParams.set("screen", role);
    url.searchParams.set("room", roomCode);
    if (role === "judge") {
      for (const [key, tokenRole] of Object.entries({ jt: "judge", dt: "display", at: "team-a", bt: "team-b" })) {
        url.searchParams.set(key, roleTokens[tokenRole]);
      }
    } else {
      url.searchParams.set("token", roleTokens[role]);
      if (role === "team-a" || role === "team-b") url.searchParams.set("dt", roleTokens.display);
    }
    return url.toString();
  }

  function createRoleTokens() {
    for (const role of validRoles) {
      const bytes = new Uint8Array(24);
      crypto.getRandomValues(bytes);
      roleTokens[role] = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
    }
  }

  function createRoomCode() {
    const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    const bytes = new Uint8Array(5);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join("");
  }

  function stateTopic(role) {
    return `party-box-${roomCode}-${role}-${roleTokens[role]}`;
  }

  function subscribeRealtime(channel, afterSubscribe = null) {
    return new Promise((resolve, reject) => {
      let settled = false;
      channel.subscribe(async status => {
        if (status === "SUBSCRIBED" && !settled) {
          settled = true;
          try {
            if (afterSubscribe) await afterSubscribe();
            resolve();
          } catch (error) {
            reject(error);
          }
        } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status) && !settled) {
          settled = true;
          reject(new Error(`Supabase Realtime channel ${status.toLowerCase()}.`));
        }
      });
    });
  }

  function loadExternalScript(url, isReady) {
    if (isReady()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.referrerPolicy = "no-referrer";
      script.onload = () => isReady() ? resolve() : reject(new Error("تعذر تهيئة مكتبة خارجية."));
      script.onerror = () => reject(new Error("تعذر تحميل مكتبة خارجية. تحققوا من اتصال الإنترنت."));
      document.head.appendChild(script);
    });
  }

  function loadSupabaseLibrary() {
    if (!supabaseSdkPromise) {
      supabaseSdkPromise = loadExternalScript(
        "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
        () => Boolean(window.supabase?.createClient)
      ).catch(error => {
        supabaseSdkPromise = null;
        throw error;
      });
    }
    return supabaseSdkPromise;
  }

  function loadQrCodeLibrary() {
    if (!qrCodePromise) {
      qrCodePromise = loadExternalScript(
        "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js",
        () => typeof window.QRCode === "function"
      ).catch(error => {
        qrCodePromise = null;
        throw error;
      });
    }
    return qrCodePromise;
  }

  function connectRealtime() {
    if (!cloudMode) return Promise.reject(new Error("إعداد Supabase غير مكتمل."));
    if (realtimeStart) return realtimeStart;
    realtimeStart = loadSupabaseLibrary().then(() => initializeRealtimeChannels()).catch(error => {
      realtimeStart = null;
      networkMessage = friendlyNetworkError(error);
      console.error("تعذر الاتصال بـ Supabase Realtime:", error);
      render();
      throw error;
    });
    return realtimeStart;
  }

  function initializeRealtimeChannels() {
    realtimeClient = window.supabase.createClient(supabaseConfig.url, supabaseConfig.publishableKey);

    const subscriptions = [];
    if (screenRole === "judge") {
      for (const role of ["display", "team-a", "team-b"]) {
        const channel = realtimeClient.channel(stateTopic(role), { config: { broadcast: { self: false } } });
        realtimePublishChannels[role] = channel;
        subscriptions.push(subscribeRealtime(channel));
      }
    } else {
      const stateChannel = realtimeClient.channel(stateTopic(screenRole), { config: { broadcast: { self: false } } });
      stateChannel.on("broadcast", { event: "state" }, ({ payload }) => {
        if (!payload?.state) return;
        applyRemoteState(payload.state);
        render();
      });
      subscriptions.push(subscribeRealtime(stateChannel));
    }

    realtimeActionChannel = realtimeClient.channel(`party-box-${roomCode}-${roleTokens.display}-actions`, {
      config: { broadcast: { self: false } }
    });
    if (screenRole === "judge") {
      realtimeActionChannel.on("broadcast", { event: "action" }, ({ payload }) => {
        if (!payload || payload.room !== roomCode || !validRoles.includes(payload.role)) return;
        if (payload.token !== roleTokens[payload.role]) return;
        if (payload.action === "request-state") {
          if (roomReady) saveState();
          return;
        }
        if (!["team-a", "team-b"].includes(payload.role)) return;
        const allowedActions = ["team-answer", "charades-claim", "bid", "auction-pass", "auction-submit", "buzz", "bomb-pass", "closest-submit"];
        if (!allowedActions.includes(payload.action)) return;
        const team = payload.role === "team-a" ? 0 : 1;
        if (!isValidRemoteAction(payload.action, team)) return;
        performAction(payload.action, { ...payload.payload, team });
      });
    }
    subscriptions.push(subscribeRealtime(realtimeActionChannel));

    realtimePresenceChannel = realtimeClient.channel(`party-box-${roomCode}-${roleTokens.display}-presence`, {
      config: { presence: { key: `${screenRole}-${roleTokens[screenRole]}` } }
    });
    realtimePresenceChannel.on("presence", { event: "sync" }, () => {
      const roles = new Set();
      for (const entries of Object.values(realtimePresenceChannel.presenceState())) {
        for (const entry of entries) {
          if (!validRoles.includes(entry.role)) continue;
          if (roleTokens[entry.role] && entry.token !== roleTokens[entry.role]) continue;
          roles.add(entry.role);
        }
      }
      connectedRoles = Array.from(roles);
      const signature = connectedRoles.slice().sort().join(",");
      if (signature !== pairedSignature) {
        pairedSignature = signature;
        if (screenRole === "judge" || screenRole === "display") renderRoomTools();
        if (screenRole === "display" && !roomReady) render();
      }
    });
    subscriptions.push(subscribeRealtime(realtimePresenceChannel, () => realtimePresenceChannel.track({
      role: screenRole,
      token: roleTokens[screenRole]
    })));

    return Promise.all(subscriptions).then(async () => {
      networkMessage = "";
      renderRoomTools();
      if (screenRole !== "judge") await broadcastRealtimeAction("request-state", {});
    });
  }

  async function sendRealtimeAction(action, payload) {
    await connectRealtime();
    await broadcastRealtimeAction(action, payload);
  }

  async function broadcastRealtimeAction(action, payload) {
    const result = await realtimeActionChannel.send({
      type: "broadcast",
      event: "action",
      payload: { room: roomCode, role: screenRole, token: roleTokens[screenRole], action, payload }
    });
    if (result !== "ok") throw new Error(`تعذر إرسال الطلب إلى الحكم (${result}).`);
  }

  function stateForRole(snapshot, role) {
    const roleState = JSON.parse(JSON.stringify(snapshot));
    const challenge = roleState.challenge;
    if (!challenge || role === "judge") return roleState;

    if (roleState.currentGame === "charades" && challenge.mode !== "public") {
      const actorRole = challenge.turn === 0 ? "team-a" : "team-b";
      if (role !== actorRole) delete challenge.word;
    }
    if (!challenge.done && roleState.currentGame === "closest") {
      delete challenge.answer;
      if (role === "team-a") challenge.guesses[1] = null;
      if (role === "team-b") challenge.guesses[0] = null;
    }
    if (!challenge.done && roleState.currentGame === "connection") delete challenge.answer;
    if (roleState.currentGame === "bomb" && roleState.timer) {
      if (role === "display") {
        const remainingMs = roleState.timer.active
          ? Math.max(0, roleState.timer.endsAt - Date.now())
          : roleState.timer.remainingMs;
        roleState.timer = { durationMs: roleState.timer.durationMs, remainingMs, active: false };
      } else {
        roleState.timer = { active: Boolean(roleState.timer.active) };
      }
    }
    return roleState;
  }

  async function publishRealtimeState(snapshot) {
    const updates = Object.entries(realtimePublishChannels).map(async ([role, channel]) => {
      const result = await channel.send({
        type: "broadcast",
        event: "state",
        payload: { state: stateForRole(snapshot, role) }
      });
      if (result !== "ok") throw new Error(`تعذر تحديث شاشة ${role} (${result}).`);
    });
    await Promise.all(updates);
  }

  function isValidRemoteAction(action, team) {
    const challenge = state.challenge;
    if (state.screen !== "game" || !challenge || challenge.done) return false;
    if (action === "team-answer") return state.currentGame === "quick" && activeTeam() === team && challenge.buzzed == null;
    if (action === "charades-claim") return state.currentGame === "charades" && challenge.turn === team && challenge.claimTeam == null;
    if (action === "bid" || action === "auction-pass") {
      return state.currentGame === "auction" && challenge.phase === "bidding" && challenge.turn === team;
    }
    if (action === "auction-submit") {
      return state.currentGame === "auction" && challenge.phase === "attempt" &&
        challenge.highestTeam === team && Boolean(state.timer?.active);
    }
    if (action === "buzz") {
      return state.currentGame === "connection" && challenge.buzzed === null &&
        challenge.lockedTeam !== team && !challenge.done;
    }
    if (action === "bomb-pass") return state.currentGame === "bomb" && challenge.turn === team && Boolean(state.timer?.active);
    if (action === "closest-submit") {
      return state.currentGame === "closest" && (challenge.guesses[team] === null || challenge.guesses[team] === undefined);
    }
    return false;
  }

  async function createRoom() {
    try {
      if (cloudMode) {
        createRoleTokens();
        setRoomUrl("display", createRoomCode());
        state = structuredClone(initialState);
        state.screen = "welcome";
        roomReady = false;
        networkMessage = "";
        render();
        connectRealtime().catch(() => {});
        return;
      }
      const response = await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const result = await readApiResponse(response);
      setRoomUrl("display", result.room);
      state = structuredClone(initialState);
      state.screen = "welcome";
      roomReady = false;
      networkMessage = "";
      render();
      pollServer();
    } catch (error) {
      networkMessage = friendlyNetworkError(error);
      render();
    }
  }

  function joinRoom(role) {
    const code = String(document.querySelector("#room-code-input")?.value || roomCode).trim().toUpperCase();
    if (!/^[23456789A-HJ-NP-Z]{5}$/.test(code)) {
      networkMessage = "أدخلوا رمز الغرفة المكوّن من ٥ أحرف وأرقام.";
      render();
      return;
    }
    setRoomUrl(role, code);
    networkMessage = "";
    render();
    pollServer();
  }

  async function sendRemoteAction(action, payload = {}) {
    try {
      if (cloudMode) {
        await sendRealtimeAction(action, payload);
        if (action === "bid") teamDraft.bid = "";
        if (action === "auction-submit") teamDraft.count = "";
        if (action === "closest-submit") teamDraft.guess = "";
        showToast("وصل طلبكم إلى الحكم.");
        return;
      }
      const response = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: roomCode, role: screenRole, action, payload })
      });
      const result = await readApiResponse(response);
      if (action === "bid") teamDraft.bid = "";
      if (action === "auction-submit") teamDraft.count = "";
      if (action === "closest-submit") teamDraft.guess = "";
      showToast("وصل طلبكم إلى الحكم.");
    } catch (error) {
      showToast(friendlyNetworkError(error));
    }
  }

  async function pollServer() {
    if (cloudMode) return;
    if (!networkMode || !screenRole || !roomCode || polling) return;
    polling = true;
    try {
      const params = new URLSearchParams({
        room: roomCode, role: screenRole, since: String(serverRevision), after: String(lastActionId)
      });
      const response = await fetch(`/api/poll?${params.toString()}`, { cache: "no-store" });
      const result = await readApiResponse(response);
      pollDelay = 350;
      networkMessage = "";
      connectedRoles = result.online || [];
      const signature = connectedRoles.slice().sort().join(",");
      const presenceChanged = signature !== pairedSignature;
      if (presenceChanged) pairedSignature = signature;
      if (screenRole === "judge") {
        if (!roomReady && result.state) {
          applyRemoteState(result.state);
          render();
        }
        serverRevision = result.revision;
        if (result.actions?.length) {
          for (const action of result.actions) {
            if (action.id <= lastActionId) continue;
            const team = action.role === "team-a" ? 0 : 1;
            performAction(action.action, { ...action.payload, team });
            lastActionId = action.id;
            sessionStorage.setItem(`party-box-actions-${roomCode}`, String(lastActionId));
          }
        }
        if (presenceChanged) renderRoomTools();
      } else if (result.state && result.revision > serverRevision) {
        applyRemoteState(result.state);
        serverRevision = result.revision;
        render();
      } else if (presenceChanged) {
        if (screenRole === "display" && !roomReady) render();
        else renderRoomTools();
      }
    } catch (error) {
      pollDelay = Math.min(5000, pollDelay * 2);
      const message = friendlyNetworkError(error);
      if (/غير صالح|انتهت الجلسة|غير موجودة/.test(error.message)) {
        networkMessage = message;
        roomReady = false;
        render();
      } else {
        networkMessage = message;
        if (screenRole === "display" && roomReady === false) render();
        console.warn("تعذرت مزامنة الغرفة:", error);
      }
    } finally {
      polling = false;
      if (networkMode && screenRole && roomCode) setTimeout(pollServer, pollDelay);
    }
  }

  function performAction(action, data = {}) {
    const c = state.challenge;
    switch (action) {
      case "create-room": createRoom(); break;
      case "join-room": joinRoom(data.role); break;
      case "prepare-game":
        state.screen = "setup";
        state.paused = false;
        roomReady = true;
        render();
        break;
      case "setup": stopTimer(); state.paused = false; state.screen = "setup"; render(); break;
      case "welcome": state.screen = "welcome"; render(); break;
      case "resume": resumeGame(); break;
      case "spin": spinWheel(); break;
      case "play": startChallenge(); break;
      case "pause": pauseGame(); break;
      case "start-timer":
        if (state.currentGame === "quick") startTimer(5);
        else if (state.currentGame === "charades") startTimer(45);
        else if (state.currentGame === "auction") startTimer(30);
        break;
      case "start-bomb": startTimer(15 + Math.floor(Math.random() * 21)); break;
      case "award": {
        const team = Number(data.team ?? data.scoreTeam);
        if (c && !c.done) { award(team, 1); completeChallenge(`${teamName(team)} حصل على ${multiplier()} نقطة!`); }
        break;
      }
      case "quick-miss": playSound("error"); completeChallenge("انتهى الوقت — لم تُحتسب نقطة."); break;
      case "quick-answer-wrong":
        if (c && !c.done) { c.buzzed = null; playSound("error"); render(); }
        break;
      case "reveal-word": c.revealed = true; render(); break;
      case "charades-mode": c.mode = data.mode; c.revealed = false; render(); break;
      case "charades-point":
        if (c && !c.done) {
          award(c.turn, 1);
          c.word = randomItem(questions.charades); c.revealed = false;
          showToast(`كلمة جديدة لـ ${teamName(c.turn)}`);
          render();
        }
        break;
      case "charades-claim":
        if (c && !c.done && Number(data.team) === c.turn) { c.claimTeam = Number(data.team); render(); }
        break;
      case "charades-accept":
        if (c && !c.done && Number.isInteger(c.claimTeam)) {
          award(c.claimTeam, 1);
          c.claimTeam = null;
          c.word = randomItem(questions.charades);
          c.revealed = false;
          render();
        }
        break;
      case "charades-reject":
        if (c && !c.done) { c.claimTeam = null; playSound("error"); render(); }
        break;
      case "charades-skip":
        if (c && !c.done && c.skips[c.turn] < 2) { c.skips[c.turn] += 1; c.word = randomItem(questions.charades); c.revealed = false; render(); }
        break;
      case "finish-round": finishRound(); break;
      case "bid": {
        const value = Number(data.value ?? document.querySelector("#bid-value")?.value);
        if (!Number.isInteger(value) || value <= c.highestBid) { showToast(`يجب أن تكون المزايدة أكبر من ${c.highestBid}`); break; }
        c.highestBid = value; c.highestTeam = c.turn; c.turn = 1 - c.turn; render(); break;
      }
      case "auction-pass":
        if (c.highestTeam !== null) { c.phase = "attempt"; c.turn = c.highestTeam; render(); }
        else {
          c.passes += 1;
          if (c.passes >= 2) completeChallenge("انسحب الفريقان — لا نقاط هذه الجولة.");
          else { c.turn = 1 - c.turn; render(); }
        }
        break;
      case "auction-submit": {
        if (c.done) break;
        if (!state.timer?.active) { showToast("ابدأوا مؤقت التحدي قبل تسجيل النتيجة."); break; }
        const count = Number(data.count ?? document.querySelector("#auction-count")?.value);
        if (!Number.isInteger(count) || count < 0) { showToast("أدخلوا عددًا صحيحًا من الإجابات."); break; }
        stopTimer(); c.answerCount = count; c.phase = "result"; c.done = true; settleAuction(count); render(); break;
      }
      case "reveal-connection": c.revealed = Math.min(c.words.length, c.revealed + 1); render(); break;
      case "buzz": {
        const team = Number(data.team);
        if (c.buzzed !== null || c.lockedTeam === team || c.done) break;
        c.buzzed = team; playSound("tick"); render(); break;
      }
      case "team-answer":
        if (c && !c.done && c.buzzed == null) { c.buzzed = Number(data.team); playSound("tick"); render(); }
        break;
      case "connection-correct":
        if (c.buzzed === null || c.done) break;
        award(c.buzzed, 1); c.done = true; c.outcome = `${teamName(c.buzzed)} عرفوا الرابط!`;
        playSound("success"); render(); break;
      case "connection-wrong":
        if (c.buzzed === null || c.done) break;
        c.wrongTeams.push(c.buzzed); c.lockedTeam = c.buzzed; c.buzzed = null;
        playSound("error");
        if (c.wrongTeams.length >= 2) { c.done = true; c.outcome = "لم يتوصل أي فريق إلى الإجابة."; }
        render(); break;
      case "bomb-pass":
        if (!state.timer || c.done) break;
        c.turn = 1 - c.turn; playSound("tick"); render(); break;
      case "closest-submit": {
        if (data.guess !== undefined) {
          const team = Number(data.team);
          const guess = Number(data.guess);
          if (!Number.isFinite(guess) || !c || c.done) break;
          c.guesses[team] = guess;
          showToast(`${teamName(team)} أرسلوا تخمينهم.`);
          render();
          break;
        }
        const inputA = document.querySelector("#guess-a");
        const inputB = document.querySelector("#guess-b");
        if (!inputA || !inputB) break;
        const a = Number(inputA.value), b = Number(inputB.value);
        if (inputA.value === "" || inputB.value === "" || !Number.isFinite(a) || !Number.isFinite(b)) {
          showToast("أدخلوا تخمين الفريقين أولًا."); break;
        }
        c.guesses = [a, b]; c.done = true;
        const distanceA = Math.abs(a - c.answer), distanceB = Math.abs(b - c.answer);
        if (distanceA === distanceB) c.outcome = "تعادل في هذا التحدي — لا نقاط.";
        else {
          const winner = distanceA < distanceB ? 0 : 1;
          award(winner, 2);
          c.outcome = `${teamName(winner)} أقرب للإجابة ويحصل على ${2 * multiplier()} نقطتين!`;
        }
        playSound("success"); render(); break;
      }
      case "tiebreak": startTieBreak(); break;
      case "new-game": newGame(); break;
    }
  }

  document.addEventListener("click", event => {
    const scoreButton = event.target.closest("[data-score]");
    if (scoreButton) {
      const [team, amount] = scoreButton.dataset.score.split(":").map(Number);
      state.teams[team].score = Math.max(0, state.teams[team].score + amount);
      renderScoreboard(); saveState(); playSound(amount > 0 ? "success" : "error");
      return;
    }
    const remoteButton = event.target.closest("[data-remote-action]");
    if (remoteButton && !remoteButton.disabled) {
      const action = remoteButton.dataset.remoteAction;
      const payload = {};
      if (action === "bid") payload.value = Number(document.querySelector("#team-bid")?.value);
      if (action === "auction-submit") payload.count = Number(document.querySelector("#team-count")?.value);
      if (action === "closest-submit") {
        const guessInput = document.querySelector("#team-guess");
        if (!guessInput || guessInput.value === "") { showToast("أدخلوا تخمينكم أولًا."); return; }
        payload.guess = Number(guessInput.value);
      }
      sendRemoteAction(action, payload);
      return;
    }
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) return;
    performAction(button.dataset.action, {
      team: button.dataset.team === undefined ? undefined : Number(button.dataset.team),
      mode: button.dataset.mode,
      role: button.dataset.role
    });
  });

  document.addEventListener("submit", event => {
    if (event.target.id !== "setup-form") return;
    event.preventDefault();
    beginGame();
  });
  document.addEventListener("input", event => {
    if (event.target.id === "team-bid") teamDraft.bid = event.target.value;
    if (event.target.id === "team-count") teamDraft.count = event.target.value;
    if (event.target.id === "team-guess") teamDraft.guess = event.target.value;
    if (event.target.id === "auction-count" && state.challenge) {
      const value = Number(event.target.value);
      state.challenge.answerCount = Number.isFinite(value) && value >= 0 ? value : 0;
      saveState();
    }
    if ((event.target.id === "guess-a" || event.target.id === "guess-b") && state.challenge) {
      const index = event.target.id === "guess-a" ? 0 : 1;
      state.challenge.guesses[index] = event.target.value === "" ? null : Number(event.target.value);
      saveState();
    }
  });
  document.addEventListener("keydown", event => {
    if ((!networkMode || screenRole === "judge") && event.key.toLowerCase() === "p" && !event.repeat && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
      if (state.paused) resumeGame(); else pauseGame();
    }
    if (event.key === "Escape" && state.paused) resumeGame();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.timer?.active) {
      state.timer.remainingMs = currentTimerMs();
      state.timer.endsAt = Date.now() + state.timer.remainingMs;
      saveState();
    }
  });

  if (state.timer?.active) {
    const remaining = currentTimerMs();
    if (remaining <= 0) {
      state.timer = null;
      handleTimerExpired();
    } else {
      state.timer.remainingMs = remaining;
      state.timer.active = false;
      state.paused = true;
    }
  }
  render();
  if (networkMode && screenRole && roomCode) {
    lastActionId = Number(sessionStorage.getItem(`party-box-actions-${roomCode}`) || 0);
    if (cloudMode) connectRealtime().catch(() => {});
    else pollServer();
  }
})();
