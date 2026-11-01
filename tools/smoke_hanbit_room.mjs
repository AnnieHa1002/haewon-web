// 한빛 엔딩북 '방' 점검: 휴대폰 7대를 흉내 내어(?mock, 브라우저 저장소로 Firebase 대신)
// 방 만들기 → 캐릭터 → 지목 → 결정지 → 엔딩북 함께 넘기기 → 각자 엔딩까지 돌려 본다.
// node tools/smoke_hanbit_room.mjs [출력폴더]
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
import path from 'path'; import fs from 'fs';
const out = process.argv[2] || 'shots/hanbit-room'; fs.mkdirSync(out, { recursive: true });
const base = 'file://' + path.resolve('site/hanbit/index.html') + '?mock';
const browser = await pw.chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const errors = [];
const ROLES = ['daeun', 'noa', 'siwoo', 'haeun', 'junseo', 'taesu', 'sehyun'];
const NAMES = { daeun: '임다은', noa: '강노아', siwoo: '권시우', haeun: '허하은', junseo: '변준서', taesu: '강태수', sehyun: '윤세현' };
const pages = [];
for (let i = 0; i < 7; i++) {
  const p = await ctx.newPage();
  // 기기마다 다른 ID가 되도록 sessionStorage가 아니라 localStorage를 쓰므로, 기기 ID는 페이지마다 덮어쓴다
  p.on('pageerror', e => errors.push(`[${i}] ${e.message}`));
  p.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_|qrcode|gstatic/.test(m.text())) errors.push(`[${i}] ${m.text()}`); });
  pages.push(p);
}
const wait = ms => new Promise(r => setTimeout(r, ms));
await pages[0].goto(base + '#/'); await pages[0].evaluate(() => localStorage.clear());
// 같은 브라우저라 저장소를 같이 쓰므로, 기기마다 '이 기기의 진행 상태' 키를 따로 쓰게 한다
for (let i = 0; i < 7; i++) await pages[i].addInitScript(n => { const k = Storage.prototype.getItem, s = Storage.prototype.setItem; Storage.prototype.getItem = function (key) { return k.call(this, key === 'hanbit.mockdb' ? key : key + '#' + n); }; Storage.prototype.setItem = function (key, v) { return s.call(this, key === 'hanbit.mockdb' ? key : key + '#' + n, v); }; }, i);

const p0 = pages[0];
await p0.goto(base + '#/'); await wait(200);
await p0.screenshot({ path: `${out}/00-home.png` });
await p0.click('[data-create]'); await wait(300);
const code = (await p0.textContent('.code-big')).trim();
console.log('방 코드', code);
for (let i = 1; i < 7; i++) { await pages[i].goto(base + '#join=' + code); }
await wait(400);
for (let i = 0; i < 7; i++) { await pages[i].click(`[data-claim=${ROLES[i]}]`); await wait(80); }
await wait(300);
await p0.screenshot({ path: `${out}/01-room.png`, fullPage: true });
// 지목: 다섯 명은 하은, 두 명은 시우
for (let i = 0; i < 7; i++) { await pages[i].goto(base + '#/vote'); await wait(60); await pages[i].click(`[data-vote=${i < 5 ? 'haeun' : 'siwoo'}]`); await wait(60); }
await wait(400);
await p0.screenshot({ path: `${out}/02-vote.png`, fullPage: true });
const acc = await p0.evaluate(() => window.HANBIT.state().S.acc);
console.log('지목 결과', acc);
// 결정지
for (let i = 0; i < 7; i++) {
  const p = pages[i];
  await p.goto(base + '#/mysheet'); await wait(150);
  if (ROLES[i] === 'daeun') { await p.selectOption('select[name=bully]', 'siwoo'); await p.fill('textarea[name=plan]', '기자에게 USB 자료를 넘기려 함'); await p.check('input[name=c_i01]'); }
  if (ROLES[i] === 'taesu') { await p.selectOption('select[name=child]', 'junseo'); await p.check('input[name=c_key]'); }
  if (ROLES[i] === 'sehyun') await p.fill('textarea[name=reason]', '모르겠다');
  if (i === 0) await p.screenshot({ path: `${out}/03-mysheet.png`, fullPage: true });
  await p.click('form button[type=submit]'); await wait(120);
}
await wait(300);
await p0.screenshot({ path: `${out}/04-wait.png`, fullPage: true });
await p0.click('[data-start]'); await wait(500);
const hashes = await Promise.all(pages.map(p => p.evaluate(() => location.hash)));
console.log('엔딩북 연 뒤 각 기기 화면', hashes.join(' '));
// 다른 기기에서 연구실 판정 → 모두에게 반영
await pages[3].click('[data-next]'); await wait(400);
await pages[4].click('[data-set=lab] >> text=열리지 않았다'); await wait(300);
const labSeen = await Promise.all(pages.map(p => p.evaluate(() => window.HANBIT.state().S.lab)));
console.log('연구실 판정 공유', labSeen.join(','));
await pages[2].screenshot({ path: `${out}/05-lab-other-phone.png`, fullPage: true });
await pages[4].click('[data-next]'); await wait(300);
for (const n of [1, 2, 3, 4, 5]) { await pages[1].click(`[data-set=t${n}] >> text=설명했다`); await wait(60); }
await pages[1].click('[data-next]'); await wait(300);
await pages[6].click('[data-set=x_reason] >> text=불인정'); await wait(300);
const esc = await p0.evaluate(() => window.HANBIT.derive(window.HANBIT.state().S).esc);
console.log('탈출 갈래', esc);
await pages[0].screenshot({ path: `${out}/06-escape.png`, fullPage: true });
await pages[6].click('[data-next]'); await wait(300);
await pages[6].click('[data-next]'); await wait(300);
const where = await Promise.all(pages.map(p => p.evaluate(() => location.hash)));
console.log('4장으로 함께', where.join(' '));
await pages[1].screenshot({ path: `${out}/07-personal-noa.png`, fullPage: true });
await pages[5].goto(base + '#/role/taesu'); await wait(200);
console.log('태수 엔딩', (await pages[5].textContent('.ending-title')).trim());
await pages[5].screenshot({ path: `${out}/08-taesu.png`, fullPage: true });
console.log(errors.length ? '콘솔 에러:\n' + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
