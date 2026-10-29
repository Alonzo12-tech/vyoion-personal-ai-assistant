import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import {
  Sparkles,
  Sliders,
  Eye,
  EyeOff,
  RotateCcw,
  Zap,
  Compass,
  Layers,
  Activity,
  Cpu,
  Disc,
  Hexagon,
  CircleDot,
  Maximize2
} from 'lucide-react';

// ============================================================================
// COLOR PALETTES (Inspired by Motion.dev & High-Craft Minimalist Aesthetics)
// ============================================================================
const PALETTES = {
  motionCyan: {
    name: 'Motion Cyan',
    bg: '#050508',
    shellPrimary: '#00d2ff',
    shellSecondary: '#0051ff',
    corePrimary: '#e0ffff',
    coreSecondary: '#38bdf8',
    accent: '#00f0ff',
    badge: 'from-cyan-400 to-blue-600'
  },
  ultraviolet: {
    name: 'Ultraviolet Void',
    bg: '#06040a',
    shellPrimary: '#a855f7',
    shellSecondary: '#4f46e5',
    corePrimary: '#f5d0fe',
    coreSecondary: '#c084fc',
    accent: '#d946ef',
    badge: 'from-purple-400 to-indigo-600'
  },
  iridescentPearl: {
    name: 'Iridescent Pearl',
    bg: '#060709',
    shellPrimary: '#94a3b8',
    shellSecondary: '#ec4899',
    corePrimary: '#ffffff',
    coreSecondary: '#38bdf8',
    accent: '#f472b6',
    badge: 'from-slate-200 via-pink-400 to-cyan-400'
  },
  solarFlare: {
    name: 'Solar Gold',
    bg: '#080503',
    shellPrimary: '#f59e0b',
    shellSecondary: '#dc2626',
    corePrimary: '#fef08a',
    coreSecondary: '#fb923c',
    accent: '#fbbf24',
    badge: 'from-amber-400 to-red-600'
  },
  monochrome: {
    name: 'Monochrome Silver',
    bg: '#040405',
    shellPrimary: '#d4d4d8',
    shellSecondary: '#52525b',
    corePrimary: '#ffffff',
    coreSecondary: '#a1a1aa',
    accent: '#ffffff',
    badge: 'from-white to-zinc-500'
  }
};

// ============================================================================
// CORE EMBLEM FORMATIONS (Replaces the React Logo with Morphing 3D Geometry)
// ============================================================================
const CORE_MODES = [
  { id: 'octaPrism', label: 'Octa-Prism Core', icon: Hexagon, desc: 'Sacred crystalline octahedron with energy struts' },
  { id: 'gyroRings', label: 'Quantum Gyro', icon: Disc, desc: '3-axis interlocking orbital singularity rings & nucleus' },
  { id: 'merkaba', label: 'Sacred Merkaba', icon: Compass, desc: 'Counter-rotating star tetrahedron light vehicle' },
  { id: 'torusKnot', label: 'Harmonic Knot', icon: Activity, desc: 'Continuous trefoil plasma phase ribbon' },
  { id: 'pureWave', label: 'Pure Wave Core', icon: CircleDot, desc: 'Concentrated harmonic standing-wave singularity' }
];

// ============================================================================
// PARTICLE GEOMETRY GENERATORS
// ============================================================================

// Helper: Sample points along a 3D line segment
function sampleSegment(A, B, t) {
  return [
    A[0] + (B[0] - A[0]) * t,
    A[1] + (B[1] - A[1]) * t,
    A[2] + (B[2] - A[2]) * t
  ];
}

// Helper: Safe acos clamped to [-1, 1] to prevent NaN at boundary indices
function safeAcos(val) {
  return Math.acos(Math.max(-1, Math.min(1, val)));
}

