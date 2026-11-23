# SPEC — CranioMold 3D (`projeto-tce`): Plataforma Web & Motor CAD/CAM de Moldes Negativos 3D para Cranioplastia em PMMA

- **Slug:** `projeto-tce-craniomold`
- **Status:** Aprovada — Em Execução (Fase 2/3)
- **Tier:** `mvp` (Nível 2 — Funcional + contratos de API/dados + testes unitários críticos ≥ 60% + Playwright fluxo principal zero erro console)
- **Repositório Alvo:** `https://github.com/aramiskamed/projeto-tce` (público)
- **Deploy Alvo:** Vercel (`vercel.json` + build estático Vite `dist/`) + fallback automático GitHub Pages (`VITE_BASE_PATH=/projeto-tce/`)
- **Evento:** Hack Brasil 2026 — Trilha 04: Saúde & Bem-Estar (`https://hackbrasil.com/`)

---

## 1. Declaração de Conformidade Ética e Regulatória (Itens 5.2 e 6.9 — Hack Brasil 2026)

1. A plataforma opera **exclusivamente sobre phantoms anatômicos matemáticos 100% sintéticos**, sem coleta, armazenamento ou transmissão de exames DICOM ou dados pessoais/sensíveis reais de pacientes (LGPD).
2. Qualquer arquivo `.STL` sintético importado pelo usuário é processado **100% localmente no navegador (client-side)**, nunca enviado a servidores externos.
3. A solução posiciona-se explicitamente como ferramenta computacional de pesquisa e suporte ao planejamento cirúrgico assistido pelo médico (*physician-in-the-loop*), não substituindo diagnóstico, prescrição ou validação regulatória (ANVISA/IEC 62304).

---

## 2. Diagnóstico do Esboço Atual (`projeto-tce-github.zip`) & Melhorias Planejadas

A auditoria técnica do esboço inicial (`index.html` monolítico de 1.947 linhas + `engine/cranio_mold_cli.py`) identificou **6 lacunas críticas de engenharia biomédica e software** que esta evolução resolve integralmente:

| # | Defeito / Limitação no Esboço Atual | Melhoria Arquitetural e Geométrica no MVP |
| :--- | :--- | :--- |
| 1 | **Molde superior sem encaixes (*sockets*) Poka-Yoke** — apenas o molde inferior tem 4 pinos desconectados/auto-intersectantes e extrudados em normais divergentes; o molde não fecha na vida real. | **Sistema Poka-Yoke contínuo, manifold e colinear ao eixo de prensagem `defectDir`**: 4 pinos cônicos (3 padrão + 1 pino mestre assimétrico) esculpidos na malha contínua do molde inferior + **4 cavidades cônicas fêmeas correspondentes** no molde superior, ambos extrudados **estritamente paralelos a `defectDir`** com folga radial exata `clearanceMm` (zero colisão, zero overhang > 45°). |
| 2 | **Normais invertidas, degrau descontínuo na margem e costura aberta no crânio** — `cb.cross(ab)` no browser inverte a orientação contra `(b-a)×(c-a)`; o crânio deixa paredes internas na costura `±π`; o implante tem degrau vertical em `d = 1.0`. | **Gerador de malha estanque em frame tangente local `(t_x, t_y, defectDir)`**: elimina singularidades polares (`phi → 0`), aplica transição $C^1$ contínua controlada por `chamferMm`, orientação `(b-a)×(c-a)` com $V > 0$, crânio como casca espessa fechada (`boundaryEdges === 0`) e validador topológico real. |
| 3 | **Falta de DFM para impressão 3D (FDM)** — STLs saem inclinados ~45° no espaço do crânio e sem canais de escape de PMMA (causando trava hidráulica). | **Rotação rígida própria (`det = +1`) para mesa plana `Z = 0`** na exportação (com matrizes distintas `R_inf` e `R_sup` garantindo cavidades voltadas para `+Z`), **canaleta periférica de rebarba** + **4 canais radiais de escape de PMMA** em milímetros físicos + checagem de mesa FDM (`220×220×250 mm`). |
| 4 | **Performance crítica na animação** — `startRenderLoop` chama `rebuildThreeScene()` 60×/s, recriando ~18.000 triângulos por frame. | **Desacoplamento malha vs. transformações**: geometria anatômica só é reconstruída quando parâmetros geométricos mudam; vista explodida e animação de prensagem operam apenas sobre `mesh.position` a 60 FPS estáveis. |
| 5 | **Sem inspeção interna nem métricas reais** — volume é aproximado por fórmula fixa e o usuário não consegue inspecionar a espessura dentro do molde fechado. | **Corte Transversal Interativo (Clipping Plane Axial/Coronal/Sagital)** em Three.js r170+ + **Auditoria Geométrica Real** (volume assinalado exato, área exata, bounding box na mesa FDM, checagem manifold e gráfico de **Segurança Térmica Exotérmica do PMMA**). |
| 6 | **Monólito sem testes, sem TypeScript e sem Vercel** — Three.js r128 (2021) via CDN, Lucide importado sem uso, sem testes automatizados e sem configuração Vercel. | **Vite 6 + React 19 + TypeScript 5 + Tailwind CSS v4 + Three.js r170+ + Chart.js 4**, zero dependências externas em runtime (fontes locais/sistema + CSP estrita), pronto para **Vercel** (`vercel.json`) + GitHub Pages (`VITE_BASE_PATH`), **Vitest** (≥ 60%), **Pytest** com paridade matemática e exportação **Binary STL + Kit `.ZIP`**. |

---

## 3. Escopo Funcional (Tier `mvp`)

