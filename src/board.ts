// The Babsha board for the website. Layout, labels and landmarks come from the game's scene code;
// everything you see is lit, shadowed and reflective here: lacquered plinth, gold inlay, emerald felt,
// ceramic tiles, lacquer dice, a rolling rickshaw. The page drives it; nothing here reads game state.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { dressers } from './models/dressing';
import { Scenery, glowMats, windowTexture, windowLights, type TileFrame } from './models/scenery';
import cfg from './data/scene.json';
import tilesData from './data/tiles.json';
import en from './data/en.json';

const SERIF = '"Hanken Grotesk", system-ui, sans-serif';
const DISPLAY = '"Gloock", "Times New Roman", serif';
const CELL = 264;
const LABEL_SCALE = 150;

// Three looks for the board, switchable with ?theme= for comparing.
export type ThemeName = 'heritage' | 'emerald' | 'obsidian' | 'ceramic';
const RAINBOW = ['224,38,47', '236,62,140', '247,198,49', '18,165,181', '36,67,160'];
const THEMES = {
  heritage: { plinth: '#0A3322', metal: 0.35, rough: 0.3, inlay: '#D4B35E', felt: ['#1b8a5f', '#0f5c40', '#06301f'], tile: '#E4D8B8', face: ['#F1E6CC', '#E2D4AE'], emblem: '212,179,94', floor: '#07140f',
    hues: ['212,179,94', '241,230,204', '200,35,44'], kites: ['#F1E6CC', '#D4B35E', '#C8232C', '#13694A'], bokeh: ['#ffe9b0', '#ffcf85', '#F1E6CC'], tones: ['#17302a', '#1d3a31', '#22382f', '#2a3b33'] },
  emerald: { plinth: '#0e1413', metal: 0.55, rough: 0.3, inlay: '#D9B25F', felt: ['#17855e', '#0d5f43', '#05301f'], tile: '#E6DCC6', face: ['#EAE1CD', '#DCD0B7'], emblem: '217,178,95', floor: '#0b100e' },
  obsidian: { plinth: '#08090b', metal: 0.7, rough: 0.22, inlay: '#cfd5de', felt: ['#2a3f73', '#16244a', '#070d1f'], tile: '#DEDBD3', face: ['#E6E3DB', '#D4D0C6'], emblem: '207,213,222', floor: '#06070a' },
  ceramic: { plinth: '#e6dfd0', metal: 0.05, rough: 0.35, inlay: '#d79c80', felt: ['#1b8a82', '#0f6862', '#073d3a'], tile: '#E8DFCC', face: ['#EFE6D3', '#DFD3BA'], emblem: '243,226,200', floor: '#14110e' },
} as const;
const FELT_HALF = 4.5; // half the inner green field (board half 6.1 minus the 1.6 tile depth)

interface Tile { pos: number; id: string; type: string; nameKey: string; group?: string }
interface Placement { x: number; z: number; w: number; d: number; inward: THREE.Vector2 }

const TILES = tilesData.tiles as Tile[];
const N = TILES.length;
const nameOf = (t: Tile) => (en as Record<string, string>)[t.nameKey] ?? t.id;
const groups = cfg.colors.groups as Record<string, string>;

export type Ride = 'rickshaw' | 'cng' | 'bus';

export interface BoardOptions { pixelRatio: number; quality: 'high' | 'low'; theme: ThemeName }

export class Board {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(32, 1, 0.1, 160);
  readonly hemi: THREE.HemisphereLight;
  readonly sun: THREE.DirectionalLight;
  readonly rim: THREE.DirectionalLight;
  readonly stars: THREE.Points;
  readonly sky: THREE.ShaderMaterial;
  readonly dice: THREE.Mesh[] = [];
  readonly token = new THREE.Group();
  private readonly rides = {} as Record<Ride, { g: THREE.Group; wheels: Array<{ g: THREE.Group; r: number }> }>;
  private ride: Ride = 'rickshaw';
  private lastYaw = 0;
  private lean = 0;
  private dustAcc = 0;
  private readonly trail = new THREE.Group();
  private dust!: { pts: THREE.Points; pos: Float32Array; vel: Float32Array; life: Float32Array; n: number; i: number };
  private readonly composer: EffectComposer | null;
  private readonly half: number;
  private readonly placements: Placement[];
  private readonly landmarkIds = new Set<string>();
  private readonly T;
  private skylineMat!: THREE.MeshStandardMaterial;
  private readonly kites: Array<{ m: THREE.Group; base: THREE.Vector3; ph: number; size: number }> = [];

