export class SeededNoise {
  private readonly permutation: number[];

  constructor(seed: string) {
    const source = Array.from({ length: 256 }, (_, index) => index);
    let state = hashSeed(seed);
    for (let index = source.length - 1; index > 0; index -= 1) {
      state = mulberryStep(state);
      const swapIndex = state % (index + 1);
      [source[index], source[swapIndex]] = [source[swapIndex], source[index]];
    }
    this.permutation = [...source, ...source];
  }

  noise3(x: number, y: number, z: number): number {
    const floorX = Math.floor(x);
    const floorY = Math.floor(y);
    const floorZ = Math.floor(z);
    const xf = x - floorX;
    const yf = y - floorY;
    const zf = z - floorZ;
    const u = fade(xf);
    const v = fade(yf);
    const w = fade(zf);
    const px = floorX & 255;
    const py = floorY & 255;
    const pz = floorZ & 255;
    const p = this.permutation;
    const aaa = p[p[p[px] + py] + pz];
    const aba = p[p[p[px] + py + 1] + pz];
    const aab = p[p[p[px] + py] + pz + 1];
    const abb = p[p[p[px] + py + 1] + pz + 1];
    const baa = p[p[p[px + 1] + py] + pz];
    const bba = p[p[p[px + 1] + py + 1] + pz];
    const bab = p[p[p[px + 1] + py] + pz + 1];
    const bbb = p[p[p[px + 1] + py + 1] + pz + 1];

    const x1 = lerp(gradient(aaa, xf, yf, zf), gradient(baa, xf - 1, yf, zf), u);
    const x2 = lerp(gradient(aba, xf, yf - 1, zf), gradient(bba, xf - 1, yf - 1, zf), u);
    const y1 = lerp(x1, x2, v);
    const x3 = lerp(gradient(aab, xf, yf, zf - 1), gradient(bab, xf - 1, yf, zf - 1), u);
    const x4 = lerp(gradient(abb, xf, yf - 1, zf - 1), gradient(bbb, xf - 1, yf - 1, zf - 1), u);
    return lerp(y1, lerp(x3, x4, v), w);
  }
}

export function fbm(noise: SeededNoise, x: number, y: number, z: number, octaves: number, lacunarity = 2, gain = 0.5): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let normalization = 0;
  for (let octave = 0; octave < octaves; octave += 1) {
    value += noise.noise3(x * frequency, y * frequency, z * frequency) * amplitude;
    normalization += amplitude;
    frequency *= lacunarity;
    amplitude *= gain;
  }
  return value / normalization;
}

export function ridged(noise: SeededNoise, x: number, y: number, z: number, octaves: number, sharpness: number): number {
  let value = 0;
  let amplitude = 0.58;
  let frequency = 1;
  let weight = 1;
  let normalization = 0;
  for (let octave = 0; octave < octaves; octave += 1) {
    const sample = 1 - Math.abs(noise.noise3(x * frequency, y * frequency, z * frequency));
    const ridge = Math.pow(Math.max(0, sample), 1.1 + sharpness * 2.2) * weight;
    value += ridge * amplitude;
    weight = Math.min(1, ridge * 1.8);
    normalization += amplitude;
    amplitude *= 0.52;
    frequency *= 2.05;
  }
  return value / normalization;
}

function gradient(hash: number, x: number, y: number, z: number): number {
  switch (hash & 15) {
    case 0: return x + y;
    case 1: return -x + y;
    case 2: return x - y;
    case 3: return -x - y;
    case 4: return x + z;
    case 5: return -x + z;
    case 6: return x - z;
    case 7: return -x - z;
    case 8: return y + z;
    case 9: return -y + z;
    case 10: return y - z;
    case 11: return -y - z;
    case 12: return x + y;
    case 13: return -x + y;
    case 14: return -y + z;
    default: return -y - z;
  }
}

function fade(value: number): number {
  return value * value * value * (value * (value * 6 - 15) + 10);
}

function lerp(start: number, end: number, amount: number): number {
  return start + amount * (end - start);
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberryStep(state: number): number {
  state = (state + 0x6d2b79f5) | 0;
  let result = Math.imul(state ^ (state >>> 15), 1 | state);
  result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
  return (result ^ (result >>> 14)) >>> 0;
}