// Generate all 5 target positions for each particle so morphing happens smoothly on GPU/CPU
function generateParticleAttributes(shellCount = 14000, coreCount = 7000) {
  const total = shellCount + coreCount;

  const positions = new Float32Array(total * 3);
  const randoms = new Float32Array(total * 4); // phase, sizeVariance, layerType (0=shell, 1=core), subGroup
  const normals = new Float32Array(total * 3);

  // Core target buffers for seamless morphing between emblems
  const coreTargets = {
    octaPrism: new Float32Array(coreCount * 3),
    gyroRings: new Float32Array(coreCount * 3),
    merkaba: new Float32Array(coreCount * 3),
    torusKnot: new Float32Array(coreCount * 3),
    pureWave: new Float32Array(coreCount * 3),
  };

  const goldenRatio = (1 + Math.sqrt(5)) / 2;

  // 1. OUTER FIBONACCI SHELL + VOLUMETRIC HALO LAYERS
  for (let i = 0; i < shellCount; i++) {
    const idx3 = i * 3;
    const idx4 = i * 4;

    // 82% crisp outer Fibonacci lattice, 18% inner volumetric floating lattice
    const outerLimit = Math.floor(shellCount * 0.82);
    const innerCount = shellCount - outerLimit;
    const isOuterLattice = i < outerLimit;
    const normIndex = isOuterLattice
      ? (i + 0.5) / outerLimit
      : (i - outerLimit + 0.5) / innerCount;

    const theta = 2 * Math.PI * i / goldenRatio;
    const phi = safeAcos(1 - 2 * normIndex);

    const nx = Math.sin(phi) * Math.cos(theta);
    const ny = Math.sin(phi) * Math.sin(theta);
    const nz = Math.cos(phi);

    // Multi-layered shell radius for realistic depth texture
    let radius = 2.15;
    if (!isOuterLattice) {
      // Volumetric inner mist shell between 1.35 and 2.05
      radius = 1.38 + Math.pow(Math.random(), 0.7) * 0.68;
    } else {
      // Micro-stratification on the main shell
      const ringWave = Math.sin(phi * 18.0) * 0.012;
      radius = 2.15 + ringWave;
    }

    positions[idx3] = nx * radius;
    positions[idx3 + 1] = ny * radius;
    positions[idx3 + 2] = nz * radius;

    normals[idx3] = nx;
    normals[idx3 + 1] = ny;
    normals[idx3 + 2] = nz;

    randoms[idx4] = Math.random() * Math.PI * 2; // Phase offset
    randoms[idx4 + 1] = isOuterLattice ? (0.65 + Math.random() * 0.7) : (0.4 + Math.random() * 0.6); // Size
    randoms[idx4 + 2] = 0.0; // 0.0 = Outer Shell
    randoms[idx4 + 3] = isOuterLattice ? 0.0 : 0.5; // Subgroup
  }

  // Pre-define Octahedron vertices & edges
  const octaScale = 1.08;
  const octaVerts = [
    [0, octaScale, 0], [0, -octaScale, 0],
    [octaScale, 0, 0], [-octaScale, 0, 0],
    [0, 0, octaScale], [0, 0, -octaScale]
  ];
  const octaEdges = [
    [0, 2], [0, 3], [0, 4], [0, 5],
    [1, 2], [1, 3], [1, 4], [1, 5],
    [2, 4], [4, 3], [3, 5], [5, 2],
    // Inner Axis Struts
    [0, 1], [2, 3], [4, 5]
  ];

  // Pre-define Tetrahedron vertices for Merkaba (Dual interlocking tetrahedrons)
  const s = 0.72;
  const tetraA = [
    [s, s, s], [s, -s, -s], [-s, s, -s], [-s, -s, s]
  ];
  const tetraB = [
    [-s, -s, -s], [-s, s, s], [s, -s, s], [s, s, -s]
  ];
  const tetraEdges = [
    [0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]
  ];

  // 2. INNER CORE EMBLEM FORMATIONS
  for (let j = 0; j < coreCount; j++) {
    const globalIdx = shellCount + j;
    const idx3 = globalIdx * 3;
    const idx4 = globalIdx * 4;
    const cIdx3 = j * 3;
    const u = j / coreCount;

    // --- FORMATION A: OCTA-PRISM CORE ---
    {
      let pt = [0, 0, 0];
      if (u < 0.55) {
        // Sharp glowing edges of the octahedron + internal axes
        const edgeIdx = j % octaEdges.length;
        const edge = octaEdges[edgeIdx];
        const t = ((j / octaEdges.length) % 1 + (Math.random() - 0.5) * 0.02);
        const clampedT = Math.max(0, Math.min(1, t));
        pt = sampleSegment(octaVerts[edge[0]], octaVerts[edge[1]], clampedT);
        // Subtle thickness jitter
        const spread = edgeIdx >= 12 ? 0.018 : 0.028;
        pt[0] += (Math.random() - 0.5) * spread;
        pt[1] += (Math.random() - 0.5) * spread;
        pt[2] += (Math.random() - 0.5) * spread;
      } else if (u < 0.80) {
        // Equatorial & azimuthal precision halo ring around the prism
        const angle = (j * 2.39996);
        const r = 0.92 + (Math.random() - 0.5) * 0.04;
        const ringChoice = j % 2;
        if (ringChoice === 0) {
          pt = [Math.cos(angle) * r, (Math.random() - 0.5) * 0.03, Math.sin(angle) * r];
        } else {
          pt = [Math.cos(angle) * r * 0.72, Math.sin(angle) * r * 0.72, (Math.random() - 0.5) * 0.03];
        }
      } else {
        // High-density radiant inner singularity seed
        const phi = safeAcos(1 - 2 * ((u - 0.80) / 0.20));
        const theta = 2 * Math.PI * j / goldenRatio;
        const r = 0.26 * Math.cbrt(Math.random());
        pt = [
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        ];
      }
      coreTargets.octaPrism[cIdx3] = pt[0];
      coreTargets.octaPrism[cIdx3 + 1] = pt[1];
      coreTargets.octaPrism[cIdx3 + 2] = pt[2];
    }

    // --- FORMATION B: QUANTUM GYRO RINGS (Upgraded Architectural Emblem) ---
    {
      let pt = [0, 0, 0];
      if (u < 0.78) {
        // 3 Interlocking Tilted Elliptical/Circular Gimbal Rings with double-track detail
        const ringIdx = j % 3;
        const angle = (j / coreCount) * Math.PI * 24 + (j * 0.13);
        const trackOffset = ((j % 2) - 0.5) * 0.045;
        const r = (0.98 - ringIdx * 0.08) + trackOffset;
        // Slight elliptical harmonic breathing
        const x0 = Math.cos(angle) * r;
        const y0 = Math.sin(angle) * r * 0.88;
        const z0 = (Math.random() - 0.5) * 0.032;

        // Rotate each ring into a clean sacred 3-axis gimbal arrangement
        const tiltX = ringIdx === 0 ? 0.55 : ringIdx === 1 ? -0.55 : 1.5708;
        const tiltY = ringIdx === 0 ? 0.45 : ringIdx === 1 ? -0.45 : 0.0;

        // Rotate X
        const y1 = y0 * Math.cos(tiltX) - z0 * Math.sin(tiltX);
        const z1 = y0 * Math.sin(tiltX) + z0 * Math.cos(tiltX);
        // Rotate Y
        const x2 = x0 * Math.cos(tiltY) + z1 * Math.sin(tiltY);
        const z2 = -x0 * Math.sin(tiltY) + z1 * Math.cos(tiltY);

        pt = [x2, y1, z2];
      } else {
        // Dense radiant core sphere with orbital nodes
        const phi = safeAcos(1 - 2 * ((u - 0.78) / 0.22));
        const theta = 2 * Math.PI * j / goldenRatio;
        const r = 0.31 * (0.65 + 0.35 * Math.random());
        pt = [
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        ];
      }
      coreTargets.gyroRings[cIdx3] = pt[0];
      coreTargets.gyroRings[cIdx3 + 1] = pt[1];
      coreTargets.gyroRings[cIdx3 + 2] = pt[2];
    }

    // --- FORMATION C: SACRED MERKABA (Star Tetrahedron) ---
    {
      let pt = [0, 0, 0];
      if (u < 0.76) {
        const isSecondTetra = (j % 2) === 1;
        const verts = isSecondTetra ? tetraB : tetraA;
        const edge = tetraEdges[j % tetraEdges.length];
        const t = Math.random();
        pt = sampleSegment(verts[edge[0]], verts[edge[1]], t);
        const jitter = 0.025;
        pt[0] += (Math.random() - 0.5) * jitter;
        pt[1] += (Math.random() - 0.5) * jitter;
        pt[2] += (Math.random() - 0.5) * jitter;
      } else {
        // Inner merkaba energy heart
        const phi = safeAcos(1 - 2 * ((u - 0.76) / 0.24));
        const theta = 2 * Math.PI * j / goldenRatio;
        const r = 0.38;
        pt = [
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        ];
      }
      coreTargets.merkaba[cIdx3] = pt[0];
      coreTargets.merkaba[cIdx3 + 1] = pt[1];
      coreTargets.merkaba[cIdx3 + 2] = pt[2];
    }

    // --- FORMATION D: HARMONIC TORUS KNOT (p=2, q=3) ---
    {
      const t = u * Math.PI * 2 * 3;
      const p = 2;
      const q = 3;
      const scale = 0.42;
      const r = scale * (2.0 + Math.cos(q * t));
      const tubeAngle = j * 2.39996;
      const tubeRadius = 0.095 + 0.03 * Math.sin(t * 6.0);

      const cx = r * Math.cos(p * t);
      const cy = r * Math.sin(p * t);
      const cz = -scale * 1.15 * Math.sin(q * t);

      coreTargets.torusKnot[cIdx3] = cx + Math.cos(tubeAngle) * tubeRadius;
      coreTargets.torusKnot[cIdx3 + 1] = cy + Math.sin(tubeAngle) * tubeRadius;
      coreTargets.torusKnot[cIdx3 + 2] = cz + (Math.random() - 0.5) * tubeRadius;
    }

    // --- FORMATION E: PURE FLUID STANDING-WAVE SPHERE ---
    {
      const phi = safeAcos(1 - 2 * u);
      const theta = 2 * Math.PI * j / goldenRatio;
      const harmonicR = 0.78 + 0.18 * Math.sin(phi * 6.0) * Math.cos(theta * 4.0);
      coreTargets.pureWave[cIdx3] = harmonicR * Math.sin(phi) * Math.cos(theta);
      coreTargets.pureWave[cIdx3 + 1] = harmonicR * Math.sin(phi) * Math.sin(theta);
      coreTargets.pureWave[cIdx3 + 2] = harmonicR * Math.cos(phi);
    }

    // Set default core positions to OctaPrism
    positions[idx3] = coreTargets.octaPrism[cIdx3];
    positions[idx3 + 1] = coreTargets.octaPrism[cIdx3 + 1];
    positions[idx3 + 2] = coreTargets.octaPrism[cIdx3 + 2];

    const len = Math.hypot(positions[idx3], positions[idx3 + 1], positions[idx3 + 2]) || 1;
    normals[idx3] = positions[idx3] / len;
    normals[idx3 + 1] = positions[idx3 + 1] / len;
    normals[idx3 + 2] = positions[idx3 + 2] / len;

    randoms[idx4] = Math.random() * Math.PI * 2;
    randoms[idx4 + 1] = 0.8 + Math.random() * 0.85; // Core particles slightly brighter/crisper
    randoms[idx4 + 2] = 1.0; // 1.0 = Inner Core Emblem
    randoms[idx4 + 3] = (j % 3) / 3.0;
  }

  return {
    positions,
    normals,
    randoms,
    coreTargets,
    shellCount,
    coreCount,
    total
  };
}