  constructor(canvas: HTMLCanvasElement, private readonly opts: BoardOptions) {
    const high = opts.quality === 'high';
    this.T = THEMES[opts.theme] ?? THEMES.emerald;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !high, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(opts.pixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.8;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.half = (9 * cfg.board.tileWidth + 2 * cfg.board.tileDepth) / 2;
    this.placements = TILES.map((t) => this.place(t.pos));

    const pm = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    this.scene.fog = new THREE.Fog('#0b1613', 20, 80);

    this.hemi = new THREE.HemisphereLight('#8fa7d6', '#0a0f0d', 0.4);
    this.sun = new THREE.DirectionalLight('#ffd9a8', 2.4);
    this.sun.castShadow = true;
    const sh = this.sun.shadow;
    sh.mapSize.set(high ? 2048 : 1024, high ? 2048 : 1024);
    sh.camera.left = sh.camera.bottom = -9;
    sh.camera.right = sh.camera.top = 9;
    sh.camera.near = 1;
    sh.camera.far = 50;
    sh.bias = -0.0004;
    sh.normalBias = 0.03;
    this.rim = new THREE.DirectionalLight('#4f78c8', 0.5);
    this.rim.position.set(6, 6, -9);
    this.scene.add(this.hemi, this.sun, this.sun.target, this.rim, this.camera);

    // sky dome and stars ride with the camera so they never show parallax
    this.sky = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color('#03070a') }, horizon: { value: new THREE.Color('#0b1613') } },
      vertexShader: 'varying float vy; void main(){ vy = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 horizon; varying float vy; void main(){ gl_FragColor = vec4(mix(horizon, top, smoothstep(-0.05, 0.75, vy)), 1.0); }',
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(120, 24, 12), this.sky);
    dome.renderOrder = -2;
    this.camera.add(dome);
    this.stars = this.makeStars();
    this.camera.add(this.stars);

    this.buildFloor();
    this.buildSkyline();
    this.buildKites();
    this.buildBoard();
    this.buildTiles();
    this.buildLabels();
    this.buildLandmarks();
    this.dice.push(this.makeDie('#F6EEDC', '#1E1B18'), this.makeDie('#D8222B', '#FBF4E4'));
    this.scene.add(...this.dice);
    this.buildVehicles();
    this.makeMotionRigs();
    this.scene.add(this.token);

    if (high) {
      const size = this.renderer.getSize(new THREE.Vector2());
      const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
      this.composer = new EffectComposer(this.renderer, rt);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.2, 0.6, 1.2));
      this.composer.addPass(new OutputPass());
    } else this.composer = null;
  }

  resize(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer?.setPixelRatio(this.opts.pixelRatio);
    this.composer?.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render(): void {
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  // Window lights come on as the day fades.
  setNight(n: number): void {
    for (const m of glowMats) m.emissiveIntensity = n * 0.9;
    this.skylineMat.emissiveIntensity = n * 0.22;
    this.scene.environmentIntensity = 0.24 + (1 - n) * 0.2;
    
  }

  // Kites drift and bob in the sky; call every frame.
  animate(t: number): void {
    for (const k of this.kites) {
      k.m.position.set(k.base.x + Math.sin(t * 0.21 + k.ph) * 0.9, k.base.y + Math.sin(t * 0.55 + k.ph) * 0.7, k.base.z + Math.cos(t * 0.19 + k.ph) * 0.9);
      k.m.rotation.z = Math.sin(t * 0.5 + k.ph) * 0.22;
      // a kite that drifts near the lens shrinks away instead of blocking the view
      const d = k.m.position.distanceTo(this.camera.position);
      k.m.scale.setScalar(k.size * THREE.MathUtils.smoothstep(d, 14, 26));
    }
  }

  // ---------- layout (same loop as the game: GO bottom right, clockwise) ----------

  private place(pos: number): Placement {
    const { tileWidth: w, tileDepth: d } = cfg.board;
    const h = this.half;
    const side = Math.floor(pos / 10);
    const k = pos % 10;
    const corner = k === 0;
    const along = corner ? 0 : h - d - (k - 0.5) * w;
    const edge = h - d / 2;
    switch (side) {
      case 0: return corner ? { x: edge, z: edge, w: d, d, inward: new THREE.Vector2(-1, -1).normalize() } : { x: along, z: edge, w, d, inward: new THREE.Vector2(0, -1) };
      case 1: return corner ? { x: -edge, z: edge, w: d, d, inward: new THREE.Vector2(1, -1).normalize() } : { x: -edge, z: along, w: d, d: w, inward: new THREE.Vector2(1, 0) };
      case 2: return corner ? { x: -edge, z: -edge, w: d, d, inward: new THREE.Vector2(1, 1).normalize() } : { x: -along, z: -edge, w, d, inward: new THREE.Vector2(0, 1) };
      default: return corner ? { x: edge, z: -edge, w: d, d, inward: new THREE.Vector2(-1, 1).normalize() } : { x: edge, z: -along, w: d, d: w, inward: new THREE.Vector2(-1, 0) };
    }
  }

  private frameOf(p: Placement): TileFrame {
    const diag = Math.abs(p.inward.x) > 0.1 && Math.abs(p.inward.y) > 0.1;
    const inward = diag ? new THREE.Vector2(0, Math.sign(p.inward.y)) : p.inward.clone();
    const along = new THREE.Vector2(-inward.y, inward.x);
    const vertical = Math.abs(inward.x) > 0.5;
    return { center: new THREE.Vector3(p.x, cfg.board.tileHeight, p.z), along, inward, width: vertical ? p.d : p.w, depth: vertical ? p.w : p.d };
  }

  center(pos: number): THREE.Vector3 {
    const p = this.placements[((pos % N) + N) % N]!;
    return new THREE.Vector3(p.x, 0.45, p.z);
  }

  private spot(pos: number): THREE.Vector3 {
    const i = ((pos % N) + N) % N;
    const p = this.placements[i]!;
    const push = this.landmarkIds.has(TILES[i]!.id) ? -0.42 : 0;
    return new THREE.Vector3(p.x + p.inward.x * push, cfg.board.tileHeight, p.z + p.inward.y * push);
  }

  private spotAt(a: number): THREE.Vector3 {
    const i = Math.floor(a), f = a - i;
    return this.spot(i).lerp(this.spot(i + 1), f);
  }

  focusAt(a: number): THREE.Vector3 {
    const i = Math.floor(a), f = a - i;
    return this.center(i).lerp(this.center(i + 1), f);
  }

  // Where dice come to rest: on the green, a few steps in from tile `pos`.
  landing(pos: number): THREE.Vector3 {
    const p = this.placements[((pos % N) + N) % N]!;
    const x = THREE.MathUtils.clamp(p.x + p.inward.x * 1.7, -FELT_HALF + 0.9, FELT_HALF - 0.9);
    const z = THREE.MathUtils.clamp(p.z + p.inward.y * 1.7, -FELT_HALF + 0.9, FELT_HALF - 0.9);
    return new THREE.Vector3(x, 0.05 + 0.36, z);
  }

  setRide(r: Ride): void {
    this.ride = r;
    (Object.keys(this.rides) as Ride[]).forEach((k) => { this.rides[k].g.visible = k === r; });
  }

  // The vehicle rolls: it faces where it is going, its wheels turn with the distance covered, and it
  // leans into corners. `dt` lets the lean follow the turning rate.
  placeToken(a: number, dt = 0.016): void {
    const here = this.spotAt(a), ahead = this.spotAt(a + 0.35);
    this.token.position.copy(here);
    const dx = ahead.x - here.x, dz = ahead.z - here.z;
    if (Math.abs(dx) + Math.abs(dz) > 1e-4) {
      const yaw = Math.atan2(-dz, dx);
      let d = yaw - this.lastYaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      const rate = d / Math.max(dt, 0.001);
      this.lean += (THREE.MathUtils.clamp(-rate * 0.05, -0.2, 0.2) - this.lean) * Math.min(1, dt * 8);
      this.lastYaw = yaw;
      this.token.rotation.order = 'YXZ';
      this.token.rotation.y = yaw;
      this.token.rotation.x = this.lean;
    }
    for (const w of this.rides[this.ride].wheels) w.g.rotation.z = -a / w.r;
  }

  // Speed cues: gold speed streaks behind the pawn, dust puffs from the rear wheels, a camera FOV kick.
  motion(speed01: number, dt: number): void {
    const s = THREE.MathUtils.clamp(speed01, 0, 1);
    this.trail.children.forEach((m, i) => {
      const len = (0.12 + s * 0.95) * (0.6 + 0.4 * ((i * 37) % 5) / 4);
      m.scale.x = Math.max(0.001, len);
      m.position.x = -0.5 - len / 2;
      (m as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>).material.opacity = s * 0.55;
    });
    const fov = 32 + s * 5;
    if (Math.abs(this.camera.fov - fov) > 0.05) { this.camera.fov += (fov - this.camera.fov) * Math.min(1, dt * 6); this.camera.updateProjectionMatrix(); }
    const d = this.dust;
    const yaw = this.token.rotation.y, fx = Math.cos(yaw), fz = -Math.sin(yaw);
    this.dustAcc += s * dt * 40;
    while (this.dustAcc >= 1) {
      this.dustAcc -= 1;
      const k = d.i++ % d.n;
      const r = () => (Math.random() - 0.5) * 0.18;
      d.pos[k * 3] = this.token.position.x - fx * 0.55 + r();
      d.pos[k * 3 + 1] = this.token.position.y + 0.06;
      d.pos[k * 3 + 2] = this.token.position.z - fz * 0.55 + r();
      d.vel[k * 3] = -fx * 0.25 + r() * 2; d.vel[k * 3 + 1] = 0.35 + Math.random() * 0.3; d.vel[k * 3 + 2] = -fz * 0.25 + r() * 2;
      d.life[k] = 1;
    }
    const col = d.pts.geometry.attributes['color'] as THREE.BufferAttribute;
    for (let k = 0; k < d.n; k++) {
      if (d.life[k]! <= 0) { col.setXYZ(k, 0, 0, 0); continue; }
      d.life[k] = d.life[k]! - dt * 1.4;
      d.pos[k * 3] = d.pos[k * 3]! + d.vel[k * 3]! * dt;
      d.pos[k * 3 + 1] = d.pos[k * 3 + 1]! + d.vel[k * 3 + 1]! * dt;
      d.pos[k * 3 + 2] = d.pos[k * 3 + 2]! + d.vel[k * 3 + 2]! * dt;
      const l = Math.max(0, d.life[k]!) * 0.5;
      col.setXYZ(k, 0.85 * l, 0.8 * l, 0.62 * l);
    }
    col.needsUpdate = true;
    (d.pts.geometry.attributes['position'] as THREE.BufferAttribute).needsUpdate = true;
  }

  private makeMotionRigs(): void {
    const mat = () => new THREE.MeshBasicMaterial({ color: '#F1D98A', transparent: true, opacity: 0, depthWrite: false, fog: false });
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.035), mat());
      m.rotation.x = -Math.PI / 2; // lies flat, streak along local x
      m.position.set(-0.6, 0.06 + (i % 3) * 0.1, (i - 2.5) * 0.09);
      this.trail.add(m);
    }
    this.token.add(this.trail);
    const n = 40;
    const pos = new Float32Array(n * 3).fill(-50), col = new Float32Array(n * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const sc = document.createElement('canvas');
    sc.width = sc.height = 64;
    const sg = sc.getContext('2d')!;
    const rg = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    sg.fillStyle = rg; sg.fillRect(0, 0, 64, 64);
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: new THREE.CanvasTexture(sc), size: 0.34, sizeAttenuation: true, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    pts.frustumCulled = false;
    this.scene.add(pts);
    this.dust = { pts, pos, vel: new Float32Array(n * 3), life: new Float32Array(n), n, i: 0 };
  }

  // ---------- floor, plinth, felt ----------

  private buildFloor(): void {
    const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 96), new THREE.MeshStandardMaterial({ map: this.floorTexture(), roughness: 0.7, metalness: 0 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.46;
    floor.receiveShadow = true;
    const apron = new THREE.Mesh(new THREE.CircleGeometry(130, 48), new THREE.MeshStandardMaterial({ color: '#041a12', roughness: 0.8 }));
    apron.rotation.x = -Math.PI / 2;
    apron.position.y = -0.47;
    this.scene.add(floor, apron);
  }

  // An alpona-style mandala under the board, dense near the edge so no corner of the frame is empty.
  private floorTexture(): THREE.CanvasTexture {
    const S = 1536, PX = S / 120; // covers a disc of radius 60 units
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d')!;
    const rg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    rg.addColorStop(0, '#14543b');
    rg.addColorStop(0.5, '#0d3b2a');
    rg.addColorStop(1, '#062418');
    g.fillStyle = rg;
    g.fillRect(0, 0, S, S);
    g.translate(S / 2, S / 2);
    g.lineWidth = 2;
    const hues = (this.T as { hues?: string[] }).hues ?? RAINBOW;
    for (let ring = 0; ring < 10; ring++) {
      const R = (8.2 + ring * 4.6) * PX, n = 22 + ring * 6, size = (1.5 + ring * 0.28) * PX;
      const fade = 1 - ring * 0.065;
      g.strokeStyle = `rgba(${this.T.emblem},${0.7 * fade})`;
      for (let i = 0; i < n; i++) {
        g.save();
        g.rotate((i / n) * Math.PI * 2 + (ring % 2) * (Math.PI / n));
        g.translate(R, 0);
        g.fillStyle = `rgba(${hues[(i + ring) % hues.length]},${0.5 * fade})`;
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(size * 0.45, -size * 0.4, size, 0); g.quadraticCurveTo(size * 0.45, size * 0.4, 0, 0); g.fill(); g.stroke();
        g.fillStyle = `rgba(${this.T.emblem},${0.8 * fade})`;
        g.beginPath(); g.arc(size * 1.32, 0, 0.09 * PX + 1.4, 0, Math.PI * 2); g.fill();
        g.restore();
      }
      g.beginPath(); g.arc(0, 0, R + size * 1.7, 0, Math.PI * 2); g.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }

  private buildBoard(): void {
    const H = this.half;
    const plinth = new THREE.Mesh(
      new RoundedBoxGeometry(2 * H + 0.9, 0.46, 2 * H + 0.9, 8, 0.16),
      new THREE.MeshPhysicalMaterial({ color: this.T.plinth, roughness: this.T.rough, metalness: this.T.metal, clearcoat: 0.7, clearcoatRoughness: 0.2 }),
    );
    plinth.position.y = -0.2;
    plinth.castShadow = plinth.receiveShadow = true;
    this.scene.add(plinth);

    const gold = new THREE.MeshStandardMaterial({ color: this.T.inlay, roughness: 0.24, metalness: 1 });
    const bars: THREE.BufferGeometry[] = [];
    const frame = (half: number, w: number, h: number, y: number) => {
      const len = 2 * half + w;
      for (const [x, z, sx, sz] of [[0, half, len, w], [0, -half, len, w], [half, 0, w, len], [-half, 0, w, len]] as const) {
        const g = new RoundedBoxGeometry(sx, h, sz, 3, Math.min(w, h) / 2.2);
        g.translate(x, y, z);
        bars.push(g);
      }
    };
    frame(H + 0.2, 0.11, 0.08, 0.04); // outer inlay
    frame(FELT_HALF + 0.03, 0.045, 0.05, 0.115); // fine line around the felt
    const goldMesh = new THREE.Mesh(mergeGeometries(bars)!, gold);
    goldMesh.castShadow = true;
    this.scene.add(goldMesh);

    const felt = new THREE.Mesh(new THREE.PlaneGeometry(FELT_HALF * 2, FELT_HALF * 2), new THREE.MeshStandardMaterial({ map: this.feltTexture(), roughness: 0.95, metalness: 0 }));
    felt.rotation.x = -Math.PI / 2;
    felt.position.y = 0.045;
    felt.receiveShadow = true;
    this.scene.add(felt);
  }

  private feltTexture(): THREE.CanvasTexture {
    const S = 1536;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d')!;
    const rg = g.createRadialGradient(S / 2, S / 2, S * 0.05, S / 2, S / 2, S * 0.72);
    rg.addColorStop(0, this.T.felt[0]);
    rg.addColorStop(0.55, this.T.felt[1]);
    rg.addColorStop(1, this.T.felt[2]);
    g.fillStyle = rg;
    g.fillRect(0, 0, S, S);
    // felt grain: a small noise tile laid over the whole field (cheap, unlike a per-pixel pass)
    const nc = document.createElement('canvas');
    nc.width = nc.height = 256;
    const ng = nc.getContext('2d')!;
    const img = ng.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (Math.random() - 0.5) * 120; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    ng.putImageData(img, 0, 0);
    g.save();
    g.globalCompositeOperation = 'overlay';
    g.globalAlpha = 0.35;
    g.fillStyle = g.createPattern(nc, 'repeat')!;
    g.fillRect(0, 0, S, S);
    g.restore();
    // fine gold geometry: diamond lattice, rings
    g.strokeStyle = `rgba(${this.T.emblem},0.10)`;
    g.lineWidth = 2;
    for (let k = -S; k < S * 2; k += 128) {
      g.beginPath(); g.moveTo(k, 0); g.lineTo(k + S, S); g.stroke();
      g.beginPath(); g.moveTo(k + S, 0); g.lineTo(k, S); g.stroke();
    }
    const cx = S / 2, cy = S / 2;
    g.strokeStyle = `rgba(${this.T.emblem},0.85)`;
    g.lineWidth = 5; g.beginPath(); g.arc(cx, cy, S * 0.285, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, S * 0.27, 0, Math.PI * 2); g.stroke();
    // four small T seals on the ring, like a maker's marks
    for (const [sx, sy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
      const px = cx + sx * S * 0.285, py = cy + sy * S * 0.285;
      g.fillStyle = this.T.felt[2]; g.beginPath(); g.arc(px, py, 38, 0, Math.PI * 2); g.fill();
      g.strokeStyle = g.fillStyle = `rgba(${this.T.emblem},0.9)`; g.lineWidth = 3;
      g.beginPath(); g.arc(px, py, 38, 0, Math.PI * 2); g.stroke();
      drawT(g, px, py, 34);
    }
    // emblem: the two dice
    const die = (x: number, y: number, rot: number, fill: string, pip: string) => {
      g.save(); g.translate(x, y); g.rotate(rot);
      g.fillStyle = fill; g.beginPath(); g.roundRect(-85, -85, 170, 170, 38); g.fill();
      g.fillStyle = pip;
      for (const [px, py] of [[-34, -44], [-34, 0], [-34, 44], [34, -44], [34, 0], [34, 44]] as const) { g.beginPath(); g.arc(px, py, 13, 0, Math.PI * 2); g.fill(); }
      g.restore();
    };
    die(cx - 80, cy - 215, -0.17, 'rgba(246,238,220,0.96)', '#14201a');
    die(cx + 80, cy - 240, 0.15, 'rgba(216,34,43,0.96)', '#FBF4E4');
    g.fillStyle = `rgba(${this.T.emblem},0.95)`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `400 250px ${DISPLAY}`;
    g.fillText('Babsha', cx, cy + 40);
    g.font = `700 52px ${SERIF}`;
    g.fillStyle = `rgba(${this.T.emblem},0.8)`;
    (g as unknown as { letterSpacing: string }).letterSpacing = '22px';
    g.fillText('THE GAME OF DHAKA', cx + 11, cy + 215);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }

  // ---------- tiles: ceramic slabs, glossy colour bars, one label atlas ----------

  private buildTiles(): void {
    const { board, dressing } = cfg;
    const slabs: THREE.BufferGeometry[] = [];
    const bars: THREE.BufferGeometry[] = [];
    const ivory = new THREE.Color(this.T.tile);
    const tint = (g: THREE.BufferGeometry, c: THREE.Color) => {
      const n = g.attributes['position']!.count;
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      g.deleteAttribute('uv');
      return g;
    };
    TILES.forEach((t, i) => {
      const p = this.placements[i]!;
      const slab = new RoundedBoxGeometry(p.w * 0.965, board.tileHeight, p.d * 0.965, 3, 0.03);
      slab.translate(p.x, board.tileHeight / 2, p.z);
      slabs.push(tint(slab, ivory));
      if (t.group) {
        const f = this.frameOf(p);
        const vertical = Math.abs(f.inward.x) > 0.5;
        const long = (vertical ? p.d : p.w) * 0.86, thick = 0.15;
        const bar = new RoundedBoxGeometry(vertical ? thick : long, 0.04, vertical ? long : thick, 3, 0.016);
        const off = f.depth / 2 - dressing.houseLane / 2 - 0.01;
        bar.translate(p.x + f.inward.x * off, board.tileHeight + 0.015, p.z + f.inward.y * off);
        bars.push(tint(bar, new THREE.Color(groups[t.group]!)));
      }
    });
    const slabMesh = new THREE.Mesh(mergeGeometries(slabs)!, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.18 }));
    slabMesh.castShadow = slabMesh.receiveShadow = true;
    const barMesh = new THREE.Mesh(mergeGeometries(bars)!, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.16, metalness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 }));
    barMesh.castShadow = barMesh.receiveShadow = true;
    this.scene.add(slabMesh, barMesh);
  }

  private buildLabels(): void {
    const cols = 8;
    const canvas = document.createElement('canvas');
    canvas.width = CELL * cols;
    canvas.height = CELL * Math.ceil(N / cols);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 16;
    const geos = TILES.map((_, i) => {
      const p = this.placements[i]!;
      const g = new THREE.PlaneGeometry(p.w * 0.9, p.d * 0.9);
      const [cw, ch] = [Math.round(p.w * LABEL_SCALE), Math.round(p.d * LABEL_SCALE)];
      const [cx, cy] = [(i % cols) * CELL + 4, Math.floor(i / cols) * CELL + 4];
      const uv = g.attributes['uv']!;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, (cx + uv.getX(k) * cw) / canvas.width, 1 - (cy + (1 - uv.getY(k)) * ch) / canvas.height);
      g.rotateX(-Math.PI / 2);
      g.translate(p.x, cfg.board.tileHeight + 0.004, p.z);
      return g;
    });
    const mesh = new THREE.Mesh(mergeGeometries(geos)!, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0 }));
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    const g = canvas.getContext('2d')!;
    TILES.forEach((t, i) => {
      g.save();
      g.translate((i % cols) * CELL + 4, Math.floor(i / cols) * CELL + 4);
      this.drawLabel(g, t, this.placements[i]!);
      g.restore();
    });
    tex.needsUpdate = true;
  }

  private drawLabel(g: CanvasRenderingContext2D, t: Tile, p: Placement): void {
    const W = Math.round(p.w * LABEL_SCALE), H = Math.round(p.d * LABEL_SCALE);
    const { dressing } = cfg;
    const face = g.createLinearGradient(0, 0, W, H);
    face.addColorStop(0, this.T.face[0]);
    face.addColorStop(1, this.T.face[1]);
    g.fillStyle = face;
    g.fillRect(0, 0, W, H);
    const diag = Math.abs(p.inward.x) > 0.1 && Math.abs(p.inward.y) > 0.1;
    const ix = diag ? 0 : p.inward.x, iz = diag ? Math.sign(p.inward.y) : p.inward.y;
    let rx = 0, ry = 0, rw = W, rh = H;
    if (this.landmarkIds.has(t.id)) {
      const share = dressing.textShare;
      if (iz < -0.5) { rh = H * share; ry = H - rh; } else if (iz > 0.5) rh = H * share; else if (ix > 0.5) rw = W * share; else { rw = W * share; rx = W - rw; }
    } else if (t.group) {
      const band = Math.round(dressing.houseLane * LABEL_SCALE);
      if (iz < -0.5) { ry = band; rh = H - band; } else if (iz > 0.5) rh = H - band; else if (ix > 0.5) rw = W - band; else { rx = band; rw = W - band; }
    }
    if (t.type === 'property' || t.type === 'hub' || t.type === 'utility') {
      const pad = Math.round(0.12 * LABEL_SCALE);
      if (iz < -0.5) rh -= pad; else if (iz > 0.5) { ry += pad; rh -= pad; } else if (ix > 0.5) { rx += pad; rw -= pad; } else rw -= pad;
    }
    g.fillStyle = '#1E1B18';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    let size = Math.round(Math.min(rw * 0.26, rh * 0.3, this.landmarkIds.has(t.id) ? 34 : 46));
    let lines: string[] = [];
    for (; size > 10; size -= 2) {
      g.font = `800 ${size}px ${SERIF}`;
      lines = wrap(g, nameOf(t), rw * 0.92).slice(0, 3);
      if (lines.length * size * 1.08 <= rh - 8) break;
    }
    g.font = `800 ${size}px ${SERIF}`;
    const top = ry + rh / 2 - (lines.length * size * 1.08) / 2 + size * 0.54;
    lines.forEach((line, k) => g.fillText(line, rx + rw / 2, top + k * size * 1.08, rw * 0.94));
  }

  private buildLandmarks(): void {
    const { colors, dressing, lighting } = cfg;
    const kit = { palette: colors.palette, shadowOpacity: lighting.shadowOpacity, font: SERIF, cameraDir: new THREE.Vector2(0, 1) };
    const all = dressers(dressing.textShare, dressing.houseLane);
    for (const t of TILES) {
      const dress = all[t.id];
      if (!dress) continue;
      const L = new Scenery(kit);
      dress(L, this.frameOf(this.placements[t.pos]!), nameOf(t)); // English signs
      this.scene.add(L.build());
      this.landmarkIds.add(t.id);
    }
  }

  // ---------- dice: lacquer, rounded, pips match the game's face layout ----------

  private makeDie(bg: string, pip: string): THREE.Mesh {
    const S = 0.72;
    const g = new RoundedBoxGeometry(S, S, S, 5, 0.11);
    const values = [3, 4, 1, 6, 2, 5]; // +x -x +y -y +z -z, opposite faces add to 7
    const pos = g.attributes['position']!, nor = g.attributes['normal']!, uv = g.attributes['uv']!;
    for (let k = 0; k < pos.count; k++) {
      const nx = nor.getX(k), ny = nor.getY(k), nz = nor.getZ(k);
      const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
      let face: number, u: number, v: number;
      if (ax >= ay && ax >= az) { face = nx > 0 ? 0 : 1; u = pos.getZ(k) * Math.sign(nx); v = pos.getY(k); }
      else if (ay >= az) { face = ny > 0 ? 2 : 3; u = pos.getX(k); v = pos.getZ(k) * -Math.sign(ny); }
      else { face = nz > 0 ? 4 : 5; u = pos.getX(k) * Math.sign(nz); v = pos.getY(k); }
      const val = values[face]! - 1;
      const [cx, cy] = [(val % 3) / 3, Math.floor(val / 3) / 2];
      const lu = THREE.MathUtils.clamp(u / S + 0.5, 0, 1), lv = THREE.MathUtils.clamp(v / S + 0.5, 0, 1);
      uv.setXY(k, cx + lu / 3, 1 - cy - (1 - lv) / 2);
    }
    const mesh = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ map: diceAtlas(bg, pip), roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 }));
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  }

  // ---------- the rides: rickshaw, CNG, bus, each with separate wheels so they can turn ----------

  private buildVehicles(): void {
    const paint = (color: string, rough = 0.28) => new THREE.MeshPhysicalMaterial({ color, roughness: rough, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.1 });
    const chrome = new THREE.MeshStandardMaterial({ color: '#d8dde0', roughness: 0.15, metalness: 1 });
    const rubber = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.8 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#0d1b2b', roughness: 0.05, metalness: 0.2, clearcoat: 1 });
    const lamp = new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffe08a', emissiveIntensity: 0.9 });
    const brake = new THREE.MeshStandardMaterial({ color: '#ff3b3b', emissive: '#ff2020', emissiveIntensity: 0.5 });
    const badge = new THREE.MeshStandardMaterial({ map: tBadge(), transparent: true, roughness: 0.4, metalness: 0.3, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false });
    const kit = (kind: Ride, scale: number) => {
      const g = new THREE.Group();
      const wheels: Array<{ g: THREE.Group; r: number }> = [];
      const part = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        m.rotation.set(rx, ry, rz);
        m.castShadow = m.receiveShadow = true;
        g.add(m);
        return m;
      };
      const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
      // the T roundel: flat on the roof (the camera looks down), and one on each flank
      const tBack = (x: number, y: number, z: number, size: number) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), badge);
        m.position.set(x, y, z);
        m.rotation.y = -Math.PI / 2;
        g.add(m);
      };
      const tmark = (x: number, y: number, z: number, size: number) => {
        for (const side of [1, -1]) {
          const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), badge);
          m.position.set(x, y, z * side);
          m.rotation.y = side > 0 ? 0 : Math.PI;
          g.add(m);
        }
      };
      // Each ride has its own wheel: thin spoked wire wheels, small fat solid-hub tires, big bolted bus wheels.
      const steel = new THREE.MeshStandardMaterial({ color: '#9aa3a8', roughness: 0.35, metalness: 0.85 });
      const wheel = (x: number, z: number, r: number, style: 'spoke' | 'solid' | 'bus') => {
        const w = new THREE.Group();
        const add = (geo: THREE.BufferGeometry, mat: THREE.Material, px = 0, py = 0, pz = 0) => {
          const m = new THREE.Mesh(geo, mat);
          m.position.set(px, py, pz);
          w.add(m);
          return m;
        };
        const disc = (rad: number, depth: number) => new THREE.CylinderGeometry(rad, rad, depth, 28).rotateX(Math.PI / 2);
        if (style === 'spoke') {
          add(new THREE.TorusGeometry(r, r * 0.07, 8, 44), rubber);
          add(new THREE.TorusGeometry(r * 0.9, r * 0.028, 6, 44), chrome);
          for (let i = 0; i < 16; i++) add(new THREE.BoxGeometry(r * 1.8, r * 0.014, r * 0.014), chrome).rotation.z = (i * Math.PI) / 16;
          add(disc(r * 0.1, r * 0.22), chrome);
        } else if (style === 'solid') {
          add(disc(r, 0.09), rubber);
          add(disc(r * 0.58, 0.098), steel);
          for (let i = 0; i < 5; i++) {
            const an = (i / 5) * Math.PI * 2;
            for (const dz of [0.052, -0.052]) add(new THREE.SphereGeometry(r * 0.07, 6, 5), chrome, Math.cos(an) * r * 0.34, Math.sin(an) * r * 0.34, dz);
          }
        } else {
          add(disc(r, 0.14), rubber);
          add(disc(r * 0.66, 0.148), steel);
          add(disc(r * 0.24, 0.156), chrome);
          for (let i = 0; i < 8; i++) {
            const an = (i / 8) * Math.PI * 2;
            for (const dz of [0.077, -0.077]) add(new THREE.SphereGeometry(r * 0.045, 6, 5), chrome, Math.cos(an) * r * 0.46, Math.sin(an) * r * 0.46, dz);
          }
        }
        w.position.set(x, r + 0.02, z);
        w.traverse((o) => { o.castShadow = true; });
        g.add(w);
        wheels.push({ g: w, r });
      };
      g.scale.setScalar(scale);
      this.token.add(g);
      this.rides[kind] = { g, wheels };
      return { part, box, wheel, tmark, tBack };
    };

    { // rickshaw: red, cream and yellow, painted hood
      const { part, box, wheel, tmark, tBack } = kit('rickshaw', 1.5);
      const red = paint('#E0262F'), cream = paint('#F6EEDC'), yellow = paint('#F7C631'), teal = paint('#12A5B5'), pink = paint('#EC3E8C');
      wheel(-0.17, 0.17, 0.13, 'spoke'); wheel(-0.17, -0.17, 0.13, 'spoke'); wheel(0.24, 0, 0.11, 'spoke');
      part(box(0.62, 0.04, 0.2), red, 0.02, 0.17, 0);
      part(box(0.34, 0.1, 0.26), cream, -0.12, 0.23, 0);
      part(box(0.04, 0.2, 0.26), cream, -0.28, 0.3, 0);
      part(box(0.34, 0.012, 0.28), yellow, -0.12, 0.282, 0);
      part(box(0.4, 0.03, 0.012), teal, -0.1, 0.19, 0.105);
      part(box(0.4, 0.03, 0.012), teal, -0.1, 0.19, -0.105);
      const hood = part(new THREE.CylinderGeometry(0.17, 0.17, 0.32, 18, 1, true, 0, Math.PI), red, -0.1, 0.34, 0, Math.PI / 2, 0, Math.PI / 2);
      (hood.material as THREE.MeshPhysicalMaterial).side = THREE.DoubleSide;
      part(new THREE.CylinderGeometry(0.01, 0.01, 0.22, 6), chrome, 0.07, 0.43, 0.14, 0, 0, 0.5);
      part(new THREE.CylinderGeometry(0.01, 0.01, 0.22, 6), chrome, 0.07, 0.43, -0.14, 0, 0, 0.5);
      part(new THREE.CylinderGeometry(0.014, 0.014, 0.3, 8), chrome, 0.22, 0.26, 0, 0, 0, 0.15);
      part(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 8).rotateX(Math.PI / 2), chrome, 0.19, 0.4, 0);
      part(new THREE.SphereGeometry(0.03, 10, 8), pink, 0.31, 0.3, 0);
      tmark(0, 0.23, 0.1325, 0.065); // the only flank strip clear of the spoked wheels
      tBack(-0.302, 0.3, 0, 0.13);
    }
    { // CNG auto: green body, black roof, yellow stripe
      const { part, box, wheel, tmark, tBack } = kit('cng', 1.25);
      const green = paint('#2E9E4F'), roof = paint('#16201b', 0.4), yellow = paint('#F7C631');
      wheel(0.3, 0, 0.1, 'solid'); wheel(-0.2, 0.19, 0.11, 'solid'); wheel(-0.2, -0.19, 0.11, 'solid');
      part(box(0.7, 0.14, 0.36), green, 0, 0.21, 0);
      part(box(0.68, 0.025, 0.372), yellow, 0, 0.27, 0);
      part(box(0.42, 0.26, 0.36), green, -0.12, 0.4, 0);
      part(box(0.2, 0.15, 0.3), green, 0.3, 0.29, 0);
      part(box(0.5, 0.035, 0.4), roof, -0.1, 0.545, 0);
      part(box(0.02, 0.18, 0.3), glass, 0.1, 0.42, 0, 0, 0, -0.32);
      part(box(0.24, 0.12, 0.012), glass, -0.12, 0.43, 0.185);
      part(box(0.24, 0.12, 0.012), glass, -0.12, 0.43, -0.185);
      part(box(0.012, 0.1, 0.26), glass, -0.335, 0.43, 0);
      part(new THREE.SphereGeometry(0.035, 10, 8), lamp, 0.4, 0.3, 0);
      part(box(0.014, 0.04, 0.05), brake, -0.355, 0.26, 0.12);
      part(box(0.014, 0.04, 0.05), brake, -0.355, 0.26, -0.12);
      part(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8).rotateX(Math.PI / 2), chrome, 0.2, 0.37, 0);
      tmark(0.1, 0.205, 0.1825, 0.1);
    }
    { // bus: blue body, window band, yellow stripe
      const { part, box, wheel, tmark, tBack } = kit('bus', 0.95);
      const blue = paint('#2443A0'), cream = paint('#F6EEDC'), yellow = paint('#F7C631');
      wheel(0.32, 0.165, 0.115, 'bus'); wheel(0.32, -0.165, 0.115, 'bus'); wheel(-0.3, 0.165, 0.115, 'bus'); wheel(-0.3, -0.165, 0.115, 'bus');
      part(box(1.04, 0.3, 0.32), blue, 0, 0.29, 0);
      part(box(1.0, 0.03, 0.3), cream, 0, 0.455, 0);
      part(box(0.92, 0.1, 0.326), glass, -0.02, 0.35, 0);
      part(box(0.012, 0.13, 0.27), glass, 0.52, 0.34, 0);
      part(box(1.045, 0.03, 0.322), yellow, 0, 0.205, 0);
      part(new THREE.SphereGeometry(0.03, 10, 8), lamp, 0.525, 0.22, 0.1);
      part(new THREE.SphereGeometry(0.03, 10, 8), lamp, 0.525, 0.22, -0.1);
      part(box(0.014, 0.04, 0.06), brake, -0.525, 0.23, 0.11);
      part(box(0.014, 0.04, 0.06), brake, -0.525, 0.23, -0.11);
      tmark(-0.02, 0.262, 0.1625, 0.085);
    }
    this.setRide('rickshaw');
  }

  // ---------- the world around the board: skyline, kites, lights ----------

  private buildSkyline(): void {
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const geos: THREE.BufferGeometry[] = [];
    const tones = (this.T as { tones?: string[] }).tones ?? ['#27373a', '#2f403c', '#363c45', '#413f3b', '#29394a', '#3a4a43'];
    for (let i = 0; i < 300; i++) {
      const a = rnd() * Math.PI * 2, r = 26 + rnd() * 70;
      const w = 1.6 + rnd() * 3.4, d = 1.6 + rnd() * 3.4, h = 3 + Math.pow(rnd(), 2.1) * 30;
      const g = new THREE.BoxGeometry(w, h, d);
      const uv = g.attributes['uv']!;
      const [u, v] = [Math.max(1, Math.round(w * 0.9)), Math.max(1, Math.round(h * 0.8))];
      for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * u, uv.getY(k) * v);
      g.rotateY(rnd() * Math.PI);
      g.translate(Math.cos(a) * r, h / 2 - 0.46, Math.sin(a) * r);
      const c = new THREE.Color(tones[Math.floor(rnd() * tones.length)]!);
      const arr = new Float32Array(g.attributes['position']!.count * 3);
      for (let k = 0; k < arr.length; k += 3) { arr[k] = c.r; arr[k + 1] = c.g; arr[k + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      geos.push(g);
    }
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, map: windowTexture(), emissiveMap: windowLights(), emissive: new THREE.Color('#f6e7c1'), emissiveIntensity: 0 });
    this.skylineMat = mat; // dimmer than the board's own windows so it reads as distance, not glare
    this.scene.add(new THREE.Mesh(mergeGeometries(geos)!, mat));
  }

  private buildKites(): void {
    const colors = (this.T as { kites?: string[] }).kites ?? ['#E0262F', '#EC3E8C', '#F7C631', '#12A5B5', '#2443A0', '#EE7D2B'];
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + Math.random() * 0.2, r = 30 + Math.random() * 22;
      const m = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: colors[i % colors.length]!, roughness: 0.6, side: THREE.DoubleSide, emissive: colors[i % colors.length]!, emissiveIntensity: 0.12 });
      const body = new THREE.Mesh(new THREE.CircleGeometry(1, 4).scale(0.75, 1.05, 1), mat);
      const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 3), new THREE.MeshBasicMaterial({ color: colors[(i + 2) % colors.length]!, side: THREE.DoubleSide }));
      tail.position.y = -2.5;
      m.add(body, tail);
      const base = new THREE.Vector3(Math.cos(a) * r, 7 + Math.random() * 16, Math.sin(a) * r);
      m.position.copy(base);
      m.lookAt(0, base.y, 0);
      const size = 0.9 + Math.random() * 0.8;
      m.scale.setScalar(size);
      this.scene.add(m);
      this.kites.push({ m, base, ph: Math.random() * 6.28, size });
    }
  }

  private buildBokeh(): THREE.Points {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, 'rgba(255,255,255,1)');
    rg.addColorStop(0.45, 'rgba(255,255,255,0.35)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, 64, 64);
    const n = 90;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const palette = ((this.T as { bokeh?: string[] }).bokeh ?? ['#ffcf85', '#ff8fb8', '#7fe0e8', '#ffe9b0']).map((h) => new THREE.Color(h));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = 12 + Math.random() * 40;
      pos.set([Math.cos(a) * r, 1 + Math.random() * 15, Math.sin(a) * r], i * 3);
      const k = palette[i % palette.length]!;
      col.set([k.r, k.g, k.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: new THREE.CanvasTexture(c), vertexColors: true, size: 2.4, sizeAttenuation: true, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.scene.add(pts);
    return pts;
  }

  private makeStars(): THREE.Points {
    const n = 520;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, e = 0.1 + Math.random() * 1.2, r = 100;
      pos.set([Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const s = new THREE.Points(g, new THREE.PointsMaterial({ color: '#FFF4E0', size: 0.55, sizeAttenuation: true, transparent: true, opacity: 1, fog: false, depthWrite: false }));
    s.renderOrder = -1;
    return s;
  }
}

function wrap(g: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (g.measureText(next).width > max && line) { lines.push(line); line = w; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

// The house mark: a small serif T drawn from rectangles so it never waits on a font.
function drawT(g: CanvasRenderingContext2D, cx: number, cy: number, h: number): void {
  const w = h * 0.74, t = h * 0.17;
  g.fillRect(cx - w / 2, cy - h / 2, w, t); // bar
  g.fillRect(cx - t / 2, cy - h / 2, t, h); // stem
  g.fillRect(cx - w / 2, cy - h / 2, t * 0.5, t * 1.9); // bar ends
  g.fillRect(cx + w / 2 - t * 0.5, cy - h / 2, t * 0.5, t * 1.9);
  g.fillRect(cx - w * 0.2, cy + h / 2 - t * 0.5, w * 0.4, t * 0.5); // foot
}

// Gold roundel with the T, for the rides: transparent outside the ring.
function tBadge(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.strokeStyle = g.fillStyle = '#C79A2E';
  g.lineWidth = 6;
  g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2); g.stroke();
  drawT(g, 64, 64, 62);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function diceAtlas(bg: string, pip: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 384;
  c.height = 256;
  const g = c.getContext('2d')!;
  const spots: Record<number, Array<[number, number]>> = {
    1: [[32, 32]], 2: [[19, 19], [45, 45]], 3: [[19, 19], [32, 32], [45, 45]],
    4: [[19, 19], [45, 19], [19, 45], [45, 45]], 5: [[19, 19], [45, 19], [32, 32], [19, 45], [45, 45]],
    6: [[19, 16], [45, 16], [19, 32], [45, 32], [19, 48], [45, 48]],
  };
  for (let v = 1; v <= 6; v++) {
    const ox = ((v - 1) % 3) * 128, oy = Math.floor((v - 1) / 3) * 128;
    g.fillStyle = bg;
    g.fillRect(ox, oy, 128, 128);
    g.fillStyle = pip;
    for (const [x, y] of spots[v]!) { g.beginPath(); g.arc(ox + x * 2, oy + y * 2, 12.5, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 0.4; drawT(g, ox + 64, oy + 96, 16); g.globalAlpha = 1; // clear of every pip layout
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// Rotation that turns face `v` upward, for the layout +x=3, -x=4, +y=1, -y=6, +z=2, -z=5.
export function faceUp(v: number): THREE.Euler {
  switch (v) {
    case 1: return new THREE.Euler(0, 0, 0);
    case 6: return new THREE.Euler(Math.PI, 0, 0);
    case 2: return new THREE.Euler(-Math.PI / 2, 0, 0);
    case 5: return new THREE.Euler(Math.PI / 2, 0, 0);
    case 3: return new THREE.Euler(0, 0, Math.PI / 2);
    default: return new THREE.Euler(0, 0, -Math.PI / 2);
  }
}
