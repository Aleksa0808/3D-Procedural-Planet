import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Planet, } from './planet/Planet';
import { PlanetConfig } from './planet/terrain';
import './style.css';

const DEFAULT_CONFIG: PlanetConfig = {
  seed: 'AURELIA-07',
  terrain: { scale: 1.8, strength: 0.78, detail: 5, continentalScale: 0.92, snowAmount: 0.62 },
  ocean: { level: 0.52, roughness: 0.22, color: '#174653' },
  mountains: { height: 0.78, frequency: 2.2, sharpness: 0.7 },
  atmosphere: { strength: 0.62, height: 0.7, color: '#7dc9d1' },
  rotation: { enabled: true, speed: 0.32 },
};

const config = cloneConfig(DEFAULT_CONFIG);
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <main class="app-shell">
    <div class="viewport"><canvas id="webgl" aria-label="Interactive procedural planet viewport"></canvas></div>
    <div class="brand"><span class="brand-mark"></span><span>Orbital / 01</span></div>
    <div class="status"><span class="status-dot"></span><span id="status-text">Live simulation</span></div>
    <aside class="control-panel" aria-label="Planet controls">
      <header class="panel-header">
        <div class="eyebrow">Procedural planet lab</div>
        <h1>Shape a world.</h1>
        <p class="subtitle">A living sphere built from deterministic fields, sunlight, and a little imagination.</p>
      </header>
      <section class="control-section">
        <div class="section-title"><span>PLANET / SEED</span><span class="section-index">01</span></div>
        <div class="seed-row"><input class="seed-input" id="seed" value="${config.seed}" aria-label="Planet seed" spellcheck="false"/><button class="primary-button" id="generate">Generate</button></div>
        <div class="seed-actions"><button class="ghost-button" id="randomize">Randomize</button><button class="ghost-button" id="reset-top">Reset defaults</button></div>
      </section>
      <section class="control-section">
        <div class="section-title"><span>TERRAIN</span><span class="section-index">02</span></div>
        ${rangeMarkup('terrain.scale', 'Terrain scale', 0.5, 5, 0.1, config.terrain.scale, true)}
        ${rangeMarkup('terrain.strength', 'Terrain strength', 0, 1, 0.01, config.terrain.strength, true)}
        ${rangeMarkup('terrain.detail', 'Terrain detail', 1, 8, 1, config.terrain.detail, true, 0)}
        ${rangeMarkup('terrain.continentalScale', 'Continental scale', 0.2, 3, 0.01, config.terrain.continentalScale, true)}
        ${rangeMarkup('terrain.snowAmount', 'Snow amount', 0, 1, 0.01, config.terrain.snowAmount, true)}
      </section>
      <section class="control-section">
        <div class="section-title"><span>OCEAN</span><span class="section-index">03</span></div>
        ${rangeMarkup('ocean.level', 'Sea level', 0.25, 0.78, 0.01, config.ocean.level, true)}
        ${rangeMarkup('ocean.roughness', 'Surface roughness', 0.05, 0.8, 0.01, config.ocean.roughness, false)}
        ${colorMarkup('ocean.color', 'Ocean color', config.ocean.color)}
      </section>
      <section class="control-section">
        <div class="section-title"><span>MOUNTAINS</span><span class="section-index">04</span></div>
        ${rangeMarkup('mountains.height', 'Mountain height', 0, 1.4, 0.01, config.mountains.height, true)}
        ${rangeMarkup('mountains.frequency', 'Mountain frequency', 0.7, 4.5, 0.1, config.mountains.frequency, true)}
        ${rangeMarkup('mountains.sharpness', 'Mountain sharpness', 0, 1, 0.01, config.mountains.sharpness, true)}
      </section>
      <section class="control-section">
        <div class="section-title"><span>ATMOSPHERE</span><span class="section-index">05</span></div>
        ${rangeMarkup('atmosphere.strength', 'Atmosphere strength', 0, 1.2, 0.01, config.atmosphere.strength, false)}
        ${rangeMarkup('atmosphere.height', 'Atmosphere height', 0.2, 1.5, 0.01, config.atmosphere.height, false)}
        ${colorMarkup('atmosphere.color', 'Atmosphere color', config.atmosphere.color)}
      </section>
      <section class="control-section">
        <div class="section-title"><span>ROTATION</span><span class="section-index">06</span></div>
        <div class="field toggle-row"><span class="field-label" style="margin:0">Auto rotate</span><label class="toggle"><input id="rotation-enabled" data-path="rotation.enabled" type="checkbox" ${config.rotation.enabled ? 'checked' : ''}/><span class="toggle-track"></span></label></div>
        ${rangeMarkup('rotation.speed', 'Rotation speed', 0, 1, 0.01, config.rotation.speed, false)}
      </section>
      <footer class="panel-footer"><span id="seed-readout">SEED / ${config.seed}</span><button class="reset-button" id="reset-bottom">Reset all settings</button></footer>
    </aside>
    <div class="hint"><span><kbd>DRAG</kbd> rotate world</span><span><kbd>SCROLL</kbd> zoom camera</span></div>
  </main>
