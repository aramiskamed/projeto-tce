import { MeshData } from './meshBuilder';

export interface MeshTopologyAudit {
  triangleCount: number;
  signedVolumeCm3: number;
  surfaceAreaCm2: number;
  bboxMm: { x: number; y: number; z: number };
  minWallThicknessMm: number;
  boundaryEdges: number;
  nonManifoldEdges: number;
  degenerateTriangles: number;
  isWatertight: boolean;
  hasOutwardNormals: boolean;
  fitsStandardFdmBed: boolean;
}

const QUANT_SCALE = 10000; // 1e-4 mm de precisão canônica

function quantKey(x: number, y: number, z: number): string {
  const nx = Math.round((x === 0 ? 0 : x) * QUANT_SCALE);
  const ny = Math.round((y === 0 ? 0 : y) * QUANT_SCALE);
  const nz = Math.round((z === 0 ? 0 : z) * QUANT_SCALE);
  return `${nx},${ny},${nz}`;
}

/**
 * Auditoria topológica e geométrica real de uma malha triangular:
 * - Normalização -0.0 -> +0.0 e deduplicação canônica em 1e-4 mm
 * - Volume assinalado exato (cm³) via teorema da divergência
 * - Área superficial exata (cm²)
 * - Bounding box (mm) e verificação de mesa FDM padrão (220 × 220 × 250 mm)
 * - Verificação exata de arestas direcionadas (boundaryEdges === 0 && nonManifoldEdges === 0)
 */
export function auditMeshTopology(
  mesh: MeshData,
  minWallThicknessMm = 0,
): MeshTopologyAudit {
  const pos = mesh.positions;
  const triCount = Math.floor(pos.length / 9);

  if (triCount === 0) {
    return {
      triangleCount: 0,
      signedVolumeCm3: 0,
      surfaceAreaCm2: 0,
      bboxMm: { x: 0, y: 0, z: 0 },
      minWallThicknessMm,
      boundaryEdges: 0,
      nonManifoldEdges: 0,
      degenerateTriangles: 0,
      isWatertight: false,
      hasOutwardNormals: false,
      fitsStandardFdmBed: false,
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  let signedVol6 = 0;
  let area2 = 0;
  let degenerateTriangles = 0;

  const vertIdMap = new Map<string, number>();
  let nextVertId = 0;
  const getVid = (x: number, y: number, z: number): number => {
    const k = quantKey(x, y, z);
    const existing = vertIdMap.get(k);
    if (existing !== undefined) return existing;
    const id = nextVertId++;
    vertIdMap.set(k, id);
    return id;
  };

  // Mapeia aresta direcionada "a->b" -> contagem
  const directedEdges = new Map<string, number>();
  const addEdge = (a: number, b: number): void => {
    const k = `${a}:${b}`;
    directedEdges.set(k, (directedEdges.get(k) ?? 0) + 1);
  };

  for (let i = 0; i < triCount; i++) {
    const base = i * 9;
    const ax = pos[base];
    const ay = pos[base + 1];
    const az = pos[base + 2];
    const bx = pos[base + 3];
    const by = pos[base + 4];
    const bz = pos[base + 5];
    const cx = pos[base + 6];
    const cy = pos[base + 7];
    const cz = pos[base + 8];

    minX = Math.min(minX, ax, bx, cx);
    minY = Math.min(minY, ay, by, cy);
    minZ = Math.min(minZ, az, bz, cz);
    maxX = Math.max(maxX, ax, bx, cx);
    maxY = Math.max(maxY, ay, by, cy);
    maxZ = Math.max(maxZ, az, bz, cz);

    // Produto misto a · (b × c)
    const bcx = by * cz - bz * cy;
    const bcy = bz * cx - bx * cz;
    const bcz = bx * cy - by * cx;
    signedVol6 += ax * bcx + ay * bcy + az * bcz;

    // Área |(b - a) × (c - a)|
    const abx = bx - ax;
    const aby = by - ay;
    const abz = bz - az;
    const acx = cx - ax;
    const acy = cy - ay;
    const acz = cz - az;
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    const triArea2 = Math.sqrt(nx * nx + ny * ny + nz * nz);
    area2 += triArea2;

    const va = getVid(ax, ay, az);
    const vb = getVid(bx, by, bz);
    const vc = getVid(cx, cy, cz);

    if (va === vb || vb === vc || vc === va || triArea2 < 1e-8) {
      degenerateTriangles++;
      continue;
    }

    addEdge(va, vb);
    addEdge(vb, vc);
    addEdge(vc, va);
  }

  let boundaryEdges = 0;
  let nonManifoldEdges = 0;
  for (const [key, count] of directedEdges.entries()) {
    if (count > 1) {
      nonManifoldEdges += count - 1;
    }
    const sep = key.indexOf(':');
    const a = key.slice(0, sep);
    const b = key.slice(sep + 1);
    const twinCount = directedEdges.get(`${b}:${a}`) ?? 0;
    if (twinCount === 0) {
      boundaryEdges++;
    } else if (twinCount > 1) {
      // já contabilizado quando a aresta gêmea for visitada
    }
  }

  const signedVolumeCm3 = Number((signedVol6 / 6000.0).toFixed(2));
  const surfaceAreaCm2 = Number((area2 / 200.0).toFixed(2));
  const bboxMm = {
    x: Number((maxX - minX).toFixed(2)),
    y: Number((maxY - minY).toFixed(2)),
    z: Number((maxZ - minZ).toFixed(2)),
  };

  const hasOutwardNormals = signedVolumeCm3 > 0;
  const isWatertight =
    triCount >= 4 &&
    degenerateTriangles === 0 &&
    boundaryEdges === 0 &&
    nonManifoldEdges === 0 &&
    hasOutwardNormals;

  const fitsStandardFdmBed = bboxMm.x <= 220.0 && bboxMm.y <= 220.0 && bboxMm.z <= 250.0;

  return {
    triangleCount: triCount,
    signedVolumeCm3,
    surfaceAreaCm2,
    bboxMm,
    minWallThicknessMm: Number(minWallThicknessMm.toFixed(2)),
    boundaryEdges,
    nonManifoldEdges,
    degenerateTriangles,
    isWatertight,
    hasOutwardNormals,
    fitsStandardFdmBed,
  };
}
