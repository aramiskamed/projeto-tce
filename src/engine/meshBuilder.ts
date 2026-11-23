import { DefectCaseConfig, MoldParameters } from '../data/syntheticCases';
import {
  LocalFrame,
  MOLD_CONSTANTS,
  Vec3,
  buildDefectFrame,
  cross3,
  defectOrganicDist,
  dot3,
  evalCranialPoint,
  evalMoldContactHeights,
  getPokaYokePins,
  normalize3,
  sub3,
} from './cranialMath';

export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  triangleCount: number;
}

export interface GeneratedSurgicalKit {
  cfg: DefectCaseConfig;
  params: MoldParameters;
  frame: LocalFrame;
  skull: MeshData;
  implant: MeshData;
  lowerMold: MeshData;
  upperMold: MeshData;
  implantBedFlat: MeshData;
  lowerMoldBedFlat: MeshData;
  upperMoldBedFlat: MeshData;
  lowerMinWallMm: number;
  upperMinWallMm: number;
  titaniumPlate: MeshData;
  titaniumHotspots: Vec3[];
}

function createMeshFromTriangles(tris: [Vec3, Vec3, Vec3][]): MeshData {
  const triangleCount = tris.length;
  const positions = new Float32Array(triangleCount * 9);
  const normals = new Float32Array(triangleCount * 9);

  for (let i = 0; i < triangleCount; i++) {
    const [a, b, c] = tris[i];
    const n = normalize3(cross3(sub3(b, a), sub3(c, a)));
    const base = i * 9;
    positions[base] = a[0];
    positions[base + 1] = a[1];
    positions[base + 2] = a[2];
    positions[base + 3] = b[0];
    positions[base + 4] = b[1];
    positions[base + 5] = b[2];
    positions[base + 6] = c[0];
    positions[base + 7] = c[1];
    positions[base + 8] = c[2];

    normals[base] = n[0];
    normals[base + 1] = n[1];
    normals[base + 2] = n[2];
    normals[base + 3] = n[0];
    normals[base + 4] = n[1];
    normals[base + 5] = n[2];
    normals[base + 6] = n[0];
    normals[base + 7] = n[1];
    normals[base + 8] = n[2];
  }
  return { positions, normals, triangleCount };
}

function pushQuad(tris: [Vec3, Vec3, Vec3][], p00: Vec3, p10: Vec3, p11: Vec3, p01: Vec3): void {
  tris.push([p00, p10, p11]);
  tris.push([p00, p11, p01]);
}

function localToWorld(u: number, v: number, w: number, frame: LocalFrame): Vec3 {
  return [
    frame.tx[0] * u + frame.ty[0] * v + frame.defectDir[0] * w,
    frame.tx[1] * u + frame.ty[1] * v + frame.defectDir[1] * w,
    frame.tx[2] * u + frame.ty[2] * v + frame.defectDir[2] * w,
  ];
}

/**
 * Rotação rígida própria (det = +1) em float64 levando uma malha ao plano da mesa FDM (Z = 0).
 * - flipUpper = false (Molde Inferior & Implante): R_inf = [tx; ty; +defectDir] (+defectDir -> +Z)
 * - flipUpper = true  (Molde Superior):            R_sup = [tx; -ty; -defectDir] (-defectDir -> +Z, backplane em Z=0)
 */
function transformTrianglesToBedFlat(
  tris: [Vec3, Vec3, Vec3][],
  frame: LocalFrame,
  flipUpper: boolean,
): [Vec3, Vec3, Vec3][] {
  const rx = frame.tx;
  const ry: Vec3 = flipUpper ? [-frame.ty[0], -frame.ty[1], -frame.ty[2]] : frame.ty;
  const rz: Vec3 = flipUpper
    ? [-frame.defectDir[0], -frame.defectDir[1], -frame.defectDir[2]]
    : frame.defectDir;

  let minZ = Infinity;
  const rotPoint = (p: Vec3): Vec3 => {
    const x = dot3(p, rx);
    const y = dot3(p, ry);
    const z = dot3(p, rz);
    if (z < minZ) minZ = z;
    return [x, y, z];
  };

  const rotated: [Vec3, Vec3, Vec3][] = new Array(tris.length);
  for (let i = 0; i < tris.length; i++) {
    rotated[i] = [rotPoint(tris[i][0]), rotPoint(tris[i][1]), rotPoint(tris[i][2])];
  }

  // Translada Z para apoiar exatamente em Z = 0
  const shiftZ = Number.isFinite(minZ) ? -minZ : 0;
  for (let i = 0; i < rotated.length; i++) {
    for (let k = 0; k < 3; k++) {
      const v = rotated[i][k];
      rotated[i][k] = [v[0], v[1], v[2] + shiftZ];
    }
  }
  return rotated;
}

