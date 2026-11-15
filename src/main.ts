// Scroll journey. One fixed canvas; the camera, token, dice and light all come from one scroll position.
// Chapters: 0 hero, 1 GO, 2..9 stops, 10 features, 11 play.
// Each stop's travel is the dice total between the two tiles, so the pips shown always equal the hops taken.

import './style.css';
import '@fontsource/bricolage-grotesque/600.css';
import '@fontsource/bricolage-grotesque/700.css';
import '@fontsource/bricolage-grotesque/800.css';
import * as THREE from 'three';
import { createIcons, Users, Bot, Gavel, Handshake, Hammer, Smartphone, ArrowRight, ChevronDown, Sparkles } from 'lucide';
import { Board, faceUp, type Ride, type ThemeName } from './board';
import tilesData from './data/tiles.json';
import cardsData from './data/cards.json';
import en from './data/en.json';

const root = document.documentElement;
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const TAKA = '৳';
const money = (n: number) => `${TAKA}${n.toLocaleString('en-US')}`;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- static content filled from the game's own data ----------

interface Tile { pos: number; id: string; type: string; nameKey: string; group?: string }
const TILES = tilesData.tiles as Tile[];
const en_ = en as Record<string, string>;
const groups: Record<string, string> = { brown: '#8A5232', light_blue: '#67BFE6', pink: '#EC3E8C', orange: '#EE7D2B', red: '#E0262F', yellow: '#F7C631', green: '#2E9E4F', dark_blue: '#2443A0' };

function fillContent(): void {
  createIcons({ icons: { Users, Bot, Gavel, Handshake, Hammer, Smartphone, ArrowRight, ChevronDown, Sparkles } });
  const chipOf = (t: Tile) => {
    const chip = document.createElement('span');
    const sw = document.createElement('i');
    sw.style.setProperty('--c', t.group ? groups[t.group]! : '#FBF4E4');
    chip.append(sw, en_[t.nameKey] ?? t.id);
    return chip;
  };
  document.querySelectorAll<HTMLElement>('.panel[data-tile]').forEach((p) => {
    const t = TILES.find((x) => x.id === p.dataset['tile']);
    const slot = p.querySelector('.tilechip');
    if (t && slot) { const c = chipOf(t); c.className = 'chip'; slot.replaceWith(c); }
  });
  const track = document.getElementById('track')!;
  const buyable = TILES.filter((t) => t.type === 'property' || t.type === 'hub' || t.type === 'utility');
  for (let rep = 0; rep < 2; rep++) for (const t of buyable) { const c = chipOf(t); c.className = 'chip'; if (rep) c.setAttribute('aria-hidden', 'true'); track.append(c); }
  const allCards = Object.values(cardsData.decks).flat() as Array<{ id: string; textKey: string; effect: { amount?: number } }>;
  const cards = document.getElementById('cards')!;
  for (const [id, label, color] of [['lucky_10', 'Lucky', '#C42A72'], ['dohs_06', 'DOHS', '#0E7C88']] as const) {
    const c = allCards.find((x) => x.id === id);
    if (!c) continue;
    const el = document.createElement('div');
    el.className = 'card';
    const head = document.createElement('b');
    head.textContent = label;
    head.style.background = color;
    const body = document.createElement('span');
    body.textContent = (en_[c.textKey] ?? '').replace('{amount}', money(c.effect.amount ?? 0));
    el.append(head, body);
    cards.append(el);
  }
}

// ---------- the dice plan: made once per visit, so scrolling back replays the same rolls ----------

