// 한빛 엔딩북 '방' 점검: 휴대폰 9대를 흉내 내어(?mock, 브라우저 저장소로 Firebase 대신)
// 캐릭터 7 + GM 1이 들어오고 9번째는 막히는지, 같은 캐릭터를 두 명이 못 고르는지,
// 지목 → 결정지 → (모두 내면 자동으로) 엔딩북 → 모두 준비해야 넘어가는지 → 각자 엔딩까지 본다.
// node tools/smoke_hanbit_room.mjs [출력폴더]
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
import path from 'path'; import fs from 'fs';
const out = process.argv[2] || 'shots/hanbit-room'; fs.mkdirSync(out, { recursive: true });
const base = 'file://' + path.resolve('site/hanbit/index.html') + '?mock';
const browser = await pw.chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const errors = [], fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); console.log((cond ? '✔ ' : '✘ ') + msg); };
const SEATS = ['daeun', 'noa', 'siwoo', 'haeun', 'junseo', 'taesu', 'sehyun', 'gm'];
const pages = [];
for (let i = 0; i < 9; i++) {
  const p = await ctx.newPage();
  // 한 브라우저라 저장소를 같이 쓰므로, '방 데이터'만 함께 쓰고 나머지(기기 ID·진행 상태)는 기기마다 따로
  await p.addInitScript(n => {
    const g = Storage.prototype.getItem, s = Storage.prototype.setItem;
    Storage.prototype.getItem = function (k) { return g.call(this, k === 'hanbit.mockdb' ? k : k + '#' + n); };
    Storage.prototype.setItem = function (k, v) { return s.call(this, k === 'hanbit.mockdb' ? k : k + '#' + n, v); };
  }, i);
  p.on('pageerror', e => errors.push(`[${i}] ${e.message}`));
  p.on('dialog', d => (p._dismiss ? (p._dismiss = false, d.dismiss()) : d.accept()));
  p.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_|qrcode|gstatic/.test(m.text())) errors.push(`[${i}] ${m.text()}`); });
  pages.push(p);
}
const wait = ms => new Promise(r => setTimeout(r, ms));
const S = p => p.evaluate(() => window.HANBIT.state().S);
const me = p => p.evaluate(() => window.HANBIT.state().me);
const p0 = pages[0], gm = pages[7];
await p0.goto(base + '#/'); await p0.evaluate(() => localStorage.clear()); await p0.reload(); await wait(150);
await p0.screenshot({ path: `${out}/00-home.png` });
await p0.click('[data-create]'); await wait(300);
const code = (await p0.textContent('.code-big')).trim();
console.log('방 코드', code);
for (let i = 1; i < 9; i++) await pages[i].goto(base + '#join=' + code);
await wait(400);
for (let i = 0; i < 8; i++) { await pages[i].click(`[data-claim=${SEATS[i]}]`); await wait(80); }
await wait(300);
ok((await me(pages[3])) === 'haeun', '하은 자리 차지');
// 다른 사람이 고른 역할을 눌러도, 확인에서 '취소'하면 그대로
pages[1]._dismiss = true;
await pages[1].click('[data-claim=daeun]'); await wait(300);
ok((await me(pages[1])) === 'noa' && (await me(p0)) === 'daeun', '남의 역할은 확인을 취소하면 못 가져감');
// 같은 휴대폰에서 다시 열면 자기 자리
const twin = await ctx.newPage();
await twin.addInitScript(n => {
  const g = Storage.prototype.getItem, s = Storage.prototype.setItem;
  Storage.prototype.getItem = function (k) { return g.call(this, k === 'hanbit.mockdb' ? k : k + '#' + n); };
  Storage.prototype.setItem = function (k, v) { return s.call(this, k === 'hanbit.mockdb' ? k : k + '#' + n, v); };
}, 1);
await twin.goto(base + '#/room'); await wait(400);
ok((await me(twin)) === 'noa', '같은 휴대폰에서 다시 열면 자기 자리(노아)로 돌아옴');
await twin.close();
// 9번째 휴대폰(노아가 폰을 바꿈): 자리가 다 찼다는 안내 + 노아를 누르면 원래 폰을 끊고 들어감
await pages[8].goto(base + '#/room'); await wait(300);
ok(/자리가 모두 찼어요/.test(await pages[8].textContent('main')), '9번째 휴대폰: 자리가 다 찼다는 안내');
await pages[8].click('[data-claim=noa]'); await wait(400);
ok((await me(pages[8])) === 'noa' && (await me(pages[1])) === null, '다시 접속한 휴대폰이 노아로 들어가고 원래 폰은 끊김');
await wait(200);
ok(/노아 자리에서 나왔어요|강노아<\/b> 자리에서 나왔어요/.test(await pages[1].innerHTML('main')) || /자리에서 나왔어요/.test(await pages[1].textContent('main')), '끊긴 폰에 안내가 뜸');
await pages[8].goto(base + '#/play/ch1'); await wait(200);
// 원래 폰으로 다시 (테스트 계속)
await pages[1].click('[data-claim=noa]'); await wait(400);
ok((await me(pages[1])) === 'noa' && (await me(pages[8])) === null, '원래 폰이 다시 가져감');
await pages[8].goto(base + '#/play/ch1'); await wait(300);
ok((await pages[8].evaluate(() => location.hash)) === '#/room', '자리 없는 휴대폰은 엔딩 화면을 못 봄');
await pages[8].screenshot({ path: `${out}/01b-full.png` });
await gm.screenshot({ path: `${out}/01-room-gm.png`, fullPage: true });
// 지목 전에는 결정지도, 엔딩북도 못 연다
await pages[2].goto(base + '#/mysheet'); await wait(400);
ok((await pages[2].evaluate(() => location.hash)) === '#/vote', '지목 전 결정지 → 지목 화면으로 돌려보냄');
await gm.goto(base + '#/wait'); await wait(200);
ok(!(await gm.$('[data-start]')) && /모두 지목하지 않았어요/.test(await gm.textContent('main')), '지목 전 GM도 엔딩북을 못 엶');
// 여섯 명만 지목 → 아직 결정지·엔딩북 못 감
for (let i = 0; i < 6; i++) { await pages[i].goto(base + '#/vote'); await wait(60); await pages[i].click(`[data-vote=${i < 5 ? 'haeun' : 'siwoo'}]`); await wait(60); }
await wait(300);
ok((await S(p0)).acc == null, '6/7 지목 땐 지목 결과 없음');
await pages[1].goto(base + '#/mysheet'); await wait(400);
ok((await pages[1].evaluate(() => location.hash)) === '#/vote', '6/7 지목 땐 결정지로 못 감');
// 지목: 다섯 명 하은, 두 명 시우. GM은 지목 못 함
for (let i = 0; i < 7; i++) { await pages[i].goto(base + '#/vote'); await wait(60); await pages[i].click(`[data-vote=${i < 5 ? 'haeun' : 'siwoo'}]`); await wait(60); }
await gm.goto(base + '#/vote'); await wait(200);
ok(await gm.$eval('[data-vote=haeun]', b => b.disabled), 'GM은 지목 버튼이 꺼져 있음');
await wait(300);
// 서버에서 지목이 빠져도(오류 등) 각자 휴대폰에 기억한 걸로 다시 채워진다
await p0.evaluate(() => { const d = JSON.parse(localStorage.getItem('hanbit.mockdb')); const r = Object.keys(d.rooms).pop(); delete d.rooms[r].votes.siwoo; localStorage.setItem('hanbit.mockdb', JSON.stringify(d)); window.dispatchEvent(new StorageEvent('storage', { key: 'hanbit.mockdb' })); });
await wait(500);
ok(await pages[2].evaluate(() => { const d = JSON.parse(localStorage.getItem('hanbit.mockdb')); const r = Object.keys(d.rooms).pop(); return d.rooms[r].votes.siwoo === 'haeun'; }), '빠진 지목이 휴대폰 기억으로 다시 채워짐');
ok(!(await pages[2].$('[data-revote]')), '결과가 하나로 정해지면 다시 지목 버튼 없음');
ok((await S(p0)).acc === 'haeun', '지목 결과 허하은');
await wait(4000);
const hv = await Promise.all(pages.slice(0, 8).map(p => p.evaluate(() => location.hash)));
ok(hv.slice(0, 7).every(h => h === '#/mysheet') && hv[7] === '#/wait', '모두 지목하자 자동으로 결정지로 (' + hv.join(' ') + ')');
await p0.screenshot({ path: `${out}/02-vote.png`, fullPage: true });
// 쓰던 결정지는 다른 사람이 움직여도, 다시 들어와도 그대로
await pages[4].goto(base + '#/mysheet'); await wait(200);
await pages[4].fill('textarea[name=identity]', '쓰던 글 그대로');
await pages[4].evaluate(() => document.activeElement.blur());
await pages[2].goto(base + '#/mysheet'); await wait(200); await pages[2].fill('textarea[name=identity]', 'x'); await wait(900);
ok((await pages[4].inputValue('textarea[name=identity]')) === '쓰던 글 그대로', '다른 사람이 쓰는 동안 내 글이 안 지워짐');
await pages[4].goto(base + '#/room'); await wait(200); await pages[4].goto(base + '#/mysheet'); await wait(300);
ok((await pages[4].inputValue('textarea[name=identity]')) === '쓰던 글 그대로', '나갔다 다시 들어와도 쓰던 글이 남음');
// 결정지: 엔딩북은 모두 내야 자동으로 열린다
for (let i = 0; i < 7; i++) {
  const p = pages[i];
  await p.goto(base + '#/mysheet'); await wait(150);
  if (SEATS[i] === 'daeun') { await p.selectOption('select[name=bully]', 'siwoo'); await p.fill('textarea[name=plan]', '기자에게 USB 자료를 넘기려 함'); await p.check('input[name=c_i01]'); }
  if (SEATS[i] === 'taesu') { await p.selectOption('select[name=child]', 'junseo'); await p.check('input[name=c_key]'); }
  if (SEATS[i] === 'sehyun') await p.fill('textarea[name=reason]', '모르겠다');
  if (i === 0) await p.screenshot({ path: `${out}/03-mysheet.png`, fullPage: true });
  if (i === 6) { const st = await S(p0); ok((st.stage || 0) < 2, '6명만 냈을 땐 엔딩북이 안 열림'); await gm.goto(base + '#/wait'); await wait(150); await gm.screenshot({ path: `${out}/04-wait-gm.png`, fullPage: true }); }
  await p.click('form button[type=submit]'); await wait(150);
}
await wait(500);
const hashes = await Promise.all(pages.slice(0, 8).map(p => p.evaluate(() => location.hash)));
ok(hashes.every(h => h === '#/play/ch1'), '모두 내자 8대 모두 1장으로 (' + hashes.join(' ') + ')');
// 엔딩북 넘기기: 누가 눌러도 모두 함께 (투표 없음)
ok(!(await gm.$('[data-ready]')), '준비 투표 버튼 없음');
await pages[3].click('[data-roomnext]'); await wait(500);
ok((await S(p0)).stage === 3, '한 명이 누르면 넘어감');
const h2 = await Promise.all(pages.slice(0, 8).map(p => p.evaluate(() => location.hash)));
ok(h2.every(h => h === '#/play/lab'), '8대 모두 2장 연구실로');
// 아직 안 열린 곳 미리 보기 막힘
await pages[5].goto(base + '#/play/personal'); await wait(150);
ok(/아직 열리지 않은 곳/.test(await pages[5].textContent('main')), '앞 단계 미리 보기 막힘');
await pages[5].goto(base + '#/play/lab'); await wait(150);
// 판정은 아무 폰에서나 → 모두에게
await pages[4].click('[data-set=lab] >> text=열리지 않았다'); await wait(300);
ok((await Promise.all(pages.slice(0, 8).map(S))).every(x => x.lab === false), '연구실 판정이 모두에게 반영');
ok(!(await gm.$('[data-roomnext]')) && await gm.$eval('[data-set=lab]', b => b.disabled), 'GM은 다음·판정 버튼을 못 누름');
await pages[4].click('[data-roomnext]'); await wait(500);
ok((await S(p0)).stage === 4, '플레이어가 누르면 넘어감');
for (const n of [1, 2, 3, 4, 5]) { await pages[1].click(`[data-set=t${n}] >> text=설명했다`); await wait(50); }
// 여러 명이 같은 답을 눌러도 지워지지 않는다
await pages[3].click('[data-set=t1] >> text=설명했다'); await wait(150);
await pages[5].click('[data-set=t1] >> text=설명했다'); await wait(300);
ok((await S(p0)).t1 === true, '여러 명이 같은 답을 눌러도 그대로');
ok(/노아\(나\)가 골랐어요|노아가 골랐어요/.test(await pages[1].textContent('main')) || /가 골랐어요/.test(await pages[2].textContent('main')), '누가 골랐는지 표시');
ok(await pages[2].$eval('[data-roomnext]', b => !b.disabled), '판정이 끝나면 다음 버튼이 켜짐');
await pages[2].click('[data-roomnext]'); await wait(400);
await pages[6].click('[data-set=x_reason] >> text=불인정'); await wait(300);
ok((await p0.evaluate(() => window.HANBIT.derive(window.HANBIT.state().S).esc)) === '2-D', '탈출 갈래 2-D');
await pages[0].screenshot({ path: `${out}/06-escape.png`, fullPage: true });
for (const i of [5, 0]) { await pages[i].click('[data-roomnext]'); await wait(400); }
const h3 = await Promise.all(pages.slice(0, 8).map(p => p.evaluate(() => location.hash)));
ok(h3.every(h => h === '#/play/personal'), '모두 함께 4장으로');
await pages[1].screenshot({ path: `${out}/07-personal-noa.png`, fullPage: true });
await pages[5].goto(base + '#/role/taesu'); await wait(200);
ok(/아이와 함께 나온 말/.test(await pages[5].textContent('.ending-title')), '태수 엔딩: 아이와 함께 나온 말');
// GM 강제 넘기기
await gm.goto(base + '#/play/personal'); await wait(200);
await gm.click('[data-admin]'); await gm.click('[data-forcenext]'); await wait(500);
ok((await S(p0)).stage === 8, 'GM 강제로 다음으로 넘기기');
// GM이 자리 비우기 → 그 기기는 다시 골라야 함
await gm.goto(base + '#/play/personal'); await wait(200);
ok(!!(await gm.$('[data-admin]')) && !(await pages[2].$('[data-admin]')), 'GM에게만 어느 화면에서든 관리 버튼 (GM이 있을 때)');
await gm.click('[data-admin]'); await gm.click('[data-release=junseo]'); await wait(300);
ok((await me(pages[4])) === null, 'GM이 비운 자리는 그 기기에서 풀림');
await pages[4].goto(base + '#/room'); await wait(150);
await pages[4].click('[data-claim=junseo]'); await wait(200);
ok((await me(pages[4])) === 'junseo', '비운 자리에 다시 앉기');
// GM이 없으면 캐릭터 누구나 관리
await gm.evaluate(() => window.HANBIT && document.querySelector('[data-leave]')); await gm.goto(base + '#/room'); await wait(200); await gm.click('[data-leave]'); await wait(400);
await pages[2].reload(); await wait(300);
ok(!!(await pages[2].$('[data-admin]')), 'GM이 없으면 캐릭터에게 관리 버튼');
console.log(errors.length ? '콘솔 에러:\n' + errors.join('\n') : '콘솔 에러 없음');
console.log(fails.length ? `실패 ${fails.length}건` : '모두 통과');
await browser.close();
process.exit(fails.length || errors.length ? 1 : 0);
