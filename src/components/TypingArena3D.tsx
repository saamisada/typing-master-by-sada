import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  Shield,
  Zap,
  Target,
} from 'lucide-react';
import {
  ArenaTheme,
  DifficultyMode,
  GamePhase,
  GameTelemetry,
  PlanTier,
} from '../types';
import { audioSynth } from '../game/audioSynth';
import { getDifficultyConfig, pickWord } from '../game/wordBank';
import {
  ARENA_THEMES,
  createContactShadowTexture,
  createTrackTexture,
  paintWordPlaque,
} from '../game/textures';
import {
  buildInterceptorModel,
  createWordDroneTarget,
  InterceptorHandles,
  WordDroneTarget,
} from '../game/shipModel';

// Pre-allocated math helpers (zero GC in render loop)
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 1, 0);

interface ParticleState {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  colorHex: number;
}

interface LaserBeamState {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

interface TypingArena3DProps {
  userCallsign: string;
  userPlan: PlanTier;
  onScoreRecorded: (entry: {
    wpm: number;
    accuracy: number;
    score: number;
    difficulty: DifficultyMode;
  }) => void;
  onRequireProTheme?: () => void;
  arenaRef?: React.RefObject<HTMLDivElement | null>;
  autoFocusTrigger?: number;
}

export const TypingArena3D: React.FC<TypingArena3DProps> = ({
  userPlan,
  onScoreRecorded,
  onRequireProTheme,
  arenaRef,
  autoFocusTrigger,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [difficulty, setDifficulty] = useState<DifficultyMode>('velocity');
  const [theme, setTheme] = useState<ArenaTheme>('cyber');
  const [muted, setMuted] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [webglLost, setWebglLost] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const [telemetry, setTelemetry] = useState<GameTelemetry>({
    phase: 'title',
    wpm: 0,
    accuracy: 100,
    score: 0,
    combo: 0,
    maxCombo: 0,
    wave: 1,
    shield: 3,
    maxShield: 3,
    wordsCleared: 0,
    targetWords: 24,
    activeTargetWord: null,
    typedBuffer: '',
    lastEventText: 'Ready for launch',
  });

  // Mutable engine ref so React state updates never recreate WebGL context
  const engineRef = useRef<{
    phase: GamePhase;
    difficulty: DifficultyMode;
    theme: ArenaTheme;
    score: number;
    combo: number;
    maxCombo: number;
    wave: number;
    shield: number;
    maxShield: number;
    wordsCleared: number;
    totalKeystrokes: number;
    correctKeystrokes: number;
    startTimeMs: number;
    pausedAccumMs: number;
    pauseStartMs: number;
    spawnTimer: number;
    nextTargetId: number;
    lockedTargetId: number | null;
    targets: WordDroneTarget[];
    shipX: number;
    targetShipX: number;
    recoilZ: number;
    shakeIntensity: number;
    hitstopTimer: number;
    fovCurrent: number;
    trackSpeed: number;
    particles: ParticleState[];
    lasers: LaserBeamState[];
    lastEventText: string;
    scoreSubmitted: boolean;
    applyTheme?: (nextTheme: ArenaTheme) => void;
    syncHud?: () => void;
  }>({
    phase: 'title',
    difficulty: 'velocity',
    theme: 'cyber',
    score: 0,
    combo: 0,
    maxCombo: 0,
    wave: 1,
    shield: 3,
    maxShield: 3,
    wordsCleared: 0,
    totalKeystrokes: 0,
    correctKeystrokes: 0,
    startTimeMs: 0,
    pausedAccumMs: 0,
    pauseStartMs: 0,
    spawnTimer: 0.4,
    nextTargetId: 1,
    lockedTargetId: null,
    targets: [],
    shipX: 0,
    targetShipX: 0,
    recoilZ: 0,
    shakeIntensity: 0,
    hitstopTimer: 0,
    fovCurrent: 58,
    trackSpeed: 14,
    particles: [],
    lasers: [],
    lastEventText: 'Ready for launch',
    scoreSubmitted: false,
  });

  const syncHud = useCallback(() => {
    const st = engineRef.current;
    const cfg = getDifficultyConfig(st.difficulty);
    const now = performance.now();
    const activeElapsedMs =
      st.phase === 'title'
        ? 0
        : (st.phase === 'paused' ? st.pauseStartMs : now) -
          st.startTimeMs -
          st.pausedAccumMs;
    const minutes = Math.max(activeElapsedMs / 60000, 0.04);
    const wpm =
      st.correctKeystrokes > 0
        ? Math.min(240, Math.round(st.correctKeystrokes / 5 / minutes))
        : 0;
    const accuracy =
      st.totalKeystrokes > 0
        ? Math.round((st.correctKeystrokes / st.totalKeystrokes) * 100)
        : 100;

    const locked = st.targets.find((t) => t.id === st.lockedTargetId) || null;

    setTelemetry({
      phase: st.phase,
      wpm,
      accuracy,
      score: st.score,
      combo: st.combo,
      maxCombo: st.maxCombo,
      wave: st.wave,
      shield: st.shield,
      maxShield: st.maxShield,
      wordsCleared: st.wordsCleared,
      targetWords: cfg.targetWords,
      activeTargetWord: locked ? locked.word : null,
      typedBuffer: locked ? locked.word.slice(0, locked.typedCount) : '',
      lastEventText: st.lastEventText,
    });
  }, []);

  useEffect(() => {
    engineRef.current.syncHud = syncHud;
  }, [syncHud]);

  const clearTargetsFromScene = useCallback((scene: THREE.Scene) => {
    const st = engineRef.current;
    st.targets.forEach((t) => {
      scene.remove(t.group);
      t.plaqueTexture.dispose();
      t.plaqueMat.dispose();
    });
    st.targets = [];
    st.lockedTargetId = null;
  }, []);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const maxAnisoRef = useRef<number>(4);

  const startGame = useCallback(
    (chosenDifficulty?: DifficultyMode) => {
      const st = engineRef.current;
      const diff = chosenDifficulty || st.difficulty;
      st.difficulty = diff;
      if (chosenDifficulty) setDifficulty(chosenDifficulty);

      if (sceneRef.current) {
        clearTargetsFromScene(sceneRef.current);
      }

      st.phase = 'playing';
      st.score = 0;
      st.combo = 0;
      st.maxCombo = 0;
      st.wave = 1;
      st.shield = 3;
      st.maxShield = 3;
      st.wordsCleared = 0;
      st.totalKeystrokes = 0;
      st.correctKeystrokes = 0;
      st.startTimeMs = performance.now();
      st.pausedAccumMs = 0;
      st.pauseStartMs = 0;
      st.spawnTimer = 0.25;
      st.lockedTargetId = null;
      st.targetShipX = 0;
      st.shakeIntensity = 0;
      st.hitstopTimer = 0;
      st.scoreSubmitted = false;
      st.lastEventText = 'Flight engaged';
      setInputValue('');

      syncHud();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 40);
    },
    [clearTargetsFromScene, syncHud],
  );

  const togglePause = useCallback(() => {
    const st = engineRef.current;
    if (st.phase === 'playing') {
      st.phase = 'paused';
      st.pauseStartMs = performance.now();
      st.lastEventText = 'Flight paused';
      syncHud();
    } else if (st.phase === 'paused') {
      st.phase = 'playing';
      st.pausedAccumMs += performance.now() - st.pauseStartMs;
      st.lastEventText = 'Flight resumed';
      syncHud();
      inputRef.current?.focus();
    }
  }, [syncHud]);

  const returnToTitle = useCallback(() => {
    const st = engineRef.current;
    if (sceneRef.current) {
      clearTargetsFromScene(sceneRef.current);
    }
    st.phase = 'title';
    st.targetShipX = 0;
    st.lastEventText = 'Ready for launch';
    setInputValue('');
    syncHud();
  }, [clearTargetsFromScene, syncHud]);

  // Auto-focus when Hero "Play 3D Typing Game" button is clicked
  useEffect(() => {
    if (autoFocusTrigger && autoFocusTrigger > 0) {
      if (engineRef.current.phase === 'title') {
        startGame();
      } else {
        inputRef.current?.focus();
      }
    }
  }, [autoFocusTrigger, startGame]);

  const spawnBurstRef = useRef<
    ((pos: THREE.Vector3, colorHex: number, count: number) => void) | null
  >(null);
  const spawnLaserRef = useRef<
    ((from: THREE.Vector3, to: THREE.Vector3, colorHex: number) => void) | null
  >(null);

  // Core keystroke processing
  const processTypedChar = useCallback(
    (rawChar: string) => {
      const st = engineRef.current;
      if (st.phase !== 'playing') return;

      const ch = rawChar.toLowerCase();
      if (!/^[a-z]$/.test(ch)) return;

      st.totalKeystrokes += 1;

      // Find currently locked target, or match closest target starting with ch
      let target = st.targets.find((t) => t.id === st.lockedTargetId) || null;

      if (!target) {
        // Pick nearest target (highest z) whose first letter matches ch
        const candidates = st.targets
          .filter((t) => t.word[0]?.toLowerCase() === ch)
          .sort((a, b) => b.group.position.z - a.group.position.z);

        if (candidates.length > 0) {
          target = candidates[0];
          st.lockedTargetId = target.id;
          st.targetShipX = THREE.MathUtils.clamp(target.laneX * 0.65, -4.5, 4.5);
        }
      }

      if (!target) {
        // Missed keystroke
        st.combo = 0;
        st.lastEventText = `No target starts with "${ch.toUpperCase()}"`;
        audioSynth.playMiss();
        syncHud();
        return;
      }

      const expected = target.word[target.typedCount]?.toLowerCase();
      if (ch === expected) {
        st.correctKeystrokes += 1;
        target.typedCount += 1;
        st.combo += 1;
        if (st.combo > st.maxCombo) st.maxCombo = st.combo;

        // Repaint plaque with updated progress
        paintWordPlaque(
          target.plaqueCanvas,
          target.word,
          target.typedCount,
          true,
          st.theme,
        );
        target.plaqueTexture.needsUpdate = true;

        // Micro-recoil & steer ship smoothly toward target lane
        st.recoilZ = 0.16;
        st.targetShipX = THREE.MathUtils.clamp(target.laneX * 0.65, -4.5, 4.5);

        if (target.typedCount >= target.word.length) {
          // Word destroyed!
          const destroyedPos = target.group.position.clone();
          const palette = ARENA_THEMES[st.theme];

          if (spawnLaserRef.current) {
            _vecA.set(st.shipX, 0.58, 1.8);
            spawnLaserRef.current(_vecA, destroyedPos, palette.laserHex);
          }
          if (spawnBurstRef.current) {
            spawnBurstRef.current(destroyedPos, palette.accentHex, 24);
          }

          if (sceneRef.current) {
            sceneRef.current.remove(target.group);
          }
          target.plaqueTexture.dispose();
          target.plaqueMat.dispose();
          st.targets = st.targets.filter((t) => t.id !== target!.id);
          st.lockedTargetId = null;

          const comboMult = 1 + Math.floor(st.combo / 5) * 0.25;
          const points = Math.round(target.word.length * 25 * comboMult);
          st.score += points;
          st.wordsCleared += 1;
          st.wave = 1 + Math.floor(st.wordsCleared / 6);
          st.hitstopTimer = 0.045; // 45ms crisp hitstop
          st.shakeIntensity = 0.18;
          st.recoilZ = 0.35;
          st.lastEventText = `Cleared "${target.word}" +${points}`;
          setInputValue('');

          const cfg = getDifficultyConfig(st.difficulty);
          if (st.wordsCleared >= cfg.targetWords) {
            st.phase = 'victory';
            st.lastEventText = 'Sector cleared!';
            audioSynth.playVictory();
            if (!st.scoreSubmitted) {
              st.scoreSubmitted = true;
              const elapsedMin = Math.max(
                (performance.now() - st.startTimeMs - st.pausedAccumMs) / 60000,
                0.04,
              );
              const finalWpm = Math.min(
                240,
                Math.round(st.correctKeystrokes / 5 / elapsedMin),
              );
              const finalAcc =
                st.totalKeystrokes > 0
                  ? Math.round((st.correctKeystrokes / st.totalKeystrokes) * 100)
                  : 100;
              onScoreRecorded({
                wpm: finalWpm,
                accuracy: finalAcc,
                score: st.score,
                difficulty: st.difficulty,
              });
            }
          } else {
            audioSynth.playDestroy(st.combo);
          }
        } else {
          audioSynth.playKeystroke(st.combo);
        }
      } else {
        // Wrong letter on locked word
        st.combo = 0;
        st.shakeIntensity = 0.08;
        st.lastEventText = `Expected "${expected?.toUpperCase()}"`;
        audioSynth.playMiss();
      }

      syncHud();
    },
    [onScoreRecorded, syncHud],
  );

  const cycleLockedTarget = useCallback(() => {
    const st = engineRef.current;
    if (st.phase !== 'playing' || st.targets.length === 0) return;

    // Reset current locked target progress if switching manually
    const prev = st.targets.find((t) => t.id === st.lockedTargetId);
    if (prev) {
      prev.typedCount = 0;
      paintWordPlaque(prev.plaqueCanvas, prev.word, 0, false, st.theme);
      prev.plaqueTexture.needsUpdate = true;
    }

    const sorted = [...st.targets].sort(
      (a, b) => b.group.position.z - a.group.position.z,
    );
    const idx = sorted.findIndex((t) => t.id === st.lockedTargetId);
    const next = sorted[(idx + 1) % sorted.length];
    if (next) {
      st.lockedTargetId = next.id;
      st.targetShipX = THREE.MathUtils.clamp(next.laneX * 0.65, -4.5, 4.5);
      paintWordPlaque(next.plaqueCanvas, next.word, 0, true, st.theme);
      next.plaqueTexture.needsUpdate = true;
      setInputValue('');
      syncHud();
    }
  }, [syncHud]);

  // Global keyboard shortcuts when arena is active
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Do not hijack typing if user is typing in another form/modal input outside arena
      const activeEl = document.activeElement;
      const isOtherInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') &&
        activeEl !== inputRef.current;
      if (isOtherInput) return;

      const st = engineRef.current;

      if (e.key === 'Escape') {
        if (st.phase === 'playing' || st.phase === 'paused') {
          e.preventDefault();
          togglePause();
        }
        return;
      }

      if (e.key === 'Enter' && st.phase === 'title') {
        // Only trigger Enter launch if arena is reasonably visible in viewport
        const rect = canvasMountRef.current?.getBoundingClientRect();
        if (rect && rect.top < window.innerHeight && rect.bottom > 0) {
          e.preventDefault();
          startGame();
        }
        return;
      }

      if (st.phase !== 'playing') return;

      if (e.key === 'Tab') {
        e.preventDefault();
        cycleLockedTarget();
        return;
      }

      // If the dedicated mobile/DeX input isn't focused, capture direct letters globally
      if (
        activeEl !== inputRef.current &&
        e.key.length === 1 &&
        /^[a-zA-Z]$/.test(e.key) &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        processTypedChar(e.key);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cycleLockedTarget, processTypedChar, startGame, togglePause]);

