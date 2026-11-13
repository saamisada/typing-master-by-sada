import * as THREE from 'three';
import { ArenaTheme } from '../types';
import { ARENA_THEMES, paintWordPlaque } from './textures';

export interface InterceptorHandles {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  thrusterLeft: THREE.Mesh;
  thrusterRight: THREE.Mesh;
  hullMat: THREE.MeshStandardMaterial;
  wingMat: THREE.MeshStandardMaterial;
  accentMat: THREE.MeshStandardMaterial;
  noseEmitter: THREE.Mesh;
}

export function buildInterceptorModel(
  theme: ArenaTheme,
  isSoftwareGl: boolean,
): InterceptorHandles {
  const palette = ARENA_THEMES[theme];
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  // Lift body slightly above shadow disc so bottom-center pivot is grounded at y=0
  bodyGroup.position.y = 0.55;
  root.add(bodyGroup);

  // Material 1: Brushed titanium fuselage (high metalness, low-mid roughness)
  const hullMat = new THREE.MeshStandardMaterial({
    color: palette.hullColor,
    metalness: 0.86,
    roughness: 0.24,
  });

  // Material 2: Matte carbon composite wings (low metalness, higher roughness >= 0.25 delta)
  const wingMat = new THREE.MeshStandardMaterial({
    color: palette.wingColor,
    metalness: 0.22,
    roughness: 0.68,
  });

  // Material 3: Accent trim
  const accentMat = new THREE.MeshStandardMaterial({
    color: palette.accentHex,
    emissive: palette.accentHex,
    emissiveIntensity: 0.55,
    metalness: 0.4,
    roughness: 0.3,
  });

  // Material 4: Optical canopy glass
  const canopyMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    metalness: 0.1,
    roughness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    transmission: isSoftwareGl ? 0 : 0.72,
    transparent: true,
    opacity: isSoftwareGl ? 0.55 : 0.95,
    ior: 1.52,
  });

  // 1. Primary Silhouette: Extruded beveled central fuselage
  const hullShape = new THREE.Shape();
  hullShape.moveTo(0, 1.9);
  hullShape.lineTo(0.42, 0.35);
  hullShape.lineTo(0.5, -1.25);
  hullShape.lineTo(0.24, -1.45);
  hullShape.lineTo(-0.24, -1.45);
  hullShape.lineTo(-0.5, -1.25);
  hullShape.lineTo(-0.42, 0.35);
  hullShape.closePath();

  const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: 0.34,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.07,
    bevelSegments: 3,
  });
  hullGeo.rotateX(-Math.PI / 2);
  hullGeo.center();
  const hullMesh = new THREE.Mesh(hullGeo, hullMat);
  hullMesh.castShadow = !isSoftwareGl;
  hullMesh.receiveShadow = true;
  bodyGroup.add(hullMesh);

  // 2. Swept Delta Wings (ExtrudeGeometry)
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0.32, 0.25);
  wingShape.lineTo(1.95, -0.85);
  wingShape.lineTo(1.85, -1.2);
  wingShape.lineTo(0.36, -0.95);
  wingShape.closePath();

  const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.07,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  wingGeo.rotateX(-Math.PI / 2);

  const rightWing = new THREE.Mesh(wingGeo, wingMat);
  rightWing.position.set(0, -0.03, 0);
  rightWing.castShadow = !isSoftwareGl;
  rightWing.receiveShadow = true;
  bodyGroup.add(rightWing);

  const leftWing = rightWing.clone();
  leftWing.scale.x = -1;
  bodyGroup.add(leftWing);

  // 3. Cockpit Canopy
  const canopyGeo = new THREE.SphereGeometry(0.3, 24, 16);
  canopyGeo.scale(0.85, 0.65, 2.1);
  const canopy = new THREE.Mesh(canopyGeo, canopyMat);
  canopy.position.set(0, 0.26, -0.15);
  bodyGroup.add(canopy);

  // 4. Twin Engine Nacelles
  const nacelleGeo = new THREE.CylinderGeometry(0.16, 0.2, 1.45, 16);
  nacelleGeo.rotateX(Math.PI / 2);
  const nacelleLeft = new THREE.Mesh(nacelleGeo, hullMat);
  nacelleLeft.position.set(-0.48, 0.04, 0.72);
  nacelleLeft.castShadow = !isSoftwareGl;
  bodyGroup.add(nacelleLeft);

  const nacelleRight = nacelleLeft.clone();
  nacelleRight.position.x = 0.48;
  bodyGroup.add(nacelleRight);

  // 5. Twin Glowing Thruster Cones
  const thrusterMat = new THREE.MeshBasicMaterial({
    color: palette.laserHex,
    transparent: true,
    opacity: 0.9,
  });
  const thrusterGeo = new THREE.ConeGeometry(0.14, 0.75, 14);
  thrusterGeo.rotateX(Math.PI / 2);
  const thrusterLeft = new THREE.Mesh(thrusterGeo, thrusterMat);
  thrusterLeft.position.set(-0.48, 0.04, 1.72);
  bodyGroup.add(thrusterLeft);

  const thrusterRight = thrusterLeft.clone();
  thrusterRight.position.x = 0.48;
  bodyGroup.add(thrusterRight);

  // 6. Nose Laser Emitter Needle
  const noseGeo = new THREE.CylinderGeometry(0.025, 0.06, 0.65, 12);
  noseGeo.rotateX(-Math.PI / 2);
  const noseEmitter = new THREE.Mesh(noseGeo, accentMat);
  noseEmitter.position.set(0, 0.0, -1.92);
  bodyGroup.add(noseEmitter);

  // 7. Twin Angled Stabilizer Tail Fins
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(0.45, 0);
  finShape.lineTo(0.65, 0.55);
  finShape.lineTo(0.32, 0.55);
  finShape.closePath();

  const finGeo = new THREE.ExtrudeGeometry(finShape, {
    depth: 0.04,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 1,
  });
  finGeo.rotateY(Math.PI / 2);

  const finLeft = new THREE.Mesh(finGeo, wingMat);
  finLeft.position.set(-0.5, 0.14, 1.15);
  finLeft.rotation.z = 0.28;
  bodyGroup.add(finLeft);

  const finRight = new THREE.Mesh(finGeo, wingMat);
  finRight.position.set(0.5, 0.14, 1.15);
  finRight.rotation.z = -0.28;
  bodyGroup.add(finRight);

  // 8. Wingtip Accent Strakes
  const tipGeo = new THREE.BoxGeometry(0.12, 0.05, 0.55);
  const tipLeft = new THREE.Mesh(tipGeo, accentMat);
  tipLeft.position.set(-1.88, -0.02, 0.95);
  bodyGroup.add(tipLeft);

  const tipRight = tipLeft.clone();
  tipRight.position.x = 1.88;
  bodyGroup.add(tipRight);

  // 9. Belly Keel Fin
  const keelGeo = new THREE.BoxGeometry(0.14, 0.16, 1.5);
  const keel = new THREE.Mesh(keelGeo, wingMat);
  keel.position.set(0, -0.22, 0.15);
  bodyGroup.add(keel);

  return {
    root,
    bodyGroup,
    thrusterLeft,
    thrusterRight,
    hullMat,
    wingMat,
    accentMat,
    noseEmitter,
  };
}

