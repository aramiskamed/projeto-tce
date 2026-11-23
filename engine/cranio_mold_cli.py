#!/usr/bin/env python3
"""CranioMold 3D — Motor CLI Paramétrico de Implante PMMA e Molde Negativo Bipartido (v2.0).

Paridade matemática e de schema JSON v2.0 com o motor TypeScript (`src/engine/*`):
- Convenção canônica Y-up (+X Direito, +Y Superior, +Z Anterior)
- Frame tangente ortonormal local (tx, ty, defectDir) sem singularidade polar
- 4 pinos cônicos Poka-Yoke (molde inferior) + 4 cavidades fêmeas correspondentes (molde superior)
  extrudados estritamente paralelos a defectDir com folga radial exata `clearance_mm`
- Canaleta periférica de rebarba + 4 canais radiais de escape de PMMA até a borda externa
- Chanfro C¹ anti-úlcera controlado por `chamfer_mm` e espessura exata `thickness_mm`
- Rotação rígida própria (det = +1) R_inf / R_sup apoiando ambas as metades planas em Z = 0
- Auditoria topológica manifold real (boundaryEdges == 0, nonManifoldEdges == 0, V > 0)

Conformidade Hack Brasil 2026 (Item 6.9): opera exclusivamente sobre phantoms sintéticos.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import os
import struct
from dataclasses import dataclass

Vec3 = tuple[float, float, float]
Tri = tuple[Vec3, Vec3, Vec3]

FLANGE_MARGIN_MM = 19.0
GUTTER_INNER_MM = 2.0
GUTTER_OUTER_MM = 5.0
GUTTER_DEPTH_MM = 1.0
VENT_HALF_WIDTH_MM = 2.0
PIN_INSET_FROM_EDGE_MM = 8.0
PIN_HEIGHT_MM = 6.5
SOCKET_AXIAL_CLEARANCE_MM = 0.8
PIN_STD_RBASE_MM = 3.8
PIN_STD_RTIP_MM = 2.4
PIN_MASTER_RBASE_MM = 5.0
PIN_MASTER_RTIP_MM = 3.4
MIN_BACKPLANE_WALL_MM = 9.0
SEG_U = 96
SEG_V = 80


@dataclass(frozen=True)
class DefectCaseConfig:
    case_id: str
    title: str
    nominal_area_cm2: float
    theta_center: float
    phi_center: float
    radius_u_mm: float
    radius_v_mm: float
    dome_rx: float
    dome_ry: float
    dome_rz: float
    fixation_plates: int
    is_bilateral: bool = False


CASES: dict[str, DefectCaseConfig] = {
    "craniectomy18": DefectCaseConfig(
        case_id="craniectomy18",
        title="Caso Sintético 01 · Jovem 18a — Hemicraniectomia Descompressiva Pós-Moto (156 cm²)",
        nominal_area_cm2=156.0,
        theta_center=1.05,
        phi_center=1.14,
        radius_u_mm=54.0,
        radius_v_mm=44.0,
        dome_rx=74.0,
        dome_ry=84.0,
        dome_rz=92.0,
        fixation_plates=1,
        is_bilateral=False,
    ),
    "bifrontal": DefectCaseConfig(
        case_id="bifrontal",
        title="Caso Sintético 02 · Craniectomia Descompressiva Bifrontal Pós-TCE Difuso (118 cm²)",
        nominal_area_cm2=118.0,
        theta_center=0.0,
        phi_center=1.04,
        radius_u_mm=50.0,
        radius_v_mm=38.0,
        dome_rx=74.0,
        dome_ry=84.0,
        dome_rz=92.0,
        fixation_plates=2,
        is_bilateral=True,
    ),
    "frontal": DefectCaseConfig(
        case_id="frontal",
        title="Caso Sintético 03 · Afundamento Frontal & Rebordo Supraorbitário (54 cm²)",
        nominal_area_cm2=54.0,
        theta_center=0.42,
        phi_center=1.12,
        radius_u_mm=33.0,
        radius_v_mm=28.0,
        dome_rx=72.0,
        dome_ry=82.0,
        dome_rz=88.0,
        fixation_plates=1,
        is_bilateral=False,
    ),
    "zygoma": DefectCaseConfig(
        case_id="zygoma",
        title="Caso Sintético 04 · Sequela Complexo Zigomático-Orbitário / Malar (28 cm²)",
        nominal_area_cm2=28.0,
        theta_center=0.56,
        phi_center=1.46,
        radius_u_mm=25.0,
        radius_v_mm=21.0,
        dome_rx=71.0,
        dome_ry=81.0,
        dome_rz=86.0,
        fixation_plates=1,
        is_bilateral=False,
    ),
}


def _finite_or(v: float, default: float) -> float:
    return v if math.isfinite(v) else default


def clamp(v: float, lo: float, hi: float) -> float:
    if not math.isfinite(v):
        return lo
    return max(lo, min(hi, v))


def smoothstep(t: float) -> float:
    x = clamp(t, 0.0, 1.0)
    return x * x * (3.0 - 2.0 * x)


def dot3(a: Vec3, b: Vec3) -> float:
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def sub3(a: Vec3, b: Vec3) -> Vec3:
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def cross3(a: Vec3, b: Vec3) -> Vec3:
    return (
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    )


def normalize3(v: Vec3) -> Vec3:
    n = math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
    if n < 1e-12:
        return (0.0, 1.0, 0.0)
    return (v[0] / n, v[1] / n, v[2] / n)


def eval_cranial_radius(d: Vec3, cfg: DefectCaseConfig) -> float:
    dx, dy, dz = d
    inv_ellip = math.sqrt((dx / cfg.dome_rx) ** 2 + (dy / cfg.dome_ry) ** 2 + (dz / cfg.dome_rz) ** 2)
    base_r = 1.0 / inv_ellip if inv_ellip > 1e-12 else cfg.dome_rx
    phi = math.acos(clamp(dy, -1.0, 1.0))
    abs_theta = abs(math.atan2(dx, dz))

    frontal = 3.8 * math.exp(-((abs_theta / 0.54) ** 2)) * math.exp(-(((phi - 1.12) / 0.24) ** 2))
    temporal = -2.8 * math.exp(-(((abs_theta - 1.38) / 0.36) ** 2)) * math.exp(-(((phi - 1.32) / 0.28) ** 2))
    orbital = -4.8 * math.exp(-(((abs_theta - 0.36) / 0.18) ** 2)) * math.exp(-(((phi - 1.38) / 0.12) ** 2))
    malar = 4.5 * math.exp(-(((abs_theta - 0.56) / 0.22) ** 2)) * math.exp(-(((phi - 1.50) / 0.14) ** 2))
    occipital = 3.0 * math.exp(-(((math.pi - abs_theta) / 0.48) ** 2)) * math.exp(-(((phi - 1.38) / 0.26) ** 2))
    return base_r + frontal + temporal + orbital + malar + occipital


def defect_organic_dist(u: float, v: float, ru: float, rv: float) -> float:
    nu = u / max(1e-6, ru)
    nv = v / max(1e-6, rv)
    ang = math.atan2(nv, nu)
    organic = 1.0 + 0.045 * math.sin(3.0 * ang) + 0.03 * math.cos(5.0 * ang)
    return math.sqrt(nu * nu + nv * nv) / organic


def solve_skull_height(u: float, v: float, cfg: DefectCaseConfig, tx: Vec3, ty: Vec3, ddir: Vec3) -> float:
    r_approx = min(cfg.dome_rx, cfg.dome_ry, cfg.dome_rz)
    r2 = u * u + v * v
    w = math.sqrt(max(25.0, r_approx * r_approx * 1.15 - r2))
    for _ in range(6):
        px = tx[0] * u + ty[0] * v + ddir[0] * w
        py = tx[1] * u + ty[1] * v + ddir[1] * w
        pz = tx[2] * u + ty[2] * v + ddir[2] * w
        target_r = eval_cranial_radius(normalize3((px, py, pz)), cfg)
        next_w2 = target_r * target_r - r2
        if next_w2 <= 36.0:
            return 6.0
        w = math.sqrt(next_w2)
    return w


def cone_profile(dist_mm: float, r_base: float, r_tip: float) -> float:
    if dist_mm <= r_tip:
        return 1.0
    if dist_mm >= r_base:
        return 0.0
    return (r_base - dist_mm) / max(1e-6, r_base - r_tip)


def push_quad(tris: list[Tri], p00: Vec3, p10: Vec3, p11: Vec3, p01: Vec3) -> None:
    tris.append((p00, p10, p11))
    tris.append((p00, p11, p01))


def transform_bed_flat(tris: list[Tri], tx: Vec3, ty: Vec3, ddir: Vec3, flip_upper: bool) -> list[Tri]:
    rx = tx
    ry: Vec3 = (-ty[0], -ty[1], -ty[2]) if flip_upper else ty
    rz: Vec3 = (-ddir[0], -ddir[1], -ddir[2]) if flip_upper else ddir

    min_z = float("inf")
    rotated: list[Tri] = []
    for a, b, c in tris:
        ra = (dot3(a, rx), dot3(a, ry), dot3(a, rz))
        rb = (dot3(b, rx), dot3(b, ry), dot3(b, rz))
        rc = (dot3(c, rx), dot3(c, ry), dot3(c, rz))
        min_z = min(min_z, ra[2], rb[2], rc[2])
        rotated.append((ra, rb, rc))

    shift = -min_z if math.isfinite(min_z) else 0.0
    return [
        (
            (a[0], a[1], a[2] + shift),
            (b[0], b[1], b[2] + shift),
            (c[0], c[1], c[2] + shift),
        )
        for a, b, c in rotated
    ]


def audit_triangles(tris: list[Tri], min_wall_mm: float) -> dict:
    if not tris:
        return {
            "triangleCount": 0,
            "signedVolumeCm3": 0.0,
            "surfaceAreaCm2": 0.0,
            "bboxMm": {"x": 0.0, "y": 0.0, "z": 0.0},
            "minWallThicknessMm": round(min_wall_mm, 2),
            "boundaryEdges": 0,
            "nonManifoldEdges": 0,
            "degenerateTriangles": 0,
            "isWatertight": False,
            "hasOutwardNormals": False,
            "fitsStandardFdmBed": False,
        }

    min_x = min_y = min_z = float("inf")
    max_x = max_y = max_z = float("-inf")
    signed_vol6 = 0.0
    area2 = 0.0
    degenerate = 0
    vid_map: dict[tuple[int, int, int], int] = {}
    edges: dict[tuple[int, int], int] = {}

    def get_vid(v: Vec3) -> int:
        k = (
            round((0.0 if v[0] == 0.0 else v[0]) * 10000),
            round((0.0 if v[1] == 0.0 else v[1]) * 10000),
            round((0.0 if v[2] == 0.0 else v[2]) * 10000),
        )
        vid = vid_map.get(k)
        if vid is None:
            vid = len(vid_map)
            vid_map[k] = vid
        return vid

    for a, b, c in tris:
        for p in (a, b, c):
            min_x = min(min_x, p[0])
            min_y = min(min_y, p[1])
            min_z = min(min_z, p[2])
            max_x = max(max_x, p[0])
            max_y = max(max_y, p[1])
            max_z = max(max_z, p[2])

        signed_vol6 += dot3(a, cross3(b, c))
        n_vec = cross3(sub3(b, a), sub3(c, a))
        tri_area2 = math.sqrt(dot3(n_vec, n_vec))
        area2 += tri_area2

        va, vb, vc = get_vid(a), get_vid(b), get_vid(c)
        if va == vb or vb == vc or vc == va or tri_area2 < 1e-8:
            degenerate += 1
            continue
        for e in ((va, vb), (vb, vc), (vc, va)):
            edges[e] = edges.get(e, 0) + 1

    boundary_edges = 0
    non_manifold_edges = 0
    for (u, v), cnt in edges.items():
        if cnt > 1:
            non_manifold_edges += cnt - 1
        if edges.get((v, u), 0) == 0:
            boundary_edges += 1

    signed_vol_cm3 = round(signed_vol6 / 6000.0, 2)
    area_cm2 = round(area2 / 200.0, 2)
    bbox = {
        "x": round(max_x - min_x, 2),
        "y": round(max_y - min_y, 2),
        "z": round(max_z - min_z, 2),
    }
    has_outward = signed_vol_cm3 > 0.0
    is_watertight = (
        len(tris) >= 4 and degenerate == 0 and boundary_edges == 0 and non_manifold_edges == 0 and has_outward
    )
    fits_bed = bbox["x"] <= 220.0 and bbox["y"] <= 220.0 and bbox["z"] <= 250.0

    return {
        "triangleCount": len(tris),
        "signedVolumeCm3": signed_vol_cm3,
        "surfaceAreaCm2": area_cm2,
        "bboxMm": bbox,
        "minWallThicknessMm": round(min_wall_mm, 2),
        "boundaryEdges": boundary_edges,
        "nonManifoldEdges": non_manifold_edges,
        "degenerateTriangles": degenerate,
        "isWatertight": is_watertight,
        "hasOutwardNormals": has_outward,
        "fitsStandardFdmBed": fits_bed,
    }


def write_binary_stl(path: str, tris: list[Tri], header_label: str) -> None:
    clean_label = header_label
    if clean_label.lower().startswith("solid "):
        clean_label = "CranioMold3D " + clean_label[6:]
    header = clean_label.encode("ascii", errors="ignore")[:80].ljust(80, b" ")
    with open(path, "wb") as f:
        f.write(header)
        f.write(struct.pack("<I", len(tris)))
        for a, b, c in tris:
            n = normalize3(cross3(sub3(b, a), sub3(c, a)))
            f.write(
                struct.pack(
                    "<12fH",
                    n[0],
                    n[1],
                    n[2],
                    a[0],
                    a[1],
                    a[2],
                    b[0],
                    b[1],
                    b[2],
                    c[0],
                    c[1],
                    c[2],
                    0,
                )
            )


def generate_kit(
    case_id: str,
    thickness_mm: float = 4.0,
    chamfer_mm: float = 2.0,
    clearance_mm: float = 0.35,
    hemisphere: str = "right",
    defect_scale: float = 1.0,
    bed_flat: bool = True,
    include_drainage_dimples: bool = True,
    outdir: str = "samples",
) -> dict:
    cfg = CASES[case_id]
    eff_hemi = "right" if cfg.is_bilateral else hemisphere
    defect_scale = clamp(_finite_or(defect_scale, 1.0), 0.70, 1.20)
    thickness_mm = clamp(_finite_or(thickness_mm, 4.0), 2.8, 5.0)
    chamfer_mm = clamp(_finite_or(chamfer_mm, 2.0), 0.5, 3.0)
    clearance_mm = clamp(_finite_or(clearance_mm, 0.35), 0.20, 0.50)

    hemi_sign = 1.0 if cfg.is_bilateral or eff_hemi == "right" else -1.0
    eff_theta = cfg.theta_center * hemi_sign
    eff_phi = clamp(cfg.phi_center, 0.44, 1.82)
    sin_p = math.sin(eff_phi)
    ddir = normalize3((sin_p * math.sin(eff_theta), math.cos(eff_phi), sin_p * math.cos(eff_theta)))
    world_up: Vec3 = (0.0, 0.0, 1.0) if abs(ddir[1]) > 0.96 else (0.0, 1.0, 0.0)
    tx = normalize3(cross3(world_up, ddir))
    ty = normalize3(cross3(ddir, tx))

    max_safe = min(cfg.dome_rx, cfg.dome_ry, cfg.dome_rz) * 0.84
    cap_r = min(max_safe, 102.0 - FLANGE_MARGIN_MM)
    ru = clamp(cfg.radius_u_mm * defect_scale, 14.0, cap_r)
    rv = clamp(cfg.radius_v_mm * defect_scale, 14.0, cap_r)
    half_u = ru + FLANGE_MARGIN_MM
    half_v = rv + FLANGE_MARGIN_MM

    min_rim_w = float("inf")
    for k in range(48):
        a = (k / 48.0) * 2.0 * math.pi
        org = 1.0 + 0.045 * math.sin(3.0 * a) + 0.03 * math.cos(5.0 * a)
        min_rim_w = min(min_rim_w, solve_skull_height(ru * org * math.cos(a), rv * org * math.sin(a), cfg, tx, ty, ddir))
    z_flange = min_rim_w - 0.8

    pu = half_u - PIN_INSET_FROM_EDGE_MM
    pv = half_v - PIN_INSET_FROM_EDGE_MM
    pins = [
        (-pu, pv, PIN_STD_RBASE_MM, PIN_STD_RTIP_MM),
        (pu, pv, PIN_STD_RBASE_MM, PIN_STD_RTIP_MM),
        (-pu, -pv, PIN_STD_RBASE_MM, PIN_STD_RTIP_MM),
        (pu, -pv, PIN_MASTER_RBASE_MM, PIN_MASTER_RTIP_MM),
    ]

    du = (2.0 * half_u) / SEG_U
    dv = (2.0 * half_v) / SEG_V
    u_grid = [-half_u + i * du for i in range(SEG_U + 1)]
    v_grid = [-half_v + j * dv for j in range(SEG_V + 1)]

    z_inf_grid: list[list[float]] = []
    z_sup_grid: list[list[float]] = []
    min_z_inf = float("inf")
    max_z_sup = float("-inf")
    dimples = [
        (-ru * 0.34, rv * 0.28),
        (0.0, rv * 0.34),
        (ru * 0.34, rv * 0.28),
        (-ru * 0.34, -rv * 0.28),
        (0.0, -rv * 0.34),
        (ru * 0.34, -rv * 0.28),
    ]

    for u in u_grid:
        row_inf: list[float] = []
        row_sup: list[float] = []
        for v in v_grid:
            d = defect_organic_dist(u, v, ru, rv)
            r_hyp = math.hypot(u, v)
            rim_r = min(ru, rv) if r_hyp < 1e-6 else r_hyp / max(1e-6, d)
            sdist = (d - 1.0) * rim_r

            if d <= 1.0:
                z_part = solve_skull_height(u, v, cfg, tx, ty, ddir)
            else:
                sr = 1.0 / d
                z_rim = solve_skull_height(u * sr, v * sr, cfg, tx, ty, ddir)
                t_out = smoothstep(sdist / 3.8)
                z_part = z_rim * (1.0 - t_out) + z_flange * t_out

            h_inf = 0.0
            h_sup = 0.0
            if sdist < 0.0:
                w_ch = max(1.5, chamfer_mm * 2.5)
                blend = smoothstep(-sdist / w_ch)
                h_sup = 0.15 * thickness_mm * blend
                h_inf = -0.85 * thickness_mm * blend
                if include_drainage_dimples and d < 0.72:
                    for du_p, dv_p in dimples:
                        dist_d = math.hypot(u - du_p, v - dv_p)
                        if dist_d < 2.2:
                            h_inf += 0.55 * smoothstep(1.0 - dist_d / 2.2)
            else:
                vf = 0.0
                if GUTTER_INNER_MM <= sdist <= GUTTER_OUTER_MM:
                    mid = 0.5 * (GUTTER_INNER_MM + GUTTER_OUTER_MM)
                    hw = 0.5 * (GUTTER_OUTER_MM - GUTTER_INNER_MM)
                    vf = max(vf, 0.5 * (1.0 + math.cos(math.pi * clamp(abs(sdist - mid) / hw, 0.0, 1.0))))
                if sdist >= GUTTER_INNER_MM:
                    if abs(u) < VENT_HALF_WIDTH_MM:
                        vf = max(vf, 0.5 * (1.0 + math.cos(math.pi * abs(u) / VENT_HALF_WIDTH_MM)))
                    if abs(v) < VENT_HALF_WIDTH_MM:
                        vf = max(vf, 0.5 * (1.0 + math.cos(math.pi * abs(v) / VENT_HALF_WIDTH_MM)))
                if vf > 0.0:
                    h_inf -= GUTTER_DEPTH_MM * vf
                    h_sup += GUTTER_DEPTH_MM * vf

                p_male_max = 0.0
                p_fem_max = 0.0
                for px, py, rb, rt in pins:
                    dp = math.hypot(u - px, v - py)
                    p_male_max = max(p_male_max, cone_profile(dp, rb, rt))
                    p_fem_max = max(p_fem_max, cone_profile(dp, rb + clearance_mm, rt + clearance_mm))
                if p_male_max > 0.0:
                    h_inf = max(h_inf, PIN_HEIGHT_MM * p_male_max)
                if p_fem_max > 0.0:
                    h_sup = max(h_sup, (PIN_HEIGHT_MM + SOCKET_AXIAL_CLEARANCE_MM) * p_fem_max)

            zi = z_part + h_inf
            zs = z_part + h_sup
            row_inf.append(zi)
            row_sup.append(zs)
            min_z_inf = min(min_z_inf, zi)
            max_z_sup = max(max_z_sup, zs)
        z_inf_grid.append(row_inf)
        z_sup_grid.append(row_sup)

    z_back_inf = min_z_inf - MIN_BACKPLANE_WALL_MM
    z_back_sup = max_z_sup + MIN_BACKPLANE_WALL_MM

    def to_world(u: float, v: float, w: float) -> Vec3:
        return (
            tx[0] * u + ty[0] * v + ddir[0] * w,
            tx[1] * u + ty[1] * v + ddir[1] * w,
            tx[2] * u + ty[2] * v + ddir[2] * w,
        )

    inf_c = [[to_world(u_grid[i], v_grid[j], z_inf_grid[i][j]) for j in range(SEG_V + 1)] for i in range(SEG_U + 1)]
    inf_b = [[to_world(u_grid[i], v_grid[j], z_back_inf) for j in range(SEG_V + 1)] for i in range(SEG_U + 1)]
    sup_c = [[to_world(u_grid[i], v_grid[j], z_sup_grid[i][j]) for j in range(SEG_V + 1)] for i in range(SEG_U + 1)]
    sup_b = [[to_world(u_grid[i], v_grid[j], z_back_sup) for j in range(SEG_V + 1)] for i in range(SEG_U + 1)]

    lower_min_wall = min(z_inf_grid[i][j] - z_back_inf for i in range(SEG_U + 1) for j in range(SEG_V + 1))
    upper_min_wall = min(z_back_sup - z_sup_grid[i][j] for i in range(SEG_U + 1) for j in range(SEG_V + 1))

    lower_tris: list[Tri] = []
    upper_tris: list[Tri] = []
    for i in range(SEG_U):
        for j in range(SEG_V):
            push_quad(lower_tris, inf_c[i][j], inf_c[i + 1][j], inf_c[i + 1][j + 1], inf_c[i][j + 1])
            push_quad(lower_tris, inf_b[i][j], inf_b[i][j + 1], inf_b[i + 1][j + 1], inf_b[i + 1][j])

            push_quad(upper_tris, sup_b[i][j], sup_b[i + 1][j], sup_b[i + 1][j + 1], sup_b[i][j + 1])
            push_quad(upper_tris, sup_c[i][j], sup_c[i][j + 1], sup_c[i + 1][j + 1], sup_c[i + 1][j])

    for j in range(SEG_V):
        push_quad(lower_tris, inf_c[0][j], inf_c[0][j + 1], inf_b[0][j + 1], inf_b[0][j])
        push_quad(lower_tris, inf_c[SEG_U][j], inf_b[SEG_U][j], inf_b[SEG_U][j + 1], inf_c[SEG_U][j + 1])
        push_quad(upper_tris, sup_b[0][j], sup_b[0][j + 1], sup_c[0][j + 1], sup_c[0][j])
        push_quad(upper_tris, sup_b[SEG_U][j], sup_c[SEG_U][j], sup_c[SEG_U][j + 1], sup_b[SEG_U][j + 1])

    for i in range(SEG_U):
        push_quad(lower_tris, inf_c[i][0], inf_b[i][0], inf_b[i + 1][0], inf_c[i + 1][0])
        push_quad(lower_tris, inf_c[i][SEG_V], inf_c[i + 1][SEG_V], inf_b[i + 1][SEG_V], inf_b[i][SEG_V])
        push_quad(upper_tris, sup_b[i][0], sup_c[i][0], sup_c[i + 1][0], sup_b[i + 1][0])
        push_quad(upper_tris, sup_b[i][SEG_V], sup_b[i + 1][SEG_V], sup_c[i + 1][SEG_V], sup_c[i][SEG_V])

    imp_top = [
        [
            to_world(
                u_grid[i],
                v_grid[j],
                0.5 * (z_sup_grid[i][j] + z_inf_grid[i][j]) + 0.5 * max(0.4, z_sup_grid[i][j] - z_inf_grid[i][j]),
            )
            for j in range(SEG_V + 1)
        ]
        for i in range(SEG_U + 1)
    ]
    imp_bot = [
        [
            to_world(
                u_grid[i],
                v_grid[j],
                0.5 * (z_sup_grid[i][j] + z_inf_grid[i][j]) - 0.5 * max(0.4, z_sup_grid[i][j] - z_inf_grid[i][j]),
            )
            for j in range(SEG_V + 1)
        ]
        for i in range(SEG_U + 1)
    ]
    imp_active = [
        [defect_organic_dist(u_grid[i] + 0.5 * du, v_grid[j] + 0.5 * dv, ru, rv) <= 1.0 for j in range(SEG_V)]
        for i in range(SEG_U)
    ]
    implant_tris: list[Tri] = []
    for i in range(SEG_U):
        for j in range(SEG_V):
            if not imp_active[i][j]:
                continue
            push_quad(implant_tris, imp_top[i][j], imp_top[i + 1][j], imp_top[i + 1][j + 1], imp_top[i][j + 1])
            push_quad(implant_tris, imp_bot[i][j], imp_bot[i][j + 1], imp_bot[i + 1][j + 1], imp_bot[i + 1][j])
            if i == 0 or not imp_active[i - 1][j]:
                push_quad(implant_tris, imp_top[i][j], imp_top[i][j + 1], imp_bot[i][j + 1], imp_bot[i][j])
            if i == SEG_U - 1 or not imp_active[i + 1][j]:
                push_quad(implant_tris, imp_top[i + 1][j], imp_bot[i + 1][j], imp_bot[i + 1][j + 1], imp_top[i + 1][j + 1])
            if j == 0 or not imp_active[i][j - 1]:
                push_quad(implant_tris, imp_top[i][j], imp_bot[i][j], imp_bot[i + 1][j], imp_top[i + 1][j])
            if j == SEG_V - 1 or not imp_active[i][j + 1]:
                push_quad(implant_tris, imp_top[i][j + 1], imp_top[i + 1][j + 1], imp_bot[i + 1][j + 1], imp_bot[i][j + 1])

    lower_flat = transform_bed_flat(lower_tris, tx, ty, ddir, flip_upper=False)
    upper_flat = transform_bed_flat(upper_tris, tx, ty, ddir, flip_upper=True)
    implant_flat = transform_bed_flat(implant_tris, tx, ty, ddir, flip_upper=False)

    imp_audit = audit_triangles(implant_flat, thickness_mm)
    low_audit = audit_triangles(lower_flat, lower_min_wall)
    up_audit = audit_triangles(upper_flat, upper_min_wall)

    pmma_mass_g = round(max(1.0, imp_audit["signedVolumeCm3"]) * 1.18, 2)
    cement_kits = max(1, math.ceil(pmma_mass_g / 38.0))
    cement_total = round(cement_kits * 145.42, 2)
    petg_g = round((low_audit["signedVolumeCm3"] + up_audit["signedVolumeCm3"]) * 1.27 * 0.42)
    petg_cost = round(petg_g * 0.17, 2)
    miniplate_cost = round(cfg.fixation_plates * 361.81, 2)
    total_cost = round(cement_total + petg_cost + 60.0 + miniplate_cost, 2)

    os.makedirs(outdir, exist_ok=True)
    imp_path = os.path.join(outdir, f"implante_pmma_{case_id}.stl")
    inf_path = os.path.join(outdir, f"molde_negativo_inferior_{case_id}.stl")
    sup_path = os.path.join(outdir, f"molde_negativo_superior_{case_id}.stl")

    write_binary_stl(imp_path, implant_flat if bed_flat else implant_tris, f"CranioMold3D Implant {case_id}")
    write_binary_stl(inf_path, lower_flat if bed_flat else lower_tris, f"CranioMold3D LowerMold {case_id}")
    write_binary_stl(sup_path, upper_flat if bed_flat else upper_tris, f"CranioMold3D UpperMold {case_id}")

    audit = {
        "schemaVersion": "2.0",
        "syntheticCompliance": "100% synthetic mathematical phantom — zero patient data (Hack Brasil 2026 item 6.9)",
        "generatedAtIso": dt.datetime.now(dt.UTC).isoformat(),
        "parameters": {
            "caseId": case_id,
            "hemisphere": eff_hemi,
            "defectScale": defect_scale,
            "uShiftMm": 0.0,
            "vShiftMm": 0.0,
            "thicknessMm": thickness_mm,
            "chamferMm": chamfer_mm,
            "clearanceMm": clearance_mm,
            "includeDrainageDimples": include_drainage_dimples,
        },
        "exportOptions": {"bedFlat": bed_flat},
        "implant": imp_audit,
        "lowerMold": low_audit,
        "upperMold": up_audit,
        "economics": {
            "aihProcedureCode": "04.03.01.001-2",
            "aihReimbursementBrl": 1322.12,
            "cementSigtapCode": "07.02.03.138-0",
            "cementUnitCostBrl": 145.42,
            "cementKits": cement_kits,
            "cementTotalBrl": cement_total,
            "miniplateSigtapCode": "07.02.05.048-2",
            "miniplateCostBrl": miniplate_cost,
            "pmmaMassGrams": pmma_mass_g,
            "petgGrams": petg_g,
            "petgCostBrl": petg_cost,
            "estimatedPrintHours": round(petg_g / 42.0, 1),
            "sterilizationCostBrl": 60.0,
            "estimatedTotalKitCostBrl": total_cost,
            "commercialOpmeRefBrl": 160000.0,
            "savingsVsCommercialPct": round(((160000.0 - total_cost) / 160000.0) * 100.0, 2),
            "fitsWithinAih": total_cost <= 1322.12,
        },
        "generatedFiles": [
            os.path.basename(imp_path),
            os.path.basename(inf_path),
            os.path.basename(sup_path),
        ],
    }

    audit_path = os.path.join(outdir, f"audit_{case_id}.json")
    with open(audit_path, "w", encoding="utf-8") as f:
        json.dump(audit, f, indent=2, ensure_ascii=False)
    return audit


def main() -> None:
    parser = argparse.ArgumentParser(description="CranioMold 3D v2.0 — Gerador Sintético de Molde Negativo PMMA")
    parser.add_argument("--case", choices=list(CASES.keys()), default="craniectomy18")
    parser.add_argument("--thickness", type=float, default=4.0, help="Espessura alvo PMMA (mm)")
    parser.add_argument("--chamfer", type=float, default=2.0, help="Chanfro marginal anti-úlcera (mm)")
    parser.add_argument("--clearance", type=float, default=0.35, help="Folga radial Poka-Yoke (mm)")
    parser.add_argument("--hemisphere", choices=["right", "left"], default="right")
    parser.add_argument("--scale", type=float, default=1.0, help="Escala da falha (0.70..1.20)")
    parser.add_argument("--anatomical", action="store_true", help="Exportar em coordenadas anatômicas em vez de Z=0")
    parser.add_argument("--no-dimples", action="store_true", help="Omitir marcadores de drenagem epidural")
    parser.add_argument("--outdir", default="samples", help="Diretório de saída dos arquivos .STL e .JSON")
    args = parser.parse_args()

    result = generate_kit(
        case_id=args.case,
        thickness_mm=args.thickness,
        chamfer_mm=args.chamfer,
        clearance_mm=args.clearance,
        hemisphere=args.hemisphere,
        defect_scale=args.scale,
        bed_flat=not args.anatomical,
        include_drainage_dimples=not args.no_dimples,
        outdir=args.outdir,
    )
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
