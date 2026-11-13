import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Shield,
  Trophy,
  User,
  Users,
  ArrowRight,
  Target,
  X,
  WifiOff,
  Home,
} from 'lucide-react';
import {
  DifficultyMode,
  GameMode,
  GamePhase,
  GameTelemetry,
  LeaderboardEntry,
  PlayerRunResult,
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
import { PWAInstallButton } from './PWAInstallButton';
import { useOnlineStatus } from '../hooks/usePWAInstall';

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
  leaderboard: LeaderboardEntry[];
  onRecordRun: (entry: Omit<LeaderboardEntry, 'id' | 'date'>) => void;
  onClearLeaderboard: () => void;
}

export const TypingArena3D: React.FC<TypingArena3DProps> = ({
  leaderboard,
  onRecordRun,
  onClearLeaderboard,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const prevInputRef = useRef<string>('');
  const isOnline = useOnlineStatus();

  const [mode, setMode] = useState<GameMode>('solo');
  const [difficulty, setDifficulty] = useState<DifficultyMode>('easy');
  const [player1Name, setPlayer1Name] = useState('Player 1');
  const [player2Name, setPlayer2Name] = useState('Player 2');
  const [muted, setMuted] = useState(false);
  const [webglLost, setWebglLost] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [lbFilter, setLbFilter] = useState<'all' | DifficultyMode>('all');

  const [p1Result, setP1Result] = useState<PlayerRunResult | null>(null);
  const [p2Result, setP2Result] = useState<PlayerRunResult | null>(null);

  const [telemetry, setTelemetry] = useState<GameTelemetry>({
    phase: 'title',
    mode: 'solo',
    activePlayerIndex: 1,
    activePlayerName: 'Player 1',
    wpm: 0,
    accuracy: 100,
    score: 0,
    combo: 0,
    maxCombo: 0,
    wave: 1,
    shield: 5,
    maxShield: 5,
    wordsCleared: 0,
    targetWords: 12,
    activeTargetWord: null,
    typedBuffer: '',
    lastEventText: 'Ready',
  });

  const engineRef = useRef<{
    phase: GamePhase;
    mode: GameMode;
    difficulty: DifficultyMode;
    activePlayerIndex: 1 | 2;
    p1Name: string;
    p2Name: string;
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
    isPortrait: boolean;
    particles: ParticleState[];
    lasers: LaserBeamState[];
    lastEventText: string;
    finishRound?: (survived: boolean) => void;
    syncHud?: () => void;
  }>({
    phase: 'title',
    mode: 'solo',
    difficulty: 'easy',
    activePlayerIndex: 1,
    p1Name: 'Player 1',
    p2Name: 'Player 2',
    score: 0,
    combo: 0,
    maxCombo: 0,
    wave: 1,
    shield: 5,
    maxShield: 5,
    wordsCleared: 0,
    totalKeystrokes: 0,
    correctKeystrokes: 0,
    startTimeMs: 0,
    pausedAccumMs: 0,
    pauseStartMs: 0,
    spawnTimer: 0.3,
    nextTargetId: 1,
    lockedTargetId: null,
    targets: [],
    shipX: 0,
    targetShipX: 0,
    recoilZ: 0,
    shakeIntensity: 0,
    hitstopTimer: 0,
    fovCurrent: 58,
    isPortrait: false,
    particles: [],
    lasers: [],
    lastEventText: 'Ready',
  });

  const sceneRef = useRef<THREE.Scene | null>(null);
  const maxAnisoRef = useRef<number>(4);

  const computeStats = useCallback(() => {
    const st = engineRef.current;
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
    return { wpm, accuracy };
  }, []);

  const syncHud = useCallback(() => {
    const st = engineRef.current;
    const cfg = getDifficultyConfig(st.difficulty);
    const { wpm, accuracy } = computeStats();
    const locked = st.targets.find((t) => t.id === st.lockedTargetId) || null;
    const activePlayerName =
      st.activePlayerIndex === 1 ? st.p1Name : st.p2Name;

    setTelemetry({
      phase: st.phase,
      mode: st.mode,
      activePlayerIndex: st.activePlayerIndex,
      activePlayerName,
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
  }, [computeStats]);

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

  const finishRound = useCallback(
    (survived: boolean) => {
      const st = engineRef.current;
      if (st.phase !== 'playing') return;

      const cfg = getDifficultyConfig(st.difficulty);
      const { wpm, accuracy } = computeStats();
      const playerName = st.activePlayerIndex === 1 ? st.p1Name : st.p2Name;

      const result: PlayerRunResult = {
        name: playerName,
        wpm,
        accuracy,
        score: st.score,
        maxCombo: st.maxCombo,
        wordsCleared: st.wordsCleared,
        targetWords: cfg.targetWords,
        survived,
      };

      onRecordRun({
        player: playerName,
        wpm,
        accuracy,
        score: st.score,
        mode: st.mode,
        difficulty: st.difficulty,
      });

      if (sceneRef.current) {
        clearTargetsFromScene(sceneRef.current);
      }
      setInputValue('');
      prevInputRef.current = '';

      if (st.mode === 'versus' && st.activePlayerIndex === 1) {
        setP1Result(result);
        st.phase = 'handoff';
        st.lastEventText = `${playerName} finished!`;
      } else {
        if (st.mode === 'versus') {
          setP2Result(result);
        } else {
          setP1Result(result);
          setP2Result(null);
        }
        st.phase = 'results';
        st.lastEventText = survived ? 'Round complete!' : 'Shields depleted';
      }

      syncHud();
    },
    [clearTargetsFromScene, computeStats, onRecordRun, syncHud],
  );

  useEffect(() => {
    engineRef.current.syncHud = syncHud;
    engineRef.current.finishRound = finishRound;
  }, [finishRound, syncHud]);

  const beginTurn = useCallback(
    (playerIndex: 1 | 2, chosenMode: GameMode, chosenDiff: DifficultyMode) => {
      const st = engineRef.current;
      const cfg = getDifficultyConfig(chosenDiff);

      if (sceneRef.current) {
        clearTargetsFromScene(sceneRef.current);
      }

      st.mode = chosenMode;
      st.difficulty = chosenDiff;
      st.activePlayerIndex = playerIndex;
      st.p1Name = player1Name.trim() || 'Player 1';
      st.p2Name = player2Name.trim() || 'Player 2';

      st.phase = 'playing';
      st.score = 0;
      st.combo = 0;
      st.maxCombo = 0;
      st.wave = 1;
      st.shield = cfg.maxShield;
      st.maxShield = cfg.maxShield;
      st.wordsCleared = 0;
      st.totalKeystrokes = 0;
      st.correctKeystrokes = 0;
      st.startTimeMs = performance.now();
      st.pausedAccumMs = 0;
      st.pauseStartMs = 0;
      st.spawnTimer = 0.2;
      st.lockedTargetId = null;
      st.targetShipX = 0;
      st.shakeIntensity = 0;
      st.hitstopTimer = 0;
      st.lastEventText = 'Type incoming words!';

      setInputValue('');
      prevInputRef.current = '';
      syncHud();

      setTimeout(() => {
        inputRef.current?.focus();
      }, 60);
    },
    [clearTargetsFromScene, player1Name, player2Name, syncHud],
  );

  const startNewMatch = useCallback(() => {
    setP1Result(null);
    setP2Result(null);
    setShowLeaderboard(false);
    beginTurn(1, mode, difficulty);
  }, [beginTurn, difficulty, mode]);

  const startPlayer2Turn = useCallback(() => {
    beginTurn(2, 'versus', engineRef.current.difficulty);
  }, [beginTurn]);

  const togglePause = useCallback(() => {
    const st = engineRef.current;
    if (st.phase === 'playing') {
      st.phase = 'paused';
      st.pauseStartMs = performance.now();
      st.lastEventText = 'Paused';
      syncHud();
    } else if (st.phase === 'paused') {
      st.phase = 'playing';
      st.pausedAccumMs += performance.now() - st.pauseStartMs;
      st.lastEventText = 'Resumed';
      syncHud();
      inputRef.current?.focus();
    }
  }, [syncHud]);

  const returnToMenu = useCallback(() => {
    const st = engineRef.current;
    if (sceneRef.current) {
      clearTargetsFromScene(sceneRef.current);
    }
    st.phase = 'title';
    st.targetShipX = 0;
    st.lastEventText = 'Ready';
    setInputValue('');
    prevInputRef.current = '';
    setP1Result(null);
    setP2Result(null);
    syncHud();
  }, [clearTargetsFromScene, syncHud]);

  const spawnBurstRef = useRef<
    ((pos: THREE.Vector3, colorHex: number, count: number) => void) | null
  >(null);
  const spawnLaserRef = useRef<
    ((from: THREE.Vector3, to: THREE.Vector3, colorHex: number) => void) | null
  >(null);

  const processTypedChar = useCallback(
    (rawChar: string): boolean => {
      const st = engineRef.current;
      if (st.phase !== 'playing') return false;

      const ch = rawChar.toLowerCase();
      if (!/^[a-z]$/.test(ch)) return false;

      st.totalKeystrokes += 1;

      let target = st.targets.find((t) => t.id === st.lockedTargetId) || null;

      if (!target) {
        const candidates = st.targets
          .filter((t) => t.word[0]?.toLowerCase() === ch)
          .sort((a, b) => b.group.position.z - a.group.position.z);

        if (candidates.length > 0) {
          target = candidates[0];
          st.lockedTargetId = target.id;
          st.targetShipX = THREE.MathUtils.clamp(
            target.laneX * 0.65,
            -3.8,
            3.8,
          );
        }
      }

      if (!target) {
        st.combo = 0;
        st.lastEventText = `No target starts with "${ch.toUpperCase()}"`;
        audioSynth.playMiss();
        syncHud();
        return false;
      }

      const expected = target.word[target.typedCount]?.toLowerCase();
      if (ch === expected) {
        st.correctKeystrokes += 1;
        target.typedCount += 1;
        st.combo += 1;
        if (st.combo > st.maxCombo) st.maxCombo = st.combo;

        paintWordPlaque(
          target.plaqueCanvas,
          target.word,
          target.typedCount,
          true,
          'cyber',
        );
        target.plaqueTexture.needsUpdate = true;

        st.recoilZ = 0.14;
        st.targetShipX = THREE.MathUtils.clamp(target.laneX * 0.65, -3.8, 3.8);

        if (target.typedCount >= target.word.length) {
          const destroyedPos = target.group.position.clone();
          const palette = ARENA_THEMES.cyber;

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
          st.wave = 1 + Math.floor(st.wordsCleared / 5);
          st.hitstopTimer = 0.04;
          st.shakeIntensity = 0.16;
          st.recoilZ = 0.3;
          st.lastEventText = `+${points} (${target.word})`;

          const cfg = getDifficultyConfig(st.difficulty);
          if (st.wordsCleared >= cfg.targetWords) {
            audioSynth.playVictory();
            st.finishRound?.(true);
            return true;
          } else {
            audioSynth.playDestroy(st.combo);
          }
          syncHud();
          return true;
        } else {
          audioSynth.playKeystroke(st.combo);
          syncHud();
          return false;
        }
      } else {
        st.combo = 0;
        st.shakeIntensity = 0.07;
        st.lastEventText = `Type "${expected?.toUpperCase()}"`;
        audioSynth.playMiss();
        syncHud();
        return false;
      }
    },
    [syncHud],
  );

  const cycleLockedTarget = useCallback(() => {
    const st = engineRef.current;
    if (st.phase !== 'playing' || st.targets.length === 0) return;

    const prev = st.targets.find((t) => t.id === st.lockedTargetId);
    if (prev) {
      prev.typedCount = 0;
      paintWordPlaque(prev.plaqueCanvas, prev.word, 0, false, 'cyber');
      prev.plaqueTexture.needsUpdate = true;
    }

    const sorted = [...st.targets].sort(
      (a, b) => b.group.position.z - a.group.position.z,
    );
    const idx = sorted.findIndex((t) => t.id === st.lockedTargetId);
    const next = sorted[(idx + 1) % sorted.length];
    if (next) {
      st.lockedTargetId = next.id;
      st.targetShipX = THREE.MathUtils.clamp(next.laneX * 0.65, -3.8, 3.8);
      paintWordPlaque(next.plaqueCanvas, next.word, 0, true, 'cyber');
      next.plaqueTexture.needsUpdate = true;
      setInputValue('');
      prevInputRef.current = '';
      syncHud();
    }
    inputRef.current?.focus();
  }, [syncHud]);

  // Global keyboard handler for physical keyboards (yields cleanly when <input> is focused)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isNameInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') &&
        activeEl !== inputRef.current;
      if (isNameInput) return;

      const st = engineRef.current;

      if (e.key === 'Escape') {
        if (st.phase === 'playing' || st.phase === 'paused') {
          e.preventDefault();
          togglePause();
        }
        return;
      }

      if (e.key === 'Enter') {
        if (st.phase === 'title' && !showLeaderboard) {
          e.preventDefault();
          startNewMatch();
          return;
        }
        if (st.phase === 'handoff') {
          e.preventDefault();
          startPlayer2Turn();
          return;
        }
      }

      if (st.phase !== 'playing') return;

      if (e.key === 'Tab') {
        e.preventDefault();
        cycleLockedTarget();
        return;
      }

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
  }, [
    cycleLockedTarget,
    processTypedChar,
    showLeaderboard,
    startNewMatch,
    startPlayer2Turn,
    togglePause,
  ]);

  // Handle both virtual soft keyboards and physical input bar seamlessly
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    const prevVal = prevInputRef.current;

    if (nextVal.length > prevVal.length) {
      const added = nextVal.slice(prevVal.length);
      let clearedWord = false;
      for (let i = 0; i < added.length; i++) {
        if (processTypedChar(added[i])) {
          clearedWord = true;
        }
      }
      if (clearedWord) {
        prevInputRef.current = '';
        setInputValue('');
        return;
      }
    }

    // Keep box clean if it gets long or empty
    if (nextVal.length > 20) {
      prevInputRef.current = '';
      setInputValue('');
    } else {
      prevInputRef.current = nextVal;
      setInputValue(nextVal);
    }
  };

  // Three.js WebGL initialization (runs once)
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

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

    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || window.innerHeight;
    engineRef.current.isPortrait = width / Math.max(1, height) < 0.85;

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
    const palette = ARENA_THEMES.cyber;
    scene.background = new THREE.Color(palette.bgHex);
    scene.fog = new THREE.FogExp2(palette.fogHex, 0.017);

    const camera = new THREE.PerspectiveCamera(58, width / height, 0.1, 180);
    camera.position.set(0, 4.2, 10.5);
    camera.lookAt(0, 1.0, -12);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04,
    ).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

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

    const trackTex = createTrackTexture('cyber', maxAniso);
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

    const pylonCount = 36;
    const pylonGeo = new THREE.BoxGeometry(0.28, 3.4, 0.28);
    const pylonMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      emissive: palette.accentHex,
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

    const starCount = 150;
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

    const interceptor: InterceptorHandles = buildInterceptorModel(
      'cyber',
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

    const maxParticles = 120;
    const partGeo = new THREE.OctahedronGeometry(0.14, 0);
    const partMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
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

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
          engineRef.current.isPortrait = w / h < 0.85;
        }
      }
    });
    resizeObserver.observe(mount);

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

      let simDt = dt;
      if (st.hitstopTimer > 0) {
        st.hitstopTimer = Math.max(0, st.hitstopTimer - dt);
        simDt = dt * 0.12;
      }

      if (st.phase !== 'paused') {
        const speedMult =
          st.phase === 'playing' ? 1 + Math.min(st.combo * 0.035, 0.8) : 0.65;
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

      if (st.phase !== 'playing') {
        st.targetShipX = Math.sin(elapsed * 0.65) * 1.1;
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
          const lanes = st.isPortrait
            ? [-2.3, -1.1, 0, 1.1, 2.3]
            : [-5.2, -2.6, 0, 2.6, 5.2];
          const laneX = lanes[Math.floor(Math.random() * lanes.length)];
          const speed =
            cfg.baseSpeed + (st.wave - 1) * cfg.speedRamp + Math.random() * 0.5;

          const drone = createWordDroneTarget(
            st.nextTargetId++,
            word,
            laneX,
            -50,
            speed,
            'cyber',
            maxAniso,
          );
          if (st.isPortrait) {
            drone.group.scale.setScalar(1.12);
          }
          scene.add(drone.group);
          st.targets.push(drone);

          st.spawnTimer = Math.max(
            0.95,
            cfg.spawnInterval - (st.wave - 1) * 0.1,
          );
        }

        for (let i = st.targets.length - 1; i >= 0; i--) {
          const t = st.targets[i];
          t.group.position.z += t.speed * simDt;
          t.group.position.y =
            (st.isPortrait ? 1.45 : 1.15) +
            Math.sin(elapsed * 2.5 + t.bobPhase) * 0.16;
          t.coreMesh.rotation.y += simDt * 2.2;
          t.ringMesh.rotation.z -= simDt * 1.4;

          if (t.group.position.z >= 2.1) {
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
              prevInputRef.current = '';
              setInputValue('');
            }

            st.shield = Math.max(0, st.shield - 1);
            st.combo = 0;
            st.shakeIntensity = 0.4;
            st.lastEventText = `Missed "${t.word}"!`;
            audioSynth.playShieldHit();

            if (st.shield <= 0) {
              st.finishRound?.(false);
            } else {
              st.syncHud?.();
            }
          }
        }

        hudTimer += dt;
        if (hudTimer >= 0.25) {
          hudTimer = 0;
          st.syncHud?.();
        }
      }

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

      // Portrait-adaptive camera & FOV
      const baseFov = st.isPortrait ? 68 : 58;
      const targetFov =
        st.phase === 'playing'
          ? baseFov + Math.min(st.combo * 0.4, 8)
          : baseFov - 2;
      st.fovCurrent = THREE.MathUtils.damp(st.fovCurrent, targetFov, 4, dt);
      if (Math.abs(camera.fov - st.fovCurrent) > 0.05) {
        camera.fov = st.fovCurrent;
        camera.updateProjectionMatrix();
      }

      st.shakeIntensity = THREE.MathUtils.damp(st.shakeIntensity, 0, 12, dt);
      const shakeX = (Math.random() - 0.5) * st.shakeIntensity;
      const shakeY = (Math.random() - 0.5) * st.shakeIntensity;

      const desiredCamX =
        st.phase !== 'playing' ? Math.sin(elapsed * 0.45) * 2.1 : st.shipX * 0.48;
      const desiredCamY = st.isPortrait ? 4.8 : 4.2;
      const desiredCamZ = st.isPortrait ? 12.2 : 10.6;

      camera.position.x =
        THREE.MathUtils.damp(camera.position.x, desiredCamX, 5, dt) + shakeX;
      camera.position.y =
        THREE.MathUtils.damp(camera.position.y, desiredCamY, 4, dt) + shakeY;
      camera.position.z = THREE.MathUtils.damp(
        camera.position.z,
        desiredCamZ,
        4,
        dt,
      );

      _vecA.set(st.shipX * 0.35, st.isPortrait ? 0.4 : 1.05, -14);
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
  }, [clearTargetsFromScene]);

  const handleMuteToggle = () => {
    const next = !muted;
    setMuted(next);
    audioSynth.setMuted(next);
  };

  const filteredLeaderboard = leaderboard
    .filter((e) => (lbFilter === 'all' ? true : e.difficulty === lbFilter))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  const wordsLeft = Math.max(0, telemetry.targetWords - telemetry.wordsCleared);

  // Determine 2-player comparison winner
  const versusOutcome = (() => {
    if (!p1Result || !p2Result) return null;
    if (p1Result.score > p2Result.score) return { winner: p1Result.name, tie: false };
    if (p2Result.score > p1Result.score) return { winner: p2Result.name, tie: false };
    if (p1Result.wpm > p2Result.wpm) return { winner: p1Result.name, tie: false };
    if (p2Result.wpm > p1Result.wpm) return { winner: p2Result.name, tie: false };
    return { winner: 'Draw', tie: true };
  })();

  return (
    <div className="relative h-[100dvh] w-screen overflow-hidden bg-slate-950 select-none">
      {/* Isolated WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 h-full w-full"
        onClick={() => {
          if (telemetry.phase === 'playing') inputRef.current?.focus();
        }}
      />

      {/* Offline Status Pill (only when offline) */}
      {!isOnline && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-40 inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-slate-950/90 px-3 py-1.5 text-xs font-medium text-amber-300">
          <WifiOff className="h-3.5 w-3.5" />
          <span>Offline Ready</span>
        </div>
      )}

      {/* WebGL Context Lost Fallback */}
      {webglLost && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950 p-6 text-center">
          <div className="max-w-sm space-y-2">
            <p className="text-lg font-bold text-white">Graphics Paused</p>
            <p className="text-sm text-slate-400">
              Your browser suspended 3D rendering. Refresh or switch back to
              resume.
            </p>
          </div>
        </div>
      )}

      {/* ACTIVE GAMEPLAY HUD */}
      {telemetry.phase === 'playing' && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3 sm:p-5">
            {/* Left Stats Cluster */}
            <div className="flex items-center gap-3 sm:gap-4 rounded-xl border border-white/10 bg-slate-950/90 px-3 py-2 sm:px-4">
              {telemetry.mode === 'versus' && (
                <>
                  <div className="max-w-[90px] truncate text-xs font-bold text-indigo-400">
                    {telemetry.activePlayerName}
                  </div>
                  <div className="h-6 w-px bg-white/10" />
                </>
              )}
              <div>
                <div className="text-[10px] font-medium text-slate-400">WPM</div>
                <div className="font-mono text-lg sm:text-2xl font-bold text-white tabular-nums">
                  {telemetry.wpm}
                </div>
              </div>
              <div className="h-6 w-px bg-white/10" />
              <div>
                <div className="text-[10px] font-medium text-slate-400">Acc</div>
                <div className="font-mono text-lg sm:text-2xl font-bold text-emerald-400 tabular-nums">
                  {telemetry.accuracy}%
                </div>
              </div>
              <div className="h-6 w-px bg-white/10" />
              <div>
                <div className="text-[10px] font-medium text-slate-400">
                  Score
                </div>
                <div className="font-mono text-lg sm:text-2xl font-bold text-indigo-400 tabular-nums">
                  {telemetry.score}
                </div>
              </div>
            </div>

            {/* Right Cluster: Words Left, Shield, Controls */}
            <div className="flex items-center gap-2 sm:gap-3 rounded-xl border border-white/10 bg-slate-950/90 px-3 py-2 sm:px-4">
              <div className="text-right">
                <div className="text-[10px] font-medium text-slate-400">
                  Left
                </div>
                <div className="font-mono text-sm sm:text-lg font-bold text-white tabular-nums">
                  {wordsLeft}
                </div>
              </div>
              <div className="h-6 w-px bg-white/10" />
              <div>
                <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                  <Shield className="h-3 w-3 text-indigo-400" />
                  <span className="hidden sm:inline">Shield</span>
                </div>
                <div className="mt-1 flex items-center gap-1">
                  {Array.from({ length: telemetry.maxShield }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-2 w-3 sm:w-4 rounded-sm ${
                        i < telemetry.shield
                          ? 'bg-emerald-400'
                          : 'bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="h-6 w-px bg-white/10" />
              <div className="pointer-events-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleMuteToggle}
                  aria-label={muted ? 'Unmute sound' : 'Mute sound'}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
                >
                  {muted ? (
                    <VolumeX className="h-4 w-4 text-rose-400" />
                  ) : (
                    <Volume2 className="h-4 w-4 text-indigo-400" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={togglePause}
                  aria-label="Pause game"
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
                >
                  <Pause className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Touch & Keyboard Typing Bar */}
          <div className="pointer-events-none absolute inset-x-0 bottom-3 sm:bottom-5 z-20 flex justify-center px-3">
            <div className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-2xl border border-indigo-500/45 bg-slate-950/95 p-2 shadow-2xl">
              <Target className="ml-1.5 h-4 w-4 shrink-0 text-indigo-400" />
              <div className="min-w-0 flex-1 truncate font-mono text-sm">
                {telemetry.activeTargetWord ? (
                  <>
                    <span className="font-bold text-emerald-400">
                      {telemetry.typedBuffer}
                    </span>
                    <span className="text-slate-200">
                      {telemetry.activeTargetWord.slice(
                        telemetry.typedBuffer.length,
                      )}
                    </span>
                  </>
                ) : (
                  <span className="font-sans text-xs text-slate-400">
                    {telemetry.lastEventText}
                  </span>
                )}
              </div>
              <input
                ref={inputRef}
                type="text"
                inputMode="text"
                enterKeyHint="go"
                value={inputValue}
                onChange={handleInputChange}
                aria-label="Type word here"
                placeholder="Tap & type..."
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="min-h-[42px] w-32 sm:w-40 rounded-xl border border-white/15 bg-slate-900 px-3 font-mono text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={cycleLockedTarget}
                className="min-h-[42px] rounded-xl border border-white/10 bg-slate-900 px-3 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {/* TITLE SCREEN OVERLAY */}
      {telemetry.phase === 'title' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-between p-4 sm:p-8 overflow-y-auto">
          {/* Top-right utility actions: Install App & Sound */}
          <div className="flex w-full max-w-4xl items-center justify-end gap-2">
            <PWAInstallButton />
            <button
              type="button"
              onClick={() => setShowLeaderboard(true)}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-white/15 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Trophy className="h-4 w-4 text-amber-400" />
              <span>Leaderboard</span>
            </button>
            <button
              type="button"
              onClick={handleMuteToggle}
              aria-label={muted ? 'Unmute sound' : 'Mute sound'}
              className="flex min-h-[42px] min-w-[42px] items-center justify-center rounded-xl border border-white/15 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              {muted ? (
                <VolumeX className="h-4 w-4 text-rose-400" />
              ) : (
                <Volume2 className="h-4 w-4 text-indigo-400" />
              )}
            </button>
          </div>

          {/* Bespoke SVG Title Lockup over calm upper space */}
          <div className="my-2 flex flex-col items-center text-center">
            <svg
              viewBox="0 0 460 82"
              className="h-16 sm:h-20 w-auto max-w-full"
              aria-label="TYPING MASTER By Sada"
            >
              <defs>
                <linearGradient
                  id="tmTitleGrad"
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
              <path d="M16 14 L42 32 L16 50 L23 32 Z" fill="#6366F1" />
              <text
                x="56"
                y="43"
                fill="url(#tmTitleGrad)"
                fontFamily="Outfit, sans-serif"
                fontSize="36"
                fontWeight="800"
                letterSpacing="-0.6"
              >
                TYPING MASTER
              </text>
              <text
                x="230"
                y="70"
                textAnchor="middle"
                fill="#94A3B8"
                fontFamily="Plus Jakarta Sans, sans-serif"
                fontSize="16"
                fontWeight="600"
                letterSpacing="1.2"
              >
                By Sada
              </text>
            </svg>
          </div>

          {/* Game Mode & Player Setup Panel */}
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/92 p-4 sm:p-5 shadow-2xl">
            {/* Only two competitor choices: Solo or With a Friend */}
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-900 p-1">
              <button
                type="button"
                onClick={() => setMode('solo')}
                className={`flex min-h-[44px] items-center justify-center gap-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                  mode === 'solo'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="h-4 w-4" />
                <span>Solo Player</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('versus')}
                className={`flex min-h-[44px] items-center justify-center gap-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                  mode === 'versus'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>With a Friend</span>
              </button>
            </div>

            {/* Player Name(s) */}
            <div
              className={`mt-3 grid gap-2 ${
                mode === 'versus' ? 'grid-cols-2' : 'grid-cols-1'
              }`}
            >
              <div>
                <label className="block text-[11px] font-medium text-slate-400">
                  {mode === 'versus' ? 'Player 1' : 'Player Name'}
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={player1Name}
                  onChange={(e) => setPlayer1Name(e.target.value)}
                  placeholder="Player 1"
                  className="mt-1 min-h-[42px] w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm font-medium text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                />
              </div>
              {mode === 'versus' && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-400">
                    Player 2
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    value={player2Name}
                    onChange={(e) => setPlayer2Name(e.target.value)}
                    placeholder="Player 2"
                    className="mt-1 min-h-[42px] w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm font-medium text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Speed / Difficulty */}
            <div className="mt-3">
              <div className="text-[11px] font-medium text-slate-400 mb-1">
                Speed
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-900 p-1">
                {(['easy', 'normal', 'fast'] as DifficultyMode[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`min-h-[38px] rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                      difficulty === d
                        ? 'bg-slate-800 text-white border border-white/15'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={startNewMatch}
              className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-bold text-white transition-colors hover:bg-indigo-500 active:scale-[0.99] cursor-pointer"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>
                {mode === 'versus'
                  ? `Start Match · ${player1Name.trim() || 'Player 1'} First`
                  : 'Start Game'}
              </span>
            </button>

            <p className="mt-3 text-center text-[11px] text-slate-400">
              Type words as they approach · Esc to Pause
            </p>
          </div>
        </div>
      )}

      {/* PAUSE MODAL */}
      {telemetry.phase === 'paused' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/85 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 text-center shadow-2xl">
            <h2 className="text-2xl font-bold text-white">Game Paused</h2>
            <p className="mt-1 text-xs text-slate-400">
              {telemetry.activePlayerName} · {telemetry.wordsCleared}/
              {telemetry.targetWords} words
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={togglePause}
                className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 cursor-pointer"
              >
                <Play className="h-4 w-4" />
                <span>Resume</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  beginTurn(
                    telemetry.activePlayerIndex,
                    telemetry.mode,
                    engineRef.current.difficulty,
                  )
                }
                className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-950 text-sm font-semibold text-slate-200 hover:bg-slate-800 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Restart Turn</span>
              </button>
              <button
                type="button"
                onClick={returnToMenu}
                className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-950 text-sm font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                <Home className="h-4 w-4" />
                <span>Main Menu</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAYER 1 -> PLAYER 2 HANDOFF SCREEN */}
      {telemetry.phase === 'handoff' && p1Result && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/90 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 text-center shadow-2xl">
            <p className="text-xs font-semibold text-indigo-400">
              Round 1 Complete
            </p>
            <h2 className="mt-1 text-2xl font-bold text-white">
              {p1Result.name} Finished
            </h2>

            <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-slate-950 p-3.5">
              <div>
                <div className="text-[11px] text-slate-400">WPM</div>
                <div className="font-mono text-xl font-bold text-white tabular-nums">
                  {p1Result.wpm}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Accuracy</div>
                <div className="font-mono text-xl font-bold text-emerald-400 tabular-nums">
                  {p1Result.accuracy}%
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Score</div>
                <div className="font-mono text-xl font-bold text-indigo-400 tabular-nums">
                  {p1Result.score}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-indigo-500/30 bg-indigo-950/30 p-4">
              <p className="text-xs text-slate-300">Next Challenger</p>
              <p className="mt-0.5 text-lg font-bold text-white">
                {player2Name.trim() || 'Player 2'}
              </p>
            </div>

            <button
              type="button"
              onClick={startPlayer2Turn}
              className="mt-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-bold text-white hover:bg-indigo-500 cursor-pointer"
            >
              <span>Start {player2Name.trim() || 'Player 2'}&apos;s Turn</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* RESULTS & HEAD-TO-HEAD COMPARISON SCREEN */}
      {telemetry.phase === 'results' && p1Result && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/90 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-5 sm:p-6 shadow-2xl">
            {mode === 'versus' && p2Result && versusOutcome ? (
              <>
                <div className="text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <h2 className="mt-2 text-2xl font-extrabold text-white">
                    {versusOutcome.tie
                      ? "It's a Tie!"
                      : `${versusOutcome.winner} Wins!`}
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Head-to-Head Comparison ·{' '}
                    <span className="capitalize">{difficulty}</span>
                  </p>
                </div>

                {/* Comparison Grid */}
                <div className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-slate-950">
                  <div className="grid grid-cols-3 border-b border-white/10 px-4 py-2.5 text-xs font-semibold text-slate-400">
                    <span>Metric</span>
                    <span className="text-right text-white truncate">
                      {p1Result.name}
                    </span>
                    <span className="text-right text-white truncate">
                      {p2Result.name}
                    </span>
                  </div>

                  {[
                    {
                      label: 'Score',
                      v1: p1Result.score,
                      v2: p2Result.score,
                      fmt: (v: number) => v.toLocaleString(),
                    },
                    {
                      label: 'WPM',
                      v1: p1Result.wpm,
                      v2: p2Result.wpm,
                      fmt: (v: number) => String(v),
                    },
                    {
                      label: 'Accuracy',
                      v1: p1Result.accuracy,
                      v2: p2Result.accuracy,
                      fmt: (v: number) => `${v}%`,
                    },
                    {
                      label: 'Max Combo',
                      v1: p1Result.maxCombo,
                      v2: p2Result.maxCombo,
                      fmt: (v: number) => `${v}x`,
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="grid grid-cols-3 border-b border-white/5 px-4 py-2.5 text-sm last:border-b-0"
                    >
                      <span className="text-slate-400">{row.label}</span>
                      <span
                        className={`text-right font-mono font-bold tabular-nums ${
                          row.v1 > row.v2
                            ? 'text-emerald-400'
                            : 'text-slate-200'
                        }`}
                      >
                        {row.fmt(row.v1)}
                      </span>
                      <span
                        className={`text-right font-mono font-bold tabular-nums ${
                          row.v2 > row.v1
                            ? 'text-emerald-400'
                            : 'text-slate-200'
                        }`}
                      >
                        {row.fmt(row.v2)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="text-center">
                  <p className="text-xs font-semibold text-indigo-400">
                    {p1Result.survived ? 'Run Cleared' : 'Run Complete'}
                  </p>
                  <h2 className="mt-1 text-2xl font-extrabold text-white">
                    {p1Result.name}
                  </h2>
                </div>

                <div className="mt-5 grid grid-cols-4 gap-2 rounded-xl border border-white/10 bg-slate-950 p-3.5 text-center">
                  <div>
                    <div className="text-[11px] text-slate-400">WPM</div>
                    <div className="font-mono text-xl font-bold text-white tabular-nums">
                      {p1Result.wpm}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Accuracy</div>
                    <div className="font-mono text-xl font-bold text-emerald-400 tabular-nums">
                      {p1Result.accuracy}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Combo</div>
                    <div className="font-mono text-xl font-bold text-amber-400 tabular-nums">
                      {p1Result.maxCombo}x
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Score</div>
                    <div className="font-mono text-xl font-bold text-indigo-400 tabular-nums">
                      {p1Result.score}
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={startNewMatch}
                className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-500 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                <span>{mode === 'versus' ? 'Rematch' : 'Play Again'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowLeaderboard(true)}
                className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 cursor-pointer"
              >
                <Trophy className="h-4 w-4 text-amber-400" />
                <span>Leaderboard</span>
              </button>
              <button
                type="button"
                onClick={returnToMenu}
                className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-slate-950 px-4 text-sm font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                <Home className="h-4 w-4" />
                <span>Menu</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEADERBOARD MODAL */}
      {showLeaderboard && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lb-modal-title"
        >
          <div className="flex max-h-[88dvh] w-full max-w-lg flex-col rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" />
                <h2 id="lb-modal-title" className="text-lg font-bold text-white">
                  Leaderboard
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowLeaderboard(false)}
                aria-label="Close leaderboard"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-1 rounded-xl bg-slate-950 p-1">
              {(['all', 'easy', 'normal', 'fast'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setLbFilter(tab)}
                  className={`min-h-[36px] rounded-lg text-xs font-semibold capitalize cursor-pointer ${
                    lbFilter === tab
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="mt-3 flex-1 overflow-y-auto rounded-xl border border-white/10 bg-slate-950">
              {filteredLeaderboard.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">
                  No runs recorded for this speed yet. Play a round to set a
                  score!
                </div>
              ) : (
                <table className="w-full border-collapse text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400">
                      <th className="py-2.5 pl-3 pr-2">#</th>
                      <th className="py-2.5 px-2">Player</th>
                      <th className="py-2.5 px-2 text-right">WPM</th>
                      <th className="py-2.5 px-2 text-right">Acc</th>
                      <th className="py-2.5 pl-2 pr-3 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredLeaderboard.map((row, idx) => (
                      <tr key={row.id} className="text-slate-200">
                        <td className="py-2.5 pl-3 pr-2 font-mono text-slate-400 tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-2 font-semibold text-white">
                          <span className="block truncate max-w-[130px]">
                            {row.player}
                          </span>
                          <span className="text-[10px] font-normal text-slate-400 capitalize">
                            {row.mode === 'versus' ? 'Duel' : 'Solo'} ·{' '}
                            {row.difficulty}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                          {row.wpm}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-emerald-400 tabular-nums">
                          {row.accuracy}%
                        </td>
                        <td className="py-2.5 pl-2 pr-3 text-right font-mono font-bold text-indigo-400 tabular-nums">
                          {row.score.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onClearLeaderboard}
                className="text-xs font-medium text-slate-400 hover:text-rose-400 cursor-pointer"
              >
                Reset Scores
              </button>
              <button
                type="button"
                onClick={() => setShowLeaderboard(false)}
                className="min-h-[40px] rounded-xl bg-indigo-600 px-5 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