// ============================================================================
// CUSTOM GLSL SHADERS (3D Simplex Wave Field + Spring Squeeze + Pointer Ripple)
// ============================================================================
const VERTEX_SHADER = `
  uniform float uTime;
  uniform float uReveal;          // 0 -> 1 entrance spring reveal
  uniform float uSqueeze;         // Press & hold inward tension
  uniform float uShockwave;       // Radial shockwave progress (0 -> 1)
  uniform float uShockIntensity;  // Shockwave amplitude
  uniform float uWaveFreq;        // Harmonic wave spatial frequency
  uniform float uWaveAmp;         // Harmonic wave amplitude
  uniform float uParticleScale;   // Global point size scale
  uniform float uMorphProgress;   // 0 -> 1 smooth core morphing
  uniform vec3 uPointerWorld;     // 3D cursor ray intersection on sphere
  uniform float uPointerActive;   // 0 -> 1 smooth hover strength
  uniform vec3 uVelocity;         // Throw/drag velocity vector for inertia stretch
  uniform mat4 uCoreRotation;     // Independent gyroscope rotation for inner core

  attribute vec3 aNormal;
  attribute vec4 aRandom;         // x: phase, y: size, z: isCore (0/1), w: subgroup
  attribute vec3 aTargetNext;     // Morph target position for inner core

  varying float vIsCore;
  varying float vWaveEnergy;
  varying float vPointerProximity;
  varying float vDepthAlpha;
  varying float vShockGlow;
  varying float vPhase;

  // Fast 3D Simplex-style Harmonic Noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    float phase = aRandom.x;
    float sizeVar = aRandom.y;
    float isCore = aRandom.z;
    vIsCore = isCore;
    vPhase = phase;

    // 1. Base Position & Smooth Core Morphing
    vec3 basePos = position;
    if (isCore > 0.5) {
      basePos = mix(position, aTargetNext, smoothstep(0.0, 1.0, uMorphProgress));
      // Apply independent gyroscope rotation to the inner core emblem
      basePos = (uCoreRotation * vec4(basePos, 1.0)).xyz;
    }

    vec3 dir = normalize(basePos + vec3(0.0001));
    float baseRadius = length(basePos);

    // 2. Multi-Layered 3D Fluid Wave Physics
    float timeScaled = uTime * 0.75;
    float noise1 = snoise(dir * uWaveFreq + vec3(timeScaled, -timeScaled * 0.6, timeScaled * 0.4));
    float noise2 = snoise(basePos * (uWaveFreq * 1.65) - vec3(timeScaled * 1.1));
    float harmonicWave = sin(basePos.y * (uWaveFreq * 2.5) - uTime * 2.4 + phase * 0.35) * 0.35;

    float combinedWave = (noise1 * 0.65 + noise2 * 0.35 + harmonicWave * 0.3) * uWaveAmp;

    // Inner core gets finer, tighter crystalline harmonic vibration
    if (isCore > 0.5) {
      float corePulse = sin(uTime * 3.0 + baseRadius * 5.0 + phase) * 0.025;
      combinedWave = combinedWave * 0.42 + corePulse;
    }

    // 3. Entrance & Reveal Spring Animation (Swirling Quantum Condensation)
    float revealInv = 1.0 - uReveal;
    float swirlAngle = revealInv * 4.5 * (1.0 + isCore * 0.8);
    mat2 swirlMat = mat2(cos(swirlAngle), -sin(swirlAngle), sin(swirlAngle), cos(swirlAngle));
    vec3 pos = basePos;
    pos.xz = swirlMat * pos.xz;
    // Expand outward then snap into spherical lattice
    float entranceScale = mix(0.05 + fract(phase) * 2.6, 1.0, uReveal);
    pos *= entranceScale;

    // Apply radial wave displacement
    pos += dir * combinedWave;

    // 4. Press & Squeeze Spring Tension (Compresses shell & energizes core)
    float squeezeFactor = 1.0 - uSqueeze * (isCore > 0.5 ? 0.18 : 0.34);
    float squeezeJitter = uSqueeze * sin(uTime * 28.0 + phase * 6.28) * 0.028;
    pos *= squeezeFactor;
    pos += dir * squeezeJitter;

    // 5. Radial Shockwave Ripple (Triggered on release or button)
    float normalizedDist = clamp(baseRadius / 2.25, 0.0, 1.2);
    float waveFront = uShockwave * 1.35;
    float distToWave = abs(normalizedDist - waveFront);
    float shockBand = smoothstep(0.32, 0.0, distToWave) * sin((1.0 - distToWave / 0.32) * 3.14159);
    float shockDisplace = shockBand * uShockIntensity * (isCore > 0.5 ? 0.28 : 0.52);
    pos += dir * shockDisplace;
    vShockGlow = shockBand * clamp(uShockIntensity * 1.4, 0.0, 1.5);

    // 6. Velocity Inertia Stretch (From Drag & Throw momentum)
    float velMag = length(uVelocity);
    if (velMag > 0.001) {
      vec3 velDir = normalize(uVelocity);
      float alignment = dot(dir, velDir);
      // Trailing particles stretch subtly along throw vector
      pos += uVelocity * (0.14 * (1.0 - isCore * 0.5) * (0.5 + 0.5 * abs(alignment)));
    }

    // 7. World-Space Pointer Magnetic Ripple & Repulsion Field
    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    float distToPointer = distance(worldPosition.xyz, uPointerWorld);
    float pointerRadius = isCore > 0.5 ? 1.15 : 1.45;
    float prox = smoothstep(pointerRadius, 0.0, distToPointer) * uPointerActive;

    if (prox > 0.001) {
      vec3 repelDir = normalize(worldPosition.xyz - uPointerWorld + vec3(0.0001));
      // Magnetic concentric ripple wave around cursor
      float rippleRing = sin(distToPointer * 8.5 - uTime * 9.0) * 0.12 * prox;
      float pushOut = prox * prox * (isCore > 0.5 ? 0.16 : 0.36);
      worldPosition.xyz += repelDir * (pushOut + rippleRing);
      worldPosition.xyz += normalize(worldPosition.xyz) * (prox * 0.12);
    }

    vPointerProximity = prox;
    vWaveEnergy = clamp((combinedWave / max(uWaveAmp, 0.001)) * 0.5 + 0.5, 0.0, 1.0);

    vec4 mvPosition = viewMatrix * worldPosition;
    gl_Position = projectionMatrix * mvPosition;

    // 8. Perspective Point Attenuation & Depth-of-Field Alpha
    float viewZ = -mvPosition.z;
    vDepthAlpha = smoothstep(9.5, 2.8, viewZ);

    float coreBoost = isCore > 0.5 ? 1.22 : 1.0;
    float hoverBoost = 1.0 + prox * 0.85 + vShockGlow * 0.65 + uSqueeze * 0.3;
    gl_PointSize = (sizeVar * uParticleScale * coreBoost * hoverBoost) * (18.0 / max(viewZ, 1.0));
  }
`;

