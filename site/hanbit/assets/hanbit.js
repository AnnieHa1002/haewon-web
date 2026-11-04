/* 오늘도 한빛은 맑음 · 웹 엔딩북
 * 원고: window.HANBIT_BOOK (tools/build_hanbit.py가 data/hanbit/endingbook.md로 만든다)
 * 이 파일은 갈래를 고르는 규칙(엔딩북의 [진행 안내]·[읽기 안내])과 화면만 담는다.
 */
(function () {
  "use strict";
  var B = window.HANBIT_BOOK;
  var app = document.getElementById("app");
  var STORE = "hanbit.endingbook.v1";
  (function () {
    var m = location.search.match(/[?&]dev=([0-9A-Za-z_-]+)/);
    if (!m) return;
    var tag = "#" + m[1], g = Storage.prototype.getItem, sI = Storage.prototype.setItem, rI = Storage.prototype.removeItem;
    var mine = function (k) { return k === "hanbit.mockdb" ? k : k + tag; };
    Storage.prototype.getItem = function (k) { return g.call(this, mine(k)); };
    Storage.prototype.setItem = function (k, v) { return sI.call(this, mine(k), v); };
    Storage.prototype.removeItem = function (k) { return rI.call(this, mine(k)); };
  })();
  var AUTOSEAT = (location.search.match(/[?&]seat=(daeun|noa|siwoo|haeun|junseo|taesu|sehyun|gm)/) || [])[1] || null;

  /* ───────── 인물 ───────── */
  var ROLES = [
    { k: "daeun", name: "임다은", short: "다은", color: "#2B3A5A", sec: "4-1", img: "CD-P-daeun" },
    { k: "noa", name: "강노아", short: "노아", color: "#6E767B", sec: "4-2", img: "CD-P-noa" },
    { k: "siwoo", name: "권시우", short: "시우", color: "#2F4F3E", sec: "4-3", img: "CD-P-siwoo" },
    { k: "haeun", name: "허하은", short: "하은", color: "#C77B96", sec: "4-4", img: "CD-P-haeun" },
    { k: "junseo", name: "변준서", short: "준서", color: "#B08D2B", sec: "4-5", img: "CD-P-junseo" },
    { k: "taesu", name: "강태수", short: "태수", color: "#6B4A32", sec: "4-6", img: "CD-P-taesu" },
    { k: "sehyun", name: "윤세현", short: "세현", color: "#3a3a3a", sec: "4-7", img: "CD-P-sehyun" }
  ];
  var R = {};
  ROLES.forEach(function (r) { R[r.k] = r; });
  var KIDS = ["daeun", "noa", "siwoo", "haeun", "junseo"];
  // 지목 결과 → 1장 갈래
  var ACC = ["haeun", "siwoo", "taesu", "sehyun", "noa", "daeun", "junseo", "none"];
  var ACC_SEC = { haeun: "1-A", siwoo: "1-B", taesu: "1-C", sehyun: "1-D", noa: "1-E", daeun: "1-F", junseo: "1-G", none: "1-H" };
  function nameOf(k) { return k === "none" ? "사고사 또는 자살" : (R[k] ? R[k].name : k); }

  /* ───────── 판정 항목 (결과 코드에 이 순서로 담긴다 — 순서를 바꾸면 VERSION을 올릴 것) ───────── */
  var VERSION = 1;
  var B3 = 3; // 미정 / 아니다 / 그렇다
  var FACTS = [
    ["stage", 9, "n"],
    ["acc", 9, ACC],
    ["lab", B3], ["t1", B3], ["t2", B3], ["t3", B3], ["t4", B3], ["t5", B3],
    ["pubI59", B3], ["pubI65", B3],
    ["d_bully", 4, ["siwoo", "noa", "other"]], ["d_water", B3], ["d_mirror", B3], ["d_plan", B3], ["d_name", B3],
    ["i01", 4, ["daeun", "sehyun", "other"]],
    ["n_cat", B3], ["n_i65", B3], ["n_choice", 4, ["revenge", "forgive", "none"]],
    ["s_mother", B3], ["s_x1", B3], ["s_x2", B3], ["s_x3", B3],
    ["h_map", B3],
    ["j_p03", B3], ["j_drug", B3], ["j_coins", 6, [0, 1, 2, 3, 4]], ["j_x1", B3], ["j_x2", B3], ["j_leave", B3],
    ["t_a1", B3], ["t_a2", B3], ["t_a3", B3], ["t_a4", B3], ["t_a5", B3],
    ["t_child", 7, ["noa", "junseo", "daeun", "siwoo", "haeun", "blank"]],
    ["t_key", B3], ["t_drug", B3], ["t_daughter", B3],
    ["x_reason", B3], ["x_env", B3], ["x_exposed", B3],
    ["s_culprit", B3] // 2026-11-04 추가: 시우 '사건의 진상' (끝에 붙여서 예전 코드도 그대로 읽힌다)
  ];
  var FACT = {};
  FACTS.forEach(function (f) { FACT[f[0]] = f; });

  /* ───────── 상태 ───────── */
  var st = load();
  function blank() {
    var S = {};
    FACTS.forEach(function (f) { S[f[0]] = null; });
    S.stage = 0;
    return { S: S, sheets: {}, paper: false, role: null, room: null, me: null };
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE);
      if (raw) {
        var o = JSON.parse(raw);
        var b = blank();
        Object.keys(b.S).forEach(function (k) { if (o.S && k in o.S) b.S[k] = o.S[k]; });
        b.sheets = o.sheets || {};
        b.paper = !!o.paper;
        b.role = o.role || null;
        b.room = o.room || null;
        b.me = o.me || null;
        return b;
      }
    } catch (e) { /* 저장소를 못 써도 화면은 돈다 */ }
    return blank();
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(st)); } catch (e) { /* 무시 */ }
  }
  function set(k, v) {
    st.S[k] = v; save();
    if (st.room && DB) {
      var o = {}; o["state/" + k] = v == null ? null : v;
      if (k !== "stage" && k !== "acc") o["by/" + k] = v == null || !st.me ? null : st.me;
      DB.update(rp(""), o);
    }
  }
  function setMany(patch) {
    Object.keys(patch).forEach(function (k) { st.S[k] = patch[k]; });
    save();
    if (st.room && DB) {
      var o = {};
      Object.keys(patch).forEach(function (k) { o["state/" + k] = patch[k] == null ? null : patch[k]; });
      DB.update(rp(""), o);
    }
  }

  /* ───────── 방 (Firebase 실시간 DB · 점검용 ?mock) ───────── */
  var DEVICE = (function () {
    try {
      var d = localStorage.getItem("hanbit.device");
      if (!d) { d = Math.random().toString(36).slice(2, 10); localStorage.setItem("hanbit.device", d); }
      return d;
    } catch (e) { return Math.random().toString(36).slice(2, 10); }
  })();
  var TAB = (function () {
    try {
      var t = sessionStorage.getItem("hanbit.tab");
      if (!t) { t = Math.random().toString(36).slice(2, 10); sessionStorage.setItem("hanbit.tab", t); }
      return t;
    } catch (e) { return Math.random().toString(36).slice(2, 10); }
  })();
  // 자리 주인은 휴대폰(브라우저) 단위. 새로고침·탭을 다시 열어도 같은 자리로 돌아온다
  function isMine(p) { return !!(p && (p.id === DEVICE || p.dev === DEVICE)); }
  // 연결이 끊긴 자리(다른 브라우저로 다시 들어온 경우 등)는 본인 확인 후 가져올 수 있다
  function canReclaim(p) { return !!(p && !isMine(p) && p.online === false); }
  var DB = null;
  var ROOM = null; // 방 전체 데이터 {players, votes, sheets, state, created}
  function rp(path) { return "rooms/" + st.room + (path ? "/" + path : ""); }
  function pathGet(o, parts) { for (var i = 0; i < parts.length; i++) { if (o == null) return null; o = o[parts[i]]; } return o == null ? null : o; }
  function pathSet(o, parts, v) {
    for (var i = 0; i < parts.length - 1; i++) { if (o[parts[i]] == null || typeof o[parts[i]] !== "object") o[parts[i]] = {}; o = o[parts[i]]; }
    if (v == null) delete o[parts[parts.length - 1]]; else o[parts[parts.length - 1]] = JSON.parse(JSON.stringify(v));
  }
  function mockDB() {
    var KEY = "hanbit.mockdb", subs = [];
    function all() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; } }
    function fire() { var d = all(); subs.forEach(function (x) { x.cb(pathGet(d, x.parts)); }); }
    window.addEventListener("storage", function (e) { if (e.key === KEY) fire(); });
    function write(fn) { var d = all(); fn(d); localStorage.setItem(KEY, JSON.stringify(d)); setTimeout(fire, 0); return Promise.resolve(); }
    return {
      on: function (path, cb) { var x = { parts: path.split("/"), cb: cb }; subs.push(x); setTimeout(function () { cb(pathGet(all(), x.parts)); }, 0); return function () { subs = subs.filter(function (y) { return y !== x; }); }; },
      set: function (path, v) { return write(function (d) { pathSet(d, path.split("/"), v); }); },
      update: function (path, o) { return write(function (d) { Object.keys(o).forEach(function (k) { pathSet(d, (path ? path + "/" + k : k).split("/"), o[k]); }); }); },
      once: function (path) { return Promise.resolve(pathGet(all(), path.split("/"))); },
      claim: function (path, make) {
        var d = all(), parts = path.split("/"), v = make(pathGet(d, parts));
        if (v === undefined) return Promise.resolve(false);
        pathSet(d, parts, v); localStorage.setItem(KEY, JSON.stringify(d)); setTimeout(fire, 0);
        return Promise.resolve(true);
      },
      presence: function (path) {
        var parts = path.split("/");
        write(function (d) { pathSet(d, parts, true); });
        window.addEventListener("pagehide", function () { var d = all(); if (pathGet(d, parts.slice(0, -1))) { pathSet(d, parts, false); localStorage.setItem(KEY, JSON.stringify(d)); } });
      }
    };
  }
  function fireDB() {
    var cfg = window.HANBIT_FIREBASE;
    if (!cfg || !window.firebase || !cfg.databaseURL) return null;
    try {
      if (!window.firebase.apps.length) window.firebase.initializeApp(cfg);
      var d = window.firebase.database();
      return {
        on: function (path, cb) { var r = d.ref(path); var h = r.on("value", function (snap) { cb(snap.val()); }); return function () { r.off("value", h); }; },
        set: function (path, v) { return d.ref(path).set(v); },
        update: function (path, o) { return d.ref(path).update(o); },
        once: function (path) { return d.ref(path).once("value").then(function (snap) { return snap.val(); }); },
        // 서버에서 한 번에 확인하고 차지한다(동시에 같은 코드를 만들어도 한 명만 성공)
        claim: function (path, make) { return d.ref(path).transaction(make).then(function (r) { return r.committed; }); },
        // 탭이 닫히거나 연결이 끊기면 서버가 알아서 online=false 로 바꾼다
        presence: function (path) {
          var r = d.ref(path), conn = d.ref(".info/connected");
          if (fireDB.presOff) fireDB.presOff();
          var h = conn.on("value", function (snap) { if (snap.val() === true) { r.onDisconnect().set(false); r.set(true); } });
          fireDB.presOff = function () { conn.off("value", h); r.onDisconnect().cancel(); };
        }
      };
    } catch (e) { console.warn("Firebase 연결 실패", e); return null; }
  }
  DB = /[?&]mock\b/.test(location.search) ? mockDB() : fireDB();

  var unsub = null;
  function enterRoom(code) {
    if (!DB) return;
    if (unsub) unsub();
    if (st.room !== code) { var b = blank(); b.room = code; b.me = null; st = b; }
    save();
    unsub = DB.on("rooms/" + code, function (val) {
      var prevStage = st.S.stage || 0;
      ROOM = val || {};
      var b = blank();
      var remote = ROOM.state || {};
      Object.keys(b.S).forEach(function (k) { b.S[k] = k in remote ? remote[k] : (k === "stage" ? 0 : null); });
      st.S = b.S;
      st.sheets = ROOM.sheets || {};
      var P0 = ROOM.players || {};
      if (st.me && !isMine(P0[st.me])) {
        if (enterRoom.seated) enterRoom.kicked = { seat: st.me, by: P0[st.me] ? "other" : "freed" };
        st.me = null; enterRoom.seated = false;
        if (!/^#\/room/.test(location.hash)) { location.hash = "#/room"; }
      }
      if (!st.me) { Object.keys(P0).forEach(function (k) { if (isMine(P0[k])) st.me = k; }); }
      if (st.me) enterRoom.seated = true;
      if (st.me && P0[st.me] && P0[st.me].online === false) DB.presence(rp("players/" + st.me + "/online"));
      save();
      if (isPlayer() && !(ROOM.sheets && ROOM.sheets[st.me])) { try { var sent = JSON.parse(localStorage.getItem(draftKey(st.me) + ".sent") || "null"); if (sent && sent.done) DB.set(rp("sheets/" + st.me), sent); } catch (e) { /* 무시 */ } }
      // 내 지목이 서버에서 빠졌으면(다시 지목한 게 아니면) 휴대폰에 기억한 걸로 다시 채운다
      if (isPlayer() && (st.S.stage || 0) < stepIndex("ch1") && !(ROOM.votes && ROOM.votes[st.me])) { var lv = localVote(); if (lv) castVote(lv); }
      advanceIfReady();
      if (AUTOSEAT && !st.me && ROOM.created && !claimSeat.tried) { claimSeat.tried = true; claimSeat(AUTOSEAT); }
      var newStage = st.S.stage || 0;
      var h = location.hash;
      // 다 같이 넘어가기: 지금 보던 단계가 방의 이전 단계였거나 대기 화면이면 새 단계로 따라간다
      if (newStage !== prevStage && newStage >= stepIndex("ch1") && (h === "#/play/" + STEPS[prevStage].id || /^#\/(wait|vote|mysheet)/.test(h))) {
        location.hash = "#/play/" + STEPS[newStage].id;
        return;
      }
      softRender();
    });
  }
  function leaveRoom() { if (unsub) unsub(); unsub = null; ROOM = null; st = blank(); save(); }
  function softRender() {
    if (/^#\/(mysheet|sheet\/)/.test(location.hash) && document.querySelector("form[data-sheet]")) { softRender.pending = false; return; }
    var a = document.activeElement;
    if (a && /^(TEXTAREA|INPUT|SELECT)$/.test(a.tagName) && a.closest("form[data-sheet]")) { softRender.pending = true; return; }
    softRender.pending = false;
    rerender();
  }
  function newRoomCode() {
    var A = "23456789ABCDEFGHJKMNPQRSTVWXYZ", c = "";
    for (var i = 0; i < 4; i++) c += A[Math.floor(Math.random() * A.length)];
    return c;
  }
  var ROOM_TTL = 2 * 24 * 3600 * 1000; // 이틀 지난 방의 코드는 다시 쓸 수 있다
  function createRoom() {
    var tryOne = function (n) {
      if (n >= 20) return Promise.reject(new Error("빈 방 코드를 찾지 못했어요. 잠시 뒤 다시 눌러 주세요"));
      var code = newRoomCode(), now = Date.now();
      return DB.claim("rooms/" + code, function (cur) {
        if (cur && cur.created && now - cur.created < ROOM_TTL) return undefined; // 쓰는 중인 코드 → 다른 코드로
        return { created: now };
      }).then(function (ok) { return ok ? code : tryOne(n + 1); });
    };
    return tryOne(0);
  }
  function joinURL(code) { return location.href.split("#")[0] + "#join=" + code; }
  function players() { return (ROOM && ROOM.players) || {}; }
  function claimed() { return ROLES.filter(function (r) { return players()[r.k]; }).map(function (r) { return r.k; }); }
  // 방에 앉은 모두(캐릭터 7 + GM 1). GM은 '다음으로' 준비에 함께 세지만 지목·결정지는 하지 않는다
  function seated() { var P = players(); return claimed().concat(P.gm ? ["gm"] : []); }
  function isGM() { return st.me === "gm"; }
  function isAdmin() { return !!st.me && (isGM() || !players().gm); }
  function isPlayer() { return !!(st.me && R[st.me]); }
  function seatName(k) { return k === "gm" ? "GM" : (R[k] ? R[k].name : k); }
  function seatShort(k) { return k === "gm" ? "GM" : (R[k] ? R[k].short : k); }
  function readyFor(stepId) { return (ROOM && ROOM.ready && ROOM.ready[stepId]) || {}; }
  // '다음으로' 준비는 캐릭터 7명만 센다 (GM은 빼고, 대신 '기다리지 않고 넘기기'가 있다)
  function readyCount(stepId) { var r = readyFor(stepId), w = claimed(); return { n: w.filter(function (k) { return r[k]; }).length, m: w.length, wait: w.filter(function (k) { return !r[k]; }) }; }
  // 모두 준비했으면 한 단계 넘긴다(여러 폰이 동시에 해도 한 번만 넘어가게 서버에서 확인)
  // 서버에서 한 번에 확인: 이미 다른 기기가 앉은 자리는 못 고른다, 한 기기는 한 자리만
  // takeover=true: 이미 앉은 휴대폰을 끊고 이 휴대폰이 그 역할로 들어간다 (다시 접속할 때)
  function claimSeat(rk, takeover) {
    return DB.claim(rp("players"), function (cur) {
      cur = cur || {};
      if (cur[rk] && !isMine(cur[rk]) && !takeover) return undefined; // 확인 없이 남의 자리는 못 고른다
      Object.keys(cur).forEach(function (k) { if (isMine(cur[k])) delete cur[k]; });   // 한 사람(탭)은 한 자리만
      cur[rk] = { id: DEVICE, dev: DEVICE, at: Date.now(), online: true };
      return cur;
    }).then(function (ok) {
      if (!ok) { toast(seatName(rk) + "은(는) 방금 다른 사람이 골랐어요"); return false; }
      st.me = rk; if (R[rk]) st.role = rk; enterRoom.kicked = null; save();
      DB.presence(rp("players/" + rk + "/online"));
      rerender(); return true;
    });
  }
  // 방에 앉은 캐릭터 모두가 지목했고, 지목 결과(가장 많이 지목된 사람)가 정해졌는가
  function allVoted() { var w = claimed(), V = votes(); return w.length > 0 && w.every(function (k) { return V[k]; }); }
  function voteDone() { return allVoted() && !!st.S.acc; }
  function advanceIfReady() {
    if (!inRoom() || !ROOM) return;
    var stage = st.S.stage || 0, cur = STEPS[stage];
    if (stage < stepIndex("ch1")) {
      var w = claimed();
      // 지목이 끝나기 전에는 지목 결과를 두지 않는다 (늦게 들어온 사람이 있으면 결과를 지우고 다시 모은다)
      if (st.S.acc != null && !allVoted()) { set("acc", null); return; }
      if (voteDone() && w.every(function (k) { var s2 = st.sheets[k]; return s2 && s2.done; })) bumpStage(stage, stepIndex("ch1"));
    }
  }
  function bumpStage(from, to) {
    DB.claim(rp("state/stage"), function (v) { return (v || 0) === from ? to : undefined; });
  }
  function votes() { return (ROOM && ROOM.votes) || {}; }
  function voteRound() { return (ROOM && ROOM.state && ROOM.state.voteRound) || 0; }
  function myVoteKey() { return "hanbit.vote." + st.room + "." + st.me; }
  function localVote() { try { var o = JSON.parse(localStorage.getItem(myVoteKey()) || "null"); return o && o.round === voteRound() ? o.v : null; } catch (e) { return null; } }
  function castVote(v) {
    try { localStorage.setItem(myVoteKey(), JSON.stringify({ round: voteRound(), v: v })); } catch (e) { /* 무시 */ }
    return DB.set(rp("votes/" + st.me), v);
  }
  function inRoom() { return !!(st.room && DB); }

  /* ───────── 결과 코드 ───────── */
  var ALPH = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  function enc(f, v) {
    if (f[2] === "n") return v || 0;
    if (Array.isArray(f[2])) { var i = f[2].indexOf(v); return i < 0 ? 0 : i + 1; }
    return v === null || v === undefined ? 0 : (v ? 2 : 1);
  }
  function dec(f, n) {
    if (f[2] === "n") return n;
    if (Array.isArray(f[2])) return n === 0 ? null : f[2][n - 1];
    return n === 0 ? null : n === 2;
  }
  function makeCode(S) {
    var N = 0n;
    for (var i = FACTS.length - 1; i >= 0; i--) {
      N = N * BigInt(FACTS[i][1]) + BigInt(enc(FACTS[i], S[FACTS[i][0]]));
    }
    var s = "";
    while (N > 0n) { s = ALPH[Number(N % 32n)] + s; N = N / 32n; }
    s = String(VERSION) + s;
    var sum = 0;
    for (var j = 0; j < s.length; j++) sum = (sum + ALPH.indexOf(s[j]) * (j + 1)) % 32;
    s += ALPH[sum];
    return s.replace(/(.{4})(?=.)/g, "$1-");
  }
  function readCode(txt) {
    var s = String(txt || "").toUpperCase().replace(/O/g, "0").replace(/[IL]/g, "1").replace(/U/g, "V").replace(/[^0-9A-Z]/g, "");
    if (s.indexOf("HB") === 0) s = s.slice(2);
    if (s.length < 3) return null;
    var body = s.slice(0, -1), chk = s.slice(-1), sum = 0;
    for (var j = 0; j < body.length; j++) {
      var d = ALPH.indexOf(body[j]);
      if (d < 0) return null;
      sum = (sum + d * (j + 1)) % 32;
    }
    if (ALPH[sum] !== chk) return null;
    if (body[0] !== String(VERSION)) return null;
    var N = 0n;
    for (var k = 1; k < body.length; k++) N = N * 32n + BigInt(ALPH.indexOf(body[k]));
    var S = {};
    for (var i = 0; i < FACTS.length; i++) {
      var f = FACTS[i], r = BigInt(f[1]);
      S[f[0]] = dec(f, Number(N % r));
      N = N / r;
    }
    return S;
  }
  function codeURL(code) {
    return location.href.split("#")[0] + "#r=" + code.replace(/-/g, "");
  }

  /* ───────── 원고 찾기 ───────── */
  function chapter(id) { return B.chapters.filter(function (c) { return c.id === String(id); })[0]; }
  function allSections() {
    var out = [];
    B.chapters.forEach(function (c) { c.sections.forEach(function (s) { out.push(s); }); });
    return out;
  }
  function sec(id) {
    var all = allSections();
    return all.filter(function (s) { return s.id === id; })[0] || all.filter(function (s) { return s.key === id; })[0];
  }
  function truthLines() {
    var s = sec("2-2 · 판정") || allSections().filter(function (x) { return /판정/.test(x.id); })[0];
    if (!s) return [];
    return s.blocks.filter(function (b) { return b.t === "p" && /^[①②③④⑤]/.test(b.x); }).map(function (b) { return b.x; });
  }

  /* ───────── 규칙: 엔딩북의 진행 안내를 그대로 옮김 ───────── */
  function derive(S) {
    var D = {};
    D.acc = S.acc;
    D.arrested = S.acc == null ? undefined : (S.acc === "haeun" || S.acc === "siwoo") ? "haeun" : S.acc === "none" ? null : S.acc;
    var ts = ["t1", "t2", "t3", "t4", "t5"].map(function (k) { return S[k]; });
    D.truthCount = ts.filter(function (x) { return x === true; }).length;
    D.truthUnknown = ts.filter(function (x) { return x == null; }).length;
    D.truthOK = D.truthCount >= 4 ? true : (D.truthCount + D.truthUnknown < 4 ? false : null);

    // 2-3 탈출
    D.esc = null; D.escWhy = [];
    if (S.acc == null) { D.escWhy.push("지목 결과가 정해져야 합니다"); }
    else if (S.acc === "taesu") { D.esc = "ARREST"; D.escStep = "①"; }
    else {
      var reasonApplies = S.acc !== "sehyun";
      if (reasonApplies && S.x_reason == null) D.escWhy.push("윤세현의 ‘강태수가 온 이유’ 판정");
      else if (reasonApplies && S.x_reason === true) {
        D.escStep = "②";
        if (S.t_drug == null) D.escWhy.push("태수가 「작은 약통」(I29)·「갈색 약병」(I24)을 가졌는지");
        else D.esc = S.t_drug ? "2-A" : "2-B";
      } else if (S.t_key == null) D.escWhy.push("태수가 「차 열쇠」(I12)를 가졌는지");
      else if (!S.t_key) { D.esc = "NOKEY"; D.escStep = "③"; }
      else {
        D.escStep = "④";
        var c = S.t_child;
        if (c == null) D.escWhy.push("태수가 ‘데려갈 아이’에 적은 이름");
        else if (c === "blank" || c === D.arrested) D.esc = "2-F";
        else if (c === "noa") D.esc = "2-C";
        else if (c === "junseo") D.esc = "2-D";
        else D.esc = "2-E";
      }
    }
    D.escSec = /^2-/.test(D.esc || "") ? D.esc : null;
    D.taesuArrested = D.esc == null ? null : (D.esc === "ARREST" || D.esc === "2-B" || D.esc === "2-E");

    // 다은의 제보
    if (S.i01 === "daeun" && S.d_plan === true) D.report = true;
    else if ((S.i01 != null && S.i01 !== "daeun") || S.d_plan === false) D.report = false;
    else D.report = null;

    // 3장
    if (D.esc === "2-C" || D.esc === "2-D") D.ch3 = "3-A";
    else if (D.truthOK === true || D.report === true) D.ch3 = "3-A";
    else if (D.truthOK === false && D.report === false) D.ch3 = "3-B";
    else D.ch3 = null;

    D.siwooSecret = (S.d_bully === "siwoo" || S.n_cat === true) ? true : (S.d_bully != null && S.n_cat === false) ? false : null;
    D.labOpen = S.lab;
    return D;
  }

  // 점수 한 줄
  function item(label, max, ok, pts, why) {
    return { label: label, max: max, ok: ok, pts: ok === true ? (pts == null ? max : pts) : ok === false ? (pts || 0) : null, why: why || "" };
  }
  function unk() { var a = arguments; for (var i = 0; i < a.length; i++) if (a[i] == null) return true; return false; }
  function and(a, b) { if (a === false || b === false) return false; if (a == null || b == null) return null; return true; }
  function not(a) { return a == null ? null : !a; }
  function is(v, x) { return v == null ? null : v === x; }

  function scoreOf(k, S, D) {
    var it = [], ends = [], extra = [];
    var culprit = D.arrested === undefined ? null : D.arrested === "haeun";
    var accNot = function (arr) { return S.acc == null ? null : arr.indexOf(S.acc) < 0; };
    if (k === "daeun") {
      it.push(item("진범 지목", 4, culprit, null, "허하은이 연행됐다"));
      it.push(item("엄마가 준 손거울의 비밀", 2, S.d_mirror));
      it.push(item("엄마가 오늘 하려던 일", 3, S.d_plan));
      it.push(item("[추가 목표] 엄마의 진짜 이름", 3, S.d_name));
      if (D.report === true) ends.push("유언을 지키다");
      else if (D.report === false) ends.push("연구 구역을 떠나다");
      var dad = (S.t_daughter === true || S.pubI59 === true) ? true : (S.t_daughter === false && S.pubI59 !== true && S.pubI59 != null) ? false : null;
      var skip = (D.esc === "2-A" || D.esc === "2-F") && D.ch3 === "3-B";
      if (dad === true && !skip) {
        if (D.taesuArrested == null) extra.push({ unknown: "태수가 구속됐는지(2장)가 정해지면 덧붙임이 나옵니다" });
        else extra.push(D.taesuArrested ? "면회 자리의 아빠" : "아빠라는 사람");
      } else if (dad == null) extra.push({ unknown: "태수의 ‘내 딸’ 칸과 「다은 입소 기록」(I59) 공개 여부가 정해지면 덧붙임 여부가 나옵니다" });
    }
    if (k === "noa") {
      it.push(item("진범 지목", 4, culprit, null, "허하은이 연행됐다"));
      it.push(item("학교폭력의 진짜 지시자", 3, is(S.d_bully, "siwoo"), null, "다은의 결정지 ‘학교폭력 관계자’에 권시우"));
      it.push(item("고양이를 죽게 한 범인", 3, S.n_cat));
      var x;
      if (S.n_choice == null || S.n_i65 == null) x = item("[추가 목표] 노아의 마지막 선택", 2, null);
      else if (S.n_i65 && S.n_choice !== "none") x = item("[추가 목표] 노아의 마지막 선택", 2, true, 2, "「노아에게」를 가진 채 복수 또는 용서");
      else if (!S.n_i65 && S.n_choice === "revenge") x = item("[추가 목표] 노아의 마지막 선택", 2, true, 1, "편지 없이 복수만 골라 1점");
      else x = item("[추가 목표] 노아의 마지막 선택", 2, false);
      it.push(x);
      var hasLetter = (S.n_i65 === true || S.pubI65 === true);
      if (!hasLetter && (S.n_i65 == null || (S.lab !== false && S.pubI65 == null))) extra.push({ unknown: "「노아에게」(I65)를 가졌는지·공개됐는지 정해지면, 편지를 먼저 읽을지 나옵니다" });
      if (hasLetter) {
        ends.push("노아에게");
        if (S.n_choice === "revenge") ends.push("잘린 편지");
        else if (S.n_choice === "forgive") ends.push("주머니 속 편지");
      }
      if (D.ch3 === "3-A") ends.push("새로운 세상");
      else if (D.ch3 === "3-B" && D.siwooSecret === true) ends.push("진실을 밝히다");
      else if (D.ch3 === "3-B" && D.siwooSecret === false) ends.push("남겨진 밥그릇");
    }
    if (k === "siwoo") {
      it.push(item("지목되지 않기", 2, accNot(["siwoo"])));
      it.push(item("사건의 진상", 2, S.s_culprit, null, "허하은 + 벽돌로 머리를 쳤다"));
      it.push(item("학교폭력과 덫·고양이 숨기기", 2, and(is(S.d_bully, "noa"), not(S.n_cat)), null, "다은의 칸에 강노아 + 노아의 고양이 답 불인정"));
      it.push(item("어머니가 하는 일", 3, S.s_mother));
      var xs = [S.s_x1, S.s_x2, S.s_x3];
      var xc = xs.filter(function (v) { return v === true; }).length;
      it.push(unk(S.s_x1, S.s_x2, S.s_x3) && xc === 0 ? item("[추가 목표] 시우의 기록", 3, null) : item("[추가 목표] 시우의 기록", 3, xc > 0, xc, xc + "개 맞힘"));
      if (D.ch3 === "3-A") ends.push("관찰일지 속의 나");
      else if (D.ch3 === "3-B" && D.siwooSecret === true) ends.push("가려지지 않는 것");
      else if (D.ch3 === "3-B" && D.siwooSecret === false) ends.push("일등의 표정");
    }
    if (k === "haeun") {
      it.push(item("나도 시우도 지목되지 않기", 4, accNot(["haeun", "siwoo"])));
      var f1 = S.d_bully == null ? null : S.d_bully !== "siwoo";
      var f2 = not(S.n_cat);
      it.push(item("시우의 흠 ① 학교폭력", 3, f1));
      it.push(item("시우의 흠 ② 고양이", 3, f2));
      it.push(item("[추가 목표] 지도 아래", 2, S.h_map));
      var kept = and(f1, f2);
      if (D.arrested === "haeun") ends.push("나 잘했지?");
      else if (D.arrested !== undefined) {
        if (D.ch3 === "3-A") ends.push("엄마의 이름");
        else if (D.ch3 === "3-B" && kept === true) ends.push("기다리는 공주");
        else if (D.ch3 === "3-B" && kept === false) ends.push("다시 온 선물");
      }
    }
    if (k === "junseo") {
      it.push(item("다은에게 미움받지 않기", 2, not(S.d_water), null, "다은의 ‘물을 쏟은 사람’ 칸에 변준서가 없다"));
      it.push(item("진범 지목", 2, culprit, null, "허하은이 연행됐다"));
      it.push(item("탈출 준비", 3, and(S.j_p03, S.j_drug), null, "「쪽문 열쇠」(P03) + 약 카드"));
      it.push(S.j_coins == null ? item("돈", 3, null) : item("돈", 3, S.j_coins > 0, Math.min(3, S.j_coins), "동전 카드 " + S.j_coins + "장"));
      var jx = [S.j_x1, S.j_x2].filter(function (v) { return v === true; }).length;
      it.push(unk(S.j_x1, S.j_x2) && jx === 0 ? item("[추가 목표] 친부모를 찾을 단서", 2, null) : item("[추가 목표] 친부모를 찾을 단서", 2, jx > 0, jx));
      if (D.ch3 === "3-A") ends.push("나를 낳은 사람");
      else if (D.ch3 === "3-B") {
        if (D.arrested === "junseo") ends.push("문밖의 발소리");
        else if (S.j_p03 === true && S.j_leave === true) ends.push("내가 연 문");
        else if (S.j_p03 === false || S.j_leave === false) ends.push("다시 숨긴 가방");
      }
    }
    if (k === "taesu") {
      var ab = ["t_a1", "t_a2", "t_a3", "t_a4", "t_a5"].map(function (q) { return S[q]; });
      var an = ab.filter(function (v) { return v === true; }).length;
      it.push(ab.every(function (v) { return v == null; }) ? item("학대 알아내기", 5, null) : item("학대 알아내기", 5, an > 0, an, an + "명 맞힘"));
      it.push(item("범죄 이력 숨기기", 1, S.lab === false ? true : not(S.pubI59), null, S.lab === false ? "연구실이 열리지 않아 자동 달성" : "「다은 입소 기록」(I59)이 공개되지 않았다"));
      it.push(item("구제 계획 숨기기", 4, S.acc === "sehyun" ? true : not(S.x_reason), null, S.acc === "sehyun" ? "윤세현이 가장 많이 지목됨" : "윤세현이 ‘온 이유’를 맞히지 못했다"));
      it.push(item("[추가 목표] 딸을 찾는다", 2, S.t_daughter));
      var e = D.esc, c3 = D.ch3, main = null;
      if ((e === "2-A" || e === "2-F") && c3 === "3-B") main = "익숙한 목소리";
      else if ((e === "2-A" || e === "2-F") && c3 === "3-A") main = "뒤늦게 열린 문";
      else if (e === "2-B" || e === "ARREST") main = "펼치지 못한 담요";
      else if (e === "2-E") main = "닫힌 조사실";
      else if (e === "2-C" || e === "2-D") main = "아이와 함께 나온 말";
      else if (e === "NOKEY") main = "담장 안의 아이들";
      if (main) ends.push(main);
      var dd = (S.t_daughter === true || S.pubI59 === true);
      if (dd && main !== "익숙한 목소리" && main) extra.push("밥은 먹었니");
    }
    if (k === "sehyun") {
      it.push(item("진범 지목", 2, culprit, null, "허하은이 연행됐다"));
      var id = S.acc === "sehyun" ? false : not(S.x_exposed);
      it.push(item("정체 숨기기", 4, id, null, "다른 여섯 장 중 Dr.J·쌍둥이 동생이라 적은 용지가 셋 미만 + 가장 많이 지목되지 않음"));
      it.push(item("고발 자료 회수", 3, S.i01 == null ? null : S.i01 === "sehyun", null, "최종 결정 직전 「콤팩트 손거울」(I01)"));
      it.push(item("연구실 지키기", 3, not(S.lab)));
      it.push(S.x_env === false ? item("[추가 목표] 연구를 덮는다", 3, false, 0, "봉투를 열지 않음") : item("[추가 목표] 연구를 덮는다", 3, and(S.x_env, not(D.truthOK)), null, "진상 판정 실패(셋 이하)"));
      if (D.ch3 === "3-A") ends.push("공격성 발현 확인");
      else if (D.ch3 === "3-B" && id === true) ends.push("빈칸의 이름");
      else if (D.ch3 === "3-B" && id === false) ends.push("같은 얼굴");
    }
    var total = 0, known = true;
    it.forEach(function (x) { if (x.pts == null) known = false; else total += x.pts; });
    return { items: it, total: total, complete: known, ends: ends, extra: extra };
  }

  /* ───────── 결정지 (종이 결정지와 같은 칸) ───────── */
  var IDQ = { id: "identity", q: "오늘 당직 ‘윤세현’의 정체는 무엇인가?", type: "text" };
  var SHEETS = {
    daeun: [
      { id: "bully", q: "학교폭력 관계자는 누구인가", type: "person" },
      { id: "water", q: "상장 파일에 물을 쏟은 사람은 누구인가", type: "person" },
      { id: "mirror", q: "엄마가 준 손거울의 비밀은?", type: "text" },
      { id: "plan", q: "엄마가 오늘 하려던 것은 무엇일까?", type: "text" },
      IDQ,
      { id: "x1", q: "1. 엄마의 진짜 이름은 무엇인가?", type: "text", extra: true },
      { id: "c_i01", q: "지금 「콤팩트 손거울」(I01)을 가지고 있다", type: "check", card: true }
    ],
    noa: [
      { id: "cat", q: "고양이를 죽게 한 사람", type: "person" },
      { id: "catHow", q: "어떻게 죽게 했는지", type: "text" },
      IDQ,
      { id: "choice", q: "1.", type: "radio", opts: [["revenge", "복수"], ["forgive", "용서"]], extra: true },
      { id: "c_i65", q: "지금 「노아에게」(I65)를 가지고 있다", type: "check", card: true }
    ],
    siwoo: [
      IDQ,
      { id: "culprit", q: "다은이 엄마를 죽게 한 사람은 누구이고, 어떻게 했는가?", type: "text" },
      { id: "mother", q: "어머니는 연구동 쪽에서 무엇을 하는가?", type: "text" },
      { id: "x1", q: "1. 'Dr.IN'과 'Dr.J'는 어떤 관계인가?", type: "text", extra: true },
      { id: "x2", q: "2. 연구에 대해 아는 것을 쓰시오. (원인, 목적, 과정 등)", type: "text", extra: true },
      { id: "x3", q: "3. 오늘의 사건이 연구와 관련이 있습니까? 있다면 어떻게 관련이 있습니까?", type: "text", extra: true }
    ],
    haeun: [
      IDQ,
      { id: "c_map", q: "추가 목표대로 시설 안내도 아래에 카드 1장을 숨겼고, 지금까지 아무도 들춰 보지 않았다", type: "check", card: true }
    ],
    junseo: [
      { id: "leave", q: "나는", type: "radio", opts: [["out", "나간다"], ["stay", "남는다"]], note: "「쪽문 열쇠」 카드를 갖고 있을 때만 나갈 수 있다." },
      IDQ,
      { id: "x1", q: "1. 나를 낳은 부모는 누구이고, 왜 나를 맡겼는가?", type: "text", extra: true },
      { id: "c_p03", q: "지금 「쪽문 열쇠」(P03)를 가지고 있다", type: "check", card: true },
      { id: "c_drug", q: "약 카드(「이름표 없는 약통」(I10)·「작은 약통」(I29)·「개인실 서랍」(I52)·「갈색 약병」(I24)) 가운데 1장 이상을 가지고 있다", type: "check", card: true },
      { id: "coins", q: "마지막에 남긴 3장 안에 있고 공개되지 않은 동전 카드(I02·I06·I07·I14) 수", type: "count", max: 4, card: true }
    ],
    taesu: [
      { id: "a1", q: "임다은", type: "text", pre: "다섯 아이가 집에서 겪는 일을 한 줄씩 적는다." },
      { id: "a2", q: "강노아", type: "text" },
      { id: "a3", q: "권시우", type: "text" },
      { id: "a4", q: "허하은", type: "text" },
      { id: "a5", q: "변준서", type: "text" },
      { id: "child", q: "오늘 밤 데려갈 아이 한 명", type: "kid", note: "「차 열쇠」 카드를 갖고 있을 때만 데려갈 수 있다." },
      IDQ,
      { id: "daughter", q: "1. 내 딸", type: "kid", extra: true },
      { id: "c_key", q: "지금 「차 열쇠」(I12)를 가지고 있다", type: "check", card: true },
      { id: "c_drug", q: "지금 「작은 약통」(I29)이나 「갈색 약병」(I24)을 가지고 있다", type: "check", card: true }
    ],
    sehyun: [
      { id: "reason", q: "강태수가 연차인 오늘 시설에 온 이유", type: "text" },
      { id: "c_i01", q: "지금 「콤팩트 손거울」(I01)을 가지고 있다", type: "check", card: true },
      { id: "c_env", q: "추가 목표 봉투를 열어 보았다", type: "check", card: true }
    ]
  };
  function sh(k) { return st.sheets[k] || null; }
  function ans(k, id) { var s = sh(k); return s && s.done ? s[id] : undefined; }

  // 결정지 → 판정 항목 (고른 답은 바로, 글로 쓴 답은 판정 화면에서)
  function syncSheets() {
    var before = JSON.stringify(st.S), S = JSON.parse(before);
    var d = sh("daeun"), n = sh("noa"), h = sh("haeun"), j = sh("junseo"), t = sh("taesu"), x = sh("sehyun");
    if (d && d.done) {
      S.d_bully = d.bully === "siwoo" ? "siwoo" : d.bully === "noa" ? "noa" : "other";
      S.d_water = d.water === "junseo";
      if (S.d_name == null && d.x1 && /한\s*서\s*[인진]/.test(d.x1)) S.d_name = true;
    }
    if (n && n.done) {
      S.n_i65 = !!n.c_i65;
      S.n_choice = n.choice || "none";
      if (n.cat !== "siwoo") S.n_cat = false;
    }
    if (d && d.done && d.c_i01) S.i01 = "daeun";
    else if (x && x.done && x.c_i01) S.i01 = "sehyun";
    else if (d && d.done && x && x.done) S.i01 = "other";
    var sw = sh("siwoo");
    if (sw && sw.done && S.s_culprit == null && !/하\s*은/.test(sw.culprit || "")) S.s_culprit = false;
    if (h && h.done) S.h_map = !!h.c_map;
    if (j && j.done) {
      S.j_p03 = !!j.c_p03; S.j_drug = !!j.c_drug; S.j_coins = Math.max(0, Math.min(4, +j.coins || 0));
      S.j_leave = j.leave === "out" && !!j.c_p03;
      if (S.j_x1 == null && j.x1 && /조\s*미\s*영/.test(j.x1)) S.j_x1 = true;
    }
    if (t && t.done) {
      S.t_key = !!t.c_key; S.t_drug = !!t.c_drug;
      S.t_child = t.child || "blank";
      S.t_daughter = t.daughter === "daeun";
    }
    if (x && x.done) S.x_env = !!x.c_env;
    var old = JSON.parse(before), patch = {};
    Object.keys(S).forEach(function (k) { if (S[k] !== old[k]) patch[k] = S[k]; });
    if (Object.keys(patch).length) setMany(patch); else save();
  }

  /* ───────── 그리기 도구 ───────── */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function img(id) { return B.images && B.images[id] ? "img/" + B.images[id] + ".jpg" : null; }
  function roleImg(k) { return "img/" + R[k].img + ".jpg"; }
  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg; t.classList.add("on");
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("on"); }, 2200);
  }
  function linkGo(text) {
    return esc(text).replace(/(\d-[0-9A-H](?:-\d)?)|(\d)장/g, function (m, id, ch) {
      if (id && sec(id)) return '<a href="#/book/' + encodeURIComponent(sec(id).id) + '">' + id + "</a>";
      if (ch && chapter(ch)) return '<a href="#/book/ch' + ch + '">' + m + "</a>";
      return m;
    });
  }

  // 원고 블록 → HTML. mode: "book"(전부) | "play"(진행 화면: 안내는 접고 엔딩북 이동 줄은 숨김)
  function blocksHTML(blocks, opt) {
    opt = opt || {};
    var out = [], skipP = 0;
    blocks.forEach(function (b, i) {
      var x = esc(b.x);
      switch (b.t) {
        case "p":
          if (opt.skipBeforeAlt && i < opt.altIndex && i > opt.firstPara - 1 && skipP < 3) { skipP++; return; }
          out.push('<p' + (b.letter ? ' class="letter"' : "") + ">" + x + "</p>");
          break;
        case "note":
          if (opt.mode === "play" && opt.hideNotes) return;
          out.push('<div class="note"><b>' + esc(b.k) + "</b>" + (opt.mode === "book" ? linkGo(b.x) : x) + "</div>");
          break;
        case "go":
          if (opt.mode === "play") return;
          out.push('<div class="go">→ ' + linkGo(b.x) + "</div>");
          break;
        case "li": out.push('<div class="li">· ' + (opt.mode === "book" ? linkGo(b.x) : x) + "</div>"); break;
        case "check": if (opt.mode === "play" && opt.hideChecks) return; out.push('<div class="check">□ ' + x + "</div>"); break;
        case "total": if (opt.mode === "play") return; out.push('<p class="muted small">' + x + "</p>"); break;
        case "reader": out.push('<div class="reader">' + x + "</div>"); break;
        case "q": out.push('<p class="q">' + x + "</p>"); break;
        case "h4": if (opt.mode === "play" && opt.hideChecks) return; out.push('<div class="h4">' + x + "</div>"); break;
        case "mark": if (opt.mode === "play" && opt.hideChecks) return; out.push('<p class="mark">' + x + "</p>"); break;
        case "alt":
          if (opt.mode === "play" && opt.altHide) return;
          out.push('<p class="alt"><span class="ctag">▷ 윤세현이 지목됐을 때</span>' + x.replace(/^\(윤세현이 지목됐을 때\)\s*/, "") + "</p>");
          break;
        case "cond":
          if (opt.mode === "play" && opt.lab === false) return;
          out.push('<p class="cond"><span class="ctag">연구실이 열렸다면</span>' + x + "</p>");
          break;
        case "diary":
          out.push('<div class="diary-h">【' + x + "】</div>");
          var di = img("diary:" + b.n);
          if (di) out.push('<img class="diary-img" loading="lazy" alt="" src="' + di + '">');
          break;
        default: out.push("<p>" + x + "</p>");
      }
    });
    return out.join("");
  }
  function illus(id, cls) {
    var u = img(id);
    return u ? '<figure class="ill ' + (cls || "") + '" style="margin-top:6px"><img loading="lazy" alt="" src="' + u + '"></figure>' : "";
  }
  function sectionHTML(id, opt) {
    var s = sec(id);
    if (!s) return '<div class="warn">원고에서 ‘' + esc(id) + "’ 절을 찾지 못했어요. 엔딩북 원고의 제목이 바뀌었다면 ‘책으로 보기’에서 직접 따라가 주세요.</div>";
    opt = opt || {};
    var h = "";
    if (!opt.noHead) h += '<div class="sec-h"><h3>' + esc(s.title) + "</h3>" + (opt.tag ? '<span class="tag">' + esc(opt.tag) + "</span>" : "") + "</div>";
    if (!opt.noImg) h += illus(s.id, opt.imgCls);
    h += '<div class="reading">' + blocksHTML(s.blocks, opt) + "</div>";
    return '<section class="sec" id="s-' + esc(s.id) + '">' + h + "</section>";
  }
  function endingHTML(roleKey, title, tag) {
    var r = R[roleKey], s = sec(r.sec);
    var e = s && s.endings.filter(function (x) { return x.title === title; })[0];
    if (!e) return '<div class="warn">원고에서 ' + esc(r.name) + "의 엔딩 ‘" + esc(title) + "’을 찾지 못했어요. 엔딩 제목이 바뀌었다면 아래 ‘다른 엔딩’에서 직접 골라 읽어 주세요.</div>";
    var u = img(r.sec + "/" + title);
    return '<div class="ending-title">' + esc(title) + (tag ? "<small>" + esc(tag) + "</small>" : "") + "</div>" +
      (u ? '<figure class="ill small"><img loading="lazy" alt="" src="' + u + '"></figure>' : "") +
      '<div class="reading">' + blocksHTML(e.blocks, { mode: "play", lab: st.S.lab }) + "</div>";
  }
  function chHead(id, sub) {
    var c = chapter(id), u = img("ch:" + id);
    var isMap = u && /MAP/.test(B.images["ch:" + id]);
    var lbl = '<div class="lbl"><span class="small">' + esc(id) + "장</span><b>" + esc(c ? c.title : "") + "</b>" + (sub ? '<span class="small">' + esc(sub) + "</span>" : "") + "</div>";
    if (isMap) return '<div class="ch-head noimg">' + lbl + '</div><figure class="ill map"><img loading="lazy" alt="시간대별 사건 지도" src="' + u + '"></figure>';
    return u ? '<div class="ch-head"><img alt="" src="' + u + '">' + lbl + "</div>" : '<div class="ch-head noimg">' + lbl + "</div>";
  }
  function seg(key, opts, cur) {
    return '<span class="seg">' + opts.map(function (o) {
      var on = cur === o[0];
      return '<button type="button" data-set="' + key + '" data-v="' + esc(JSON.stringify(o[0])) + '" class="' + (on ? "on " : "") + (o[2] || "") + '"' + (inRoom() && isGM() ? " disabled" : "") + ">" + esc(o[1]) + "</button>";
    }).join("") + "</span>" + (function () {
      var by = inRoom() && ROOM && ROOM.by && ROOM.by[key];
      return by && cur != null ? ' <span class="small muted">· ' + esc(seatShort(by)) + (by === st.me ? "(나)" : "") + "가 골랐어요</span>" : "";
    })();
  }
  function yn(key, yes, no) { return seg(key, [[true, yes || "그렇다", "yes"], [false, no || "아니다", "no"]], st.S[key]); }
  function verdict(v, ok, no) {
    if (v == null) return '<span class="verdict unk">아직 몰라요</span>';
    return v ? '<span class="verdict ok">' + esc(ok) + "</span>" : '<span class="verdict no">' + esc(no) + "</span>";
  }
  function answerBox(roleKey, id) {
    var s = sh(roleKey);
    if (!s || !s.done) return st.paper ? "" : '<div class="answer empty">' + esc(R[roleKey].name) + "의 결정지가 아직 없어요 (종이 결정지라면 그 답을 보고 판정)</div>";
    var v = s[id];
    if (v == null || v === "") return '<div class="answer empty">빈칸</div>';
    if (R[v]) v = R[v].name;
    return '<div class="answer">' + esc(v) + "</div>";
  }
  function factRow(q, crit, ctrl, extra) {
    return '<div class="fact"><div class="fact-q">' + q + "</div>" + (crit ? '<div class="fact-c">' + crit + "</div>" : "") + (extra || "") + ctrl + "</div>";
  }
  function judge(key, q, crit, roleKey, ansId) {
    return factRow(esc(q), crit ? esc(crit) : "", yn(key, "인정", "불인정"), roleKey ? '<div class="who">' + esc(R[roleKey].name) + "의 답</div>" + answerBox(roleKey, ansId) : "");
  }

  /* ───────── 진행 단계 ───────── */
  var STEPS = [
    { id: "accuse", t: "지목" },
    { id: "sheets", t: "결정지" },
    { id: "ch1", t: "1장 지목 결과" },
    { id: "lab", t: "2장 연구실" },
    { id: "truth", t: "진상 판정" },
    { id: "escape", t: "탈출" },
    { id: "ch3", t: "3장 결말" },
    { id: "personal", t: "4장 각자의 엔딩" },
    { id: "reveal", t: "진상·해설·일기" }
  ];
  function stepIndex(id) { for (var i = 0; i < STEPS.length; i++) if (STEPS[i].id === id) return i; return 0; }
  function shownSteps() { return inRoom() ? STEPS.filter(function (s) { return s.id !== "accuse" && s.id !== "sheets"; }) : STEPS; }

  function topBar(stepId) {
    var D = derive(st.S);
    var h = '<header class="top"><div class="top-in"><a class="brand" href="#/">오늘도 한빛은 맑음<small>엔딩북</small></a><span class="top-sp"></span>' +
      (inRoom() ? '<a class="tbtn" href="#/room">방 ' + esc(st.room) + (st.me ? " · " + esc(seatShort(st.me)) : "") + "</a>" : "") +
      '<a class="tbtn" href="#/story">지난 이야기</a><a class="tbtn" href="#/book">책</a>' + (inRoom() ? "" : '<a class="tbtn" href="#/code">코드</a>') + "</div>";
    if (stepId) {
      h += '<nav class="steps">' + shownSteps().map(function (s, n) {
        var i = stepIndex(s.id);
        var cls = s.id === stepId ? "on" : (i < (st.S.stage || 0) ? "done" : "");
        return '<a class="step ' + cls + '" href="#/play/' + s.id + '">' + (n + 1) + ". " + esc(s.t) + "</a>";
      }).join("") + "</nav>";
    }
    return h + "</header>";
  }
  function navBtns(stepId, canNext, label) {
    var L = shownSteps(), i = 0;
    for (var n = 0; n < L.length; n++) if (L[n].id === stepId) i = n;
    var back = inRoom() ? '<a class="btn ghost" href="#/wait">← 결정지</a>' : '<a class="btn ghost" href="#/">← 처음</a>';
    var prev = i > 0 ? '<a class="btn ghost" href="#/play/' + L[i - 1].id + '">← ' + esc(L[i - 1].t) + "</a>" : back;
    var next = i < L.length - 1 ? '<button class="btn pri" data-next="' + L[i + 1].id + '"' + (canNext ? "" : " disabled") + ">" + esc(label || L[i + 1].t) + " →</button>" : '<a class="btn pri" href="#/story">지난 이야기 다시 보기</a>';
    var who = "";
    if (inRoom() && i < L.length - 1) {
      var stage = st.S.stage || 0;
      if (stepIndex(stepId) < stage) {
        next = '<a class="btn pri" href="#/play/' + STEPS[stage].id + '">지금 읽는 곳으로 →</a>';
      } else {
        next = !st.me ? '<button class="btn pri" disabled>자리를 골라야 넘길 수 있어요</button>' :
          isGM() ? '<button class="btn pri" disabled>GM은 보기만 해요</button>' :
          '<button class="btn pri" data-roomnext="' + L[i + 1].id + '"' + (canNext ? "" : " disabled") + ">" + esc(label || L[i + 1].t) + " →</button>";
        who = '<p class="small muted" style="text-align:right;margin:6px 0 0">' + (isGM() ? "플레이어가 넘기면 함께 넘어가요" : "누가 눌러도 모두의 화면이 함께 넘어가요") + "</p>";
      }
    }
    return '<div class="nav">' + prev + next + "</div>" + who;
  }
  function peek(groupId, items, taken) {
    // items: [[sectionId, label]]
    return '<details class="others" data-peek="' + groupId + '"><summary>다른 갈래도 보기</summary><div class="chips">' +
      items.map(function (it) {
        return '<button class="chip' + (it[0] === taken ? " taken" : "") + '" data-peekid="' + esc(it[0]) + '">' + esc(it[1]) + (it[0] === taken ? " · 이번 판" : "") + "</button>";
      }).join("") + '</div><div class="peek-body"></div></details>';
  }

  function vPlay(stepId) {
    var S = st.S, D = derive(S), h = "", can = true;
    var i = stepIndex(stepId);
    if (!inRoom() && (S.stage || 0) < i) { S.stage = i; save(); }
    if (inRoom()) {
      var g0 = roomGuard(); if (g0) return g0;
      if (!st.me) { setTimeout(function () { location.hash = "#/room"; }, 0); return ""; }
      if (i > (S.stage || 0) || (S.stage || 0) < stepIndex("ch1")) return topBar() + '<main><div class="card">아직 열리지 않은 곳이에요. 모두 함께 넘어갈 때 열립니다.<div class="row" style="margin-top:10px"><a class="btn pri" href="' + ((S.stage || 0) >= stepIndex("ch1") ? "#/play/" + STEPS[S.stage].id : "#/wait") + '">지금 있는 곳으로</a></div></div></main>';
    }

    if (stepId === "accuse") {
      h += '<div class="kicker">최후 토론 뒤</div><h2 class="ttl">범인 지목</h2>';
      h += '<p class="lead">하나, 둘, 셋에 모두 손가락으로 지목합니다. 가장 많이 지목된 사람을 고르세요. 엔딩북은 최종 결정지를 다 쓴 뒤에 읽습니다.</p>';
      h += '<div class="choices">' + ACC.map(function (k) {
        var on = S.acc === k;
        var pic = k === "none" ? '<span class="dot" style="background:var(--ink-3)"></span>' : '<img alt="" src="' + roleImg(k) + '">';
        return '<button class="choice' + (on ? " on" : "") + '" data-set="acc" data-v="' + esc(JSON.stringify(k)) + '">' + pic + "<b>" + esc(nameOf(k)) + "</b></button>";
      }).join("") + "</div>";
      can = !!S.acc;
      h += navBtns(stepId, can, "최종 결정지 쓰기");
    }

    if (stepId === "ch1") {
      h += chHead(1, "가장 많이 지목된 사람");
      if (!S.acc) h += '<div class="warn">먼저 <a href="#/play/accuse">지목 결과</a>를 골라 주세요.</div>';
      if (S.acc) {
        var sid = ACC_SEC[S.acc];
        var reader = S.acc === "none" ? "임다은 역할" : nameOf(S.acc) + " 역할";
        h += '<div class="card"><div class="reader">읽는 사람 · ' + esc(reader) + "</div>" + sectionHTML(sid, { mode: "play", tag: "이번 판" }) + "</div>";
        h += peek("acc", ACC.map(function (k) { return [ACC_SEC[k], ACC_SEC[k] + " " + nameOf(k)]; }), sid);
      }
      can = !!S.acc;
      h += navBtns(stepId, can);
    }

    if (stepId === "sheets") {
      h += '<div class="kicker">지목 후 · 엔딩북을 읽기 전</div><h2 class="ttl">최종 결정지</h2>';
      h += '<p class="lead">이 기기를 돌려 가며 각자 자기 결정지를 씁니다. 엔딩북에서 판정할 때까지 답을 말하거나 남에게 보여 주지 마세요. 다 쓰면 화면을 가리고 다음 사람에게 넘깁니다.</p>';
      h += '<div class="card"><label class="cb"><input type="checkbox" data-paper' + (st.paper ? " checked" : "") + '><span><b>종이 결정지를 썼어요</b><br><span class="small muted">켜면 이 단계를 건너뛰고, 판정할 때 종이를 보며 인정/불인정만 누릅니다.</span></span></label></div>';
      if (!st.paper) {
        h += '<div class="roles">' + ROLES.map(function (r) {
          var s = sh(r.k), done = s && s.done;
          return '<a class="role" style="--rc:' + r.color + '" href="#/sheet/' + r.k + '"><img alt="" src="' + roleImg(r.k) + '">' +
            (done ? '<span class="badge">작성 완료</span>' : "") + '<div class="nm"><b>' + esc(r.name) + "</b><span>" + (done ? "다시 열기" : "결정지 쓰기") + "</span></div></a>";
        }).join("") + "</div>";
        var n = ROLES.filter(function (r) { var s = sh(r.k); return s && s.done; }).length;
        h += '<p class="small muted" style="margin-top:10px">' + n + " / 7 작성</p>";
      }
      h += navBtns(stepId, true, "다 썼어요 · 엔딩북 1장");
    }

    if (stepId === "lab") {
      h += chHead(2);
      h += '<div class="card"><h3>게임 중 연구실이 열렸나요?</h3>' + yn("lab", "열렸다", "열리지 않았다");
      if (S.lab === true) {
        h += '<div class="fact" style="margin-top:10px"><div class="fact-q">연구실 카드 공개 여부</div><div class="fact-c">개인 엔딩에서 씁니다. 모르면 나중에 정해도 돼요.</div>' +
          '<div class="row" style="margin:6px 0">「다은 입소 기록」(I59) 공개 ' + yn("pubI59", "공개됨", "아니다") + "</div>" +
          '<div class="row">「노아에게」(I65) 공개 ' + yn("pubI65", "공개됨", "아니다") + "</div></div>";
      }
      h += "</div>";
      if (S.lab === false && S.pubI59 == null) { S.pubI59 = false; if (S.pubI65 == null) S.pubI65 = false; save(); }
      if (S.lab === false) {
        var alt = S.acc === "sehyun";
        var s21 = sec("2-1");
        var ai = s21 ? s21.blocks.map(function (b) { return b.t; }).indexOf("alt") : -1;
        var fp = s21 ? s21.blocks.map(function (b) { return b.t; }).indexOf("p") : -1;
        h += sectionHTML("2-1", { mode: "play", hideNotes: true, altHide: !alt, skipBeforeAlt: alt && ai > 0, altIndex: ai, firstPara: fp, tag: alt ? "윤세현이 지목된 판" : "" });
      }
      if (S.lab != null) {
        h += sectionHTML("2-2", { mode: "play" });
        h += '<p class="small muted">네 질문의 답을 하나로 정했으면 다음으로 넘어가 판정합니다.</p>';
      }
      can = S.lab != null;
      h += navBtns(stepId, can, "답을 정했어요 · 진상 판정");
    }

    if (stepId === "truth") {
      var lines = truthLines();
      h += '<div class="kicker">2-2 · 판정</div><h2 class="ttl">진상 판정</h2>';
      h += illus("2-2 · 판정");
      h += '<p class="lead">이 장을 읽는 사람이 판정합니다. 토론에서 정한 답이 아래 다섯 가지 가운데 넷 이상을 설명하면 성공입니다.</p>';
      h += '<div class="card">' + lines.map(function (l, n) {
        return factRow('<span class="reading" style="font-size:1em">' + esc(l) + "</span>", "", yn("t" + (n + 1), "설명했다", "못 했다"));
      }).join("") + '<div class="row" style="margin-top:10px"><b>결과</b> ' + verdict(D.truthOK, "성공 (" + D.truthCount + "/5)", "실패 (" + D.truthCount + "/5)") + "</div></div>";
      h += '<p class="small muted">아직 최종 결말은 읽지 않습니다.</p>';
      can = D.truthOK != null;
      h += navBtns(stepId, can);
    }

    if (stepId === "escape") {
      h += '<div class="kicker">2-3</div><h2 class="ttl">탈출</h2>';
      h += '<p class="lead">강태수 역할의 플레이어가 위에서부터 처음 맞는 것 하나를 따라갑니다. 필요한 답만 차례로 물어요.</p>';
      h += '<div class="card"><div class="row"><b>연행</b> ' + (D.arrested === undefined ? '<span class="verdict unk">지목 결과 필요</span>' : D.arrested ? esc(R[D.arrested].name) : "없음 (사고사·자살)") + "</div></div>";
      var c = "";
      if (S.acc && S.acc !== "taesu") {
        if (S.acc !== "sehyun") c += judge("x_reason", "윤세현이 ‘강태수가 온 이유’를 맞혔나요?", "정답: 아이를 데리고 나가려고 (4-6). 뜻이 같으면 인정.", "sehyun", "reason");
        else c += factRow("윤세현이 지목돼서 ②는 건너뜁니다.", "", "");
        if (S.acc !== "sehyun" && S.x_reason === true) c += factRow("태수가 「작은 약통」(I29)이나 「갈색 약병」(I24)을 가지고 있나요?", "", yn("t_drug", "있다", "없다"));
        if (S.acc === "sehyun" || S.x_reason === false) {
          c += factRow("태수가 「차 열쇠」(I12)를 가지고 있나요?", "", yn("t_key", "있다", "없다"));
          if (S.t_key === true) c += factRow("태수의 결정지 ‘오늘 밤 데려갈 아이’", "", seg("t_child", KIDS.map(function (k) { return [k, R[k].name]; }).concat([["blank", "빈칸"]]), S.t_child), answerBox("taesu", "child"));
        }
      }
      if (c) h += '<div class="card">' + c + "</div>";
      var chain = [];
      if (D.escStep) chain.push("2-3 " + D.escStep);
      if (D.esc === "2-A" || D.esc === "2-B") chain.push("2-4");
      if (/^2-[C-F]$/.test(D.esc || "")) chain.push("2-5");
      if (D.esc === "ARREST") chain.push("연행");
      if (D.esc === "NOKEY") chain.push("탈출 못 함");
      if (D.escSec) chain.push(D.escSec);
      if (chain.length) h += '<div class="path">' + chain.map(function (c2, n) { return '<span class="' + (n === chain.length - 1 ? "end" : "") + '">' + esc(c2) + "</span>"; }).join("<i>→</i>") + "</div>";
      if (D.escSec) h += sectionHTML(D.escSec, { mode: "play", tag: "이번 판" });
      else if (D.esc === "ARREST") h += '<div class="card reading"><p>태수가 지목되어 연행됩니다. 바로 3장으로 넘어갑니다.</p></div>';
      else if (D.esc === "NOKEY") h += '<div class="card reading"><p>「차 열쇠」가 없어 태수는 탈출하지 못합니다. 바로 3장으로 넘어갑니다.</p></div>';
      else if (D.escWhy.length) h += '<p class="small muted">남은 질문: ' + esc(D.escWhy.join(", ")) + "</p>";
      h += '<details class="others"><summary>2-3 원문 안내 보기</summary>' + sectionHTML("2-3", { mode: "book" }) + sectionHTML("2-4", { mode: "book" }) + sectionHTML("2-5", { mode: "book" }) + "</details>";
      h += peek("esc", ["2-A", "2-B", "2-C", "2-D", "2-E", "2-F"].map(function (x) { return [x, x]; }), D.escSec);
      can = D.esc != null;
      h += navBtns(stepId, can);
    }

    if (stepId === "ch3") {
      h += chHead(3);
      h += '<div class="card"><h3>두 조건 중 하나라도 맞으면 3-A</h3>';
      h += '<div class="fact"><div class="fact-q">① 2-2의 진상 판정에 성공했다</div>' + verdict(D.truthOK, "성공", "실패") + "</div>";
      h += '<div class="fact"><div class="fact-q">② 다은의 제보가 성공했다</div><div class="fact-c">다은이 「콤팩트 손거울」(I01)을 가지고 있고, ‘엄마가 오늘 하려던 일’을 맞혔다.</div>' +
        '<div class="row" style="margin-bottom:8px">I01을 가진 사람 ' + seg("i01", [["daeun", "임다은"], ["sehyun", "윤세현"], ["other", "다른 사람·없음"]], S.i01) + "</div>" +
        judge("d_plan", "‘엄마가 오늘 하려던 일’", "정답: 오늘 저녁 기자에게 손거울 속 자료를 넘기려 했다. ‘기자’와 ‘자료(USB)’에 해당하는 말이 꼭 들어가야 인정.", "daeun", "plan") +
        '<div class="row">제보 ' + verdict(D.report, "성공", "실패") + "</div></div>";
      if (D.esc === "2-C" || D.esc === "2-D") h += '<p class="small">' + esc(D.esc) + "에서 연구동 조사가 시작되어 3-A로 이어집니다.</p>";
      h += "</div>";
      if (D.ch3) h += sectionHTML(D.ch3, { mode: "play", tag: "이번 판" });
      h += peek("ch3", [["3-A", "3-A"], ["3-B", "3-B"]], D.ch3);
      can = !!D.ch3;
      h += navBtns(stepId, can);
    }

    if (stepId === "personal") {
      h += '<div class="kicker">4장</div><h2 class="ttl">각자의 엔딩</h2>';
      if (inRoom() && isPlayer()) h += '<a class="big-btn primary" href="#/role/' + st.me + '" style="margin:10px 0"><span class="ic">★</span><span><b>내 엔딩 보기 · ' + esc(R[st.me].name) + "</b><span>내 점수와 엔딩. 아래 판정이 끝나야 다 나와요</span></span></a>";
      h += '<p class="lead">여러 사람의 점수에 함께 쓰이는 답을 먼저 판정하고, 각자 자기 이름을 눌러 점수와 엔딩을 읽습니다.</p>';
      h += '<div class="card"><h3>함께 쓰는 판정</h3>' +
        factRow("다은의 결정지 ‘학교폭력 관계자’", "", seg("d_bully", [["siwoo", "권시우"], ["noa", "강노아"], ["other", "그 밖·빈칸"]], S.d_bully), answerBox("daeun", "bully")) +
        judge("n_cat", "노아의 고양이 답", "고양이를 죽게 한 사람으로 권시우를 적고, 방법에 ① 수목지 나뭇가지에 끈으로 매단 벽돌 덫 ② 그 벽돌에 고양이가 맞았다 ③ 덫을 만들다 생긴 시우의 손목 상처가 모두 들어가면 인정.", "noa", "catHow") +
        (sh("noa") && sh("noa").done ? '<div class="who">노아가 적은 사람: ' + esc(R[sh("noa").cat] ? R[sh("noa").cat].name : (sh("noa").cat || "빈칸")) + "</div>" : "") +
        exposedRow() + "</div>";
      h += '<div class="roles">' + ROLES.map(function (r) {
        var sc = scoreOf(r.k, S, D);
        return '<a class="role" style="--rc:' + r.color + '" href="#/role/' + r.k + '"><img alt="" src="' + roleImg(r.k) + '"><div class="nm"><b>' + esc(r.name) + "</b><span>" +
          (sc.complete ? sc.total + " / 12점" : "점수 판정 중") + "</span></div></a>";
      }).join("") + "</div>";
      h += navBtns(stepId, true);
    }

    if (stepId === "reveal") {
      [5, 6, 7].forEach(function (n) {
        var c2 = chapter(n);
        if (!c2) return;
        h += '<section class="sec" id="s-ch' + n + '">' + chHead(n) + '<div class="reading">' + blocksHTML(c2.blocks, { mode: "play" }) + "</div></section>";
      });
      h += navBtns(stepId, true);
    }
    return topBar(stepId) + "<main>" + h + "</main>";
  }

  function exposedRow() {
    var others = ROLES.filter(function (r) { return r.k !== "sehyun" && SHEETS[r.k].some(function (f) { return f.id === "identity"; }); });
    var list = others.map(function (r) {
      var s = sh(r.k);
      var a = s && s.done ? (s.identity || "빈칸") : "—";
      return '<div class="small"><b>' + esc(r.short) + "</b> · " + esc(a) + "</div>";
    }).join("");
    var any = others.some(function (r) { var s = sh(r.k); return s && s.done; });
    return factRow("‘윤세현의 정체’에 Dr.J 또는 피해자의 쌍둥이 동생(한서진)이라고 적은 용지가 세 장 이상인가요?", "‘가짜 직원’이라고만 적은 것은 세지 않습니다. 윤세현 점수에 씁니다.",
      yn("x_exposed", "세 장 이상", "세 장 미만"), any ? '<div class="answer" style="font-family:var(--sans)">' + list + "</div>" : "");
  }

  /* ───────── 결정지 화면 ───────── */
  function draftKey(k) { return "hanbit.draft." + (st.room || "solo") + "." + k; }
  function draftOf(k) {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(draftKey(k)) || "null"); } catch (e) { d = null; }
    return d || {};
  }
  function readSheetForm(f, k) {
    var o = {};
    SHEETS[k].forEach(function (q) {
      var el = f.elements[q.id];
      if (!el) return;
      if (q.type === "check") o[q.id] = el.checked;
      else if (q.type === "radio") { var c = f.querySelector('input[name="' + q.id + '"]:checked'); o[q.id] = c ? c.value : ""; }
      else o[q.id] = el.value;
    });
    return o;
  }
  function saveDraft(f) {
    var k = f.getAttribute("data-sheet"), o = readSheetForm(f, k);
    o.at = Date.now();
    try { localStorage.setItem(draftKey(k), JSON.stringify(o)); } catch (e) { /* 무시 */ }
  }
  function vSheet(k) {
    var r = R[k];
    if (!r) return vHome();
    var s = Object.assign({}, st.sheets[k] || {}, draftOf(k));
    var open = vSheet.open === k || (inRoom() && k === st.me);
    var h = (inRoom() ? topBar() : topBar("sheets")) + "<main>";
    if (!open) {
      h += '<div class="lock"><div class="ic">🔒</div><h2 class="ttl">' + esc(r.name) + "의 최종 결정지</h2><p class=\"lead\">" + esc(r.name) + " 역할만 보세요. 다른 사람은 화면에서 눈을 떼 주세요.</p>" +
        '<button class="btn pri" data-open="' + k + '">' + esc(r.name) + "입니다 · 열기</button> <a class=\"btn ghost\" href=\"#/play/sheets\">돌아가기</a></div>";
      return h + "</main>";
    }
    h += '<div class="role-head" style="--rc:' + r.color + '"><img alt="" src="' + roleImg(k) + '"><div><div class="kicker">지목 후 펼치시오</div><h2 class="ttl" style="margin:0">' + esc(r.name) + "의 최종 결정지</h2></div></div>";
    h += '<p class="lead">오늘 알게 된 사실들, 그리고 행동을 결정하시오.</p><form data-sheet="' + k + '">';
    var inExtra = false, inCards = false;
    SHEETS[k].forEach(function (f) {
      if (f.extra && !inExtra) { h += '<div class="extra"><div class="extra-h">[추가목표]</div><div class="small muted">추가목표 카드를 입수한 경우에만 적으시오</div>'; inExtra = true; }
      if (!f.extra && inExtra) { h += "</div>"; inExtra = false; }
      if (f.card && !inCards) { h += '<h3 style="margin:22px 0 4px">지금 가진 카드 확인</h3><div class="small muted">점수와 엔딩에 씁니다. 사실대로 표시하세요.</div>'; inCards = true; }
      if (f.pre) h += '<p class="small" style="margin:14px 0 0">' + esc(f.pre) + "</p>";
      var v = s[f.id];
      if (f.type === "text") h += '<label class="f"><span>' + esc(f.q) + "</span><textarea name=\"" + f.id + '" rows="2">' + esc(v || "") + "</textarea></label>";
      if (f.type === "person" || f.type === "kid") {
        var opts = (f.type === "person" ? ROLES.map(function (x) { return x.k; }) : KIDS);
        h += '<label class="f"><span>' + esc(f.q) + "</span><select name=\"" + f.id + '"><option value="">— 빈칸 —</option>' +
          opts.map(function (o) { return '<option value="' + o + '"' + (v === o ? " selected" : "") + ">" + esc(R[o].name) + "</option>"; }).join("") +
          '<option value="other"' + (v === "other" ? " selected" : "") + ">그 밖의 사람</option></select>" + (f.note ? "<em>※ " + esc(f.note) + "</em>" : "") + "</label>";
      }
      if (f.type === "radio") {
        h += '<div class="f" style="margin:14px 0"><span style="font-weight:700;display:block;margin-bottom:6px">' + esc(f.q) + "</span>" +
          f.opts.map(function (o) { return '<label class="cb" style="display:inline-flex;margin-right:6px"><input type="radio" name="' + f.id + '" value="' + o[0] + '"' + (v === o[0] ? " checked" : "") + "> " + esc(o[1]) + "</label>"; }).join("") +
          (f.note ? '<div class="small muted">※ ' + esc(f.note) + "</div>" : "") + "</div>";
      }
      if (f.type === "check") h += '<label class="cb"><input type="checkbox" name="' + f.id + '"' + (v ? " checked" : "") + "><span>" + esc(f.q) + "</span></label>";
      if (f.type === "count") h += '<label class="f"><span>' + esc(f.q) + '</span><select name="' + f.id + '">' + [0, 1, 2, 3, 4].map(function (n) { return '<option value="' + n + '"' + (+v === n ? " selected" : "") + ">" + n + "장</option>"; }).join("") + "</select></label>";
    });
    if (inExtra) h += "</div>";
    h += inRoom() ? '<div class="nav"><a class="btn ghost" href="#/vote">← 지목</a><button class="btn pri" type="submit">' + (s.done ? "고친 대로 다시 내기" : "다 썼어요 · 내기") + "</button></div></form>" :
      '<div class="nav"><a class="btn ghost" href="#/play/sheets" data-close>취소</a><button class="btn pri" type="submit">다 썼어요 · 가리기</button></div></form>';
    return h + "</main>";
  }

  /* ───────── 개인 엔딩 화면 ───────── */
  function roleFacts(k) {
    var S = st.S, h = "";
    if (k === "daeun") {
      h += judge("d_mirror", "엄마가 준 손거울의 비밀", "정답: 안에 연구를 고발할 자료(USB)가 들어 있다. ‘자료(USB)’와 ‘고발(폭로·제보)’에 해당하는 말이 꼭 들어가야 인정.", "daeun", "mirror");
      h += judge("d_plan", "엄마가 오늘 하려던 일", "정답: 오늘 저녁 기자에게 손거울 속 자료를 넘기려 했다. ‘기자’와 ‘자료(USB)’가 꼭 들어가야 인정.", "daeun", "plan");
      h += judge("d_name", "[추가 목표] 엄마의 진짜 이름", "‘한서인’ 또는 ‘한서진’. ‘Dr.IN’이나 ‘임소원’만 적은 것은 불인정. 봉투가 없으면 불인정.", "daeun", "x1");
      h += factRow("최종 결정 직전 「콤팩트 손거울」(I01)을 가진 사람", "", seg("i01", [["daeun", "임다은"], ["sehyun", "윤세현"], ["other", "다른 사람·없음"]], S.i01));
      h += factRow("태수의 ‘내 딸’ 칸에 임다은", "", yn("t_daughter", "적었다", "아니다"));
      h += factRow("「다은 입소 기록」(I59)이 공개됐다", "", yn("pubI59", "공개됨", "아니다"));
    }
    if (k === "noa") {
      h += factRow("최종 결정 직전 「노아에게」(I65)를 가지고 있다", "", yn("n_i65", "가지고 있다", "아니다"));
      h += factRow("「노아에게」(I65)가 공개됐다", "가지지 않아도 공개됐으면 편지를 먼저 읽습니다.", yn("pubI65", "공개됨", "아니다"));
      h += factRow("[추가목표] 1. 마지막 선택", "", seg("n_choice", [["revenge", "복수"], ["forgive", "용서"], ["none", "고르지 않음"]], S.n_choice));
    }
    if (k === "siwoo") {
      h += judge("s_culprit", "사건의 진상", "허하은을 적고, 벽돌로 머리를 쳤다는 뜻이 들어 있으면 인정. 덫의 벽돌이 떨어져 맞았다고만 적은 것은 불인정.", "siwoo", "culprit");
      h += judge("s_mother", "어머니가 하는 일", "정답: 연구동에서 우리(아이들)를 대상으로 실험을 한다. 비슷한 답도 인정. ‘연구자’라고만 적은 것은 불인정.", "siwoo", "mother");
      var tl = truthLines();
      h += judge("s_x1", "[추가목표] 1. Dr.IN과 Dr.J의 관계", "기준: " + (tl[1] || "②"), "siwoo", "x1");
      h += judge("s_x2", "[추가목표] 2. 연구에 대해 아는 것", "기준: " + (tl[3] || "④") + " / " + (tl[4] || "⑤") + " — 둘 다 설명해야 인정", "siwoo", "x2");
      h += judge("s_x3", "[추가목표] 3. 사건과 연구의 관계", "기준: 진상 판정 ①~⑤ 가운데 넷 이상을 설명하면 인정", "siwoo", "x3");
    }
    if (k === "haeun") {
      h += factRow("[추가 목표] 시설 안내도 아래에 카드 1장을 숨겼고, 최종 결정 직전까지 아무도 들춰 보지 않았다", "", yn("h_map", "그렇다", "아니다"));
    }
    if (k === "junseo") {
      h += factRow("「쪽문 열쇠」(P03)를 가지고 있다", "", yn("j_p03", "있다", "없다"));
      h += factRow("약 카드(I10·I29·I52·I24) 가운데 하나를 가지고 있다", "", yn("j_drug", "있다", "없다"));
      h += factRow("마지막 3장 안에서 끝까지 공개되지 않은 동전 카드(I02·I06·I07·I14) 수", "", seg("j_coins", [[0, "0"], [1, "1"], [2, "2"], [3, "3"], [4, "4"]], S.j_coins));
      h += factRow("결정지에서 ‘나간다’에 표시했다 (쪽문 열쇠가 있을 때만)", "", yn("j_leave", "나간다", "남는다"));
      h += judge("j_x1", "[추가목표] ① 친모 이름 ‘조미영’을 적었다", "", "junseo", "x1");
      h += judge("j_x2", "[추가목표] ② 친모가 아파서(투병으로) 아이를 맡겼다는 뜻이 있다", "친부 김민호의 사망은 적지 않아도 됩니다.", null, null);
    }
    if (k === "taesu") {
      var ANS = ["다은 — 방임(곁에 있어도 봐 주지 않는 무관심·방치)", "노아 — 폭력(때리고 위협하는 적대적 학대)", "시우 — 통제(걱정을 이유로 일정과 행동을 하나하나 확인하고 압박함)", "하은 — 과잉허용(원하는 건 다 들어주고 물건으로 대신하는 방종)", "준서 — 비일관적 강압(같은 일에 어떤 날은 상, 어떤 날은 벌을 주는 변덕)"];
      ANS.forEach(function (a, n) { h += judge("t_a" + (n + 1), "학대 알아내기 · " + a.split(" — ")[0], "정답: " + a.split(" — ")[1], "taesu", "a" + (n + 1)); });
      h += factRow("[추가목표] ‘내 딸’에 임다은을 적었다", "", yn("t_daughter", "적었다", "아니다"), answerBox("taesu", "daughter"));
      h += factRow("「다은 입소 기록」(I59)이 공개됐다", "", yn("pubI59", "공개됨", "아니다"));
    }
    if (k === "sehyun") {
      h += factRow("최종 결정 직전 「콤팩트 손거울」(I01)을 가진 사람", "", seg("i01", [["daeun", "임다은"], ["sehyun", "윤세현"], ["other", "다른 사람·없음"]], S.i01));
      h += factRow("추가 목표 봉투를 열어 보았다", "", yn("x_env", "열었다", "아니다"));
      h += exposedRow();
    }
    return h;
  }

  function vRole(k) {
    var r = R[k];
    if (!r) return vHome();
    st.role = k; save();
    var S = st.S, D = derive(S), sc = scoreOf(k, S, D), s = sec(r.sec);
    var h = topBar("personal") + "<main>";
    h += '<div class="role-head" style="--rc:' + r.color + '"><img alt="" src="' + roleImg(k) + '"><div><div class="kicker">' + esc(r.sec) + '</div><h2 class="ttl" style="margin:0">' + esc(r.name) + '</h2><div class="small muted">' + esc(r.name) + " 역할의 플레이어가 읽습니다</div></div></div>";
    h += illus(r.sec);
    // 점수
    var maxSum = sc.items.reduce(function (a, x) { return a + x.max; }, 0);
    h += '<div class="card"><h3>점수 · 12점 만점</h3>' + (maxSum !== 12 ? '<div class="small muted" style="margin:-4px 0 6px">원고의 항목을 모두 더하면 ' + maxSum + "점이에요. 그대로 더해 보여 줍니다.</div>" : "") + '<div class="score">' + sc.items.map(function (x) {
      var ic = x.ok === true ? "✅" : x.ok === false ? "✖️" : "…";
      return '<div class="sc-item"><div class="sc-ic">' + ic + "</div><div>" + esc(x.label) + (x.why ? '<div class="sc-why">' + esc(x.why) + "</div>" : "") + '</div><div class="sc-pt">' + (x.pts == null ? "? " : x.pts) + " / " + x.max + "</div></div>";
    }).join("") + '<div class="sc-total"><span>합계' + (sc.complete ? "" : " (판정이 남았어요)") + "</span><b>" + sc.total + " / 12</b></div></div>";
    h += '<details style="margin-top:12px"' + (sc.complete ? "" : " open") + '><summary class="small">판정 고치기 · 이 역할에 쓰이는 답</summary>' + roleFacts(k) + "</details>";
    h += '<details style="margin-top:8px"><summary class="small">원문 채점 기준 보기</summary><div class="reading" style="font-size:.95em;margin-top:8px">' + (s ? blocksHTML(s.blocks, { mode: "book" }) : "") + "</div></details></div>";

    // 엔딩
    if (D.ch3 == null && k !== "haeun") h += '<div class="warn">3장(한빛의 결말)이 정해져야 엔딩이 나옵니다. <a href="#/play/ch3">3장으로</a></div>';
    sc.ends.forEach(function (t, n) { h += endingHTML(k, t, n === 0 ? "이번 판의 엔딩" : ""); });
    sc.extra.forEach(function (t) {
      if (typeof t === "string") h += endingHTML(k, t, "덧붙임");
      else h += '<div class="warn">' + esc(t.unknown) + "</div>";
    });
    if (!sc.ends.length && D.ch3 != null) h += '<div class="warn">엔딩을 고르려면 위의 판정을 마저 해 주세요.</div>';

    // 다른 엔딩
    if (s && s.endings.length) {
      var conds = {};
      s.blocks.forEach(function (b) {
        if (b.t !== "p" && b.t !== "note") return;
        var m = b.x.match(/^(.*?)\s*→\s*(.+)$/);
        if (m) m[2].split(/\s*\/\s*|,\s*이어서\s*/).forEach(function (part) {
          s.endings.forEach(function (e) { if (part.indexOf(e.title) >= 0 && !conds[e.title]) conds[e.title] = m[1]; });
        });
      });
      h += '<details class="others"><summary>' + esc(r.short) + "의 다른 엔딩도 보기 (" + s.endings.length + ")</summary>";
      s.endings.forEach(function (e) {
        var mine = sc.ends.indexOf(e.title) >= 0 || sc.extra.indexOf(e.title) >= 0;
        h += '<details class="peek" style="margin:10px 0"><summary><b>' + esc(e.title) + "</b>" + (mine ? ' <span class="taken-mark">이번 판</span>' : "") +
          (conds[e.title] ? '<div class="small muted">' + esc(conds[e.title]) + "</div>" : "") + "</summary>" + endingHTML(k, e.title) + "</details>";
      });
      h += "</details>";
    }
    h += '<div class="nav"><a class="btn ghost" href="#/play/personal">← 모든 인물</a><a class="btn pri" href="#/play/reveal">진상·해설·일기 →</a></div>';
    return h + "</main>";
  }

  /* ───────── 지난 이야기 ───────── */
  function pathSections(S, D) {
    var p = [];
    if (S.acc) p.push(["1", ACC_SEC[S.acc]]);
    if (S.lab === false) p.push(["2", "2-1"]);
    if (S.lab != null) p.push(["2", "2-2"]);
    if (D.truthOK != null) p.push(["2", "2-2 · 판정"]);
    if (D.escSec) p.push(["2", D.escSec]);
    if (D.ch3) p.push(["3", D.ch3]);
    return p;
  }
  function vStory() {
    var S = st.S, D = derive(S), p = pathSections(S, D), h = topBar() + "<main>";
    h += '<div class="kicker">지난 이야기</div><h2 class="ttl">이번 판에 읽은 엔딩북</h2><p class="lead">지금까지 정해진 갈래만 차례대로 모았어요. 다른 갈래는 ‘책’에서 볼 수 있어요.</p>';
    if (!p.length) h += '<div class="card">아직 정해진 갈래가 없어요. <a href="#/play/accuse">엔딩 진행하기</a> 또는 <a href="#/code">결과 코드 입력</a>.</div>';
    var chain = p.map(function (x) { return x[1]; });
    if (D.esc === "ARREST") chain.push("태수 연행");
    if (D.esc === "NOKEY") chain.push("탈출 못 함");
    if (chain.length) h += '<div class="path">' + chain.map(function (c, n) { return '<span class="' + (n === chain.length - 1 ? "end" : "") + '">' + esc(c) + "</span>"; }).join("<i>→</i>") + "</div>";
    var lastCh = null;
    p.forEach(function (x) {
      if (x[0] !== lastCh) { h += chHead(x[0]); lastCh = x[0]; }
      var opt = { mode: "play", lab: S.lab };
      if (x[1] === "2-1") {
        var s21 = sec("2-1"), alt = S.acc === "sehyun";
        var ts = s21 ? s21.blocks.map(function (b) { return b.t; }) : [];
        opt.hideNotes = true; opt.altHide = !alt; opt.skipBeforeAlt = alt; opt.altIndex = ts.indexOf("alt"); opt.firstPara = ts.indexOf("p");
      }
      h += sectionHTML(x[1], opt);
    });
    if (D.ch3) {
      h += chHead(4, "각자의 엔딩");
      h += '<div class="roles">' + ROLES.map(function (r) {
        var sc = scoreOf(r.k, S, D);
        return '<a class="role" style="--rc:' + r.color + '" href="#/role/' + r.k + '"><img alt="" src="' + roleImg(r.k) + '"><div class="nm"><b>' + esc(r.name) + "</b><span>" + esc(sc.ends[0] || "엔딩 판정 중") + "</span></div></a>";
      }).join("") + "</div>";
      h += '<p style="margin-top:18px"><a class="btn" href="#/play/reveal">5~7장 · 진상, 해설, 한서인의 일기</a></p>';
    }
    return h + "</main>";
  }

  /* ───────── 책으로 보기 ───────── */
  function vBook(target) {
    var S = st.S, D = derive(S), taken = {};
    pathSections(S, D).forEach(function (x) { taken[x[1]] = true; });
    var mineEnd = {};
    ROLES.forEach(function (r) { var sc = scoreOf(r.k, S, D); sc.ends.concat(sc.extra.filter(function (x) { return typeof x === "string"; })).forEach(function (t) { mineEnd[r.sec + "/" + t] = true; }); });
    var h = topBar() + "<main>";
    h += '<div class="kicker">엔딩북 전체</div><h2 class="ttl">' + esc(B.title || "엔딩북") + '</h2><p class="lead">모든 갈래를 원고 그대로 보여 줘요. <span class="taken-mark">이번 판</span> 표시는 지금 진행 중인 판에서 읽은 곳이에요.</p>';
    h += '<div class="card toc">' + B.chapters.map(function (c) {
      return "<div><a class=\"tch\" href=\"#/book/ch" + c.id + "\">" + esc(c.id) + ". " + esc(c.title) + "</a>" + c.sections.map(function (s) {
        return '<a href="#/book/' + encodeURIComponent(s.id) + '"' + (taken[s.id] ? ' class="mine"' : "") + ">" + esc(s.title) + "</a>" +
          s.endings.map(function (e) { return '<a class="tend' + (mineEnd[s.key + "/" + e.title] ? " mine" : "") + '" href="#/book/' + encodeURIComponent(s.id + "/" + e.title) + '">' + esc(e.title) + "</a>"; }).join("");
      }).join("") + "</div>";
    }).join("") + "</div>";
    B.chapters.forEach(function (c) {
      h += '<div id="s-ch' + c.id + '" style="scroll-margin-top:70px">' + chHead(c.id) + "</div>";
      if (c.blocks.length) h += '<div class="reading">' + blocksHTML(c.blocks, { mode: "book" }) + "</div>";
      c.sections.forEach(function (s) {
        var opt = { mode: "book", tag: taken[s.id] ? "이번 판" : "" };
        if (!s.endings.length) { h += sectionHTML(s.id, opt); return; }
        h += '<section class="sec" id="s-' + esc(s.id) + '"><div class="sec-h"><h3>' + esc(s.title) + "</h3></div>" + illus(s.id) + '<div class="reading">' + blocksHTML(s.blocks, { mode: "book" }) + "</div>";
        s.endings.forEach(function (e) {
          var u = img(s.key + "/" + e.title);
          h += '<div id="s-' + esc(s.id + "/" + e.title) + '" style="scroll-margin-top:70px"><div class="ending-title">' + esc(e.title) + (mineEnd[s.key + "/" + e.title] ? ' <span class="taken-mark">이번 판</span>' : "") + "</div>" +
            (u ? '<figure class="ill small"><img loading="lazy" alt="" src="' + u + '"></figure>' : "") + '<div class="reading">' + blocksHTML(e.blocks, { mode: "book" }) + "</div></div>";
        });
        h += "</section>";
      });
    });
    h += '<p class="meta">원고 반영 ' + esc(B.built) + " · " + esc(B.source) + "</p>";
    setTimeout(function () {
      if (!target) return;
      var el = document.getElementById("s-" + target);
      if (el) el.scrollIntoView();
    }, 30);
    return h + "</main>";
  }

  /* ───────── 결과 코드 ───────── */
  function vCode() {
    var code = makeCode(st.S), url = codeURL(code);
    var h = topBar() + "<main>";
    h += '<div class="kicker">같은 결과 나눠 보기</div><h2 class="ttl">결과 코드</h2><p class="lead">이 코드를 입력하거나 QR을 찍으면 다른 휴대폰에서도 같은 갈래·같은 점수로 엔딩을 볼 수 있어요. 결정지에 쓴 글은 코드에 들어가지 않고, 판정 결과만 들어갑니다.</p>';
    h += '<div class="card"><div class="code-big">HB-' + esc(code) + '</div><div class="qr" id="qr"></div><div class="row" style="justify-content:center"><button class="btn" data-copy="' + esc("HB-" + code) + '">코드 복사</button><button class="btn" data-copy="' + esc(url) + '">링크 복사</button></div>' +
      '<p class="small muted" style="text-align:center">판정을 더 하면 코드가 바뀌어요. 마지막에 다시 나눠 주세요.</p></div>';
    h += '<div class="card"><h3>코드 입력</h3><form data-codeform class="row"><input type="text" name="code" placeholder="HB-1ABC-…" autocomplete="off" style="flex:1;min-width:180px;font-family:ui-monospace,monospace"><button class="btn pri">불러오기</button></form><p class="small muted">불러오면 이 기기의 진행 상황이 코드 내용으로 바뀝니다 (이 기기에 쓴 결정지 글은 남아요).</p></div>';
    h += '<div class="card"><h3>새 판</h3><p class="small muted">이 기기의 진행 상황과 결정지를 모두 지웁니다.</p><button class="btn" data-reset>처음부터 새로 하기</button></div>';
    setTimeout(function () { drawQR(url); }, 0);
    return h + "</main>";
  }
  function drawQR(url) {
    var box = document.getElementById("qr");
    if (!box) return;
    if (typeof window.qrcode !== "function" && !drawQR.retried) { drawQR.retried = true; setTimeout(function () { drawQR(url); }, 900); return; }
    if (typeof window.qrcode !== "function") { box.innerHTML = '<span class="small muted">QR을 그리지 못했어요 (인터넷 연결 필요). 링크나 코드를 나눠 주세요.</span>'; return; }
    try {
      var q = window.qrcode(0, "M"); q.addData(url); q.make();
      box.innerHTML = q.createSvgTag(4, 2);
    } catch (e) { box.textContent = ""; }
  }

  /* ───────── 방 화면: 코드 공유 → 캐릭터 → 지목 → 결정지 → 엔딩 ───────── */
  function roomGuard() {
    if (!DB) return '<main><div class="card">방 기능이 아직 켜지지 않았어요 (Firebase 설정 필요). <a href="#/">처음으로</a></div></main>';
    if (!st.room) return '<main><div class="card">들어간 방이 없어요. <a href="#/">처음으로</a></div></main>';
    if (!ROOM) return topBar() + '<main><p class="muted" style="text-align:center;padding:40px 0">방에 연결하는 중…</p></main>';
    if (!ROOM.created) return topBar() + '<main><div class="card">‘' + esc(st.room) + '’ 방을 찾지 못했어요. 코드를 다시 확인해 주세요.<div class="row" style="margin-top:10px"><button class="btn" data-leave>나가기</button></div></div></main>';
    return null;
  }
  function progressList() {
    var P = players(), V = votes();
    return '<div class="score">' + ROLES.map(function (r) {
      var p = P[r.k], s = st.sheets[r.k];
      var stt = !p ? '<span class="muted">비어 있음</span>' : (s && s.done ? "결정지 냄 ✅" : V[r.k] ? "지목함 · 결정지 쓰는 중" : "들어옴");
      return '<div class="sc-item" style="grid-template-columns:34px 1fr auto"><img alt="" src="' + roleImg(r.k) + '" style="width:30px;height:40px;object-fit:cover;border-radius:5px"><div><b>' + esc(r.name) + "</b>" + (r.k === st.me ? ' <span class="taken-mark">나</span>' : "") + '</div><div class="small">' + stt + "</div></div>";
    }).join("") + "</div>";
  }
  function vRoom() {
    var g = roomGuard(); if (g) return g;
    var P = players(), url = joinURL(st.room);
    var full = seated().length >= 8;
    var h = topBar() + "<main>";
    var kk = enterRoom.kicked;
    if (kk && !st.me) h += '<div class="warn" style="margin-top:0"><b>' + esc(seatName(kk.seat)) + "</b> 자리에서 나왔어요. " + (kk.by === "other" ? "다른 휴대폰이 이 역할로 다시 접속했어요." : "자리가 비워졌어요.") + " 본인이 맞다면 아래에서 그 역할을 다시 누르세요.</div>";
    if (!st.me && full) h += '<div class="warn" style="margin-top:0">자리가 모두 찼어요. 다시 접속하는 거라면 원래 자기 역할을 누르세요. 원래 휴대폰은 끊기고 이 휴대폰으로 이어져요.</div>';
    h += '<div class="kicker">1 · 방 코드 나누기</div><h2 class="ttl">방 ' + esc(st.room) + "</h2>";
    h += '<p class="lead">모두 각자 휴대폰으로 이 코드를 입력하거나 QR을 찍어 같은 방에 들어옵니다.</p>';
    h += '<div class="card"><div class="code-big">' + esc(st.room) + '</div><div class="qr" id="qr"></div><div class="row" style="justify-content:center"><button class="btn" data-copy="' + esc(st.room) + '">코드 복사</button><button class="btn" data-copy="' + esc(url) + '">링크 복사</button></div></div>';
    h += '<div class="kicker" style="margin-top:22px">2 · 내 캐릭터 고르기</div><h2 class="ttl" style="font-size:22px">나는 누구인가요?</h2>';
    h += '<div class="roles">' + ROLES.map(function (r) {
      var p = P[r.k], mine = r.k === st.me, other = p && !mine, off = other && p.online === false;
      return '<button class="role" style="--rc:' + r.color + (mine ? ";outline:3px solid var(--dusk);outline-offset:2px" : "") + (other ? ";opacity:.5" : "") + '" data-claim="' + r.k + '"><img alt="" src="' + roleImg(r.k) + '">' +
        (mine ? '<span class="badge">나</span>' : off ? '<span class="badge">연결 끊김</span>' : other ? '<span class="badge">선택됨</span>' : "") + '<div class="nm"><b>' + esc(r.name) + "</b><span>" + (mine ? "내 캐릭터" : other ? "본인이면 눌러서 다시 접속" : "고르기") + "</span></div></button>";
    }).join("") + "</div>";
    var gmMine = st.me === "gm", gmOther = P.gm && !gmMine;
    h += '<button class="big-btn" style="margin-top:10px' + (gmMine ? ";outline:3px solid var(--dusk);outline-offset:2px" : "") + (gmOther ? ";opacity:.5" : "") + '" data-claim="gm"><span class="ic">🎙</span><span><b>GM (진행자) ' + (gmMine ? "· 나" : gmOther ? "· 선택됨" : "") + "</b><span>캐릭터 없이 보기만 해요(없어도 돼요). 평소엔 플레이어가 넘기는 대로 함께 넘어가고, 막혔을 때만 오른쪽 아래 ‘관리’로 강제로 넘기기·자리 비우기를 할 수 있어요.</span></span></button>";
    h += '<p class="small muted" style="margin-top:8px">캐릭터 ' + claimed().length + " / 7명 · GM " + (P.gm ? 1 : 0) + " / 1명 · 이 방은 이 8자리에 앉은 사람만 볼 수 있어요</p>";
    var nextHref = isGM() ? "#/vote" : "#/vote";
    h += '<div class="nav"><button class="btn ghost" data-leave>방 나가기</button>' + (st.me ? '<a class="btn pri" href="' + nextHref + '">' + (isGM() ? "지목 진행 보기 →" : "지목하러 가기 →") + "</a>" : '<button class="btn pri" disabled>자리를 골라 주세요</button>') + "</div>";
    setTimeout(function () { drawQR(url); }, 0);
    return h + "</main>";
  }
  function tally() {
    var V = votes(), c = {};
    Object.keys(V).forEach(function (k) { if (players()[k]) c[V[k]] = (c[V[k]] || 0) + 1; });
    var max = 0; Object.keys(c).forEach(function (k) { max = Math.max(max, c[k]); });
    var top = Object.keys(c).filter(function (k) { return c[k] === max; });
    return { count: c, top: top, max: max };
  }
  function vVote() {
    var g = roomGuard(); if (g) return g;
    (function () {
      var w = claimed(), V = votes();
      if (w.length && w.every(function (k) { return V[k]; })) { var T = tally(); if (T.top.length === 1 && st.S.acc !== T.top[0]) set("acc", T.top[0]); }
    })();
    if (!st.me) { setTimeout(function () { location.hash = "#/room"; }, 0); return ""; }
    var gm = isGM();
    var V = votes(), my = V[st.me] || localVote(), who = claimed(), done = who.filter(function (k) { return V[k]; }).length;
    var all = who.length > 0 && done === who.length, T = tally();
    var h = topBar() + "<main>";
    h += '<div class="kicker">3 · 최후 토론 뒤</div><h2 class="ttl">범인 지목</h2>';
    h += '<p class="lead">하나, 둘, 셋에 맞춰 각자 지목하세요. 모두 지목할 때까지 누가 누구를 골랐는지는 보이지 않아요. 다 모이면 결과가 함께 열립니다.</p>';
    h += '<div class="choices">' + ACC.map(function (k) {
      var on = my === k;
      var pic = k === "none" ? '<span class="dot" style="background:var(--ink-3)"></span>' : '<img alt="" src="' + roleImg(k) + '">';
      return '<button class="choice' + (on ? " on" : "") + '" data-vote="' + k + '"' + (all || gm ? " disabled" : "") + ">" + pic + "<b>" + esc(nameOf(k)) + "</b>" + (all && T.count[k] ? ' <span class="muted small">' + T.count[k] + "표</span>" : "") + "</button>";
    }).join("") + "</div>";
    h += '<p class="small muted" style="margin-top:10px">지목 ' + done + " / " + who.length + "명" + (gm ? " · GM은 지목하지 않아요" : "") + "</p>";
    if (all) {
      h += '<div class="card">';
      if (T.top.length === 1) h += "<h3>가장 많이 지목된 사람 · " + esc(nameOf(T.top[0])) + " (" + T.max + "표)</h3>";
      else h += "<h3>동점이에요 (" + T.top.map(nameOf).join(", ") + ")</h3><p class=\"small\">다시 지목하거나, 이야기로 정한 사람을 눌러 주세요.</p>";
      h += '<div class="row">' + (T.top.length > 1 ? T.top.map(function (k) { return '<button class="btn' + (st.S.acc === k ? " pri" : "") + '" data-set="acc" data-v="' + esc(JSON.stringify(k)) + '">' + esc(nameOf(k)) + "</button>"; }).join("") : "") +
        (T.top.length > 1 && isPlayer() ? '<button class="btn ghost" data-revote>다시 지목하기</button>' : "") + "</div></div>";
    }
    var ready = !!st.S.acc && all;
    // 모두 지목하고 결과가 정해지면, 결과를 잠깐 보여 준 뒤 모두 자동으로 결정지로 넘어간다
    if (ready) {
      h += '<p class="small" style="text-align:center;margin-top:12px">모두 지목했어요. 잠시 뒤 ' + (gm ? "결정지 진행 화면" : "최종 결정지") + "로 넘어가요…</p>";
      if (!vVote.timer) vVote.timer = setTimeout(function () {
        vVote.timer = null;
        if (location.hash === "#/vote" && st.S.acc) location.hash = isGM() ? "#/wait" : "#/mysheet";
      }, 3500);
    } else if (vVote.timer) { clearTimeout(vVote.timer); vVote.timer = null; }
    h += '<div class="nav"><a class="btn ghost" href="#/room">← 방</a>' + (ready ? '<a class="btn pri" href="' + (gm ? "#/wait" : "#/mysheet") + '">' + (gm ? "결정지 진행 보기 →" : "최종 결정지 쓰기 →") + "</a>" : '<button class="btn pri" disabled>' + (all ? "지목 결과를 정해 주세요" : "모두 지목할 때까지 기다려요") + "</button>") + "</div>";
    return h + "</main>";
  }
  function vWait() {
    var g = roomGuard(); if (g) return g;
    var who = claimed(), done = who.filter(function (k) { var s = st.sheets[k]; return s && s.done; }).length;
    var all = who.length > 0 && done === who.length;
    var h = topBar() + "<main>";
    h += '<div class="kicker">4 · 최종 결정지</div><h2 class="ttl">모두 쓰기를 기다려요</h2>';
    h += '<p class="lead">캐릭터 모두가 결정지를 내면 엔딩북이 모두의 화면에서 함께 열려요. 그다음부터는 캐릭터 모두가 ‘다음’을 눌러야 함께 넘어갑니다 (GM은 세지 않아요).</p>';
    h += '<div class="card">' + progressList() + "</div>";
    if (isPlayer()) h += '<p><a class="btn" href="#/mysheet">내 결정지 다시 보기·고치기</a></p>';
    h += '<div class="nav"><a class="btn ghost" href="#/vote">← 지목</a>' + (all ? '<button class="btn pri" disabled>엔딩북을 여는 중…</button>' : '<button class="btn pri" disabled>' + done + " / " + who.length + "명 냈어요</button>") + "</div>";
    if (!voteDone()) h += '<div class="warn">아직 모두 지목하지 않았어요. 지목이 끝나야 엔딩북이 열려요. <a href="#/vote">지목 화면으로</a></div>';
    else if (isAdmin() && !all) h += '<p style="text-align:right"><button class="btn ghost" data-start data-force>' + (isGM() ? "GM · " : "") + "기다리지 않고 엔딩북 열기</button></p>";
    if ((st.S.stage || 0) >= stepIndex("ch1")) h += '<p style="text-align:center"><a class="btn pri" href="#/play/' + STEPS[st.S.stage].id + '">엔딩북이 열렸어요 · 지금 읽는 곳으로</a></p>';
    return h + "</main>";
  }

  function adminPanel() {
    var P = players(), taken = seated().filter(function (k) { return k !== st.me; });
    var h = '<button class="btn pri fab" data-admin aria-label="관리">⚙ 관리</button><div id="adminpanel" class="card adminpanel" hidden>';
    h += '<h3>' + (isGM() ? "GM 관리" : "방 관리 (GM이 없어서 누구나)") + '</h3><p class="small muted" style="margin:0 0 8px">휴대폰을 바꿨거나 자리를 잘못 고른 사람의 자리를 비우면, 그 사람이 다시 고를 수 있어요. 낸 결정지는 남아요.</p>';
    h += taken.length ? '<div class="chips">' + taken.map(function (k) { var off = P[k] && P[k].online === false; return '<button class="chip" data-release="' + k + '">' + esc(seatName(k)) + (off ? " (연결 끊김)" : "") + " 비우기</button>"; }).join("") + "</div>" : '<p class="small">비울 자리가 없어요.</p>';
    var stg = st.S.stage || 0;
    if (stg < stepIndex("ch1") && voteDone()) h += '<p style="margin:10px 0 0"><button class="btn ghost" data-start data-force>기다리지 않고 엔딩북 열기</button></p>';
    if (stg >= stepIndex("ch1") && stg < STEPS.length - 1) h += '<p style="margin:10px 0 0"><button class="btn ghost" data-forcenext>강제로 다음으로 넘기기 (' + esc(STEPS[stg].t) + " → " + esc(STEPS[stg + 1].t) + ")</button></p>";
    h += '<p style="margin:10px 0 0"><a class="btn ghost" href="#/room">방 화면</a></p></div>';
    return h;
  }

  /* ───────── 처음 ───────── */
  function vHome() {
    var S = st.S, D = derive(S), started = S.acc != null;
    var u = img("cover");
    var h = '<main><div class="cover">' + (u ? '<img alt="" src="' + u + '">' : "") + '<div class="cover-in"><p class="small">7인용 머더 미스터리</p><h1>오늘도<br>한빛은 맑음</h1><p>엔딩북</p></div></div>';
    h += '<div class="home-actions">';
    if (DB) {
      if (st.room) h += '<a class="big-btn primary" href="#/room"><span class="ic">◎</span><span><b>방 ' + esc(st.room) + "으로 돌아가기</b><span>" + (st.me ? esc(seatName(st.me)) + " · " : "") + "진행 중인 방</span></span></a>";
      h += '<button class="big-btn' + (st.room ? "" : " primary") + '" data-create><span class="ic">＋</span><span><b>방 만들기</b><span>코드를 나누고, 각자 휴대폰으로 캐릭터를 골라 지목·결정지·엔딩까지</span></span></button>';
      h += '<form class="big-btn" data-joinform style="cursor:default"><span class="ic">#</span><span style="flex:1"><b>방 들어가기</b><span class="row" style="margin-top:6px;flex-wrap:nowrap"><input type="text" name="room" placeholder="방 코드 4자리" maxlength="6" autocomplete="off" style="text-transform:uppercase;font-family:ui-monospace,monospace;min-height:40px"><button class="btn pri">입장</button></span></span></form>';
    }
    h += '<a class="big-btn' + (DB ? "" : " primary") + '" href="#/play/' + (started && !st.room ? STEPS[Math.min(S.stage || 0, STEPS.length - 1)].id : "accuse") + '"><span class="ic">▶</span><span><b>' + (started && !st.room ? "이어서 진행하기" : "한 기기로 진행하기") + "</b><span>" + (DB ? "휴대폰 하나로 돌려 가며 진행할 때" : "테이블 가운데 한 기기로 지목부터 개인 엔딩까지") + "</span></span></a>";
    if (!DB) h += '<a class="big-btn" href="#/code"><span class="ic">#</span><span><b>결과 코드로 보기</b><span>진행하는 기기의 코드·QR로 내 휴대폰에서 같은 결과 보기</span></span></a>';
    if (started && !st.room) h += '<a class="big-btn" href="#/story"><span class="ic">↺</span><span><b>지난 이야기</b><span>이번 판에 읽은 부분 다시 보기' + (D.ch3 ? " · 내 엔딩 보기" : "") + "</span></span></a>";
    h += '<a class="big-btn" href="#/book"><span class="ic">≡</span><span><b>엔딩북 전체 보기</b><span>모든 갈래와 엔딩을 원고 그대로</span></span></a>';
    h += "</div>";
    if (st.role && started) h += '<p style="text-align:center"><a class="btn" href="#/role/' + st.role + '">' + esc(R[st.role].name) + "의 엔딩으로</a></p>";
    h += '<p class="meta">엔딩북 원고 반영 ' + esc(B.built) + " (" + esc(B.source) + ")<br>게임이 끝난 뒤에 여세요. 결말이 담겨 있습니다.</p></main>";
    return h;
  }

  /* ───────── 라우터 ───────── */
  function route() {
    var hash = decodeURIComponent(location.hash.replace(/^#/, ""));
    var m;
    if ((m = hash.match(/^r=([0-9A-Za-z-]+)/))) {
      var S = readCode(m[1]);
      if (S) {
        var keep = st.sheets;
        st = blank(); st.S = S; st.sheets = keep; st.paper = true; save();
        toast("결과 코드를 불러왔어요");
        location.replace("#/story");
        return;
      }
      toast("코드를 읽지 못했어요");
    }
    if ((m = hash.match(/^join=([0-9A-Za-z]+)/))) {
      if (DB) { enterRoom(m[1].toUpperCase()); location.replace("#/room"); return; }
    }
    var parts = hash.replace(/^\//, "").split("/");
    var v = parts[0], arg = parts.slice(1).join("/");
    var html;
    if (v === "play") html = vPlay(arg || "accuse");
    else if (v === "sheet") html = vSheet(arg);
    else if (v === "role") html = vRole(arg);
    else if (v === "story") html = vStory();
    else if (v === "book") html = vBook(arg);
    else if (v === "code") html = vCode();
    else if (v === "room") html = vRoom();
    else if (v === "vote") html = vVote();
    else if (v === "mysheet") { var gg = roomGuard(); html = gg || (isPlayer() && !voteDone() && (st.S.stage || 0) < stepIndex("ch1") ? (setTimeout(function () { toast("모두 지목한 뒤에 결정지를 쓸 수 있어요"); location.hash = "#/vote"; }, 0), "") : isPlayer() ? vSheet(st.me) : (setTimeout(function () { location.hash = isGM() ? "#/wait" : "#/room"; }, 0), "")); }
    else if (v === "wait") html = vWait();
    else html = vHome();
    if (inRoom() && !st.me && /^(play|role|story|vote|mysheet|wait|sheet)$/.test(v)) { var g1 = roomGuard(); html = g1 || vRoom(); }
    if (inRoom() && ROOM && ROOM.created && isAdmin() && html) html += adminPanel();
    app.innerHTML = html;
    document.title = "한빛 엔딩북";
    if (v !== "book" || !arg) window.scrollTo(0, route.keepScroll ? route.keepScroll : 0);
    route.keepScroll = 0;
  }
  function rerender() { route.keepScroll = window.scrollY; route(); }
  document.addEventListener("focusout", function () { setTimeout(function () { if (softRender.pending) softRender(); }, 50); });

  app.addEventListener("click", function (ev) {
    var t = ev.target.closest("[data-set],[data-next],[data-open],[data-peekid],[data-copy],[data-reset],[data-close],[data-create],[data-claim],[data-vote],[data-revote],[data-start],[data-leave],[data-roomnext],[data-release],[data-admin],[data-forcenext]");
    if (!t) return;
    if (inRoom() && isGM() && (t.hasAttribute("data-set") || t.hasAttribute("data-roomnext") || t.hasAttribute("data-vote") || t.hasAttribute("data-revote"))) return; // GM은 보기만
    if (t.hasAttribute("data-set")) {
      var k = t.getAttribute("data-set"), val = JSON.parse(t.getAttribute("data-v"));
      if (st.S[k] === val) return; // 이미 그 답이면 아무것도 안 한다 (여러 명이 같이 눌러도 그대로)
      set(k, val);
      if (k === "acc") { /* 지목이 바뀌면 그대로 다시 그림 */ }
      rerender();
    } else if (t.hasAttribute("data-next")) {
      var nx = t.getAttribute("data-next");
      if (inRoom()) return;
      if (stepIndex(nx) > (st.S.stage || 0)) set("stage", stepIndex(nx));
      location.hash = "#/play/" + nx;
    } else if (t.hasAttribute("data-open")) {
      vSheet.open = t.getAttribute("data-open"); rerender();
    } else if (t.hasAttribute("data-close")) {
      vSheet.open = null;
    } else if (t.hasAttribute("data-peekid")) {
      var box = t.closest(".others"), id = t.getAttribute("data-peekid"), body = box.querySelector(".peek-body");
      var on = t.classList.contains("on");
      box.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("on"); });
      if (on) { body.innerHTML = ""; return; }
      t.classList.add("on");
      body.innerHTML = '<div class="peek"><div class="peek-lbl">' + (t.classList.contains("taken") ? "이번 판에서 읽은 갈래" : "다른 갈래 · 이번 판에는 읽지 않음") + "</div>" + sectionHTML(id, { mode: "book" }) + "</div>";
    } else if (t.hasAttribute("data-copy")) {
      var txt = t.getAttribute("data-copy");
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { toast("복사했어요"); }, function () { window.prompt("복사하세요", txt); });
    } else if (t.hasAttribute("data-create")) {
      t.disabled = true;
      createRoom().then(function (code) { enterRoom(code); location.hash = "#/room"; }, function (e) { t.disabled = false; toast("방을 만들지 못했어요: " + (e && e.message || e)); });
    } else if (t.hasAttribute("data-claim")) {
      var rk = t.getAttribute("data-claim");
      if (rk === st.me) return;
      var taken = players()[rk] && !isMine(players()[rk]);
      if (taken && !window.confirm("지금 다른 휴대폰이 " + seatName(rk) + "(으)로 들어와 있어요.\n본인이 다시 접속하는 거라면, 그 휴대폰을 끊고 이 휴대폰으로 들어갈까요?\n(쓰던 결정지와 지목은 그대로 이어져요)")) return;
      if (st.me && (st.S.stage || 0) >= stepIndex("ch1") && !window.confirm("엔딩북이 이미 열렸어요. 정말 자리를 바꿀까요?")) return;
      claimSeat(rk, taken);
    } else if (t.hasAttribute("data-release")) {
      var rr = t.getAttribute("data-release");
      if (!isAdmin() || !window.confirm(seatName(rr) + " 자리를 비울까요? 그 사람은 다시 자리를 골라야 해요 (낸 결정지는 남아요).")) return;
      var upd = {}; upd["players/" + rr] = null; DB.update(rp(""), upd); toast(seatName(rr) + " 자리를 비웠어요");
    } else if (t.hasAttribute("data-roomnext")) {
      var gstage = st.S.stage || 0; bumpStage(gstage, stepIndex(t.getAttribute("data-roomnext")));
    } else if (t.hasAttribute("data-forcenext")) {
      if (!isAdmin()) return;
      var fs = st.S.stage || 0;
      if (!window.confirm("판정이 남았어도 모두의 화면을 다음으로 넘길까요?")) return;
      bumpStage(fs, Math.min(fs + 1, STEPS.length - 1));
    } else if (t.hasAttribute("data-admin")) {
      var pnl = document.getElementById("adminpanel"); if (pnl) pnl.hidden = !pnl.hidden;
    } else if (t.hasAttribute("data-vote")) {
      if (!isPlayer()) return;
      castVote(t.getAttribute("data-vote"));
    } else if (t.hasAttribute("data-revote")) {
      if (!isPlayer() || !window.confirm("모두의 지목을 지우고 다시 지목할까요?")) return;
      DB.update(rp(""), { votes: null, "state/acc": null, "state/voteRound": voteRound() + 1 });
    } else if (t.hasAttribute("data-start")) {
      if (!isAdmin()) return;
      if (!voteDone()) { toast("모두 지목하고 결과가 정해져야 엔딩북을 열 수 있어요"); return; }
      if (!window.confirm("아직 결정지를 내지 않은 사람이 있어요. 그래도 엔딩북을 열까요?")) return;
      bumpStage(st.S.stage || 0, Math.max(stepIndex("ch1"), st.S.stage || 0));
    } else if (t.hasAttribute("data-leave")) {
      if (window.confirm("이 기기에서 방을 나갈까요? 내 자리는 비워져요 (방은 그대로 남아요).")) { if (st.me && players()[st.me] && isMine(players()[st.me])) DB.set(rp("players/" + st.me), null); leaveRoom(); location.hash = "#/"; }
    } else if (t.hasAttribute("data-reset")) {
      if (window.confirm("이 기기의 진행 상황과 결정지를 모두 지울까요?")) { st = blank(); save(); vSheet.open = null; location.hash = "#/"; toast("새 판을 시작합니다"); }
    }
  });
  app.addEventListener("input", function (ev) { var f = ev.target.closest && ev.target.closest("form[data-sheet]"); if (f) saveDraft(f); });
  app.addEventListener("change", function (ev) {
    var f = ev.target.closest && ev.target.closest("form[data-sheet]"); if (f) saveDraft(f);
    if (ev.target.hasAttribute("data-paper")) { st.paper = ev.target.checked; save(); rerender(); }
  });
  app.addEventListener("submit", function (ev) {
    var f = ev.target;
    ev.preventDefault();
    if (f.hasAttribute("data-sheet")) {
      var k = f.getAttribute("data-sheet"), o = readSheetForm(f, k);
      Object.keys(o).forEach(function (q) { if (typeof o[q] === "string") o[q] = o[q].trim(); });
      o.done = true;
      st.sheets[k] = o;
      try { localStorage.removeItem(draftKey(k)); localStorage.setItem(draftKey(k) + ".sent", JSON.stringify(o)); } catch (e) { /* 무시 */ }
      if (inRoom()) DB.set(rp("sheets/" + k), o);
      syncSheets(); vSheet.open = null;
      if (inRoom()) { toast("결정지를 냈어요"); location.hash = "#/wait"; }
      else { toast(R[k].name + "의 결정지를 가렸어요. 다음 사람에게 넘기세요"); location.hash = "#/play/sheets"; }
    }
    if (f.hasAttribute("data-joinform")) {
      var rc = (f.elements.room.value || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
      if (rc.length < 4) { toast("방 코드 4자리를 넣어 주세요"); return; }
      enterRoom(rc); location.hash = "#/room"; return;
    }
    if (f.hasAttribute("data-codeform")) {
      var S = readCode(f.elements.code.value);
      if (!S) { toast("코드가 맞지 않아요. 다시 확인해 주세요"); return; }
      var keep = st.sheets;
      st = blank(); st.S = S; st.sheets = keep; st.paper = true; save();
      toast("결과 코드를 불러왔어요");
      location.hash = "#/story";
    }
  });
  window.addEventListener("hashchange", route);

  // 디버그·점검용
  window.HANBIT = { createRoom: function () { return createRoom(); }, hasDB: function () { return !!DB; }, derive: derive, scoreOf: scoreOf, makeCode: makeCode, readCode: readCode, state: function () { return st; }, ROLES: ROLES };
  if (st.room && DB) enterRoom(st.room);
  route();
})();