export interface WordDroneTarget {
  id: number;
  word: string;
  typedCount: number;
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  ringMesh: THREE.Mesh;
  plaqueMat: THREE.MeshBasicMaterial;
  plaqueCanvas: HTMLCanvasElement;
  plaqueTexture: THREE.CanvasTexture;
  speed: number;
  laneX: number;
  bobPhase: number;
}

export function createWordDroneTarget(
  id: number,
  word: string,
  laneX: number,
  startZ: number,
  speed: number,
  theme: ArenaTheme,
  maxAnisotropy: number,
): WordDroneTarget {
  const palette = ARENA_THEMES[theme];
  const group = new THREE.Group();
  group.position.set(laneX, 1.15, startZ);

  // Core crystal
  const coreGeo = new THREE.OctahedronGeometry(0.44, 0);
  const coreMat = new THREE.MeshStandardMaterial({
    color: palette.droneCoreHex,
    emissive: palette.droneCoreHex,
    emissiveIntensity: 0.45,
    metalness: 0.75,
    roughness: 0.2,
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  group.add(coreMesh);

  // Outer gyro ring
  const ringGeo = new THREE.TorusGeometry(0.68, 0.055, 10, 28);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.85,
    roughness: 0.28,
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  group.add(ringMesh);

  // Dynamic word plaque floating cleanly above the drone
  const plaqueCanvas = document.createElement('canvas');
  plaqueCanvas.width = 512;
  plaqueCanvas.height = 128;
  paintWordPlaque(plaqueCanvas, word, 0, false, theme);

  const plaqueTexture = new THREE.CanvasTexture(plaqueCanvas);
  plaqueTexture.colorSpace = THREE.SRGBColorSpace;
  plaqueTexture.anisotropy = maxAnisotropy;

  const plaqueMat = new THREE.MeshBasicMaterial({
    map: plaqueTexture,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const aspectWidth = Math.max(3.2, Math.min(5.2, word.length * 0.42 + 1.2));
  const plaqueGeo = new THREE.PlaneGeometry(aspectWidth, 0.95);
  const plaqueMesh = new THREE.Mesh(plaqueGeo, plaqueMat);
  plaqueMesh.position.set(0, 1.25, 0);
  group.add(plaqueMesh);

  return {
    id,
    word,
    typedCount: 0,
    group,
    coreMesh,
    ringMesh,
    plaqueMat,
    plaqueCanvas,
    plaqueTexture,
    speed,
    laneX,
    bobPhase: Math.random() * Math.PI * 2,
  };
}
