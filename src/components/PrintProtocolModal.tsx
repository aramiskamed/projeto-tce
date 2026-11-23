import { AlertTriangle, CheckCircle2, Printer, ShieldCheck, X } from 'lucide-react';
import { SurgicalKitAudit } from '../engine/economics';

interface PrintProtocolModalProps {
  open: boolean;
  onClose: () => void;
  audit: SurgicalKitAudit;
  onDownloadProtocol: () => void;
}

export function PrintProtocolModal({
  open,
  onClose,
  audit,
  onDownloadProtocol,
}: PrintProtocolModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="protocol-modal-title"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 id="protocol-modal-title" className="font-bold text-white text-base">
                Protocolo de Impressão 3D (PETG) &amp; Esterilização
              </h2>
              <p className="text-xs text-slate-400">
                Guia DFM e checklist intraoperatório para moldagem extracorpórea de PMMA
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar protocolo"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-200">
          <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/40 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-rose-200">
                Alerta Crítico de Esterilização (Baixa Temperatura Obrigatória)
              </div>
              <p className="text-rose-100/90 leading-relaxed">
                <strong>NUNCA autoclave moldes em PETG a vapor (121 °C / 134 °C)</strong> — a temperatura de
                transição vítrea (T<sub>g</sub> ≈ 80 °C) deforma a cavidade e os pinos Poka-Yoke. Utilize
                exclusivamente <strong>Óxido de Etileno (ETO)</strong> ou{' '}
                <strong>Plasma de Peróxido de Hidrogênio (H₂O₂)</strong>.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
              <div className="font-mono-tech text-xs text-sky-400 font-semibold">
                FATIADOR (PRUSASLICER / ORCASLICER / CURA)
              </div>
              <ul className="space-y-1 text-slate-300">
                <li>• Filamento: PETG técnico/médico ou PC-ISO</li>
                <li>• Camada: <strong>0,16 mm</strong> · Perímetros: <strong>5</strong></li>
                <li>• Infill: <strong>35% Gyroid</strong> (rigidez à prensagem)</li>
                <li>• Suportes: <strong>DESLIGADOS</strong> (mesa plana Z = 0)</li>
                <li>
                  • Consumo: <strong>{audit.economics.petgGrams} g</strong> (~
                  {audit.economics.estimatedPrintHours} h)
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
              <div className="font-mono-tech text-xs text-emerald-400 font-semibold">
                DIMENSÕES VERIFICADAS NA MESA FDM
              </div>
              <ul className="space-y-1 text-slate-300 font-mono-tech text-xs">
                <li>
                  • Molde Inf.: {audit.lowerMold.bboxMm.x} × {audit.lowerMold.bboxMm.y} ×{' '}
                  {audit.lowerMold.bboxMm.z} mm
                </li>
                <li>
                  • Molde Sup.: {audit.upperMold.bboxMm.x} × {audit.upperMold.bboxMm.y} ×{' '}
                  {audit.upperMold.bboxMm.z} mm
                </li>
                <li>
                  • Parede Mín.: {audit.lowerMold.minWallThicknessMm} /{' '}
                  {audit.upperMold.minWallThicknessMm} mm (≥ 8 mm)
                </li>
                <li>• Folga Poka-Yoke: {audit.parameters.clearanceMm.toFixed(2)} mm</li>
                <li>
                  • Mesa 220×220 mm:{' '}
                  <span className="text-emerald-400 font-bold">
                    {audit.lowerMold.fitsStandardFdmBed && audit.upperMold.fitsStandardFdmBed
                      ? 'COMPATÍVEL'
                      : 'EXCEDE'}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-mono-tech text-xs text-emerald-300 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>CHECKLIST INTRAOPERATÓRIO DE PRENSAGEM EXTRACORPÓREA</span>
            </div>
            <ol className="space-y-1.5 text-slate-300 list-decimal list-inside">
              <li>Revestir internamente as cavidades com filme estéril fino ou lubrificante estéril.</li>
              <li>
                Preparar <strong>{audit.economics.cementKits} kit(s)</strong> de PMMA (SIGTAP{' '}
                <code>{audit.economics.cementSigtapCode}</code>, massa alvo{' '}
                <strong>{audit.economics.pmmaMassGrams} g</strong>).
              </li>
              <li>Preencher a cavidade inferior na fase pastosa e acoplar a tampa nos 4 pinos Poka-Yoke.</li>
              <li>Pressionar até o fechamento completo — o excesso escoa pela canaleta e 4 canais radiais.</li>
              <li>
                <strong>Aguardar resfriamento completo (&lt; 37 °C) fora do corpo do paciente</strong> antes de
                desmoldar, perfurar os guias de drenagem epidural e fixar.
              </li>
            </ol>
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Uso em bancada / planejamento assistido (phantom sintético)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDownloadProtocol}
              className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition"
            >
              Baixar Protocolo (.TXT)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