  // Initialize Three.js WebGL scene ONCE
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    // 1. Software WebGL detection (GPU renderer string probe)
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = mount.clientWidth || 1024;
    const height = mount.clientHeight || 560;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    maxAnisoRef.current = maxAniso;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglLost(true);
    };
    const handleContextRestored = () => {
      setWebglLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener(
      'webglcontextrestored',
      handleContextRestored,
    );

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const initialPalette = ARENA_THEMES[engineRef.current.theme];
    scene.background = new THREE.Color(initialPalette.bgHex);
    scene.fog = new THREE.FogExp2(initialPalette.fogHex, 0.017);

    const camera = new THREE.PerspectiveCamera(58, width / height, 0.1, 180);
    camera.position.set(0, 4.2, 10.5);
    camera.lookAt(0, 1.0, -12);

    // 2. Mandatory Studio Environment Reflection (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04,
    ).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    // 3. Balanced 3-Point Warm/Cool Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x818cf8, 0x090d16, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1db, 2.2);
    keyLight.position.set(7, 14, 9);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 40;
    const d = 12;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x6366f1, 1.4);
    rimLight.position.set(-8, 6, -18);
    scene.add(rimLight);

    // 4. Infinite Scrolling Corridor Track + Contact Shadow Grounding
    let trackTex = createTrackTexture(engineRef.current.theme, maxAniso);
    const groundGeo = new THREE.PlaneGeometry(42, 160);
    const groundMat = new THREE.MeshStandardMaterial({
      map: trackTex,
      roughness: 0.72,
      metalness: 0.25,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.set(0, 0, -52);
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Instanced side guide pylons extending to horizon
    const pylonCount = 36;
    const pylonGeo = new THREE.BoxGeometry(0.28, 3.4, 0.28);
    const pylonMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      emissive: initialPalette.accentHex,
      emissiveIntensity: 0.25,
      metalness: 0.75,
      roughness: 0.35,
    });
    const pylonInstanced = new THREE.InstancedMesh(
      pylonGeo,
      pylonMat,
      pylonCount,
    );
    pylonInstanced.frustumCulled = false;
    const pylonZ: number[] = [];
    for (let i = 0; i < pylonCount; i++) {
      const side = i % 2 === 0 ? -10.5 : 10.5;
      const z = -Math.floor(i / 2) * 7.5 + 8;
      pylonZ.push(z);
      _dummy.position.set(side, 1.7, z);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      pylonInstanced.setMatrixAt(i, _dummy.matrix);
    }
    pylonInstanced.instanceMatrix.needsUpdate = true;
    pylonInstanced.computeBoundingSphere();
    scene.add(pylonInstanced);

    // Instanced ambient starfield particles
    const starCount = 160;
    const starGeo = new THREE.BoxGeometry(0.1, 0.1, 0.9);
    const starMat = new THREE.MeshBasicMaterial({
      color: 0xc7d2fe,
      transparent: true,
      opacity: 0.7,
    });
    const starInstanced = new THREE.InstancedMesh(starGeo, starMat, starCount);
    starInstanced.frustumCulled = false;
    const starData: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i < starCount; i++) {
      const x = (Math.random() - 0.5) * 65;
      const y = 3 + Math.random() * 22;
      const z = -Math.random() * 120 + 10;
      starData.push({ x, y, z });
      _dummy.position.set(x, y, z);
      _dummy.scale.set(1, 1, 1 + Math.random() * 2);
      _dummy.updateMatrix();
      starInstanced.setMatrixAt(i, _dummy.matrix);
    }
    starInstanced.instanceMatrix.needsUpdate = true;
    starInstanced.computeBoundingSphere();
    scene.add(starInstanced);

    // 5. Composite 9-Part Procedural Interceptor Craft + Contact Shadow
    const interceptor: InterceptorHandles = buildInterceptorModel(
      engineRef.current.theme,
      isSoftwareGl,
    );
    interceptor.root.position.set(0, 0, 3.6);
    scene.add(interceptor.root);

    const shadowTex = createContactShadowTexture();
    const shadowGeo = new THREE.PlaneGeometry(4.4, 4.4);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.6,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(0, 0.02, 3.6);
    scene.add(contactShadow);

    // 6. Pooled Explosion Particles (InstancedMesh)
    const maxParticles = 120;
    const partGeo = new THREE.OctahedronGeometry(0.14, 0);
    const partMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });
    const partInstanced = new THREE.InstancedMesh(
      partGeo,
      partMat,
      maxParticles,
    );
    partInstanced.frustumCulled = false;
    partInstanced.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(maxParticles * 3),
      3,
    );
    const particles: ParticleState[] = [];
    for (let i = 0; i < maxParticles; i++) {
      particles.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.6,
        colorHex: 0x818cf8,
      });
      _dummy.position.set(0, -100, 0);
      _dummy.scale.setScalar(0);
      _dummy.updateMatrix();
      partInstanced.setMatrixAt(i, _dummy.matrix);
      partInstanced.setColorAt(i, _color.setHex(0x818cf8));
    }
    partInstanced.instanceMatrix.needsUpdate = true;
    partInstanced.instanceColor.needsUpdate = true;
    scene.add(partInstanced);
    engineRef.current.particles = particles;

    spawnBurstRef.current = (
      pos: THREE.Vector3,
      colorHex: number,
      count: number,
    ) => {
      let spawned = 0;
      for (let i = 0; i < particles.length && spawned < count; i++) {
        if (!particles[i].active) {
          const p = particles[i];
          p.active = true;
          p.pos.copy(pos);
          p.vel.set(
            (Math.random() - 0.5) * 12,
            (Math.random() - 0.2) * 9,
            (Math.random() - 0.5) * 10,
          );
          p.life = 0;
          p.maxLife = 0.45 + Math.random() * 0.35;
          p.colorHex = colorHex;
          spawned++;
        }
      }
    };

    const laserGeo = new THREE.CylinderGeometry(0.055, 0.055, 1, 8);
    laserGeo.rotateX(Math.PI / 2);
    spawnLaserRef.current = (
      from: THREE.Vector3,
      to: THREE.Vector3,
      colorHex: number,
    ) => {
      const dist = from.distanceTo(to);
      const lMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.95,
      });
      const mesh = new THREE.Mesh(laserGeo, lMat);
      _vecB.copy(from).lerp(to, 0.5);
      mesh.position.copy(_vecB);
      mesh.scale.set(1, 1, dist);
      mesh.lookAt(to);
      scene.add(mesh);
      engineRef.current.lasers.push({ mesh, life: 0, maxLife: 0.16 });
    };

    // Dynamic Theme Switcher wired to engine
    engineRef.current.applyTheme = (nextTheme: ArenaTheme) => {
      const pal = ARENA_THEMES[nextTheme];
      (scene.background as THREE.Color).setHex(pal.bgHex);
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.setHex(pal.fogHex);
      }
      interceptor.hullMat.color.setHex(pal.hullColor);
      interceptor.wingMat.color.setHex(pal.wingColor);
      interceptor.accentMat.color.setHex(pal.accentHex);
      interceptor.accentMat.emissive.setHex(pal.accentHex);
      (interceptor.thrusterLeft.material as THREE.MeshBasicMaterial).color.setHex(
        pal.laserHex,
      );
      pylonMat.emissive.setHex(pal.accentHex);
      rimLight.color.setHex(pal.accentHex);

      const newTrack = createTrackTexture(nextTheme, maxAniso);
      groundMat.map = newTrack;
      groundMat.needsUpdate = true;
      trackTex.dispose();
      trackTex = newTrack;

      // Repaint any active word plaques
      engineRef.current.targets.forEach((t) => {
        paintWordPlaque(
          t.plaqueCanvas,
          t.word,
          t.typedCount,
          t.id === engineRef.current.lockedTargetId,
          nextTheme,
        );
        t.plaqueTexture.needsUpdate = true;
      });
    };

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // ResizeObserver for crisp responsiveness (desktop, tablet, Samsung DeX, fullscreen)
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(mount);

    // 7. Continuous 60fps Loop with Software-WebGL afterDraw Pacing
    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;
    let hudTimer = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      const elapsed = clock.getElapsedTime();
      const st = engineRef.current;

      // Handle brief hitstop on heavy word shatter
      let simDt = dt;
      if (st.hitstopTimer > 0) {
        st.hitstopTimer = Math.max(0, st.hitstopTimer - dt);
        simDt = dt * 0.12;
      }

      if (st.phase !== 'paused') {
        // Scroll grid floor & pylons
        const speedMult =
          st.phase === 'playing' ? 1 + Math.min(st.combo * 0.04, 0.9) : 0.65;
        trackTex.offset.y -= simDt * 0.72 * speedMult;

        for (let i = 0; i < pylonCount; i++) {
          pylonZ[i] += simDt * 18 * speedMult;
          if (pylonZ[i] > 14) pylonZ[i] -= 135;
          const side = i % 2 === 0 ? -10.5 : 10.5;
          _dummy.position.set(side, 1.7, pylonZ[i]);
          _dummy.rotation.set(0, 0, 0);
          _dummy.scale.set(1, 1, 1);
          _dummy.updateMatrix();
          pylonInstanced.setMatrixAt(i, _dummy.matrix);
        }
        pylonInstanced.instanceMatrix.needsUpdate = true;

        for (let i = 0; i < starCount; i++) {
          starData[i].z += simDt * 24 * speedMult;
          if (starData[i].z > 14) starData[i].z = -110;
          _dummy.position.set(starData[i].x, starData[i].y, starData[i].z);
          _dummy.rotation.set(0, 0, 0);
          _dummy.scale.set(1, 1, 1.4 * speedMult);
          _dummy.updateMatrix();
          starInstanced.setMatrixAt(i, _dummy.matrix);
        }
        starInstanced.instanceMatrix.needsUpdate = true;
      }

      // Interceptor kinematics & banking
      if (st.phase === 'title') {
        st.targetShipX = Math.sin(elapsed * 0.65) * 1.4;
      }
      const prevX = st.shipX;
      st.shipX = THREE.MathUtils.damp(st.shipX, st.targetShipX, 7.5, simDt);
      const vx = (st.shipX - prevX) / Math.max(simDt, 0.001);

      st.recoilZ = THREE.MathUtils.damp(st.recoilZ, 0, 12, simDt);

      interceptor.root.position.x = st.shipX;
      interceptor.root.position.z = 3.6 + st.recoilZ;
      interceptor.bodyGroup.position.y = 0.55 + Math.sin(elapsed * 3.2) * 0.07;
      interceptor.bodyGroup.rotation.z = THREE.MathUtils.damp(
        interceptor.bodyGroup.rotation.z,
        THREE.MathUtils.clamp(-vx * 0.045, -0.45, 0.45),
        10,
        simDt,
      );
      interceptor.bodyGroup.rotation.x = THREE.MathUtils.damp(
        interceptor.bodyGroup.rotation.x,
        st.recoilZ * 0.3,
        10,
        simDt,
      );

      contactShadow.position.x = st.shipX;
      contactShadow.position.z = 3.6 + st.recoilZ;

      const thrusterPulse =
        (st.phase === 'playing' ? 1.15 : 0.85) + Math.sin(elapsed * 26) * 0.14;
      interceptor.thrusterLeft.scale.set(1, 1, thrusterPulse);
      interceptor.thrusterRight.scale.set(1, 1, thrusterPulse);

      // Active Gameplay: Spawning & Target Movement
      if (st.phase === 'playing') {
        const cfg = getDifficultyConfig(st.difficulty);
        st.spawnTimer -= simDt;

        if (
          st.spawnTimer <= 0 &&
          st.targets.length < cfg.maxConcurrent &&
          st.wordsCleared + st.targets.length < cfg.targetWords
        ) {
          const activeWords = st.targets.map((t) => t.word);
          const word = pickWord(st.difficulty, activeWords);
          const lanes = [-5.6, -2.8, 0, 2.8, 5.6];
          const laneX = lanes[Math.floor(Math.random() * lanes.length)];
          const speed =
            cfg.baseSpeed + (st.wave - 1) * cfg.speedRamp + Math.random() * 0.8;

          const drone = createWordDroneTarget(
            st.nextTargetId++,
            word,
            laneX,
            -56,
            speed,
            st.theme,
            maxAniso,
          );
          scene.add(drone.group);
          st.targets.push(drone);

          st.spawnTimer = Math.max(
            0.85,
            cfg.spawnInterval - (st.wave - 1) * 0.12,
          );
        }

        // Advance targets toward player perimeter
        for (let i = st.targets.length - 1; i >= 0; i--) {
          const t = st.targets[i];
          t.group.position.z += t.speed * simDt;
          t.group.position.y =
            1.15 + Math.sin(elapsed * 2.5 + t.bobPhase) * 0.18;
          t.coreMesh.rotation.y += simDt * 2.2;
          t.ringMesh.rotation.z -= simDt * 1.4;

          if (t.group.position.z >= 2.1) {
            // Target breached perimeter!
            const breachPos = t.group.position.clone();
            if (spawnBurstRef.current) {
              spawnBurstRef.current(breachPos, 0xef4444, 22);
            }
            scene.remove(t.group);
            t.plaqueTexture.dispose();
            t.plaqueMat.dispose();
            st.targets.splice(i, 1);

            if (st.lockedTargetId === t.id) {
              st.lockedTargetId = null;
              setInputValue('');
            }

            st.shield = Math.max(0, st.shield - 1);
            st.combo = 0;
            st.shakeIntensity = 0.42;
            st.lastEventText = `Hull hit by "${t.word}"!`;
            audioSynth.playShieldHit();

            if (st.shield <= 0) {
              st.phase = 'gameover';
              st.lastEventText = 'Shields depleted';
              if (!st.scoreSubmitted && st.score > 0) {
                st.scoreSubmitted = true;
                const elapsedMin = Math.max(
                  (performance.now() - st.startTimeMs - st.pausedAccumMs) /
                    60000,
                  0.04,
                );
                const finalWpm = Math.min(
                  240,
                  Math.round(st.correctKeystrokes / 5 / elapsedMin),
                );
                const finalAcc =
                  st.totalKeystrokes > 0
                    ? Math.round(
                        (st.correctKeystrokes / st.totalKeystrokes) * 100,
                      )
                    : 100;
                onScoreRecorded({
                  wpm: finalWpm,
                  accuracy: finalAcc,
                  score: st.score,
                  difficulty: st.difficulty,
                });
              }
            }
            st.syncHud?.();
          }
        }

        hudTimer += dt;
        if (hudTimer >= 0.25) {
          hudTimer = 0;
          st.syncHud?.();
        }
      }

      // Update pooled explosion particles
      let particlesDirty = false;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!p.active) continue;
        particlesDirty = true;
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          _dummy.position.set(0, -100, 0);
          _dummy.scale.setScalar(0);
          _dummy.updateMatrix();
          partInstanced.setMatrixAt(i, _dummy.matrix);
        } else {
          p.pos.addScaledVector(p.vel, dt);
          p.vel.y -= 12 * dt;
          const s = 1 - p.life / p.maxLife;
          _dummy.position.copy(p.pos);
          _dummy.rotation.set(p.life * 6, p.life * 4, 0);
          _dummy.scale.setScalar(s * 1.15);
          _dummy.updateMatrix();
          partInstanced.setMatrixAt(i, _dummy.matrix);
          partInstanced.setColorAt(i, _color.setHex(p.colorHex));
        }
      }
      if (particlesDirty) {
        partInstanced.instanceMatrix.needsUpdate = true;
        if (partInstanced.instanceColor) {
          partInstanced.instanceColor.needsUpdate = true;
        }
      }

      // Update transient laser beams
      for (let i = st.lasers.length - 1; i >= 0; i--) {
        const l = st.lasers[i];
        l.life += dt;
        if (l.life >= l.maxLife) {
          scene.remove(l.mesh);
          (l.mesh.material as THREE.Material).dispose();
          st.lasers.splice(i, 1);
        } else {
          (l.mesh.material as THREE.MeshBasicMaterial).opacity =
            1 - l.life / l.maxLife;
        }
      }

      // Camera chase smoothing + FOV widening + decaying shake
      const targetFov =
        st.phase === 'playing' ? 58 + Math.min(st.combo * 0.45, 10) : 56;
      st.fovCurrent = THREE.MathUtils.damp(st.fovCurrent, targetFov, 4, dt);
      if (Math.abs(camera.fov - st.fovCurrent) > 0.05) {
        camera.fov = st.fovCurrent;
        camera.updateProjectionMatrix();
      }

      st.shakeIntensity = THREE.MathUtils.damp(st.shakeIntensity, 0, 12, dt);
      const shakeX = (Math.random() - 0.5) * st.shakeIntensity;
      const shakeY = (Math.random() - 0.5) * st.shakeIntensity;

      const desiredCamX =
        st.phase === 'title' ? Math.sin(elapsed * 0.45) * 2.4 : st.shipX * 0.48;
      camera.position.x =
        THREE.MathUtils.damp(camera.position.x, desiredCamX, 5, dt) + shakeX;
      camera.position.y =
        THREE.MathUtils.damp(
          camera.position.y,
          st.phase === 'title' ? 3.5 : 4.2,
          4,
          dt,
        ) + shakeY;
      camera.position.z = THREE.MathUtils.damp(
        camera.position.z,
        st.phase === 'title' ? 9.2 : 10.6,
        4,
        dt,
      );

      _vecA.set(st.shipX * 0.35, 1.05, -14);
      _quat.setFromRotationMatrix(
        _dummy.matrix.lookAt(camera.position, _vecA, _up),
      );
      camera.quaternion.slerp(_quat, 1 - Math.exp(-8 * dt));

      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    if (isSoftwareGl) afterDraw(tick);
    else frameId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener(
        'webglcontextlost',
        handleContextLost,
      );
      renderer.domElement.removeEventListener(
        'webglcontextrestored',
        handleContextRestored,
      );
      clearTargetsFromScene(scene);
      envTexture.dispose();
      trackTex.dispose();
      shadowTex.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      pylonGeo.dispose();
      pylonMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      partGeo.dispose();
      partMat.dispose();
      laserGeo.dispose();
      renderer.dispose();
    };
  }, [clearTargetsFromScene, onScoreRecorded]);

  const handleThemeChange = (nextTheme: ArenaTheme) => {
    if (nextTheme !== 'cyber' && userPlan !== 'pro') {
      // Allow immediate live preview or prompt upgrade cleanly
      setTheme(nextTheme);
      engineRef.current.theme = nextTheme;
      engineRef.current.applyTheme?.(nextTheme);
      onRequireProTheme?.();
      return;
    }
    setTheme(nextTheme);
    engineRef.current.theme = nextTheme;
    engineRef.current.applyTheme?.(nextTheme);
  };

  const handleMuteToggle = () => {
    const next = !muted;
    setMuted(next);
    audioSynth.setMuted(next);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length > 0) {
      const lastChar = val[val.length - 1];
      processTypedChar(lastChar);
    }
    setInputValue('');
  };

  const progressPct = Math.round(
    (telemetry.wordsCleared / Math.max(1, telemetry.targetWords)) * 100,
  );

  return (
    <section
      id="arena"
      ref={arenaRef}
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-950 flex flex-col'
          : 'relative mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-12'
      }
    >
      {!isFullscreen && (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-indigo-400">
              Interactive WebGL Arena
            </p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl text-balance">
              3D Hyperspace Typing Gauntlet
            </h2>
          </div>
          <p className="max-w-md text-sm text-slate-400">
            Lock onto approaching word drones by typing their first letter. Clear
            every wave before hull shields drop to zero.
          </p>
        </div>
      )}

      {/* Main 3D Viewport Frame */}
      <div
        className={`relative overflow-hidden border border-white/10 bg-slate-950 ${
          isFullscreen
            ? 'flex-1 w-full h-full rounded-none border-0'
            : 'h-[560px] sm:h-[620px] w-full rounded-2xl'
        }`}
      >
        {/* Isolated WebGL Mount Container */}
        <div
          ref={canvasMountRef}
          className="absolute inset-0 h-full w-full"
          onClick={() => {
            if (telemetry.phase === 'playing') inputRef.current?.focus();
          }}
        />

        {/* WebGL Context Lost Fallback */}
        {webglLost && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950 p-6 text-center">
            <div className="max-w-sm space-y-3">
              <p className="text-lg font-semibold text-white">
                3D Graphics Context Paused
              </p>
              <p className="text-sm text-slate-400">
                Your browser temporarily suspended WebGL rendering. Reload or
                switch tabs to restore the flight arena.
              </p>
            </div>
          </div>
        )}

        {/* Perimeter Game HUD (pointer-events-none, NO backdrop-filter over WebGL) */}
        {telemetry.phase !== 'title' && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 p-4 sm:p-5">
            {/* Top-Left Telemetry Cluster */}
            <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-slate-950/90 px-4 py-2.5">
              <div>
                <div className="text-[11px] font-medium text-slate-400">
                  WPM
                </div>
                <div className="font-mono text-2xl font-bold text-white tabular-nums">
                  {telemetry.wpm}
                </div>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <div className="text-[11px] font-medium text-slate-400">
                  Accuracy
                </div>
                <div className="font-mono text-2xl font-bold text-emerald-400 tabular-nums">
                  {telemetry.accuracy}%
                </div>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <div className="text-[11px] font-medium text-slate-400">
                  Score
                </div>
                <div className="font-mono text-2xl font-bold text-indigo-400 tabular-nums">
                  {telemetry.score.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Top-Right Wave, Combo & Shield Cluster */}
            <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-slate-950/90 px-4 py-2.5">
              <div className="hidden sm:block text-right">
                <div className="text-[11px] font-medium text-slate-400">
                  Sector Progress
                </div>
                <div className="font-mono text-sm font-semibold text-slate-100 tabular-nums">
                  Wave {telemetry.wave} · {telemetry.wordsCleared}/
                  {telemetry.targetWords}
                </div>
              </div>
              <div className="hidden sm:block h-8 w-px bg-white/10" />
              <div className="text-right">
                <div className="text-[11px] font-medium text-slate-400">
                  Combo
                </div>
                <div className="font-mono text-xl font-bold text-amber-400 tabular-nums">
                  {telemetry.combo}x
                </div>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                  <Shield className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Shield</span>
                </div>
                <div className="mt-1 flex items-center gap-1">
                  {Array.from({ length: telemetry.maxShield }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-2.5 w-5 rounded-sm ${
                        i < telemetry.shield
                          ? 'bg-emerald-400'
                          : 'bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Target Lock & Command Input Bar (visible while playing) */}
        {telemetry.phase === 'playing' && (
          <div className="pointer-events-none absolute inset-x-0 bottom-20 z-10 flex flex-col items-center px-4">
            <div className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-xl border border-indigo-500/40 bg-slate-950/92 px-3.5 py-2 shadow-lg">
              <Target className="h-4 w-4 shrink-0 text-indigo-400" />
              <div className="min-w-0 flex-1">
                {telemetry.activeTargetWord ? (
                  <div className="flex items-center gap-2 font-mono text-sm">
                    <span className="text-emerald-400 font-semibold">
                      {telemetry.typedBuffer}
                    </span>
                    <span className="text-slate-200">
                      {telemetry.activeTargetWord.slice(
                        telemetry.typedBuffer.length,
                      )}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">
                    {telemetry.lastEventText}
                  </span>
                )}
              </div>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                aria-label="Type incoming words"
                placeholder="Type here..."
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="w-28 rounded-lg border border-white/10 bg-slate-900 px-2.5 py-1 font-mono text-xs text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={cycleLockedTarget}
                title="Switch target (Tab)"
                className="rounded-lg border border-white/10 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
              >
                Switch
              </button>
            </div>
          </div>
        )}

        {/* Title Screen Overlay over Live 3D Interceptor */}
        {telemetry.phase === 'title' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-between p-6 sm:p-10 pointer-events-none">
            <div className="mt-2 flex flex-col items-center text-center pointer-events-auto">
              {/* Bespoke inline SVG Title Lockup */}
              <svg
                viewBox="0 0 420 56"
                className="h-12 w-auto max-w-full"
                aria-label="TypeVeloce 3D"
              >
                <defs>
                  <linearGradient
                    id="tvLockupGrad"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="#F8FAFC" />
                    <stop offset="65%" stopColor="#A5B4FC" />
                    <stop offset="100%" stopColor="#6366F1" />
                  </linearGradient>
                </defs>
                <path
                  d="M12 12 L34 28 L12 44 L18 28 Z"
                  fill="#6366F1"
                />
                <text
                  x="46"
                  y="38"
                  fill="url(#tvLockupGrad)"
                  fontFamily="Outfit, sans-serif"
                  fontSize="34"
                  fontWeight="800"
                  letterSpacing="-0.8"
                >
                  TYPEVELOCE 3D
                </text>
              </svg>
              <p className="mt-2 max-w-md text-sm text-slate-300">
                Select difficulty and launch your interceptor into the live
                keystroke corridor.
              </p>
            </div>

            <div className="mb-14 flex flex-col items-center gap-4 pointer-events-auto">
              {/* Difficulty Selector */}
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-950/90 p-1">
                {(['cadet', 'velocity', 'hyperdrive'] as DifficultyMode[]).map(
                  (mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setDifficulty(mode)}
                      className={`rounded-lg px-4 py-1.5 text-xs font-semibold capitalize transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        difficulty === mode
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {mode}
                    </button>
                  ),
                )}
              </div>

              <button
                type="button"
                onClick={() => startGame(difficulty)}
                className="inline-flex items-center gap-2.5 rounded-xl bg-indigo-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/60 transition-transform hover:bg-indigo-500 active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Zap className="h-4 w-4" />
                <span>Launch Flight</span>
              </button>

              <p className="text-xs font-medium text-slate-400">
                Enter to Launch · Type words directly · Tab Switch Target · Esc
                Pause
              </p>
            </div>
          </div>
        )}

        {/* Pause / Victory / Game Over Modal Overlay */}
        {(telemetry.phase === 'paused' ||
          telemetry.phase === 'victory' ||
          telemetry.phase === 'gameover') && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80 p-4">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 text-center shadow-2xl">
              <p className="text-xs font-semibold text-indigo-400">
                {telemetry.phase === 'paused'
                  ? 'Flight Suspended'
                  : telemetry.phase === 'victory'
                    ? 'Sector Complete'
                    : 'Hull Shields Depleted'}
              </p>
              <h3 className="mt-1 text-2xl font-bold text-white">
                {telemetry.phase === 'paused'
                  ? 'Mission Paused'
                  : telemetry.phase === 'victory'
                    ? 'Target Wave Cleared'
                    : 'Run Complete'}
              </h3>

              {/* Tabular Run Summary */}
              <div className="mt-5 grid grid-cols-4 gap-2 rounded-xl border border-white/10 bg-slate-950 p-3">
                <div>
                  <div className="text-[11px] text-slate-400">WPM</div>
                  <div className="font-mono text-lg font-bold text-white tabular-nums">
                    {telemetry.wpm}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Accuracy</div>
                  <div className="font-mono text-lg font-bold text-emerald-400 tabular-nums">
                    {telemetry.accuracy}%
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Max Combo</div>
                  <div className="font-mono text-lg font-bold text-amber-400 tabular-nums">
                    {telemetry.maxCombo}x
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Score</div>
                  <div className="font-mono text-lg font-bold text-indigo-400 tabular-nums">
                    {telemetry.score}
                  </div>
                </div>
              </div>

              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-indigo-500 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-400 tabular-nums">
                {telemetry.wordsCleared} of {telemetry.targetWords} targets
                neutralized ({progressPct}%)
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {telemetry.phase === 'paused' && (
                  <button
                    type="button"
                    onClick={togglePause}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Play className="h-4 w-4" />
                    <span>Resume Flight</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => startGame(difficulty)}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Play Again</span>
                </button>
                <button
                  type="button"
                  onClick={returnToTitle}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Change Difficulty</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Unified Collapsible Bottom Control Dock (Zero Viewport Occlusion) */}
        <div
          className={`absolute bottom-3 left-1/2 z-20 -translate-x-1/2 transition-transform duration-200 ${
            dockCollapsed ? 'translate-y-[calc(100%-26px)]' : 'translate-y-0'
          }`}
        >
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => setDockCollapsed((v) => !v)}
              className="mb-1 inline-flex items-center gap-1 rounded-t-lg border border-b-0 border-white/10 bg-slate-950/92 px-3 py-0.5 text-[11px] font-medium text-slate-400 hover:text-white cursor-pointer"
            >
              {dockCollapsed ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  <span>Show Controls</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  <span>Hide Controls</span>
                </>
              )}
            </button>

            <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-950/95 px-3 py-1.5 shadow-xl">
              {/* Theme Swatches */}
              <div className="flex items-center gap-1 pr-2 border-r border-white/10">
                <span className="text-[11px] font-medium text-slate-400 mr-1 hidden sm:inline">
                  Theme
                </span>
                {(
                  [
                    { id: 'cyber', label: 'Cyber', dot: 'bg-indigo-500' },
                    { id: 'obsidian', label: 'Solar', dot: 'bg-amber-500' },
                    { id: 'arctic', label: 'Arctic', dot: 'bg-cyan-400' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleThemeChange(item.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      theme === item.id
                        ? 'bg-slate-800 text-white border border-white/15'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${item.dot}`} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Pause / Restart */}
              {telemetry.phase === 'playing' || telemetry.phase === 'paused' ? (
                <button
                  type="button"
                  onClick={togglePause}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {telemetry.phase === 'paused' ? (
                    <Play className="h-3.5 w-3.5" />
                  ) : (
                    <Pause className="h-3.5 w-3.5" />
                  )}
                  <span>{telemetry.phase === 'paused' ? 'Resume' : 'Pause'}</span>
                </button>
              ) : null}

              {/* Mute */}
              <button
                type="button"
                onClick={handleMuteToggle}
                aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
              >
                {muted ? (
                  <VolumeX className="h-3.5 w-3.5 text-rose-400" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5 text-indigo-400" />
                )}
                <span className="hidden sm:inline">
                  {muted ? 'Muted' : 'Synth On'}
                </span>
              </button>

              {/* Fullscreen Toggle */}
              <button
                type="button"
                onClick={() => setIsFullscreen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">
                  {isFullscreen ? 'Exit Fullscreen' : 'Focus Mode'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
