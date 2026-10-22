/* 진행 화면 — 막별 타이머, 망향 향 연기, 코드로 만든 빗소리·천둥·울림. 외부 파일 없음. */
(function () {
  'use strict';

  // ── 진행표 (규칙서 2026-10-21 · 진행 카드 A~F · 약 2시간 15분) ──
  // smoke: 연기 진하기 0~1. snd: rain 빗소리, thunder 천둥 잦기, drone 울림 크기, root 울림 음높이(Hz)
  // card: 이 구간을 여는 진행 카드. hold: 안내를 누를 때까지 띄워 둔다. arm: 화면을 두 번 누르면 하나, 둘, 셋.
  // turns: 이 구간을 n분씩 나눠 차례를 센다. pulse: 심장 박동
  var PHASES = [
    { bgm: 'open', act: '프롤로그', what: '공통 대본을 함께 읽습니다', min: 5, smoke: 1, stick: 'black',
      snd: { rain: .5, thunder: .3, drone: .1, root: 55 },
      notice: ['시작', '프롤로그', '공통 대본을 펴고 첫 장부터 함께 소리 내어 읽습니다.\n지문은 가우디가 읽습니다.'] },
    { bgm: 'open', act: '1막', what: '대본을 이어 읽습니다', min: 15, smoke: 1,
      snd: { rain: .45, thunder: .25, drone: .12, root: 55 },
      notice: ['1막', '대본을 이어 읽습니다', '지문은 외골수가 읽습니다.\n대본이 끝나면 진행 카드 A를 뒤집으세요.'] },
    { bgm: 'read', act: '2막', what: '설정지를 혼자 읽습니다', min: 10, smoke: .9, card: 'A',
      snd: { rain: .3, thunder: .1, drone: .12, root: 55 },
      notice: ['진행 카드 A · 별꽃', '“자, 숨을 한 번 고르고요.\n이제 한 분씩 이야기를 나눠 볼까요.”', '각자 인물 카드를 내놓고 본명과 직업을 밝힙니다.\n설정지를 다음 STOP까지 10분 동안 읽습니다.'] },
    { bgm: 'talk', act: '2막', what: '토론', sub: '이 불은 무엇인가. 저 여자는 누구인가.', min: 20, smoke: .85,
      snd: { rain: .55, thunder: .35, drone: .26, root: 55 },
      notice: ['2막', '토론을 시작합니다', '20분'] },
    { bgm: 'read', act: '3막', what: '설정지를 혼자 읽습니다', min: 10, smoke: .55, card: 'B',
      snd: { rain: .35, thunder: .15, drone: .14, root: 49 },
      notice: ['진행 카드 B · 별꽃', '“조금 더 깊이 들어가 보겠습니다.\n힘드시면 언제든 ‘잠시 쉬어요’라고 말씀하세요.”', '설정지를 다음 STOP까지 10분 동안 읽습니다.'] },
    { bgm: 'deep', act: '3막', what: '토론', sub: '누가 언제부터 오기로 했나. 불은 왜 꺼지지 않았나.', min: 20, smoke: .5,
      snd: { rain: .75, thunder: .5, drone: .3, root: 49 },
      notice: ['3막', '토론을 시작합니다', '20분'] },
    { bgm: 'probe', act: '4막', what: '조사', sub: '공개 단서 · 소지품 카드 · 사이트', min: 20, smoke: .3, card: 'C',
      snd: { rain: .4, thunder: .15, drone: .22, root: 46.25 },
      notice: ['진행 카드 C · 가우디', '“경찰을 부르기 전에, 이 방에 있는 것부터 확인합시다.\n손대기 전에 눈으로 먼저.”', '휴대폰을 돌려받습니다. 보관함은 2번 칸만 열리고 1번 칸은 잠긴 채입니다.\n공개 단서 묶음을 펼치고, 설정지 4막의 소지품 카드 2장을 꺼내고,\n사이트 접속 카드 QR로 들어가 조사합니다. 20분'] },
    { bgm: 'deep', act: '4막', what: '마지막 토론', sub: '다 함께 이야기합니다', min: 20, smoke: .2, card: 'D',
      snd: { rain: .5, thunder: .25, drone: .26, root: 46.25 },
      notice: ['진행 카드 D · 외골수', '“경찰 오기 전에 끝내요. 누가 했는지.”', '마지막 토론 20분'] },
    { bgm: 'final', act: '4막', what: '최종 추리', min: 4, smoke: .14, card: 'E', turns: 1,
      snd: { rain: .3, thunder: .1, drone: .26, root: 46.25 },
      notice: ['진행 카드 E · 하늘바라기', '“하늘이 다 보고 계세요.\n이제 각자 마음 가는 대로 하면 돼요.”', '한 사람씩 1분 최종 추리. 1분마다 방울이 울립니다.\n그동안 설정지 마지막 장에서 A·B 중 하나를 정해 둡니다.'] },
    { bgm: 'final', act: '4막', what: '투표', sub: '화면을 두 번 누르면 하나, 둘, 셋', min: 1, smoke: .1, pulse: true, arm: 'vote', hold: true,
      snd: { rain: .25, thunder: .05, drone: .3, root: 46.25 },
      notice: ['4막', '하나, 둘, 셋에 동시에', '카드를 움직이고 범인을 손가락으로 가리킵니다. 기권은 주먹. 제비는 가리킬 수 없습니다.\nA는 카드 1을 가운데로, B는 인물 카드를 뒤집습니다(별꽃의 B는 망향 카드를 다른 사람에게). 외골수는 투표로.\n동표면 네 사람 모두 그 사람들 가운데서만 한 번 더. 준비되면 화면을 두 번 누르세요.'] },
    { bgm: 'end', act: '엔딩', what: '엔딩북을 읽습니다', min: 10, smoke: 0,
      snd: { rain: .16, thunder: 0, drone: .18, root: 65.4, major: true },
      notice: ['엔딩', '엔딩북', '가장 많이 지목된 사람이 1·2부를 읽습니다. 다시 가리켜도 동표거나 모두 기권했으면 차위로가 읽고 2부는 \'그 밖의 경우\'.\n3부 개인 엔딩은 각자 읽습니다.'] }
  ];
  var TOTAL = PHASES.reduce(function (n, p) { return n + p.min * 60; }, 0);
  var NOTICE_MS = 14000;

  // ── 상태 (새로고침해도 이어진다) ─────────────────────────
  var KEY = 'hw4-stage-3'; // 진행표가 바뀌면 이름을 바꿔 옛 기록과 섞이지 않게
  var S = { i: 0, t0: 0, pausedAt: null, started: false, done: false, armed: null, vol: .7, muted: false, mix: { rain: 1, thunder: 1, drone: 1, bell: 1, bgm: 1 } };
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
  function load() { try { var x = JSON.parse(localStorage.getItem(KEY) || 'null'); if (x) { var m = Object.assign({}, S.mix, x.mix || {}); S = Object.assign(S, x); S.mix = m; } } catch (e) { } }
  function now() { return Date.now(); }
  function elapsed() { return ((S.pausedAt || now()) - S.t0) / 1000; }
  function phase() { return PHASES[S.i]; }
  // 구간 길이 = 진행표 시간 + 더하거나 뺀 시간
  function dur() { return phase().min * 60 + (S.extra || 0); }
  function remaining() { return Math.max(0, dur() - elapsed()); }
  function before(i) { var n = 0; for (var k = 0; k < i; k++) n += PHASES[k].min * 60; return n; }

  var $ = function (id) { return document.getElementById(id); };
  function mmss(s) { s = Math.ceil(s); var m = Math.floor(s / 60); return (m < 10 ? '0' : '') + m + ':' + ('0' + (s % 60)).slice(-2); }
  function hm(s) { s = Math.floor(s); return Math.floor(s / 3600) + ':' + ('0' + Math.floor(s % 3600 / 60)).slice(-2); }

  // ── 소리 (Web Audio로 직접 합성) ─────────────────────────
  var A = null;
  function audio() {
    if (A) return A;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    var ctx = new Ctx();
    var master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    // 2초짜리 분홍빛 잡음
    var len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0), b0 = 0, b1 = 0, b2 = 0;
    for (var i = 0; i < len; i++) { var w = Math.random() * 2 - 1; b0 = .99765 * b0 + w * .0990460; b1 = .96300 * b1 + w * .2965164; b2 = .57000 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * .1848) * .2; }
    function loop() { var s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.loopStart = Math.random(); s.start(0, Math.random() * 2); return s; }

    // 비: 높은 쉬익 + 낮은 쏴아
    var rain = ctx.createGain(); rain.gain.value = 0; rain.connect(master);
    var hiss = loop(), hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
    var lpH = ctx.createBiquadFilter(); lpH.type = 'lowpass'; lpH.frequency.value = 7500;
    var gH = ctx.createGain(); gH.gain.value = .55; hiss.connect(hp); hp.connect(lpH); lpH.connect(gH); gH.connect(rain);
    var body = loop(), lpB = ctx.createBiquadFilter(); lpB.type = 'lowpass'; lpB.frequency.value = 700;
    var gB = ctx.createGain(); gB.gain.value = .9; body.connect(lpB); lpB.connect(gB); gB.connect(rain);
    // 빗방울 굵기가 천천히 출렁이게
    var wob = ctx.createOscillator(), wobG = ctx.createGain(); wob.frequency.value = .05; wobG.gain.value = .18; wob.connect(wobG); wobG.connect(gB.gain); wob.start();

    // 울림: 낮은 사인 두 개 + 5도, 천천히 숨쉬듯
    var drone = ctx.createGain(); drone.gain.value = 0;
    var dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 420; dlp.Q.value = .7;
    drone.connect(dlp); dlp.connect(master);
    var oscs = [[1, 'sine', .55], [1.004, 'sine', .45], [1.5, 'triangle', .16], [2, 'sine', .14], [1.2, 'sine', 0]].map(function (o) {
      var osc = ctx.createOscillator(), g = ctx.createGain(); osc.type = o[1]; osc.frequency.value = 55 * o[0]; g.gain.value = o[2];
      osc.connect(g); g.connect(drone); osc.start(); return { osc: osc, mul: o[0], g: g };
    });
    var breath = ctx.createOscillator(), breathG = ctx.createGain(); breath.frequency.value = .07; breathG.gain.value = .35;
    var dAmp = ctx.createGain(); dAmp.gain.value = 1;
    drone.disconnect(); drone.connect(dAmp); dAmp.connect(dlp); breath.connect(breathG); breathG.connect(dAmp.gain); breath.start();

    A = { ctx: ctx, master: master, rain: rain, drone: drone, oscs: oscs, buf: buf, loop: loop, thunderRate: 0, pulse: false };
    return A;
  }
  function setVolume() { if (A) A.master.gain.setTargetAtTime(S.muted ? 0 : S.vol, A.ctx.currentTime, .4); }
  // ── 배경 음악 (무료 음원, site/audio/). 구간마다 p.bgm 곡으로 천천히 바뀐다 ──
  var BGM = {
    open: 'audio/isolated.mp3',     // 프롤로그·1막
    read: 'audio/sopor.mp3',        // 설정지 읽기
    talk: 'audio/cylinder-five.mp3', // 2막 토론
    deep: 'audio/hide-secrets.mp3', // 3막 토론·마지막 토론
    probe: 'audio/gagool.mp3',      // 조사
    final: 'audio/devastation.mp3', // 최종 추리·투표
    end: 'audio/denouement.mp3'     // 엔딩
  };
  var bgmEls = {}, bgmCur = null;
  function bgmEl(k) {
    if (!k || !BGM[k]) return null;
    if (!bgmEls[k]) {
      var a = new Audio(BGM[k]); a.loop = true; a.preload = 'auto'; a.volume = 0; bgmEls[k] = a;
      // 파일이 없으면 첫 곡으로 대신한다
      a.addEventListener('error', function () { if (k === 'open') return; delete bgmEls[k]; BGM[k] = BGM.open; if (bgmCur === k) bgmSet(k); });
    }
    return bgmEls[k];
  }
  function bgmTarget(k) {
    if (k !== bgmCur || S.muted || !S.started || S.done) return 0;
    var v = S.vol * (S.mix.bgm == null ? 1 : S.mix.bgm) * .8 * (S.pausedAt ? .35 : 1);
    try { if (window.speechSynthesis && speechSynthesis.speaking) v *= .35; } catch (e) { } // 안내 음성이 나오면 줄인다
    return Math.max(0, Math.min(1, v));
  }
  function bgmSet(k) { bgmCur = BGM[k] ? k : null; var a = bgmEl(bgmCur); if (a && a.paused) a.play().catch(function () { }); }
  setInterval(function () {
    for (var k in bgmEls) {
      var a = bgmEls[k], tg = bgmTarget(k), v = a.volume;
      v += Math.max(-.02, Math.min(.02, tg - v)); a.volume = Math.max(0, Math.min(1, v));
      if (a.volume < .005 && tg === 0 && !a.paused) a.pause();
    }
  }, 150);
  function applySound(p, quick) {
    bgmSet(p.bgm);
    if (!A) return;
    var t = A.ctx.currentTime, tc = quick ? .3 : 4;
    var paused = !!S.pausedAt;
    A.rain.gain.setTargetAtTime((paused ? p.snd.rain * .35 : p.snd.rain) * S.mix.rain, t, tc);
    A.drone.gain.setTargetAtTime(paused ? 0 : p.snd.drone * S.mix.drone, t, tc);
    A.oscs.forEach(function (o, k) {
      var mul = o.mul;
      if (k === 4) { o.g.gain.setTargetAtTime(p.snd.major ? .12 : 0, t, tc); mul = p.snd.major ? 1.25 : 1.2; }
      o.osc.frequency.setTargetAtTime(p.snd.root * mul, t, tc);
    });
    A.thunderRate = paused || !S.mix.thunder ? 0 : p.snd.thunder;
  }
  // 천둥: 저역 잡음에 긴 꼬리. 가까운 천둥은 화면도 번쩍
  function thunder(force) {
    if (!A) return;
    var ctx = A.ctx, t = ctx.currentTime + .05, near = force || Math.random() < .35;
    var src = A.loop(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(near ? 900 : 260, t); lp.frequency.exponentialRampToValueAtTime(90, t + 5);
    var peak = (near ? .9 : .45) * (.7 + Math.random() * .3) * S.mix.thunder;
    if (!peak) return;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + (near ? .06 : .6));
    for (var k = 0; k < 3; k++) g.gain.linearRampToValueAtTime(peak * (.4 + Math.random() * .5), t + .4 + k * (.5 + Math.random()));
    g.gain.exponentialRampToValueAtTime(.001, t + 6 + Math.random() * 3);
    src.connect(lp); lp.connect(g); g.connect(A.master); src.stop(t + 10);
    if (near) flash();
  }
  // 방울 소리: 비조화 배음이 길게 사라지는 종
  function bell(f, vol) {
    if (!A || !S.mix.bell) return;
    vol = (vol || .35) * S.mix.bell;
    var ctx = A.ctx, t = ctx.currentTime + .02;
    [[1, 1, 4.5], [2.76, .5, 2.6], [5.4, .25, 1.4], [8.93, .12, .8]].forEach(function (p) {
      var o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = (f || 660) * p[0];
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * p[1], t + .005); g.gain.exponentialRampToValueAtTime(.0001, t + p[2]);
      o.connect(g); g.connect(A.master); o.start(t); o.stop(t + p[2] + .1);
    });
  }
  // 지목 시간의 심장 박동
  function thump(t, v) {
    v *= S.mix.drone; if (!v) return;
    var ctx = A.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(38, t + .18);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + .3);
    o.connect(g); g.connect(A.master); o.start(t); o.stop(t + .35);
  }
  var lastBeat = 0;
  function soundTick() {
    if (!A || S.pausedAt || !S.started || S.done) return;
    if (Math.random() < A.thunderRate * 2 / 60 / 4) thunder(); // 초당 4회 검사, 분당 thunder×2번 꼴
    if (A.pulse && now() - lastBeat > 1300) { lastBeat = now(); var t = A.ctx.currentTime + .02; thump(t, .5); thump(t + .28, .32); }
  }

  // ── 화면 ────────────────────────────────────────────────
  function flash() {
    var f = $('flash');
    f.animate([{ opacity: 0 }, { opacity: .35, offset: .05 }, { opacity: .05, offset: .2 }, { opacity: .22, offset: .3 }, { opacity: 0 }], { duration: 900, easing: 'ease-out' });
  }
  // 안내 읽어 주기: 기기에 들어 있는 한국어 음성(speechSynthesis)으로 읽는다. 음성이 없으면 조용히 넘어간다
  // 메뉴에서 목소리(S.voice: 음성 이름)·빠르기(S.rate)·높이(S.pitch)를 고른다
  var voiceKo = null, voicesKo = [];
  function pickVoice() {
    try {
      voicesKo = speechSynthesis.getVoices().filter(function (v) { return /^ko/i.test(v.lang); }).sort(function (a, b) { return (/google|natural|neural|premium|enhanced|yuna|sora|heami/i.test(b.name) ? 1 : 0) - (/google|natural|neural|premium|enhanced|yuna|sora|heami/i.test(a.name) ? 1 : 0); });
      voiceKo = voicesKo.filter(function (v) { return v.name === S.voice; })[0] || voicesKo[0] || null;
      syncVoice();
    } catch (e) { }
  }
  function syncVoice() {
    var sel = $('voice'); if (!sel) return;
    sel.innerHTML = voicesKo.length ? voicesKo.map(function (v) { var g = /injoon|hyunsu|minsu|bongjin|gookmin|jaehyun/i.test(v.name) ? ' (남성)' : /sunhi|yuna|sora|heami|jimin|seoyeon|yujin|seohyeon|soon-?bok/i.test(v.name) ? ' (여성)' : ''; return '<option value="' + v.name.replace(/[<"]/g, '') + '"' + (voiceKo === v ? ' selected' : '') + '>' + v.name.replace(/</g, '') + g + '</option>'; }).join('') : '<option>이 기기에 한국어 음성이 없어요</option>';
    sel.disabled = !voicesKo.length;
    $('rate').value = S.rate || .92; $('pitch').value = S.pitch || .95;
  }
  if (window.speechSynthesis) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function speak(text, keep) {
    if (!window.speechSynthesis || S.tts === false || S.muted) return;
    try {
      if (!keep) speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text.replace(/[“”"]/g, '').replace(/\n+/g, '. ').replace(/STOP/g, '스톱'));
      u.lang = 'ko-KR'; if (voiceKo) u.voice = voiceKo; u.rate = S.rate || .92; u.pitch = S.pitch || .95; u.volume = Math.min(1, S.vol + .2);
      speechSynthesis.speak(u);
    } catch (e) { }
  }
  var noticeT;
  function notice(k, t, s, ms) {
    if (S.started) speak((t || '') + '. ' + (s || ''));
    var n = $('notice');
    n.querySelector('.n-k').textContent = k || ''; n.querySelector('.n-t').textContent = t || ''; n.querySelector('.n-s').textContent = s || '';
    n.hidden = false; clearTimeout(noticeT);
    if (ms !== 0) noticeT = setTimeout(function () { n.hidden = true; }, ms || NOTICE_MS);
  }
  function hideNotice() { $('notice').hidden = true; clearTimeout(noticeT); }

  // 하나, 둘, 셋 — 카드 움직이기와 지목을 동시에 (진행 카드 E)
  var AFTER = {
    vote: '카드와 손가락을 그대로 두세요.\n\n가장 많이 지목된 사람이\n엔딩북 1·2부를 읽습니다.\n동표면 네 사람 모두 그 사람들 가운데서만 한 번 더\n(화면 두 번 누르기 · 카드는 그대로).\n그래도 같거나 모두 기권했으면 차위로가 읽습니다.'
  };
  function countdown(kind) {
    hideNotice(); if (kind !== 'vote') S.armed = null; save(); // 투표는 동표 재투표를 위해 다시 셀 수 있게 둔다
    var c = $('count'), steps = ['하나', '둘', '셋'], k = 0;
    c.className = ''; c.hidden = false;
    (function step() {
      if (k < steps.length) { c.textContent = steps[k]; speak(steps[k]); bell(k < 2 ? 520 : 780, k < 2 ? .3 : .45); k++; setTimeout(step, 1300); return; }
      if (!AFTER[kind]) { setTimeout(function () { c.hidden = true; }, 1500); return; }
      c.className = 'small'; c.textContent = AFTER[kind];
      setTimeout(function () { c.hidden = true; }, 15000);
    })();
  }

  function enter(i, quiet) {
    var p = PHASES[i];
    S.i = i; S.t0 = now(); S.pausedAt = null; S.armed = p.arm || null; S.turn = 0; S.done = false; S.extra = 0; save();
    applySound(p);
    if (!quiet) { bell(p.card ? 587 : 660); notice(p.notice[0], p.notice[1], p.notice[2], p.hold ? 0 : NOTICE_MS); }
    renderList();
  }
  function finish() {
    S.done = true; S.pausedAt = now(); save();
    if (A) { A.thunderRate = 0; A.pulse = false; A.drone.gain.setTargetAtTime(0, A.ctx.currentTime, 6); A.rain.gain.setTargetAtTime(.08, A.ctx.currentTime, 8); }
    bell(440, .3);
    notice('', '향이 다 탔습니다', '경찰이 도착합니다.', 0);
  }

  function tick() {
    if (!S.started) return;
    var p = phase(), rem = remaining();
    if (!S.done && !S.pausedAt && rem <= 0) {
      if (S.i < PHASES.length - 1) enter(S.i + 1); else finish();
      return;
    }
    // 규칙서: "잠시 쉬어요"라고 하면 모두 잠시 멈춘다
    var sub = S.pausedAt && !S.done ? '잠시 쉬어요. 모두 잠시 멈춥니다.' : p.sub || '';
    // 한 사람씩 n분: 차례가 바뀌면 방울
    if (p.turns && !S.done) {
      var turn = Math.min(Math.floor(elapsed() / 60 / p.turns), Math.round(dur() / 60 / p.turns) - 1);
      if (turn > (S.turn || 0)) { S.turn = turn; save(); if (!S.pausedAt) bell(700, .22); }
      if (!S.pausedAt) sub = (turn + 1) + '번째 사람 · ' + p.turns + '분';
    }
    if (A) A.pulse = !S.pausedAt && !!p.pulse;
    $('act').textContent = p.act;
    $('what').textContent = p.what;
    $('sub').textContent = sub;
    var c = $('clock');
    c.textContent = S.done ? '00:00' : mmss(rem);
    c.classList.toggle('low', rem < 60 && !S.done);
    c.classList.toggle('paused', !!S.pausedAt && !S.done);
    $('total').classList.toggle('tip', now() < tipUntil);
    $('total').textContent = now() < tipUntil ? tipText : (S.pausedAt && !S.done ? '일시정지 · ' : '') + '전체 ' + hm(before(S.i) + Math.min(elapsed(), dur())) + ' / ' + hm(TOTAL);
    smokeLevel = S.done ? 0 : p.smoke * (S.pausedAt ? .4 : 1);
    stickFrac = S.done ? 0 : rem / dur();
  }

  // ── 망향 연기 (캔버스) ───────────────────────────────────
  var cv = $('smoke'), g = cv.getContext('2d'), W = 0, H = 0, DPR = 1;
  var smokeLevel = 1, stickFrac = 1, parts = [], sprite;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2); W = window.innerWidth; H = window.innerHeight;
    cv.width = W * DPR; cv.height = H * DPR; g.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  function makeSprite() {
    var s = document.createElement('canvas'); s.width = s.height = 128;
    var x = s.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(215,212,225,0.55)'); gr.addColorStop(.45, 'rgba(200,198,212,0.22)'); gr.addColorStop(1, 'rgba(190,190,205,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return s;
  }
  function base() { return { x: W / 2, y: H * .9 }; }
  function tip() { var b = base(), maxLen = Math.min(H * .34, 320); return { x: b.x, y: b.y - 14 - maxLen * Math.max(stickFrac, .02) }; }
  var lastT = 0, spawnAcc = 0;
  function frame(ts) {
    var dt = Math.min(.05, (ts - lastT) / 1000 || .016); lastT = ts;
    var t = ts / 1000;
    g.clearRect(0, 0, W, H);
    var bg = g.createRadialGradient(W / 2, H * .9, 10, W / 2, H * .7, Math.max(W, H) * .8);
    bg.addColorStop(0, 'rgba(48,34,22,.55)'); bg.addColorStop(.35, 'rgba(18,16,16,.6)'); bg.addColorStop(1, 'rgba(7,8,11,1)');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);

    var b = base(), tp = tip(), burning = stickFrac > 0.001;
    // 연기 입자
    spawnAcc += dt * 42 * smokeLevel;
    while (burning && spawnAcc > 1) { spawnAcc--; parts.push({ x: tp.x + (Math.random() - .5) * 2, y: tp.y - 2, vy: -(30 + Math.random() * 24), r: 4 + Math.random() * 3, age: 0, life: 10 + Math.random() * 6, ph: Math.random() * 6.28, a: .5 + Math.random() * .5 }); }
    var wind = Math.sin(t * .13) * 10 + Math.sin(t * .041) * 16;
    for (var k = parts.length - 1; k >= 0; k--) {
      var p = parts[k]; p.age += dt;
      if (p.age > p.life || p.y < -80) { parts.splice(k, 1); continue; }
      var rise = (tp.y - p.y) / H;
      p.y += p.vy * dt;
      p.x += (Math.sin(p.ph + t * (.8 + rise) + p.y * .012) * (8 + rise * 120) + wind * rise * 3) * dt;
      p.r += dt * (2.5 + rise * 34);
      var life = p.age / p.life, alpha = Math.min(1, p.age * 2) * (1 - life) * (1 - life) * .3 * p.a;
      g.globalAlpha = alpha;
      g.drawImage(sprite, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
    }
    g.globalAlpha = 1;
    // 향꽂이 (재 담긴 그릇)
    g.fillStyle = '#1a1714'; g.beginPath(); g.ellipse(b.x, b.y + 6, 46, 12, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3a342d'; g.beginPath(); g.ellipse(b.x, b.y, 40, 8, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#6b655c'; g.beginPath(); g.ellipse(b.x, b.y - 1, 32, 5, 0, 0, Math.PI * 2); g.fill();
    // 향 막대
    g.lineCap = 'round';
    g.strokeStyle = '#4a2a1e'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(b.x, b.y - 2); g.lineTo(b.x, b.y - 16); g.stroke();
    if (burning) {
      // 프롤로그에 피우는 것은 금방울당의 검은 향 '망향' (금빛 알갱이가 박혀 있다)
      var black = S.started && !S.done && phase().stick === 'black';
      g.strokeStyle = black ? '#1d1a18' : '#7a3b26'; g.lineWidth = 3.2; g.beginPath(); g.moveTo(b.x, b.y - 14); g.lineTo(tp.x, tp.y + 5); g.stroke();
      if (black) {
        g.fillStyle = 'rgba(214,170,90,.75)';
        for (var fy = b.y - 18; fy > tp.y + 8; fy -= 7) g.fillRect(b.x + ((fy * 7) % 3) - 1.5, fy, 1.2, 1.2);
      }
      g.strokeStyle = '#8d8a85'; g.lineWidth = 3.4; g.beginPath(); g.moveTo(tp.x, tp.y + 5); g.lineTo(tp.x, tp.y); g.stroke();
      var fl = .75 + Math.sin(t * 7) * .08 + Math.sin(t * 13.3) * .06 + Math.random() * .05;
      var eg = g.createRadialGradient(tp.x, tp.y, 0, tp.x, tp.y, 16 * fl);
      eg.addColorStop(0, 'rgba(255,190,120,' + (.95 * fl) + ')'); eg.addColorStop(.25, 'rgba(255,120,50,' + (.5 * fl) + ')'); eg.addColorStop(1, 'rgba(255,80,20,0)');
      g.fillStyle = eg; g.beginPath(); g.arc(tp.x, tp.y, 16, 0, Math.PI * 2); g.fill();
    }
    requestAnimationFrame(frame);
  }

  // ── 조작 ────────────────────────────────────────────────
  function togglePause() {
    if (S.done) return;
    if (S.pausedAt) { S.t0 += now() - S.pausedAt; S.pausedAt = null; } else S.pausedAt = now();
    save(); applySound(phase(), true);
    document.querySelector('[data-c=pause]').textContent = S.pausedAt ? '다시 시작' : '일시정지';
    syncBar();
  }
  // +는 남은 시간을 늘린다
  function shift(sec) { if (S.done) return; S.extra = Math.max((S.extra || 0) + sec, elapsed() - phase().min * 60); save(); tick(); }
  function renderList() {
    var ol = $('plist'); if (!ol) return;
    ol.innerHTML = PHASES.map(function (p, k) {
      return '<li data-i="' + k + '" class="' + (k === S.i ? 'on' : k < S.i ? 'done' : '') + '"><span>' + p.act + ' · ' + p.what + '</span><span>' + p.min + '분</span></li>';
    }).join('');
  }
  $('plist').addEventListener('click', function (e) {
    var li = e.target.closest('li'); if (!li) return;
    if (confirm('“' + PHASES[+li.dataset.i].act + ' · ' + PHASES[+li.dataset.i].what + '” 처음으로 옮길까요?')) { enter(+li.dataset.i); closePanel(); }
  });
  function openPanel() { $('panel').hidden = false; renderList(); syncMix(); pickVoice(); document.querySelector('[data-c=pause]').textContent = S.pausedAt ? '다시 시작' : '일시정지'; document.querySelector('[data-c=mute]').textContent = S.muted ? '소리 켜기' : '소리 끄기'; document.querySelector('[data-c=tts]').textContent = S.tts === false ? '안내 음성 켜기' : '안내 음성 끄기'; }
  function closePanel() { $('panel').hidden = true; }
  $('panel').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var c = b.dataset.c;
    if (c === 'pause') togglePause();
    else if (c === '+60') shift(60);
    else if (c === '-60') shift(-60);
    else if (c === 'next') { if (S.i < PHASES.length - 1) enter(S.i + 1); else finish(); closePanel(); }
    else if (c === 'prev') { enter(Math.max(0, S.i - 1)); closePanel(); }
    else if (c === 'cards') { closePanel(); countdown(S.armed); }
    else if (c === 'try-thunder') { audio(); thunder(true); }
    else if (c === 'try-bell') { audio(); bell(660); }
    else if (c === 'only-bell' || c === 'all-on') { var on = c === 'all-on' ? 1 : 0; S.mix = { rain: on, thunder: on, drone: on, bell: 1, bgm: on }; save(); syncMix(); applySound(phase(), true); }
    else if (c === 'tts') { S.tts = S.tts === false; save(); b.textContent = S.tts === false ? '안내 음성 켜기' : '안내 음성 끄기'; if (S.tts !== false) speak('안내 음성을 켰습니다.'); else if (window.speechSynthesis) speechSynthesis.cancel(); }
    else if (c === 'mute') { S.muted = !S.muted; save(); setVolume(); b.textContent = S.muted ? '소리 켜기' : '소리 끄기'; }
    else if (c === 'full') { var d = document.documentElement; (d.requestFullscreen || d.webkitRequestFullscreen || function () { }).call(d); }
    else if (c === 'reset') { if (confirm('타이머를 처음으로 되돌릴까요?')) { try { localStorage.removeItem(KEY); } catch (x) { } location.reload(); } }
    else if (c === 'close') closePanel();
  });
  // 소리 층마다 크기 조절 (0이면 그 소리를 끈다)
  function syncMix() { document.querySelectorAll('[data-m]').forEach(function (el) { el.value = el.dataset.m === 'vol' ? S.vol : S.mix[el.dataset.m]; }); }
  $('voice').addEventListener('change', function () { S.voice = this.value; pickVoice(); save(); speak('이 목소리로 안내합니다.'); });
  $('rate').addEventListener('change', function () { S.rate = +this.value; save(); speak('이 빠르기로 안내합니다.'); });
  $('pitch').addEventListener('change', function () { S.pitch = +this.value; save(); speak('이 높이로 안내합니다.'); });
  document.querySelector('.mix:not(.voice)').addEventListener('input', function (e) {
    var k = e.target.dataset.m; if (!k) return;
    if (k === 'vol') { S.vol = +e.target.value; setVolume(); } else { S.mix[k] = +e.target.value; applySound(phase(), true); }
    save();
  });

  // 늘 보이는 조작 줄
  var idleT;
  function wakeBar() { var b = $('bar'); b.classList.remove('idle'); clearTimeout(idleT); idleT = setTimeout(function () { b.classList.add('idle'); }, 4000); }
  function syncBar() { var b = document.querySelector('[data-b=pause]'); b.textContent = S.pausedAt ? '▶' : '⏸'; b.classList.toggle('on', !!S.pausedAt); }
  $('bar').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    e.stopPropagation(); wakeBar();
    var c = b.dataset.b;
    if (c === 'pause') togglePause();
    else if (c === 'menu') openPanel();
    else if (c === 'next') { var nx = PHASES[S.i + 1]; if (confirm(nx ? '“' + nx.act + ' · ' + nx.what + '”(으)로 넘어갈까요?' : '끝낼까요?')) { if (nx) enter(S.i + 1); else finish(); } }
    else { shift(+c); toast((+c > 0 ? '+' : '−') + Math.abs(+c / 60) + '분'); }
    syncBar();
  });
  document.addEventListener('pointermove', function () { if (S.started) wakeBar(); });
  var tipText = '', tipUntil = 0;
  function toast(t) { tipText = t; tipUntil = now() + 1500; tick(); }

  // 길게 누르면 메뉴, 두 번 누르면(지목·카드 시간) 하나 둘 셋
  var pressT, lastTap = 0;
  document.addEventListener('pointerdown', function (e) {
    if (!S.started || e.target.closest('#panel') || e.target.closest('#bar')) return;
    pressT = setTimeout(openPanel, 650);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { document.addEventListener(ev, function () { clearTimeout(pressT); }); });
  document.addEventListener('click', function (e) {
    if (!S.started || e.target.closest('#panel') || e.target.closest('#start') || e.target.closest('#bar')) return;
    wakeBar();
    var t = now();
    if (S.armed && t - lastTap < 400) { countdown(S.armed); lastTap = 0; return; }
    lastTap = t;
    if (!$('notice').hidden && !S.done && !S.armed) hideNotice();
  });
  document.addEventListener('keydown', function (e) {
    if (!S.started) return;
    if (e.key === ' ') { e.preventDefault(); togglePause(); }
    else if (e.key === 'Escape' || e.key === 'm') $('panel').hidden ? openPanel() : closePanel();
    else if (e.key === 'ArrowRight') shift(60);
    else if (e.key === 'ArrowLeft') shift(-60);
    else if (e.key === 't') thunder(true);
  });

  // 화면 꺼짐 막기
  var lock = null;
  function wake() { try { if (navigator.wakeLock && document.visibilityState === 'visible') navigator.wakeLock.request('screen').then(function (l) { lock = l; }).catch(function () { }); } catch (e) { } }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && S.started) { wake(); if (A && A.ctx.state === 'suspended') A.ctx.resume(); } });

  function begin(fresh) {
    $('start').hidden = true;
    audio(); if (A && A.ctx.state === 'suspended') A.ctx.resume();
    setVolume(); wake();
    S.started = true;
    $('bar').hidden = false; syncBar(); wakeBar();
    if (fresh) enter(0);
    else {
      applySound(phase(), true); save(); renderList();
      if (S.done) notice('', '향이 다 탔습니다', '경찰이 도착합니다.', 0);
      else if (S.armed) notice(phase().notice[0], phase().notice[1], phase().notice[2], 0);
    }
    syncMix();
  }
  load(); if (window.speechSynthesis) pickVoice();
  if (S.started && !S.done) $('resume').hidden = false;
  S.started = false;
  $('go').addEventListener('click', function () { if (!$('resume').hidden && !confirm('처음부터 다시 시작할까요? (이어서 하려면 ‘이어서 진행’)')) return; begin(true); });
  // 새로고침·탭 닫힘 뒤에도 실제 시각 기준으로 이어서 간다
  $('go-quiet').addEventListener('click', function () { if (!$('resume').hidden && !confirm('처음부터 다시 시작할까요?')) return; S.mix = { rain: 0, thunder: 0, drone: 0, bell: 1, bgm: 0 }; begin(true); });
  $('resume').addEventListener('click', function () { begin(false); });

  resize(); sprite = makeSprite();
  window.addEventListener('resize', resize);
  requestAnimationFrame(frame);
  setInterval(tick, 250);
  setInterval(soundTick, 250);
  tick();
})();
