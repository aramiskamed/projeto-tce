import { DefectCaseConfig, MoldParameters, SYNTHETIC_CASES } from '../data/syntheticCases';

export type Vec3 = [number, number, number];

export interface LocalFrame {
  defectDir: Vec3; // normal externa unitária do centro do defeito
  tx: Vec3; // eixo horizontal tangente local (unitário)
  ty: Vec3; // eixo vertical tangente local (unitário), tx x ty = defectDir
  centerPoint: Vec3; // ponto central na superfície craniana
  ru: number; // semi-eixo U efetivo do defeito (mm)
  rv: number; // semi-eixo V efetivo do defeito (mm)
  halfU: number; // metade da largura total da flange (mm)
  halfV: number; // metade da altura total da flange (mm)
  zFlange: number; // plano de partição periférico estável ao longo de defectDir (mm)
}

export interface PinSpec {
  id: string;
  u: number;
  v: number;
  rBase: number;
  rTip: number;
  isMaster: boolean;
}

export const MOLD_CONSTANTS = {
  FLANGE_MARGIN_MM: 19.0,
  GUTTER_INNER_MM: 2.0,
  GUTTER_OUTER_MM: 5.0,
  GUTTER_DEPTH_MM: 1.0,
  VENT_HALF_WIDTH_MM: 2.0,
  PIN_INSET_FROM_EDGE_MM: 8.0,
  PIN_HEIGHT_MM: 6.5,
  SOCKET_AXIAL_CLEARANCE_MM: 0.8,
  PIN_STD_RBASE_MM: 3.8,
  PIN_STD_RTIP_MM: 2.4,
  PIN_MASTER_RBASE_MM: 5.0,
  PIN_MASTER_RTIP_MM: 3.4,
  MIN_BACKPLANE_WALL_MM: 9.0,
  SEG_U: 96,
  SEG_V: 80,
} as const;

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function smoothstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

