import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ClipAxis } from '../data/syntheticCases';
import { GeneratedSurgicalKit, MeshData } from '../engine/meshBuilder';

export type CameraPreset = 'default' | 'front' | 'side' | 'top' | 'back';

interface ThreeViewportProps {
  kit: GeneratedSurgicalKit;
  pipelineStage: 1 | 2 | 3 | 4;
  explodePct: number;
  animating: boolean;
  onAnimationExplodeChange: (pct: number) => void;
  titaniumFailureMode: boolean;
  wireframe: boolean;
  clipAxis: ClipAxis;
  clipOffsetMm: number;
  cameraPresetReq: { preset: CameraPreset; seq: number };
  importedMesh: MeshData | null;
  mirrorImported: boolean;
}

function toThreeGeometry(mesh: MeshData): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(mesh.positions.slice(), 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(mesh.normals.slice(), 3));
  return geo;
}

function disposeObject3D(obj: THREE.Object3D): void {
  if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments || obj instanceof THREE.Line) {
    obj.geometry.dispose();
    if (Array.isArray(obj.material)) {
      obj.material.forEach((m) => m.dispose());
    } else {
      obj.material.dispose();
    }
  }
  for (const child of obj.children) disposeObject3D(child);
}

export function ThreeViewport({
  kit,
  pipelineStage,
  explodePct,
  animating,
  onAnimationExplodeChange,
  titaniumFailureMode,
  wireframe,
  clipAxis,
  clipOffsetMm,
  cameraPresetReq,
  importedMesh,
  mirrorImported,
}: ThreeViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const rootGroupRef = useRef<THREE.Group | null>(null);
  const clipPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, -1, 0), 0));
  const clipHelperRef = useRef<THREE.PlaneHelper | null>(null);

  // Referências para atualização 60 FPS sem recriar geometria!
  const implantMeshRef = useRef<THREE.Mesh | null>(null);
  const lowerMoldMeshRef = useRef<THREE.Mesh | null>(null);
  const upperMoldMeshRef = useRef<THREE.Mesh | null>(null);
  const defectDirRef = useRef<THREE.Vector3>(new THREE.Vector3(1, 0, 0));
  const pipelineStageRef = useRef<number>(pipelineStage);
  const explodePctRef = useRef<number>(explodePct);
  const animatingRef = useRef<boolean>(animating);
  const titaniumFailureModeRef = useRef<boolean>(titaniumFailureMode);
  const hasImportedMeshRef = useRef<boolean>(Boolean(importedMesh));
  const animPhaseRef = useRef<number>(0);
  const onAnimCbRef = useRef(onAnimationExplodeChange);

  useEffect(() => {
    pipelineStageRef.current = pipelineStage;
  }, [pipelineStage]);

  useEffect(() => {
    explodePctRef.current = explodePct;
  }, [explodePct]);

  useEffect(() => {
    animatingRef.current = animating;
  }, [animating]);

  useEffect(() => {
    titaniumFailureModeRef.current = titaniumFailureMode;
  }, [titaniumFailureMode]);

  useEffect(() => {
    hasImportedMeshRef.current = Boolean(importedMesh);
  }, [importedMesh]);

  useEffect(() => {
    onAnimCbRef.current = onAnimationExplodeChange;
  }, [onAnimationExplodeChange]);

  const applyExplodeTransform = (pct: number) => {
    const dir = defectDirRef.current;
    const amt = pct / 100.0;
    const st = pipelineStageRef.current;
    if (implantMeshRef.current) {
      if (st >= 3) {
        implantMeshRef.current.position.copy(dir).multiplyScalar(42.0 * amt);
      } else {
        implantMeshRef.current.position.set(0, 0, 0);
      }
    }
    if (lowerMoldMeshRef.current) {
      lowerMoldMeshRef.current.position.copy(dir).multiplyScalar(14.0 * amt);
    }
    if (upperMoldMeshRef.current) {
      upperMoldMeshRef.current.position.copy(dir).multiplyScalar(72.0 * amt);
    }
  };

  // Inicializa cena Three.js uma única vez
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch {
      setWebglError('WebGL indisponível neste navegador. Os arquivos STL/ZIP continuam exportáveis.');
      return;
    }

    const w = container.clientWidth || 760;
    const h = container.clientHeight || 520;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    renderer.localClippingEnabled = true;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1220);

    const camera = new THREE.PerspectiveCamera(40, w / h, 1, 1600);
    camera.position.set(170, 95, 195);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 120;
    controls.maxDistance = 480;
    controls.target.set(0, 6, 0);
    controls.update();

    // Iluminação cirúrgica de estúdio
    scene.add(new THREE.AmbientLight(0xffffff, 0.62));
    const keyLight = new THREE.DirectionalLight(0xf8fafc, 0.95);
    keyLight.position.set(180, 220, 190);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.48);
    rimLight.position.set(-190, 90, -150);
    scene.add(rimLight);

    const bottomFill = new THREE.DirectionalLight(0x94a3b8, 0.3);
    bottomFill.position.set(0, -190, 100);
    scene.add(bottomFill);

    const grid = new THREE.GridHelper(340, 17, 0x1e293b, 0x131c2e);
    grid.position.y = -98;
    scene.add(grid);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    const helper = new THREE.PlaneHelper(clipPlaneRef.current, 230, 0x38bdf8);
    helper.visible = false;
    scene.add(helper);

    sceneRef.current = scene;
    cameraRef.current = camera;
    controlsRef.current = controls;
    rendererRef.current = renderer;
    rootGroupRef.current = rootGroup;
    clipHelperRef.current = helper;

    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const nw = containerRef.current.clientWidth || 720;
      const nh = containerRef.current.clientHeight || 500;
      cameraRef.current.aspect = nw / nh;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(nw, nh);
    });
    resizeObserver.observe(container);

    let rafId = 0;
    let lastUiSync = 0;
    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      if (
        animatingRef.current &&
        pipelineStageRef.current >= 3 &&
        !titaniumFailureModeRef.current &&
        !hasImportedMeshRef.current
      ) {
        animPhaseRef.current += 0.025;
        const osc = Math.round((Math.sin(animPhaseRef.current) * 0.5 + 0.5) * 100);
        explodePctRef.current = osc;
        applyExplodeTransform(osc);
        if (now - lastUiSync > 50) {
          lastUiSync = now;
          onAnimCbRef.current(osc);
        }
      }
      controls.update();
      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      disposeObject3D(rootGroup);
      disposeObject3D(grid);
      disposeObject3D(helper);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
      rendererRef.current = null;
      rootGroupRef.current = null;
      clipHelperRef.current = null;
    };
  }, []);

  // Reconstrói geometrias apenas quando kit, etapa, modo ou clipping mudam (NÃO no explode!)
  useEffect(() => {
    const root = rootGroupRef.current;
    if (!root) return;

    // Limpeza estrita de geometrias e materiais anteriores (zero memory leak WebGL)
    while (root.children.length > 0) {
      const child = root.children[0];
      root.remove(child);
      disposeObject3D(child);
    }
    implantMeshRef.current = null;
    lowerMoldMeshRef.current = null;
    upperMoldMeshRef.current = null;

    const activeClipPlanes = clipAxis !== 'none' ? [clipPlaneRef.current] : [];

    // Caso 1: Malha .STL sintética importada pelo usuário
    if (importedMesh) {
      const geo = toThreeGeometry(importedMesh);
      geo.computeBoundingSphere();
      geo.center();
      const radius = geo.boundingSphere?.radius || 80;
      const scale = 88.0 / Math.max(1, radius);

      const mat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.32,
        metalness: 0.08,
        wireframe,
        side: THREE.DoubleSide,
        clippingPlanes: activeClipPlanes,
      });
      const mainMesh = new THREE.Mesh(geo, mat);
      mainMesh.scale.setScalar(scale);
      root.add(mainMesh);

      if (mirrorImported) {
        const mGeo = geo.clone();
        const mMat = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          transparent: true,
          opacity: 0.55,
          roughness: 0.35,
          side: THREE.DoubleSide,
          wireframe,
          clippingPlanes: activeClipPlanes,
        });
        const mirrored = new THREE.Mesh(mGeo, mMat);
        mirrored.scale.set(-scale, scale, scale);
        root.add(mirrored);

        const planeGeo = new THREE.PlaneGeometry(210, 195);
        const symPlane = new THREE.Mesh(
          planeGeo,
          new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.14,
            side: THREE.DoubleSide,
          }),
        );
        symPlane.rotation.y = Math.PI / 2;
        root.add(symPlane);
      }
      return;
    }

    // Caso 2: Phantom paramétrico CranioMold 3D
    defectDirRef.current.set(
      kit.frame.defectDir[0],
      kit.frame.defectDir[1],
      kit.frame.defectDir[2],
    );

    const skullMat = new THREE.MeshStandardMaterial({
      color: 0xe6dfd1,
      roughness: 0.6,
      metalness: 0.04,
      wireframe,
      side: clipAxis !== 'none' ? THREE.DoubleSide : THREE.FrontSide,
      clippingPlanes: activeClipPlanes,
    });
    root.add(new THREE.Mesh(toThreeGeometry(kit.skull), skullMat));

    // Modo Comparativo: Placa de Titânio Não Prototipada (Ato 2)
    if (titaniumFailureMode) {
      const tiMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.85,
        roughness: 0.25,
        wireframe: true,
      });
      root.add(new THREE.Mesh(toThreeGeometry(kit.titaniumPlate), tiMat));

      const hotMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
      for (const hp of kit.titaniumHotspots) {
        const sp = new THREE.Mesh(new THREE.SphereGeometry(2.9, 14, 14), hotMat.clone());
        sp.position.set(hp[0], hp[1], hp[2]);
        root.add(sp);
      }
      hotMat.dispose();
      return;
    }

    // Plano Sagital Mediano (Etapas 2, 3, 4)
    if (pipelineStage >= 2) {
      const planeGeo = new THREE.PlaneGeometry(220, 200);
      const symPlane = new THREE.Mesh(
        planeGeo,
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.12,
          side: THREE.DoubleSide,
        }),
      );
      symPlane.rotation.y = Math.PI / 2;
      root.add(symPlane);

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(planeGeo),
        new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.5 }),
      );
      edges.rotation.y = Math.PI / 2;
      root.add(edges);
    }

    // Implante PMMA (Etapas 2, 3, 4)
    if (pipelineStage >= 2) {
      const impMat = new THREE.MeshStandardMaterial({
        color: pipelineStage === 2 ? 0x7dd3fc : 0xfefce8,
        roughness: 0.28,
        metalness: 0.04,
        wireframe: pipelineStage === 2 ? true : wireframe,
        side: clipAxis !== 'none' ? THREE.DoubleSide : THREE.FrontSide,
        clippingPlanes: activeClipPlanes,
      });
      const impMesh = new THREE.Mesh(toThreeGeometry(kit.implant), impMat);
      implantMeshRef.current = impMesh;
      root.add(impMesh);
    }

    // Molde Negativo Bipartido PETG (Etapas 3 e 4)
    if (pipelineStage >= 3) {
      const lowMat = new THREE.MeshPhysicalMaterial({
        color: 0x0284c7,
        transparent: !wireframe && clipAxis === 'none',
        opacity: wireframe || clipAxis !== 'none' ? 1.0 : 0.84,
        roughness: 0.24,
        metalness: 0.06,
        wireframe,
        side: clipAxis !== 'none' ? THREE.DoubleSide : THREE.FrontSide,
        clippingPlanes: activeClipPlanes,
      });
      const upMat = new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        transparent: !wireframe && clipAxis === 'none',
        opacity: wireframe || clipAxis !== 'none' ? 1.0 : 0.72,
        roughness: 0.22,
        metalness: 0.06,
        wireframe,
        side: clipAxis !== 'none' ? THREE.DoubleSide : THREE.FrontSide,
        clippingPlanes: activeClipPlanes,
      });
      const lowMesh = new THREE.Mesh(toThreeGeometry(kit.lowerMold), lowMat);
      const upMesh = new THREE.Mesh(toThreeGeometry(kit.upperMold), upMat);
      lowerMoldMeshRef.current = lowMesh;
      upperMoldMeshRef.current = upMesh;
      root.add(lowMesh);
      root.add(upMesh);
    }

    applyExplodeTransform(explodePctRef.current);
  }, [kit, pipelineStage, titaniumFailureMode, wireframe, clipAxis, importedMesh, mirrorImported]);

  // Atualiza apenas posições no explode (zero alocação!)
  useEffect(() => {
    applyExplodeTransform(explodePct);
  }, [explodePct]);

  // Atualiza plano de corte transversal em tempo real
  useEffect(() => {
    const plane = clipPlaneRef.current;
    const helper = clipHelperRef.current;
    if (clipAxis === 'none') {
      if (helper) helper.visible = false;
      return;
    }
    if (clipAxis === 'axial') {
      plane.normal.set(0, -1, 0);
    } else if (clipAxis === 'coronal') {
      plane.normal.set(0, 0, -1);
    } else {
      plane.normal.set(-1, 0, 0);
    }
    plane.constant = clipOffsetMm;
    if (helper) helper.visible = true;
  }, [clipAxis, clipOffsetMm]);

  // Presets de câmera sob demanda
  useEffect(() => {
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    if (!cam || !ctrl) return;
    const p = cameraPresetReq.preset;
    if (p === 'front') cam.position.set(0, 22, 275);
    else if (p === 'side') cam.position.set(270, 28, 30);
    else if (p === 'top') cam.position.set(18, 275, 45);
    else if (p === 'back') cam.position.set(0, 25, -275);
    else cam.position.set(170, 95, 195);
    ctrl.target.set(0, 6, 0);
    ctrl.update();
  }, [cameraPresetReq]);

  if (webglError) {
    return (
      <div className="flex-1 min-h-[460px] flex items-center justify-center p-6 text-center bg-slate-950 text-slate-300 text-sm">
        <div className="max-w-md space-y-2">
          <p className="font-bold text-amber-300">Visualizador 3D indisponível</p>
          <p>{webglError}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      id="three-canvas-container"
      className="flex-1 w-full h-[460px] sm:h-[560px] cursor-grab active:cursor-grabbing"
    />
  );
}
