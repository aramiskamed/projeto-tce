import { ExportOptions, MoldParameters } from '../data/syntheticCases';
import { MeshTopologyAudit } from './meshAudit';

export interface SusEconomicsBreakdown {
  aihProcedureCode: '04.03.01.001-2';
  aihReimbursementBrl: number;
  cementSigtapCode: '07.02.03.138-0' | '07.02.03.008-2';
  cementUnitCostBrl: number;
  cementKits: number;
  cementTotalBrl: number;
  miniplateSigtapCode: '07.02.05.048-2';
  miniplateCostBrl: number;
  pmmaMassGrams: number;
  petgGrams: number;
  petgCostBrl: number;
  estimatedPrintHours: number;
  sterilizationCostBrl: number;
  estimatedTotalKitCostBrl: number;
  commercialOpmeRefBrl: number;
  savingsVsCommercialPct: number;
  fitsWithinAih: boolean;
}

export interface SurgicalKitAudit {
  schemaVersion: '2.0';
  syntheticCompliance: string;
  generatedAtIso: string;
  parameters: MoldParameters;
  exportOptions: ExportOptions;
  implant: MeshTopologyAudit;
  lowerMold: MeshTopologyAudit;
  upperMold: MeshTopologyAudit;
  economics: SusEconomicsBreakdown;
}

export interface ThermalSamplePoint {
  minute: number;
  freehandDuraTempC: number;
  craniomoldDuraTempC: number;
  extracorporealMoldTempC: number;
  corticalNecrosisThresholdC: number;
}

export const SIGTAP_CONSTANTS = {
  AIH_CRANIOPLASTY_BRL: 1322.12,
  CEMENT_PLAIN_BRL: 145.42,
  CEMENT_ANTIBIOTIC_BRL: 262.63,
  MINIPLATE_BRL: 361.81,
  STERILIZATION_ETO_H2O2_BRL: 60.0,
  PETG_PRICE_PER_GRAM_BRL: 0.17,
  PMMA_DENSITY_G_PER_CM3: 1.18,
  PETG_DENSITY_G_PER_CM3: 1.27,
  PETG_EFFECTIVE_INFILL: 0.42, // 4-5 perímetros + 35% gyroid
  PMMA_CURED_BATCH_GRAMS: 38.0, // 30g pó + 17ml monômero ~ 38-45g úteis
} as const;

export function calculateSusEconomics(input: {
  implantVolumeCm3: number;
  lowerMoldVolumeCm3: number;
  upperMoldVolumeCm3: number;
  fixationPlates: number;
  useAntibioticCement?: boolean;
  commercialOpmeRefBrl?: number;
}): SusEconomicsBreakdown {
  const pmmaMassGrams = Number(
    (Math.max(1.0, input.implantVolumeCm3) * SIGTAP_CONSTANTS.PMMA_DENSITY_G_PER_CM3).toFixed(2),
  );
  const cementKits = Math.max(1, Math.ceil(pmmaMassGrams / SIGTAP_CONSTANTS.PMMA_CURED_BATCH_GRAMS));
  const useAbx = Boolean(input.useAntibioticCement);
  const cementSigtapCode = useAbx ? '07.02.03.008-2' : '07.02.03.138-0';
  const cementUnitCostBrl = useAbx
    ? SIGTAP_CONSTANTS.CEMENT_ANTIBIOTIC_BRL
    : SIGTAP_CONSTANTS.CEMENT_PLAIN_BRL;
  const cementTotalBrl = Number((cementKits * cementUnitCostBrl).toFixed(2));

  const totalMoldVolCm3 = Math.max(10.0, input.lowerMoldVolumeCm3 + input.upperMoldVolumeCm3);
  const petgGrams = Math.round(
    totalMoldVolCm3 * SIGTAP_CONSTANTS.PETG_DENSITY_G_PER_CM3 * SIGTAP_CONSTANTS.PETG_EFFECTIVE_INFILL,
  );
  const petgCostBrl = Number((petgGrams * SIGTAP_CONSTANTS.PETG_PRICE_PER_GRAM_BRL).toFixed(2));
  const estimatedPrintHours = Number((petgGrams / 42.0).toFixed(1));

  const miniplateCostBrl = Number(
    (Math.max(1, input.fixationPlates) * SIGTAP_CONSTANTS.MINIPLATE_BRL).toFixed(2),
  );
  const sterilizationCostBrl = SIGTAP_CONSTANTS.STERILIZATION_ETO_H2O2_BRL;
  const estimatedTotalKitCostBrl = Number(
    (cementTotalBrl + petgCostBrl + sterilizationCostBrl + miniplateCostBrl).toFixed(2),
  );

  const commercialOpmeRefBrl = input.commercialOpmeRefBrl ?? 160000;
  const savingsVsCommercialPct = Number(
    (((commercialOpmeRefBrl - estimatedTotalKitCostBrl) / commercialOpmeRefBrl) * 100).toFixed(2),
  );

  return {
    aihProcedureCode: '04.03.01.001-2',
    aihReimbursementBrl: SIGTAP_CONSTANTS.AIH_CRANIOPLASTY_BRL,
    cementSigtapCode,
    cementUnitCostBrl,
    cementKits,
    cementTotalBrl,
    miniplateSigtapCode: '07.02.05.048-2',
    miniplateCostBrl,
    pmmaMassGrams,
    petgGrams,
    petgCostBrl,
    estimatedPrintHours,
    sterilizationCostBrl,
    estimatedTotalKitCostBrl,
    commercialOpmeRefBrl,
    savingsVsCommercialPct,
    fitsWithinAih: estimatedTotalKitCostBrl <= SIGTAP_CONSTANTS.AIH_CRANIOPLASTY_BRL,
  };
}