export function dot3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross3(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function sub3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function add3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function scale3(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

export function len3(v: Vec3): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

export function normalize3(v: Vec3): Vec3 {
  const n = len3(v);
  if (n < 1e-12) return [0, 1, 0];
  return [v[0] / n, v[1] / n, v[2] / n];
}

export function sanitizeMoldParams(raw: MoldParameters): MoldParameters {
  const cfg = SYNTHETIC_CASES[raw.caseId] ?? SYNTHETIC_CASES.craniectomy18;
  return {
    caseId: cfg.id,
    hemisphere: cfg.isBilateral ? 'right' : raw.hemisphere,
    defectScale: clamp(Number.isFinite(raw.defectScale) ? raw.defectScale : 1.0, 0.7, 1.2),
    uShiftMm: cfg.isBilateral
      ? 0.0
      : clamp(Number.isFinite(raw.uShiftMm) ? raw.uShiftMm : 0.0, -12.0, 12.0),
    vShiftMm: clamp(Number.isFinite(raw.vShiftMm) ? raw.vShiftMm : 0.0, -10.0, 10.0),
    thicknessMm: clamp(Number.isFinite(raw.thicknessMm) ? raw.thicknessMm : 4.0, 2.8, 5.0),
    chamferMm: clamp(Number.isFinite(raw.chamferMm) ? raw.chamferMm : 2.0, 0.5, 3.0),
    clearanceMm: clamp(Number.isFinite(raw.clearanceMm) ? raw.clearanceMm : 0.35, 0.2, 0.5),
    includeDrainageDimples: Boolean(raw.includeDrainageDimples),
  };
}

/**
 * Raio anatômico da tábua externa craniana ao longo de um raio unitário `dir` (espaço Y-up, simétrico em X=0).
 * +X = Direito, +Y = Superior (vértice), +Z = Anterior (face).
 */
export function evalCranialRadius(dir: Vec3, cfg: DefectCaseConfig): number {
  const dx = dir[0];
  const dy = dir[1];
  const dz = dir[2];

  const invEllip = Math.sqrt(
    (dx / cfg.domeRx) ** 2 + (dy / cfg.domeRy) ** 2 + (dz / cfg.domeRz) ** 2,
  );
  const baseR = invEllip > 1e-12 ? 1.0 / invEllip : cfg.domeRx;

  const phi = Math.acos(clamp(dy, -1, 1));
  const theta = Math.atan2(dx, dz);
  const absTheta = Math.abs(theta);

  // Modulações anatômicas simétricas em relação ao plano sagital mediano X = 0
  const frontalBoss =
    3.8 * Math.exp(-((absTheta / 0.54) ** 2)) * Math.exp(-(((phi - 1.12) / 0.24) ** 2));
  const temporalFlatten =
    -2.8 * Math.exp(-(((absTheta - 1.38) / 0.36) ** 2)) * Math.exp(-(((phi - 1.32) / 0.28) ** 2));
  const orbitalIndent =
    -4.8 * Math.exp(-(((absTheta - 0.36) / 0.18) ** 2)) * Math.exp(-(((phi - 1.38) / 0.12) ** 2));
  const malarProj =
    4.5 * Math.exp(-(((absTheta - 0.56) / 0.22) ** 2)) * Math.exp(-(((phi - 1.50) / 0.14) ** 2));
  const occipitalBump =
    3.0 * Math.exp(-(((Math.PI - absTheta) / 0.48) ** 2)) * Math.exp(-(((phi - 1.38) / 0.26) ** 2));

  return baseR + frontalBoss + temporalFlatten + orbitalIndent + malarProj + occipitalBump;
}

export function evalCranialPoint(dir: Vec3, cfg: DefectCaseConfig, radialOffset = 0): Vec3 {
  const uDir = normalize3(dir);
  const r = evalCranialRadius(uDir, cfg) + radialOffset;
  return scale3(uDir, r);
}

/**
 * Distância normalizada orgânica à margem da falha no plano tangente local (d <= 1.0 -> dentro da falha).
 */
export function defectOrganicDist(u: number, v: number, ru: number, rv: number): number {
  const nu = u / Math.max(1e-6, ru);
  const nv = v / Math.max(1e-6, rv);
  const ang = Math.atan2(nv, nu);
  const organic = 1.0 + 0.045 * Math.sin(3 * ang) + 0.03 * Math.cos(5 * ang);
  return Math.sqrt(nu * nu + nv * nv) / organic;
}

/**
 * Raio efetivo da margem orgânica da falha na direção polar do ponto (u, v), em mm.
 */
export function defectLocalRimRadiusMm(u: number, v: number, ru: number, rv: number): number {
  const r = Math.hypot(u, v);
  if (r < 1e-6) return Math.min(ru, rv);
  const d = defectOrganicDist(u, v, ru, rv);
  return r / Math.max(1e-6, d);
}

/**
 * Resolve altura `w` ao longo de `defectDir` tal que `P = u*tx + v*ty + w*defectDir`
 * pertença à superfície craniana externa `|P| = evalCranialRadius(P/|P|)`.
 */
export function solveSkullHeightOnFrame(
  u: number,
  v: number,
  cfg: DefectCaseConfig,
  tx: Vec3,
  ty: Vec3,
  defectDir: Vec3,
): number {
  const rApprox = Math.min(cfg.domeRx, cfg.domeRy, cfg.domeRz);
  const r2 = u * u + v * v;
  let w = Math.sqrt(Math.max(25.0, rApprox * rApprox * 1.15 - r2));

  for (let iter = 0; iter < 6; iter++) {
    const px = tx[0] * u + ty[0] * v + defectDir[0] * w;
    const py = tx[1] * u + ty[1] * v + defectDir[1] * w;
    const pz = tx[2] * u + ty[2] * v + defectDir[2] * w;
    const dir = normalize3([px, py, pz]);
    const targetR = evalCranialRadius(dir, cfg);
    const nextW2 = targetR * targetR - r2;
    if (nextW2 <= 36.0) {
      w = 6.0;
      break;
    }
    w = Math.sqrt(nextW2);
  }
  return w;
}

/**
 * Constrói o frame tangente ortonormal direito (tx, ty, defectDir) centrado no defeito
 * com limites seguros garantindo ausência de singularidade polar e encaixe na mesa FDM 220x220mm.
 */
export function buildDefectFrame(rawParams: MoldParameters): {
  cfg: DefectCaseConfig;
  params: MoldParameters;
  frame: LocalFrame;
} {
  const params = sanitizeMoldParams(rawParams);
  const cfg = SYNTHETIC_CASES[params.caseId];

  const hemiSign = cfg.isBilateral ? 1 : params.hemisphere === 'left' ? -1 : 1;
  const baseTheta = cfg.thetaCenter * hemiSign;
  const basePhi = cfg.phiCenter;

  // Converte deslocamento tangencial (mm) em deslocamento angular seguro
  const rNom = (cfg.domeRx + cfg.domeRy + cfg.domeRz) / 3.0;
  const dTheta = params.uShiftMm / Math.max(40.0, rNom * Math.sin(basePhi));
  const dPhi = -params.vShiftMm / rNom;

  const effTheta = baseTheta + dTheta;
  const effPhi = clamp(basePhi + dPhi, 0.44, 1.82);

  const sinP = Math.sin(effPhi);
  const defectDir = normalize3([
    sinP * Math.sin(effTheta),
    Math.cos(effPhi),
    sinP * Math.cos(effTheta),
  ]);

  const worldUp: Vec3 = Math.abs(defectDir[1]) > 0.96 ? [0, 0, 1] : [0, 1, 0];
  const tx = normalize3(cross3(worldUp, defectDir));
  const ty = normalize3(cross3(defectDir, tx));

  const centerPoint = evalCranialPoint(defectDir, cfg, 0);

  // Limita semi-eixos para manter o defeito estritamente dentro do hemisfério frontal de defectDir
  // e manter o molde <= 205 mm na mesa FDM 220x220 mm
  const maxSafeRadius = Math.min(cfg.domeRx, cfg.domeRy, cfg.domeRz) * 0.84;
  const maxBedHalf = 102.0 - MOLD_CONSTANTS.FLANGE_MARGIN_MM;
  const capR = Math.min(maxSafeRadius, maxBedHalf);

  const ru = clamp(cfg.radiusUMm * params.defectScale, 14.0, capR);
  const rv = clamp(cfg.radiusVMm * params.defectScale, 14.0, capR);
  const halfU = ru + MOLD_CONSTANTS.FLANGE_MARGIN_MM;
  const halfV = rv + MOLD_CONSTANTS.FLANGE_MARGIN_MM;

  // Amostra a altura mínima na margem do defeito para definir o plano estável da flange
  let minRimW = Infinity;
  for (let k = 0; k < 48; k++) {
    const a = (k / 48) * Math.PI * 2;
    const organic = 1.0 + 0.045 * Math.sin(3 * a) + 0.03 * Math.cos(5 * a);
    const uRim = ru * organic * Math.cos(a);
    const vRim = rv * organic * Math.sin(a);
    const wRim = solveSkullHeightOnFrame(uRim, vRim, cfg, tx, ty, defectDir);
    if (wRim < minRimW) minRimW = wRim;
  }
  const zFlange = minRimW - 0.8;

  return {
    cfg,
    params,
    frame: {
      defectDir,
      tx,
      ty,
      centerPoint,
      ru,
      rv,
      halfU,
      halfV,
      zFlange,
    },
  };
}

/**
 * Retorna os 4 pinos Poka-Yoke nos 4 cantos da flange (3 padrão + 1 mestre assimétrico).
 * Todos posicionados por margem física absoluta (mm), livres de colisão em qualquer escala.
 */
export function getPokaYokePins(frame: LocalFrame): PinSpec[] {
  const pu = frame.halfU - MOLD_CONSTANTS.PIN_INSET_FROM_EDGE_MM;
  const pv = frame.halfV - MOLD_CONSTANTS.PIN_INSET_FROM_EDGE_MM;
  return [
    {
      id: 'pin-nw',
      u: -pu,
      v: pv,
      rBase: MOLD_CONSTANTS.PIN_STD_RBASE_MM,
      rTip: MOLD_CONSTANTS.PIN_STD_RTIP_MM,
      isMaster: false,
    },
    {
      id: 'pin-ne',
      u: pu,
      v: pv,
      rBase: MOLD_CONSTANTS.PIN_STD_RBASE_MM,
      rTip: MOLD_CONSTANTS.PIN_STD_RTIP_MM,
      isMaster: false,
    },
    {
      id: 'pin-sw',
      u: -pu,
      v: -pv,
      rBase: MOLD_CONSTANTS.PIN_STD_RBASE_MM,
      rTip: MOLD_CONSTANTS.PIN_STD_RTIP_MM,
      isMaster: false,
    },
    {
      id: 'pin-se-master',
      u: pu,
      v: -pv,
      rBase: MOLD_CONSTANTS.PIN_MASTER_RBASE_MM,
      rTip: MOLD_CONSTANTS.PIN_MASTER_RTIP_MM,
      isMaster: true,
    },
  ];
}

export function coneProfile(distMm: number, rBaseMm: number, rTipMm: number): number {
  if (distMm <= rTipMm) return 1.0;
  if (distMm >= rBaseMm) return 0.0;
  return (rBaseMm - distMm) / Math.max(1e-6, rBaseMm - rTipMm);
}

/**
 * Avalia altura base da superfície de partição zParting(u, v) ao longo de defectDir:
 * dentro do defeito segue exatamente a superfície craniana anatômica; na flange faz transição C1
 * para o plano de prensagem zFlange.
 */
export function evalPartingHeight(
  u: number,
  v: number,
  cfg: DefectCaseConfig,
  frame: LocalFrame,
): { zParting: number; d: number; signedDistMm: number } {
  const d = defectOrganicDist(u, v, frame.ru, frame.rv);
  const rimR = defectLocalRimRadiusMm(u, v, frame.ru, frame.rv);
  const signedDistMm = (d - 1.0) * rimR;

  if (d <= 1.0) {
    const zSkull = solveSkullHeightOnFrame(u, v, cfg, frame.tx, frame.ty, frame.defectDir);
    return { zParting: zSkull, d, signedDistMm };
  }

  // Projeta ponto da borda na mesma direção radial para transição suave até zFlange
  const scaleRim = 1.0 / d;
  const uRim = u * scaleRim;
  const vRim = v * scaleRim;
  const zRim = solveSkullHeightOnFrame(uRim, vRim, cfg, frame.tx, frame.ty, frame.defectDir);
  const tOut = smoothstep(signedDistMm / 3.8);
  const zParting = zRim * (1 - tOut) + frame.zFlange * tOut;
  return { zParting, d, signedDistMm };
}

/**
 * Avalia simultaneamente as alturas de contato do Molde Inferior (zInf) e Molde Superior (zSup)
 * no ponto (u, v) do plano tangente local, ao longo do eixo único defectDir.
 */
export function evalMoldContactHeights(
  u: number,
  v: number,
  cfg: DefectCaseConfig,
  frame: LocalFrame,
  params: MoldParameters,
  pins: PinSpec[],
): { zInf: number; zSup: number; d: number; blend: number } {
  const { zParting, d, signedDistMm } = evalPartingHeight(u, v, cfg, frame);

  // 1. Cavidade anatômica do implante PMMA com chanfro C1 controlado por chamferMm
  let blend = 0.0;
  let hInf = 0.0;
  let hSup = 0.0;

  if (signedDistMm < 0) {
    const wChamferMm = Math.max(1.5, params.chamferMm * 2.5);
    blend = smoothstep(-signedDistMm / wChamferMm);
    hSup = 0.15 * params.thicknessMm * blend;
    hInf = -0.85 * params.thicknessMm * blend;

    // Micro-calotas guia de drenagem epidural e fixação no platô central
    if (params.includeDrainageDimples && d < 0.72) {
      const dimpleCoords: [number, number][] = [
        [-frame.ru * 0.34, frame.rv * 0.28],
        [0, frame.rv * 0.34],
        [frame.ru * 0.34, frame.rv * 0.28],
        [-frame.ru * 0.34, -frame.rv * 0.28],
        [0, -frame.rv * 0.34],
        [frame.ru * 0.34, -frame.rv * 0.28],
      ];
      for (const [du, dv] of dimpleCoords) {
        const dist = Math.hypot(u - du, v - dv);
        if (dist < 2.2) {
          const bump = 0.55 * smoothstep(1.0 - dist / 2.2);
          hInf += bump;
        }
      }
    }
  } else {
    // 2. Canaleta periférica de rebarba (2.0..5.0 mm além da borda)
    let ventFactor = 0.0;
    if (
      signedDistMm >= MOLD_CONSTANTS.GUTTER_INNER_MM &&
      signedDistMm <= MOLD_CONSTANTS.GUTTER_OUTER_MM
    ) {
      const mid = 0.5 * (MOLD_CONSTANTS.GUTTER_INNER_MM + MOLD_CONSTANTS.GUTTER_OUTER_MM);
      const halfW = 0.5 * (MOLD_CONSTANTS.GUTTER_OUTER_MM - MOLD_CONSTANTS.GUTTER_INNER_MM);
      const norm = Math.abs(signedDistMm - mid) / halfW;
      ventFactor = Math.max(ventFactor, 0.5 * (1 + Math.cos(Math.PI * clamp(norm, 0, 1))));
    }

    // 3. Quatro canais radiais de escape de PMMA (u=0 e v=0 até a borda externa ±halfU, ±halfV)
    if (signedDistMm >= MOLD_CONSTANTS.GUTTER_INNER_MM) {
      const distAxisU = Math.abs(u);
      const distAxisV = Math.abs(v);
      const hw = MOLD_CONSTANTS.VENT_HALF_WIDTH_MM;
      if (distAxisU < hw) {
        ventFactor = Math.max(ventFactor, 0.5 * (1 + Math.cos((Math.PI * distAxisU) / hw)));
      }
      if (distAxisV < hw) {
        ventFactor = Math.max(ventFactor, 0.5 * (1 + Math.cos((Math.PI * distAxisV) / hw)));
      }
    }

    if (ventFactor > 0) {
      hInf -= MOLD_CONSTANTS.GUTTER_DEPTH_MM * ventFactor;
      hSup += MOLD_CONSTANTS.GUTTER_DEPTH_MM * ventFactor;
    }

    // 4. Quatro pinos Poka-Yoke (molde inferior) + 4 cavidades fêmeas correspondentes (molde superior)
    // Extrudados estritamente ao longo de +defectDir com folga radial exata = clearanceMm
    let pinProfileMax = 0.0;
    let socketProfileMax = 0.0;
    for (const pin of pins) {
      const distPin = Math.hypot(u - pin.u, v - pin.v);
      const pMale = coneProfile(distPin, pin.rBase, pin.rTip);
      if (pMale > pinProfileMax) pinProfileMax = pMale;

      const pFemale = coneProfile(
        distPin,
        pin.rBase + params.clearanceMm,
        pin.rTip + params.clearanceMm,
      );
      if (pFemale > socketProfileMax) socketProfileMax = pFemale;
    }

    if (pinProfileMax > 0) {
      hInf = Math.max(hInf, MOLD_CONSTANTS.PIN_HEIGHT_MM * pinProfileMax);
    }
    if (socketProfileMax > 0) {
      const socketDepth = MOLD_CONSTANTS.PIN_HEIGHT_MM + MOLD_CONSTANTS.SOCKET_AXIAL_CLEARANCE_MM;
      hSup = Math.max(hSup, socketDepth * socketProfileMax);
    }
  }

  return {
    zInf: zParting + hInf,
    zSup: zParting + hSup,
    d,
    blend,
  };
}
