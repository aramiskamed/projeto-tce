import { MeshData } from './meshBuilder';

export const STL_LIMITS = {
  MAX_FILE_BYTES: 25 * 1024 * 1024, // 25 MB
  MAX_TRIANGLES: 500_000,
  MAX_COORD_ABS_MM: 1e5, // ±100 metros (previne overflow em produtos vetoriais)
} as const;

/**
 * Codifica MeshData em arquivo Binary STL padrão (84 + 50 * N bytes, little-endian).
 */
export function encodeBinarySTL(mesh: MeshData, headerLabel: string): Uint8Array {
  const triCount = mesh.triangleCount;
  const byteLength = 84 + triCount * 50;
  const buffer = new ArrayBuffer(byteLength);
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  // Cabeçalho ASCII de 80 bytes (sem iniciar com "solid " para máxima compatibilidade de fatiadores)
  const cleanLabel = headerLabel.replace(/^solid\s+/i, 'CranioMold3D ').slice(0, 80);
  for (let i = 0; i < 80; i++) {
    bytes[i] = i < cleanLabel.length ? cleanLabel.charCodeAt(i) & 0x7f : 0x20;
  }

  view.setUint32(80, triCount, true);

  const pos = mesh.positions;
  const norm = mesh.normals;
  let offset = 84;
  for (let i = 0; i < triCount; i++) {
    const base = i * 9;
    view.setFloat32(offset, norm[base], true);
    view.setFloat32(offset + 4, norm[base + 1], true);
    view.setFloat32(offset + 8, norm[base + 2], true);

    view.setFloat32(offset + 12, pos[base], true);
    view.setFloat32(offset + 16, pos[base + 1], true);
    view.setFloat32(offset + 20, pos[base + 2], true);

    view.setFloat32(offset + 24, pos[base + 3], true);
    view.setFloat32(offset + 28, pos[base + 4], true);
    view.setFloat32(offset + 32, pos[base + 5], true);

    view.setFloat32(offset + 36, pos[base + 6], true);
    view.setFloat32(offset + 40, pos[base + 7], true);
    view.setFloat32(offset + 44, pos[base + 8], true);

    view.setUint16(offset + 48, 0, true);
    offset += 50;
  }

  return bytes;
}

function validateCoord(v: number): void {
  if (!Number.isFinite(v) || Math.abs(v) > STL_LIMITS.MAX_COORD_ABS_MM) {
    throw new Error('Coordenada STL inválida (NaN, Infinity ou fora do limite físico ±1e5 mm).');
  }
}

/**
 * Parser STL endurecido (Binário-Primeiro + ASCII linear sem backtracking):
 * - Rejeita arquivos > 25 MB, vazios (0 triângulos) ou > 500.000 triângulos
 * - Testa contrato binário exato ANTES de ASCII (evita falso positivo em headers binários com "solid")
 * - Valida finitude e limites físicos ±1e5 mm de todas as coordenadas
 */