const STOP_POS = [0, 3, 8, 10, 15, 20, 32, 36, 39]; // chapters 1..9
const absAt = (k: number) => (k <= 1 ? 0 : k >= 10 ? 39 : STOP_POS[k - 1]!);
type Roll = { a: number; b: number };
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]!;
function split(total: number): Roll {
  const o: Roll[] = [];
  for (let a = 1; a <= 6; a++) if (total - a >= 1 && total - a <= 6) o.push({ a, b: total - a });
  return pick(o);
}
// A gap over 3 sometimes becomes doubles then a second roll, like a real turn.
function planRolls(gap: number): Roll[] {
  if (gap >= 4 && Math.random() < 0.45) {
    const ds = [1, 2, 3, 4, 5, 6].filter((d) => 2 * d <= gap - 2);
    if (ds.length) { const d = pick(ds); return [{ a: d, b: d }, split(gap - 2 * d)]; }
  }
  return [split(gap)];
}
const ROLLS: Roll[][] = [];
for (let k = 2; k <= 9; k++) ROLLS[k] = planRolls(absAt(k) - absAt(k - 1));
if (import.meta.env.DEV) for (let k = 2; k <= 9; k++) console.assert(ROLLS[k]!.reduce((n, r) => n + r.a + r.b, 0) === absAt(k) - absAt(k - 1), `rolls for chapter ${k} must sum to the gap`);
const tagOf = (r: Roll) => (r.a !== r.b ? '' : r.a === 6 ? 'Double six!' : r.a === 1 ? 'Snake eyes!' : 'Doubles!');

// ---------- day cycle: night, dawn, noon, golden hour, night ----------

const C = (h: string) => new THREE.Color(h);
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const NIGHT = { hor: C('#0b1613'), top: C('#02060a'), sky: C('#8fa7d6'), gnd: C('#0a0f0d'), hi: 0.3, sun: C('#ffd9a8'), si: 1.7, sp: V(-6, 10, 6), rim: C('#4f78c8'), ri: 0.55, st: 1 };
const CYCLE = [
  { t: 0.0, ...NIGHT },
  { t: 0.12, hor: C('#f3b79c'), top: C('#5f78b8'), sky: C('#ffd0b0'), gnd: C('#5b4a52'), hi: 0.4, sun: C('#ffb98a'), si: 2.2, sp: V(9, 4.5, 7), rim: C('#9db8ff'), ri: 0.4, st: 0.12 },
  { t: 0.4, hor: C('#efe7d8'), top: C('#9dbfe3'), sky: C('#FFF4E0'), gnd: C('#6B5B45'), hi: 0.5, sun: C('#fff1d6'), si: 2.6, sp: V(-5, 11, 8), rim: C('#c5d8ff'), ri: 0.4, st: 0 },
  { t: 0.75, hor: C('#f0a35e'), top: C('#6b4a7a'), sky: C('#ffd59a'), gnd: C('#6a4a35'), hi: 0.4, sun: C('#ff9a4d'), si: 2.5, sp: V(-9, 5, 5), rim: C('#8f7ac8'), ri: 0.4, st: 0 },
  { t: 1.0, ...NIGHT },
];
const tmpC = new THREE.Color();
function applyCycle(b: Board, P: number): void {
  let i = 0;
  while (i < CYCLE.length - 2 && P > CYCLE[i + 1]!.t) i++;
  const a = CYCLE[i]!, c = CYCLE[i + 1]!;
  const f = smooth(0, 1, clamp((P - a.t) / (c.t - a.t)));
  const mix = (dst: THREE.Color, x: THREE.Color, y: THREE.Color) => dst.copy(x).lerp(y, f);
  mix(b.sky.uniforms['top']!.value as THREE.Color, a.top, c.top);
  const hor = mix(b.sky.uniforms['horizon']!.value as THREE.Color, a.hor, c.hor);
  (b.scene.fog as THREE.Fog).color.copy(hor);
  mix(b.hemi.color, a.sky, c.sky);
  mix(b.hemi.groundColor, a.gnd, c.gnd);
  b.hemi.intensity = lerp(a.hi, c.hi, f);
  mix(b.sun.color, a.sun, c.sun);
  b.sun.intensity = lerp(a.si, c.si, f);
  b.sun.position.copy(a.sp).lerp(c.sp, f);
  mix(b.rim.color, a.rim, c.rim);
  b.rim.intensity = lerp(a.ri, c.ri, f);
  const night = lerp(a.st, c.st, f);
  (b.stars.material as THREE.PointsMaterial).opacity = night;
  b.setNight(night);
  void tmpC;
}

// ---------- camera styles per chapter ----------

