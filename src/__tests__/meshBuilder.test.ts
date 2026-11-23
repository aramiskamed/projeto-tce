import { describe, expect, it } from 'vitest';
import { CASE_ORDER, DEFAULT_MOLD_PARAMS, MoldParameters } from '../data/syntheticCases';
import {
  buildDefectFrame,
  evalMoldContactHeights,
  getPokaYokePins,
  sanitizeMoldParams,
} from '../engine/cranialMath';
import { auditMeshTopology } from '../engine/meshAudit';
import { generateSurgicalKit } from '../engine/meshBuilder';

describe('CAD/CAM Manifold Mesh Builder & DFM Invariants', () => {
  it('generates 100% watertight manifold meshes with positive volume and FDM bed fit across all 4 cases', () => {
    for (const caseId of CASE_ORDER) {
      const kit = generateSurgicalKit({ ...DEFAULT_MOLD_PARAMS, caseId });
      const skullAudit = auditMeshTopology(kit.skull, 5.0);
      const impAudit = auditMeshTopology(kit.implantBedFlat, kit.params.thicknessMm);
      const lowAudit = auditMeshTopology(kit.lowerMoldBedFlat, kit.lowerMinWallMm);
      const upAudit = auditMeshTopology(kit.upperMoldBedFlat, kit.upperMinWallMm);

      expect(skullAudit.isWatertight).toBe(true);
      expect(skullAudit.boundaryEdges).toBe(0);
      expect(skullAudit.nonManifoldEdges).toBe(0);
      expect(skullAudit.hasOutwardNormals).toBe(true);

      for (const audit of [impAudit, lowAudit, upAudit]) {
        expect(audit.isWatertight).toBe(true);
        expect(audit.boundaryEdges).toBe(0);
        expect(audit.nonManifoldEdges).toBe(0);
        expect(audit.hasOutwardNormals).toBe(true);
        expect(audit.signedVolumeCm3).toBeGreaterThan(0);
        expect(audit.fitsStandardFdmBed).toBe(true);
      }

      expect(lowAudit.minWallThicknessMm).toBeGreaterThanOrEqual(8.0);
      expect(upAudit.minWallThicknessMm).toBeGreaterThanOrEqual(8.0);
    }
  });

  it('maintains watertightness, wall >= 8mm, and bed fit at extreme defectScale (0.70 and 1.20) and left hemisphere', () => {
    const scenarios: Partial<MoldParameters>[] = [
      { caseId: 'zygoma', defectScale: 0.7, hemisphere: 'left', uShiftMm: -10, vShiftMm: -8 },
      { caseId: 'craniectomy18', defectScale: 1.2, hemisphere: 'left', uShiftMm: 10, vShiftMm: 8 },
      { caseId: 'bifrontal', defectScale: 1.2, hemisphere: 'left', uShiftMm: 12, vShiftMm: -10 },
      { caseId: 'frontal', defectScale: 0.7, hemisphere: 'right', clearanceMm: 0.2 },
    ];

    for (const patch of scenarios) {
      const kit = generateSurgicalKit({ ...DEFAULT_MOLD_PARAMS, ...patch });
      const low = auditMeshTopology(kit.lowerMoldBedFlat, kit.lowerMinWallMm);
      const up = auditMeshTopology(kit.upperMoldBedFlat, kit.upperMinWallMm);
      const imp = auditMeshTopology(kit.implantBedFlat, kit.params.thicknessMm);

      expect(low.isWatertight).toBe(true);
      expect(up.isWatertight).toBe(true);
      expect(imp.isWatertight).toBe(true);
      expect(low.fitsStandardFdmBed).toBe(true);
      expect(up.fitsStandardFdmBed).toBe(true);
      expect(low.minWallThicknessMm).toBeGreaterThanOrEqual(8.0);
      expect(up.minWallThicknessMm).toBeGreaterThanOrEqual(8.0);
    }
  });

  it('locks hemisphere and uShiftMm for bilateral bifrontal case', () => {
    const clean = sanitizeMoldParams({
      ...DEFAULT_MOLD_PARAMS,
      caseId: 'bifrontal',
      hemisphere: 'left',
      uShiftMm: 11,
      defectScale: 2.5, // deve ser clamped para 1.2
    });
    expect(clean.hemisphere).toBe('right');
    expect(clean.uShiftMm).toBe(0);
    expect(clean.defectScale).toBe(1.2);
  });

  it('enforces exact plateau thickness = thicknessMm and C1 continuity (zero vertical step) at rim d = 1.0', () => {
    const params: MoldParameters = {
      ...DEFAULT_MOLD_PARAMS,
      caseId: 'craniectomy18',
      thicknessMm: 4.4,
      chamferMm: 2.0,
      includeDrainageDimples: false,
    };
    const { cfg, frame } = buildDefectFrame(params);
    const pins = getPokaYokePins(frame);

    // No centro do defeito (platô): zSup - zInf === thicknessMm
    const center = evalMoldContactHeights(0, 0, cfg, frame, params, pins);
    expect(center.zSup - center.zInf).toBeCloseTo(4.4, 3);

    // Na margem d = 1.0 (orgânico em ang=0 -> 1 + 0.03 = 1.03): salto zero
    const uRim = frame.ru * 1.03;
    const justInside = evalMoldContactHeights(uRim - 0.001, 0, cfg, frame, params, pins);
    const justOutside = evalMoldContactHeights(uRim + 0.001, 0, cfg, frame, params, pins);
    expect(Math.abs(justInside.zInf - justOutside.zInf)).toBeLessThan(0.05);
    expect(Math.abs(justInside.zSup - justOutside.zSup)).toBeLessThan(0.05);
  });

  it('guarantees zero 3D collision between Poka-Yoke pins and upper sockets along rigid closing trajectory', () => {
    for (const clearanceMm of [0.2, 0.35, 0.5]) {
      const params: MoldParameters = {
        ...DEFAULT_MOLD_PARAMS,
        caseId: 'craniectomy18',
        clearanceMm,
      };
      const { cfg, frame } = buildDefectFrame(params);
      const pins = getPokaYokePins(frame);
      expect(pins).toHaveLength(4);
      expect(pins.filter((p) => p.isMaster)).toHaveLength(1);

      // Verifica em malha fina em torno de cada pino e em múltiplos passos de fechamento s >= 0
      for (const pin of pins) {
        for (const s of [0, 1, 3, 6]) {
          for (let r = 0; r <= pin.rBase + clearanceMm + 1.0; r += 0.25) {
            for (const ang of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
              const u = pin.u + r * Math.cos(ang);
              const v = pin.v + r * Math.sin(ang);
              const { zInf, zSup } = evalMoldContactHeights(u, v, cfg, frame, params, pins);
              // Na trajetória rígida ao longo de +defectDir, upper(u,v) + s nunca penetra lower(u,v)
              expect(zSup + s - zInf).toBeGreaterThanOrEqual(-1e-6);
              if (r < pin.rBase) {
                expect(zSup + s - zInf).toBeGreaterThan(0.05);
              }
            }
          }
        }
      }
    }
  });

  it('places both bed-flat molds cleanly at Z = 0 with outward normals (det = +1)', () => {
    const kit = generateSurgicalKit(DEFAULT_MOLD_PARAMS);
    for (const mesh of [kit.lowerMoldBedFlat, kit.upperMoldBedFlat, kit.implantBedFlat]) {
      let minZ = Infinity;
      for (let i = 2; i < mesh.positions.length; i += 3) {
        if (mesh.positions[i] < minZ) minZ = mesh.positions[i];
      }
      expect(Math.abs(minZ)).toBeLessThan(0.01);
      const audit = auditMeshTopology(mesh, 9.0);
      expect(audit.hasOutwardNormals).toBe(true);
      expect(audit.isWatertight).toBe(true);
    }
  });
});