### 3.1 Aba 1 — A História, Evidência Clínica, Segurança Térmica & Economia SUS
Preserva e eleva todos os ativos clínicos verificados do esboço:
1. **Hero & Métricas Verificadas**: 131 mil internações/ano (DATASUS/RBTI 2021), ~30 mil craniectomias/ano com fila >7 anos (MIT Tech Review Brasil), economia >99,2% e custo < R$ 800 compatível com a AIH atual (`04.03.01.001-2`). Imagem ilustrativa preservada via `import.meta.env.BASE_URL` (`public/assets/kit-cranioplastia-3d.jpg`).
2. **Jornada Interativa em 4 Atos** (Jovem de 18 anos pós-TCE motociclístico → Síndrome do Trefinado → Falha da placa de titânio não prototipada com úlcera/infecção → Resolução definitiva com Molde Negativo 3D + PMMA) com botão direto **"Inspecionar este Estágio no Studio 3D →"**.
3. **Painel de Evidência Epidemiológica & Segurança Térmica (3 gráficos Chart.js)**:
   - Reversão da Síndrome do Trefinado pós-PMMA 3D (Maricevich & Campolina, RBCP 2017).
   - Distribuição Anatômica das Fraturas de Face (Zamboni et al., RCBC 2017).
   - **Curva Exotérmica de Polimerização do PMMA (°C × min)**: contrasta moldagem manual *in-situ* (pico ~80 °C ultrapassando o limiar de necrose térmica cortical de 47 °C) vs. cura extracorpórea no **CranioMold 3D** (dura-máter mantida a 36,5 °C).
4. **Simulador Farmacoeconômico SUS (SIGTAP 2026)**: sliders de volume cirúrgico (1–300 casos/ano), escolha do cimento (`07.02.03.138-0` R$ 145,42 ou `07.02.03.008-2` R$ 262,63) e OPME comercial de referência (R$ 120k / R$ 160k / R$ 200k), com tabela oficial SIGTAP.
5. **Roteiro & Teleprompter Fonético do Vídeo Pitch (2min52s)** com cópia para área de transferência e salto direto para a cena do Ato 3 no Studio 3D.

### 3.2 Aba 2 — Studio CAD/CAM 3D Interativo (Núcleo do MVP)
1. **4 Casos Clínicos Sintéticos Pré-Configurados + Customizador de Falha**:
   - `craniectomy18`: Hemicraniectomia Descompressiva Fronto-Parieto-Temporal (156 cm²) — padrão (unilateral).
   - `bifrontal`: Craniectomia Descompressiva Bifrontal Pós-TCE Difuso (118 cm²) — bilateral (`isBilateral: true`).
   - `frontal`: Afundamento Frontal & Rebordo Supraorbitário (54 cm²) — unilateral.
   - `zygoma`: Sequela Complexo Zigomático-Orbitário / Malar (28 cm²) — unilateral.
   - **Customizador Paramétrico de Falha**:
     - Para casos unilaterais (`!isBilateral`): seleção de Hemisfério (`Direito` / `Esquerdo`), Escala da Falha (`70%–120%`), Deslocamento Tangencial Horizontal `uShiftMm` (`-12` a `+12 mm`) e Vertical `vShiftMm` (`-10` a `+10 mm`), recalculando o espelhamento sagital contralateral (`x → -x`) e o molde negativo em tempo real.
     - Para casos bilaterais (`isBilateral === true`, ex.: `bifrontal`): a troca de hemisfério e o deslocamento lateral `uShiftMm` ficam bloqueados/travados em simetria (`0 mm`), preservando a linha média; na Etapa 2, o HUD e o algoritmo declaram explicitamente **"Reconstrução por Superfície Simétrica Paramétrica Bilateral"** (uma vez que ambos os ossos frontais estão ausentes e não há osso contralateral íntegro para espelhar).
2. **Pipeline Cirúrgico em 4 Etapas**:
   - Etapa 1: TC Fase Óssea — crânio sintético modelado como **casca espessa fechada** (tábua externa + tábua interna costuradas na borda da craniectomia, preservando `boundaryEdges === 0`).
   - Etapa 2: Plano Sagital Mediano & Reconstrução Anatômica (espelhamento contralateral `x → -x` nos casos unilaterais; reconstrução paramétrica bilateral simétrica em `bifrontal`).
   - Etapa 3: Molde Negativo Bipartido Escavado (Inferior + Superior com 4 pinos/cavidades Poka-Yoke paralelos a `defectDir`, canaleta periférica de rebarba e 4 canais radiais de escape de PMMA até a borda externa).
   - Etapa 4: Kit Explodido Completo + Exportação Binary STL / ZIP.
3. **Parâmetros Geométricos & DFM em Tempo Real**:
   - Abertura do Molde / Vista Explodida (`0–100%`) + Animação suave 60 FPS ("Animar Prensagem Cirúrgica") sem reconstrução de malha.
   - Espessura Alvo do Implante PMMA (`2.8–5.0 mm`, passo `0.2 mm`, padrão `4.0 mm`).
   - Chanfro Marginal Anti-Úlcera (`0.5–3.0 mm`, passo `0.5 mm`, padrão `2.0 mm`).
   - Folga Radial Poka-Yoke (`0.20–0.50 mm`, passo `0.05 mm`, padrão `0.35 mm`).
   - Toggle **Marcadores de Drenagem Epidural & Fixação** (micro-recessos guia hemisféricos na cavidade do molde).
   - Opção **Orientação dos Arquivos Exportados** (desacoplada do viewport 3D): `Plana na Mesa FDM (Z = 0)` (padrão para fatiadores) vs. `Coordenadas Anatômicas`. O viewport 3D sempre exibe a cena em coordenadas anatômicas para preservar vista explodida, prensagem e cortes transversais.
