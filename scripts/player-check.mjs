#!/usr/bin/env node
// Player check: plays archive and live radio in Chrome, Firefox and Safari's
// engine (WebKit, as an iPhone), the way people click, and reports what works.
//
//   pnpm test:player                       → http://localhost:3005
//   pnpm test:player https://thfradio.de   → the live site
//   pnpm test:player <url> --browsers=webkit
//   pnpm test:player <url> --browsers=vscode   → only the "no AAC" checks
//
// Once per computer: npx playwright install chromium firefox webkit
// Chrome runs with the strict autoplay rule (sound only from a click), like
// the VS Code preview; Firefox blocks autoplay too. WebKit is close to an
// iPhone, but a real iPhone is still the final word. The VS Code preview
// browser has no AAC decoder; that's simulated in Chrome (runNoAac).
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
    // Normal Chrome settings: Mixcloud must start from one click here
    name: 'chrome (normal settings, Mixcloud only)',
    type: chromium,
    launch: {},
    context: { viewport: { width: 1400, height: 900 } },
    mixcloudOnly: true,
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
    if (!b.mixcloudOnly) await soundcloudAndLive(page, press, mobile, check);
    await mixcloud(b, page, press, mobile, check);
    const s = await snapshot(page);
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

/** Archive (SoundCloud, our own audio) and live radio, the way people click. */
async function soundcloudAndLive(page, press, mobile, check) {
  {
    await page.goto(`${base}/de`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const tiles = page.getByRole('button', { name: /^Abspielen: / });
    await tiles.first().waitFor({ state: 'visible', timeout: 60000 });
    // Local dev only: the Next.js dev badge sits over the play button on phones
    await page.waitForLoadState('load', { timeout: 60000 }).catch(() => {}); // page fully running before clicking
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
  }
}

/** Archive page → search a Mixcloud-only show → click its tile. Returns its title. */
async function clickMixcloudTile(page, press) {
  await page.goto(`${base}/de/latest`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  // Newest Mixcloud show of a series that isn't on SoundCloud at all, so the search finds only it
  const title = await page.evaluate(async () => {
    const shows = await (await fetch('/api/cloudShows')).json();
    const series = (n) => (n || '').split('//')[0].trim();
    const onSc = new Set(shows.filter((s) => s.platform === 'soundcloud').map((s) => series(s.name).toLowerCase()));
    const mc = shows
      .filter((s) => s.platform === 'mixcloud' && !onSc.has(series(s.name).toLowerCase()))
      .sort((a, z) => String(z.date).localeCompare(String(a.date)));
    return mc[0] ? series(mc[0].name) : null;
  });
  if (!title) return null;
  const search = page.getByPlaceholder('Sendungen oder Genres suchen');
  await search.waitFor({ timeout: 60000 });
  await page.waitForLoadState('load', { timeout: 60000 }).catch(() => {}); // page fully running before clicking
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await search.fill(title);
  const escaped = title.slice(0, 24).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tile = page.getByRole('button', { name: new RegExp(`^${escaped}.*abspielen$`, 'i') }).first();
  await tile.waitFor({ timeout: 30000 });
  await sleep(1500);
  await tile.scrollIntoViewIfNeeded();
  await press(tile);
  return title;
}

/**
 * A Mixcloud show (older uploads): plays in Mixcloud's widget. Normal Chrome
 * starts it from one click; iPhones and strict browsers need one tap inside
 * the Mixcloud box that opens above the bar.
 */
async function mixcloud(b, page, press, mobile, check) {
  if (b.type === firefox) {
    // Mixcloud needs Google's DRM module (Widevine), which real Firefox has and
    // the test Firefox doesn't
    check('mixcloud', true, 'not testable here: test Firefox has no Widevine; try a real Firefox');
    return;
  }
  const title = await clickMixcloudTile(page, press);
  if (!title) return check('mixcloud show in the archive', false, 'none found');
  const counting = (x) => x.barTime && x.barTime !== '0:00';
  let s = await waitFor(page, (x) => counting(x) || /TIPPEN/i.test(x.bar || ''), 20000);
  const oneClick = counting(s);
  if (b.mixcloudOnly) check('mixcloud starts from one click', oneClick, `"${title}" bar ${s.barTime}`);
  if (!oneClick && /TIPPEN/i.test(s.bar || '')) {
    // Play button of the widget, on its left
    const box = await page.locator('#mixcloud-player').boundingBox();
    if (box) {
      if (mobile) await page.touchscreen.tap(box.x + 87, box.y + box.height / 2);
      else await page.mouse.click(box.x + 87, box.y + box.height / 2);
    }
    s = await waitFor(page, counting, 20000);
  }
  if (!b.mixcloudOnly) {
    check('mixcloud plays', counting(s), `"${title}" ${oneClick ? 'from one click' : 'after a tap in the Mixcloud box'}, bar ${s.barTime}`);
  }
  check('mixcloud: box gone once playing', !/TIPPEN/i.test(s.bar || ''));
  await press(page.getByRole('button', { name: 'Player schließen' }));
}

/**
 * Browsers that can't play AAC. The archive must switch to MP3 by itself.
 *  - 'vscode': no AAC decoder at all, like the preview browser in VS Code
 *    (its Chromium ships without one): the AAC check at page load catches it,
 *    SoundCloud starts in MP3, Mixcloud (AAC only) says so instead of loading
 *  - 'decode': the AAC check passes but playback fails: switch, remember
 *  - 'silent': AAC never arrives, no error at all (the 12 s watchdog)
 */
async function runNoAac(mode) {
  const results = [];
  const check = (name, ok, detail = '') => results.push({ name, ok: !!ok, detail });
  const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=user-gesture-required'] });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  if (mode === 'vscode') {
    await context.addInitScript(() => {
      // Decoding AAC (ADTS or MP4) fails, like a missing decoder
      const dec = BaseAudioContext.prototype.decodeAudioData;
      BaseAudioContext.prototype.decodeAudioData = function (buf, ok, err) {
        const b = new Uint8Array(buf.slice(0, 12));
        const aac = (b[0] === 0xff && (b[1] & 0xf6) === 0xf0) || String.fromCharCode(...b.slice(4, 8)) === 'ftyp';
        if (!aac) return dec.call(this, buf, ok, err);
        const e = new DOMException('Unable to decode audio data', 'EncodingError');
        if (err) setTimeout(() => err(e));
        return Promise.reject(e);
      };
    });
  }
  if (mode === 'decode' || mode === 'vscode') {
    await context.addInitScript(() => {
      const add = MediaSource.prototype.addSourceBuffer;
      MediaSource.prototype.addSourceBuffer = function (type) {
        const sb = add.call(this, type);
        // AAC (not MP3 in MP4): fail like a missing decoder after the first data
        if (/mp4a\.40\.(2|5|29)\b/.test(type)) {
          sb.addEventListener('updateend', () => {
            try {
              if (this.readyState === 'open') this.endOfStream('decode');
            } catch {}
          }, { once: true });
        }
        return sb;
      };
    });
  } else {
    await context.route(/\/aac_160k\//, () => {}); // never answers
  }
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 160)));
  let aacRequests = 0;
  page.on('request', (r) => {
    if (/\/aac_160k\//.test(r.url())) aacRequests++;
  });

  const openAndPlay = async () => {
    await page.goto(`${base}/de`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const tiles = page.getByRole('button', { name: /^Abspielen: / });
    await tiles.first().waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForLoadState('load', { timeout: 60000 }).catch(() => {}); // page fully running before clicking
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
    await sleep(2500);
    await tiles.first().click();
  };

  try {
    await openAndPlay();
    let s = await waitFor(page, (x) => x.archive?.playing && x.archive.t > 2, 35000);
    check('archive plays anyway (MP3)', s.archive?.playing && s.archive.t > 2, s.archive ? `t=${s.archive.t.toFixed(1)}s` : 'no archive audio');
    await sleep(1500);
    s = await snapshot(page);
    check('bar time counts', s.barTime && s.barTime !== '0:00', `bar shows ${s.barTime}`);

    if (mode === 'vscode') {
      check('first track already in MP3 (AAC check at page load)', aacRequests === 0, `aac requests: ${aacRequests}`);
      const press = (l) => l.click();
      await press(page.getByRole('button', { name: 'Player schließen' }));
      const title = await clickMixcloudTile(page, press);
      if (!title) check('mixcloud show in the archive', false, 'none found');
      else {
        const note = page.getByText('Mixcloud läuft in diesem Browser nicht');
        const shown = await note.waitFor({ timeout: 8000 }).then(() => true, () => false);
        check('mixcloud: says it can\'t play here, links to Mixcloud', shown, `"${title}"`);
        check('mixcloud: no endless loading widget', (await page.locator('#mixcloud-player').count()) === 0);
      }
    }
    if (mode === 'decode') {
      const remembered = await page.evaluate(() => localStorage.getItem('thfradio-archive-format'));
      check('remembers MP3 for this browser', remembered === 'mp3', String(remembered));
      // Next visit: straight to MP3, no waiting
      aacRequests = 0;
      await openAndPlay();
      s = await waitFor(page, (x) => x.archive?.playing && x.archive.t > 1, 20000);
      check('next visit starts right away in MP3', s.archive?.playing && aacRequests === 0, `aac requests: ${aacRequests}`);
    }
    s = await snapshot(page);
    check('page never crashed', !s.crashed);
  } catch (e) {
    check('run', false, e.message.split('\n')[0]);
  }
  check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
  await browser.close();
  return results;
}

let failed = 0;
const report = (name, results) => {
  console.log(name);
  for (const r of results) {
    if (!r.ok) failed++;
    console.log(`  ${r.ok ? '✓' : '✗'} ${r.name}${r.detail ? `  (${r.detail})` : ''}`);
  }
  console.log('');
};
console.log(`Player check on ${base}\n`);
for (const b of BROWSERS) report(b.name, await run(b));
if (!only || only.some((o) => o === 'vscode' || o === 'chrome')) {
  report('vscode preview (no AAC decoder)', await runNoAac('vscode'));
  report('AAC check passes but playback fails', await runNoAac('decode'));
  report('AAC never arrives (no error)', await runNoAac('silent'));
}
console.log(failed ? `${failed} problem(s) found.` : 'Everything works.');
process.exit(failed ? 1 : 0);