`;

const canvas = document.querySelector<HTMLCanvasElement>('#webgl')!;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#080b0e');
const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0.15, 0.2, 9.35);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.enablePan = false;
controls.minDistance = 4.45;
controls.maxDistance = 14;
controls.autoRotate = config.rotation.enabled;
controls.autoRotateSpeed = config.rotation.speed * 0.95;
controls.target.set(0, 0, 0);

const sunDirection = new THREE.Vector3(-4.5, 2.7, 5.6).normalize();
const sun = new THREE.DirectionalLight('#fff5df', 3.25);
sun.position.copy(sunDirection).multiplyScalar(10);
scene.add(sun);
scene.add(new THREE.HemisphereLight('#a8c8d0', '#101419', 0.19));
const planet = new Planet(config, sunDirection);
planet.rotation.set(-0.11, 0.38, 0.08);
scene.add(planet);
scene.add(createStars());

const resize = (): void => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
};
window.addEventListener('resize', resize);

let rebuildQueued = false;
const queueRebuild = (): void => {
  if (rebuildQueued) return;
  rebuildQueued = true;
  window.requestAnimationFrame(() => {
    rebuildQueued = false;
    planet.rebuild(config);
    setStatus('Field regenerated');
  });
};

for (const input of document.querySelectorAll<HTMLInputElement>('[data-path]')) {
  if (input.type === 'checkbox') {
    input.addEventListener('change', () => {
      setPath(config, input.dataset.path!, input.checked);
      controls.autoRotate = config.rotation.enabled;
      setStatus(config.rotation.enabled ? 'Rotation engaged' : 'Rotation paused');
    });
  } else if (input.type === 'color') {
    input.addEventListener('input', () => {
      setPath(config, input.dataset.path!, input.value);
      planet.updateSurface(config);
    });
  } else {
    input.addEventListener('input', () => {
      const numericValue = Number(input.value);
      setPath(config, input.dataset.path!, numericValue);
      const output = document.querySelector<HTMLElement>(`[data-value-for="${input.dataset.path}"]`);
      if (output) output.textContent = formatValue(numericValue, input.step);
      updateRangeFill(input);
      if (input.dataset.rebuild === 'true') queueRebuild();
      else planet.updateSurface(config);
      if (input.dataset.path?.startsWith('rotation.')) controls.autoRotateSpeed = config.rotation.speed * 0.95;
    });
    updateRangeFill(input);
  }
}

document.querySelector<HTMLButtonElement>('#generate')!.addEventListener('click', () => {
  const seedInput = document.querySelector<HTMLInputElement>('#seed')!;
  config.seed = seedInput.value.trim() || DEFAULT_CONFIG.seed;
  seedInput.value = config.seed;
  planet.rebuild(config);
  updateReadout();
  setStatus('New world generated');
});
document.querySelector<HTMLButtonElement>('#randomize')!.addEventListener('click', () => {
  randomizeConfig();
  syncControls();
  planet.rebuild(config);
  updateReadout();
  setStatus('Random world generated');
});
for (const id of ['reset-top', 'reset-bottom']) {
  document.querySelector<HTMLButtonElement>(`#${id}`)!.addEventListener('click', () => {
    Object.assign(config, cloneConfig(DEFAULT_CONFIG));
    syncControls();
    planet.rebuild(config);
    updateReadout();
    controls.autoRotate = config.rotation.enabled;
    controls.autoRotateSpeed = config.rotation.speed * 0.95;
    setStatus('Defaults restored');
  });
}

const clock = new THREE.Clock();
const animate = (): void => {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();
  planet.children.forEach((child, index) => {
    if (index === 1) child.rotation.y = elapsed * 0.008;
  });
  controls.update();
  renderer.render(scene, camera);
};
animate();
setTimeout(() => document.querySelector('.app-shell')?.classList.add('ready'), 100);

