from __future__ import annotations

import json
import struct
from pathlib import Path

from engine.cranio_mold_cli import CASES, generate_kit


def _read_stl_min_z(path: Path) -> tuple[int, float]:
    raw = path.read_bytes()
    tri_count = struct.unpack_from("<I", raw, 80)[0]
    assert len(raw) == 84 + tri_count * 50
    min_z = float("inf")
    offset = 84
    for _ in range(tri_count):
        for v in range(3):
            z = struct.unpack_from("<f", raw, offset + 12 + v * 12 + 8)[0]
            min_z = min(min_z, z)
        offset += 50
    return tri_count, min_z


def test_generate_kit_all_cases_watertight_and_bed_flat(tmp_path: Path) -> None:
    for case_id in CASES:
        audit = generate_kit(case_id=case_id, outdir=str(tmp_path))
        assert audit["schemaVersion"] == "2.0"
        assert audit["exportOptions"]["bedFlat"] is True

        for key in ("implant", "lowerMold", "upperMold"):
            m = audit[key]
            assert m["isWatertight"] is True, f"{case_id}.{key} not watertight: {m}"
            assert m["boundaryEdges"] == 0
            assert m["nonManifoldEdges"] == 0
            assert m["hasOutwardNormals"] is True
            assert m["signedVolumeCm3"] > 0
            assert m["fitsStandardFdmBed"] is True

        assert audit["lowerMold"]["minWallThicknessMm"] >= 8.0
        assert audit["upperMold"]["minWallThicknessMm"] >= 8.0
        assert audit["economics"]["fitsWithinAih"] is True
        assert audit["economics"]["savingsVsCommercialPct"] > 99.0

        for fname in audit["generatedFiles"]:
            tri_count, min_z = _read_stl_min_z(tmp_path / fname)
            assert tri_count > 100
            assert abs(min_z) < 0.01

        saved_json = json.loads((tmp_path / f"audit_{case_id}.json").read_text(encoding="utf-8"))
        assert saved_json["schemaVersion"] == "2.0"
        assert saved_json["parameters"]["caseId"] == case_id


def test_bifrontal_locks_hemisphere_and_supports_anatomical_mode(tmp_path: Path) -> None:
    audit = generate_kit(
        case_id="bifrontal",
        hemisphere="left",
        defect_scale=1.15,
        bed_flat=False,
        include_drainage_dimples=False,
        outdir=str(tmp_path),
    )
    assert audit["parameters"]["hemisphere"] == "right"
    assert audit["exportOptions"]["bedFlat"] is False
    assert audit["lowerMold"]["isWatertight"] is True
    assert audit["upperMold"]["isWatertight"] is True


def test_non_finite_parameters_are_sanitized(tmp_path: Path) -> None:
    audit = generate_kit(
        case_id="zygoma",
        thickness_mm=float("nan"),
        chamfer_mm=float("inf"),
        clearance_mm=float("-inf"),
        defect_scale=float("nan"),
        outdir=str(tmp_path),
    )
    assert audit["parameters"]["thicknessMm"] == 4.0
    assert audit["parameters"]["chamferMm"] == 2.0
    assert audit["parameters"]["clearanceMm"] == 0.35
    assert audit["parameters"]["defectScale"] == 1.0
    assert audit["lowerMold"]["isWatertight"] is True
    assert audit["upperMold"]["isWatertight"] is True
