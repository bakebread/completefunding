// Complete Funding — Concept B "Orbit": real-time WebGL centrepiece (Three.js)
// Bundled to assets/js/scene.js with esbuild (IIFE) so it runs on GitHub Pages and file:// alike.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, TorusGeometry, SphereGeometry,
  MeshPhysicalMaterial, DirectionalLight, PointLight, AmbientLight, PMREMGenerator, BufferGeometry,
  BufferAttribute, Points, ShaderMaterial, AdditiveBlending, Color, LineLoop, LineBasicMaterial,
  EllipseCurve, ACESFilmicToneMapping, SRGBColorSpace, MathUtils
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const canvas = document.getElementById("gl");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function supportsWebGL() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
}

const api = {
  ready: false,
  // Scroll/interaction driven state (tweened by GSAP from site.js)
  state: { camZ: 9, camY: 0, ringX: 0, ringY: 0, ringScale: 1, tilt: .42, partOpacity: 1, warp: 0, glow: 1, spinBoost: 0 },
  arcTarget: 1.72,
  setArc(f) { this.arcTarget = MathUtils.clamp(f, .08, 1.999); }
};
window.orbit = api;

if (canvas && supportsWebGL()) init();
else document.documentElement.classList.add("no-webgl");

function init() {
  const isSmall = window.innerWidth < 760;
  const renderer = new WebGLRenderer({ canvas, antialias: !isSmall, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSmall ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;

  const camera = new PerspectiveCamera(34, window.innerWidth / window.innerHeight, .1, 100);
  camera.position.set(0, 0, api.state.camZ);

  // Brand-tinted lighting
  scene.add(new AmbientLight(0x0b1a2a, .6));
  const keyA = new DirectionalLight(0x6eece5, 3.2); keyA.position.set(-4, 3, 4); scene.add(keyA);
  const keyB = new DirectionalLight(0x0097b2, 4.0); keyB.position.set(5, -2, 2); scene.add(keyB);
  const rim = new PointLight(0xf9d94a, 6, 12, 2); rim.position.set(0, 2.8, -2.5); scene.add(rim);

  // ---- The ring: an open chrome arc with rounded caps ----
  const R = 1.55, TUBE = .34;
  const ringGroup = new Group();
  scene.add(ringGroup);
  const ringMat = new MeshPhysicalMaterial({
    color: new Color(0xcfe6ea), metalness: 1, roughness: .14, clearcoat: 1, clearcoatRoughness: .06,
    iridescence: .45, iridescenceIOR: 1.35, iridescenceThicknessRange: [120, 420], envMapIntensity: 1.35
  });
  let arc = api.arcTarget;
  const SEG = isSmall ? 160 : 260;
  const ring = new Mesh(new TorusGeometry(R, TUBE, 72, SEG, arc * Math.PI), ringMat);
  const capGeo = new SphereGeometry(TUBE, 48, 32);
  const capA = new Mesh(capGeo, ringMat), capB = new Mesh(capGeo, ringMat);
  const spinner = new Group();
  spinner.add(ring, capA, capB);
  ringGroup.add(spinner);
  function placeCaps() {
    capA.position.set(R, 0, 0);
    const a = arc * Math.PI;
    capB.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
  }
  placeCaps();
  function rebuildRing() {
    ring.geometry.dispose();
    ring.geometry = new TorusGeometry(R, TUBE, 72, SEG, arc * Math.PI);
    placeCaps();
  }

  // ---- Orbit lines ----
  const orbits = new Group();
  [[2.35, 2.35, .3, 0, 0x6eece5, .22], [2.9, 2.6, -.5, .6, 0x0097b2, .3], [3.6, 3.3, .9, -.3, 0x6eece5, .14]].forEach(([rx, ry, tx, ty, c, o]) => {
    const pts = new EllipseCurve(0, 0, rx, ry, 0, Math.PI * 2).getPoints(220);
    const l = new LineLoop(new BufferGeometry().setFromPoints(pts), new LineBasicMaterial({ color: c, transparent: true, opacity: o }));
    l.rotation.set(tx, ty, 0);
    orbits.add(l);
  });
  ringGroup.add(orbits);

  // ---- Particle galaxy ----
  const COUNT = isSmall ? 2600 : 6000;
  const pos = new Float32Array(COUNT * 3), col = new Float32Array(COUNT * 3), scl = new Float32Array(COUNT);
  const cA = new Color(0x6eece5), cB = new Color(0x0097b2), cW = new Color(0xffffff), cY = new Color(0xf9d94a), tmp = new Color();
  for (let i = 0; i < COUNT; i++) {
    const r = 2.1 + Math.pow(Math.random(), 1.6) * 9;
    const a = Math.random() * Math.PI * 2 + r * .35;
    const spread = (Math.random() - .5) * (.25 + r * .06);
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = spread;
    pos[i * 3 + 2] = Math.sin(a) * r;
    const m = Math.random();
    tmp.copy(m < .55 ? cA : m < .9 ? cB : m < .985 ? cW : cY).lerp(cW, Math.random() * .2);
    col.set([tmp.r, tmp.g, tmp.b], i * 3);
    scl[i] = .4 + Math.random() * 1.2;
  }
  const pGeo = new BufferGeometry();
  pGeo.setAttribute("position", new BufferAttribute(pos, 3));
  pGeo.setAttribute("aColor", new BufferAttribute(col, 3));
  pGeo.setAttribute("aScale", new BufferAttribute(scl, 1));
  const pMat = new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uSize: { value: 26 * renderer.getPixelRatio() }, uOpacity: { value: 1 }, uWarp: { value: 0 } },
    vertexShader: `
      attribute vec3 aColor; attribute float aScale;
      uniform float uTime; uniform float uSize; uniform float uWarp;
      varying vec3 vColor; varying float vTw;
      void main() {
        vec3 p = position;
        float r = length(p.xz);
        float a = uTime * (0.9 / (r + 0.6));
        float s = sin(a), c = cos(a);
        p.xz = mat2(c, -s, s, c) * p.xz;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        mv.z += uWarp * aScale * 3.0;
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * aScale * (1.0 / max(0.2, -mv.z)) * (1.0 + uWarp * 2.0);
        vColor = aColor;
        vTw = 0.55 + 0.45 * sin(uTime * 2.2 + aScale * 37.0);
      }`,
    fragmentShader: `
      uniform float uOpacity; varying vec3 vColor; varying float vTw;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        a *= a;
        gl_FragColor = vec4(vColor, a * vTw * uOpacity);
      }`
  });
  const galaxy = new Points(pGeo, pMat);
  const galaxyTilt = new Group();
  galaxyTilt.add(galaxy);
  scene.add(galaxyTilt);

  // ---- Pointer ----
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  // ---- Resize ----
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < 760 ? 46 : 34;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  // ---- Loop ----
  let last = performance.now();
  const delta = () => { const now = performance.now(), d = (now - last) / 1000; last = now; return d; };
  let running = !document.hidden, time = 0;
  function frame(dt) {
    const s = api.state;
    time += dt * (1 + s.spinBoost);
    pointer.sx += (pointer.x - pointer.sx) * .045;
    pointer.sy += (pointer.y - pointer.sy) * .045;

    if (Math.abs(api.arcTarget - arc) > .002) { arc += (api.arcTarget - arc) * (reduced ? 1 : .12); rebuildRing(); }

    camera.position.set(pointer.sx * .55, s.camY - pointer.sy * .35, s.camZ);
    camera.lookAt(0, s.camY * .6, 0);

    ringGroup.position.set(s.ringX, s.ringY, 0);
    ringGroup.scale.setScalar(s.ringScale);
    ringGroup.rotation.x = s.tilt + pointer.sy * .18;
    ringGroup.rotation.y = Math.sin(time * .35) * .22 + pointer.sx * .35;
    spinner.rotation.z = time * .18;
    orbits.children.forEach((l, i) => (l.rotation.z = time * (.05 + i * .03)));

    galaxyTilt.rotation.x = -1.08 + s.tilt * .3;
    galaxyTilt.position.set(s.ringX * .4, s.ringY * .4, 0);
    pMat.uniforms.uTime.value = time;
    pMat.uniforms.uOpacity.value = s.partOpacity;
    pMat.uniforms.uWarp.value = s.warp;
    ringMat.envMapIntensity = 1.1 + s.glow * .5;
    rim.intensity = 3 + s.glow * 5;

    renderer.render(scene, camera);
  }
  function loop() {
    if (!running) return;
    frame(Math.min(delta(), .05));
    requestAnimationFrame(loop);
  }
  document.addEventListener("visibilitychange", () => {
    const was = running;
    running = !document.hidden;
    if (running && !was && !reduced) { delta(); loop(); }
  });
  if (reduced) {
    frame(0);
    api.render = () => frame(0);
  } else loop();

  api.ready = true;
  document.documentElement.classList.add("has-webgl");
  window.dispatchEvent(new Event("orbit:ready"));
}
