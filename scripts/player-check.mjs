#!/usr/bin/env node
// Player check: plays archive and live radio in Chrome, Firefox and Safari's
// engine (WebKit, as an iPhone), the way people click, and reports what works.
//
//   pnpm test:player                       → http://localhost:3005
//   pnpm test:player https://thfradio.de   → the live site
//   pnpm test:player <url> --browsers=webkit
//
// Once per computer: npx playwright install chromium firefox webkit
// Chrome runs with the strict autoplay rule (sound only from a click), like
// the VS Code preview; Firefox blocks autoplay too. WebKit is close to an
// iPhone, but a real iPhone is still the final word.
import { chromium, firefox, webkit, devices } from 'playwright';

const args = process.argv.slice(2);
const base = (args.find((a) => !a.startsWith('--')) || 'http://localhost:3005').replace(/\/$/, '');
const only = args.find((a) => a.startsWith('--browsers='))?.split('=')[1]?.split(',');

const BROWSERS = [
  {
    name: 'chrome',
    type: chromium,
    launch: { args: ['--autoplay-policy=user-gesture-required'] },
    context: { viewport: { width: 1400, height: 900 } },
  },
  {
    name: 'firefox',
    type: firefox,
    launch: { firefoxUserPrefs: { 'media.autoplay.default': 1, 'media.autoplay.blocking_policy': 2 } },
    context: { viewport: { width: 1400, height: 900 } },
  },
  {
    name: 'iphone (webkit)',
    type: webkit,
    launch: {},
    context: { ...devices['iPhone 15'] },
  },
].filter((b) => !only || only.some((o) => b.name.startsWith(o)));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** State of both audio elements, the bar and the page */
async function snapshot(page) {
  return page.evaluate(() => {
    const media = (id) => {
      const a = document.getElementById(id);
      return a ? { playing: !a.paused, t: a.currentTime, src: a.currentSrc } : null;
    };
    const bar = document.querySelector('[role=region]');
    return {
      archive: media('thfradio-archive-player'),
      live: media('thfradio-live-player'),
      bar: bar ? bar.innerText.replace(/\s+/g, ' ') : null,
      barTime: bar?.querySelector('[data-player-position]')?.textContent ?? null,
      crashed: /Application error|client-side exception/.test(document.body.innerText),
    };
  });
}

async function waitFor(page, test, timeout = 20000) {
  const end = Date.now() + timeout;
  let s;
  while (Date.now() < end) {
    s = await snapshot(page);
    if (s.crashed || test(s)) return s;
    await sleep(500);
  }
  return s;
}