const FRAGMENT_SHADER = `
  uniform vec3 uShellPrimary;
  uniform vec3 uShellSecondary;
  uniform vec3 uCorePrimary;
  uniform vec3 uCoreSecondary;
  uniform vec3 uAccent;
  uniform float uGlowIntensity;
  uniform float uSqueeze;

  varying float vIsCore;
  varying float vWaveEnergy;
  varying float vPointerProximity;
  varying float vDepthAlpha;
  varying float vShockGlow;
  varying float vPhase;

  void main() {
    // Crisp circular soft-core particle sprite
    vec2 uv = gl_PointCoord.xy - 0.5;
    float dist = length(uv);
    if (dist > 0.5) discard;

    // Dual-falloff radial luminance (hot center + soft atmospheric halo)
    float hardCore = smoothstep(0.28, 0.0, dist);
    float softHalo = pow(clamp(1.0 - dist * 2.0, 0.0, 1.0), 1.85);
    float strength = mix(softHalo, hardCore, 0.55);

    // Select palette based on Shell vs Inner Core Emblem
    vec3 baseColor;
    if (vIsCore > 0.5) {
      baseColor = mix(uCoreSecondary, uCorePrimary, smoothstep(0.2, 0.85, vWaveEnergy));
      // Extra hot white-luminescent center for core emblem particles
      baseColor = mix(baseColor, vec3(1.0), hardCore * 0.55);
    } else {
      baseColor = mix(uShellSecondary, uShellPrimary, vWaveEnergy);
    }

    // Highlight wave crests, pointer magnetic field, and shockwave rings with accent hue
    float excitement = clamp(vPointerProximity * 1.15 + vShockGlow * 0.95 + uSqueeze * 0.45, 0.0, 1.0);
    vec3 finalColor = mix(baseColor, uAccent, excitement * 0.75);
    finalColor += vec3(0.95, 0.98, 1.0) * (hardCore * excitement * 0.65);

    // Subtle twinkle shimmer
    float alpha = strength * vDepthAlpha * uGlowIntensity;
    if (vIsCore > 0.5) {
      alpha *= 1.25;
    } else {
      alpha *= (0.55 + 0.45 * vWaveEnergy);
    }

    alpha = clamp(alpha + excitement * 0.35, 0.0, 1.0);

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

// ============================================================================
// MAIN REACT COMPONENT
// ============================================================================
export default function App() {
  // UI & Customization State
  const [coreMode, setCoreMode] = useState('octaPrism');
  const [paletteKey, setPaletteKey] = useState('motionCyan');
  const [showHUD, setShowHUD] = useState(true);
  const [showControlsDrawer, setShowControlsDrawer] = useState(false);

  // Interactive Physics Parameters
  const [waveFreq, setWaveFreq] = useState(1.35);
  const [waveAmp, setWaveAmp] = useState(0.18);
  const [springStiffness, setSpringStiffness] = useState(0.085);
  const [particleScale, setParticleScale] = useState(2.2);
  const [glowIntensity, setGlowIntensity] = useState(0.92);
  const [autoRotateSpeed, setAutoRotateSpeed] = useState(0.35);

  // Live telemetry indicators for subtle Motion-style HUD readout
  const [interactionState, setInteractionState] = useState('IDLE HARMONIC');

  const mountRef = useRef(null);
  const materialRef = useRef(null);
  const geometryRef = useRef(null);
  const coreTargetsRef = useRef(null);

  // Physics simulation state stored in a mutable ref for 60/120fps loop accuracy
  const physicsRef = useRef({
    // Entrance spring
    reveal: 0.0,
    revealVel: 0.0,
    revealTarget: 1.0,

    // Squeeze spring (press & hold)
    isPressed: false,
    squeeze: 0.0,
    squeezeVel: 0.0,
    squeezeTarget: 0.0,

    // Radial shockwave
    shockwave: 1.5,
    shockIntensity: 0.0,

    // Drag & Throw rotational + positional spring physics
    isDragging: false,
    lastPointer: { x: 0, y: 0 },
    rotX: 0.15,
    rotY: 0.3,
    velRotX: 0.0,
    velRotY: 0.0,

    // Orb center displacement sway (spring return to center)
    posX: 0.0,
    posY: 0.0,
    velPosX: 0.0,
    velPosY: 0.0,
    targetPosX: 0.0,
    targetPosY: 0.0,

    // Pointer hover 3D ray intersection
    pointerNDC: new THREE.Vector2(99, 99),
    pointerWorld: new THREE.Vector3(0, 0, 10),
    pointerActive: 0.0,
    isHoveringOrb: false,

    // Core morph state
    morphProgress: 1.0,
    currentCoreMode: 'octaPrism',

    // Dynamic settings synced from React state
    waveFreq: 1.35,
    waveAmp: 0.18,
    springStiffness: 0.085,
    particleScale: 2.2,
    glowIntensity: 0.92,
    autoRotateSpeed: 0.35
  });

  // Sync React controls to physicsRef
  useEffect(() => {
    physicsRef.current.waveFreq = waveFreq;
    physicsRef.current.waveAmp = waveAmp;
    physicsRef.current.springStiffness = springStiffness;
    physicsRef.current.particleScale = particleScale;
    physicsRef.current.glowIntensity = glowIntensity;
    physicsRef.current.autoRotateSpeed = autoRotateSpeed;
  }, [waveFreq, waveAmp, springStiffness, particleScale, glowIntensity, autoRotateSpeed]);

  // Sync Palette colors to Shader Uniforms smoothly
  const currentPalette = PALETTES[paletteKey];
  useEffect(() => {
    if (!materialRef.current) return;
    const u = materialRef.current.uniforms;
    u.uShellPrimary.value.set(currentPalette.shellPrimary);
    u.uShellSecondary.value.set(currentPalette.shellSecondary);
    u.uCorePrimary.value.set(currentPalette.corePrimary);
    u.uCoreSecondary.value.set(currentPalette.coreSecondary);
    u.uAccent.value.set(currentPalette.accent);
  }, [currentPalette]);

  // Trigger smooth GPU/CPU attribute morph when user switches the inner core emblem
  const handleSelectCoreMode = useCallback((newModeId) => {
    if (newModeId === coreMode) return;
    const geo = geometryRef.current;
    const targets = coreTargetsRef.current;
    if (geo && targets) {
      const posAttr = geo.attributes.position;
      const nextAttr = geo.attributes.aTargetNext;
      const shellCount = targets.shellCount;
      const coreCount = targets.coreCount;
      const currentMorph = physicsRef.current.morphProgress;

      // Bake current interpolated core positions into `position` and load new target into `aTargetNext`
      const nextBuffer = targets.coreTargets[newModeId];
      for (let j = 0; j < coreCount; j++) {
        const globalIdx3 = (shellCount + j) * 3;
        const cIdx3 = j * 3;

        const curX = posAttr.array[globalIdx3] + (nextAttr.array[globalIdx3] - posAttr.array[globalIdx3]) * currentMorph;
        const curY = posAttr.array[globalIdx3 + 1] + (nextAttr.array[globalIdx3 + 1] - posAttr.array[globalIdx3 + 1]) * currentMorph;
        const curZ = posAttr.array[globalIdx3 + 2] + (nextAttr.array[globalIdx3 + 2] - posAttr.array[globalIdx3 + 2]) * currentMorph;

        posAttr.array[globalIdx3] = curX;
        posAttr.array[globalIdx3 + 1] = curY;
        posAttr.array[globalIdx3 + 2] = curZ;

        nextAttr.array[globalIdx3] = nextBuffer[cIdx3];
        nextAttr.array[globalIdx3 + 1] = nextBuffer[cIdx3 + 1];
        nextAttr.array[globalIdx3 + 2] = nextBuffer[cIdx3 + 2];
      }
      posAttr.needsUpdate = true;
      nextAttr.needsUpdate = true;

      physicsRef.current.morphProgress = 0.0;
      // Subtle shockwave pulse on core transformation
      physicsRef.current.shockwave = 0.0;
      physicsRef.current.shockIntensity = 0.45;
    }
    setCoreMode(newModeId);
  }, [coreMode]);

  // Trigger radial shockwave manually
  const triggerShockwave = useCallback((intensity = 0.95) => {
    physicsRef.current.shockwave = 0.0;
    physicsRef.current.shockIntensity = intensity;
    setInteractionState('SHOCKWAVE PULSE');
    setTimeout(() => setInteractionState('IDLE HARMONIC'), 900);
  }, []);

  // Replay entrance implosion/reveal animation
  const replayEntrance = useCallback(() => {
    physicsRef.current.reveal = 0.0;
    physicsRef.current.revealVel = 0.0;
    physicsRef.current.shockwave = 0.0;
    physicsRef.current.shockIntensity = 0.7;
    physicsRef.current.velRotY += 0.14;
    setInteractionState('QUANTUM ENTRANCE');
    setTimeout(() => setInteractionState('IDLE HARMONIC'), 1200);
  }, []);

  // ============================================================================
  // THREE.JS WEBGL INITIALIZATION & PHYSICS ANIMATION LOOP
  // ============================================================================
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 6.4);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 3. Generate Particle Lattice & Morphable Core Geometry
    const particleData = generateParticleAttributes(14500, 7200);
    coreTargetsRef.current = particleData;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(particleData.positions, 3));
    geometry.setAttribute('aNormal', new THREE.BufferAttribute(particleData.normals, 3));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(particleData.randoms, 4));

    // Initialize aTargetNext with initial core positions
    const initialTargetNext = new Float32Array(particleData.positions);
    geometry.setAttribute('aTargetNext', new THREE.BufferAttribute(initialTargetNext, 3));
    geometryRef.current = geometry;

    // 4. Custom Shader Material
    const initPal = PALETTES[paletteKey];
    const uniforms = {
      uTime: { value: 0 },
      uReveal: { value: 0.0 },
      uSqueeze: { value: 0.0 },
      uShockwave: { value: 1.5 },
      uShockIntensity: { value: 0.0 },
      uWaveFreq: { value: physicsRef.current.waveFreq },
      uWaveAmp: { value: physicsRef.current.waveAmp },
      uParticleScale: { value: physicsRef.current.particleScale * renderer.getPixelRatio() },
      uGlowIntensity: { value: physicsRef.current.glowIntensity },
      uMorphProgress: { value: 1.0 },
      uPointerWorld: { value: new THREE.Vector3(0, 0, 10) },
      uPointerActive: { value: 0.0 },
      uVelocity: { value: new THREE.Vector3(0, 0, 0) },
      uCoreRotation: { value: new THREE.Matrix4() },
      uShellPrimary: { value: new THREE.Color(initPal.shellPrimary) },
      uShellSecondary: { value: new THREE.Color(initPal.shellSecondary) },
      uCorePrimary: { value: new THREE.Color(initPal.corePrimary) },
      uCoreSecondary: { value: new THREE.Color(initPal.coreSecondary) },
      uAccent: { value: new THREE.Color(initPal.accent) }
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    materialRef.current = material;

    // 5. Particle Orb Mesh & Invisible Raycast Proxy Sphere
    const orbGroup = new THREE.Group();
    scene.add(orbGroup);

    const pointsMesh = new THREE.Points(geometry, material);
    orbGroup.add(pointsMesh);

    const hitSphereGeo = new THREE.SphereGeometry(2.22, 32, 32);
    const hitSphereMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitSphere = new THREE.Mesh(hitSphereGeo, hitSphereMat);
    orbGroup.add(hitSphere);

    const raycaster = new THREE.Raycaster();
    const coreEuler = new THREE.Euler(0, 0, 0, 'XYZ');
    const coreMatrix = new THREE.Matrix4();

    // 6. Pointer / Touch / Drag / Squeeze Event Handlers
    const updatePointerCoords = (clientX, clientY) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((clientY - rect.top) / rect.height) * 2 + 1;
      physicsRef.current.pointerNDC.set(x, y);
    };

    const onPointerDown = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      updatePointerCoords(clientX, clientY);

      const p = physicsRef.current;
      p.isDragging = true;
      p.isPressed = true;
      p.squeezeTarget = 1.0;
      p.lastPointer = { x: clientX, y: clientY };
      setInteractionState('SQUEEZE & TENSION');
    };

    const onPointerMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      updatePointerCoords(clientX, clientY);

      const p = physicsRef.current;
      if (p.isDragging) {
        const dx = clientX - p.lastPointer.x;
        const dy = clientY - p.lastPointer.y;
        p.lastPointer = { x: clientX, y: clientY };

        // Apply rotational momentum & elastic positional pull (Motion Throw feel)
        p.velRotY = dx * 0.0065;
        p.velRotX = dy * 0.0065;
        p.rotY += p.velRotY;
        p.rotX += p.velRotX;

        // Elastic translation offset when dragging the orb
        p.targetPosX = Math.max(-1.1, Math.min(1.1, p.targetPosX + dx * 0.0045));
        p.targetPosY = Math.max(-1.1, Math.min(1.1, p.targetPosY - dy * 0.0045));

        if (Math.hypot(dx, dy) > 2.5) {
          setInteractionState('KINETIC THROW');
        }
      } else {
        // Subtle parallax sway when moving cursor around screen
        p.targetPosX = p.pointerNDC.x * 0.16;
        p.targetPosY = p.pointerNDC.y * 0.16;
      }
    };

    const onPointerUp = () => {
      const p = physicsRef.current;
      if (!p.isDragging && !p.isPressed) return;

      // Release squeeze tension -> launch radial shockwave proportional to squeeze amount
      if (p.squeeze > 0.18) {
        p.shockwave = 0.0;
        p.shockIntensity = Math.min(1.25, 0.45 + p.squeeze * 0.85);
        setInteractionState('SHOCKWAVE RELEASE');
        setTimeout(() => {
          if (!physicsRef.current.isPressed) setInteractionState('IDLE HARMONIC');
        }, 750);
      } else {
        setInteractionState('IDLE HARMONIC');
      }

      p.isDragging = false;
      p.isPressed = false;
      p.squeezeTarget = 0.0;
      p.targetPosX = 0.0;
      p.targetPosY = 0.0;
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    // 7. Responsive Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      // Automatically adjust camera distance on narrow mobile viewports so orb fits comfortably
      camera.position.z = w < 640 ? 7.6 : 6.4;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // 8. High-Precision Spring & Wave Animation Loop
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();
      const p = physicsRef.current;
      const stiffness = p.springStiffness;
      const damping = 0.82;

      // A. Entrance Reveal Spring (0 -> 1)
      const revealForce = (p.revealTarget - p.reveal) * 0.055;
      p.revealVel = (p.revealVel + revealForce) * 0.84;
      p.reveal = Math.min(1.05, Math.max(0.0, p.reveal + p.revealVel));

      // B. Squeeze Tension Spring (Hooke's Law with underdamped bounce on release)
      const squeezeForce = (p.squeezeTarget - p.squeeze) * (stiffness * 1.4);
      p.squeezeVel = (p.squeezeVel + squeezeForce) * 0.78;
      p.squeeze += p.squeezeVel;

      // C. Shockwave Propagation
      if (p.shockwave < 1.45) {
        p.shockwave += 0.022;
        p.shockIntensity *= 0.975;
      } else {
        p.shockIntensity = 0.0;
      }

      // D. Core Morph Transition
      if (p.morphProgress < 1.0) {
        p.morphProgress = Math.min(1.0, p.morphProgress + 0.032);
      }

      // E. Positional Sway & Throw Return Spring
      const forceX = (p.targetPosX - p.posX) * stiffness;
      const forceY = (p.targetPosY - p.posY) * stiffness;
      p.velPosX = (p.velPosX + forceX) * damping;
      p.velPosY = (p.velPosY + forceY) * damping;
      p.posX += p.velPosX;
      p.posY += p.velPosY;

      // Idle organic levitation sway
      const idleSwayX = Math.sin(elapsed * 0.7) * 0.06;
      const idleSwayY = Math.cos(elapsed * 0.9) * 0.07;
      orbGroup.position.set(p.posX + idleSwayX, p.posY + idleSwayY, 0);

      // F. Rotational Momentum & Idle Orbit
      if (!p.isDragging) {
        p.velRotX *= 0.955;
        p.velRotY *= 0.955;
        p.rotY += p.velRotY + 0.0035 * p.autoRotateSpeed;
        p.rotX += p.velRotX + Math.sin(elapsed * 0.4) * 0.0008;
        // Gently relax X tilt toward balanced horizon
        p.rotX += (0.12 - p.rotX) * 0.015;
      }
      orbGroup.rotation.set(p.rotX, p.rotY, 0);

      // G. Independent Inner Core Gyroscope Rotation (Counter-rotates with harmonic precision)
      coreEuler.set(
        elapsed * 0.45 * p.autoRotateSpeed - p.rotX * 1.35,
        -elapsed * 0.75 * p.autoRotateSpeed - p.rotY * 0.65,
        Math.sin(elapsed * 0.5) * 0.35
      );
      coreMatrix.makeRotationFromEuler(coreEuler);

      // H. 3D Raycast for Pointer Repulsion & Surface Ripple
      raycaster.setFromCamera(p.pointerNDC, camera);
      const intersects = raycaster.intersectObject(hitSphere);
      if (intersects.length > 0) {
        p.pointerWorld.lerp(intersects[0].point, 0.28);
        p.pointerActive += (1.0 - p.pointerActive) * 0.16;
        p.isHoveringOrb = true;
      } else {
        p.pointerActive += (0.0 - p.pointerActive) * 0.1;
        p.isHoveringOrb = false;
      }

      // I. Update Shader Uniforms
      uniforms.uTime.value = elapsed;
      uniforms.uReveal.value = p.reveal;
      uniforms.uSqueeze.value = p.squeeze;
      uniforms.uShockwave.value = p.shockwave;
      uniforms.uShockIntensity.value = p.shockIntensity;
      uniforms.uWaveFreq.value = p.waveFreq;
      uniforms.uWaveAmp.value = p.waveAmp;
      uniforms.uParticleScale.value = p.particleScale * renderer.getPixelRatio();
      uniforms.uGlowIntensity.value = p.glowIntensity;
      uniforms.uMorphProgress.value = p.morphProgress;
      uniforms.uPointerWorld.value.copy(p.pointerWorld);
      uniforms.uPointerActive.value = p.pointerActive;
      uniforms.uVelocity.value.set(
        p.velPosX * 8.0 + p.velRotY * 4.0,
        p.velPosY * 8.0 - p.velRotX * 4.0,
        0
      );
      uniforms.uCoreRotation.value.copy(coreMatrix);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      domElem.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('resize', handleResize);
      geometry.dispose();
      material.dispose();
      hitSphereGeo.dispose();
      hitSphereMat.dispose();
      renderer.dispose();
    };
  }, []);

  const activeCoreObj = useMemo(
    () => CORE_MODES.find((m) => m.id === coreMode) || CORE_MODES[0],
    [coreMode]
  );

  return (
    <div
      className="relative w-full h-screen overflow-hidden select-none font-sans transition-colors duration-700"
      style={{ backgroundColor: currentPalette.bg }}
    >
      {/* Subtle Ambient Radial Vignette & Core Backlight */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-700"
        style={{
          background: `
            radial-gradient(circle at 50% 50%, ${currentPalette.shellSecondary}18 0%, ${currentPalette.shellPrimary}08 32%, transparent 68%),
            radial-gradient(circle at 50% 50%, transparent 45%, #000000cc 100%)
          `
        }}
      />

      {/* Interactive Three.js WebGL Particle Orb Canvas */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Top Minimalist Header Bar */}
      {showHUD && (
        <header className="pointer-events-none absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-4 sm:px-8 sm:py-6">
          {/* Left Brand / Status Pill */}
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/10 bg-black/45 px-4 py-2 backdrop-blur-xl shadow-2xl">
            <span
              className="h-2 w-2 rounded-full animate-pulse"
              style={{
                backgroundColor: currentPalette.accent,
                boxShadow: `0 0 12px ${currentPalette.accent}`
              }}
            />
            <div className="flex items-center gap-2 text-xs tracking-wider uppercase font-medium text-white/90">
              <span>Particle Orb</span>
              <span className="text-white/25">/</span>
              <span className="text-white/60 font-mono text-[11px]">{interactionState}</span>
            </div>
          </div>

          {/* Right Quick Actions */}
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={() => triggerShockwave(1.0)}
              title="Trigger Radial Wave Pulse"
              className="group flex items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-3.5 py-2 text-xs font-medium text-white/80 hover:text-white hover:border-white/25 hover:bg-white/10 backdrop-blur-xl transition-all active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Pulse Wave</span>
            </button>

            <button
              onClick={replayEntrance}
              title="Replay Entrance Reveal"
              className="group flex items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-3.5 py-2 text-xs font-medium text-white/80 hover:text-white hover:border-white/25 hover:bg-white/10 backdrop-blur-xl transition-all active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5 text-white/70 group-hover:-rotate-45 transition-transform" />
              <span className="hidden sm:inline">Reveal</span>
            </button>

            <button
              onClick={() => setShowControlsDrawer((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium backdrop-blur-xl transition-all active:scale-95 ${
                showControlsDrawer
                  ? 'border-white/30 bg-white/15 text-white'
                  : 'border-white/10 bg-black/45 text-white/80 hover:text-white hover:border-white/25'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Physics</span>
            </button>

            <button
              onClick={() => setShowHUD(false)}
              title="Pure Minimalist Mode (Hide UI)"
              className="flex items-center justify-center rounded-full border border-white/10 bg-black/45 p-2 text-white/70 hover:text-white hover:border-white/25 backdrop-blur-xl transition-all active:scale-95"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>
      )}

      {/* Restore HUD Floating Button when in Pure Minimalist Mode */}
      {!showHUD && (
        <button
          onClick={() => setShowHUD(true)}
          className="fixed top-5 right-5 z-30 flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3.5 py-2 text-xs text-white/60 hover:text-white hover:border-white/25 backdrop-blur-xl transition-all"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Show HUD</span>
        </button>
      )}

      {/* Collapsible Physics & Shader Tuning Drawer (Right Side) */}
      {showHUD && showControlsDrawer && (
        <aside className=" fixed right-5 top-20 z-20 w-72 sm:w-80 rounded-2xl border border-white/10 bg-black/65 p-5 text-white backdrop-blur-2xl shadow-2xl transition-all">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-white/90">
                Wave & Spring Physics
              </h2>
            </div>
            <span className="text-[11px] font-mono text-white/40">21.7K PTS</span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Wave Frequency */}
            <div>
              <div className="flex justify-between text-white/70 mb-1">
                <span>Harmonic Wave Frequency</span>
                <span className="font-mono text-white/90">{waveFreq.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="3.2"
                step="0.05"
                value={waveFreq}
                onChange={(e) => setWaveFreq(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 bg-white/10 h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            {/* Wave Amplitude */}
            <div>
              <div className="flex justify-between text-white/70 mb-1">
                <span>Surface Wave Amplitude</span>
                <span className="font-mono text-white/90">{waveAmp.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.02"
                max="0.45"
                step="0.01"
                value={waveAmp}
                onChange={(e) => setWaveAmp(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 bg-white/10 h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            {/* Spring Stiffness */}
            <div>
              <div className="flex justify-between text-white/70 mb-1">
                <span>Spring Elasticity & Snap</span>
                <span className="font-mono text-white/90">{(springStiffness * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.03"
                max="0.18"
                step="0.005"
                value={springStiffness}
                onChange={(e) => setSpringStiffness(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 bg-white/10 h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            {/* Particle Size / Texture */}
            <div>
              <div className="flex justify-between text-white/70 mb-1">
                <span>Micro-Particle Crispness</span>
                <span className="font-mono text-white/90">{particleScale.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="1.1"
                max="3.6"
                step="0.1"
                value={particleScale}
                onChange={(e) => setParticleScale(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 bg-white/10 h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            {/* Gyroscope Orbit Speed */}
            <div>
              <div className="flex justify-between text-white/70 mb-1">
                <span>Gyroscope Orbit Speed</span>
                <span className="font-mono text-white/90">{autoRotateSpeed.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.5"
                step="0.05"
                value={autoRotateSpeed}
                onChange={(e) => setAutoRotateSpeed(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 bg-white/10 h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            {/* Color Palette Switcher */}
            <div className="pt-2 border-t border-white/10">
              <span className="block text-white/60 mb-2.5">Chromatic Atmosphere</span>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(PALETTES).map(([key, pal]) => {
                  const active = key === paletteKey;
                  return (
                    <button
                      key={key}
                      onClick={() => setPaletteKey(key)}
                      title={pal.name}
                      className={`group relative h-7 rounded-lg border transition-all ${
                        active
                          ? 'border-white scale-105 shadow-lg'
                          : 'border-white/15 opacity-70 hover:opacity-100'
                      }`}
                      style={{
                        background: `linear-gradient(135deg, ${pal.shellPrimary}, ${pal.shellSecondary})`
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Bottom Floating Core Emblem Dock & Interaction Guide */}
      {showHUD && (
        <footer className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center gap-3 px-4 pb-5 sm:pb-7">
          {/* Subtle Interaction Hint */}
          <div className="flex items-center gap-3 text-[11px] tracking-wide text-white/45 bg-black/30 px-3.5 py-1 rounded-full border border-white/5 backdrop-blur-md">
            <span>HOVER TO RIPPLE</span>
            <span className="text-white/20">•</span>
            <span>HOLD TO SQUEEZE</span>
            <span className="text-white/20">•</span>
            <span>DRAG TO THROW</span>
          </div>

          {/* Core Emblem Selector Dock (Replaces the React Logo with Morphing Geometries) */}
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-black/55 p-1.5 backdrop-blur-2xl shadow-2xl">
            {CORE_MODES.map((mode) => {
              const IconComponent = mode.icon;
              const isSelected = coreMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => handleSelectCoreMode(mode.id)}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all duration-200 ${
                    isSelected
                      ? 'bg-white/15 text-white border border-white/25 shadow-inner'
                      : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <IconComponent
                    className="w-3.5 h-3.5 transition-transform duration-300"
                    style={{ color: isSelected ? currentPalette.accent : undefined }}
                  />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>
        </footer>
      )}
    </div>
  );
}