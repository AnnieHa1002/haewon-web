// 휴대폰 크기로 모든 화면을 열어 보고 스크린샷을 남긴다: node tools/smoke.mjs [출력폴더]
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
import path from 'path'; import fs from 'fs';
const out = process.argv[2] || 'shots'; fs.mkdirSync(out, { recursive: true });
const url = 'file://' + path.resolve('site/index.html');
const browser = await pw.chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
async function go(h, name, full = false) {
  await page.goto(url + h); await page.waitForTimeout(120);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: full });
}
const routes = [
  ['#/', 'hub'], ['#/S1', 's1'], ['#/S1/b/천명타워 유족방', 's1-tower'], ['#/S1/p/S1-TOWER-001', 's1-post'],
  ['#/S1/b/산재·사고 유족방', 's1-sanjae'], ['#/S1/p/S1-SANJAE-015', 's1-blind'], ['#/S1/p/S1-FREE-008', 's1-del'], ['#/S1/msg', 's1-msg'],
  ['#/S5', 's5'], ['#/S5/p/S5-SOC-001', 's5-1999'], ['#/S5/search?q=천명타워', 's5-search'],
  ['#/S9', 's9'], ['#/S9/b/천명건설 라운지', 's9-lounge'], ['#/S9/b/샘선전자 라운지', 's9-ss'], ['#/S9/p/S9-CM-001', 's9-post'], ['#/S10', 's10'], ['#/S10/p/S10-TALK-001', 's10-post'], ['#/S11', 's11'], ['#/S11/b/일상', 's11-day'], ['#/S11/p/S11-OLD-003', 's11-lock'],
  ['#/S6', 's6'], ['#/S6/b/상품', 's6-shop'], ['#/S6/p/S6-SHOP-001', 's6-post'], ['#/S8', 's8'], ['#/S8/b/고객의 소리', 's8-voc'], ['#/S8/p/S8-VOC-001', 's8-post'],
  ['#/S7', 's7-gate'], ['#/S4', 's4'], ['#/S4/p/S4-FEED-001', 's4-post'], ['#/S4/msg', 's4-dm'], ['#/locker', 'locker'], ['#/S3', 's3-lock'],
];
for (const [h, n] of routes) await go(h, n);
// 로그인·잠금 해제 흐름
await page.goto(url + '#/S7'); await page.fill('input[name=id]', 'DW21-0347'); await page.fill('input[name=pw]', 'sojin0347'); await page.click('form.login-box .btn'); await page.waitForTimeout(150);
await page.screenshot({ path: `${out}/s7-in.png` });
await go('#/S7/b/배차 기록', 's7-car');
await page.goto(url + '#/S1/login'); await page.fill('input[name=id]', 'baram_dad'); await page.fill('input[name=pw]', '1998baram'); await page.click('form.login-box .btn'); await page.waitForTimeout(150);
await page.screenshot({ path: `${out}/s1-me.png` });
await go('#/S1/p/S1-SANJAE-029', 's1-scrap');
await page.goto(url + '#/S3');
for (const k of '0402') await page.click(`.pin-keys button[data-k="${k}"]`);
await page.waitForTimeout(150); await page.screenshot({ path: `${out}/s3-home.png` });
await go('#/S3/doran/sojin_doran', 's3-chat'); await go('#/S3/rec', 's3-rec');
await page.goto(url + '#/locker'); page.once('dialog', d => d.accept()); await page.click('[data-act=locker]'); await page.waitForTimeout(150);
await page.screenshot({ path: `${out}/locker-open.png` });
await page.goto(url + '#/S2'); await page.waitForTimeout(100);
const box = await page.locator('.pat svg').boundingBox();
const P = n => ({ x: box.x + (50 + ((n - 1) % 3) * 100) * box.width / 300, y: box.y + (50 + Math.floor((n - 1) / 3) * 100) * box.height / 300 });
await page.mouse.move(P(1).x, P(1).y); await page.mouse.down();
for (const n of [2, 3, 5, 7]) await page.mouse.move(P(n).x, P(n).y, { steps: 6 });
await page.mouse.up(); await page.waitForTimeout(150);
await page.screenshot({ path: `${out}/s2-home.png` });
await go('#/S2/doran/room702', 's2-chat'); await go('#/S2/memo', 's2-memo'); await go('#/S2/photo', 's2-photo');
await page.goto(url + '#/WIRO'); for (const k of '5050') await page.click(`.pin-keys button[data-k="${k}"]`); await page.waitForTimeout(150);
await go('#/WIRO/doran/nare_doran', 'wiro-chat');
// 진행 화면
const stage = 'file://' + path.resolve('site/stage.html');
await page.goto(stage); await page.click('#go'); await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/stage-1.png` });
await page.click('#hud', { force: true }).catch(() => {});
const jump = (i, ago) => page.evaluate(([i, ago]) => { const s = JSON.parse(localStorage.getItem('hw4-stage-3')); s.i = i; s.t0 = Date.now() - ago * 60000; s.armed = i === 9 ? 'vote' : null; s.turn = 0; localStorage.setItem('hw4-stage-3', JSON.stringify(s)); }, [i, ago]);
await jump(6, 0.2); await page.goto(stage); await page.click('#resume'); await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/stage-probe.png` });
await jump(8, 2.5); await page.goto(stage); await page.click('#resume'); await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/stage-final.png` });
// 투표: 두 번 누르면 하나, 둘, 셋 → 카드와 지목을 동시에
await jump(9, 0.2); await page.goto(stage); await page.click('#resume'); await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/stage-4.png` });
await page.mouse.dblclick(200, 200); await page.waitForTimeout(4500);
await page.screenshot({ path: `${out}/stage-vote.png` });
await page.waitForTimeout(500);
await page.keyboard.press('Escape'); await page.waitForTimeout(200);
await page.screenshot({ path: `${out}/stage-panel.png` });
const state = await page.evaluate(() => localStorage.getItem('hw4-state'));
console.log('state', state);
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();
