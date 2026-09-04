import * as THREE from 'three';
import { fbm, ridged, SeededNoise } from './noise';

export interface PlanetConfig {
  seed: string;
  terrain: {
    scale: number;
    strength: number;
    detail: number;
    continentalScale: number;
    snowAmount: number;
  };
  ocean: {
    level: number;
    roughness: number;
    color: string;
  };
  mountains: {
    height: number;
    frequency: number;
    sharpness: number;
  };
  atmosphere: {
    strength: number;
    height: number;
    color: string;
  };
  rotation: {
    enabled: boolean;
    speed: number;
  };
}

export interface TerrainSample {
  elevation: number;
  continent: number;
  mountain: number;
  land: boolean;
}

const direction = new THREE.Vector3();

export class TerrainField {
  private noise: SeededNoise;

  constructor(seed: string) {
    this.noise = new SeededNoise(seed);
  }

  reseed(seed: string): void {
    this.noise = new SeededNoise(seed);
  }

  sample(point: THREE.Vector3, config: PlanetConfig): TerrainSample {
    direction.copy(point).normalize();
    const { terrain, mountains } = config;
    const continental = fbm(
      this.noise,
      direction.x * terrain.continentalScale * 1.12 + 17.4,
      direction.y * terrain.continentalScale * 1.12 - 4.2,
      direction.z * terrain.continentalScale * 1.12 + 9.1,
      4,
      2,
      0.55,
    );
    const basin = fbm(
      this.noise,
      direction.x * terrain.continentalScale * 0.5 - 21,
      direction.y * terrain.continentalScale * 0.5 + 11,
      direction.z * terrain.continentalScale * 0.5 + 3,
      2,
      2,
      0.5,
    ) * 0.18;
    const continent = continental + basin;
    const landMask = smoothstep(-0.11, 0.16, continent);
    const detail = fbm(
      this.noise,
      direction.x * terrain.scale * 2.1 + 2,
      direction.y * terrain.scale * 2.1 - 9,
      direction.z * terrain.scale * 2.1 + 13,
      Math.round(terrain.detail),
      2.03,
      0.48,
    );
    const ridgedMountains = ridged(
      this.noise,
      direction.x * mountains.frequency * 1.7 - 7,
      direction.y * mountains.frequency * 1.7 + 19,
      direction.z * mountains.frequency * 1.7 + 5,
      4,
      mountains.sharpness,
    );
    const mountainMask = smoothstep(0.28, 0.68, continent) * Math.pow(landMask, 1.5);
    const mountain = ridgedMountains * mountainMask;
    const elevation = continent * 0.62 + detail * 0.13 * terrain.strength + mountain * mountains.height * 0.46;
    return {
      elevation,
      continent,
      mountain,
      land: elevation > -0.02,
    };
  }
}

export function elevationColor(sample: TerrainSample, position: THREE.Vector3, config: PlanetConfig): THREE.Color {
  const latitude = Math.abs(position.y / position.length());
  const coldness = Math.max(0, (latitude - 0.48) * 1.4);
  const highlandLine = 0.5;
  const snowLine = 0.58 + (1 - config.terrain.snowAmount) * 0.2;
  const normalized = THREE.MathUtils.clamp(sample.elevation * 0.8 + 0.47, 0, 1);
  const beach = new THREE.Color('#b99e70');
  const lowland = new THREE.Color('#596f4d');
  const highland = new THREE.Color('#84906c');
  const rock = new THREE.Color('#797c76');
  const snow = new THREE.Color('#e4e8e3');
  const color = new THREE.Color();

  if (normalized < 0.31) {
    color.copy(beach).lerp(lowland, normalized / 0.31);
  } else if (normalized < highlandLine) {
    color.copy(lowland).lerp(highland, (normalized - 0.31) / (highlandLine - 0.31));
  } else if (normalized < snowLine) {
    color.copy(highland).lerp(rock, (normalized - highlandLine) / (snowLine - highlandLine));
  } else {
    color.copy(rock).lerp(snow, THREE.MathUtils.clamp((normalized - snowLine) / 0.22, 0, 1));
  }
  if (coldness > 0) color.lerp(snow, coldness * config.terrain.snowAmount * 0.38);
  return color;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const amount = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return amount * amount * (3 - 2 * amount);
}
