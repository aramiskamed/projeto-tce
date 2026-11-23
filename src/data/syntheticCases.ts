export type CaseId = 'craniectomy18' | 'bifrontal' | 'frontal' | 'zygoma';
export type Hemisphere = 'right' | 'left';
export type ClipAxis = 'none' | 'axial' | 'coronal' | 'sagittal';

export interface DefectCaseConfig {
  id: CaseId;
  title: string;
  shortLabel: string;
  clinicalSummary: string;
  nominalAreaCm2: number;
  thetaCenter: number; // azimute em torno de +Y a partir de +Z (0 = anterior, +PI/2 = direito)
  phiCenter: number; // ângulo polar a partir de +Y (0 = vértice, PI/2 = equador)
  radiusUMm: number; // semi-eixo horizontal no plano tangente local (mm)
  radiusVMm: number; // semi-eixo vertical no plano tangente local (mm)
  domeRx: number; // semi-eixo X médio-lateral (mm)
  domeRy: number; // semi-eixo Y crânio-caudal / vertical (mm)
  domeRz: number; // semi-eixo Z ântero-posterior (mm)
  fixationPlates: number;
  isBilateral: boolean;
}

export interface MoldParameters {
  caseId: CaseId;
  hemisphere: Hemisphere;
  defectScale: number; // [0.70, 1.20]
  uShiftMm: number; // [-12, 12] (0 se isBilateral)
  vShiftMm: number; // [-10, 10]
  thicknessMm: number; // [2.8, 5.0]
  chamferMm: number; // [0.5, 3.0]
  clearanceMm: number; // [0.20, 0.50]
  includeDrainageDimples: boolean;
}

export interface ExportOptions {
  bedFlat: boolean;
}

export const SYNTHETIC_CASES: Record<CaseId, DefectCaseConfig> = {
  craniectomy18: {
    id: 'craniectomy18',
    title: 'Caso Sintético 01 · Jovem 18a — Hemicraniectomia Descompressiva Pós-Moto (156 cm²)',
    shortLabel: 'Caso 01 · Hemicraniectomia Fronto-Parieto-Temporal (156 cm²)',
    clinicalSummary:
      'Falha extensa fronto-parieto-temporal após craniectomia descompressiva de emergência. Reconstrução por espelhamento sagital contralateral com chanfro anti-úlcera.',
    nominalAreaCm2: 156.0,
    thetaCenter: 1.05,
    phiCenter: 1.14,
    radiusUMm: 54.0,
    radiusVMm: 44.0,
    domeRx: 74.0,
    domeRy: 84.0,
    domeRz: 92.0,
    fixationPlates: 1,
    isBilateral: false,
  },
  bifrontal: {
    id: 'bifrontal',
    title: 'Caso Sintético 02 · Craniectomia Descompressiva Bifrontal Pós-TCE Difuso (118 cm²)',
    shortLabel: 'Caso 02 · Craniectomia Descompressiva Bifrontal (118 cm²)',
    clinicalSummary:
      'Defeito bilateral cruzando a linha média frontal (sem osso contralateral íntegro). Reconstrução por superfície paramétrica simétrica de abóbada.',
    nominalAreaCm2: 118.0,
    thetaCenter: 0.0,
    phiCenter: 1.04,
    radiusUMm: 50.0,
    radiusVMm: 38.0,
    domeRx: 74.0,
    domeRy: 84.0,
    domeRz: 92.0,
    fixationPlates: 2,
    isBilateral: true,
  },
  frontal: {
    id: 'frontal',
    title: 'Caso Sintético 03 · Afundamento Frontal & Rebordo Supraorbitário (54 cm²)',
    shortLabel: 'Caso 03 · Afundamento Frontal & Rebordo Supraorbitário (54 cm²)',
    clinicalSummary:
      'Sequela traumática frontal lateralizada envolvendo rebordo supraorbitário. Espelhamento sagital restaura a projeção frontal simétrica.',
    nominalAreaCm2: 54.0,
    thetaCenter: 0.42,
    phiCenter: 1.12,
    radiusUMm: 33.0,
    radiusVMm: 28.0,
    domeRx: 72.0,
    domeRy: 82.0,
    domeRz: 88.0,
    fixationPlates: 1,
    isBilateral: false,
  },
  zygoma: {
    id: 'zygoma',
    title: 'Caso Sintético 04 · Sequela Complexo Zigomático-Orbitário / Malar (28 cm²)',
    shortLabel: 'Caso 04 · Complexo Zigomático-Orbitário / Malar (28 cm²)',
    clinicalSummary:
      'Fratura/sequela zigomático-orbitária (44,5% das fraturas faciais cirúrgicas). Espelhamento do malar íntegro previne enoftalmia e assimetria.',
    nominalAreaCm2: 28.0,
    thetaCenter: 0.56,
    phiCenter: 1.46,
    radiusUMm: 25.0,
    radiusVMm: 21.0,
    domeRx: 71.0,
    domeRy: 81.0,
    domeRz: 86.0,
    fixationPlates: 1,
    isBilateral: false,
  },
};

export const CASE_ORDER: CaseId[] = ['craniectomy18', 'bifrontal', 'frontal', 'zygoma'];

export const DEFAULT_MOLD_PARAMS: MoldParameters = {
  caseId: 'craniectomy18',
  hemisphere: 'right',
  defectScale: 1.0,
  uShiftMm: 0.0,
  vShiftMm: 0.0,
  thicknessMm: 4.0,
  chamferMm: 2.0,
  clearanceMm: 0.35,
  includeDrainageDimples: true,
};
