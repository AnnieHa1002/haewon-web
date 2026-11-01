// 한빛 엔딩북 점검: node tools/smoke_hanbit.mjs [출력폴더]
// 1) 판정 조합을 무작위로 많이 만들어, 모든 인물이 항상 원고에 있는 엔딩을 받는지·결과 코드가 그대로 돌아오는지 본다.
// 2) 390px 화면으로 진행 화면을 처음부터 끝까지 눌러 보고 스크린샷을 남긴다.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
import path from 'path'; import fs from 'fs';
const out = process.argv[2] || 'shots/hanbit'; fs.mkdirSync(out, { recursive: true });
const url = 'file://' + path.resolve('site/hanbit/index.html');
const browser = await pw.chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_|qrcode/.test(m.text())) errors.push(m.text()); });
await page.goto(url + '#/');
await page.evaluate(() => localStorage.clear());

// 1) 규칙 점검
const logic = await page.evaluate(() => {
  const H = window.HANBIT, B = window.HANBIT_BOOK;
  const ends = {};
  B.chapters.forEach(c => c.sections.forEach(s => { if (s.endings.length) ends[s.key] = s.endings.map(e => e.title); }));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const problems = [], seen = {};
  for (let n = 0; n < 20000; n++) {
    const S = { stage: 7, acc: pick(['haeun', 'siwoo', 'taesu', 'sehyun', 'noa', 'daeun', 'junseo', 'none']) };
    ['lab', 't1', 't2', 't3', 't4', 't5', 'pubI59', 'pubI65', 'd_water', 'd_mirror', 'd_plan', 'd_name', 'n_cat', 'n_i65', 's_mother', 's_x1', 's_x2', 's_x3', 'h_map', 'j_p03', 'j_drug', 'j_x1', 'j_x2', 'j_leave', 't_a1', 't_a2', 't_a3', 't_a4', 't_a5', 't_key', 't_drug', 't_daughter', 'x_reason', 'x_env', 'x_exposed'].forEach(k => S[k] = Math.random() < .5);
    S.d_bully = pick(['siwoo', 'noa', 'other']); S.i01 = pick(['daeun', 'sehyun', 'other']); S.n_choice = pick(['revenge', 'forgive', 'none']);
    S.j_coins = pick([0, 1, 2, 3, 4]); S.t_child = pick(['noa', 'junseo', 'daeun', 'siwoo', 'haeun', 'blank']);
    const D = H.derive(S);
    if (!D.esc || !D.ch3) problems.push(['갈래 미정', JSON.stringify(S)]);
    H.ROLES.forEach(r => {
      const sc = H.scoreOf(r.k, S, D);
      if (!sc.complete) problems.push([r.k, '점수 미정']);
      if (sc.total > 12 && r.k !== 'sehyun') problems.push([r.k, '12점 초과 ' + sc.total]);
      if (!sc.ends.length) problems.push([r.k, '엔딩 없음', JSON.stringify(S)]);
      sc.ends.concat(sc.extra).forEach(t => {
        if (typeof t !== 'string') { problems.push([r.k, '덧붙임 미정']); return; }
        if (!ends[r.sec].includes(t)) problems.push([r.k, '원고에 없는 엔딩 ' + t]);
        seen[r.k + '/' + t] = 1;
      });
    });
    const code = H.makeCode(S), back = H.readCode(code);
    if (!back || Object.keys(S).some(k => back[k] !== S[k])) problems.push(['코드 왕복 실패', code]);
  }
  const never = [];
  Object.keys(ends).forEach(sec => { const r = H.ROLES.find(x => x.sec === sec); ends[sec].forEach(t => { if (!seen[r.k + '/' + t]) never.push(r.k + '/' + t); }); });
  const blankCode = H.makeCode({ stage: 0 });
  return { problems: problems.slice(0, 15), nProblems: problems.length, never, sampleCode: H.makeCode({ stage: 7, acc: 'haeun', lab: true, t1: true, t2: true, t3: true, t4: true, t5: false, d_bully: 'siwoo', i01: 'daeun', t_child: 'noa', x_exposed: false, j_coins: 2 }), blankCode };
});
console.log('규칙 점검:', JSON.stringify(logic, null, 1));

// 2) 화면 따라가기
async function shot(name, full = true) { await page.waitForTimeout(150); await page.screenshot({ path: `${out}/${name}.png`, fullPage: full }); }
await page.goto(url + '#/'); await shot('00-home', false);
await page.click('a.big-btn.primary'); await page.click('button.choice:has-text("허하은")'); await shot('01-accuse');
await page.click('[data-next]');
await page.click('a.role:has-text("임다은")'); await shot('02-lock', false);
await page.click('[data-open]');
await page.selectOption('select[name=bully]', 'siwoo');
await page.fill('textarea[name=mirror]', '안에 USB가 들어 있고 연구를 고발할 자료');
await page.fill('textarea[name=plan]', '오늘 저녁 기자에게 USB 자료를 넘기려 했다');
await page.fill('textarea[name=x1]', '한서인');
await page.check('input[name=c_i01]'); await shot('03-sheet');
await page.click('form button[type=submit]');
await page.click('a.role:has-text("강태수")'); await page.click('[data-open]');
await page.selectOption('select[name=child]', 'noa'); await page.check('input[name=c_key]');
await page.click('form button[type=submit]');
await page.click('a.role:has-text("윤세현")'); await page.click('[data-open]');
await page.fill('textarea[name=reason]', '다은 엄마랑 만나려고');
await page.click('form button[type=submit]'); await shot('04-sheets');
await page.click('[data-next]'); await shot('04b-ch1');
await page.click('[data-next]');
await page.click('[data-set=lab] >> text=열렸다'); await shot('05-lab');
await page.click('[data-next]');
for (const n of [1, 2, 3, 4]) await page.click(`[data-set=t${n}] >> text=설명했다`);
await page.click('[data-set=t5] >> text=못 했다'); await shot('06-truth');
await page.click('[data-next]');
await page.click('[data-set=x_reason] >> text=불인정'); await shot('07-escape');
await page.click('[data-next]'); await shot('08-ch3');
await page.click('[data-next]');
await page.click('[data-set=n_cat] >> text=불인정');
await page.click('[data-set=x_exposed] >> text=세 장 미만'); await shot('09-personal');
await page.click('a.role:has-text("강노아")'); await shot('10-role-noa');
await page.goto(url + '#/role/daeun'); await shot('11-role-daeun');
await page.goto(url + '#/story'); await shot('12-story');
await page.goto(url + '#/code'); await shot('13-code', false);
const code = await page.textContent('.code-big');
await page.goto(url + '#/book/2-D'); await page.waitForTimeout(200); await shot('14-book-2D', false);
await page.goto(url + '#/play/reveal'); await shot('15-reveal', false);
// 다른 기기: 코드로 불러오기
const p2 = await ctx.newPage();
await p2.goto(url + '#/'); await p2.evaluate(() => localStorage.clear());
await p2.goto(url + '#/code'); await p2.fill('input[name=code]', code); await p2.click('form[data-codeform] button');
await p2.waitForTimeout(200);
const p2path = await p2.textContent('.path');
await p2.goto(url + '#/role/taesu'); await p2.waitForTimeout(150);
const taesuEnd = await p2.textContent('.ending-title');
await p2.screenshot({ path: `${out}/16-other-device-taesu.png`, fullPage: true });
console.log('결과 코드', code, '| 다른 기기 갈래', p2path, '| 태수 엔딩', taesuEnd);
console.log(errors.length ? '콘솔 에러:\n' + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