/**
 * Curva exotérmica comparativa de polimerização do PMMA (0 a 16 minutos):
 * - Moldagem manual in-situ: pico ~80 °C na interface dura-máter/córtex (limiar necrose térmica = 47 °C)
 * - CranioMold 3D (cura extracorpórea): reação exotérmica ocorre fora do paciente; dura-máter permanece em 36,5 °C.
 */
export function buildExothermicThermalCurve(): ThermalSamplePoint[] {
  const minutes = [0, 2, 4, 6, 8, 9, 10, 11, 12, 14, 16];
  return minutes.map((minute) => {
    // Pulso exotérmico assimétrico com pico em ~9.5 min (~80.5 °C)
    const peak = 44.0 * Math.exp(-Math.pow((minute - 9.5) / 2.2, 2));
    const tail = minute > 9.5 ? 11.0 * Math.exp(-(minute - 9.5) / 4.0) : 0;
    const freehand = Number((36.5 + peak + tail * 0.35).toFixed(1));
    const moldTemp = Number((24.0 + peak * 1.12 + tail * 0.4).toFixed(1));
    return {
      minute,
      freehandDuraTempC: freehand,
      craniomoldDuraTempC: 36.5,
      extracorporealMoldTempC: moldTemp,
      corticalNecrosisThresholdC: 47.0,
    };
  });
}

export function formatBRL(val: number): string {
  return (
    'R$ ' +
    val.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function buildPrintProtocolText(audit: SurgicalKitAudit): string {
  return [
    '========================================================================',
    'PROTOCOLO DE IMPRESSÃO 3D & ESTERILIZAÇÃO — CRANIOMOLD 3D (PROJETO TCE)',
    'Repositório: https://github.com/aramiskamed/projeto-tce',
    'Conformidade: Phantom 100% sintético · Ferramenta de pesquisa assistida',
    '========================================================================',
    `Caso: ${audit.parameters.caseId} | Hemisfério: ${audit.parameters.hemisphere}`,
    `Espessura Implante PMMA: ${audit.parameters.thicknessMm.toFixed(1)} mm`,
    `Chanfro Marginal Anti-Úlcera: ${audit.parameters.chamferMm.toFixed(1)} mm`,
    `Folga Radial Poka-Yoke: ${audit.parameters.clearanceMm.toFixed(2)} mm (4 pinos cônicos + 4 encaixes, 1 pino mestre assimétrico)`,
    `Orientação dos STLs: ${audit.exportOptions.bedFlat ? 'Plana na mesa FDM (Z = 0, zero suportes internos)' : 'Coordenadas anatômicas'}`,
    '',
    '1. PARÂMETROS DE FATIADOR (PrusaSlicer / OrcaSlicer / Cura)',
    '   - Filamento recomendado: PETG grau técnico/médico ou PC-ISO',
    '   - Altura de camada: 0.16 mm (qualidade superficial da cavidade)',
    '   - Perímetros / Paredes: 5 perímetros (mín. 2.0 mm de casca sólida)',
    '   - Preenchimento: 35% Gyroid (rigidez à prensagem sem empenamento)',
    '   - Suportes: DESLIGADOS (face traseira plana em Z = 0, pinos verticais)',
    `   - Dimensões Molde Inferior: ${audit.lowerMold.bboxMm.x} x ${audit.lowerMold.bboxMm.y} x ${audit.lowerMold.bboxMm.z} mm`,
    `   - Dimensões Molde Superior: ${audit.upperMold.bboxMm.x} x ${audit.upperMold.bboxMm.y} x ${audit.upperMold.bboxMm.z} mm`,
    `   - Consumo PETG estimado: ${audit.economics.petgGrams} g (~${audit.economics.estimatedPrintHours} h de impressão)`,
    '',
    '2. ESTERILIZAÇÃO OBRIGATÓRIA EM BAIXA TEMPERATURA',
    '   - PERMITIDO: Óxido de Etileno (ETO) ou Plasma de Peróxido de Hidrogênio (H2O2)',
    '   - PROIBIDO: Autoclave a vapor (121 °C / 134 °C) — deforma PETG (Tg ~ 80 °C)',
    '',
    '3. PROTOCOLO INTRAOPERATÓRIO DE PRENSAGEM EXTRACORPÓREA',
    '   a) Revestir internamente as cavidades com filme estéril fino ou lubrificante estéril.',
    `   b) Preparar ${audit.economics.cementKits} kit(s) de PMMA cirúrgico (SIGTAP ${audit.economics.cementSigtapCode}, massa alvo ~${audit.economics.pmmaMassGrams} g).`,
    '   c) Preencher a cavidade inferior na fase pastosa e acoplar a tampa guiada pelos 4 pinos Poka-Yoke.',
    '   d) Pressionar continuamente permitindo escape do excesso pela canaleta e 4 canais radiais.',
    '   e) Aguardar polimerização e resfriamento completo (< 37 °C) FORA do corpo do paciente.',
    '   f) Desmoldar, aparar rebarba fina, perfurar os guias de drenagem epidural e fixar com miniplacas.',
    '========================================================================',
  ].join('\n');
}
