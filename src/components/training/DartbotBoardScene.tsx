import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { DartboardSvg } from "@/components/training/DartboardSvg";
import type { DartbotThrow } from "@/lib/trainingDartbot";
import { DARTBOT_FLIGHT_MS } from "@/lib/dartbotTiming";

interface DartbotBoardSceneProps {
  darts: DartbotThrow[];
  dangerNumbers: Set<number>;
  color: string;
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

export default function DartbotBoardScene({ darts, dangerNumbers, color }: DartbotBoardSceneProps) {
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
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 4 / 3, 0.1, 30);
    camera.position.set(2.7, 0.85, 7.4);
    camera.lookAt(0, 0, 0.25);
    scene.add(new THREE.HemisphereLight(0xdbeaff, 0x343045, 2));
    const light = new THREE.SpotLight(0xffffff, 90, 20, 0.65, 0.8);
    light.position.set(2, 5, 6);
    light.castShadow = true;
    light.shadow.mapSize.set(512, 512);
    light.shadow.normalBias = 0.025;
    scene.add(light);
    const fill = new THREE.PointLight(0x94bfff, 18, 15);
    fill.position.set(-4, 0, 3);
    scene.add(fill);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const geometry = <T extends THREE.BufferGeometry>(value: T): T => { geometries.push(value); return value; };
    const material = <T extends THREE.Material>(value: T): T => { materials.push(value); return value; };
    const surround = new THREE.Mesh(geometry(new THREE.CylinderGeometry(2.3, 2.3, 0.12, 96)), material(new THREE.MeshStandardMaterial({ color: 0x111722, roughness: 1 })));
    surround.rotation.x = Math.PI / 2;
    surround.position.z = -0.19;
    scene.add(surround);
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
        const progress = motion.matches ? 1 : Math.min(1, Math.max(0, elapsed / DARTBOT_FLIGHT_MS));
        const remaining = (1 - progress) ** 2;
        entry.mesh.position.copy(entry.target);
        entry.mesh.position.x += 1.8 * remaining;
        entry.mesh.position.y += -1.4 * remaining + Math.sin(progress * Math.PI) * 0.25;
        entry.mesh.position.z += 5 * remaining;
        entry.mesh.rotation.set(0.12 * remaining, -0.18 * remaining, 0.35);
        if (progress === 1 && entry.dart.score === 0) {
          // A miss bounces/drops away rather than sticking in a safe field.
          const drop = motion.matches ? 1 : Math.min(1, Math.max(0, (elapsed - DARTBOT_FLIGHT_MS) / 420));
          entry.mesh.position.y -= drop * drop * 3;
          entry.mesh.position.z += drop * 0.5;
          entry.mesh.rotation.x += drop * 1.8;
          entry.mesh.visible = drop < 1;
          moving ||= drop < 1;
        } else if (progress === 1) {
          const settle = motion.matches ? 1 : Math.min(1, (elapsed - DARTBOT_FLIGHT_MS) / 180);
          entry.mesh.rotation.x = Math.sin(settle * Math.PI * 4) * 0.045 * (1 - settle);
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
      geometries.forEach((value) => value.dispose());
      materials.forEach((value) => value.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [color]);

  useEffect(() => { sceneRef.current?.addDarts(darts); }, [color, darts]);

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
      const texture = new THREE.Texture(image);
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
  }, [color, dangerNumbers]);

  return (
    <div ref={hostRef} className="absolute inset-0" data-renderer={ready ? "3d" : "fallback"}>
      <div ref={textureRef} aria-hidden="true" className="hidden">
        <DartboardSvg dangerNumbers={dangerNumbers} />
      </div>
      {!ready && <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center p-6"><DartboardSvg dangerNumbers={dangerNumbers} markers={darts.map((dart, index) => ({ x: dart.x, y: dart.y, color, label: String(index + 1) }))} /></div>}
    </div>
  );
}
