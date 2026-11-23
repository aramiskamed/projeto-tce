import { describe, expect, it } from 'vitest';
import { DEFAULT_MOLD_PARAMS } from '../data/syntheticCases';
import { generateSurgicalKit } from '../engine/meshBuilder';
import { buildZipArchive, crc32, encodeBinarySTL, parseSTLBuffer } from '../engine/stlCodec';

describe('STL Codec & ZIP Surgical Kit Packaging', () => {
  it('round-trips Binary STL accurately without losing triangles or coordinates', () => {
    const kit = generateSurgicalKit({ ...DEFAULT_MOLD_PARAMS, caseId: 'zygoma' });
    const bytes = encodeBinarySTL(kit.implantBedFlat, 'CranioMold3D Implant zygoma');
    expect(bytes.byteLength).toBe(84 + kit.implantBedFlat.triangleCount * 50);

    const parsed = parseSTLBuffer(bytes.buffer as ArrayBuffer);
    expect(parsed.triangleCount).toBe(kit.implantBedFlat.triangleCount);
    for (let i = 0; i < 27; i++) {
      expect(parsed.positions[i]).toBeCloseTo(kit.implantBedFlat.positions[i], 4);
    }
  });

  it('correctly parses Binary STL even when the 80-byte header starts with "solid"', () => {
    const buf = new ArrayBuffer(84 + 50);
    const bytes = new Uint8Array(buf);
    const header = 'solid tricky binary header';
    for (let i = 0; i < header.length; i++) bytes[i] = header.charCodeAt(i);
    const dv = new DataView(buf);
    dv.setUint32(80, 1, true);
    // Single triangle (0,0,0), (10,0,0), (0,10,0)
    dv.setFloat32(84 + 12, 0, true);
    dv.setFloat32(84 + 16, 0, true);
    dv.setFloat32(84 + 20, 0, true);
    dv.setFloat32(84 + 24, 10, true);
    dv.setFloat32(84 + 28, 0, true);
    dv.setFloat32(84 + 32, 0, true);
    dv.setFloat32(84 + 36, 0, true);
    dv.setFloat32(84 + 40, 10, true);
    dv.setFloat32(84 + 44, 0, true);

    const parsed = parseSTLBuffer(buf);
    expect(parsed.triangleCount).toBe(1);
    expect(parsed.positions[3]).toBeCloseTo(10, 4);
  });

  it('parses valid ASCII STL cleanly', () => {
    const ascii = [
      'solid cube_tri',
      '  facet normal 0 0 1',
      '    outer loop',
      '      vertex 0 0 0',
      '      vertex 10 0 0',
      '      vertex 0 10 0',
      '    endloop',
      '  endfacet',
      'endsolid cube_tri',
    ].join('\n');
    const encoded = new TextEncoder().encode(ascii);
    const parsed = parseSTLBuffer(encoded.buffer as ArrayBuffer);
    expect(parsed.triangleCount).toBe(1);
    expect(parsed.positions[7]).toBeCloseTo(10, 4);
  });

  it('rejects empty STL, NaN coordinates, and extreme coordinates > 1e5 mm', () => {
    expect(() => parseSTLBuffer(new ArrayBuffer(0))).toThrow();
    expect(() => parseSTLBuffer(new ArrayBuffer(84))).toThrow(); // 0 triangles binary

    const badBuf = new ArrayBuffer(84 + 50);
    const dv = new DataView(badBuf);
    dv.setUint32(80, 1, true);
    dv.setFloat32(84 + 12, 1e9, true); // > 1e5 mm
    expect(() => parseSTLBuffer(badBuf)).toThrow();

    const nanBuf = new ArrayBuffer(84 + 50);
    const dv2 = new DataView(nanBuf);
    dv2.setUint32(80, 1, true);
    dv2.setFloat32(84 + 12, Number.NaN, true);
    expect(() => parseSTLBuffer(nanBuf)).toThrow();
  });

  it('builds a valid ZIP archive with PK headers and exact IEEE CRC-32', () => {
    const sample = new TextEncoder().encode('123456789');
    expect(crc32(sample)).toBe(0xcbf43926);

    const zip = buildZipArchive([
      { name: 'a.txt', data: sample },
      { name: 'b.bin', data: new Uint8Array([1, 2, 3, 4]) },
    ]);
    const dv = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    // Local file header signature PK\x03\x04
    expect(dv.getUint32(0, true)).toBe(0x04034b50);
    // EOCD signature PK\x05\x06 at tail
    expect(dv.getUint32(zip.byteLength - 22, true)).toBe(0x06054b50);
    expect(dv.getUint16(zip.byteLength - 12, true)).toBe(2);
  });
});