async function run(b) {
  const results = [];
  const check = (name, ok, detail = '') => results.push({ name, ok: !!ok, detail });
  let browser;
  try {
    browser = await b.type.launch({ headless: true, ...b.launch });
  } catch (e) {
    return [{ name: 'launch', ok: false, detail: e.message.split('\n')[0] + ' (npx playwright install ' + b.type.name() + ')' }];
  }
  const context = await browser.newContext(b.context);
  const page = await context.newPage();
  const pageErrors = [];
  const insecure = [];
  page.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 160)));
  page.on('request', (r) => {
    if (r.url().startsWith('http://') && !r.url().startsWith(base)) insecure.push(r.url().slice(0, 90));
  });
  const mobile = !!b.context.isMobile;
  const press = (locator) => (mobile ? locator.tap() : locator.click());

  try {
    await page.goto(`${base}/de`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const tiles = page.getByRole('button', { name: /^Abspielen: / });
    await tiles.first().waitFor({ state: 'visible', timeout: 60000 });
    // Local dev only: the Next.js dev badge sits over the play button on phones
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
    await sleep(2500); // scripts settle (hls.js preload)

    // 1. Archive: one click starts it, time counts, length is known
    await tiles.first().scrollIntoViewIfNeeded();
    await press(tiles.first());
    let s = await waitFor(page, (x) => x.archive?.playing && x.archive.t > 2);
    check('archive starts from one click', s.archive?.playing && s.archive.t > 2, s.archive ? `t=${s.archive.t.toFixed(1)}s` : 'no archive audio');
    check('no tap-to-start popup', !/TIPPEN|TAP PLAY HERE/i.test(s.bar || ''), (s.bar || '').slice(0, 80));
    await sleep(1500);
    s = await snapshot(page);
    check('bar time counts', s.barTime && s.barTime !== '0:00', `bar shows ${s.barTime}`);
    check('length shown', s.bar && !s.bar.includes('--:--'), (s.bar || '').slice(-30));

    // 2. Pause / play from the bar
    const toggle = page.locator('[data-player-toggle]');
    await press(toggle);
    s = await waitFor(page, (x) => x.archive && !x.archive.playing, 5000);
    check('bar pause', s.archive && !s.archive.playing);
    await press(toggle);
    s = await waitFor(page, (x) => x.archive?.playing, 8000);
    check('bar play again', s.archive?.playing);

    // 3. Jump +30 s (buttons are on wider screens) / slider
    if (!mobile) {
      const before = (await snapshot(page)).archive?.t ?? 0;
      await page.getByRole('button', { name: '30 Sekunden vor' }).click();
      s = await waitFor(page, (x) => (x.archive?.t ?? 0) > before + 20, 8000);
      check('+30 s', (s.archive?.t ?? 0) > before + 20, `${before.toFixed(0)} → ${(s.archive?.t ?? 0).toFixed(0)}`);
    }

    // 4. Another track
    const firstSrc = (await snapshot(page)).archive?.src;
    if ((await tiles.count()) > 1) {
      await tiles.nth(1).scrollIntoViewIfNeeded();
      await press(tiles.nth(1));
      s = await waitFor(page, (x) => x.archive?.playing && x.archive.src !== firstSrc && x.archive.t > 1);
      check('second track plays', s.archive?.playing && s.archive.src !== firstSrc, s.archive ? `t=${s.archive.t.toFixed(1)}` : '');
    }

    // 5. Live while the archive plays: no crash, archive stops, live plays
    const liveBtn = page.locator('button[aria-label*="Live Broadcast"]:visible').first();
    await liveBtn.scrollIntoViewIfNeeded();
    await press(liveBtn);
    s = await waitFor(page, (x) => x.live?.playing && x.live.t > 1);
    check('live while archive: no crash', !s.crashed);
    check('live plays', s.live?.playing && s.live.t > 1, s.live ? `t=${s.live.t.toFixed(1)}` : 'no live audio');
    check('archive stopped for live', !s.archive?.playing);
    check('player bar gone during live', !s.bar);

    // 6. Back to the archive: live stops
    await tiles.first().scrollIntoViewIfNeeded();
    await press(tiles.first());
    s = await waitFor(page, (x) => x.archive?.playing && x.archive.t > 1 && !x.live?.playing);
    check('archive after live', s.archive?.playing && !s.live?.playing, `archive=${s.archive?.playing} live=${s.live?.playing}`);

    // 7. Live pause / play
    await press(liveBtn);
    s = await waitFor(page, (x) => x.live?.playing, 15000);
    await press(page.locator('button[aria-label*="Live Broadcast"]:visible').first());
    s = await waitFor(page, (x) => x.live && !x.live.playing, 5000);
    check('live pause', s.live && !s.live.playing);

    // 8. Close the bar
    await press(tiles.first());
    await waitFor(page, (x) => x.archive?.playing, 15000);
    await press(page.getByRole('button', { name: 'Player schließen' }));
    s = await waitFor(page, (x) => !x.bar && !x.archive?.playing, 5000);
    check('close stops the archive', !s.bar && !s.archive?.playing);

    s = await snapshot(page);
    check('page never crashed', !s.crashed);
  } catch (e) {
    check('run', false, e.message.split('\n')[0]);
    await page.screenshot({ path: `player-check-${b.name.split(' ')[0]}.png` }).catch(() => {});
  }
  check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
  check('no plain-http requests', insecure.length === 0, insecure.slice(0, 2).join(' | '));
  await browser.close();
  return results;
}

let failed = 0;
console.log(`Player check on ${base}\n`);
for (const b of BROWSERS) {
  const results = await run(b);
  console.log(b.name);
  for (const r of results) {
    if (!r.ok) failed++;
    console.log(`  ${r.ok ? '✓' : '✗'} ${r.name}${r.detail ? `  (${r.detail})` : ''}`);
  }
  console.log('');
}
console.log(failed ? `${failed} problem(s) found.` : 'Everything works.');
process.exit(failed ? 1 : 0);