4. **Ferramentas de Inspeção Avançadas**:
   - **Corte Transversal em Tempo Real (Clipping Plane)**: `Desligado`, `Axial (Y)`, `Coronal (Z)`, `Sagital (X)` + slider de deslocamento do plano.
   - **Modo Comparativo Clínico (Ato 2 vs. Ato 3)**: Placa de Titânio Não Prototipada (hotspots vermelhos de pressão/úlcera) vs. Implante PMMA Chanfrado.
   - **Presets de Câmera (`OrbitControls`)**: Frontal, Lateral, Superior, Posterior e Resetar 3D + toggle Wireframe.
5. **Auditoria Real de Malha & Impressão 3D (DFM)**:
   - Calculada sobre a geometria real (com `bboxMm` e `fitsStandardFdmBed` sempre avaliados na orientação de mesa plana `Z = 0`, `X ≤ 220 mm`, `Y ≤ 220 mm`, `Z ≤ 250 mm`):
     - `Malha Estanque (Manifold)`: `boundaryEdges === 0` e `nonManifoldEdges === 0`.
     - `Normais Externas`: `signedVolumeCm3 > 0`.
     - `Cabe na Mesa FDM`: dimensões reais `X × Y × Z (mm)`.
     - `Espessura Estrutural Mínima`: `minWallThicknessMm >= 8.0 mm` (inclusive sob o fundo das cavidades Poka-Yoke).
   - Telemetria real: área reconstruída (cm²), volume real do implante PMMA (cm³) e massa (g), kits de cimento SIGTAP (`07.02.03.138-0`), massa estimada de PETG (g), tempo estimado de impressão FDM e custo total SUS (R$).
6. **Exportação Real de Artefatos (Binary STL + ZIP)**:
   - `Baixar Kit Cirúrgico Completo (.ZIP)`: `molde_negativo_inferior_<case>.stl`, `molde_negativo_superior_<case>.stl`, `implante_positivo_pmma_<case>.stl`, `laudo_auditoria_<case>.json` e `protocolo_impressao_petg_<case>.txt`.
   - Botões individuais para cada `.STL` binário e para o `.JSON` de auditoria.
   - **Importador `.STL` Sintético** (ASCII & Binary, client-side, limite 25 MB / 500k triângulos): valida estanqueidade e dimensões, permite ativar prévia de **Espelhamento Sagital** sobre a malha importada e botão de retorno ao phantom paramétrico.
7. **Modal de Protocolo de Impressão 3D & Esterilização**:
   - Parâmetros PETG (camada 0,16 mm, 4–5 perímetros, 35% gyroid / 100% nas paredes da cavidade, zero suportes internos).
   - Alerta de esterilização em baixa temperatura (ETO ou plasma de H₂O₂ — **nunca autoclavar PETG a vapor 121 °C** devido à $T_g \approx 80\text{ °C}$).
   - Checklist intraoperatório (barreira estéril lubrificante, prensagem progressiva com escape de rebarba, cura/resfriamento extracorpóreo completo).

### 3.3 Motor CLI Python (`engine/cranio_mold_cli.py`)
- Paridade matemática exata com o motor TypeScript (mesma convenção de eixos, mesmo frame tangente local, mesmas constantes Poka-Yoke, canais de escape, rotação `R_inf` / `R_sup` com `det = +1` e mesmo schema JSON v2.0).
- Zero dependências externas obrigatórias em runtime (Python 3 stdlib).
- Artefatos em `samples/` regenerados e auditados automaticamente.

---

## 4. Contratos de Dados, Convenção de Eixos & Matemática CAD (TS ↔ Python)

### 4.1 Convenção Canônica de Eixos (Unificada entre TS, Three.js e Python)
- **Espaço Anatômico (`Y`-up, em milímetros):**
  - `+X`: Lateral Direito do crânio (`-X`: Lateral Esquerdo; plano sagital mediano em `X = 0`).
  - `+Y`: Superior / Crânio-caudal (vértice do crânio em `+Y`; cortes **Axiais** são planos `Y = const`).
  - `+Z`: Anterior / Facial (região frontal/face em `+Z`, occipital em `-Z`; cortes **Coronals** são planos `Z = const`; cortes **Sagitais** são planos `X = const`).
- **Espaço de Impressão FDM (`Z`-up, aplicado exclusivamente na exportação e no cálculo de `bboxMm`/`fitsStandardFdmBed`):**
  - Mesa de impressão no plano `Z = 0`; cavidade de cada molde voltada para `+Z`; `X, Y` contidos na mesa `220 × 220 mm` e altura `Z ≤ 250 mm`.

