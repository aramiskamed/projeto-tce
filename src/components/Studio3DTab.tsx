import { ChangeEvent, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileArchive,
  Layers,
  Play,
  Pause,
  Printer,
  Scissors,
  Sliders,
  Upload,
  AlertTriangle,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  CASE_ORDER,
  CaseId,
  ClipAxis,
  DEFAULT_MOLD_PARAMS,
  ExportOptions,
  MoldParameters,
  SYNTHETIC_CASES,
} from '../data/syntheticCases';
import {
  SurgicalKitAudit,
  buildPrintProtocolText,
  calculateSusEconomics,
  formatBRL,
} from '../engine/economics';
import { MeshTopologyAudit, auditMeshTopology } from '../engine/meshAudit';
import { MeshData, generateSurgicalKit } from '../engine/meshBuilder';
import { STL_LIMITS, buildZipArchive, encodeBinarySTL, parseSTLBuffer } from '../engine/stlCodec';
import { PrintProtocolModal } from './PrintProtocolModal';
import { CameraPreset, ThreeViewport } from './ThreeViewport';

interface Studio3DTabProps {
  initialStage: 1 | 2 | 3 | 4;
  initialTitaniumMode: boolean;
  onNotify: (msg: string) => void;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}

export function Studio3DTab({
  initialStage,
  initialTitaniumMode,
  onNotify,
}: Studio3DTabProps) {
  const [params, setParams] = useState<MoldParameters>(DEFAULT_MOLD_PARAMS);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({ bedFlat: true });
  const [pipelineStage, setPipelineStage] = useState<1 | 2 | 3 | 4>(initialStage);
  const [explodePct, setExplodePct] = useState(55);
  const [animating, setAnimating] = useState(false);
  const [titaniumFailureMode, setTitaniumFailureMode] = useState(initialTitaniumMode);
  const [wireframe, setWireframe] = useState(false);
  const [clipAxis, setClipAxis] = useState<ClipAxis>('none');
  const [clipOffsetMm, setClipOffsetMm] = useState(25);
  const [camReq, setCamReq] = useState<{ preset: CameraPreset; seq: number }>({
    preset: 'default',
    seq: 0,
  });
  const [protocolOpen, setProtocolOpen] = useState(false);

  // Estado opcional de STL importado localmente
  const [importedStl, setImportedStl] = useState<{
    filename: string;
    mesh: MeshData;
    audit: MeshTopologyAudit;
  } | null>(null);
  const [mirrorImported, setMirrorImported] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Gera malhas e auditoria topológica real com memoização determinística
  const { kit, audit } = useMemo(() => {
    const generated = generateSurgicalKit(params);
    const implantAudit = auditMeshTopology(generated.implantBedFlat, generated.params.thicknessMm);
    const lowerAudit = auditMeshTopology(generated.lowerMoldBedFlat, generated.lowerMinWallMm);
    const upperAudit = auditMeshTopology(generated.upperMoldBedFlat, generated.upperMinWallMm);
    const economics = calculateSusEconomics({
      implantVolumeCm3: implantAudit.signedVolumeCm3,
      lowerMoldVolumeCm3: lowerAudit.signedVolumeCm3,
      upperMoldVolumeCm3: upperAudit.signedVolumeCm3,
      fixationPlates: generated.cfg.fixationPlates,
    });

    const fullAudit: SurgicalKitAudit = {
      schemaVersion: '2.0',
      syntheticCompliance:
        '100% synthetic mathematical phantom — zero patient data (Hack Brasil 2026 item 6.9)',
      generatedAtIso: new Date().toISOString(),
      parameters: generated.params,
      exportOptions,
      implant: implantAudit,
      lowerMold: lowerAudit,
      upperMold: upperAudit,
      economics,
    };
    return { kit: generated, audit: fullAudit };
  }, [params, exportOptions]);

  const activeCfg = SYNTHETIC_CASES[params.caseId];
  const allWatertight =
    audit.implant.isWatertight && audit.lowerMold.isWatertight && audit.upperMold.isWatertight;
  const fitsFdm = audit.lowerMold.fitsStandardFdmBed && audit.upperMold.fitsStandardFdmBed;
  const wallSafe =
    audit.lowerMold.minWallThicknessMm >= 8.0 && audit.upperMold.minWallThicknessMm >= 8.0;

  const hudLabel = importedStl
    ? `Malha .STL Sintética Importada: ${importedStl.filename}`
    : titaniumFailureMode
      ? 'Comparativo Ato 03: Placa de Titânio Não Prototipada (Pontos Vermelhos de Úlcera)'
      : pipelineStage === 1
        ? 'Etapa 1: TC Fase Óssea — Casca Craniana Fechada com Falha Cortical'
        : pipelineStage === 2
          ? activeCfg.isBilateral
            ? 'Etapa 2: Reconstrução por Superfície Paramétrica Simétrica Bilateral (Bifrontal)'
            : 'Etapa 2: Plano Sagital Mediano & Espelhamento Anatômico Contralateral'
          : pipelineStage === 3
            ? 'Etapa 3: Molde Negativo Bipartido (4 Pinos/Encaixes Poka-Yoke + Canais de Escape)'
            : 'Etapa 4 · Kit Completo: Molde PETG + Implante PMMA Chanfrado + Crânio Sintético';

  const requestCam = (preset: CameraPreset) => {
    setCamReq((prev) => ({ preset, seq: prev.seq + 1 }));
  };

  const handleExportBinaryStl = (kind: 'lower' | 'upper' | 'implant') => {
    const suffix = exportOptions.bedFlat ? 'mesa_z0' : 'anatomico';
    const mesh =
      kind === 'lower'
        ? exportOptions.bedFlat
          ? kit.lowerMoldBedFlat
          : kit.lowerMold
        : kind === 'upper'
          ? exportOptions.bedFlat
            ? kit.upperMoldBedFlat
            : kit.upperMold
          : exportOptions.bedFlat
            ? kit.implantBedFlat
            : kit.implant;

    const label = `CranioMold3D ${kind} ${params.caseId}`;
    const filename =
      kind === 'lower'
        ? `molde_negativo_inferior_${params.caseId}_${suffix}.stl`
        : kind === 'upper'
          ? `molde_negativo_superior_${params.caseId}_${suffix}.stl`
          : `implante_positivo_pmma_${params.caseId}_${suffix}.stl`;

    const bytes = encodeBinarySTL(mesh, label);
    triggerDownload(new Blob([bytes as unknown as BlobPart], { type: 'application/octet-stream' }), filename);
    onNotify(`Binary STL ${filename} exportado (${mesh.triangleCount.toLocaleString('pt-BR')} tris).`);
  };

  const handleExportAuditJson = () => {
    const json = JSON.stringify(audit, null, 2);
    triggerDownload(
      new Blob([json], { type: 'application/json;charset=utf-8' }),
      `laudo_auditoria_${params.caseId}.json`,
    );
    onNotify('Laudo de auditoria técnica (schema v2.0 JSON) exportado.');
  };

  const handleExportProtocolTxt = () => {
    const txt = buildPrintProtocolText(audit);
    triggerDownload(
      new Blob([txt], { type: 'text/plain;charset=utf-8' }),
      `protocolo_impressao_petg_${params.caseId}.txt`,
    );
    onNotify('Protocolo de impressão PETG e esterilização exportado.');
  };

  const handleExportFullZip = () => {
    const enc = new TextEncoder();
    const lowMesh = exportOptions.bedFlat ? kit.lowerMoldBedFlat : kit.lowerMold;
    const upMesh = exportOptions.bedFlat ? kit.upperMoldBedFlat : kit.upperMold;
    const impMesh = exportOptions.bedFlat ? kit.implantBedFlat : kit.implant;

    const zipBytes = buildZipArchive([
      {
        name: `molde_negativo_inferior_${params.caseId}.stl`,
        data: encodeBinarySTL(lowMesh, `CranioMold3D LowerMold ${params.caseId}`),
      },
      {
        name: `molde_negativo_superior_${params.caseId}.stl`,
        data: encodeBinarySTL(upMesh, `CranioMold3D UpperMold ${params.caseId}`),
      },
      {
        name: `implante_positivo_pmma_${params.caseId}.stl`,
        data: encodeBinarySTL(impMesh, `CranioMold3D Implant ${params.caseId}`),
      },
      {
        name: `laudo_auditoria_${params.caseId}.json`,
        data: enc.encode(JSON.stringify(audit, null, 2)),
      },
      {
        name: `protocolo_impressao_petg_${params.caseId}.txt`,
        data: enc.encode(buildPrintProtocolText(audit)),
      },
    ]);
    const zipName = `kit_cirurgico_craniomold_${params.caseId}.zip`;
    triggerDownload(new Blob([zipBytes as unknown as BlobPart], { type: 'application/zip' }), zipName);
    onNotify(`Kit cirúrgico completo ${zipName} exportado com 3 STLs binários + laudo + protocolo.`);
  };

  const handleStlUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportError(null);
    if (file.size === 0) {
      const msg = 'Arquivo STL vazio.';
      setImportError(msg);
      onNotify(msg);
      return;
    }
    if (file.size > STL_LIMITS.MAX_FILE_BYTES) {
      const msg = 'Arquivo STL excede o limite de segurança de 25 MB.';
      setImportError(msg);
      onNotify(msg);
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => {
      const msg = 'Não foi possível ler o arquivo .STL selecionado.';
      setImportError(msg);
      onNotify(msg);
    };
    reader.onload = () => {
      try {
        const buf = reader.result;
        if (!(buf instanceof ArrayBuffer)) throw new Error('Leitura inválida.');
        const mesh = parseSTLBuffer(buf);
        const meshAudit = auditMeshTopology(mesh, 0);
        setAnimating(false);
        setImportedStl({ filename: file.name, mesh, audit: meshAudit });
        setMirrorImported(false);
        onNotify(`Malha sintética ${file.name} carregada localmente (${mesh.triangleCount} tris).`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Falha ao ler arquivo .STL.';
        setImportError(msg);
        onNotify(msg);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const totalTris =
    audit.implant.triangleCount + audit.lowerMold.triangleCount + audit.upperMold.triangleCount;

  return (
    <section className="flex-1 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* TOP HEADER & CASE SELECTOR */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-xs font-mono-tech font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                STUDIO CAD/CAM 3D · PHANTOM SINTÉTICO
              </span>
              <span className="text-xs text-slate-400">
                Processamento 100% client-side · Zero dados reais de pacientes
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-bold text-white mt-1">{activeCfg.title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{activeCfg.clinicalSummary}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <select
              id="studio-case-select"
              aria-label="Selecionar caso anatômico sintético"
              value={params.caseId}
              onChange={(e) => {
                setImportedStl(null);
                setImportError(null);
                setTitaniumFailureMode(false);
                const nextId = e.target.value as CaseId;
                const isBilat = SYNTHETIC_CASES[nextId].isBilateral;
                setParams((prev) => ({
                  ...prev,
                  caseId: nextId,
                  hemisphere: isBilat ? 'right' : prev.hemisphere,
                  uShiftMm: isBilat ? 0 : prev.uShiftMm,
                }));
              }}
              className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs sm:text-sm font-medium text-white max-w-xs"
            >
              {CASE_ORDER.map((cid) => (
                <option key={cid} value={cid}>
                  {SYNTHETIC_CASES[cid].shortLabel}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setProtocolOpen(true)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Protocolo PETG/ETO</span>
            </button>

            <label
              htmlFor="stl-upload-input"
              className="cursor-pointer px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition inline-flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importar .STL</span>
            </label>
            <input
              id="stl-upload-input"
              type="file"
              accept=".stl"
              onChange={handleStlUpload}
              className="hidden"
            />
          </div>
        </div>

        {importError && (
          <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 text-xs text-rose-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{importError}</span>
            </div>
            <button
              type="button"
              onClick={() => setImportError(null)}
              aria-label="Dispensar alerta de importação"
              className="p-1 rounded-md text-rose-300 hover:text-white hover:bg-rose-900/60 transition cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 4-STAGE PIPELINE STEPPER */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[
            { id: 1 as const, tag: 'ETAPA 01', label: '1. TC Fase Óssea (Falha)', color: 'text-slate-400' },
            {
              id: 2 as const,
              tag: 'ETAPA 02',
              label: activeCfg.isBilateral
                ? '2. Reconstrução Simétrica Bilateral'
                : '2. Espelhamento Sagital',
              color: 'text-sky-400',
            },
            { id: 3 as const, tag: 'ETAPA 03', label: '3. Molde Negativo Bipartido', color: 'text-indigo-400' },
            { id: 4 as const, tag: 'ETAPA 04 · COMPLETO', label: '4. Kit Explodido & Exportar', color: 'text-emerald-400' },
          ].map((st) => {
            const active = pipelineStage === st.id && !titaniumFailureMode && !importedStl;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  setImportedStl(null);
                  setImportError(null);
                  setTitaniumFailureMode(false);
                  if (st.id < 3) setAnimating(false);
                  setPipelineStage(st.id);
                }}
                className={`text-left p-3 rounded-xl border transition cursor-pointer ${
                  active
                    ? 'bg-sky-500/15 border-sky-400 text-white'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className={`font-mono-tech text-xs ${st.color}`}>{st.tag}</div>
                <div className="font-bold text-xs sm:text-sm mt-0.5">{st.label}</div>
              </button>
            );
          })}
        </div>

        {/* MAIN STUDIO GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* 3D VIEWPORT COLUMN */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden relative min-h-[460px] sm:min-h-[560px]">
              {/* Top HUD & Contextual Banners (stacked in flow to prevent overlap) */}
              <div className="absolute top-3 left-3 right-3 z-10 flex flex-col gap-2 pointer-events-none">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="pointer-events-auto inline-flex items-center gap-2 bg-slate-950/90 border border-slate-800 px-3 py-1.5 rounded-xl text-xs min-w-0 max-w-full sm:max-w-lg">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="font-medium text-slate-200 truncate">{hudLabel}</span>
                  </div>

                  <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        ['front', 'Frontal'],
                        ['side', 'Lateral'],
                        ['top', 'Superior'],
                        ['back', 'Posterior'],
                      ] as [CameraPreset, string][]
                    ).map(([preset, lbl]) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => requestCam(preset)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-950/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium transition cursor-pointer"
                      >
                        {lbl}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setImportedStl(null);
                        setImportError(null);
                        requestCam('default');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-950/90 hover:bg-slate-800 text-sky-300 border border-slate-700 text-xs font-medium transition inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>

                {/* Titanium Failure Warning Banner */}
                {titaniumFailureMode && !importedStl && (
                  <div className="pointer-events-auto bg-rose-950/92 border border-rose-500/50 rounded-xl px-3.5 py-2.5 text-xs text-rose-100 shadow-lg">
                    <strong className="text-rose-300">Modo Comparativo Ativo (Falha do Ato 03):</strong>{' '}
                    Pontos vermelhos indicam pressão localizada das quinas vivas da placa de titânio
                    não prototipada contra o couro cabeludo — causando isquemia, ulceração e infecção.
                  </div>
                )}

                {/* Imported STL Bar */}
                {importedStl && (
                  <div className="pointer-events-auto bg-sky-950/92 border border-sky-500/40 rounded-xl px-3.5 py-2.5 text-xs text-sky-100 flex flex-wrap items-center justify-between gap-2 shadow-lg">
                    <div>
                      <strong>{importedStl.filename}</strong> ·{' '}
                      {importedStl.audit.triangleCount.toLocaleString('pt-BR')} tris · BBox{' '}
                      {importedStl.audit.bboxMm.x}×{importedStl.audit.bboxMm.y}×
                      {importedStl.audit.bboxMm.z} mm ·{' '}
                      {importedStl.audit.isWatertight
                        ? 'Manifold OK'
                        : `${importedStl.audit.boundaryEdges} arestas abertas`}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setMirrorImported((m) => !m)}
                        className={`px-2.5 py-1 rounded-lg border font-semibold transition cursor-pointer ${
                          mirrorImported
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                            : 'bg-slate-900 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        Espelhar Sagital: {mirrorImported ? 'ON' : 'OFF'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportedStl(null)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold cursor-pointer"
                      >
                        Voltar ao Phantom
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <ThreeViewport
                kit={kit}
                pipelineStage={pipelineStage}
                explodePct={explodePct}
                animating={animating}
                onAnimationExplodeChange={setExplodePct}
                titaniumFailureMode={titaniumFailureMode}
                wireframe={wireframe}
                clipAxis={clipAxis}
                clipOffsetMm={clipOffsetMm}
                cameraPresetReq={camReq}
                importedMesh={importedStl?.mesh ?? null}
                mirrorImported={mirrorImported}
              />

              {/* Bottom Legend & Animation */}
              <div className="p-3 bg-slate-950/95 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-3 text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#e6dfd1] inline-block" />
                    Osso Sintético
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#0284c7] inline-block" />
                    Molde Inf. (Pinos)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#38bdf8] inline-block" />
                    Molde Sup. (Encaixes)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#fefce8] border border-slate-500 inline-block" />
                    Implante PMMA
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="toggle-anim-btn"
                    type="button"
                    onClick={() => {
                      setAnimating((prev) => {
                        const next = !prev;
                        if (next && pipelineStage < 3) {
                          setPipelineStage(4);
                          setTitaniumFailureMode(false);
                        }
                        return next;
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-semibold transition inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {animating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{animating ? 'Pausar Prensagem' : 'Animar Prensagem (60 FPS)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWireframe((w) => !w)}
                    className={`px-3 py-1.5 rounded-lg border font-medium transition cursor-pointer ${
                      wireframe
                        ? 'bg-sky-500 text-slate-950 border-sky-400 font-semibold'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    Wireframe
                  </button>
                </div>
              </div>
            </div>

            {/* CROSS-SECTION CLIPPING PLANE INSPECTOR + DFM BADGES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-tech uppercase tracking-wider text-sky-400 font-semibold inline-flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5" />
                    Corte Transversal (Inspeção Interna)
                  </span>
                  <span className="font-mono-tech text-xs text-slate-400">
                    {clipAxis === 'none' ? 'Desligado' : `${clipOffsetMm} mm`}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      ['none', 'Off'],
                      ['axial', 'Axial (Y)'],
                      ['coronal', 'Coronal (Z)'],
                      ['sagittal', 'Sagital (X)'],
                    ] as [ClipAxis, string][]
                  ).map(([axis, lbl]) => (
                    <button
                      key={axis}
                      type="button"
                      onClick={() => setClipAxis(axis)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        clipAxis === axis
                          ? 'bg-sky-500 text-slate-950 border-sky-400'
                          : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
                {clipAxis !== 'none' && (
                  <div>
                    <input
                      aria-label="Deslocamento do plano de corte transversal em milímetros"
                      type="range"
                      min={-110}
                      max={110}
                      value={clipOffsetMm}
                      onChange={(e) => setClipOffsetMm(Number(e.target.value))}
                      className="w-full cursor-pointer"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Arraste para inspecionar a espessura exata de {params.thicknessMm.toFixed(1)}{' '}
                      mm, o chanfro anti-úlcera e o encaixe Poka-Yoke com o molde fechado (0%).
                    </p>
                  </div>
                )}
              </div>

              {/* REAL DFM / MANIFOLD AUDIT BADGES */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
                <div className="text-xs font-mono-tech uppercase tracking-wider text-emerald-400 font-semibold inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Validação Topológica &amp; Impressão FDM
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-400">Malha Estanque</div>
                    <div
                      className={`font-mono-tech font-bold mt-0.5 ${
                        allWatertight ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {allWatertight ? 'MANIFOLD OK (0 err)' : 'VERIFICAR'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-400">Mesa FDM 220×220</div>
                    <div
                      className={`font-mono-tech font-bold mt-0.5 ${
                        fitsFdm ? 'text-emerald-400' : 'text-amber-300'
                      }`}
                    >
                      {audit.lowerMold.bboxMm.x}×{audit.lowerMold.bboxMm.y} mm
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-400">Parede Mín. Molde</div>
                    <div
                      className={`font-mono-tech font-bold mt-0.5 ${
                        wallSafe ? 'text-emerald-400' : 'text-amber-300'
                      }`}
                    >
                      {Math.min(
                        audit.lowerMold.minWallThicknessMm,
                        audit.upperMold.minWallThicknessMm,
                      ).toFixed(1)}{' '}
                      mm (≥8)
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-400">Acoplamento Z = 0</div>
                    <div className="font-mono-tech font-bold text-sky-400 mt-0.5">
                      4 Pinos + 4 Cavs
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR: CONTROLS, CUSTOMIZER, TELEMETRY & EXPORT */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* ANTI-ULCERATION COMPARISON TOGGLE */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
              <div className="text-xs font-mono-tech text-rose-300 font-semibold">
                COMPARATIVO CLÍNICO (ATO 03 vs ATO 04)
              </div>
              <button
                id="toggle-titanium-btn"
                type="button"
                onClick={() => {
                  setImportedStl(null);
                  setImportError(null);
                  setTitaniumFailureMode((v) => {
                    const next = !v;
                    if (next) setAnimating(false);
                    return next;
                  });
                }}
                className="w-full py-2.5 px-3.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-500/40 text-xs font-semibold transition flex items-center justify-between cursor-pointer"
              >
                <span>Simular Placa Titânio Não Prototipada</span>
                <span
                  className={`px-2 py-0.5 rounded font-mono-tech ${
                    titaniumFailureMode
                      ? 'bg-rose-500 text-slate-950 font-bold'
                      : 'bg-slate-950 text-slate-400'
                  }`}
                >
                  {titaniumFailureMode ? 'ATIVO' : 'OFF'}
                </span>
              </button>
            </div>

            {/* PARAMETRIC MOLD SLIDERS */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <h3 className="text-xs font-mono-tech uppercase tracking-wider text-sky-400 font-semibold inline-flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                Parâmetros Geométricos do Molde
              </h3>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Abertura do Molde (Vista Explodida)</span>
                  <span className="font-mono-tech text-sky-400 font-semibold">{explodePct}%</span>
                </div>
                <input
                  id="param-explode"
                  type="range"
                  min={0}
                  max={100}
                  value={explodePct}
                  onChange={(e) => {
                    setAnimating(false);
                    setExplodePct(Number(e.target.value));
                  }}
                  className="w-full cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Espessura Alvo Implante PMMA</span>
                  <span className="font-mono-tech text-sky-400 font-semibold">
                    {params.thicknessMm.toFixed(1)} mm
                  </span>
                </div>
                <input
                  id="param-thickness"
                  type="range"
                  min={2.8}
                  max={5.0}
                  step={0.2}
                  value={params.thicknessMm}
                  onChange={(e) =>
                    setParams((p) => ({ ...p, thicknessMm: Number(e.target.value) }))
                  }
                  className="w-full cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Chanfro Marginal Anti-Úlcera (C¹)</span>
                  <span className="font-mono-tech text-emerald-400 font-semibold">
                    {params.chamferMm.toFixed(1)} mm
                  </span>
                </div>
                <input
                  id="param-chamfer"
                  type="range"
                  min={0.5}
                  max={3.0}
                  step={0.5}
                  value={params.chamferMm}
                  onChange={(e) => setParams((p) => ({ ...p, chamferMm: Number(e.target.value) }))}
                  className="w-full cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Folga Radial Pinos/Cavs Poka-Yoke</span>
                  <span className="font-mono-tech text-sky-400 font-semibold">
                    {params.clearanceMm.toFixed(2)} mm
                  </span>
                </div>
                <input
                  id="param-clearance"
                  type="range"
                  min={0.2}
                  max={0.5}
                  step={0.05}
                  value={params.clearanceMm}
                  onChange={(e) =>
                    setParams((p) => ({ ...p, clearanceMm: Number(e.target.value) }))
                  }
                  className="w-full cursor-pointer"
                />
              </div>

              <label className="flex items-center justify-between pt-1.5 border-t border-slate-800 text-xs text-slate-300 cursor-pointer">
                <span>Guias de Drenagem Epidural &amp; Fixação</span>
                <input
                  type="checkbox"
                  checked={params.includeDrainageDimples}
                  onChange={(e) =>
                    setParams((p) => ({ ...p, includeDrainageDimples: e.target.checked }))
                  }
                  className="rounded border-slate-600 accent-sky-500"
                />
              </label>
            </div>

            {/* DEFECT CUSTOMIZER */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono-tech uppercase tracking-wider text-indigo-300 font-semibold inline-flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Personalizar Falha Sintética
                </h3>
                {activeCfg.isBilateral && (
                  <span className="text-[10px] font-mono-tech px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
                    SIMETRIA BILATERAL
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(['right', 'left'] as const).map((hemi) => (
                  <button
                    key={hemi}
                    type="button"
                    disabled={activeCfg.isBilateral}
                    onClick={() => setParams((p) => ({ ...p, hemisphere: hemi }))}
                    className={`py-1.5 rounded-lg text-xs font-semibold border transition ${
                      activeCfg.isBilateral
                        ? 'bg-slate-950/60 text-slate-500 border-slate-800 cursor-not-allowed'
                        : params.hemisphere === hemi
                          ? 'bg-sky-500/20 text-sky-200 border-sky-400 cursor-pointer'
                          : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-600 cursor-pointer'
                    }`}
                  >
                    {hemi === 'right' ? 'Hemisfério Direito' : 'Hemisfério Esquerdo'}
                  </button>
                ))}
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Escala da Craniectomia</span>
                  <span className="font-mono-tech text-sky-400 font-semibold">
                    {Math.round(params.defectScale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.7}
                  max={1.2}
                  step={0.05}
                  value={params.defectScale}
                  onChange={(e) =>
                    setParams((p) => ({ ...p, defectScale: Number(e.target.value) }))
                  }
                  className="w-full cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Desl. Tangencial U</span>
                    <span className="font-mono-tech text-slate-200">{params.uShiftMm} mm</span>
                  </div>
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={2}
                    disabled={activeCfg.isBilateral}
                    value={params.uShiftMm}
                    onChange={(e) =>
                      setParams((p) => ({ ...p, uShiftMm: Number(e.target.value) }))
                    }
                    className="w-full cursor-pointer disabled:opacity-40"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Desl. Súp-Inf V</span>
                    <span className="font-mono-tech text-slate-200">{params.vShiftMm} mm</span>
                  </div>
                  <input
                    type="range"
                    min={-10}
                    max={10}
                    step={2}
                    value={params.vShiftMm}
                    onChange={(e) =>
                      setParams((p) => ({ ...p, vShiftMm: Number(e.target.value) }))
                    }
                    className="w-full cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* LIVE CAD & SIGTAP TELEMETRY */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs">
              <h3 className="font-mono-tech uppercase tracking-wider text-slate-400 font-semibold mb-1">
                Auditoria Real de Malha &amp; Custo SUS
              </h3>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Volume / Massa Real PMMA:</span>
                <span className="font-mono-tech text-white font-semibold">
                  {audit.implant.signedVolumeCm3.toFixed(1)} cm³ · {audit.economics.pmmaMassGrams.toFixed(1)} g
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Doses Cimento ({audit.economics.cementSigtapCode}):</span>
                <span className="font-mono-tech text-sky-300 font-semibold">
                  {audit.economics.cementKits} {audit.economics.cementKits === 1 ? 'kit' : 'kits'} (
                  {formatBRL(audit.economics.cementTotalBrl)})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">PETG Molde Bipartido / Tempo:</span>
                <span className="font-mono-tech text-white font-semibold">
                  {audit.economics.petgGrams} g (~{audit.economics.estimatedPrintHours}h)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Triângulos Estanques (3 peças):</span>
                <span className="font-mono-tech text-slate-300">
                  {totalTris.toLocaleString('pt-BR')} tris
                </span>
              </div>
              <div className="flex justify-between pt-1.5 text-sm">
                <span className="font-semibold text-emerald-300">Custo Total Estimado SUS:</span>
                <span className="font-mono-tech font-bold text-emerald-400">
                  {formatBRL(audit.economics.estimatedTotalKitCostBrl)}
                </span>
              </div>
            </div>

            {/* REAL BINARY STL & ZIP EXPORT */}
            <div className="p-4 rounded-2xl bg-sky-950/35 border border-sky-500/30 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono-tech text-sky-300 font-semibold">
                  EXPORTAÇÃO REAL (BINARY STL / ZIP)
                </span>
                <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.bedFlat}
                    onChange={(e) => setExportOptions({ bedFlat: e.target.checked })}
                    className="accent-sky-500"
                  />
                  <span>Mesa FDM (Z=0)</span>
                </label>
              </div>

              <button
                id="dl-kit-zip-btn"
                type="button"
                onClick={handleExportFullZip}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition inline-flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15 cursor-pointer"
              >
                <FileArchive className="w-4 h-4" />
                <span>Baixar Kit Cirúrgico Completo (.ZIP)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  id="dl-mold-inf-btn"
                  type="button"
                  onClick={() => handleExportBinaryStl('lower')}
                  className="py-2 px-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition inline-flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Molde Inf. (.STL)</span>
                </button>
                <button
                  id="dl-mold-sup-btn"
                  type="button"
                  onClick={() => handleExportBinaryStl('upper')}
                  className="py-2 px-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition inline-flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Molde Sup. (.STL)</span>
                </button>
                <button
                  id="dl-implant-btn"
                  type="button"
                  onClick={() => handleExportBinaryStl('implant')}
                  className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-semibold text-xs transition cursor-pointer"
                >
                  Implante PMMA (.STL)
                </button>
                <button
                  id="dl-audit-btn"
                  type="button"
                  onClick={handleExportAuditJson}
                  className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 font-semibold text-xs transition cursor-pointer"
                >
                  Laudo Audit (.JSON)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PrintProtocolModal
        open={protocolOpen}
        onClose={() => setProtocolOpen(false)}
        audit={audit}
        onDownloadProtocol={handleExportProtocolTxt}
      />
    </section>
  );
}