export function parseSTLBuffer(buffer: ArrayBuffer): MeshData {
  if (buffer.byteLength === 0) {
    throw new Error('Arquivo STL vazio.');
  }
  if (buffer.byteLength > STL_LIMITS.MAX_FILE_BYTES) {
    throw new Error('Arquivo STL excede o limite de segurança de 25 MB.');
  }

  const dv = new DataView(buffer);
  let isBinary = false;
  let binaryTriCount = 0;

  if (buffer.byteLength >= 84) {
    binaryTriCount = dv.getUint32(80, true);
    if (84 + binaryTriCount * 50 === buffer.byteLength) {
      isBinary = true;
    }
  }

  if (isBinary) {
    if (binaryTriCount < 1) {
      throw new Error('Arquivo STL binário não contém triângulos.');
    }
    if (binaryTriCount > STL_LIMITS.MAX_TRIANGLES) {
      throw new Error(
        `Arquivo STL excede o limite máximo de ${STL_LIMITS.MAX_TRIANGLES.toLocaleString('pt-BR')} triângulos.`,
      );
    }

    const positions = new Float32Array(binaryTriCount * 9);
    const normals = new Float32Array(binaryTriCount * 9);
    let offset = 84;

    for (let i = 0; i < binaryTriCount; i++) {
      const nx = dv.getFloat32(offset, true);
      const ny = dv.getFloat32(offset + 4, true);
      const nz = dv.getFloat32(offset + 8, true);

      const base = i * 9;
      for (let v = 0; v < 3; v++) {
        const vx = dv.getFloat32(offset + 12 + v * 12, true);
        const vy = dv.getFloat32(offset + 16 + v * 12, true);
        const vz = dv.getFloat32(offset + 20 + v * 12, true);
        validateCoord(vx);
        validateCoord(vy);
        validateCoord(vz);

        positions[base + v * 3] = vx;
        positions[base + v * 3 + 1] = vy;
        positions[base + v * 3 + 2] = vz;

        normals[base + v * 3] = Number.isFinite(nx) ? nx : 0;
        normals[base + v * 3 + 1] = Number.isFinite(ny) ? ny : 0;
        normals[base + v * 3 + 2] = Number.isFinite(nz) ? nz : 1;
      }
      offset += 50;
    }

    return { positions, normals, triangleCount: binaryTriCount };
  }

  // Parser ASCII linear sem `.split()` massivo nem regex sujeita a backtracking
  const text = new TextDecoder('utf-8').decode(buffer);
  const coords: number[] = [];
  let cursor = 0;
  const len = text.length;

  while (cursor < len) {
    const idx = text.indexOf('vertex', cursor);
    if (idx === -1) break;
    // Confirma fronteira de palavra antes e depois de "vertex"
    const prevCh = idx > 0 ? text.charCodeAt(idx - 1) : 32;
    const nextCh = idx + 6 < len ? text.charCodeAt(idx + 6) : 0;
    if (prevCh > 32 || nextCh > 32) {
      cursor = idx + 6;
      continue;
    }
    let lineEnd = text.indexOf('\n', idx + 6);
    if (lineEnd === -1) lineEnd = len;
    const tail = text.slice(idx + 6, lineEnd).trim();
    const parts = tail.split(/\s+/);
    if (parts.length >= 3) {
      const vx = Number(parts[0]);
      const vy = Number(parts[1]);
      const vz = Number(parts[2]);
      validateCoord(vx);
      validateCoord(vy);
      validateCoord(vz);
      coords.push(vx, vy, vz);
      if (coords.length / 9 > STL_LIMITS.MAX_TRIANGLES) {
        throw new Error(
          `Arquivo STL ASCII excede o limite máximo de ${STL_LIMITS.MAX_TRIANGLES.toLocaleString('pt-BR')} triângulos.`,
        );
      }
    }
    cursor = lineEnd + 1;
  }

  const triCount = Math.floor(coords.length / 9);
  if (triCount < 1 || coords.length % 9 !== 0) {
    throw new Error('Arquivo STL inválido ou sem facetas triangulares completas.');
  }

  const positions = new Float32Array(coords);
  const normals = new Float32Array(triCount * 9);
  for (let i = 0; i < triCount; i++) {
    const base = i * 9;
    const ax = positions[base];
    const ay = positions[base + 1];
    const az = positions[base + 2];
    const bx = positions[base + 3] - ax;
    const by = positions[base + 4] - ay;
    const bz = positions[base + 5] - az;
    const cx = positions[base + 6] - ax;
    const cy = positions[base + 7] - ay;
    const cz = positions[base + 8] - az;
    const nx = by * cz - bz * cy;
    const ny = bz * cx - bx * cz;
    const nz = bx * cy - by * cx;
    const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    for (let v = 0; v < 3; v++) {
      normals[base + v * 3] = nx / nLen;
      normals[base + v * 3 + 1] = ny / nLen;
      normals[base + v * 3 + 2] = nz / nLen;
    }
  }

  return { positions, normals, triangleCount: triCount };
}

// ---------------------------------------------------------------------------
// Empacotador ZIP (Store sem compressão, CRC-32 IEEE 802.3 padrão, zero deps)
// ---------------------------------------------------------------------------
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

export interface ZipEntryInput {
  name: string;
  data: Uint8Array;
}

export function buildZipArchive(entries: ZipEntryInput[]): Uint8Array {
  const encoder = new TextEncoder();
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const data = entry.data;
    const crc = crc32(data);
    const size = data.length;

    // Local File Header (30 + nameBytes.length)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true); // PK\x03\x04
    lv.setUint16(4, 20, true); // version needed
    lv.setUint16(6, 0x0800, true); // UTF-8 filename flag
    lv.setUint16(8, 0, true); // method 0 = Store
    lv.setUint16(10, 0, true); // mod time
    lv.setUint16(12, 0x5421, true); // mod date
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    localChunks.push(localHeader, data);

    // Central Directory Header (46 + nameBytes.length)
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true); // PK\x01\x02
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x5421, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    centralChunks.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  const centralSize = centralChunks.reduce((acc, c) => acc + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); // PK\x05\x06
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const totalBytes = offset + centralSize + 22;
  const out = new Uint8Array(totalBytes);
  let ptr = 0;
  for (const chunk of localChunks) {
    out.set(chunk, ptr);
    ptr += chunk.length;
  }
  for (const chunk of centralChunks) {
    out.set(chunk, ptr);
    ptr += chunk.length;
  }
  out.set(eocd, ptr);
  return out;
}