### 4.2 Interfaces TypeScript (e Schema JSON v2.0 idêntico no Python)
```ts
export type CaseId = 'craniectomy18' | 'bifrontal' | 'frontal' | 'zygoma';
export type Hemisphere = 'right' | 'left';
export type ClipAxis = 'none' | 'axial' | 'coronal' | 'sagittal';

export interface DefectCaseConfig {
  id: CaseId;
  title: string;
  shortLabel: string;
  nominalAreaCm2: number;
  thetaCenter: number;   // azimute em torno de +Y a partir de +Z (0 = anterior, +PI/2 = direito)
  phiCenter: number;     // ângulo polar a partir de +Y (polo superior = 0, equador = PI/2)
  radiusUMm: number;     // semi-eixo horizontal do defeito no plano tangente local (mm)
  radiusVMm: number;     // semi-eixo vertical do defeito no plano tangente local (mm)
  domeRx: number;        // semi-eixo X médio-lateral (mm)
  domeRy: number;        // semi-eixo Y crânio-caudal / vertical (mm)
  domeRz: number;        // semi-eixo Z ântero-posterior (mm)
  fixationPlates: number;
  isBilateral: boolean;  // true para bifrontal
}

export interface MoldParameters {
  caseId: CaseId;
  hemisphere: Hemisphere;       // ignorado (travado em simetria) se isBilateral === true
  defectScale: number;          // clamp [0.70, 1.20]
  uShiftMm: number;             // clamp [-12, 12] (0 se isBilateral === true)
  vShiftMm: number;             // clamp [-10, 10]
  thicknessMm: number;          // clamp [2.8, 5.0]
  chamferMm: number;            // clamp [0.5, 3.0]
  clearanceMm: number;          // clamp [0.20, 0.50]
  includeDrainageDimples: boolean;
}

export interface ExportOptions {
  bedFlat: boolean;             // true = rotaciona cada peça para Z=0 (det=+1); false = anatômico
}

export interface MeshData {
  positions: Float32Array;      // 9 floats por triângulo (v0, v1, v2)
  normals: Float32Array;        // 9 floats por triângulo (unitárias externas)
  triangleCount: number;
}

export interface MeshTopologyAudit {
  triangleCount: number;
  signedVolumeCm3: number;
  surfaceAreaCm2: number;
  bboxMm: { x: number; y: number; z: number }; // sempre avaliado em orientação Z=0
  minWallThicknessMm: number;                  // distância mínima contact <-> backplane
  boundaryEdges: number;
  nonManifoldEdges: number;
  isWatertight: boolean;
  hasOutwardNormals: boolean;
  fitsStandardFdmBed: boolean;                 // bboxMm.x <= 220 && bboxMm.y <= 220 && bboxMm.z <= 250
}

export interface SusEconomicsBreakdown {
  aihProcedureCode: '04.03.01.001-2';
  aihReimbursementBrl: number;                 // 1322.12
  cementSigtapCode: '07.02.03.138-0' | '07.02.03.008-2';
  cementUnitCostBrl: number;                   // 145.42 ou 262.63
  cementKits: number;
  cementTotalBrl: number;
  miniplateSigtapCode: '07.02.05.048-2';
  miniplateCostBrl: number;                    // 361.81 * fixationPlates
  petgGrams: number;
  petgCostBrl: number;                         // R$ 0.17 / g
  estimatedPrintHours: number;
  sterilizationCostBrl: number;                // 60.00 (ETO / H2O2)
  estimatedTotalKitCostBrl: number;
  commercialOpmeRefBrl: number;                // padrão 160000
  savingsVsCommercialPct: number;
  fitsWithinAih: boolean;
}

export interface SurgicalKitAudit {
  schemaVersion: '2.0';
  syntheticCompliance: string;
  generatedAtIso: string;
  parameters: MoldParameters;
  exportOptions: ExportOptions;
  implant: MeshTopologyAudit;
  lowerMold: MeshTopologyAudit;
  upperMold: MeshTopologyAudit;
  economics: SusEconomicsBreakdown;
}
```

### 4.3 Matemática CAD da Grade Local, Pinos Poka-Yoke, Canais e Rotação `Z = 0` (Paridade TS ↔ Python)

1. **Frame Tangente Ortonormal Local `(t_x, t_y, defectDir)` (Eliminação de Singularidade Polar):**
   - A partir do centro efetivo `(thetaEff, phiEff)` do defeito (com sinal de `thetaCenter` invertido se `hemisphere === 'left' && !isBilateral`, e `phiEff` clamped em `[0.42, 1.85] rad` para nunca aproximar os polos), calcula-se o ponto central na superfície craniana `C` e a normal unitária externa `defectDir = normalize(C)` (ou gradiente da superfície).
   - Constrói-se a base ortonormal direita:
     - `worldUp = (0, 1, 0)` (fallback `(0, 0, 1)` se `|dot(defectDir, worldUp)| > 0.98`)
     - `t_x = normalize(cross(worldUp, defectDir))`
     - `t_y = normalize(cross(defectDir, t_x))` (garantindo `cross(t_x, t_y) === defectDir`, `det = +1`).
   - Cada ponto da grade `(u, v)` em milímetros sobre o plano tangente local (`u ∈ [-halfU, +halfU]`, `v ∈ [-halfV, +halfV]`) é projetado sobre a superfície craniana anatômica ao longo de raios convergentes a partir da origem craniana `O`, com **clamp angular efetivo `α ≤ 68°`** em relação a `defectDir` (`dot(rayDir, defectDir) ≥ cos(68°) ≈ 0.375`), garantindo:
     - **Zero singularidade polar** (`phi → 0` nunca ocorre);
     - **Projeção estritamente injetiva** sobre o backplane plano (zero dobramento/auto-interseção);
     - **Compatibilidade garantida com mesa FDM `220 × 220 mm`** mesmo em `craniectomy18` com `defectScale = 1.20`.

