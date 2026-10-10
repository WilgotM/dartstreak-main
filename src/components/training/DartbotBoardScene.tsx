import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { DartboardSvg } from "@/components/training/DartboardSvg";
import type { DartbotThrow } from "@/lib/trainingDartbot";
import { DARTBOT_FLIGHT_MS } from "@/lib/dartbotTiming";

interface DartbotBoardSceneProps {
  darts: DartbotThrow[];
  dangerNumbers: Set<number>;
  color: string;
  broadcast?: boolean;
  flightMs?: number;
}

interface FlyingDart {
  mesh: THREE.Group;
  dart: DartbotThrow;
  startedAt: number;
  target: THREE.Vector3;
}

interface BoardScene {
  renderer: THREE.WebGLRenderer;
  face: THREE.Mesh<THREE.CircleGeometry, THREE.MeshStandardMaterial>;
  addDarts: (darts: DartbotThrow[]) => void;
  render: () => void;
}

// The SVG's 83-unit scoring radius is a real 170 mm. Use the same geometry
// as the throw engine, so the animation cannot invent or shift a hit.
const WORLD_PER_SVG_UNIT = 1.7 / 83;
const BOARD_RADIUS = 100 * WORLD_PER_SVG_UNIT;

export default function DartbotBoardScene({ darts, dangerNumbers, color, broadcast = false, flightMs = DARTBOT_FLIGHT_MS }: DartbotBoardSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const textureRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<BoardScene | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("webgl2", { antialias: true, alpha: true, powerPreference: "low-power" });
      if (!context) return;
      renderer = new THREE.WebGLRenderer({ canvas, context });
    } catch {
      // Keep the real board and hit markers when WebGL is unavailable.
      return;
    }
    setReady(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    if (broadcast) { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1; }
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    let environmentTarget: THREE.WebGLRenderTarget | null = null;
    if (broadcast) {
      const room = new RoomEnvironment();
      const generator = new THREE.PMREMGenerator(renderer);
      environmentTarget = generator.fromScene(room, 0.04);
      scene.environment = environmentTarget.texture;
      scene.environmentIntensity = 0.3;
      room.dispose(); generator.dispose();
    }
    const camera = new THREE.PerspectiveCamera(36, 4 / 3, 0.1, 30);
    camera.position.set(broadcast ? 0.65 : 2.7, broadcast ? 0.12 : 0.85, broadcast ? 6.8 : 7.4);
    camera.lookAt(0, 0, 0.25);
    scene.add(new THREE.HemisphereLight(0xdbeaff, 0x343045, broadcast ? 0.9 : 2));
    const light = new THREE.SpotLight(0xffffff, broadcast ? 70 : 90, 20, 0.65, 0.8);
    light.position.set(broadcast ? 0.5 : 2, broadcast ? 1.6 : 5, broadcast ? 8 : 6);
    light.castShadow = true;
    light.shadow.mapSize.set(broadcast ? 2048 : 512, broadcast ? 2048 : 512);
    light.shadow.radius = broadcast ? 2 : 1;
    light.shadow.normalBias = 0.025;
    scene.add(light);
    const fill = new THREE.PointLight(0x94bfff, 18, 15);
    fill.position.set(-4, 0, 3);
    scene.add(fill);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const geometry = <T extends THREE.BufferGeometry>(value: T): T => { geometries.push(value); return value; };
    const material = <T extends THREE.Material>(value: T): T => { materials.push(value); return value; };
    let stageTexture: THREE.CanvasTexture | null = null;
    if (broadcast) {
      const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 256;
      const context = canvas.getContext("2d");
      if (context) {
        const pixels = context.createImageData(256, 256);
        for (let index = 0; index < pixels.data.length; index += 4) {
          const value = 80 + Math.random() * 100;
          pixels.data[index] = value; pixels.data[index + 1] = value; pixels.data[index + 2] = value; pixels.data[index + 3] = 255;
        }
        context.putImageData(pixels, 0, 0);
        stageTexture = new THREE.CanvasTexture(canvas);
        stageTexture.wrapS = stageTexture.wrapT = THREE.RepeatWrapping;
        stageTexture.repeat.set(12, 12);
      }
    }
    const surround = new THREE.Mesh(geometry(new THREE.CylinderGeometry(broadcast ? 2.47 : 2.3, broadcast ? 2.47 : 2.3, 0.12, 96)), material(new THREE.MeshStandardMaterial({ color: broadcast ? 0x9a1522 : 0x111722, roughness: 1, bumpMap: stageTexture, bumpScale: 0.013 })));
    surround.rotation.x = Math.PI / 2;
    surround.position.z = -0.19;
    scene.add(surround);
    if (broadcast) {
      const wall = new THREE.Mesh(geometry(new THREE.PlaneGeometry(30, 20)), material(new THREE.MeshStandardMaterial({ color: 0x10131b, roughness: 1, bumpMap: stageTexture, bumpScale: 0.03 })));
      wall.position.z = -0.32; wall.receiveShadow = true; scene.add(wall);
      const redLight = new THREE.PointLight(0xe52035, 14, 8);
      redLight.position.set(-2.8, 2, 0.4); scene.add(redLight);
      const stageStrip = new THREE.Mesh(geometry(new THREE.BoxGeometry(0.035, 12, 0.03)), material(new THREE.MeshBasicMaterial({ color: 0xa91b2d })));
      stageStrip.position.set(4.6, 0, -0.25); scene.add(stageStrip);
      surround.castShadow = true;
    }
    const body = new THREE.Mesh(geometry(new THREE.CylinderGeometry(BOARD_RADIUS, BOARD_RADIUS, 0.16, 96)), material(new THREE.MeshStandardMaterial({ color: 0x34363b, roughness: 0.8 })));
    body.rotation.x = Math.PI / 2;
    body.position.z = -0.08;
    scene.add(body);
    const faceMaterial = material(new THREE.MeshStandardMaterial({ roughness: 0.95 }));
    const face = new THREE.Mesh(geometry(new THREE.CircleGeometry(BOARD_RADIUS, 96)), faceMaterial);
    face.position.z = 0.012;
    face.receiveShadow = true;
    scene.add(face);
    const rim = new THREE.Mesh(geometry(new THREE.TorusGeometry(BOARD_RADIUS - 0.015, 0.018, 8, 96)), material(new THREE.MeshStandardMaterial({ color: 0x71808e, metalness: 0.75, roughness: 0.4 })));
    rim.position.z = 0.018;
    scene.add(rim);
    if (broadcast) {
      const wireMaterial = material(new THREE.MeshStandardMaterial({ color: 0xc6c4b6, metalness: 0.9, roughness: 0.35 }));
      for (const radiusMm of [6.35, 15.9, 99.4, 107.4, 162, 170]) {
        const wire = new THREE.Mesh(geometry(new THREE.TorusGeometry(radiusMm / 100, 0.004, 5, 160)), wireMaterial);
        wire.position.z = 0.025; scene.add(wire);
      }
      const spokeGeometry = geometry(new THREE.CylinderGeometry(0.004, 0.004, 1.541, 5));
      for (let index = 0; index < 20; index++) {
        const angle = (index * 18 + 9) * Math.PI / 180;
        const wire = new THREE.Mesh(spokeGeometry, wireMaterial);
        wire.rotation.z = -angle;
        wire.position.set(Math.sin(angle) * 0.9295, Math.cos(angle) * 0.9295, 0.025);
        scene.add(wire);
      }
    }

    const steel = material(new THREE.MeshStandardMaterial({ color: 0xcbd3db, metalness: 0.8, roughness: 0.3 }));
    const shaftMaterial = material(new THREE.MeshStandardMaterial({ color: 0x383d48, metalness: 0.35, roughness: 0.4 }));
    const flightMaterial = material(new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.5 }));
    const stripeMaterial = material(new THREE.MeshStandardMaterial({ color: 0xf4f5f7, side: THREE.DoubleSide, roughness: 0.6 }));
    const tipGeometry = geometry(new THREE.ConeGeometry(0.014, 0.16, 8));
    const barrelGeometry = geometry(new THREE.CylinderGeometry(0.032, 0.035, 0.25, 12));
    const shaftGeometry = geometry(new THREE.CylinderGeometry(0.011, 0.012, 0.25, 8));
    const gripGeometry = geometry(new THREE.TorusGeometry(0.035, 0.003, 4, 12));
    const flightShape = new THREE.Shape();
    flightShape.moveTo(0, 0);
    flightShape.lineTo(-0.13, 0.16);
    flightShape.lineTo(-0.11, 0.25);
    flightShape.lineTo(0.11, 0.25);
    flightShape.lineTo(0.13, 0.16);
    flightShape.closePath();
    const flightGeometry = geometry(new THREE.ShapeGeometry(flightShape));
    const stripeGeometry = geometry(new THREE.PlaneGeometry(0.025, 0.14));
    const makeDart = () => {
      const group = new THREE.Group();
      if (broadcast) group.scale.setScalar(1.45);
      const tip = new THREE.Mesh(tipGeometry, steel);
      tip.rotation.x = -Math.PI / 2;
      tip.position.z = 0.08;
      group.add(tip);
      const barrel = new THREE.Mesh(barrelGeometry, steel);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.z = 0.285;
      group.add(barrel);
      for (let index = 0; index < 7; index += 1) {
        const grip = new THREE.Mesh(gripGeometry, shaftMaterial);
        grip.position.z = 0.19 + index * 0.027;
        group.add(grip);
      }
      const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
      shaft.rotation.x = Math.PI / 2;
      shaft.position.z = 0.535;
      group.add(shaft);
      for (const angle of [0, Math.PI / 2]) {
        const wing = new THREE.Group();
        wing.rotation.z = angle;
        const flight = new THREE.Mesh(flightGeometry, flightMaterial);
        flight.rotation.x = Math.PI / 2;
        flight.position.z = 0.64;
        wing.add(flight);
        const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
        stripe.rotation.x = Math.PI / 2;
        stripe.position.set(0.035, -0.001, 0.82);
        wing.add(stripe);
        group.add(wing);
      }
      group.traverse((object) => { if (object instanceof THREE.Mesh) object.castShadow = true; });
      return group;
    };

    const flying: FlyingDart[] = [];
    let frame = 0;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const render = () => renderer.render(scene, camera);
    const animate = (now: number) => {
      frame = 0;
      let moving = false;
      for (const entry of flying) {
        const elapsed = now - entry.startedAt;
        const progress = motion.matches ? 1 : Math.min(1, Math.max(0, elapsed / flightMs));
        // In broadcast mode the dart keeps its speed, following a shallow
        // ballistic arc. Older training views retain their slower demonstration.
        const remaining = broadcast ? 1 - progress : (1 - progress) ** 2;
        entry.mesh.position.copy(entry.target);
        entry.mesh.position.x += 1.8 * remaining;
        // World units are 100 mm: 23.7 is the regulation 2.37 m oche.
        // Gravity gives a shallow parabola over a 260 ms match-speed flight.
        entry.mesh.position.y += broadcast ? -2.3 * remaining + 0.5 * 98.1 * (flightMs / 1000) ** 2 * progress * (1 - progress) : -1.4 * remaining + Math.sin(progress * Math.PI) * 0.25;
        entry.mesh.position.z += (broadcast ? 23.7 : 5) * remaining;
        const restingPitch = broadcast ? -0.07 : 0;
        entry.mesh.rotation.set(restingPitch + 0.12 * remaining, -0.18 * remaining, 0.35);
        if (progress === 1 && entry.dart.score === 0) {
          // A miss bounces/drops away rather than sticking in a safe field.
          const drop = motion.matches ? 1 : Math.min(1, Math.max(0, (elapsed - flightMs) / 420));
          entry.mesh.position.y -= drop * drop * 3;
          entry.mesh.position.z += drop * 0.5;
          entry.mesh.rotation.x += drop * 1.8;
          entry.mesh.visible = drop < 1;
          moving ||= drop < 1;
        } else if (progress === 1) {
          const settle = motion.matches ? 1 : Math.min(1, (elapsed - flightMs) / 180);
          entry.mesh.rotation.x = restingPitch + Math.sin(settle * Math.PI * 4) * 0.045 * (1 - settle);
          moving ||= settle < 1;
        }
        moving ||= progress < 1;
      }
      render();
      if (moving) frame = window.requestAnimationFrame(animate);
    };
    const refreshMotion = () => {
      window.cancelAnimationFrame(frame);
      if (!renderer.getContext().isContextLost()) animate(performance.now());
    };
    motion.addEventListener("change", refreshMotion);
    const addDarts = (next: DartbotThrow[]) => {
      if (next.length < flying.length || flying.some((entry, index) => entry.dart !== next[index])) {
        for (const entry of flying) scene.remove(entry.mesh);
        flying.length = 0;
      }
      for (let index = flying.length; index < next.length; index += 1) {
        const dart = next[index];
        const mesh = makeDart();
        const target = new THREE.Vector3((dart.x - 100) * WORLD_PER_SVG_UNIT, (100 - dart.y) * WORLD_PER_SVG_UNIT, 0.014);
        const startedAt = performance.now() - (index < next.length - 1 ? 1000 : 0);
        flying.push({ mesh, dart, target, startedAt });
        scene.add(mesh);
      }
      refreshMotion();
    };
    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      // Preserve the board's horizontal framing in a tall fullscreen sidebar.
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(36) / 2) * Math.max(1, (4 / 3) / camera.aspect)));
      camera.updateProjectionMatrix();
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    sceneRef.current = { renderer, face, addDarts, render };
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      window.cancelAnimationFrame(frame);
      frame = 0;
      renderer.domElement.style.opacity = "0";
      setReady(false);
    };
    const handleContextRestored = () => {
      if (!faceMaterial.map) return;
      refreshMotion();
      renderer.domElement.style.opacity = "1";
      setReady(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", handleContextLost);
    renderer.domElement.addEventListener("webglcontextrestored", handleContextRestored);

    return () => {
      sceneRef.current = null;
      observer.disconnect();
      motion.removeEventListener("change", refreshMotion);
      renderer.domElement.removeEventListener("webglcontextlost", handleContextLost);
      renderer.domElement.removeEventListener("webglcontextrestored", handleContextRestored);
      window.cancelAnimationFrame(frame);
      faceMaterial.map?.dispose();
      environmentTarget?.dispose();
      stageTexture?.dispose();
      geometries.forEach((value) => value.dispose());
      materials.forEach((value) => value.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [broadcast, color, flightMs]);

  useEffect(() => { sceneRef.current?.addDarts(darts); }, [broadcast, color, darts, flightMs]);

  useEffect(() => {
    const state = sceneRef.current;
    const svg = textureRef.current?.querySelector("svg");
    if (!state || !svg) return;
    // The live Red Zone SVG is the texture, including its current danger fields.
    // Everything is generated locally; no image service or upload is involved.
    const copy = svg.cloneNode(true) as SVGSVGElement;
    copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    copy.setAttribute("width", "1024");
    copy.setAttribute("height", "1024");
    const image = new Image();
    let cancelled = false;
    image.onload = () => {
      if (cancelled || sceneRef.current !== state) return;
      let textureImage: HTMLImageElement | HTMLCanvasElement = image;
      if (broadcast) {
        // Bake fine sisal fibres into the existing face, preserving every
        // segment boundary. Seeded noise avoids flickering across texture loads.
        const canvas = document.createElement("canvas"); canvas.width = 1024; canvas.height = 1024;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(image, 0, 0, 1024, 1024);
          let seed = 501;
          const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
          for (let index = 0; index < 90000; index++) {
            const x = random() * 1024; const y = random() * 1024;
            if (Math.hypot(x - 512, y - 512) > 423) continue;
            ctx.fillStyle = random() > 0.5 ? "rgba(0,0,0,0.07)" : "rgba(255,255,235,0.05)";
            ctx.fillRect(x, y, 0.5 + random(), 1 + random() * 3);
          }
          textureImage = canvas;
        }
      }
      const texture = new THREE.Texture(textureImage);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(4, state.renderer.capabilities.getMaxAnisotropy());
      texture.needsUpdate = true;
      state.face.material.map?.dispose();
      state.face.material.map = texture;
      state.face.material.needsUpdate = true;
      if (state.renderer.getContext().isContextLost()) return;
      state.render();
      state.renderer.domElement.style.opacity = "1";
      setReady(true);
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(copy))}`;
    return () => { cancelled = true; image.onload = null; };
  }, [broadcast, color, dangerNumbers, flightMs]);

  return (
    <div ref={hostRef} className="absolute inset-0" data-renderer={ready ? "3d" : "fallback"}>
      <div ref={textureRef} aria-hidden="true" className="hidden">
        <DartboardSvg dangerNumbers={dangerNumbers} />
      </div>
      {!ready && <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center p-6"><DartboardSvg dangerNumbers={dangerNumbers} markers={darts.map((dart, index) => ({ x: dart.x, y: dart.y, color, label: String(index + 1) }))} /></div>}
    </div>
  );
}
