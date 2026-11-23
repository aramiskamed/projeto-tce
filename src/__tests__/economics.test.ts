import { describe, expect, it } from 'vitest';
import { DEFAULT_MOLD_PARAMS } from '../data/syntheticCases';
import {
  buildExothermicThermalCurve,
  buildPrintProtocolText,
  calculateSusEconomics,
  formatBRL,
} from '../engine/economics';
import { auditMeshTopology } from '../engine/meshAudit';
import { generateSurgicalKit } from '../engine/meshBuilder';

describe('SUS/SIGTAP Economics & Exothermic PMMA Thermal Safety', () => {
  it('computes SIGTAP kit cost < R$ 900 with > 99% savings vs commercial OPME', () => {
    const eco = calculateSusEconomics({
      implantVolumeCm3: 52.0,
      lowerMoldVolumeCm3: 240.0,
      upperMoldVolumeCm3: 260.0,
      fixationPlates: 1,
    });
    expect(eco.cementSigtapCode).toBe('07.02.03.138-0');
    expect(eco.cementKits).toBe(2);
    expect(eco.cementTotalBrl).toBeCloseTo(290.84, 2);
    expect(eco.miniplateCostBrl).toBeCloseTo(361.81, 2);
    expect(eco.estimatedTotalKitCostBrl).toBeLessThan(900);
    expect(eco.fitsWithinAih).toBe(true);
    expect(eco.savingsVsCommercialPct).toBeGreaterThan(99.2);
  });

  it('supports antibiotic cement code 07.02.03.008-2', () => {
    const eco = calculateSusEconomics({
      implantVolumeCm3: 45.0,
      lowerMoldVolumeCm3: 180.0,
      upperMoldVolumeCm3: 190.0,
      fixationPlates: 1,
      useAntibioticCement: true,
    });
    expect(eco.cementSigtapCode).toBe('07.02.03.008-2');
    expect(eco.cementUnitCostBrl).toBeCloseTo(262.63, 2);
  });

  it('demonstrates cortical thermal safety: Freehand > 75 °C vs CranioMold 3D dura <= 37 °C', () => {
    const curve = buildExothermicThermalCurve();
    const peakFreehand = Math.max(...curve.map((p) => p.freehandDuraTempC));
    const maxCraniomoldDura = Math.max(...curve.map((p) => p.craniomoldDuraTempC));
    expect(peakFreehand).toBeGreaterThan(75);
    expect(maxCraniomoldDura).toBeLessThanOrEqual(37.0);
  });

  it('generates print & sterilization protocol text with low-temperature sterilization warning', () => {
    const kit = generateSurgicalKit({ ...DEFAULT_MOLD_PARAMS, caseId: 'frontal' });
    const implant = auditMeshTopology(kit.implantBedFlat, kit.params.thicknessMm);
    const lowerMold = auditMeshTopology(kit.lowerMoldBedFlat, kit.lowerMinWallMm);
    const upperMold = auditMeshTopology(kit.upperMoldBedFlat, kit.upperMinWallMm);
    const economics = calculateSusEconomics({
      implantVolumeCm3: implant.signedVolumeCm3,
      lowerMoldVolumeCm3: lowerMold.signedVolumeCm3,
      upperMoldVolumeCm3: upperMold.signedVolumeCm3,
      fixationPlates: kit.cfg.fixationPlates,
    });
    const text = buildPrintProtocolText({
      schemaVersion: '2.0',
      syntheticCompliance: '100% synthetic',
      generatedAtIso: new Date().toISOString(),
      parameters: kit.params,
      exportOptions: { bedFlat: true },
      implant,
      lowerMold,
      upperMold,
      economics,
    });
    expect(text).toContain('ETO');
    expect(text).toContain('PROIBIDO: Autoclave');
    expect(formatBRL(768.07)).toContain('768,07');
  });
});