2. **Dimensões Físicas da Flange, Canaleta, Canais de Escape e Pinos (em mm — Independentes de `defectScale`):**
   - Semi-eixos efetivos do defeito: `ru = radiusUMm * defectScale`, `rv = radiusVMm * defectScale` (limitados para respeitar `α ≤ 68°` e `2 * halfU <= 205 mm`).
   - Margem física da flange além da elipse orgânica `d(u, v) = 1.0`: **`flangeMarginMm = 19.0 mm`**, logo `halfU = ru + 19.0`, `halfV = rv + 19.0`.
   - Distância física assinada à borda da falha (aproximada em mm): `signedDistMm = (d(u, v) - 1.0) * rLocalMm`, onde `rLocalMm` é o raio da elipse na direção polar `(u, v)`.
   - **Resolução da grade regular**: `segU = 96`, `segV = 80` (célula `~1.1–2.1 mm` — ≥ 4–8 amostras por diâmetro de pino e ≥ 2–3 amostras na canaleta).
   - **Chanfro Marginal $C^1$ Anti-Úlcera e Espessura Exata `thicknessMm`:**
     - Define-se `smoothstep(x) = x*x*(3 - 2*x)` para `x ∈ [0, 1]`.
     - Largura da faixa de chanfro em mm: `wChamferMm = max(1.5, chamferMm * 2.5)`.
     - Para `signedDistMm < 0` (interior da cavidade): `t = clamp(-signedDistMm / wChamferMm, 0, 1)`, `blend = smoothstep(t)`.
     - **Deslocamentos ao longo de `defectDir`** (garantindo desmoldagem livre de undercuts e espessura exata no platô):
       - Face externa do implante / cavidade do Molde Superior: `hSupCavity = +0.15 * thicknessMm * blend`
       - Face interna do implante / cavidade do Molde Inferior: `hInfCavity = -0.85 * thicknessMm * blend`
       - **Invariante verificável:** em `signedDistMm = 0` (`d = 1.0`), `blend = 0` ⇒ `hSupCavity = hInfCavity = 0` (**continuidade $C^1$, zero degrau vertical**). No platô (`blend = 1`), `hSupCavity - hInfCavity = 0.15*T - (-0.85*T) = 1.00 * thicknessMm` (**espessura exata!**).
     - Se `includeDrainageDimples === true`: 6 micro-calotas hemisféricas suaves (raio `1.8 mm`, altura `0.6 mm`) no interior do platô (`d < 0.72`) para guiar perfurações pós-cura de drenagem epidural.
   - **Canaleta Periférica de Rebarba & 4 Canais Radiais de Escape de PMMA:**
     - Canaleta anular em `signedDistMm ∈ [2.0, 5.0] mm`, profundidade `1.0 mm` (`-1.0 mm` no molde inferior, `+1.0 mm` no molde superior com perfil cosseno suave).
     - 4 canais radiais de largura `4.0 mm` ao longo dos eixos `u = 0` (`v > 0` e `v < 0`) e `v = 0` (`u > 0` e `u < 0`), estendendo-se **da canaleta até a borda externa da grade (`±halfU`, `±halfV`)**, com a saia lateral conectando diretamente os vértices da borda deslocada (`boundaryEdges === 0`).
   - **4 Pinos Cônicos Poka-Yoke (Molde Inferior) & 4 Cavidades Fêmeas (Molde Superior) — Estritamente Paralelos a `defectDir`:**
     - Centros nos 4 cantos da flange, posicionados com segurança física em `(±(halfU - 8.0), ±(halfV - 8.0))` — sempre fora da canaleta (`>= 8.0 mm` além da borda da falha em todos os casos, inclusive `zygoma` a `0.70`) e sempre `>= 8.0 mm` dentro da borda externa da grade (zero truncamento!).
     - Constantes fixas TS ↔ Python:
       - `pinHeight = 6.5 mm` (profundidade da cavidade fêmea: `socketDepth = 7.3 mm`, folga axial `0.8 mm`).
       - 3 pinos padrão: `rBase = 3.8 mm`, `rTip = 2.4 mm`.
       - 1 pino mestre assimétrico (canto `(+u, -v)`): `rBase = 5.0 mm`, `rTip = 3.4 mm`.
       - **Perfil cônico frustum suave `coneProfile(r, rBase, rTip)`**: `1.0` se `r <= rTip`; `0.0` se `r >= rBase`; `(rBase - r) / (rBase - rTip)` no tronco cônico.
       - **Molde Inferior (pinos machos):** `+pinHeight * coneProfile(r_k, rBase_k, rTip_k)` ao longo de `+defectDir`.
       - **Molde Superior (cavidades fêmeas):** `+(pinHeight + 0.8) * coneProfile(r_k, rBase_k + clearanceMm, rTip_k + clearanceMm)` ao longo de `+defectDir` (reentrância para dentro da tampa superior).
       - **Invariante:** distância lateral `r_k` é medida perpendicularmente a `defectDir` no plano `(u, v)`, e a extrusão é **estritamente ao longo de `+defectDir`**. Assim, para qualquer ponto `(u, v)` da flange e qualquer deslocamento rígido `s >= 0` ao longo de `+defectDir`, `hSup(u, v) + s - hInf(u, v) > 0` nos pinos (folga radial exata `= clearanceMm`, zero colisão!).

3. **Backplane Plano, Espessura Estrutural Mínima & Winding Manifold:**
   - Calcula-se `minProjInf = min_{u,v} dot(P_inf_contact(u,v), defectDir)` e `maxProjSup = max_{u,v} dot(P_sup_contact(u,v), defectDir)`.
   - Backplane Inferior: plano constante `proj = minProjInf - 9.0 mm` (garantindo `minWallThicknessMm >= 9.0 mm > 8.0 mm` em toda a superfície).
   - Backplane Superior: plano constante `proj = maxProjSup + 9.0 mm` (garantindo `minWallThicknessMm >= 9.0 mm > 8.0 mm` inclusive sobre o fundo das cavidades fêmeas de `7.3 mm`!).
   - **Winding explícito (garantindo `signedVolumeCm3 > 0` em ambos):**
     - **Molde Inferior:** `contact` tem normal externa `+defectDir` (`(p00, p10, p11)` + `(p00, p11, p01)` em `(u, v)` crescente com `t_x × t_y = +defectDir`); `backplane` tem normal externa `-defectDir`; 4 saias laterais ligando anel `contact` ao anel `backplane`.
     - **Molde Superior:** `backplane` está no lado `+defectDir` (normal externa `+defectDir`) e `contact` está no lado `-defectDir` (normal externa `-defectDir`, winding invertido); 4 saias laterais ligando anel `backplane` ao anel `contact`.
     - **Implante PMMA:** casca fechada construída sobre a máscara de células ativas (`d <= 1.0`), com face externa (`hSupCavity`, normal `+defectDir`), face interna (`hInfCavity`, normal `-defectDir`) e paredes laterais apenas nas arestas de fronteira da máscara.