/**
 * Constrói o crânio sintético como casca espessa fechada (tábua externa + tábua interna
 * ligadas pela borda da craniectomia e pela base craniana fechada, garantindo boundaryEdges === 0).
 */
function buildSyntheticSkullTriangles(
  cfg: DefectCaseConfig,
  frame: LocalFrame,
  segT = 72,
  segP = 42,
): [Vec3, Vec3, Vec3][] {
  const pMin = 0.08;
  const pMax = 2.08;
  const dt = (2 * Math.PI) / segT;
  const dp = (pMax - pMin) / segP;
  const skullThickness = 5.0;

  // Pré-calcula grade periódica em theta (índice segT === índice 0!)
  const outer: Vec3[][] = [];
  const inner: Vec3[][] = [];
  for (let i = 0; i < segT; i++) {
    const t = -Math.PI + i * dt;
    outer[i] = [];
    inner[i] = [];
    for (let j = 0; j <= segP; j++) {
      const p = pMin + j * dp;
      const sinP = Math.sin(p);
      const dir: Vec3 = [sinP * Math.sin(t), Math.cos(p), sinP * Math.cos(t)];
      outer[i][j] = evalCranialPoint(dir, cfg, 0);
      inner[i][j] = evalCranialPoint(dir, cfg, -skullThickness);
    }
  }

  // Máscara de células ativas (fora da falha cortical)
  const active: boolean[][] = [];
  for (let i = 0; i < segT; i++) {
    active[i] = [];
    const tc = -Math.PI + (i + 0.5) * dt;
    for (let j = 0; j < segP; j++) {
      const pc = pMin + (j + 0.5) * dp;
      const sinP = Math.sin(pc);
      const dir: Vec3 = [sinP * Math.sin(tc), Math.cos(pc), sinP * Math.cos(tc)];
      const pt = evalCranialPoint(dir, cfg, 0);
      const w = dot3(pt, frame.defectDir);
      if (w > 0) {
        const u = dot3(pt, frame.tx);
        const v = dot3(pt, frame.ty);
        active[i][j] = defectOrganicDist(u, v, frame.ru, frame.rv) > 1.0;
      } else {
        active[i][j] = true;
      }
    }
  }

  const tris: [Vec3, Vec3, Vec3][] = [];
  for (let i = 0; i < segT; i++) {
    const iNext = (i + 1) % segT;
    const iPrev = (i - 1 + segT) % segT;
    for (let j = 0; j < segP; j++) {
      if (!active[i][j]) continue;

      const o00 = outer[i][j];
      const o10 = outer[iNext][j];
      const o11 = outer[iNext][j + 1];
      const o01 = outer[i][j + 1];

      const i00 = inner[i][j];
      const i10 = inner[iNext][j];
      const i11 = inner[iNext][j + 1];
      const i01 = inner[i][j + 1];

      // Em coordenadas (theta crescente, phi crescente), dP/dtheta x dP/dphi aponta para DENTRO;
      // portanto (o00, o01, o11, o10) tem normal EXTERNA (+radial)!
      pushQuad(tris, o00, o01, o11, o10);
      pushQuad(tris, i00, i10, i11, i01);

      // Paredes de fechamento nas fronteiras da craniectomia e nas bordas polares (sem costura em ±PI!)
      if (!active[iPrev][j]) {
        pushQuad(tris, o00, i00, i01, o01);
      }
      if (!active[iNext][j]) {
        pushQuad(tris, o10, o11, i11, i10);
      }
      if (j === 0 || !active[i][j - 1]) {
        pushQuad(tris, o00, o10, i10, i00);
      }
      if (j === segP - 1 || !active[i][j + 1]) {
        pushQuad(tris, o01, i01, i11, o11);
      }
    }
  }

  return tris;
}

