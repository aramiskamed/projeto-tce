import { useState } from 'react';
import { ArrowRight, ExternalLink, Film, PlayCircle, ShieldAlert } from 'lucide-react';
import { JOURNEY_STEPS, SIGTAP_ROWS } from '../data/clinicalData';
import { formatBRL } from '../engine/economics';
import { ClinicalCharts } from './ClinicalCharts';

interface StoryTabProps {
  onOpenStudio: (opts?: { stage?: 1 | 2 | 3 | 4; titanium?: boolean }) => void;
}

export function StoryTab({ onOpenStudio }: StoryTabProps) {
  const [journeyIdx, setJourneyIdx] = useState(0);
  const [simCases, setSimCases] = useState(50);
  const [cementUnit, setCementUnit] = useState(145.42);
  const [opmeRef, setOpmeRef] = useState(160000);

  const activeStep = JOURNEY_STEPS[journeyIdx];
  const baseUrl = import.meta.env.BASE_URL;

  const filamentCost = 62.0;
  const sterilizationCost = 60.0;
  const miniplateCost = 361.81;
  const unitKitCost = filamentCost + sterilizationCost + 2 * cementUnit + miniplateCost;
  const unitSaved = Math.max(0, opmeRef - unitKitCost);
  const pctSaved = (unitSaved / opmeRef) * 100;
  const totalSaved = unitSaved * simCases;
  const slsSaved = Math.max(0, (10000 - unitKitCost) * simCases);

  const totalSavedLabel =
    totalSaved >= 1_000_000
      ? `R$ ${(totalSaved / 1_000_000).toFixed(2).replace('.', ',')} mi`
      : `R$ ${Math.round(totalSaved).toLocaleString('pt-BR')}`;

  const badgeToneClass =
    activeStep.badgeTone === 'emerald'
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : activeStep.badgeTone === 'amber'
        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
        : 'bg-rose-500/15 text-rose-300 border-rose-500/30';

  return (
    <main className="flex-1">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden border-b border-slate-800/80 bg-gradient-to-b from-slate-900/75 via-slate-950 to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex flex-wrap items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/25 text-sky-300 text-xs font-medium">
              <span>Hack Brasil 2026 · Trilha 04 (Saúde &amp; Bem-Estar)</span>
              <span className="text-slate-500">•</span>
              <span>Craniectomia Descompressiva &amp; Cranioplastia SUS</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.12]">
              De{' '}
              <span className="text-rose-400 line-through decoration-rose-500/70">R$ 200 mil</span> e
              7 anos de fila para <span className="text-sky-400">menos de R$ 800</span> dentro do
              SUS.
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
              Plataforma aberta de geometria computacional que gera{' '}
              <strong className="text-white">moldes negativos bipartidos 3D estanques</strong> com
              pinos Poka-Yoke, canais de escape e apoio plano em mesa FDM — permitindo prensar
              próteses cranianas em cimento ósseo (PMMA) estéril fora do paciente, sem quinas
              metálicas e sem risco térmico ao córtex.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                id="hero-open-demo-btn"
                type="button"
                onClick={() => onOpenStudio({ stage: 4, titanium: false })}
                className="px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm sm:text-base shadow-lg shadow-sky-500/20 transition inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Abrir Studio CAD 3D Interativo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#secao-video-pitch"
                className="px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-sm sm:text-base border border-slate-700 transition inline-flex items-center gap-2"
              >
                <PlayCircle className="w-4 h-4 text-sky-400" />
                <span>Assistir Vídeo Pitch (2min44s)</span>
              </a>
            </div>

            {/* VERIFIED METRICS STRIP */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800/90">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="font-mono-tech text-xl sm:text-2xl font-bold text-white">
                  131 mil
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  internações/ano TCE &amp; face (
                  <a
                    href="https://www.scielo.br/j/rbti/a/K5yzpQH78f4FmwmjPjjppCm/?lang=pt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 underline"
                  >
                    DATASUS
                  </a>
                  )
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="font-mono-tech text-xl sm:text-2xl font-bold text-amber-300 whitespace-nowrap">
                  30 mil
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  craniectomias/ano · fila &gt;7 anos (
                  <a
                    href="https://mittechreview.com.br/proteses-cranianas-por-impressao-3d-realidade-acessivel-aos-pacientes-do-sus/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 underline"
                  >
                    MIT TR
                  </a>
                  )
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="font-mono-tech text-xl sm:text-2xl font-bold text-emerald-400">
                  &gt;99,2%
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  economia frente à OPME comercial (
                  <a
                    href="https://e-revista.unioeste.br/index.php/variasaude/pt_BR/article/view/36386"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 underline"
                  >
                    HUOP
                  </a>
                  )
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="font-mono-tech text-xl sm:text-2xl font-bold text-sky-400">
                  &lt; R$ 800
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  cabe na AIH atual (
                  <a
                    href="https://unisus.com.br/sigtap/procedimento/0403010012-cranioplastia"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 underline"
                  >
                    SIGTAP
                  </a>
                  )
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl">
              <img
                src={`${baseUrl}assets/kit-cranioplastia-3d.jpg`}
                alt="Kit cirúrgico em 3 peças: molde negativo bipartido azul em PETG, implante de PMMA e crânio sintético"
                className="w-full h-auto block"
              />
              <div className="p-4 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between gap-2 text-xs text-slate-400">
                <span>Molde Bipartido PETG + Implante PMMA + Biomodelo Sintético</span>
                <span className="font-mono-tech text-emerald-400 shrink-0">100% sintético</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: 4-ACT ILLUSTRATIVE CLINICAL JOURNEY */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 border-b border-slate-800/80">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
              A História Real por Trás dos Números (Caso Ilustrativo)
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
              Por que placas não prototipadas falham — e o que acontece com quem espera
            </h2>
          </div>
          <div className="text-xs text-slate-400 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 inline-flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Conformidade{' '}
              <a
                href="https://hackbrasil.com/regulamento"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 underline"
              >
                Item 6.9
              </a>
              : Persona ilustrativa · Geometria 100% sintética
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {JOURNEY_STEPS.map((step, idx) => {
            const active = idx === journeyIdx;
            const dotColor =
              step.badgeTone === 'emerald'
                ? 'bg-emerald-400'
                : step.badgeTone === 'amber'
                  ? 'bg-amber-400'
                  : 'bg-rose-400';
            return (
              <button
                key={step.shortTag}
                type="button"
                onClick={() => setJourneyIdx(idx)}
                className={`text-left p-4 rounded-xl border transition cursor-pointer ${
                  active
                    ? 'bg-sky-500/15 border-sky-400 text-white shadow-md shadow-sky-500/10'
                    : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono-tech text-xs text-sky-300 font-semibold">
                    {step.shortTag}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                </div>
                <div className="font-bold text-sm">{step.shortTitle}</div>
              </button>
            );
          })}
        </div>

        <div className="glass-panel rounded-2xl p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 space-y-3">
            <div
              className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono-tech font-semibold border ${badgeToneClass}`}
            >
              {activeStep.badge}
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white">{activeStep.title}</h3>
            <p className="text-slate-300 leading-relaxed text-sm sm:text-base">{activeStep.desc}</p>
            <div className="text-xs text-slate-400 pt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>Base científica:</span>
              <a
                href={activeStep.citationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 underline inline-flex items-center gap-1"
              >
                {activeStep.citationLabel}
                <ExternalLink className="w-3 h-3" />
              </a>
              {activeStep.citationSecondaryLabel && activeStep.citationSecondaryUrl && (
                <>
                  <span>·</span>
                  <a
                    href={activeStep.citationSecondaryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 underline inline-flex items-center gap-1"
                  >
                    {activeStep.citationSecondaryLabel}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-3 bg-slate-950/80 p-5 rounded-xl border border-slate-800">
            <div className="text-xs font-mono-tech text-slate-400">IMPACTO CLÍNICO DIRETO</div>
            <div className="text-2xl font-extrabold text-white">{activeStep.metric}</div>
            <p className="text-xs text-slate-400 leading-relaxed">{activeStep.submetric}</p>
            <button
              type="button"
              onClick={() =>
                onOpenStudio({
                  stage: activeStep.targetStage,
                  titanium: activeStep.titaniumMode,
                })
              }
              className="mt-1 w-full py-2.5 px-4 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-semibold transition cursor-pointer"
            >
              Inspecionar este Estágio no Studio 3D →
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 3: EPIDEMIOLOGY & THERMAL SAFETY CHARTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 border-b border-slate-800/80">
        <div className="mb-8">
          <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
            Evidência Epidemiológica &amp; Segurança Biomédica
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
            Reversão neurológica, trauma craniofacial e proteção térmica cortical
          </h2>
          <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-3xl">
            Além dos defeitos extensos de calota craniana pós-TCE e AVC maligno, o complexo
            zigomático-orbitário responde por <strong>44,5% das fraturas faciais cirúrgicas</strong>{' '}
            — e a cura extracorpórea do PMMA elimina o pico de ~80 °C sobre o córtex cerebral.
          </p>
        </div>

        <ClinicalCharts />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="p-5 rounded-2xl bg-slate-900/75 border border-rose-500/25">
            <div className="text-xs font-mono-tech text-rose-400 font-semibold mb-1">
              MOLDAGEM MANUAL DE PMMA (FREEHAND)
            </div>
            <h4 className="font-bold text-white text-base mb-2">
              Pico exotérmico a ~80 °C sobre tecidos
            </h4>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Polimerizar manualmente sobre a falha expõe a dura-máter a queimaduras térmicas e
              monômeros tóxicos; irrigar com soro fragiliza e contamina a peça (
              <a
                href="https://pmc.ncbi.nlm.nih.gov/articles/PMC11229092/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 underline"
              >
                PMC 2024
              </a>
              ).
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/75 border border-amber-500/25">
            <div className="text-xs font-mono-tech text-amber-300 font-semibold mb-1">
              PLACAS E TELAS NÃO PROTOTIPADAS
            </div>
            <h4 className="font-bold text-white text-base mb-2">
              Ulceração cutânea, infecção e até 25% de revisão
            </h4>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Pontas dobradas à mão geram tensão no retalho cutâneo, deiscência, infecção (15,9%) e
              extrusão (11,8% —{' '}
              <a
                href="https://www.scielo.br/j/rbcp/a/MTFjPtbdLVRJKL5r98Nwzss/?lang=pt"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 underline"
              >
                RBCP 2017
              </a>
              ), com até 25% de revisões (
              <a
                href="https://pmc.ncbi.nlm.nih.gov/articles/PMC12502944/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 underline"
              >
                PMC 2025
              </a>
              ).
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/75 border border-emerald-500/30">
            <div className="text-xs font-mono-tech text-emerald-400 font-semibold mb-1">
              MOLDE NEGATIVO 3D + PMMA CIRÚRGICO
            </div>
            <h4 className="font-bold text-white text-base mb-2">
              Cura extracorpórea fria e chanfro tangencial C¹
            </h4>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              A reação exotérmica ocorre fora do paciente no molde PETG estéril. Espessura
              controlada (2,8–5,0 mm) e chanfro contínuo eliminam quinas sob o couro cabeludo.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 4: SIGTAP / SUS SAVINGS SIMULATOR */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 border-b border-slate-800/80">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Simulador Farmacoeconômico SUS · SIGTAP 2026
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Quanto um hospital público economiza com o processo
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Enquanto a AIH <code>04.03.01.001-2</code> (Cranioplastia) repassa{' '}
              <strong>R$ 1.322,12</strong> ao hospital, próteses industriais sob medida custam de R$
              120 mil a R$ 200 mil. Ajuste abaixo para simular a economia anual:
            </p>

            <div className="space-y-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div>
                <div className="flex justify-between text-xs sm:text-sm font-medium mb-1.5">
                  <span className="text-slate-300">Cirurgias craniofaciais/ano no serviço:</span>
                  <span className="font-mono-tech text-sky-400 font-bold">
                    {simCases} {simCases === 1 ? 'caso/ano' : 'casos/ano'}
                  </span>
                </div>
                <input
                  id="sim-cases-slider"
                  type="range"
                  min={1}
                  max={300}
                  value={simCases}
                  onChange={(e) => setSimCases(Number(e.target.value))}
                  className="w-full cursor-pointer"
                />
              </div>

              <div>
                <label
                  htmlFor="sim-cement-select"
                  className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5"
                >
                  Cimento ósseo padronizado na AIH (2 doses):
                </label>
                <select
                  id="sim-cement-select"
                  value={cementUnit}
                  onChange={(e) => setCementUnit(Number(e.target.value))}
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs sm:text-sm text-white"
                >
                  <option value={145.42}>
                    07.02.03.138-0 · Cimento s/ antibiótico (R$ 145,42/unid.)
                  </option>
                  <option value={262.63}>
                    07.02.03.008-2 · Cimento c/ antibiótico (R$ 262,63/unid.)
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="sim-opme-select"
                  className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5"
                >
                  Custo de referência da OPME comercial customizada:
                </label>
                <select
                  id="sim-opme-select"
                  value={opmeRef}
                  onChange={(e) => setOpmeRef(Number(e.target.value))}
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs sm:text-sm text-white"
                >
                  <option value={120000}>Piso de mercado / judicialização — R$ 120.000</option>
                  <option value={160000}>Média nacional PEEK / Titânio / Cerâmica — R$ 160.000</option>
                  <option value={200000}>Teto reportado em alta complexidade — R$ 200.000</option>
                </select>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400">Custo Unitário Molde 3D + PMMA</div>
                <div className="font-mono-tech text-2xl font-bold text-sky-400 mt-1">
                  {formatBRL(unitKitCost)}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  PETG (~R$ 62) + ETO/H₂O₂ (R$ 60) + 2× cimento + miniplaca SIGTAP
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400">Redução Percentual por Caso</div>
                <div className="font-mono-tech text-2xl font-bold text-emerald-400 mt-1">
                  {pctSaved.toFixed(2).replace('.', ',')}%
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  Economia de R$ {Math.round(unitSaved).toLocaleString('pt-BR')} por paciente
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-emerald-950/35 border border-emerald-500/40">
                <div className="text-xs text-emerald-300">Economia Anual Acumulada no SUS</div>
                <div className="font-mono-tech text-2xl font-bold text-white mt-1">
                  {totalSavedLabel}
                </div>
                <div className="text-xs text-emerald-300/90 mt-1">
                  Economia de R$ {Math.round(slsSaved).toLocaleString('pt-BR')} até vs. SLS
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-5 overflow-x-auto">
              <h3 className="text-sm font-bold text-white mb-3">
                Enquadramento Direto nos Códigos Vigentes do SUS (Competência 2026)
              </h3>
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 font-mono-tech text-xs">
                    <th className="py-2 pr-3">Código SIGTAP</th>
                    <th className="py-2 pr-3">Descrição Oficial</th>
                    <th className="py-2 text-right">Valor SUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {SIGTAP_ROWS.map((row) => (
                    <tr key={row.code}>
                      <td className="py-2.5 pr-3 font-mono-tech text-sky-300">
                        <a
                          href={row.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          {row.code}
                        </a>
                      </td>
                      <td className="py-2.5 pr-3">{row.desc}</td>
                      <td className="py-2.5 text-right font-mono-tech whitespace-nowrap">
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: OFFICIAL PITCH VIDEO FOR JUDGES */}
      <section
        id="secao-video-pitch"
        className="scroll-mt-36 md:scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 py-14"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div className="space-y-2 max-w-3xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sky-400">
              <Film className="w-3.5 h-3.5" />
              Vídeo Pitch Oficial · Hack Brasil 2026 (2min44s)
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Apresentação do CranioMold 3D para a Banca Avaliadora
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Assista à demonstração completa dentro do teto oficial de 3 minutos do Hack Brasil
              2026: contexto clínico, comparativo de falha das placas não prototipadas, geração do
              molde negativo bipartido 3D e viabilidade econômica dentro da AIH do SUS.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenStudio({ stage: 3, titanium: false })}
              className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs sm:text-sm transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Testar Studio CAD 3D</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 glass-panel rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
            <div className="relative bg-black aspect-video">
              <video
                id="pitch-video-player"
                controls
                playsInline
                preload="metadata"
                poster={`${baseUrl}assets/kit-cranioplastia-3d.jpg`}
                aria-label="Vídeo pitch oficial do CranioMold 3D para os jurados do Hack Brasil 2026"
                className="w-full h-full object-contain bg-black"
              >
                <source src={`${baseUrl}assets/pitch-craniomold-3d.mp4`} type="video/mp4" />
                Seu navegador não suporta a reprodução embutida de vídeo MP4.{' '}
                <a
                  href={`${baseUrl}assets/pitch-craniomold-3d.mp4`}
                  className="text-sky-400 underline"
                >
                  Baixar vídeo pitch (.mp4)
                </a>
                .
              </video>
            </div>
            <div className="px-4 py-3 bg-slate-900/95 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span>
                Narrativa clínica ilustrativa · Demonstração executada sobre phantom 3D 100%
                sintético (Item 6.9).
              </span>
              <span className="font-mono-tech text-sky-400 shrink-0">1080p · H.264 · 2min44s</span>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">
              <img
                src={`${baseUrl}assets/espelhamento-sagital-cad.jpg`}
                alt="Diagrama conceitual 3D do espelhamento sagital craniofacial"
                className="w-full h-auto block"
              />
              <div className="p-3.5 text-xs text-slate-400 border-t border-slate-800">
                Espelhamento sagital contralateral: reconstrução anatômica contínua sem quinas
                metálicas sob o retalho cutâneo.
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="text-xs font-mono-tech uppercase tracking-wider text-emerald-400 font-semibold">
                Explore ao Vivo após o Vídeo
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Cada etapa exibida no vídeo pode ser manipulada em tempo real no Studio 3D:
                altere a espessura do implante, ative o corte transversal e baixe os arquivos{' '}
                <code className="text-sky-300">.STL</code> prontos para impressão FDM.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => onOpenStudio({ stage: 4, titanium: false })}
                  className="w-full py-2 px-3 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-semibold transition cursor-pointer"
                >
                  Abrir Kit Completo Explodido →
                </button>
                <button
                  type="button"
                  onClick={() => onOpenStudio({ stage: 1, titanium: true })}
                  className="w-full py-2 px-3 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-500/35 text-xs font-semibold transition cursor-pointer"
                >
                  Comparar Falha de Titânio vs PMMA →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