4. **Rotação Rígida Própria (`det = +1`) para Mesa FDM (`Z = 0`):**
   - Aplicada sobre os vértices em precisão `float64` **antes** da quantização `Float32Array`:
     - **Molde Inferior (`R_inf`):** `p' = (dot(p, t_x), dot(p, t_y), dot(p, defectDir))` seguido de translação em `Z` para `min(z) = 0`. Como `det([t_x; t_y; defectDir]) = +1`, as normais externas são preservadas e o backplane plano fica em `Z = 0` olhando para `-Z`, com a cavidade e os 4 pinos voltados para `+Z`!
     - **Molde Superior (`R_sup`):** `p' = (dot(p, t_x), -dot(p, t_y), -dot(p, defectDir))` seguido de translação em `Z` para `min(z) = 0`. Como `det([t_x; -t_y; -defectDir]) = (-1)*(-1)*(+1) = +1`, as normais externas são preservadas e o backplane plano superior fica em `Z = 0` olhando para `-Z`, com a cavidade e os 4 encaixes voltados para `+Z`!
     - **Implante Positivo PMMA (`R_inf`):** aplica `R_inf` + translação `min(z) = 0` (domo convexo voltado para `+Z`).

### 4.4 Regra Canônica do Validador Topológico (`meshAudit.ts` / `cranio_mold_cli.py`)
- Cada vértice `(x, y, z)` passa por normalização `-0.0 → +0.0` e quantização inteira em passos de `1e-4 mm` (`Math.round(v * 10000)`).
- Triângulos degenerados (dois ou mais vértices coincidentes após quantização ou área `< 1e-8 mm²`) são contabilizados/rejeitados.
- Para cada aresta direcionada `(a, b)` de cada triângulo, contabiliza-se sua multiplicidade no mapa de arestas; uma malha é considerada **estanque e manifold (`isWatertight === true`)** se e somente se:
  1. `triangleCount >= 4`;
  2. Toda aresta direcionada `(a, b)` aparece exatamente `1` vez (`nonManifoldEdges === 0`);
  3. Toda aresta `(a, b)` possui sua aresta oposta `(b, a)` exatamente `1` vez (`boundaryEdges === 0`);
  4. `signedVolumeCm3 > 0` (`hasOutwardNormals === true`).

---

## 5. Arquitetura de Diretórios no Repositório `aramiskamed/projeto-tce`

```text
projeto-tce/
├── index.html                        # Entry point Vite (sem CDN externa; fontes sistema/locais)
├── package.json                      # Vite 6, React 19, TS 5, Tailwind v4, Three.js r170+, Chart.js 4, Vitest, ESLint
├── tsconfig.json                     # strict: true, noUnusedLocals, noUnusedParameters
├── vite.config.ts                    # base: process.env.VITE_BASE_PATH ?? '/', Vitest v8 coverage >= 60%
├── vercel.json                       # outputDirectory: dist, headers CSP/nosniff/DENY/no-referrer, SPA rewrite excluindo /assets/*
├── eslint.config.js                  # ESLint flat config TS + React Hooks
├── public/
│   └── assets/
│       ├── kit-cranioplastia-3d.jpg  # Preservado do esboço (acessado via import.meta.env.BASE_URL)
│       └── espelhamento-sagital-cad.jpg
├── src/
│   ├── main.tsx
│   ├── App.tsx                       # Navegação 2 abas, header, toast, footer regulatório
│   ├── index.css                     # Tailwind v4 + stack tipográfica local/sistema (zero CDN)
│   ├── data/
│   │   ├── clinicalData.ts           # 4 atos da paciente, séries RBCP/RCBC, roteiro fonético
│   │   └── syntheticCases.ts         # 4 phantoms sintéticos (craniectomy18, bifrontal, frontal, zygoma)
│   ├── engine/
│   │   ├── cranialMath.ts            # Superfície craniana Y-up, frame tangente local, campo de distância
│   │   ├── meshBuilder.ts            # Construtor manifold (crânio fechado, implante, moldes Poka-Yoke + vents, R_inf/R_sup)
│   │   ├── meshAudit.ts              # Deduplicação canônica 1e-4mm, volume assinalado, área, bbox Z=0, manifold check
│   │   ├── stlCodec.ts               # Binary STL encoder, parser binário-primeiro endurecido, empacotador ZIP CRC-32
│   │   └── economics.ts              # Cálculo SIGTAP 2026 + curva exotérmica PMMA
│   ├── components/
│   │   ├── StoryTab.tsx              # Hero, 4 atos, 3 gráficos, simulador SIGTAP, roteiro fonético
│   │   ├── ClinicalCharts.tsx        # 3 gráficos Chart.js responsivos com destroy() no cleanup
│   │   ├── Studio3DTab.tsx           # Layout Studio CAD, controles paramétricos, auditoria, exportação
│   │   ├── ThreeViewport.tsx         # Cena Three.js r170+, OrbitControls, Clipping Plane, animação 60 FPS
│   │   └── PrintProtocolModal.tsx    # Guia PETG, esterilização ETO/H2O2 e checklist cirúrgico
│   └── __tests__/
│       ├── meshBuilder.test.ts       # Manifold, V>0, não-colisão 3D pino×cavidade, wall>=8mm, Z=0
│       ├── stlCodec.test.ts          # Round-trip Binary STL, header "solid" binário, limites/NaN/1e5, ZIP CRC-32
│       └── economics.test.ts         # Cálculos SIGTAP, economia %, curva térmica PMMA
├── engine/
│   └── cranio_mold_cli.py            # Motor CLI Python 3 puro em paridade matemática e JSON v2.0 com TS
├── tests/
│   └── test_cranio_mold_cli.py       # Testes pytest da CLI Python (manifold, V>0, Z=0, JSON schema v2.0)
├── samples/                          # STLs binários (Z=0) + audit JSON v2.0 pré-gerados e auditados
├── docs/
│   ├── ROTEIRO_VIDEO_AVATAR.md
│   ├── specs/projeto-tce-craniomold/SPEC.md
│   └── changelog.d/
├── scripts/
│   └── quality_gate.sh               # Quality gate determinístico (ESLint, tsc, Vitest, Vite build, Ruff, Pytest)
└── .github/workflows/
    └── deploy-pages.yml              # Build Vite com VITE_BASE_PATH=/projeto-tce/ -> GitHub Pages
```

