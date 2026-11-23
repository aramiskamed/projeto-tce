import { useEffect, useRef } from 'react';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { buildExothermicThermalCurve } from '../engine/economics';

Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip,
  Filler,
);

export function ClinicalCharts() {
  const trephinedRef = useRef<HTMLCanvasElement | null>(null);
  const facialRef = useRef<HTMLCanvasElement | null>(null);
  const thermalRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    Chart.defaults.color = '#94a3b8';
    const charts: Chart[] = [];

    if (trephinedRef.current) {
      charts.push(
        new Chart(trephinedRef.current, {
          type: 'bar',
          data: {
            labels: [
              'Desconforto local',
              'Cefaleia',
              'Déf. memória',
              'Disfasia',
              'Insegurança',
              'Paresias',
              'Déf. atenção',
            ],
            datasets: [
              {
                label: 'Pré-operatório (em 14 casos)',
                data: [13, 12, 12, 11, 11, 10, 10],
                backgroundColor: 'rgba(148, 163, 184, 0.45)',
                borderColor: 'rgba(148, 163, 184, 0.9)',
                borderWidth: 1,
                borderRadius: 5,
              },
              {
                label: 'Resolução ou melhora pós-PMMA 3D',
                data: [13, 12, 8, 11, 10, 9, 9],
                backgroundColor: 'rgba(14, 165, 233, 0.82)',
                borderColor: 'rgba(56, 189, 248, 1)',
                borderWidth: 1,
                borderRadius: 5,
              },
            ],
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'top', labels: { boxWidth: 12, color: '#cbd5e1' } },
            },
            scales: {
              x: { beginAtZero: true, max: 14, grid: { color: 'rgba(51, 65, 85, 0.4)' } },
              y: { grid: { display: false }, ticks: { color: '#e2e8f0' } },
            },
          },
        }),
      );
    }

    if (facialRef.current) {
      charts.push(
        new Chart(facialRef.current, {
          type: 'bar',
          data: {
            labels: ['Complexo Zigomático', 'Mandíbula', 'Maxila', 'Ossos Nasais', 'Arco Zigomático'],
            datasets: [
              {
                label: '% das fraturas faciais cirúrgicas (n = 153)',
                data: [44.5, 42.5, 5.2, 4.5, 3.3],
                backgroundColor: [
                  'rgba(14, 165, 233, 0.85)',
                  'rgba(100, 116, 139, 0.55)',
                  'rgba(56, 189, 248, 0.55)',
                  'rgba(56, 189, 248, 0.45)',
                  'rgba(16, 185, 129, 0.75)',
                ],
                borderRadius: 6,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'top', labels: { boxWidth: 12, color: '#cbd5e1' } },
            },
            scales: {
              y: {
                beginAtZero: true,
                max: 50,
                grid: { color: 'rgba(51, 65, 85, 0.4)' },
                ticks: { callback: (v) => `${v}%` },
              },
              x: { grid: { display: false }, ticks: { color: '#e2e8f0' } },
            },
          },
        }),
      );
    }

    if (thermalRef.current) {
      const curve = buildExothermicThermalCurve();
      charts.push(
        new Chart(thermalRef.current, {
          type: 'line',
          data: {
            labels: curve.map((p) => `${p.minute} min`),
            datasets: [
              {
                label: 'PMMA Manual In-Situ (Interface Dura-Máter °C)',
                data: curve.map((p) => p.freehandDuraTempC),
                borderColor: '#f43f5e',
                backgroundColor: 'rgba(244, 63, 94, 0.16)',
                fill: true,
                tension: 0.35,
                borderWidth: 2.5,
                pointRadius: 3,
              },
              {
                label: 'Limiar de Necrose Térmica Cortical (47 °C)',
                data: curve.map((p) => p.corticalNecrosisThresholdC),
                borderColor: '#f59e0b',
                borderDash: [6, 5],
                borderWidth: 2,
                pointRadius: 0,
              },
              {
                label: 'CranioMold 3D Extracorpóreo (Dura-Máter 36,5 °C)',
                data: curve.map((p) => p.craniomoldDuraTempC),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                fill: true,
                borderWidth: 2.5,
                pointRadius: 2.5,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'top', labels: { boxWidth: 12, color: '#cbd5e1' } },
            },
            scales: {
              y: {
                min: 30,
                max: 90,
                grid: { color: 'rgba(51, 65, 85, 0.4)' },
                ticks: { callback: (v) => `${v} °C` },
              },
              x: { grid: { color: 'rgba(51, 65, 85, 0.25)' }, ticks: { color: '#e2e8f0' } },
            },
          },
        }),
      );
    }

    return () => {
      for (const ch of charts) ch.destroy();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel rounded-2xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <h3 className="font-bold text-white text-base sm:text-lg">
                Reversão da Síndrome do Trefinado pós-PMMA 3D
              </h3>
              <p className="text-xs text-slate-400">
                Coorte prospectiva no SUS (n = 14, Hospital da Restauração/PE —{' '}
                <a
                  href="https://www.scielo.br/j/rbcp/a/MTFjPtbdLVRJKL5r98Nwzss/?lang=pt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 underline"
                >
                  Maricevich &amp; Campolina, RBCP 2017
                </a>
                )
              </p>
            </div>
            <span className="font-mono-tech text-xs px-2 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
              100% expansão TC
            </span>
          </div>
          <div className="relative h-72">
            <canvas ref={trephinedRef} />
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <h3 className="font-bold text-white text-base sm:text-lg">
                Distribuição Anatômica das Fraturas de Face
              </h3>
              <p className="text-xs text-slate-400">
                Serviço de CTBMF Santa Casa POA (153 fraturas; 86,6% homens —{' '}
                <a
                  href="https://www.scielo.br/j/rcbc/a/7C4sphzGGq6t8NyGZbk7s4H/?lang=pt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 underline"
                >
                  Zamboni et al., RCBC 2017
                </a>
                )
              </p>
            </div>
            <span className="font-mono-tech text-xs px-2 py-1 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 shrink-0">
              47,8% zigoma/arco
            </span>
          </div>
          <div className="relative h-72">
            <canvas ref={facialRef} />
          </div>
        </div>
      </div>

      {/* NOVO: Gráfico de Segurança Térmica Exotérmica do PMMA */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-emerald-500/20">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-white text-base sm:text-lg">
              Segurança Térmica: Curva Exotérmica de Polimerização do PMMA (In-Situ vs. Molde Extracorpóreo)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              A reação exotérmica do PMMA atinge ~80 °C em 9–10 min, acima do limiar de lesão térmica cortical (47 °C). No{' '}
              <strong className="text-emerald-300">CranioMold 3D</strong>, toda a cura ocorre fora do paciente, mantendo a
              dura-máter a 36,5 °C.
            </p>
          </div>
          <span className="font-mono-tech text-xs px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
            ΔT Córtex = 0 °C
          </span>
        </div>
        <div className="relative h-64">
          <canvas ref={thermalRef} />
        </div>
      </div>
    </div>
  );
}
