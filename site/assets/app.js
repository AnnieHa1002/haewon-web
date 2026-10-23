/* 꺼지지 않는 이름 · 4막 사이트 — 해시 라우팅 SPA. 서버·네트워크 없이 file://에서도 돈다. */
(function () {
  'use strict';

  // ── 설정 ────────────────────────────────────────────────
  // 제비 폰 케이스 안쪽 사진(패턴 단서)을 화면에도 보여 줄지. 실물 단서로 확정되면 false로.
  var SHOW_CASE_HINT = true;
  // 잘못 입력 몇 번이면 잠깐 막을지
  var LOCK_TRIES = 5, LOCK_SECONDS = 30;
  var PAGE = 15;

  // ── 데이터 ──────────────────────────────────────────────
  var D = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(window.HW_DATA), function (c) { return c.charCodeAt(0); })));
  var POST = {}, SITE = {};
  D.posts.forEach(function (p) { POST[p.id] = p; });
  D.sites.forEach(function (s) { SITE[s.id] = s; });
  var NOW = D.now;
  // 글ID → 사진 파일 (assets/photos.js). 없으면 사진 설명 글로 대신한다
  var PHOTO = window.HW_PHOTOS || {};
  // 프로필 사진 (제작 에셋). 없는 계정은 글자로만 보인다
  var AVATAR = {
    room702: 'img/avatar/room702.png', kicho_gongsa: 'img/avatar/kicho_gongsa.png', late_letter: 'img/avatar/late_letter.png',
    nare_nowhere: 'img/avatar/nare_nowhere.png', nare_teacher: 'img/avatar/nare_nowhere.png',
    wiro_cha: 'img/avatar/wiro.png', wiro_c: 'img/avatar/wiro.png',
    dadokim_sms: 'img/brand/dadokim_color.png', geumbangul_sms: 'img/brand/geumbangul_color.png',
    baram_dad: 'img/avatar/baram_dad.jpg', haneul_mideum: 'img/avatar/haneul_mideum.jpg', eunhye_song: 'img/avatar/eunhye_song.jpg',
    // 엑스트라 중 특색 있는 몇 명 (Unsplash)
    letter_star: 'img/avatar/letter_star.jpg',
    rain_sound: 'img/avatar/rain_sound.jpg',
    nyang_jipsa: 'img/avatar/nyang_jipsa.jpg',
    photo_kang: 'img/avatar/photo_kang.jpg',
    haebaragi_kim: 'img/avatar/haebaragi_kim.jpg',
    go3: 'img/avatar/go3.jpg',
    lotus: 'img/avatar/lotus.jpg',
    saebyeok_admin: 'img/avatar/saebyeok_admin.jpg',
    forget_now: 'img/avatar/forget_now.jpg',
    yoonha_mom: 'img/avatar/yoonha_mom.jpg',
    alone_rice: 'img/avatar/alone_rice.jpg',
    dream_daughter: 'img/avatar/dream_daughter.jpg',
    widow_kim: 'img/avatar/widow_kim.jpg',
    jimin_mint: 'img/avatar/jimin_mint.jpg'
  };
  // 프로필 사진이 없는 계정은 기본 프로필(사람 실루엣). 바탕색만 계정마다 다르다
  var AV_BLANK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9.2" r="4.3"/><path d="M3.6 23c.9-5 4.5-7.6 8.4-7.6s7.5 2.6 8.4 7.6z"/></svg>';
  function av(id) {
    if (AVATAR[id]) return '<img class="av" src="' + AVATAR[id] + '" alt="">';
    var h = +hash(String(id));
    return '<span class="av av-blank" style="background:hsl(' + (h % 360) + ' ' + (h % 3 ? 14 : 22) + '% ' + (78 + h % 9) + '%)">' + AV_BLANK + '</span>';
  }

  // ── 상태 (로그인·잠금 해제). 저장소가 막혀도 메모리로 돈다 ────
  var KEY = 'hw4-state';
  var mem = null;
  function load() {
    if (mem) return mem;
    try { mem = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { mem = {}; }
    mem.sess = mem.sess || {}; mem.open = mem.open || {}; mem.fail = mem.fail || {}; mem.like = mem.like || {};
    return mem;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* 메모리만 */ } }
  var st = load();
  function sess(site) { return st.sess[site] || null; }
  function isOpen(dev) { return !!st.open[dev]; }

  // ── 유틸 ────────────────────────────────────────────────
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function hash(str, seed) {
    var h1 = 0xdeadbeef ^ (seed || 0), h2 = 0x41c6ce57 ^ (seed || 0);
    for (var i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507); h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507); h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return String(4294967296 * (2097151 & h2) + (h1 >>> 0));
  }
  function check(key, value) { return hash(D.auth.salt + ':' + key + ':' + String(value).trim().toLowerCase()); }
  function nick(id) { var u = D.users[id]; return u ? u.n : id; }
  function num(n) { return Number(n || 0).toLocaleString('ko-KR'); }
  function ymd(d, sep) { sep = sep || '.'; return d.slice(0, 10).split('-').join(sep); }
  function short(d) { return d.slice(2, 10).split('-').join('.'); }
  function hm(d) { return d.slice(11, 16); }
  function when(d) { return ymd(d) + ' ' + hm(d); }
  function kdate(d) {
    var dt = new Date(d.slice(0, 10) + 'T00:00:00');
    return dt.getFullYear() + '년 ' + (dt.getMonth() + 1) + '월 ' + dt.getDate() + '일 ' + '일월화수목금토'[dt.getDay()] + '요일';
  }
  function ampm(d) { var h = +d.slice(11, 13), m = d.slice(14, 16); return (h < 12 ? '오전 ' : '오후 ') + ((h % 12) || 12) + ':' + m; }
  function href() { return '#/' + Array.prototype.map.call(arguments, encodeURIComponent).join('/'); }
  function qs(o) { var a = []; for (var k in o) if (o[k] !== '' && o[k] != null) a.push(k + '=' + encodeURIComponent(o[k])); return a.length ? '?' + a.join('&') : ''; }
  function excerpt(x, n) { x = x.replace(/\[(사진|캡처)[^\]]*\]/g, '').replace(/\s+/g, ' ').trim(); return x.length > n ? x.slice(0, n) + '…' : x; }
  function tint(id, s, l) { return 'hsl(' + (+hash(id) % 360) + ' ' + (s || 28) + '% ' + (l || 78) + '%)'; }

  var toastT;
  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 2200);
  }

  // 본문: 빈 줄로 문단, [사진: …]·[캡처: …] 줄은 사진 자리로, ----- 줄은 구분선으로
  function rich(x, id) {
    var used = false;
    var out = [], para = [];
    function flush() { if (para.length) { out.push('<p>' + para.join('<br>') + '</p>'); para = []; } }
    x.split('\n').forEach(function (line) {
      var t = line.trim(), m = t.match(/^\[(사진|캡처)\s*[:：]?\s*([\s\S]*?)\]$/);
      if (!t) { flush(); return; }
      if (m) {
        flush();
        if (id && PHOTO[id] && !used) { used = true; out.push('<figure class="ph-img"><img src="' + esc(PHOTO[id]) + '" alt="' + esc(m[2]) + '" loading="lazy"></figure>'); }
        else out.push('<figure class="ph"><span class="ph-k">' + m[1] + '</span>' + esc(m[2]) + '</figure>');
        return;
      }
      if (/^[-―─]{3,}.*[-―─]{3,}$/.test(t)) { flush(); out.push('<div class="rule">' + esc(t.replace(/[-―─]/g, '').trim()) + '</div>'); return; }
      para.push(esc(line));
    });
    flush();
    // [사진] 줄이 없는 글에 붙인 사진은 본문 맨 위에 둔다
    if (id && PHOTO[id] && !used) out.unshift('<figure class="ph-img"><img src="' + esc(PHOTO[id]) + '" alt="" loading="lazy"></figure>');
    return out.join('');
  }

  // ── 공개 조건 ───────────────────────────────────────────
  function acctSite(a) { var x = D.auth.accounts[a]; return x ? x.s : (D.users[a] ? D.users[a].s : null); }
  function asOwner(a) { return sess(acctSite(a)) === a; }
  // 원문 표시 구분선 앞까지가 공개 부분
  function splitOrig(x) {
    var lines = x.split('\n'), i = lines.findIndex(function (l) { return /원문/.test(l) && /로그인/.test(l); });
    return i < 0 ? { pub: x, all: x } : { pub: lines.slice(0, i).join('\n').trim(), all: x };
  }
  var DRAFT_RE = /^\((임시저장|보관함|비공개)\)/;
  // 게시글 상태: show(그대로) · draft(목록에서 숨김) · secret(자물쇠 흔적) · blind · del
  function postState(p) {
    var c = p.c;
    switch (c.t) {
      case 'pub': return { k: 'show', body: p.x };
      case 'dev': return isOpen(c.d) ? { k: 'show', body: p.x } : { k: 'draft' };
      case 'acct':
        if (asOwner(c.a)) return { k: 'show', body: p.x, mine: true, label: DRAFT_RE.test(p.t) ? '' : '비밀글' };
        return DRAFT_RE.test(p.t) ? { k: 'draft' } : { k: 'secret' };
      case 'delorig': {
        var sp = splitOrig(p.x);
        return asOwner(c.a) ? { k: 'show', body: sp.all, mine: true, label: '임시조치' } : { k: 'show', body: sp.pub, dim: true };
      }
      case 'blindorig':
        return asOwner(c.a) ? { k: 'show', body: p.x, mine: true, label: '블라인드' } : { k: 'blind' };
      case 'blind': return { k: 'blind' };
      case 'del': return { k: 'del' };
    }
    return { k: 'show', body: p.x };
  }
  var BLIND_MSG = '신고 누적으로 블라인드 처리된 게시물입니다.';
  var SECRET_MSG = '비밀글입니다.';
  function titleOf(p, s) {
    if (s.k === 'blind') return BLIND_MSG;
    if (s.k === 'secret') return SECRET_MSG;
    if (s.k === 'del') return p.t || '삭제된 게시물입니다.';
    return p.t;
  }

  function sitePosts(site, board) {
    return D.posts.filter(function (p) { return p.s === site && (!board || p.b === board); })
      .map(function (p) { return { p: p, s: postState(p) }; })
      .filter(function (o) { return o.s.k !== 'draft'; })
      .sort(function (a, b) { return a.p.d < b.p.d ? 1 : a.p.d > b.p.d ? -1 : 0; });
  }
  function commentsOf(p) { return D.comments[p.id] || []; }
  function commentCount(p, s) { return (s.k === 'secret') ? 0 : commentsOf(p).length; }

  // ── 광고 ────────────────────────────────────────────────
  var AD_POS = {
    '상단 배너': 'top', '상단': 'top', '메인 배너': 'top', '상단 고정': 'top', '사내 배너': 'top',
    '글 사이': 'mid', '기사 사이': 'mid', '피드 사이 (스폰서)': 'mid', '피드 사이': 'mid',
    '하단': 'bottom', '로그인 화면': 'login'
  };
  // 노출 기간이 끝난 뒤의 처리: cache = 캐시된 배너가 가끔, halt = '광고 송출 중단' 빈 칸
  var AD_AFTER = { 'AD-01': 'cache', 'AD-17': 'cache', 'AD-08': 'halt' };
  function adPhase(ad, d) {
    var per = ad.per, ym = d.slice(0, 7);
    if (per === '상시') return 'on';
    var mm = per.match(/^매년\s*(\d+)월/);
    if (mm) return (+d.slice(5, 7) === +mm[1]) ? 'on' : 'off';
    var ab = per.split('~').map(function (s) { return s.trim(); }), a = ab[0], b = ab[1] || ab[0];
    var lo = a.length === 4 ? a + '-01' : a, hi = b.length === 4 ? b + '-12' : b;
    return ym < lo ? 'before' : ym > hi ? 'after' : 'on';
  }
  function adLink(ad) {
    var m = ad.link.match(/^(S\d+)(?:\s+(.+))?$/);
    if (!m || /아님/.test(ad.link)) return '';
    var site = m[1], b = m[2];
    if (!b) return href(site);
    var board = (D.boards[site] || []).find(function (x) { return x.name === b || x.name.indexOf(b) === 0; });
    return board ? href(site, 'b', board.name) : href(site);
  }
  function adHTML(ad, cls, halted) {
    if (halted) return '<div class="ad ad-halt ' + (cls || '') + '"><span>광고 송출 중단</span></div>';
    var link = adLink(ad);
    return '<a class="ad ' + (cls || '') + '" ' + (link ? 'href="' + link + '"' : 'data-ext="1"') + '>' +
      '<span class="ad-badge">' + (ad.s === 'S10' ? '공익' : ad.pos.indexOf('스폰서') >= 0 ? 'Sponsored' : 'AD') + '</span>' +
      '<b class="ad-who">' + esc(ad.who) + '</b><span class="ad-x">' + esc(ad.x) + '</span></a>';
  }
  // pos: top|mid|bottom|login, d: 그 화면의 시점
  function adsFor(site, pos, d, seed) {
    var out = [];
    D.ads.forEach(function (ad) {
      if (ad.s !== site || AD_POS[ad.pos] !== pos) return;
      var ph = adPhase(ad, d);
      if (ph === 'on') out.push({ ad: ad });
      else if (ph === 'after' && AD_AFTER[ad.id] === 'halt') out.push({ ad: ad, halted: true });
      else if (ph === 'after' && AD_AFTER[ad.id] === 'cache' && (+hash(seed + ad.id) % 2 === 0)) out.push({ ad: ad, cached: true });
    });
    return out;
  }
  function adSlot(site, pos, d, seed, cls) {
    return adsFor(site, pos, d, seed || location.hash).map(function (o) { return adHTML(o.ad, (cls || '') + ' ad-' + pos + (o.cached ? ' ad-cached' : ''), o.halted); }).join('');
  }
  // 목록 사이사이에 끼울 광고
  function withMidAds(site, items, every, seed) {
    var mids = adsFor(site, 'mid', NOW, seed || location.hash);
    if (!mids.length) return items.join('');
    var out = [], k = 0;
    items.forEach(function (it, i) {
      out.push(it);
      if ((i + 1) % every === 0 && i < items.length - 1) { var o = mids[k++ % mids.length]; out.push('<li class="ad-row">' + adHTML(o.ad, 'ad-mid' + (o.cached ? ' ad-cached' : ''), o.halted) + '</li>'); }
    });
    return out.join('');
  }

  // ── 공통 조각 ───────────────────────────────────────────
  function pager(total, page, base, q) {
    var n = Math.ceil(total / PAGE);
    if (n <= 1) return '';
    var h = '<nav class="pager">';
    for (var i = 1; i <= n; i++) {
      var o = {}; for (var k in q) o[k] = q[k]; o.p = i > 1 ? i : '';
      h += i === page ? '<b>' + i + '</b>' : '<a href="' + base + qs(o) + '">' + i + '</a>';
    }
    return h + '</nav>';
  }
  function slice(list, page) { return list.slice((page - 1) * PAGE, page * PAGE); }
  function commentsHTML(p, opt) {
    opt = opt || {};
    var list = commentsOf(p);
    if (!list.length) return opt.empty ? '<div class="cm-empty">' + opt.empty + '</div>' : '';
    var byId = {}, roots = [], kids = {};
    list.forEach(function (c) { byId[c.id] = c; });
    list.forEach(function (c) {
      var r = c.r && byId[c.r] ? c.r : null;
      while (r && byId[r].r && byId[byId[r].r]) r = byId[r].r;
      if (r) (kids[r] = kids[r] || []).push(c); else roots.push(c);
    });
    function one(c, reply) {
      var who = opt.anon ? nick(c.a) : av(c.a) + '<a href="' + href(p.s, 'u', c.a) + '">' + esc(nick(c.a)) + '</a>';
      if (c.a === p.a && opt.op) who += ' <span class="op">' + opt.op + '</span>';
      return '<li class="cm' + (reply ? ' re' : '') + '"><div class="cm-h">' + (reply ? '<span class="re-mark">ㄴ</span>' : '') + '<span class="cm-who">' + who + '</span><span class="cm-d">' + (opt.date ? opt.date(c.d) : when(c.d)) + '</span></div><div class="cm-x">' + esc(c.x).replace(/\n/g, '<br>') + '</div></li>';
    }
    var h = '<div class="cms"><div class="cms-h">' + (opt.label || '댓글') + ' <b>' + list.length + '</b></div><ul>';
    roots.forEach(function (c) { h += one(c); (kids[c.id] || []).forEach(function (k) { h += one(k, true); }); });
    return h + '</ul></div>';
  }
  function lockBox(site, msg, extra) {
    return '<div class="lockbox"><div class="lk-i">🔒</div><div class="lk-m">' + msg + '</div>' +
      (site ? '<a class="btn" href="' + href(site, 'login') + qs({ next: location.hash.slice(1) }) + '">로그인</a>' : '') + (extra || '') + '</div>';
  }
  function searchForm(site, q, ph) {
    return '<form class="search" data-site="' + site + '"><input name="q" type="search" value="' + esc(q || '') + '" placeholder="' + (ph || '검색어') + '" enterkeyhint="search"><button>검색</button></form>';
  }
  // 검색: 낱말 단위로 찾는다. 제목·본문·닉네임에 게시판 이름과 날짜(2023-07-18 / 2023.7.18 / 2023년 7월 18일)도 넣는다.
  // 모든 낱말이 든 글만 보여 주고, 그런 글이 없으면 낱말이 하나라도 든 글을 많이 든 순서로 보여 준다
  function searchText(o) {
    var p = o.p, d = p.d.slice(0, 10), y = d.slice(0, 4), m = +d.slice(5, 7), dd = +d.slice(8, 10);
    var meta = [p.b, nick(p.a), p.a, d, ymd(d), y + '.' + m + '.' + dd, y + '년 ' + m + '월 ' + dd + '일', y + '년', m + '월 ' + dd + '일'].join('\n');
    var body = o.s.k === 'show' ? p.t + '\n' + o.s.body : titleOf(p, o.s);
    return (body + '\n' + meta).toLowerCase();
  }
  function searchHits(site, q) {
    var words = q.toLowerCase().replace(/[‘’“”"',·]/g, ' ').split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    var hits = [];
    sitePosts(site).forEach(function (o, i) {
      if (o.s.k === 'secret') return;
      var text = searchText(o), flat = text.replace(/\s+/g, ''), n = 0;
      words.forEach(function (w) { if (text.indexOf(w) >= 0 || flat.indexOf(w) >= 0) n++; });
      if (!n && flat.indexOf(words.join('')) >= 0) n = words.length; // '고객의소리'처럼 붙여 쓴 경우
      if (n) hits.push({ o: o, n: n, i: i });
    });
    var all = hits.filter(function (h) { return h.n === words.length; });
    return (all.length ? all : hits.sort(function (a, b) { return b.n - a.n || a.i - b.i; })).map(function (h) { return h.o; });
  }

  // 로그인 폼 (사이트 공통)
  function loginForm(site, opt) {
    opt = opt || {};
    var me = sess(site), cur = '';
    if (me) {
      cur = '<div class="login-box"><p><b>' + esc(nick(me)) + '</b> (' + esc(me) + ') 님으로 로그인되어 있습니다.</p>' +
        '<a class="btn" href="' + href(site, 'me') + '">' + (opt.mine || '내 글') + '</a> <button class="btn ghost" data-act="logout" data-site="' + site + '">로그아웃</button></div>';
      opt.head = '<h2>다른 계정으로 로그인</h2>';
    }
    return cur + '<form class="login-box" data-login="' + site + '" data-next="' + esc(opt.next || '') + '">' +
      (opt.head || '<h2>로그인</h2>') +
      '<label>' + (opt.idLabel || '아이디') + '<input name="id" autocomplete="off" autocapitalize="off" spellcheck="false"></label>' +
      '<label>' + (opt.pwLabel || '비밀번호') + '<input name="pw" type="password" autocomplete="off"></label>' +
      '<button class="btn">로그인</button><p class="login-err" hidden></p>' + (opt.foot || '') + '</form>';
  }
  function tryLogin(site, id, pw) {
    id = id.trim();
    var acct = D.auth.accounts[id] || D.auth.accounts[Object.keys(D.auth.accounts).find(function (k) { return k.toLowerCase() === id.toLowerCase(); })];
    if (acct) id = Object.keys(D.auth.accounts).find(function (k) { return D.auth.accounts[k] === acct; });
    if (!acct || acct.s !== site || [].concat(acct.h).indexOf(check(id, pw)) < 0) return false;
    st.sess[site] = id; save();
    return true;
  }

  // 쪽지·DM: 로그인한 계정이 보내거나 받은 것
  function threads(site, me) {
    var by = {};
    D.messages.forEach(function (m) {
      if (m.s !== site || (m.f !== me && m.to !== me)) return;
      var other = m.f === me ? m.to : m.f;
      (by[other] = by[other] || []).push(m);
    });
    return Object.keys(by).map(function (k) { return { who: k, list: by[k], last: by[k][by[k].length - 1] }; })
      .sort(function (a, b) { return a.last.d < b.last.d ? 1 : -1; });
  }

  // ── 허브 ────────────────────────────────────────────────
  var APPS = [
    { r: 'S1', label: '남은자리', ic: '🕯', bg: '#56635a', img: 'img/brand/namunjari_color.png' },
    { r: 'S5', label: '해원일보', ic: '報', bg: '#163a6b' },
    { r: 'S9', label: '사원증', ic: '▣', bg: '#e8344e' },
    { r: 'S8', label: '천명그룹', ic: '天', bg: '#0b4fa8', img: 'img/brand/cheonmyeong_mark.png' },
    { r: 'S4', label: '한컷', ic: '◎', bg: 'linear-gradient(135deg,#f7b267,#e05780 60%,#7b5ce0)', img: 'img/brand/hancut_mark.png' },
    { r: 'S6', label: '금방울당', ic: '🔔', bg: '#a50f0f', img: 'img/brand/geumbangul_color.png', dark: true },
    { r: 'S10', label: '새벽의 방', ic: '☾', bg: '#1d2230', img: 'img/brand/saebyeok_white.png', dark: true },
    { r: 'S11', label: '하루글', ic: '✎', bg: '#8a9a6e', img: 'img/brand/harugl_color.png' },
    { r: 'S7', label: '도원 사내망', ic: 'DW', bg: '#2b4c7e', img: 'img/brand/dowon_color.png', lock: function () { return !sess('S7'); } }
  ];
  // 송은혜의 휴대폰(#/S2)과 이다음의 휴대폰(#/S3)은 허브에 두지 않는다. 카드의 QR로만 들어간다.
  function hub() {
    document.title = '홈';
    var h = '<div class="hub"><div class="hub-clock"><b>' + hm(NOW) + '</b><span>' + kdate(NOW) + '</span></div><div class="hub-grid">';
    APPS.forEach(function (a) {
      h += '<a class="app" href="#/' + a.r + '"><span class="app-ic' + (a.img ? ' logo' + (a.dark ? ' dark' : '') : '') + '" style="background:' + (a.img ? (a.dark ? a.bg : '#fff') : a.bg) + '">' + (a.img ? '<img src="' + a.img + '" alt="">' : a.ic) +
        (a.lock && a.lock() ? '<i class="app-lock">🔒</i>' : '') + '</span><span class="app-l">' + a.label + '</span></a>';
    });
    h += '</div><button class="hub-reset" data-act="reset">기록 지우기</button></div>';
    return { html: h, skin: 'hub' };
  }

  // ── S1 남은자리 ─────────────────────────────────────────
  var S1_TAG = { '공지': '공지', '자유게시판': '자유', '천명타워 유족방': '천명타워', '잊어도 될까요': '토론', '산재·사고 유족방': '산재' };
  function s1Shell(active, body, title) {
    var me = sess('S1');
    var h = '<header class="s1-h"><a class="s1-logo" href="#/S1"><img src="img/brand/namunjari_white.png" alt="남은자리"></a><span class="s1-tag">떠난 사람의 자리를 지키는 사람들</span>' +
      '<a class="s1-acct" href="' + href('S1', me ? 'me' : 'login') + '">' + (me ? esc(nick(me)) + ' 님' : '로그인') + '</a></header>' +
      adSlot('S1', 'top', NOW, active) +
      '<nav class="tabs s1-tabs"><a href="#/S1"' + (active === '' ? ' class="on"' : '') + '>전체글</a>';
    D.boards.S1.forEach(function (b) { h += '<a href="' + href('S1', 'b', b.name) + '"' + (active === b.name ? ' class="on"' : '') + '>' + esc(b.name) + '</a>'; });
    h += '<a href="' + href('S1', 'msg') + '"' + (active === 'msg' ? ' class="on"' : '') + '>쪽지함</a></nav>';
    return { html: h + '<main class="s1-main">' + body + '</main>' + adSlot('S1', 'bottom', NOW) + '<footer class="s1-f">남은자리 · 운영 남은자리지기 · 회원 ' + num(3184) + '명<br>고인과 유족을 평가하는 글은 경고 없이 삭제됩니다.</footer>', title: title || '남은자리' };
  }
  function s1Row(o, withTag) {
    var p = o.p, s = o.s, t = titleOf(p, s), cc = commentCount(p, s);
    var cls = s.k === 'blind' || s.k === 'del' ? ' dim' : s.k === 'secret' ? ' secret' : '';
    return '<li class="s1-row' + cls + '"><a href="' + href('S1', 'p', p.id) + '">' +
      '<div class="s1-t">' + (withTag ? '<span class="hd">[' + S1_TAG[p.b] + ']</span> ' : '') + (s.k === 'secret' ? '🔒 ' : '') + esc(t) +
      (s.label ? ' <span class="lbl">' + s.label + '</span>' : '') + (cc ? ' <b class="cc">[' + cc + ']</b>' : '') + '</div>' +
      '<div class="s1-m">' + esc(nick(p.a)) + ' · ' + short(p.d) + (s.k === 'show' ? ' · 조회 ' + num(p.v) + ' · 추천 ' + num(p.l) : '') + '</div></a></li>';
  }
  function s1List(board, q) {
    var page = +q.p || 1, all = sitePosts('S1', board);
    var pinned = '';
    if (!board) {
      pinned = '<ul class="s1-pin">' + all.filter(function (o) { return o.p.b === '공지'; }).slice(0, 2).map(function (o) {
        return '<li><a href="' + href('S1', 'p', o.p.id) + '"><span class="pin">공지</span>' + esc(o.p.t) + '</a></li>';
      }).join('') + '</ul>';
      all = all.filter(function (o) { return o.p.b !== '공지'; });
    }
    var desc = board ? (D.boards.S1.find(function (b) { return b.name === board; }) || {}).desc : '';
    var rows = slice(all, page).map(function (o) { return s1Row(o, !board); });
    var body = (desc ? '<p class="bdesc">' + esc(desc) + '</p>' : '') + pinned + '<ul class="s1-list">' + withMidAds('S1', rows, 6, board + page) + '</ul>' +
      pager(all.length, page, board ? href('S1', 'b', board) : '#/S1', {}) + searchForm('S1', '', '제목·내용·닉네임');
    return s1Shell(board || '', body, board || '남은자리');
  }
  function s1Post(p) {
    var s = postState(p);
    if (s.k === 'draft') return s1Shell(p.b, lockBox('S1', '작성자만 볼 수 있는 글입니다.'));
    var head = '<div class="s1-ph"><div class="crumb"><a href="' + href('S1', 'b', p.b) + '">' + esc(p.b) + '</a></div><h1>' + (s.k === 'secret' ? '🔒 ' : '') + esc(titleOf(p, s)) + '</h1>' +
      '<div class="s1-pm">' + av(p.a) + '<a href="' + href('S1', 'u', p.a) + '">' + esc(nick(p.a)) + '</a> · ' + when(p.d) + (s.k === 'show' ? ' · 조회 ' + num(p.v) : '') + '</div></div>';
    var body;
    if (s.k === 'secret') body = lockBox('S1', '비밀글입니다. 작성자만 볼 수 있습니다.');
    else if (s.k === 'blind') body = '<div class="blind">' + BLIND_MSG + '<small>운영 원칙에 따라 게시물이 가려졌습니다.</small></div>';
    else if (s.k === 'del') body = '<div class="blind">삭제된 게시물입니다.</div>';
    else body = '<article class="post-x' + (s.dim ? ' dim' : '') + '">' + rich(s.body, p.id) + '</article>' + (s.k === 'show' ? s1Act(p) : '');
    var mid = adsFor('S1', 'mid', p.d, p.id)[0];
    return s1Shell(p.b, head + body + (mid ? adHTML(mid.ad, 'ad-mid' + (mid.cached ? ' ad-cached' : ''), mid.halted) : '') +
      (s.k === 'secret' ? '' : commentsHTML(p, { op: '글쓴이' })), p.t);
  }

  // 좋아요·공유 줄. 좋아요는 이 기기에만 남는다 (허브 '기록 지우기'로 지워짐)
  function s1Act(p) {
    var on = !!st.like[p.id];
    return '<div class="s1-act"><button class="s1-like' + (on ? ' on' : '') + '" data-act="like" data-id="' + esc(p.id) + '" data-n="' + p.l + '" aria-pressed="' + on + '">' +
      '<i>' + (on ? '♥' : '♡') + '</i>좋아요 <b>' + num(p.l + (on ? 1 : 0)) + '</b></button>' +
      '<button class="s1-share" data-act="share"><i>↗</i>공유</button></div>';
  }
  function shareSheet() {
    if (document.querySelector('.sheet-bg')) return;
    var d = document.createElement('div'); d.className = 'sheet-bg';
    d.innerHTML = '<div class="sheet" role="dialog" aria-label="공유하기"><b>공유하기</b><div class="sheet-row">' +
      '<button data-act="share-copy"><i>🔗</i>링크 복사</button><button data-act="share-app"><i class="sh-doran">💬</i>도란</button>' +
      '<button data-act="share-app"><i class="sh-sms">✉</i>문자</button></div><button class="sheet-x" data-act="share-close">닫기</button></div>';
    document.body.appendChild(d);
  }
  function closeSheet() { var d = document.querySelector('.sheet-bg'); if (d) d.remove(); }

  // ── 사이트별 껍데기 레지스트리 ─────────────────────────
  var SK = {};
  SK.S1 = { list: s1List, post: s1Post, shell: s1Shell };

  // ── S5 해원일보 ─────────────────────────────────────────
  function s5Shell(active, body, d, title) {
    var h = '<header class="s5-h"><div class="s5-date">' + kdate(NOW) + '</div><a class="s5-logo" href="#/S5"><img src="img/brand/haewon_ilbo_' + ((d || NOW) < '2000' ? '1999' : '2023') + '.png" alt="해원일보"></a><div class="s5-sub">解冤日報 · 해원의 내일을 기록합니다</div></header>' +
      '<nav class="tabs s5-tabs"><a href="#/S5"' + (active === '' ? ' class="on"' : '') + '>홈</a>';
    D.boards.S5.forEach(function (b) { h += '<a href="' + href('S5', 'b', b.name) + '"' + (active === b.name ? ' class="on"' : '') + '>' + esc(b.name) + '</a>'; });
    h += '<a href="' + href('S5', 'search') + '"' + (active === 'search' ? ' class="on"' : '') + '>기사 검색</a></nav>';
    h += adSlot('S5', 'top', d || NOW, active);
    return { html: h + '<main class="s5-main">' + body + '</main>' + adSlot('S5', 'bottom', NOW) + '<footer class="s5-f">해원일보 · 해원시 중앙로 12 · 등록번호 해원 가00031<br>© 해원일보. 무단 전재 및 재배포 금지</footer>', title: title || '해원일보' };
  }
  function s5Item(o, big) {
    var p = o.p, s = o.s, t = titleOf(p, s);
    if (s.k !== 'show') return '<li class="s5-it dim"><a href="' + href('S5', 'p', p.id) + '"><h3>' + esc(t) + '</h3><div class="s5-m">' + ymd(p.d) + '</div></a></li>';
    return '<li class="s5-it' + (big ? ' big' : '') + '"><a href="' + href('S5', 'p', p.id) + '"><h3>' + esc(t) + '</h3>' +
      (big ? '<p>' + esc(excerpt(s.body, 90)) + '</p>' : '') + '<div class="s5-m">' + esc(p.b) + ' · ' + ymd(p.d) + (commentCount(p, s) ? ' · 댓글 ' + commentCount(p, s) : '') + '</div></a></li>';
  }
  function s5List(board, q) {
    var page = +q.p || 1, all = sitePosts('S5', board);
    var rows = slice(all, page).map(function (o, i) { return s5Item(o, i === 0 && page === 1); });
    return s5Shell(board || '', (board ? '<h2 class="s5-sec">' + esc(board) + '</h2>' : '<h2 class="s5-sec">최신 기사</h2>') +
      '<ul class="s5-list">' + withMidAds('S5', rows, 5, board + page) + '</ul>' + pager(all.length, page, board ? href('S5', 'b', board) : '#/S5', {}) + searchForm('S5', '', '기사 검색'));
  }
  function s5Search(q) {
    var term = q.q || '', year = q.y || '';
    var years = {};
    D.posts.forEach(function (p) { if (p.s === 'S5') years[p.d.slice(0, 4)] = 1; });
    var hits = term ? searchHits('S5', term) : sitePosts('S5');
    if (year) hits = hits.filter(function (o) { return o.p.d.slice(0, 4) === year; });
    var page = +q.p || 1;
    var chips = '<div class="chips"><a href="' + href('S5', 'search') + qs({ q: term }) + '"' + (!year ? ' class="on"' : '') + '>전체</a>' +
      Object.keys(years).sort().map(function (y) { return '<a href="' + href('S5', 'search') + qs({ q: term, y: y }) + '"' + (year === y ? ' class="on"' : '') + '>' + y + '</a>'; }).join('') + '</div>';
    var body = '<h2 class="s5-sec">기사 아카이브</h2><p class="bdesc">1999년 이후 해원일보 기사를 검색할 수 있습니다.</p>' +
      '<form class="search" data-site="S5" data-route="search"><input name="q" type="search" value="' + esc(term) + '" placeholder="예: 천명타워, 화재, 낙뢰" enterkeyhint="search"><input type="hidden" name="y" value="' + esc(year) + '"><button>검색</button></form>' + chips +
      '<p class="hits">' + (term ? '‘' + esc(term) + '’ ' : '') + '검색 결과 ' + hits.length + '건</p><ul class="s5-list">' + slice(hits, page).map(function (o) { return s5Item(o, true); }).join('') + '</ul>' +
      pager(hits.length, page, href('S5', 'search'), { q: term, y: year });
    return s5Shell('search', body);
  }
  function s5Post(p) {
    var s = postState(p);
    var body;
    if (s.k === 'blind' || s.k === 'del') body = '<div class="blind">' + BLIND_MSG + '<small>독자 기고 게시 원칙에 따라 노출이 중단되었습니다.</small></div>';
    else body = '<article class="post-x s5-x">' + rich(s.body, p.id) + '</article>';
    var mid = adsFor('S5', 'mid', p.d, p.id);
    var h = '<div class="s5-ah"><div class="crumb">' + esc(p.b) + '</div><h1>' + esc(titleOf(p, s)) + '</h1><div class="s5-by">' + esc(nick(p.a)) + ' · 입력 ' + when(p.d) + '</div></div>' + body +
      (mid.length ? adHTML(mid[+hash(p.id) % mid.length].ad, 'ad-mid') : '') +
      commentsHTML(p, { label: '독자 댓글', empty: '첫 댓글을 남겨 주세요.' });
    return s5Shell(p.b, h, p.d, p.t);
  }
  SK.S5 = { list: s5List, post: s5Post, shell: s5Shell, search: s5Search };

  // ── S9 사원증 ──────────────────────────────────────────
  // 회사 목록. 게시판이 곧 회사 라운지다. '더보기'는 끝없이 불러오기만 한다.
  // 즐겨찾기 = 사건과 관련된 두 회사. 나머지 라운지는 data/extra 의 배경용 회사
  var S9_FAV = ['천명건설', '도원화학'];
  var S9_SIZE = { '천명건설': [1388, '건설'], '도원화학': [1102, '화학'], '샘선전자': [41203, '전자'], '케이에스하이닉스': [18362, '반도체'], '알쥐': [15917, '전자·화학'] };
  function s9Co(board) { return board.replace(/\s*라운지$/, ''); }
  function s9Shell(co, body, title) {
    var h = '<header class="s9-h">' + (co ? '<a class="s9-back" href="#/S9">‹</a>' : '') + '<a class="s9-logo" href="#/S9">사원증</a><a class="s9-s" href="' + href('S9', 'search') + '">⌕</a></header>';
    if (co) h += '<div class="s9-coh"><span class="s9-lg" style="background:' + tint(co, 45, 42) + '">' + esc(co.slice(0, 1)) + '</span><div><b>' + esc(co) + '</b><small>재직자 인증 라운지</small></div></div>';
    return { html: h + adSlot('S9', 'top', NOW) + '<main class="s9-main">' + body + '</main>', title: title || (co ? co + ' 라운지 · 사원증' : '사원증') };
  }
  function s9Home() {
    function row(c) {
      return '<li><a href="' + c.link + '"><span class="s9-lg" style="background:' + tint(c.co, 45, 42) + '">' + esc(c.co.slice(0, 1)) + '</span><div><b>' + esc(c.co) + '</b><small>' + esc(c.kind) + ' · 인증 ' + num(c.n) + '명</small></div><em>' + (c.fav ? '★' : '›') + '</em></a></li>';
    }
    // 글이 있는 두 회사는 즐겨찾기로 맨 위, 나머지는 세 개만 보이고 '더보기'는 끝없이 불러오기만 한다
    function co(b) { var c = s9Co(b.name), m = S9_SIZE[c] || [900, '']; return { co: c, kind: m[1], n: m[0], link: href('S9', 'b', b.name), fav: S9_FAV.indexOf(c) >= 0 }; }
    var favs = D.boards.S9.map(co).filter(function (c) { return c.fav; });
    var others = D.boards.S9.map(co).filter(function (c) { return !c.fav; }).sort(function (a, b) { return b.n - a.n; });
    return s9Shell('', '<p class="bdesc">회사 메일로 인증한 재직자만 글을 쓸 수 있습니다.</p>' +
      '<h2 class="s9-sec">즐겨찾기</h2><ul class="s9-cos">' + favs.map(row).join('') + '</ul>' +
      '<h2 class="s9-sec">인기 회사 라운지</h2><ul class="s9-cos">' + others.map(row).join('') + '</ul>' +
      '<button class="more s9-more" data-act="loadmore">더보기</button>');
  }
  function s9Offline(co) {
    return s9Shell(co || '', '<div class="s9-err"><div class="s9-err-i">⚠</div><b>인터넷에 연결되어 있지 않습니다</b><p>네트워크 연결을 확인한 뒤 다시 시도해 주세요.</p><button class="btn" data-act="retry">다시 시도</button></div>', '연결 오류');
  }
  function s9Card(o) {
    var p = o.p, s = o.s, t = titleOf(p, s), co = nick(p.a).split(' · ');
    if (s.k !== 'show') return '<li class="s9-c dim"><a href="' + href('S9', 'p', p.id) + '"><div class="s9-co">' + esc(co[0]) + '</div><h3>' + esc(t) + '</h3><div class="s9-m"><span>' + short(p.d) + '</span><span>💬 ' + commentCount(p, s) + '</span></div></a></li>';
    return '<li class="s9-c"><a href="' + href('S9', 'p', p.id) + '"><div class="s9-co">' + esc(co[0]) + ' · ' + esc(co[1] || '') + '</div><h3>' + esc(t) + '</h3><p>' + esc(excerpt(s.body, 70)) + '</p>' +
      '<div class="s9-m"><span>' + short(p.d) + '</span><span>👁 ' + num(p.v) + '</span><span>♡ ' + num(p.l) + '</span><span>💬 ' + commentCount(p, s) + '</span></div></a></li>';
  }
  function s9List(board, q) {
    if (!board) return s9Home();
    var n = (+q.n || 20), all = sitePosts('S9', board);
    var rows = all.slice(0, n).map(s9Card);
    return s9Shell(s9Co(board), '<ul class="s9-list">' + withMidAds('S9', rows, 5, board) + '</ul>' +
      (all.length > n ? '<a class="more" href="' + href('S9', 'b', board) + qs({ n: n + 20 }) + '">더보기</a>' : ''));
  }
  function s9Search(q) {
    var hits = searchHits('S9', q.q || '');
    return s9Shell('', searchForm('S9', q.q, '회사 라운지 검색') + (q.q ? '<p class="hits">검색 결과 ' + hits.length + '건</p>' : '') + '<ul class="s9-list">' + hits.map(s9Card).join('') + '</ul>');
  }
  function s9Post(p) {
    var s = postState(p), co = nick(p.a).split(' · ');
    var body = s.k === 'show' ? '<article class="post-x">' + rich(s.body, p.id) + '</article>' :
      '<div class="blind">' + (s.k === 'del' ? '신고 누적으로 가려진 게시물입니다.' : BLIND_MSG) + '<small>커뮤니티 가이드라인에 따라 가려졌습니다.</small></div>';
    var h = '<div class="s9-ph"><div class="crumb"><a href="' + href('S9', 'b', p.b) + '">' + esc(p.b) + '</a></div><h1>' + esc(titleOf(p, s)) + '</h1><div class="s9-co">' + esc(co[0]) + ' · ' + esc(co[1] || '') + ' · ' + when(p.d) + '</div></div>' + body +
      (s.k === 'show' ? '<div class="s9-m big"><span>👁 ' + num(p.v) + '</span><span>♡ ' + num(p.l) + '</span></div>' : '') +
      commentsHTML(p, { anon: true, op: '작성자' });
    return s9Shell(s9Co(p.b), h, p.t);
  }
  SK.S9 = { list: s9List, post: s9Post, shell: s9Shell, search: s9Search, company: s9Offline };

  // ── S10 새벽의 방 ──────────────────────────────────────
  function s10Shell(active, body, title) {
    var me = sess('S10');
    var top = adsFor('S10', 'top', NOW, '')[0];
    var h = '<div class="s10-109">' + (top ? '<b>' + esc(top.ad.x) + '</b>' : '') + '<span>자살예방 상담전화 109 · 정신건강 위기상담 1577-0199 · 청소년 1388</span></div>' +
      '<header class="s10-h"><a class="s10-logo" href="#/S10">새벽의 방</a><a class="s10-acct" href="' + href('S10', me ? 'me' : 'login') + '">' + (me ? esc(nick(me)) : '로그인') + '</a></header><nav class="tabs s10-tabs">';
    D.boards.S10.forEach(function (b) { h += '<a href="' + href('S10', 'b', b.name) + '"' + (active === b.name ? ' class="on"' : '') + '>' + esc(b.name) + '</a>'; });
    h += '<a href="' + href('S10', 'msg') + '"' + (active === 'msg' ? ' class="on"' : '') + '>쪽지</a></nav>';
    return { html: h + '<main class="s10-main">' + body + '</main>' + adSlot('S10', 'bottom', NOW, '', 's10-ad') + '<footer class="s10-f">새벽의 방은 회원 후원으로 돌아가는 개인 운영 게시판입니다.<br>방법·수단·장소를 묻거나 알리는 글, 함께하자는 글은 즉시 삭제합니다.</footer>', title: title || '새벽의 방' };
  }
  function s10Row(o) {
    var p = o.p, s = o.s, cc = commentCount(p, s);
    if (s.k === 'del') return '<li class="s10-r del"><span>운영 원칙에 따라 삭제된 게시물입니다.</span><em>' + short(p.d) + '</em></li>';
    return '<li class="s10-r' + (s.k !== 'show' ? ' dim' : '') + '"><a href="' + href('S10', 'p', p.id) + '"><div class="s10-t">' + (s.k === 'secret' ? '🔒 ' : '') + esc(titleOf(p, s)) + (s.label ? ' <span class="lbl">' + s.label + '</span>' : '') + (cc ? ' <b>' + cc + '</b>' : '') + '</div>' +
      '<div class="s10-m">' + esc(nick(p.a)) + ' · ' + short(p.d) + ' ' + hm(p.d) + '</div></a></li>';
  }
  function s10List(board, q) {
    board = board || '털어놓기';
    var page = +q.p || 1, all = sitePosts('S10', board);
    return s10Shell(board, '<p class="bdesc">' + esc((D.boards.S10.find(function (b) { return b.name === board; }) || {}).desc || '') + '</p><ul class="s10-list">' + slice(all, page).map(s10Row).join('') + '</ul>' + pager(all.length, page, href('S10', 'b', board), {}));
  }
  function s10Post(p) {
    var s = postState(p), body;
    if (s.k === 'secret') body = lockBox('S10', '비밀글입니다. 작성자만 볼 수 있습니다.');
    else if (s.k === 'del') body = '<div class="blind">운영 원칙에 따라 삭제된 게시물입니다.<small>운영자가 작성자에게 쪽지를 보냈습니다.</small></div>';
    else if (s.k === 'blind') body = '<div class="blind">' + BLIND_MSG + '</div>';
    else body = '<article class="post-x">' + rich(s.body, p.id) + '</article>';
    var h = '<div class="s10-ph"><h1>' + esc(titleOf(p, s)) + '</h1><div class="s10-m">' + esc(nick(p.a)) + ' · ' + when(p.d) + '</div></div>' + body + (s.k === 'secret' ? '' : commentsHTML(p, { label: '답장' }));
    return s10Shell(p.b, h, p.t);
  }
  SK.S10 = { list: s10List, post: s10Post, shell: s10Shell };

  // ── S11 하루글 · 늦은 편지 (송은혜의 블로그) ─────────────
  // 허브의 '하루글'은 블로그 주소를 넣는 화면에서 시작한다. 주소(eunhye_song)는 남은자리 댓글에만 나온다.
  var S11_OWNER = 'eunhye_song';
  function s11Shell(active, body, title, landing) {
    var me = sess('S11');
    var h = '<header class="s11-h"><a class="s11-logo" href="#/S11">하루글</a><a class="s11-acct" href="' + href('S11', me ? 'me' : 'login') + '">' + (me ? esc(nick(me)) : '로그인') + '</a></header>';
    if (!landing) {
      h += '<div class="s11-cover"><a href="' + href('S11', 'b', '일상') + '"><b>' + esc(nick(S11_OWNER)) + '</b></a><span>haru.gl/' + S11_OWNER + ' · 그때그때 적어 두는 것들</span></div><nav class="tabs s11-tabs">';
      D.boards.S11.forEach(function (b) { h += '<a href="' + href('S11', 'b', b.name) + '"' + (active === b.name ? ' class="on"' : '') + '>' + esc(b.name) + '</a>'; });
      h += '</nav>';
    }
    return { html: h + '<main class="s11-main">' + body + '</main><footer class="s11-f">하루글 · 하루 한 장씩 남기는 블로그</footer>', title: title || (landing ? '하루글' : nick(S11_OWNER)) };
  }
  function s11Landing() {
    return s11Shell('', '<form class="s11-go" data-s11go="1"><h2>블로그 찾기</h2><p>블로그 주소를 입력하세요.</p><label class="s11-url"><span>haru.gl/</span><input name="u" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="아이디"></label><button class="btn">이동</button><p class="login-err" hidden></p></form>', '하루글', true);
  }
  function s11List(board, q) {
    if (!board) return s11Landing();
    var page = +q.p || 1, all = sitePosts('S11', board);
    var rows = slice(all, page).map(function (o) {
      var p = o.p, s = o.s;
      return '<li class="s11-r' + (s.k !== 'show' ? ' dim' : '') + '"><a href="' + href('S11', 'p', p.id) + '"><div class="s11-t">' + (s.k === 'secret' ? '🔒 ' : '') + esc(titleOf(p, s)) + (s.label ? ' <span class="lbl">' + s.label + '</span>' : '') + '</div><div class="s11-m">' + short(p.d) + '</div></a></li>';
    }).join('');
    return s11Shell(board, '<p class="bdesc">' + esc((D.boards.S11.find(function (b) { return b.name === board; }) || {}).desc || '') + '</p><ul class="s11-list">' + rows + '</ul>' + pager(all.length, page, href('S11', 'b', board), {}));
  }
  function s11Post(p) {
    var s = postState(p), body;
    if (s.k === 'secret') body = lockBox('S11', '비밀글입니다.');
    else body = '<article class="post-x s11-x">' + rich(s.body, p.id) + '</article>';
    var h = '<div class="s11-ph"><h1>' + esc(titleOf(p, s)) + '</h1><div class="s11-m">' + esc(p.b) + ' · ' + when(p.d) + '</div></div>' + body + (s.k === 'secret' ? '' : commentsHTML(p, { label: '댓글' }));
    return s11Shell(p.b, h, p.t);
  }
  SK.S11 = { list: s11List, post: s11Post, shell: s11Shell };

  // ── S6 금방울당 ────────────────────────────────────────
  function s6Shell(active, body, title) {
    var me = sess('S6');
    var h = '<header class="s6-h"><img class="s6-banner" src="img/brand/geumbangul_banner.png" alt=""><a class="s6-logo" href="#/S6"><img src="img/brand/geumbangul_color.png" alt="금방울당"></a><div class="s6-sub">금방울보살 · 신내림 38년 · 해원시 외곽</div>' +
      '<div class="s6-mq"><span>★ 삼재풀이 · 천도재 · 재수굿 · 부적 · 망향 ★ 상담 예약은 회원 메시지함으로 ★ 하늘이 듣고 계십니다 ★ 상담 전화 0OO-OOO-OOOO ★</span></div></header>' +
      adSlot('S6', 'top', NOW, active) + '<nav class="s6-nav">';
    D.boards.S6.forEach(function (b) {
      var r = b.name === '회원 메시지함' ? href('S6', 'msg') : href('S6', 'b', b.name);
      h += '<a href="' + r + '"' + (active === b.name || (active === 'msg' && b.name === '회원 메시지함') ? ' class="on"' : '') + '>' + esc(b.name) + '</a>';
    });
    h += '</nav><div class="s6-acct">' + (me ? '★ <b>' + esc(nick(me)) + '</b> 회원님 어서 오세요 · <a href="' + href('S6', 'me') + '">내 정보</a>' : '<a href="' + href('S6', 'login') + '">회원 로그인</a>') + '</div>';
    return { html: h + '<main class="s6-main">' + body + '</main>' + adSlot('S6', 'bottom', NOW) +
      '<footer class="s6-f">오늘 방문자 <b>' + (128 + (+hash(location.hash) % 40)) + '</b> · 전체 <b>382,114</b><br>COPYRIGHT ⓒ 金방울堂 ALL RIGHTS RESERVED · 본 홈페이지는 1024×768 해상도에 최적화되어 있습니다</footer>', title: title || '금방울당' };
  }
  function s6List(board, q) {
    board = board || '공지·굿 일정';
    var page = +q.p || 1, all = sitePosts('S6', board);
    var rows = slice(all, page).map(function (o, i) {
      var p = o.p, s = o.s;
      if (s.k === 'del') return '<tr class="dim"><td>' + (all.length - (page - 1) * PAGE - i) + '</td><td>' + esc(p.t) + '</td><td>' + short(p.d) + '</td></tr>';
      return '<tr' + (s.k !== 'show' ? ' class="dim"' : '') + '><td>' + (all.length - (page - 1) * PAGE - i) + '</td><td><a href="' + href('S6', 'p', p.id) + '">' + (s.k === 'secret' ? '🔒 ' : '') + esc(titleOf(p, s)) + '</a>' +
        (commentCount(p, s) ? ' <span class="cc">(' + commentCount(p, s) + ')</span>' : '') + (board === '상품' ? '' : '<div class="s6-w">' + esc(nick(p.a)) + '</div>') + '</td><td>' + short(p.d) + '</td></tr>';
    });
    return s6Shell(board, '<h2 class="s6-tt">◈ ' + esc(board) + ' ◈</h2><table class="s6-tb"><thead><tr><th>번호</th><th>제목</th><th>날짜</th></tr></thead><tbody>' + rows.join('') + '</tbody></table>' + pager(all.length, page, href('S6', 'b', board), {}));
  }
  function s6Post(p) {
    var s = postState(p), body;
    if (s.k === 'secret') body = lockBox('S6', '비밀글입니다. 작성자와 선생님만 볼 수 있습니다.');
    else if (s.k === 'del') body = '<div class="blind">관리자에 의해 삭제된 글입니다.</div>';
    else if (s.k === 'blind') body = '<div class="blind">' + BLIND_MSG + '</div>';
    else body = '<article class="post-x s6-x">' + rich(s.body, p.id) + '</article>';
    var h = '<div class="s6-ph"><h1>' + esc(titleOf(p, s)) + '</h1><div>글쓴이 ' + esc(nick(p.a)) + ' | ' + when(p.d) + (s.k === 'show' ? ' | 조회 ' + num(p.v) : '') + '</div></div>' + body + (s.k === 'secret' ? '' : commentsHTML(p, { label: '댓글' }));
    return s6Shell(p.b, h, p.t);
  }
  SK.S6 = { list: s6List, post: s6Post, shell: s6Shell };

  // ── S8 천명그룹 ────────────────────────────────────────
  function s8Shell(active, body, title) {
    var h = '<header class="s8-h"><a class="s8-logo" href="#/S8"><img src="img/brand/cheonmyeong_color.png" alt="천명그룹"></a><span class="s8-en">CHEONMYEONG GROUP</span></header><nav class="tabs s8-tabs">';
    D.boards.S8.forEach(function (b) { h += '<a href="' + href('S8', 'b', b.name) + '"' + (active === b.name ? ' class="on"' : '') + '>' + esc(b.name) + '</a>'; });
    h += '</nav>';
    return { html: h + '<main class="s8-main">' + body + '</main>' + adSlot('S8', 'bottom', NOW, active, 's8-partner') +
      '<footer class="s8-f">천명그룹 · 천명건설㈜ · 천명개발㈜ · 천명타워관리㈜<br>해원시 구도심로 1 천명빌딩 · 대표전화 1588-OOOO<br>© CHEONMYEONG GROUP. All rights reserved.</footer>', title: title || '천명그룹' };
  }
  function s8Home() {
    var top = adsFor('S8', 'top', NOW, 'home');
    var hero = top.length ? '<a class="s8-hero" href="' + adLink(top[0].ad) + '"><small>' + esc(top[0].ad.who) + '</small><b>' + esc(top[0].ad.x.split('·')[0]) + '</b><span>' + esc(top[0].ad.x.split('·')[1] || '') + '</span></a>' :
      '<div class="s8-hero"><small>CHEONMYEONG</small><b>하늘이 맡긴 일을 짓는다</b><span>해원과 함께 38년</span></div>';
    var cards = D.boards.S8.map(function (b) {
      var latest = sitePosts('S8', b.name).slice(0, 3);
      return '<section class="s8-card"><h2><a href="' + href('S8', 'b', b.name) + '">' + esc(b.name) + ' ›</a></h2><ul>' + latest.map(function (o) {
        return '<li><a href="' + href('S8', 'p', o.p.id) + '">' + esc(titleOf(o.p, o.s)) + '</a><em>' + ymd(o.p.d) + '</em></li>';
      }).join('') + '</ul></section>';
    }).join('');
    return s8Shell('', hero + cards);
  }
  function s8List(board, q) {
    if (!board) return s8Home();
    var page = +q.p || 1, all = sitePosts('S8', board);
    var voc = board === '고객의 소리';
    if (board === '회사소개') all = all.slice().sort(function (a, b) { return a.p.d < b.p.d ? -1 : 1; });
    var rows = slice(all, page).map(function (o) {
      var p = o.p, s = o.s, answered = voc && commentsOf(p).some(function (c) { return c.a === 'cs'; });
      return '<li class="s8-r' + (s.k !== 'show' ? ' dim' : '') + '"><a href="' + href('S8', 'p', p.id) + '"><b>' + esc(titleOf(p, s)) + '</b><span>' +
        (voc ? '<i class="st' + (answered ? ' ok' : '') + '">' + (answered ? '답변완료' : '접수') + '</i> ' + esc(nick(p.a)) + ' · ' : '') + ymd(p.d) + '</span></a></li>';
    });
    var intro = { '회사소개': '천명은 한 번 맡은 것은 끝까지 책임집니다.', '보도자료': '천명그룹의 공식 보도자료와 입장문입니다.', '인재채용': '현장을 아는 사람, 천명이 찾습니다.', '고객의 소리': '입주민·임차인·시민 여러분의 소중한 의견을 듣습니다. 고객지원팀이 성실히 답변드립니다.' }[board] || '';
    return s8Shell(board, '<div class="s8-sh"><h1>' + esc(board) + '</h1><p>' + esc(intro) + '</p></div><ul class="s8-list">' + rows.join('') + '</ul>' + pager(all.length, page, href('S8', 'b', board), {}));
  }
  function s8Post(p) {
    var s = postState(p);
    var body = s.k === 'show' ? '<article class="post-x s8-x">' + rich(s.body, p.id) + '</article>' : '<div class="blind">' + BLIND_MSG + '<small>게시판 운영 정책에 따라 노출이 제한되었습니다.</small></div>';
    var h = '<div class="s8-ph"><div class="crumb"><a href="' + href('S8', 'b', p.b) + '">' + esc(p.b) + '</a></div><h1>' + esc(titleOf(p, s)) + '</h1><div>' + (p.b === '고객의 소리' ? esc(nick(p.a)) + ' · ' : '') + ymd(p.d) + '</div></div>' + body +
      commentsHTML(p, { label: p.b === '고객의 소리' ? '답변' : '댓글', anon: true });
    return s8Shell(p.b, h, p.t);
  }
  SK.S8 = { list: s8List, post: s8Post, shell: s8Shell };

  // ── S7 도원화학 사내망 (사번 로그인 게이트) ─────────────
  function s7Shell(active, body, title) {
    var me = sess('S7');
    var h = '<header class="s7-h"><a class="s7-logo" href="#/S7"><img src="img/brand/dowon_white.png" alt="도원화학"><b>e-Office</b></a><span class="s7-me">' + esc(nick(me)) + ' (' + esc(me) + ') · <a href="#" data-act="logout" data-site="S7">로그아웃</a></span></header>' +
      adSlot('S7', 'top', '2022-06-01 00:00', '', 's7-banner') + '<nav class="tabs s7-tabs">';
    D.boards.S7.forEach(function (b) { h += '<a href="' + href('S7', 'b', b.name) + '"' + (active === b.name ? ' class="on"' : '') + '>' + esc(b.name) + '</a>'; });
    h += '<a href="' + href('S7', 'me') + '"' + (active === 'me' ? ' class="on"' : '') + '>내 문서함</a></nav>';
    return { html: h + '<main class="s7-main">' + body + '</main><footer class="s7-f">도원화학㈜ 정보보안팀 · 사내 자료의 외부 반출을 금합니다.</footer>', title: title || '도원화학 e-Office' };
  }
  function s7Gate() {
    var ads = adsFor('S7', 'login', NOW, '').map(function (o) { return '<div class="s7-warn"><b>⚠ ' + esc(o.ad.who) + '</b>' + esc(o.ad.x) + '</div>'; }).join('');
    return { html: '<div class="s7-gate"><div class="s7-gl"><img src="img/brand/dowon_color.png" alt="도원화학"><b>e-Office</b></div><p>도원화학 임직원 전용 시스템입니다.</p>' +
      loginForm('S7', { head: '', idLabel: '사번', pwLabel: '비밀번호', next: location.hash.slice(1) }) + ads + '<small>비밀번호 분실 시 정보보안팀(내선 2214)에 문의하세요.</small></div>', title: '도원화학 e-Office' };
  }
  function s7List(board, q) {
    board = board || '사내 공지';
    var page = +q.p || 1, all = sitePosts('S7', board), i0 = all.length - (page - 1) * PAGE;
    var rows = slice(all, page).map(function (o, i) {
      var p = o.p, s = o.s;
      return '<tr' + (s.k !== 'show' ? ' class="dim"' : '') + '><td>' + (i0 - i) + '</td><td class="t"><a href="' + href('S7', 'p', p.id) + '">' + esc(titleOf(p, s)) + '</a>' + (commentCount(p, s) ? ' <span class="cc">[' + commentCount(p, s) + ']</span>' : '') +
        '<div class="w">' + esc(nick(p.a)) + '</div></td><td>' + short(p.d) + '</td></tr>';
    });
    return s7Shell(board, '<h2 class="s7-tt">' + esc(board) + '</h2><p class="bdesc">' + esc((D.boards.S7.find(function (b) { return b.name === board; }) || {}).desc || '') + '</p>' +
      searchForm('S7', q.q, '제목·내용 검색') + '<table class="s7-tb"><thead><tr><th>No</th><th>제목</th><th>등록일</th></tr></thead><tbody>' + rows.join('') + '</tbody></table>' + pager(all.length, page, href('S7', 'b', board), {}));
  }
  function s7Post(p) {
    var s = postState(p);
    var body = s.k === 'show' ? '<article class="post-x s7-x">' + rich(s.body, p.id) + '</article>' : '<div class="blind">' + BLIND_MSG + '<small>게시판 관리자가 게시물을 비공개 처리했습니다.</small></div>';
    return s7Shell(p.b, '<div class="s7-ph"><div class="crumb">' + esc(p.b) + '</div><h1>' + esc(titleOf(p, s)) + '</h1><table class="s7-meta"><tr><th>작성자</th><td>' + esc(nick(p.a)) + '</td><th>등록일</th><td>' + when(p.d) + '</td></tr></table></div>' + body + commentsHTML(p, { label: '댓글' }), p.t);
  }
  function s7Search(q) {
    var hits = searchHits('S7', q.q || '');
    return s7Shell('', '<h2 class="s7-tt">통합 검색</h2>' + searchForm('S7', q.q, '제목·내용 검색') + '<p class="hits">검색 결과 ' + hits.length + '건</p><table class="s7-tb"><tbody>' + hits.map(function (o) {
      return '<tr><td class="t"><a href="' + href('S7', 'p', o.p.id) + '">' + esc(titleOf(o.p, o.s)) + '</a><div class="w">' + esc(o.p.b) + ' · ' + esc(nick(o.p.a)) + '</div></td><td>' + short(o.p.d) + '</td></tr>';
    }).join('') + '</tbody></table>');
  }
  SK.S7 = { list: s7List, post: s7Post, shell: s7Shell, search: s7Search, gate: function () { return !sess('S7'); } };

  // ── S4 한컷 nare_nowhere ───────────────────────────────
  var S4_OWNER = 'nare_nowhere';
  function s4Shell(body, title, tab) {
    var me = sess('S4');
    var h = '<header class="s4-h"><a class="s4-logo" href="#/S4"><img src="img/brand/hancut_color.png" alt="한컷"></a><a class="s4-dm" href="' + href('S4', 'msg') + '" aria-label="DM">✉' + (me ? '' : '<i>🔒</i>') + '</a></header>';
    return { html: h + '<main class="s4-main">' + body + '</main><nav class="s4-tabbar"><a href="#/S4"' + (tab !== 'msg' ? ' class="on"' : '') + '>⌂</a><a href="' + href('S4', 'msg') + '"' + (tab === 'msg' ? ' class="on"' : '') + '>✉</a><a href="' + href('S4', me ? 'me' : 'login') + '">' + (me ? '●' : '○') + '</a></nav>', title: title || 'nare_nowhere · 한컷' };
  }
  function photoOf(x) { var m = x.match(/\[(?:사진|캡처)\s*[:：]?\s*([^\]]*)\]/); return m ? m[1] : ''; }
  function s4Tile(o, i) {
    var p = o.p, s = o.s;
    var bg = PHOTO[p.id] ? "background:#ddd url('" + esc(PHOTO[p.id]) + "') center/cover" : 'background:linear-gradient(160deg,' + tint(p.id, 35, 80) + ',' + tint(p.id + 'x', 30, 62) + ')';
    // 가려진 글: 사진을 흐리게 깔고 경고 표시만 (원문은 주인 로그인 시)
    if (s.k !== 'show') return '<a class="s4-tile blind-t" href="' + href('S4', 'p', p.id) + '">' + (PHOTO[p.id] ? '<i style="background:url(\'' + esc(PHOTO[p.id]) + '\') center/cover"></i>' : '') + '<span>!</span></a>';
    return '<a class="s4-tile" style="' + bg + '" href="' + href('S4', 'p', p.id) + '"><span>' + esc(excerpt(photoOf(s.body) || p.t, 26)) + '</span></a>';
  }
  function s4List() {
    var all = sitePosts('S4', '피드');
    var u = D.users[S4_OWNER];
    var head = '<section class="s4-prof"><div class="s4-av"><img src="img/avatar/nare_nowhere.png" alt="나래"></div><div class="s4-stats"><div><b>' + all.length + '</b>게시물</div><div><b>214</b>팔로워</div><div><b>187</b>팔로잉</div></div>' +
      '<div class="s4-bio"><b>나래</b> <span>@nare_nowhere</span><br>어디에도 없고 어디에나 있음. 토요일엔 해바라기의 집 🌻<br><small>가입 ' + ymd(u.j) + '</small></div></section>';
    var tiles = all.map(s4Tile);
    var mids = adsFor('S4', 'mid', NOW, 'grid').concat(adsFor('S4', 'mid', '2022-06-01 00:00', 'grid'));
    var seen = {}, adRow = mids.filter(function (o) { if (seen[o.ad.id]) return false; seen[o.ad.id] = 1; return true; })
      .map(function (o) { return adHTML(o.ad, 'ad-mid s4-ad'); }).join('');
    return s4Shell(head + '<div class="s4-grid">' + tiles.slice(0, 9).join('') + '</div>' + adRow + '<div class="s4-grid">' + tiles.slice(9).join('') + '</div>');
  }
  function s4Post(p) {
    var s = postState(p);
    var lines = (s.body || '').split('\n'), ph = '', cap = [];
    lines.forEach(function (l) { var m = l.trim().match(/^\[(사진|캡처)\s*[:：]?\s*([\s\S]*?)\]$/); if (m && !ph) ph = m[2]; else cap.push(l); });
    var photo = s.k === 'show' ? (PHOTO[p.id] ? '<div class="s4-photo img"><img src="' + esc(PHOTO[p.id]) + '" alt="' + esc(ph || '') + '"></div>' : '<div class="s4-photo" style="background:linear-gradient(160deg,' + tint(p.id, 35, 82) + ',' + tint(p.id + 'x', 30, 64) + ')"><span>' + esc(ph || '') + '</span></div>') :
      '<div class="s4-photo blind-p"><span>' + BLIND_MSG + '<br><small>커뮤니티 가이드라인에 따라 가려진 게시물입니다</small></span></div>';
    var h = '<div class="s4-ph"><div class="s4-av sm"><img src="img/avatar/nare_nowhere.png" alt=""></div><b>nare_nowhere</b>' + (s.label ? ' <span class="lbl">' + s.label + '</span>' : '') + '</div>' + photo +
      (s.k === 'show' ? '<div class="s4-act">♡ ' + num(p.l) + '</div><div class="s4-cap"><b>nare_nowhere</b> ' + rich(cap.join('\n').trim()) + '</div>' : '') +
      '<div class="s4-d">' + kdate(p.d) + '</div>';
    var mid = adsFor('S4', 'mid', p.d, p.id)[0];
    return s4Shell(h + commentsHTML(p, { label: '댓글', date: short }) + (mid ? adHTML(mid.ad, 'ad-mid s4-ad') : ''), p.t);
  }
  SK.S4 = { list: s4List, post: s4Post, shell: s4Shell };

  // ── 계정별 페이지: 로그인 · 내 글 · 쪽지 · 작성자 글 ────
  var SHELL_OF = {
    S1: function (b, t) { return s1Shell('msg', b, t); }, S5: function (b, t) { return s5Shell('', b, null, t); },
    S6: function (b, t) { return s6Shell('msg', b, t); }, S7: function (b, t) { return s7Shell('me', b, t); },
    S8: function (b, t) { return s8Shell('', b, t); }, S9: function (b, t) { return s9Shell('', b, t); },
    S10: function (b, t) { return s10Shell('msg', b, t); }, S4: function (b, t) { return s4Shell(b, t, 'msg'); },
    S11: function (b, t) { return s11Shell('', b, t); }
  };
  var MSG_NAME = { S1: '쪽지함', S6: '회원 메시지함', S10: '쪽지', S4: 'DM' };
  function loginPage(site, q) {
    if (site === 'S7') return s7Gate();
    var foot = site === 'S4' ? '<p class="hint">한컷 계정 아이디로 로그인하세요.</p>' : '';
    return SHELL_OF[site](loginForm(site, { next: q.next || '', foot: foot, mine: site === 'S4' ? '내 보관함' : '내 글' }), '로그인');
  }
  function mePage(site) {
    var me = sess(site);
    if (!me) return loginPage(site, {});
    var mine = D.posts.filter(function (p) { return p.s === site && (p.a === me || (p.c.a === me)); })
      .map(function (p) { return { p: p, s: postState(p) }; }).sort(function (a, b) { return a.p.d < b.p.d ? 1 : -1; });
    var msgs = MSG_NAME[site] ? threads(site, me) : [];
    var h = '<div class="me-box"><h2>' + esc(nick(me)) + ' <small>' + esc(me) + '</small></h2><p>가입일 ' + ymd((D.users[me] || {}).j || '0000-00-00') + '</p>' +
      (MSG_NAME[site] ? '<a class="btn" href="' + href(site, 'msg') + '">' + MSG_NAME[site] + ' (' + msgs.reduce(function (n, t) { return n + t.list.length; }, 0) + ')</a> ' : '') +
      '<button class="btn ghost" data-act="logout" data-site="' + site + '">로그아웃</button></div>' +
      '<h3 class="me-h">작성한 글 · 임시저장 ' + mine.length + '</h3><ul class="me-list">' + mine.map(function (o) {
        return '<li><a href="' + href(site, 'p', o.p.id) + '"><b>' + esc(o.p.t || '(제목 없음)') + '</b>' + (o.s.label ? ' <span class="lbl">' + o.s.label + '</span>' : '') + '<span>' + esc(o.p.b) + ' · ' + when(o.p.d) + '</span></a></li>';
      }).join('') + '</ul>';
    return SHELL_OF[site](h, '내 정보');
  }
  function userPage(site, id) {
    var all = sitePosts(site);
    var list = all.filter(function (o) { return o.p.a === id && o.s.k !== 'secret'; });
    // 이 사람이 단 댓글: 어느 글(제목)에 무엇을 썼는지. 비밀글에 단 댓글은 빼고, 최근 것부터
    var cms = [];
    all.forEach(function (o) {
      if (o.s.k === 'secret') return;
      commentsOf(o.p).forEach(function (c) { if (c.a === id) cms.push({ o: o, c: c }); });
    });
    cms.sort(function (a, b) { return a.c.d < b.c.d ? 1 : a.c.d > b.c.d ? -1 : 0; });
    var u = D.users[id] || {};
    var h = '<div class="me-box"><h2>' + av(id) + esc(nick(id)) + '</h2><p>가입일 ' + (u.j ? ymd(u.j) : '-') + ' · 작성글 ' + list.length + ' · 댓글 ' + cms.length + '</p></div>';
    if (list.length) h += '<div class="me-sec">작성글 ' + list.length + '</div><ul class="me-list">' + list.map(function (o) {
      return '<li><a href="' + href(site, 'p', o.p.id) + '"><b>' + esc(titleOf(o.p, o.s) || '(제목 없음)') + '</b><span>' + esc(o.p.b) + ' · ' + when(o.p.d) + '</span></a></li>';
    }).join('') + '</ul>';
    if (cms.length) h += '<div class="me-sec">댓글 ' + cms.length + '</div><ul class="me-list me-cms">' + cms.map(function (x) {
      return '<li><a href="' + href(site, 'p', x.o.p.id) + '"><p>' + esc(excerpt(x.c.x, 80)) + '</p><span>' + esc(titleOf(x.o.p, x.o.s) || '(제목 없음)') + ' · ' + when(x.c.d) + '</span></a></li>';
    }).join('') + '</ul>';
    if (!list.length && !cms.length) h += '<div class="cm-empty">작성한 글이나 댓글이 없습니다.</div>';
    return SHELL_OF[site](h, nick(id));
  }
  function msgPage(site, other) {
    var me = sess(site), name = MSG_NAME[site] || '쪽지';
    if (!me) return SHELL_OF[site]('<h2 class="pg-h">' + name + '</h2>' + lockBox(site, '로그인이 필요합니다.<br><small>' + name + '은 회원 본인만 볼 수 있습니다.</small>'), name);
    var ts = threads(site, me);
    if (!other) {
      var h = '<h2 class="pg-h">' + name + ' <small>' + esc(nick(me)) + '</small></h2>' + (ts.length ? '<ul class="th-list">' + ts.map(function (t) {
        return '<li><a href="' + href(site, 'msg', t.who) + '"><b>' + esc(nick(t.who)) + '</b><span class="th-n">' + t.list.length + '</span><p>' + esc(excerpt(t.last.x, 40)) + '</p><em>' + when(t.last.d) + '</em></a></li>';
      }).join('') + '</ul>' : '<div class="cm-empty">주고받은 ' + name + '이 없습니다.</div>');
      return SHELL_OF[site](h, name);
    }
    var t = ts.find(function (x) { return x.who === other; });
    if (!t) return SHELL_OF[site]('<div class="cm-empty">대화가 없습니다.</div>', name);
    var bubble = site === 'S4';
    var body = '<div class="pg-h"><a href="' + href(site, 'msg') + '">‹ ' + name + '</a> <b>' + esc(nick(other)) + '</b></div>' +
      (bubble ? chatHTML(t.list, me, 's4chat') : '<ul class="note-list">' + t.list.map(function (m) {
        return '<li class="note' + (m.f === me ? ' sent' : '') + '"><div class="note-h"><b>' + (m.f === me ? '보낸 쪽지 → ' + esc(nick(m.to)) : '받은 쪽지 ← ' + esc(nick(m.f))) + '</b><em>' + when(m.d) + '</em></div><div class="note-x">' + esc(m.x).replace(/\n/g, '<br>') + '</div></li>';
      }).join('') + '</ul>');
    return SHELL_OF[site](body, nick(other));
  }

  // ── 휴대폰 공통 ────────────────────────────────────────
  // 메신저 말풍선. me = 이 기기 주인 아이디
  function chatHTML(list, me, cls, names) {
    var h = '<div class="chat ' + (cls || '') + '">', lastDay = '';
    list.forEach(function (m) {
      var day = m.d.slice(0, 10);
      if (day !== lastDay) { h += '<div class="chat-day">' + kdate(m.d) + '</div>'; lastDay = day; }
      var mine = m.f === me, x = m.x;
      var sys = /^\(부재중 통화 \d+\)$/.test(x) || /^부재중 발신/.test(x);
      if (sys) { h += '<div class="chat-sys">📞 ' + esc(x.replace(/[()]/g, '')) + ' <em>' + ampm(m.d) + '</em></div>'; return; }
      var inner;
      if (/^\(웃는 이모티콘\)$/.test(x)) inner = '<span class="emo">☺</span>';
      else if (/^\[사진\]/.test(x)) inner = (PHOTO[m.id] ? '<img class="b-img" src="' + PHOTO[m.id] + '" alt="사진" loading="lazy">' : '<span class="b-ph">사진</span>') + esc(x.replace(/^\[사진\]\s*/, ''));
      else if (/^\[해원일보 링크\]/.test(x)) inner = '<span class="b-link">해원일보 · 기사 링크</span>' + esc(x.replace(/^\[해원일보 링크\]\s*/, ''));
      else if (/^\(받은 메시지/.test(x)) inner = '<span class="b-fw">' + esc(x.match(/^\(([^)]*)\)/)[1]) + '</span>' + esc(x.replace(/^\([^)]*\)\s*/, ''));
      else inner = esc(x).replace(/\n/g, '<br>');
      h += '<div class="msg ' + (mine ? 'me' : 'you') + '">' + (!mine && names ? '<div class="who">' + esc(names(m.f)) + '</div>' : '') + '<div class="row"><div class="bub">' + inner + '</div><em>' + ampm(m.d) + '</em></div></div>';
    });
    return h + '</div>';
  }
  function statusBar(time) { return '<div class="sbar"><span>' + (time || '19:14') + '</span><span>▂▄▆ 〒 ▮▮▮▯</span></div>'; }
  function phone(cls, inner, title) { return { html: '<div class="phone ' + cls + '">' + inner + '</div>', title: title, skin: 'dev' }; }

  // 기기별 연락처 표시 이름 (저장 이름)
  var CONTACT = {
    S2: { seo_jeongui_doran: 'seo_jeongui_doran', late_letter: '나' },
    S3: { late_letter: '제비', sojin_doran: '소진' }
  };
  function cname(dev, id) { return (CONTACT[dev] && CONTACT[dev][id]) || nick(id); }
  var OWNER = { S2: 'late_letter', S3: 'room702' };

  function devMsgs(dev, kind) {
    return D.messages.filter(function (m) { return m.s === dev && (!kind || m.id.indexOf(kind) >= 0); });
  }
  function devThreads(dev, kind) {
    var me = OWNER[dev], by = {};
    devMsgs(dev, kind).forEach(function (m) { var o = m.f === me ? m.to : m.f; (by[o] = by[o] || []).push(m); });
    return Object.keys(by).map(function (k) { return { who: k, list: by[k], last: by[k][by[k].length - 1] }; }).sort(function (a, b) { return a.last.d < b.last.d ? 1 : -1; });
  }
  function threadList(dev, app, kind) {
    return '<ul class="d-threads">' + devThreads(dev, kind).map(function (t) {
      return '<li><a href="' + href(dev, app, t.who) + '">' + (AVATAR[t.who] ? '<span class="d-av img' + (AVATAR[t.who].indexOf('brand/') >= 0 ? ' fit' : '') + '"><img src="' + AVATAR[t.who] + '" alt=""></span>' : '<span class="d-av" style="background:' + tint(t.who, 30, 70) + '">' + esc(cname(dev, t.who).slice(0, 1)) + '</span>') + '<div><b>' + esc(cname(dev, t.who)) + '</b><p>' + esc(excerpt(t.last.x, 34)) + '</p></div><em>' + short(t.last.d) + '</em></a></li>';
    }).join('') + '</ul>';
  }
  function appBar(dev, title, back) {
    return '<div class="d-bar">' + (back ? '<a href="' + back + '">‹</a>' : '<a href="#/' + dev + '">‹</a>') + '<b>' + esc(title) + '</b><span></span></div>';
  }
  function notesList(dev, board, app) {
    var list = D.posts.filter(function (p) { return p.s === dev && p.b === board; }).sort(function (a, b) { return a.d < b.d ? 1 : -1; });
    return '<ul class="d-notes">' + list.map(function (p) {
      return '<li><a href="' + href(dev, app, p.id) + '"><b>' + esc(p.t) + '</b><p>' + esc(excerpt(p.x, 40)) + '</p><em>' + ymd(p.d) + '</em></a></li>';
    }).join('') + '</ul>';
  }
  function gallery(dev, board, app) {
    var list = D.posts.filter(function (p) { return p.s === dev && p.b === board; }).sort(function (a, b) { return a.d < b.d ? 1 : -1; });
    return '<div class="d-gal">' + list.map(function (p) {
      var bg = PHOTO[p.id] ? '#333 url(&quot;' + esc(PHOTO[p.id]) + '&quot;) center/cover' : 'linear-gradient(150deg,' + tint(p.id, 18, 72) + ',' + tint(p.id + 'g', 22, 52) + ')';
      return '<a href="' + href(dev, app, p.id) + '" style="background:' + bg + '"><span>' + esc(p.t) + '</span></a>';
    }).join('') + '</div>';
  }
  function photoView(p) { return '<div class="d-photo">' + rich(p.x, p.id) + '<div class="d-meta">' + esc(p.t) + ' · ' + when(p.d) + '</div></div>'; }
  function noteView(p) { return '<div class="d-note"><h2>' + esc(p.t) + '</h2><div class="d-meta">' + when(p.d) + '</div>' + rich(p.x, p.id) + '</div>'; }

  // 패턴 잠금 (3×3, 왼쪽 위부터 1~9)
  function patternLock(dev) {
    return '<div class="pat" data-dev="' + dev + '"><svg viewBox="0 0 300 300"><polyline class="pat-line" points=""/>' +
      [0, 1, 2, 3, 4, 5, 6, 7, 8].map(function (i) { return '<circle class="pat-dot" data-n="' + (i + 1) + '" cx="' + (50 + (i % 3) * 100) + '" cy="' + (50 + Math.floor(i / 3) * 100) + '" r="11"/>'; }).join('') + '</svg></div>';
  }
  function pinLock(dev, n) {
    var keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
    return '<div class="pinpad" data-dev="' + dev + '" data-n="' + n + '"><div class="pin-dots">' + new Array(n + 1).join('<i></i>') + '</div><div class="pin-keys">' +
      keys.map(function (k) { return k ? '<button data-k="' + k + '">' + k + '</button>' : '<span></span>'; }).join('') + '</div></div>';
  }
  function lockedFor(dev) {
    var f = st.fail[dev];
    if (f && f.until && Date.now() < f.until) return Math.ceil((f.until - Date.now()) / 1000);
    return 0;
  }
  function unlockAttempt(dev, value) {
    if (lockedFor(dev)) return false;
    if (check(dev, value) === D.auth.devices[dev].h) {
      st.open[dev] = true; delete st.fail[dev];
      save(); return true;
    }
    var f = st.fail[dev] = st.fail[dev] || { n: 0 };
    f.n++;
    if (f.n >= LOCK_TRIES) { f.n = 0; f.until = Date.now() + LOCK_SECONDS * 1000; }
    save(); return false;
  }

  // ── S2 송은혜의 휴대폰 ────────────────────────────────────
  // 4막에 돌려받아 테이블에 놓인 휴대폰. 공개 단서 6 카드의 QR로 들어온다
  function caseHint() {
    return SHOW_CASE_HINT ? '<details class="case"><summary>케이스 안쪽에 접힌 사진이 끼워져 있다</summary><div class="case-ph"><div class="case-front">[바다 사진 출력물]</div><div class="case-back">702.<br>첫 글자만 그리면 돼요.</div></div></details>' : '';
  }
  function s2(parts) {
    if (!isOpen('S2')) {
      var wait = lockedFor('S2');
      return phone('p-s2 lock', statusBar('19:16') + '<div class="ls-wall flowers"><div class="ls-clock">19:16</div><div class="ls-date">7월 17일 목요일</div>' +
        '<div class="ls-noti"><b>도란</b> 읽지 않은 메시지 없음</div><p class="ls-msg">' + (wait ? wait + '초 후에 다시 시도하세요' : '패턴을 그려 잠금 해제') + '</p>' + patternLock('S2') + caseHint() + '</div>', '잠김');
    }
    var app = parts[1], id = parts[2], h;
    if (!app) {
      h = statusBar('19:16') + '<div class="home flowers"><div class="home-grid">' +
        '<a href="' + href('S2', 'doran') + '"><i class="ic doran"><img src="img/icon/doran.png" alt=""></i>도란</a><a href="' + href('S2', 'sms') + '"><i class="ic sms"><img src="img/icon/chat.png" alt=""></i>문자</a>' +
        '<a href="' + href('S2', 'memo') + '"><i class="ic memo"><img src="img/icon/memo.png" alt=""></i>메모</a><a href="' + href('S2', 'photo') + '"><i class="ic photo"><img src="img/icon/photo.png" alt=""></i>사진첩</a></div>' +
        '</div>';
      return phone('p-s2', h, '송은혜의 휴대폰');
    }
    if (app === 'doran') h = id ? appBar('S2', cname('S2', id), href('S2', 'doran')) + chatHTML(devThreads('S2', 'DORAN').find(function (t) { return t.who === id; }).list, OWNER.S2, 'doran') : appBar('S2', '도란') + threadList('S2', 'doran', 'DORAN');
    else if (app === 'sms') h = id ? appBar('S2', cname('S2', id), href('S2', 'sms')) + chatHTML(devThreads('S2', 'SMS').find(function (t) { return t.who === id; }).list, OWNER.S2, 'sms') : appBar('S2', '문자') + threadList('S2', 'sms', 'SMS');
    else if (app === 'memo') h = id ? appBar('S2', '메모', href('S2', 'memo')) + noteView(POST[id]) : appBar('S2', '메모') + notesList('S2', '메모', 'memo');
    else if (app === 'photo') h = id ? appBar('S2', '사진', href('S2', 'photo')) + photoView(POST[id]) : appBar('S2', '사진첩') + gallery('S2', '사진첩', 'photo');
    return phone('p-s2 in', statusBar('19:16') + '<div class="d-app">' + h + '</div>', '송은혜의 휴대폰');
  }

  // ── S3 이다음의 휴대폰 ──────────────────────────────────
  function s3(parts) {
    var crack = '<svg class="crack" viewBox="0 0 100 200" preserveAspectRatio="none"><path d="M78 0 L70 38 L84 61 L66 90 L72 120 M70 38 L52 44 L40 70 M84 61 L100 66 M66 90 L45 104 L30 140 L34 200 M72 120 L95 150" /></svg>';
    if (!isOpen('S3')) {
      var wait = lockedFor('S3');
      return phone('p-s3 lock', statusBar('19:16') + '<div class="ls-wall sea"><div class="ls-clock">19:16</div><div class="ls-date">배터리 4%</div><p class="ls-msg">' +
        (wait ? wait + '초 후에 다시 시도하세요' : '암호 입력') + '</p>' + pinLock('S3', D.auth.devices.S3.n) + '</div>' + crack, '잠김');
    }
    var app = parts[1], id = parts[2], h;
    if (!app) {
      h = '<div class="home sea"><div class="home-grid">' +
        '<a href="' + href('S3', 'doran') + '"><i class="ic doran"><img src="img/icon/doran.png" alt=""></i>도란</a><a href="' + href('S3', 'memo') + '"><i class="ic memo"><img src="img/icon/memo.png" alt=""></i>메모</a>' +
        '<a href="' + href('S3', 'rec') + '"><i class="ic rec"><img src="img/icon/rec.png" alt=""></i>녹음</a><a href="' + href('S3', 'note') + '"><i class="ic photo"><img src="img/icon/photo.png" alt=""></i>수첩 사진</a>' +
        '<a href="#" data-act="auto" data-site="S1"><i class="ic web s1"><img src="img/brand/namunjari_white.png" alt=""></i>남은자리</a><a href="#" data-act="auto" data-site="S10"><i class="ic web s10">☾</i>새벽의 방</a></div></div>';
      return phone('p-s3', statusBar('19:16') + h + crack, '이다음의 휴대폰');
    }
    if (app === 'doran') h = id ? appBar('S3', cname('S3', id), href('S3', 'doran')) + chatHTML(devThreads('S3').find(function (t) { return t.who === id; }).list, OWNER.S3, 'doran s3c') : appBar('S3', '도란') + threadList('S3', 'doran');
    else if (app === 'memo') h = id ? appBar('S3', '메모', href('S3', 'memo')) + noteView(POST[id]) : appBar('S3', '메모') + notesList('S3', '메모', 'memo');
    else if (app === 'rec') {
      var recs = D.posts.filter(function (p) { return p.s === 'S3' && p.b === '녹음 목록'; }).sort(function (a, b) { return a.d < b.d ? 1 : -1; });
      h = appBar('S3', '녹음') + '<ul class="d-rec">' + recs.map(function (p) {
        var lines = p.x.split('\n'), len = (lines[0].match(/길이\s*(\S+)/) || [])[1] || '';
        return '<li><details><summary><button class="play" data-act="play">▶</button><div><b>' + esc(p.t) + '</b><em>' + ymd(p.d) + ' ' + hm(p.d) + '</em></div><span>' + esc(len) + '</span></summary><div class="rec-x">' + rich(lines.slice(1).join('\n')) + '</div></details></li>';
      }).join('') + '</ul>';
    } else if (app === 'note') h = id ? appBar('S3', '수첩 사진', href('S3', 'note')) + photoView(POST[id]) : appBar('S3', '수첩 사진') + gallery('S3', '수첩 사진', 'note');
    return phone('p-s3 in', statusBar('19:16') + '<div class="d-app">' + h + '</div>' + crack, '이다음의 휴대폰');
  }

  // ── 라우터 ─────────────────────────────────────────────
  function parse() {
    var raw = location.hash.replace(/^#\/?/, ''), qi = raw.indexOf('?'), q = {};
    if (qi >= 0) { raw.slice(qi + 1).split('&').forEach(function (kv) { var a = kv.split('='); if (a[0]) q[a[0]] = decodeURIComponent((a[1] || '').replace(/\+/g, ' ')); }); raw = raw.slice(0, qi); }
    return { parts: raw.split('/').filter(Boolean).map(decodeURIComponent), q: q };
  }
  var viaPhone = false;
  function route() {
    closeSheet();
    var r = parse(), parts = r.parts, q = r.q, site = parts[0], out;
    if (!site) out = hub();
    else if (site === 'locker') { location.replace('#/S2'); return; } // 예전 보관함 QR
    else if (site === 'WIRO') { location.replace(href('S4', 'msg')); return; } // 별꽃 폰 대화는 나래 한컷 DM으로 옮겨졌다
    else if (site === 'S2') out = s2(parts);
    else if (site === 'S3') out = s3(parts);
    else if (SK[site]) {
      var sk = SK[site], what = parts[1];
      if (sk.gate && sk.gate() && what !== 'login') out = s7Gate();
      else if (!what) out = sk.list('', q);
      else if (what === 'b') out = sk.list(parts[2], q);
      else if (what === 'p') out = POST[parts[2]] ? sk.post(POST[parts[2]]) : sk.list('', q);
      else if (what === 'search') out = sk.search ? sk.search(q) : searchPage(site, q);
      else if (what === 'login') out = loginPage(site, q);
      else if (what === 'me') out = mePage(site);
      else if (what === 'msg') out = msgPage(site, parts[2]);
      else if (what === 'u') out = userPage(site, parts[2]);
      else if (what === 'c' && sk.company) out = sk.company(parts[2]);
    }
    if (!out) out = hub();
    // 이다음 폰에서 연 남은자리·새벽의 방은 홈 대신 휴대폰으로 돌아간다.
    if (site === 'S3') viaPhone = true;
    else if (site !== 'S1' && site !== 'S10') viaPhone = false;
    var app = document.getElementById('app');
    app.className = 'skin-' + (out.skin || site || 'hub');
    document.body.className = 'b-' + (out.skin === 'dev' ? 'dev' : (site || 'hub'));
    // 허브로 가는 버튼은 두지 않는다(허브로는 브라우저 뒤로 가기). 이다음 폰에서 연 사이트만 휴대폰으로 돌아가는 버튼을 단다.
    app.innerHTML = out.html + (viaPhone && site !== 'S3' ? '<a class="pill" href="#/S3" aria-label="휴대폰으로">‹ 휴대폰</a>' : '');
    document.title = out.title ? out.title : (SITE[site] ? SITE[site].name : '홈');
    window.scrollTo(0, 0);
    bindLocks();
  }
  function searchPage(site, q) {
    var hits = searchHits(site, q.q || '');
    var rows = hits.map(function (o) {
      return '<li class="s1-row"><a href="' + href(site, 'p', o.p.id) + '"><div class="s1-t">' + esc(titleOf(o.p, o.s)) + '</div><div class="s1-m">' + esc(o.p.b) + ' · ' + esc(nick(o.p.a)) + ' · ' + short(o.p.d) + '</div></a></li>';
    }).join('');
    var body = searchForm(site, q.q, '제목·내용·닉네임') + (q.q ? '<p class="hits">‘' + esc(q.q) + '’ 검색 결과 ' + hits.length + '건</p>' : '') + '<ul class="s1-list">' + rows + '</ul>';
    return site === 'S1' ? s1Shell('', body, '검색') : site === 'S10' ? s10Shell('', body, '검색') : site === 'S6' ? s6Shell('', body, '검색') : SHELL_OF[site](body, '검색');
  }

  // ── 이벤트 ─────────────────────────────────────────────
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f.dataset.login) {
      e.preventDefault();
      var site = f.dataset.login, ok = tryLogin(site, f.id.value, f.pw.value);
      if (!ok) { var er = f.querySelector('.login-err'); er.hidden = false; er.textContent = '아이디 또는 비밀번호가 일치하지 않습니다.'; f.pw.value = ''; return; }
      var before = location.hash;
      location.hash = f.dataset.next || '#/' + site + '/me';
      if (location.hash === before) route();
      return;
    }
    if (f.dataset.s11go) {
      e.preventDefault();
      var u = f.u.value.trim().toLowerCase().replace(/^.*\//, '').replace(/^@/, '');
      if (u === S11_OWNER) { location.hash = href('S11', 'b', '일상'); return; }
      var er2 = f.querySelector('.login-err'); er2.hidden = false; er2.textContent = u ? '존재하지 않는 블로그입니다.' : '주소를 입력하세요.';
      return;
    }
    if (f.classList.contains('search')) {
      e.preventDefault();
      var o = { q: f.q.value }; if (f.y && f.y.value) o.y = f.y.value;
      location.hash = href(f.dataset.site, 'search') + qs(o);
    }
  });
  document.addEventListener('click', function (e) {
    if (e.target.classList.contains('sheet-bg')) { closeSheet(); return; }
    var a = e.target.closest('[data-act],[data-ext]');
    if (!a) return;
    if (a.dataset.ext) { e.preventDefault(); toast('외부 페이지로 연결할 수 없습니다.'); return; }
    var act = a.dataset.act;
    if (act === 'logout') { e.preventDefault(); delete st.sess[a.dataset.site]; save(); location.hash = '#/' + a.dataset.site; route(); }
    else if (act === 'reset') {
      if (confirm('이 기기의 로그인과 잠금 해제 기록을 모두 지울까요? (다음 게임 전에 누르세요)')) { st = mem = { sess: {}, open: {}, fail: {}, like: {} }; save(); route(); toast('기록을 지웠습니다.'); }

    } else if (act === 'auto') {
      e.preventDefault();
      var pair = (D.auth.auto.S3 || []).find(function (x) { return x[0] === a.dataset.site; });
      if (pair) { st.sess[pair[0]] = pair[1]; save(); location.hash = href(pair[0], 'me'); }
    } else if (act === 'retry') { e.preventDefault(); a.disabled = true; a.textContent = '연결 중…'; setTimeout(function () { a.disabled = false; a.textContent = '다시 시도'; toast('연결할 수 없습니다.'); }, 1400);
    } else if (act === 'loadmore') { e.preventDefault(); a.disabled = true; a.classList.add('loading'); a.innerHTML = '<i class="spin"></i>불러오는 중…';
    } else if (act === 'like') {
      e.preventDefault();
      var id = a.dataset.id, on = !st.like[id];
      if (on) st.like[id] = 1; else delete st.like[id];
      save();
      a.classList.toggle('on', on); a.setAttribute('aria-pressed', on);
      a.innerHTML = '<i>' + (on ? '♥' : '♡') + '</i>좋아요 <b>' + num(+a.dataset.n + (on ? 1 : 0)) + '</b>';
    } else if (act === 'share') { e.preventDefault(); shareSheet();
    } else if (act === 'share-copy') {
      e.preventDefault(); closeSheet();
      var url = location.href;
      try { navigator.clipboard.writeText(url).then(function () { toast('링크를 복사했습니다.'); }, function () { toast('링크를 복사하지 못했습니다.'); }); } catch (x) { toast('링크를 복사하지 못했습니다.'); }
    } else if (act === 'share-app') { e.preventDefault(); closeSheet(); toast('이 기기에서는 앱을 열 수 없습니다.');
    } else if (act === 'share-close') { e.preventDefault(); closeSheet();
    } else if (act === 'play') { e.preventDefault(); toast('파일을 재생할 수 없습니다. (손상된 파일)'); }
  });

  // 잠금 화면 입력
  function bindLocks() {
    var pat = document.querySelector('.pat');
    if (pat) bindPattern(pat);
    var pin = document.querySelector('.pinpad');
    if (pin) bindPin(pin);
  }
  function fail(el, dev) {
    el.classList.add('shake');
    setTimeout(function () { el.classList.remove('shake'); route(); }, 450);
    var w = lockedFor(dev); if (w) toast(w + '초 동안 입력할 수 없습니다.');
  }
  function bindPin(el) {
    var dev = el.dataset.dev, n = +el.dataset.n, val = '';
    var dots = el.querySelectorAll('.pin-dots i');
    function paint() { dots.forEach(function (d, i) { d.classList.toggle('on', i < val.length); }); }
    el.querySelector('.pin-keys').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || lockedFor(dev)) return;
      if (b.dataset.k === '⌫') val = val.slice(0, -1); else if (val.length < n) val += b.dataset.k;
      paint();
      if (val.length === n) {
        if (unlockAttempt(dev, val)) { route(); } else { val = ''; fail(el, dev); }
      }
    });
  }
  function bindPattern(el) {
    var dev = el.dataset.dev, svg = el.querySelector('svg'), line = el.querySelector('.pat-line');
    var dots = Array.prototype.slice.call(el.querySelectorAll('.pat-dot')), seq = [], drawing = false, cur = null;
    function pt(e) { var r = svg.getBoundingClientRect(); return { x: (e.clientX - r.left) * 300 / r.width, y: (e.clientY - r.top) * 300 / r.height }; }
    function hit(p) {
      dots.forEach(function (d) {
        var n = +d.dataset.n, cx = +d.getAttribute('cx'), cy = +d.getAttribute('cy');
        if (seq.indexOf(n) < 0 && Math.hypot(p.x - cx, p.y - cy) < 36) { seq.push(n); d.classList.add('on'); if (navigator.vibrate) try { navigator.vibrate(8); } catch (x) { } }
      });
    }
    function draw() {
      var pts = seq.map(function (n) { var d = dots[n - 1]; return d.getAttribute('cx') + ',' + d.getAttribute('cy'); });
      if (drawing && cur) pts.push(cur.x + ',' + cur.y);
      line.setAttribute('points', pts.join(' '));
    }
    svg.addEventListener('pointerdown', function (e) { if (lockedFor(dev)) return; drawing = true; seq = []; dots.forEach(function (d) { d.classList.remove('on'); }); svg.setPointerCapture(e.pointerId); cur = pt(e); hit(cur); draw(); e.preventDefault(); });
    svg.addEventListener('pointermove', function (e) { if (!drawing) return; cur = pt(e); hit(cur); draw(); });
    function end() {
      if (!drawing) return; drawing = false; cur = null; draw();
      if (seq.length < 2) { seq = []; dots.forEach(function (d) { d.classList.remove('on'); }); draw(); return; }
      if (unlockAttempt(dev, seq.join('-'))) route(); else { el.classList.add('bad'); fail(el, dev); }
    }
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  }

  window.addEventListener('hashchange', route);
  route();
})();