---

## 6. Segurança, Limites, Deploy Vercel e Casos de Borda

1. **Upload de `.STL` (Client-side Anti-DoS & Parsing Endurecido)**:
   - Rejeita arquivos `> 25 MB`.
   - **Detecção Binário-Primeiro:** verifica `byteLength >= 84 && 84 + triCount * 50 === byteLength` **antes** de testar ASCII (evita falso positivo em headers binários que começam com `"solid"`).
   - Valida `1 <= triangleCount <= 500_000` (rejeita STL vazio `0` triângulos).
   - Valida que toda coordenada satisfaz `Number.isFinite(c) && Math.abs(c) <= 1e5` (evita overflow em produtos vetoriais).
   - Parser ASCII linear baseado em varredura de índices/tokens sem `.split('\n')` massivo nem regex sujeita a backtracking.
   - Zero `innerHTML` com dados do arquivo (prevenção XSS).
2. **Headers de Segurança & Roteamento (`vercel.json`)**:
   - Headers explícitos em `/(.*)`:
     - `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'`
     - `X-Content-Type-Options: nosniff`
     - `X-Frame-Options: DENY`
     - `Referrer-Policy: no-referrer`
   - Rewrite SPA aplica-se apenas a rotas sem extensão de arquivo (excluindo `/assets/*` e `/samples/*`), garantindo HTTP 404 real para assets inexistentes.
3. **Estabilidade WebGL & Memória**:
   - `dispose()` explícito de todas as `BufferGeometry` e `Material` ao trocar parâmetros ou desmontar o componente React (`useEffect` cleanup).
   - Fallback gracioso sem crash se WebGL estiver indisponível.
4. **Deploy Vercel**:
   - Caso `VERCEL_TOKEN` não esteja autenticado no ambiente durante a Fase 4, o repositório será entregue com `vercel.json` validado, build `dist/` verde e GitHub Pages ativo em `https://aramiskamed.github.io/projeto-tce/`, acompanhado de link 1-clique para importar/publicar na conta Vercel do usuário (ou deploy imediato via CLI assim que o token/sessão Vercel for fornecido).

---

## 7. Estratégia de Testes & Critérios de Aceitação (Tier `mvp`)

1. **Testes Unitários TypeScript (Vitest + v8 coverage ≥ 60% em `src/engine/`)**:
   - Para todos os 4 casos (`craniectomy18`, `bifrontal`, `frontal`, `zygoma`), hemisférios aplicáveis e extremos (`defectScale = 0.70` e `1.20`): `skull`, `implant`, `lowerMold` e `upperMold` possuem `isWatertight === true` (`boundaryEdges === 0`, `nonManifoldEdges === 0`), `hasOutwardNormals === true` (`signedVolumeCm3 > 0`), `minWallThicknessMm >= 8.0` e `fitsStandardFdmBed === true`.
   - **Verificação 3D de Acoplamento & Não-Colisão Poka-Yoke:** valida que na posição fechada (`s = 0`) e ao longo da trajetória de fechamento rígido em `defectDir` (`s ∈ {0, 1, 3, 6} mm`), não existe interpenetração entre `lowerMold` e `upperMold` (`minGapMm > 0` nas regiões dos 4 pinos e da cavidade) para toda a faixa `clearanceMm ∈ [0.20, 0.50]`.
   - **Verificação de Orientação `Z = 0` (`det = +1`):** em `lowerMold` e `upperMold` exportados com `bedFlat = true`, `min(z) ≈ 0.0 mm` (±0.01 mm), `signedVolumeCm3 > 0`, e os vértices do backplane repousam em `z ≈ 0`.
   - **Verificação de Espessura Exata & Chanfro $C^1$:** platô central tem espessura igual a `thicknessMm` (±0.05 mm) e margem `d = 1.0` tem salto `0.0 mm`.
   - **Parser & Encoder STL / ZIP:** round-trip Binary STL (`<= 1e-4 mm`); binário com header `"solid"` aceito corretamente; rejeita STL vazio, `> 25 MB`, `NaN`, `|coord| > 1e5`; ZIP gera cabeçalhos `PK\x03\x04`/`PK\x05\x06` e CRC-32 válidos.
   - **Economia & Curva Térmica:** valores SIGTAP exatos e pico térmico Freehand > 75 °C vs. CranioMold 3D dura ≤ 37 °C.
