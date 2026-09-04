import * as THREE from 'three';

export function createTerrainMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0,
  });
}

export function createOceanMaterial(config: { color: string; roughness: number }, sunDirection: THREE.Vector3): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    color: config.color,
    roughness: config.roughness,
    metalness: 0.08,
    transmission: 0.06,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    clearcoat: 0.72,
    clearcoatRoughness: 0.14,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.sunDirection = { value: sunDirection.clone().normalize() };
    shader.vertexShader = `varying vec3 vWorldNormal;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      '#include <worldpos_vertex>\n  vWorldNormal = normalize(mat3(modelMatrix) * objectNormal);',
    );
    shader.fragmentShader = `uniform vec3 sunDirection;\nvarying vec3 vWorldNormal;\n${shader.fragmentShader}`;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `float oceanLight = smoothstep(-0.2, 0.55, dot(normalize(vWorldNormal), sunDirection));
       float glint = pow(max(dot(reflect(-sunDirection, normalize(vWorldNormal)), normalize(cameraPosition - vWorldPosition)), 0.0), 48.0);
       outgoingLight *= mix(0.28, 1.0, oceanLight) + glint * 0.42;
       #include <opaque_fragment>`,
    );
  };
  return material;
}

export function createAtmosphereMaterial(color: string, strength: number, sunDirection: THREE.Vector3): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      atmosphereColor: { value: new THREE.Color(color) },
      atmosphereStrength: { value: strength },
      sunDirection: { value: sunDirection.clone().normalize() },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      void main() {
        vNormal = normalize(mat3(modelMatrix) * normal);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 atmosphereColor;
      uniform float atmosphereStrength;
      uniform vec3 sunDirection;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      void main() {
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float rim = pow(1.0 - max(dot(vNormal, viewDirection), 0.0), 3.4);
        float sun = smoothstep(-0.18, 0.72, dot(vNormal, sunDirection));
        float horizon = smoothstep(0.08, 0.78, rim) * (0.32 + sun * 0.9);
        gl_FragColor = vec4(atmosphereColor, horizon * atmosphereStrength);
      }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}
