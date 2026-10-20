/* 진행 화면 — 막별 타이머, 망향 향 연기, 코드로 만든 빗소리·천둥·울림. 외부 파일 없음. */
(function () {
  'use strict';

  // ── 진행표 (제작노트 2시간 30분) ───────────────────────
  // smoke: 연기 진하기 0~1. snd: rain 빗소리, thunder 천둥 잦기, drone 울림 크기, root 울림 음높이(Hz)
  var PHASES = [
    { act: '프롤로그 · 1막', what: '공통 대본을 함께 읽습니다', min: 20, smoke: 1,
      snd: { rain: .5, thunder: .3, drone: .1, root: 55 },
      notice: ['시작', '프롤로그', '공통 대본을 펴고, 첫 줄에 적힌 사람부터 소리 내어 읽습니다.\n대본이 끝나면 그대로 기다려 주세요.'] },
    { act: '2막', what: '설정지 2막을 혼자 읽습니다', min: 10, smoke: .9,
      snd: { rain: .3, thunder: .1, drone: .12, root: 55 },
      notice: ['STOP 1', '설정지를 넘기세요', '2막 설정지를 10분 동안 혼자 읽습니다.\n아직 말하지 마세요.'] },
    { act: '2막', what: '대화', sub: '이 불은 무엇인가. 저 여자는 누구인가.', min: 20, smoke: .85,
      snd: { rain: .55, thunder: .35, drone: .26, root: 55 },
      notice: ['2막', '대화를 시작합니다', '20분'] },
    { act: '3막', what: '설정지 3막을 혼자 읽습니다', min: 15, smoke: .55,
      snd: { rain: .35, thunder: .15, drone: .14, root: 49 },
      notice: ['STOP 2', '설정지를 넘기세요', '3막 설정지를 15분 동안 혼자 읽습니다.'] },
    { act: '3막', what: '대화', sub: '누가 언제부터 오기로 했나. 불은 왜 꺼지지 않았나.', min: 25, smoke: .5,
      snd: { rain: .75, thunder: .5, drone: .3, root: 49 },
      notice: ['3막', '대화를 시작합니다', '25분'] },
    { act: '4막', what: '기록', min: 50, smoke: .2,
      snd: { rain: .4, thunder: .15, drone: .24, root: 46.25 },
      notice: ['STOP 3', '공개 단서 봉투를 엽니다', '설정지 4막을 넘기고, 휴대폰으로 기록을 찾습니다.\n50분'],
      cues: [
        [0, '봉투를 열고, 자기 계정으로 로그인합니다'],
        [10, '방법 — 불은 왜 꺼지지 않았나'],
        [25, '정체 — 남매와 어머니, 편지는 누구였나'],
        [35, '각자의 죄를 마주합니다'],
        [40, '범인 지목', '범인 지목', '5분 안에 범인을 가리킵니다.'],
        [45, '카드 1 선택과 대사', '선택', '모두 카드 1에 손을 얹으세요.\n준비되면 화면을 두 번 누르세요. 화면이 하나, 둘, 셋을 셉니다.', 'cards']
      ] },
    { act: '엔딩', what: '엔딩북을 읽습니다', min: 10, smoke: 0,
      snd: { rain: .16, thunder: 0, drone: .18, root: 65.4, major: true },
      notice: ['엔딩', '엔딩북', '오십분 → 하늘바라기 → 기초부터 → 늦은소식 순서로 읽습니다.\n오십분과 하늘바라기가 둘 다 A라면, 두 사람 대신 재회 엔딩을 읽습니다.'] }
  ];
  var TOTAL = PHASES.reduce(function (n, p) { return n + p.min * 60; }, 0);
  var NOTICE_MS = 14000;

  // ── 상태 (새로고침해도 이어진다) ─────────────────────────
  var KEY = 'hw4-stage';
  var S = { i: 0, t0: 0, pausedAt: null, started: false, done: false, cue: -1, vol: .7, muted: false, mix: { rain: 1, thunder: 1, drone: 1, bell: 1 } };
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
  function applySound(p, quick) {
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
  var noticeT;
  function notice(k, t, s, ms) {
    var n = $('notice');
    n.querySelector('.n-k').textContent = k || ''; n.querySelector('.n-t').textContent = t || ''; n.querySelector('.n-s').textContent = s || '';
    n.hidden = false; clearTimeout(noticeT);
    if (ms !== 0) noticeT = setTimeout(function () { n.hidden = true; }, ms || NOTICE_MS);
  }
  function hideNotice() { $('notice').hidden = true; clearTimeout(noticeT); }

  var cardsArmed = false;
  function countdown() {
    hideNotice(); cardsArmed = false;
    var c = $('count'), steps = ['하나', '둘', '셋'], k = 0;
    c.className = ''; c.hidden = false;
    (function step() {
      if (k < steps.length) { c.textContent = steps[k]; bell(k < 2 ? 520 : 780, k < 2 ? .3 : .45); k++; setTimeout(step, 1300); return; }
      c.className = 'small';
      c.textContent = '카드를 움직이세요.\nA는 가운데로, B는 자기 쪽으로.\n\n다 움직였으면\n오십분 → 하늘바라기 → 기초부터 → 늦은소식\n순서로 대사를 말합니다.';
      setTimeout(function () { c.hidden = true; }, 25000);
    })();
  }

  function enter(i, quiet) {
    S.i = i; S.t0 = now(); S.pausedAt = null; S.cue = -1; S.done = false; S.extra = 0; save();
    var p = phase();
    applySound(p);
    if (!quiet) { bell(p.notice[0].indexOf('STOP') === 0 ? 587 : 660); notice(p.notice[0], p.notice[1], p.notice[2]); }
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
    // 4막 안의 구간 안내
    var sub = p.sub || '';
    if (p.cues) {
      var m = elapsed() / 60, ci = -1;
      p.cues.forEach(function (c, k) { if (m >= c[0]) ci = k; });
      if (ci >= 0) {
        var cue = p.cues[ci]; sub = cue[1];
        if (ci !== S.cue) {
          var first = S.cue === -1;
          S.cue = ci; save();
          if (!first && !S.pausedAt) {
            bell(cue[2] ? 587 : 700, cue[2] ? .35 : .2);
            if (cue[2]) notice('4막', cue[2], cue[3], cue[4] ? 0 : NOTICE_MS);
          }
          cardsArmed = cue[4] === 'cards';
        }
      }
      if (A) A.pulse = !S.pausedAt && ci === 4;
    } else if (A) A.pulse = false;
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
      g.strokeStyle = '#7a3b26'; g.lineWidth = 3.2; g.beginPath(); g.moveTo(b.x, b.y - 14); g.lineTo(tp.x, tp.y + 5); g.stroke();
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
  function openPanel() { $('panel').hidden = false; renderList(); syncMix(); document.querySelector('[data-c=pause]').textContent = S.pausedAt ? '다시 시작' : '일시정지'; document.querySelector('[data-c=mute]').textContent = S.muted ? '소리 켜기' : '소리 끄기'; }
  function closePanel() { $('panel').hidden = true; }
  $('panel').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var c = b.dataset.c;
    if (c === 'pause') togglePause();
    else if (c === '+60') shift(60);
    else if (c === '-60') shift(-60);
    else if (c === 'next') { if (S.i < PHASES.length - 1) enter(S.i + 1); else finish(); closePanel(); }
    else if (c === 'prev') { enter(Math.max(0, S.i - 1)); closePanel(); }
    else if (c === 'cards') { closePanel(); countdown(); }
    else if (c === 'try-thunder') { audio(); thunder(true); }
    else if (c === 'try-bell') { audio(); bell(660); }
    else if (c === 'only-bell' || c === 'all-on') { var on = c === 'all-on' ? 1 : 0; S.mix = { rain: on, thunder: on, drone: on, bell: 1 }; save(); syncMix(); applySound(phase(), true); }
    else if (c === 'mute') { S.muted = !S.muted; save(); setVolume(); b.textContent = S.muted ? '소리 켜기' : '소리 끄기'; }
    else if (c === 'full') { var d = document.documentElement; (d.requestFullscreen || d.webkitRequestFullscreen || function () { }).call(d); }
    else if (c === 'reset') { if (confirm('타이머를 처음으로 되돌릴까요?')) { try { localStorage.removeItem(KEY); } catch (x) { } location.reload(); } }
    else if (c === 'close') closePanel();
  });
  // 소리 층마다 크기 조절 (0이면 그 소리를 끈다)
  function syncMix() { document.querySelectorAll('[data-m]').forEach(function (el) { el.value = el.dataset.m === 'vol' ? S.vol : S.mix[el.dataset.m]; }); }
  document.querySelector('.mix').addEventListener('input', function (e) {
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

  // 길게 누르면 메뉴, 두 번 누르면(선택 시간) 하나 둘 셋
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
    if (cardsArmed && t - lastTap < 400) { countdown(); lastTap = 0; return; }
    lastTap = t;
    if (!$('notice').hidden && !S.done && !cardsArmed) hideNotice();
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
    else { applySound(phase(), true); save(); renderList(); if (S.done) notice('', '향이 다 탔습니다', '경찰이 도착합니다.', 0); }
    syncMix();
  }
  load();
  if (S.started && !S.done) $('resume').hidden = false;
  S.started = false;
  $('go').addEventListener('click', function () { if (!$('resume').hidden && !confirm('처음부터 다시 시작할까요? (이어서 하려면 ‘이어서 진행’)')) return; begin(true); });
  // 새로고침·탭 닫힘 뒤에도 실제 시각 기준으로 이어서 간다
  $('go-quiet').addEventListener('click', function () { if (!$('resume').hidden && !confirm('처음부터 다시 시작할까요?')) return; S.mix = { rain: 0, thunder: 0, drone: 0, bell: 1 }; begin(true); });
  $('resume').addEventListener('click', function () { begin(false); });

  resize(); sprite = makeSprite();
  window.addEventListener('resize', resize);
  requestAnimationFrame(frame);
  setInterval(tick, 250);
  setInterval(soundTick, 250);
  tick();
})();