interface Style { az: number; D: number; H: number; sx: number }
const WIDE: Style = { az: 0, D: 21, H: 15.5, sx: 0 };
function styleOf(k: number): Style {
  if (k <= 0 || k >= 10) return WIDE;
  const corner = [0, 10, 20].includes(absAt(k));
  const left = k % 2 === 1; // odd chapters keep their panel on the left
  return { az: (left ? 1 : -1) * 0.42, D: corner ? 7.2 : 6.1, H: corner ? 4.6 : 3.9, sx: left ? 1 : -1 };
}

// ---------- boot ----------

const canvas = document.getElementById('gl') as HTMLCanvasElement;
fillContent();

async function boot(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load('700 40px "Noto Sans Bengali"', `${TAKA}0123456789Abc`),
      document.fonts.load('600 30px "Noto Sans Bengali"', `${TAKA}0123456789Abc`),
      document.fonts.load('800 40px "Bricolage Grotesque"', 'Babsha'),
    ]);
    await document.fonts.ready;
  } catch { /* labels fall back to the system font */ }

  if (reduced) { root.classList.remove('locked'); root.classList.add('no-gl', 'ready', 'chosen'); return; } // static page for reduced motion
  let board: Board;
  try {
    const low = matchMedia('(pointer: coarse)').matches || innerWidth < 700;
    const theme = (new URLSearchParams(location.search).get('theme') ?? 'obsidian') as ThemeName;
    board = new Board(canvas, { pixelRatio: Math.min(devicePixelRatio, low ? 1.25 : 1.75), quality: low ? 'low' : 'high', theme });
  } catch {
    root.classList.remove('locked');
    root.classList.add('no-gl', 'ready', 'chosen');
    return;
  }

  let warm = 3; // frames still to draw after a resize, which clears the canvas
  const secs = [...document.querySelectorAll<HTMLElement>('.chapter')];
  const panels = secs.map((s) => s.querySelector<HTMLElement>('.panel'));
  const tops: number[] = [], heights: number[] = [], starts: number[] = [], ends: number[] = [];
  let vh = innerHeight, vw = innerWidth;
  const measure = () => {
    vh = innerHeight; vw = innerWidth;
    board.resize();
    warm = 2;
    secs.forEach((s, k) => {
      const r = s.getBoundingClientRect();
      tops[k] = r.top + scrollY;
      heights[k] = r.height;
      starts[k] = k === 0 ? -Infinity : tops[k]! - (k === 10 ? 1.0 : 0.3) * vh;
      ends[k] = k === 10 ? tops[k]! + 0.4 * vh : tops[k]! + 1.25 * vh; // longer travel: the vehicle moves slower per scroll
    });
  };
  measure();
  addEventListener('resize', measure);
  new ResizeObserver(measure).observe(document.body);

  const hud = document.getElementById('hud')!;
  const hudRoll = hud.querySelector<HTMLElement>('.roll')!;
  const hudTag = hud.querySelector<HTMLElement>('.tag')!;
  let hudKey = '';
  const setHud = (r: Roll | null, on: boolean) => {
    const key = on && r ? `${r.a}${r.b}` : '';
    if (key !== hudKey) {
      hudKey = key;
      hud.classList.toggle('show', !!key);
      if (r) { hudRoll.textContent = `${r.a} + ${r.b} = ${r.a + r.b}`; hudTag.textContent = tagOf(r); hud.classList.toggle('dbl', r.a === r.b); }
    }
  };

  const toCam = new THREE.Vector3(), side = new THREE.Vector3(), land = new THREE.Vector3();
  const qT = new THREE.Quaternion(), qS = new THREE.Quaternion();
  const axes = [new THREE.Vector3(1, 0.6, 0.3).normalize(), new THREE.Vector3(0.4, 1, 0.7).normalize()];
  // Dice are thrown in from the viewer's side and settle on the green felt, on the spot `at`.
  const poseDice = (r: Roll | null, T: number, vis: number, at: THREE.Vector3, camDist: number) => {
    const sc = clamp(camDist / 10, 0.72, 1.7);
    toCam.set(board.camera.position.x - at.x, 0, board.camera.position.z - at.z).normalize();
    side.set(-toCam.z, 0, toCam.x);
    board.dice.forEach((die, i) => {
      die.visible = !!r && vis > 0.01;
      if (!r) return;
      qT.setFromEuler(faceUp(i ? r.b : r.a));
      qS.setFromAxisAngle(axes[i]!, (1 - T) ** 1.4 * (8 * Math.PI + i * Math.PI));
      die.quaternion.copy(qS).multiply(qT);
      const s = sc * Math.max(0.0001, vis);
      const drop = (1 - T) ** 2 * 2.8 * sc + Math.abs(Math.sin(T * Math.PI * 3.2)) * 0.55 * (1 - T) * sc;
      const slide = (1 - T) ** 1.6 * 3.4 * sc;
      const lateral = (i ? 0.62 : -0.62) * sc;
      die.position.set(at.x + side.x * lateral + toCam.x * slide, 0.05 + 0.36 * s + drop, at.z + side.z * lateral + toCam.z * slide);
      die.scale.setScalar(s);
    });
  };

  // hero: loose dice that tumble forever with random rolls, doubles included
  const idleRolls = new Map<number, Roll>();
  const idleRoll = (n: number): Roll => {
    let r = idleRolls.get(n);
    if (!r) {
      const a = 1 + Math.floor(Math.random() * 6);
      r = { a, b: Math.random() < 0.18 ? a : 1 + Math.floor(Math.random() * 6) };
      idleRolls.set(n, r);
    }
    return r;
  };

  // the ride picker: hovering previews the vehicle on the board, a click makes it the pawn and opens the site
  const pick = document.getElementById('pick') as HTMLElement;
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('.ride')];
  let ride: Ride = 'rickshaw';
  buttons.forEach((b) => {
    const r = b.dataset['ride'] as Ride;
    b.addEventListener('mouseenter', () => board.setRide(r));
    b.addEventListener('focus', () => board.setRide(r));
    b.addEventListener('click', () => {
      ride = r;
      board.setRide(r);
      buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      pick.inert = true;
      root.classList.remove('locked');
      root.classList.add('chosen');
      chosenAt = performance.now();
      warm = 3;
    });
  });
  pick.addEventListener('mouseleave', () => board.setRide(ride));

  let ys = scrollY, last = performance.now(), lastDraw = 0, chosenAt = 0;
  const diceAt = new THREE.Vector3();
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const y = scrollY;
    ys = reduced ? y : Math.abs(y - ys) < 0.05 ? y : ys + (y - ys) * (1 - Math.exp(-dt * 4.6));

    let k = 0;
    for (let i = 1; i <= 10; i++) if (ys >= starts[i]!) k = i;
    const u = k === 0 ? 0 : clamp((ys - starts[k]!) / (ends[k]! - starts[k]!));
    const idle = k <= 1;
    if (!chosenAt && now - lastDraw < 66) return; // hidden behind the picker: draw at ~15 fps
    const still = y === ys && !idle && warm <= 0;
    if (still && now - lastDraw < 33) return; // nothing is moving: redraw at ~30 fps so kites still drift
    lastDraw = now;
    warm = Math.max(0, warm - 1);

    // token position along the loop, and the dice on screen
    let tokenAbs = absAt(k);
    let roll: Roll | null = null, T = 1, vis = 0;
    if (k >= 2 && k <= 9) {
      const rolls = ROLLS[k]!;
      const R = rolls.length;
      const r = Math.min(R - 1, Math.floor(u * R));
      const v = clamp(u * R - r);
      let done = 0;
      for (let i = 0; i < r; i++) done += rolls[i]!.a + rolls[i]!.b;
      const steps = rolls[r]!.a + rolls[r]!.b;
      tokenAbs = absAt(k - 1) + done + steps * smooth(0.42, 0.98, v);
      diceAt.copy(board.landing(absAt(k - 1) + done));
      if (u > 0 && u < 1) { roll = rolls[r]!; T = clamp(v / 0.38); vis = smooth(0, 0.08, v) * (1 - smooth(0.84, 0.98, v)); }
    } else if (idle && !reduced) {
      const cyc = 4.6, t = now / 1000;
      const n = Math.floor(t / cyc), v = (t % cyc) / cyc;
      roll = idleRoll(n);
      diceAt.set(0, 0.41, 1.9);
      T = clamp(v / 0.34);
      vis = smooth(0, 0.05, v) * (1 - smooth(0.84, 0.98, v)) * (k === 1 ? 1 - u : 1);
    }

    // camera
    const aspect = vw / vh;
    const pk = aspect < 1 ? Math.pow(1 / aspect, 0.7) : 1;
    const from = styleOf(k - 1), to = styleOf(k);
    const e = smooth(0, 1, u);
    // the reveal: after the pick the camera glides in from a wider, higher view
    const rv = chosenAt ? smooth(0, 2200, now - chosenAt) : 0;
    const pull = k <= 1 ? 1 + (1 - rv) * 0.5 : 1;
    const st: Style = { az: lerp(from.az, to.az, e), D: lerp(from.D, to.D, e) * pk * pull, H: lerp(from.H, to.H, e) * pk * pull, sx: lerp(from.sx, to.sx, e) };
    const focus = k === 1 ? new THREE.Vector3().lerpVectors(new THREE.Vector3(0, 0, 0), board.center(0), e)
      : k >= 2 && k <= 9 ? board.focusAt(tokenAbs)
      : k === 10 ? new THREE.Vector3().lerpVectors(board.center(39), new THREE.Vector3(0, 0, 0), e)
      : new THREE.Vector3(0, 0, 0);
    // slow drift in the hero so the board is never still
    const drift = k === 0 && !reduced ? Math.sin(now / 5200) * 0.1 : 0;
    board.camera.position.set(focus.x + Math.sin(st.az + drift) * st.D, focus.y + st.H, focus.z + Math.cos(st.az + drift) * st.D);
    board.camera.lookAt(focus);
    const fog = board.scene.fog as THREE.Fog; // fog scales with distance so the wide shot is never swallowed
    const dist = board.camera.position.distanceTo(focus);
    fog.near = dist * 1.2 + 8; fog.far = dist * 3 + 70;
    const wide = vw > 900;
    const stopWeight = st.D < 10 * pk ? 1 : 0; // panels only matter close to a stop
    const hw = k === 0 ? 1 : k === 1 ? 1 - e : 0; // hero: board sits low, under the headline
    board.camera.setViewOffset(vw, vh, wide ? -st.sx * 0.17 * vw * stopWeight : 0, (wide ? 0 : 0.2 * vh * stopWeight) - (wide ? 0.17 : 0.2) * vh * hw, vw, vh);
    board.placeToken(tokenAbs);
    poseDice(roll, T, vis, diceAt, dist);
    setHud(roll, vis > 0.2);
    applyCycle(board, clamp((ys - tops[1]!) / (tops[10]! - tops[1]!)));

    // overlays
    const hero = 1 - smooth(0.08 * vh, 0.62 * vh, ys);
    root.style.setProperty('--hero', String(hero));
    root.classList.toggle('past-hero', hero < 0.02);
    for (let i = 1; i <= 9; i++) {
      const p = panels[i];
      if (!p) continue;
      const spare = i === 9 ? 0.9 * vh : 0; // the last stop has a spacer while the camera pulls back
      const s = smooth(tops[i]! + 1.3 * vh, tops[i]! + 1.55 * vh, ys) * (1 - smooth(tops[i]! + heights[i]! - spare - 0.55 * vh, tops[i]! + heights[i]! - spare - 0.3 * vh, ys));
      p.style.setProperty('--show', s.toFixed(3));
      p.classList.toggle('on', s > 0.6);
    }
    // the board fades out as the features section takes over the page
    const show = k === 10 ? 1 - smooth(0.45, 1, u) : 1;
    canvas.style.opacity = show.toFixed(3);
    if (show < 0.01) return;
    board.animate(now / 1000);
    board.render();
  };
  board.renderer.setAnimationLoop(frame);
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
}

void boot();