2. **Testes Unitários Python (Pytest + cov ≥ 60% em `engine/`)**:
   - CLI gera STLs binários estanques (`boundaryEdges == 0`, `signedVolumeCm3 > 0`, `min(z) ≈ 0`) e `audit_<case>.json` no schema v2.0 para os 4 casos.
3. **Quality Gate (`./scripts/quality_gate.sh mvp`)**:
   - `npm run lint` + `npx tsc --noEmit` + `npm run test:coverage` (≥ 60%) + `npm run build` + `ruff check` + `pytest --cov=engine --cov-fail-under=60`.
4. **Validação Visual & E2E (Playwright MCP)**:
   - Desktop (1280×800) e Mobile (390×844): navegação Aba 1 (Hero, 4 Atos, 3 gráficos, Simulador SIGTAP, Teleprompter) e Aba 2 (WebGL renderizado, 4 etapas, troca de caso inclusive `bifrontal`, customizador, Clipping Plane, modo Titânio, modal protocolo de impressão, exportação STL/ZIP) com **zero erros de console e zero falhas HTTP 4xx/5xx**.

---

## 8. Parecer Adversário

Auditoria conduzida em contexto isolado (`adversarial_reviewer`, regra anti-nitpicking estrita) sobre a primeira revisão deste documento. Todos os **5 `[BLOCKER]`**, **6 `[MAJOR]`** e **2 `[MINOR]`** foram incorporados integralmente nesta versão:

- **`[BLOCKER #1]` — Colisão de pinos Poka-Yoke em normais divergentes:** Corrigido na Seção 4.3 — os 4 pinos e 4 cavidades fêmeas agora são extrudados **estritamente paralelos ao eixo único `defectDir`**, eliminando trava de montagem e overhangs FDM.
- **`[BLOCKER #2]` — Inversão de normais no Molde Superior e rotação `Z = 0` (`det = +1`):** Corrigido na Seção 4.3 — winding do prisma invertido explicitamente no Molde Superior e definidas matrizes próprias distintas `R_inf = [t_x; t_y; +defectDir]` e `R_sup = [t_x; -t_y; -defectDir]` (ambas `det = +1`), além da orientação explícita do implante PMMA.
- **`[BLOCKER #3]` — Singularidade polar `phi → 0` e auto-interseção do backplane:** Corrigido na Seção 4.3 — grade `(u, v)` parametrizada em **frame tangente ortonormal local `(t_x, t_y, defectDir)`** em milímetros com clamp angular `α ≤ 68°`.
- **`[BLOCKER #4]` — Colisão pino × canaleta × cavidade em `zygoma` e sub-amostragem `64×52`:** Corrigido na Seção 4.3 — margens da flange (`+19 mm`), canaleta (`+2..+5 mm`) e centros dos pinos definidos em **milímetros físicos absolutos** (independentes de `defectScale`) com grade elevada para `96 × 80`.
- **`[BLOCKER #5]` — Degrau vertical em `d = 1.0`, erro de `+0.30 mm` na espessura e `chamferMm` não utilizada:** Corrigido na Seção 4.3 — `chamferMm` controla a transição `smoothstep` $C^1$ levando `hInfCavity` e `hSupCavity` a `0.0` em `d = 1.0`, com platô exatamente igual a `thicknessMm` (`+0.15T` e `-0.85T`).
- **`[MAJOR #6]` — Assimetria na folga Poka-Yoke e constantes ausentes:** Corrigido na Seção 4.3 — constantes fixadas (`pinHeight = 6.5`, `rBase = 3.8/5.0`, `rTip = 2.4/3.4`, `socketDepth = 7.3`) com `+clearanceMm` apenas nas 4 cavidades fêmeas.
- **`[MAJOR #7]` — Caso bilateral `bifrontal` sem contrato de hemisfério/espelhamento:** Corrigido nas Seções 3.2 e 4.2 — hemisfério e deslocamento lateral travados quando `isBilateral === true`, e Etapa 2 explicitamente nomeada como reconstrução paramétrica simétrica bilateral.
- **`[MAJOR #8]` — Inconsistência de eixos `Y`-up/`Z`-up, acoplamento `exportBedFlat` e schema JSON:** Corrigido nas Seções 4.1 e 4.2 — eixos unificados (`Y`-up anatômico, `Z`-up na exportação/auditoria), `ExportOptions` desacoplada de `MoldParameters`, `SusEconomicsBreakdown` definida e schema JSON v2.0 unificado TS ↔ Python.
- **`[MAJOR #9]` — Deduplicação `Float32` em `meshAudit.ts` e teste de colisão 3D:** Corrigido nas Seções 4.4 e 7 — normalização `-0.0 → +0.0`, quantização `1e-4 mm`, rotação em `float64` pré-quantização, teste de não-colisão 3D pino×cavidade na trajetória de fechamento e verificação direta de `minWallThicknessMm >= 8.0`.
- **`[MAJOR #10]` — Parser STL vulnerável a header `"solid"` binário, STL vazio e overflow:** Corrigido na Seção 6 — detecção binário-primeiro, `1 <= triCount <= 500_000`, `|coord| <= 1e5 mm` e parser ASCII linear.
- **`[MAJOR #11]` — Conflito de `base` path Vercel vs. GitHub Pages e CSP/fontes CDN:** Corrigido nas Seções 5 e 6 — `VITE_BASE_PATH`, `import.meta.env.BASE_URL`, fontes locais/sistema, CSP estrita e headers explícitos em `vercel.json` excluindo `/assets/*` do rewrite SPA.
- **`[MINOR #12 e #13]` — Casca fechada no crânio da Etapa 1 e continuidade da saia nos canais de escape:** Corrigidos nas Seções 3.2 e 4.3.
