import * as THREE from 'three';
import { createAtmosphereMaterial, createOceanMaterial, createTerrainMaterial } from './materials';
import { elevationColor, PlanetConfig, TerrainField } from './terrain';

export class Planet extends THREE.Group {
  private readonly terrainMaterial = createTerrainMaterial();
  private readonly sunDirection: THREE.Vector3;
  private readonly terrainField: TerrainField;
  private terrainMesh: THREE.Mesh;
  private oceanMesh: THREE.Mesh;
  private atmosphereMesh: THREE.Mesh;
  private oceanMaterial: THREE.MeshPhysicalMaterial;
  private atmosphereMaterial: THREE.ShaderMaterial;
  private currentSeed: string;
  private readonly radius = 2.56;

  constructor(config: PlanetConfig, sunDirection: THREE.Vector3) {
    super();
    this.name = 'Planet';
    this.sunDirection = sunDirection.clone().normalize();
    this.currentSeed = config.seed;
    this.terrainField = new TerrainField(config.seed);
    this.terrainMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.terrainMaterial);
    this.oceanMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40), new THREE.MeshPhysicalMaterial());
    this.atmosphereMaterial = createAtmosphereMaterial(config.atmosphere.color, config.atmosphere.strength, this.sunDirection);
    this.atmosphereMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40), this.atmosphereMaterial);
    this.oceanMaterial = createOceanMaterial(config.ocean, this.sunDirection);
    this.oceanMesh.material = this.oceanMaterial;
    this.add(this.terrainMesh, this.oceanMesh, this.atmosphereMesh);
    this.rebuild(config);
  }

  rebuild(config: PlanetConfig): void {
    if (this.currentSeed !== config.seed) {
      this.currentSeed = config.seed;
      this.terrainField.reseed(config.seed);
    }
    const geometry = new THREE.IcosahedronGeometry(this.radius, 5).toNonIndexed();
    const positions = geometry.getAttribute('position');
    const colors = new Float32Array(positions.count * 3);
    const position = new THREE.Vector3();
    const color = new THREE.Color();
    const seaThreshold = (config.ocean.level - 0.5) * 0.56;
    for (let index = 0; index < positions.count; index += 1) {
      position.fromBufferAttribute(positions, index).normalize();
      const sample = this.terrainField.sample(position, config);
      const land = sample.elevation > seaThreshold;
      const displacement = land
        ? Math.max(0, sample.elevation - seaThreshold) * (0.34 + config.terrain.strength * 0.28)
        : -0.025;
      position.multiplyScalar(this.radius + displacement);
      positions.setXYZ(index, position.x, position.y, position.z);
      color.copy(elevationColor(sample, position, config));
      if (!land) color.multiplyScalar(0.42);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    this.terrainMesh.geometry.dispose();
    this.terrainMesh.geometry = geometry;
    this.updateSurface(config);
  }

  updateSurface(config: PlanetConfig): void {
    const oceanRadius = this.radius - 0.12 + config.ocean.level * 0.23;
    this.oceanMesh.scale.setScalar(oceanRadius);
    this.oceanMaterial.color.set(config.ocean.color);
    this.oceanMaterial.roughness = config.ocean.roughness;
    this.oceanMaterial.clearcoatRoughness = 0.08 + config.ocean.roughness * 0.55;
    this.atmosphereMesh.scale.setScalar(this.radius + 0.11 + config.atmosphere.height * 0.16);
    this.atmosphereMaterial.uniforms.atmosphereColor.value.set(config.atmosphere.color);
    this.atmosphereMaterial.uniforms.atmosphereStrength.value = config.atmosphere.strength;
  }

  dispose(): void {
    this.terrainMesh.geometry.dispose();
    this.terrainMaterial.dispose();
    this.oceanMesh.geometry.dispose();
    this.oceanMaterial.dispose();
    this.atmosphereMesh.geometry.dispose();
    this.atmosphereMaterial.dispose();
  }
}