function rangeMarkup(path: string, label: string, min: number, max: number, step: number, value: number, rebuild: boolean, decimals = 2): string {
  return `<div class="field"><div class="field-label"><label for="${path}">${label}</label><span class="value" data-value-for="${path}">${formatValue(value, String(step), decimals)}</span></div><input id="${path}" data-path="${path}" data-rebuild="${rebuild}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" aria-label="${label}"/></div>`;
}

function colorMarkup(path: string, label: string, value: string): string {
  return `<div class="field color-row"><label class="field-label" style="margin:0" for="${path}">${label}</label><input id="${path}" data-path="${path}" type="color" value="${value}" aria-label="${label}"/></div>`;
}

function formatValue(value: number, step: string, decimals?: number): string {
  const places = decimals ?? (step.includes('.') ? Math.min(2, step.split('.')[1].length) : 0);
  return value.toFixed(places);
}

function updateRangeFill(input: HTMLInputElement): void {
  const min = Number(input.min);
  const max = Number(input.max);
  const amount = ((Number(input.value) - min) / (max - min)) * 100;
  input.style.setProperty('--fill', `${amount}%`);
}

function setPath(target: PlanetConfig, path: string, value: unknown): void {
  const pieces = path.split('.');
  let cursor: Record<string, unknown> = target as unknown as Record<string, unknown>;
  for (let index = 0; index < pieces.length - 1; index += 1) cursor = cursor[pieces[index]] as Record<string, unknown>;
  cursor[pieces[pieces.length - 1]] = value;
}

function syncControls(): void {
  const seedInput = document.querySelector<HTMLInputElement>('#seed')!;
  seedInput.value = config.seed;
  for (const input of document.querySelectorAll<HTMLInputElement>('[data-path]')) {
    const value = getPath(config, input.dataset.path!);
    if (input.type === 'checkbox') input.checked = Boolean(value);
    else {
      input.value = String(value);
      if (input.type === 'range') {
        const output = document.querySelector<HTMLElement>(`[data-value-for="${input.dataset.path}"]`);
        if (output) output.textContent = formatValue(Number(value), input.step);
        updateRangeFill(input);
      }
    }
  }
}

function getPath(target: PlanetConfig, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => (value as Record<string, unknown>)[key], target as unknown as Record<string, unknown>);
}

function randomizeConfig(): void {
  config.seed = randomSeed();
  config.terrain.strength = randomBetween(0.58, 0.94);
  config.terrain.continentalScale = randomBetween(0.65, 1.35);
  config.terrain.snowAmount = randomBetween(0.35, 0.82);
  config.ocean.level = randomBetween(0.42, 0.64);
  config.mountains.height = randomBetween(0.48, 1.05);
  config.mountains.frequency = randomBetween(1.55, 3.1);
  config.atmosphere.strength = randomBetween(0.42, 0.8);
}

function randomBetween(min: number, max: number): number { return min + Math.random() * (max - min); }
function randomSeed(): string {
  const bytes = new Uint32Array(2);
  crypto.getRandomValues(bytes);
  return `WORLD-${(bytes[0] ^ bytes[1]).toString(36).toUpperCase().slice(0, 6)}`;
}
function cloneConfig(source: PlanetConfig): PlanetConfig { return JSON.parse(JSON.stringify(source)) as PlanetConfig; }
function updateReadout(): void { document.querySelector('#seed-readout')!.textContent = `SEED / ${config.seed}`; }
function setStatus(message: string): void { document.querySelector('#status-text')!.textContent = message; }

function createStars(): THREE.Points {
  const count = 1700;
  const positions = new Float32Array(count * 3);
  let state = 424242;
  for (let index = 0; index < count; index += 1) {
    state = (Math.imul(state ^ (state >>> 16), 2246822519) + 3266489917) >>> 0;
    const theta = (state / 4294967296) * Math.PI * 2;
    state = (Math.imul(state ^ (state >>> 15), 2246822519) + 3266489917) >>> 0;
    const phi = Math.acos(1 - 2 * (state / 4294967296));
    state = (Math.imul(state ^ (state >>> 13), 2246822519) + 3266489917) >>> 0;
    const radius = 18 + (state / 4294967296) * 34;
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = radius * Math.cos(phi);
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: '#d9e5df', size: 0.035, sizeAttenuation: true, transparent: true, opacity: 0.64, depthWrite: false });
  return new THREE.Points(geometry, material);
}