/**
 * Gera todo o kit cirúrgico paramétrico em precisão float64 antes da quantização Float32:
 * - Crânio sintético fechado
 * - Implante PMMA chanfrado (espessura exata thicknessMm)
 * - Molde Negativo Inferior (com 4 pinos Poka-Yoke + canaleta + 4 canais de escape + backplane plano)
 * - Molde Negativo Superior (com 4 cavidades fêmeas Poka-Yoke + canaleta + 4 canais + backplane plano)
 * - Versões rotacionadas (det = +1) prontas para mesa FDM (Z = 0)
 * - Placa comparativa de titânio não prototipada + hotspots de ulceração
 */
export function generateSurgicalKit(rawParams: MoldParameters): GeneratedSurgicalKit {
  const { cfg, params, frame } = buildDefectFrame(rawParams);
  const pins = getPokaYokePins(frame);

  const segU = MOLD_CONSTANTS.SEG_U;
  const segV = MOLD_CONSTANTS.SEG_V;
  const du = (2 * frame.halfU) / segU;
  const dv = (2 * frame.halfV) / segV;

  // 1. Avalia malha de alturas compartilhadas (segU+1) x (segV+1)
  const uGrid: number[] = new Array(segU + 1);
  const vGrid: number[] = new Array(segV + 1);
  for (let i = 0; i <= segU; i++) uGrid[i] = -frame.halfU + i * du;
  for (let j = 0; j <= segV; j++) vGrid[j] = -frame.halfV + j * dv;

  const zInfGrid: number[][] = [];
  const zSupGrid: number[][] = [];
  let minZInf = Infinity;
  let maxZSup = -Infinity;

  for (let i = 0; i <= segU; i++) {
    zInfGrid[i] = new Array(segV + 1);
    zSupGrid[i] = new Array(segV + 1);
    const u = uGrid[i];
    for (let j = 0; j <= segV; j++) {
      const v = vGrid[j];
      const { zInf, zSup } = evalMoldContactHeights(u, v, cfg, frame, params, pins);
      zInfGrid[i][j] = zInf;
      zSupGrid[i][j] = zSup;
      if (zInf < minZInf) minZInf = zInf;
      if (zSup > maxZSup) maxZSup = zSup;
    }
  }

  const zBackInf = minZInf - MOLD_CONSTANTS.MIN_BACKPLANE_WALL_MM;
  const zBackSup = maxZSup + MOLD_CONSTANTS.MIN_BACKPLANE_WALL_MM;

  // Pré-calcula pontos mundiais em float64 (compartilhados por índice exato!)
  const infContact: Vec3[][] = [];
  const infBack: Vec3[][] = [];
  const supContact: Vec3[][] = [];
  const supBack: Vec3[][] = [];
  let lowerMinWallMm = Infinity;
  let upperMinWallMm = Infinity;

  for (let i = 0; i <= segU; i++) {
    infContact[i] = new Array(segV + 1);
    infBack[i] = new Array(segV + 1);
    supContact[i] = new Array(segV + 1);
    supBack[i] = new Array(segV + 1);
    const u = uGrid[i];
    for (let j = 0; j <= segV; j++) {
      const v = vGrid[j];
      const zi = zInfGrid[i][j];
      const zs = zSupGrid[i][j];
      lowerMinWallMm = Math.min(lowerMinWallMm, zi - zBackInf);
      upperMinWallMm = Math.min(upperMinWallMm, zBackSup - zs);
      infContact[i][j] = localToWorld(u, v, zi, frame);
      infBack[i][j] = localToWorld(u, v, zBackInf, frame);
      supContact[i][j] = localToWorld(u, v, zs, frame);
      supBack[i][j] = localToWorld(u, v, zBackSup, frame);
    }
  }

  // 2. Molde Inferior (contact em +defectDir, backplane em -defectDir)
  // Em (tx, ty) crescente, (p00, p10, p11, p01) tem normal +defectDir!
  const lowerTris: [Vec3, Vec3, Vec3][] = [];
  for (let i = 0; i < segU; i++) {
    for (let j = 0; j < segV; j++) {
      pushQuad(lowerTris, infContact[i][j], infContact[i + 1][j], infContact[i + 1][j + 1], infContact[i][j + 1]);
      pushQuad(lowerTris, infBack[i][j], infBack[i][j + 1], infBack[i + 1][j + 1], infBack[i + 1][j]);
    }
  }
  // 4 saias laterais ligando contact ao backplane (incluindo os canais de escape na borda)
  for (let j = 0; j < segV; j++) {
    // Borda esquerda i = 0 (normal -tx)
    pushQuad(lowerTris, infContact[0][j], infContact[0][j + 1], infBack[0][j + 1], infBack[0][j]);
    // Borda direita i = segU (normal +tx)
    pushQuad(lowerTris, infContact[segU][j], infBack[segU][j], infBack[segU][j + 1], infContact[segU][j + 1]);
  }
  for (let i = 0; i < segU; i++) {
    // Borda inferior j = 0 (normal -ty)
    pushQuad(lowerTris, infContact[i][0], infBack[i][0], infBack[i + 1][0], infContact[i + 1][0]);
    // Borda superior j = segV (normal +ty)
    pushQuad(lowerTris, infContact[i][segV], infContact[i + 1][segV], infBack[i + 1][segV], infBack[i][segV]);
  }

  // 3. Molde Superior (backplane em +defectDir, contact em -defectDir — winding invertido!)
  const upperTris: [Vec3, Vec3, Vec3][] = [];
  for (let i = 0; i < segU; i++) {
    for (let j = 0; j < segV; j++) {
      pushQuad(upperTris, supBack[i][j], supBack[i + 1][j], supBack[i + 1][j + 1], supBack[i][j + 1]);
      pushQuad(upperTris, supContact[i][j], supContact[i][j + 1], supContact[i + 1][j + 1], supContact[i + 1][j]);
    }
  }
  for (let j = 0; j < segV; j++) {
    pushQuad(upperTris, supBack[0][j], supBack[0][j + 1], supContact[0][j + 1], supContact[0][j]);
    pushQuad(upperTris, supBack[segU][j], supContact[segU][j], supContact[segU][j + 1], supBack[segU][j + 1]);
  }
  for (let i = 0; i < segU; i++) {
    pushQuad(upperTris, supBack[i][0], supContact[i][0], supContact[i + 1][0], supBack[i + 1][0]);
    pushQuad(upperTris, supBack[i][segV], supBack[i + 1][segV], supContact[i + 1][segV], supContact[i][segV]);
  }

  // 4. Implante Positivo PMMA (células estritamente dentro do defeito onde zSup > zInf + eps)
  // Usa offset mínimo de margem de 0.35mm na borda externa do implante para evitar aresta zero-espessura
  const impTop: Vec3[][] = [];
  const impBot: Vec3[][] = [];
  const impActive: boolean[][] = [];

  for (let i = 0; i <= segU; i++) {
    impTop[i] = new Array(segV + 1);
    impBot[i] = new Array(segV + 1);
    const u = uGrid[i];
    for (let j = 0; j <= segV; j++) {
      const v = vGrid[j];
      const zMid = 0.5 * (zSupGrid[i][j] + zInfGrid[i][j]);
      const gap = Math.max(0.4, zSupGrid[i][j] - zInfGrid[i][j]);
      const zTop = zMid + 0.5 * gap;
      const zBot = zMid - 0.5 * gap;
      impTop[i][j] = localToWorld(u, v, zTop, frame);
      impBot[i][j] = localToWorld(u, v, zBot, frame);
    }
  }

  for (let i = 0; i < segU; i++) {
    impActive[i] = new Array(segV);
    const uc = uGrid[i] + 0.5 * du;
    for (let j = 0; j < segV; j++) {
      const vc = vGrid[j] + 0.5 * dv;
      impActive[i][j] = defectOrganicDist(uc, vc, frame.ru, frame.rv) <= 1.0;
    }
  }

  const implantTris: [Vec3, Vec3, Vec3][] = [];
  for (let i = 0; i < segU; i++) {
    for (let j = 0; j < segV; j++) {
      if (!impActive[i][j]) continue;
      const t00 = impTop[i][j];
      const t10 = impTop[i + 1][j];
      const t11 = impTop[i + 1][j + 1];
      const t01 = impTop[i][j + 1];

      const b00 = impBot[i][j];
      const b10 = impBot[i + 1][j];
      const b11 = impBot[i + 1][j + 1];
      const b01 = impBot[i][j + 1];

      pushQuad(implantTris, t00, t10, t11, t01);
      pushQuad(implantTris, b00, b01, b11, b10);

      if (i === 0 || !impActive[i - 1][j]) pushQuad(implantTris, t00, t01, b01, b00);
      if (i === segU - 1 || !impActive[i + 1][j]) pushQuad(implantTris, t10, b10, b11, t11);
      if (j === 0 || !impActive[i][j - 1]) pushQuad(implantTris, t00, b00, b10, t10);
      if (j === segV - 1 || !impActive[i][j + 1]) pushQuad(implantTris, t01, t11, b11, b01);
    }
  }

  // 5. Comparativo Clínico: Placa de Titânio Não Prototipada com quinas vivas e hotspots de úlcera
  const tiSegU = 14;
  const tiSegV = 12;
  const tiHalfU = frame.ru * 1.12;
  const tiHalfV = frame.rv * 1.12;
  const tiTop: Vec3[][] = [];
  const tiBot: Vec3[][] = [];
  const tiActive: boolean[][] = [];
  for (let i = 0; i <= tiSegU; i++) {
    tiTop[i] = [];
    tiBot[i] = [];
    const u = -tiHalfU + (i / tiSegU) * 2 * tiHalfU;
    for (let j = 0; j <= tiSegV; j++) {
      const v = -tiHalfV + (j / tiSegV) * 2 * tiHalfV;
      const d = defectOrganicDist(u, v, frame.ru, frame.rv);
      const { zSup } = evalMoldContactHeights(u, v, cfg, frame, params, pins);
      // Simula dobramento manual com sobre-projeção nas bordas ("tenting" metálico)
      const tent = d > 0.88 ? 3.4 : -1.2;
      tiTop[i][j] = localToWorld(u, v, zSup + tent, frame);
      tiBot[i][j] = localToWorld(u, v, zSup + tent - 0.9, frame);
    }
  }
  for (let i = 0; i < tiSegU; i++) {
    tiActive[i] = [];
    const uc = -tiHalfU + ((i + 0.5) / tiSegU) * 2 * tiHalfU;
    for (let j = 0; j < tiSegV; j++) {
      const vc = -tiHalfV + ((j + 0.5) / tiSegV) * 2 * tiHalfV;
      tiActive[i][j] = defectOrganicDist(uc, vc, frame.ru, frame.rv) <= 1.10;
    }
  }
  const tiTris: [Vec3, Vec3, Vec3][] = [];
  for (let i = 0; i < tiSegU; i++) {
    for (let j = 0; j < tiSegV; j++) {
      if (!tiActive[i][j]) continue;
      pushQuad(tiTris, tiTop[i][j], tiTop[i + 1][j], tiTop[i + 1][j + 1], tiTop[i][j + 1]);
      pushQuad(tiTris, tiBot[i][j], tiBot[i][j + 1], tiBot[i + 1][j + 1], tiBot[i + 1][j]);
    }
  }
  const titaniumHotspots: Vec3[] = [0.28, 1.28, 2.32, 3.55, 4.82, 5.72].map((ang) => {
    const hu = Math.cos(ang) * frame.ru * 1.03;
    const hv = Math.sin(ang) * frame.rv * 1.03;
    const { zSup } = evalMoldContactHeights(hu, hv, cfg, frame, params, pins);
    return localToWorld(hu, hv, zSup + 4.0, frame);
  });

  // 6. Crânio sintético fechado
  const skullTris = buildSyntheticSkullTriangles(cfg, frame);

  // 7. Versões rotacionadas em float64 (det = +1) apoiadas planas em Z = 0
  const lowerFlatTris = transformTrianglesToBedFlat(lowerTris, frame, false);
  const upperFlatTris = transformTrianglesToBedFlat(upperTris, frame, true);
  const implantFlatTris = transformTrianglesToBedFlat(implantTris, frame, false);

  return {
    cfg,
    params,
    frame,
    skull: createMeshFromTriangles(skullTris),
    implant: createMeshFromTriangles(implantTris),
    lowerMold: createMeshFromTriangles(lowerTris),
    upperMold: createMeshFromTriangles(upperTris),
    implantBedFlat: createMeshFromTriangles(implantFlatTris),
    lowerMoldBedFlat: createMeshFromTriangles(lowerFlatTris),
    upperMoldBedFlat: createMeshFromTriangles(upperFlatTris),
    lowerMinWallMm,
    upperMinWallMm,
    titaniumPlate: createMeshFromTriangles(tiTris),
    titaniumHotspots,
  };
}
