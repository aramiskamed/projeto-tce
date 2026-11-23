# CranioMold 3D · Prototipagem Craniofacial em Molde Negativo de PMMA (`projeto-tce`)

**Submissão Hack Brasil 2026 — Trilha 04: Saúde & Bem-Estar**  
Repositório Oficial: [`https://github.com/aramiskamed/projeto-tce`](https://github.com/aramiskamed/projeto-tce)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Faramiskamed%2Fprojeto-tce&project-name=craniomold-3d&repository-name=projeto-tce)

> **Declaração de Conformidade Ética e Regulatória (Itens 5.2 e 6.9 do Regulamento Hack Brasil 2026):**  
> Esta plataforma opera **exclusivamente sobre phantoms anatômicos matemáticos 100% sintéticos**, sem qualquer coleta, upload ou exposição de exames DICOM ou dados pessoais reais de pacientes. Todo o processamento 3D e eventual inspeção de arquivos `.STL` ocorre **100% no navegador (client-side)**. Trata-se de ferramenta computacional aberta de pesquisa e suporte ao planejamento cirúrgico assistido pelo médico (*physician-in-the-loop*).

---

## 1. O Problema Real no SUS

- **131.015 internações/ano** no SUS por traumatismo cranioencefálico (TCE) e fraturas craniofaciais ([Carteri & Silva, *RBTI*, 2021](https://www.scielo.br/j/rbti/a/K5yzpQH78f4FmwmjPjjppCm/?lang=pt)).
- **~30.000 brasileiros/ano** passam por **craniectomia descompressiva** para sobreviver ao edema cerebral pós-TCE ou AVC maligno e enfrentam **filas superiores a 7 anos** por uma prótese sob medida, sofrendo com deformidade severa e **síndrome do trefinado** ([MIT Tech Review Brasil, 2023](https://mittechreview.com.br/proteses-cranianas-por-impressao-3d-realidade-acessivel-aos-pacientes-do-sus/); [Maricevich & Campolina, *RBCP*, 2017](https://www.scielo.br/j/rbcp/a/MTFjPtbdLVRJKL5r98Nwzss/?lang=pt)).
- **Abismo financeiro & risco do improviso:** Próteses industriais sob medida (PEEK/titânio 3D) custam **R$ 120.000–R$ 200.000**, enquanto a AIH `04.03.01.001-2` (*Cranioplastia*) remunera **R$ 1.322,12** ([SIGTAP](https://unisus.com.br/sigtap/procedimento/0403010012-cranioplastia)). Sem prototipagem, a moldagem manual de PMMA atinge **~80 °C** perto da dura-máter (acima do limiar de 47 °C de lesão térmica cortical), e placas de titânio adaptadas à mão geram quinas que ulceram o couro cabeludo (até 25% de cirurgias de revisão — [PMC12502944, 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12502944/)).

## 2. Nossa Solução: Molde Negativo Bipartido 3D (< R$ 800 · > 99,2% Economia)

O **CranioMold 3D** gera em tempo real **moldes negativos bipartidos 3D estanques (manifold)** prontos para impressão 3D FDM em PETG e esterilização em baixa temperatura (ETO ou plasma de H₂O₂), permitindo prensar o cimento ósseo de PMMA já padronizado na tabela SUS (`07.02.03.138-0` — R$ 145,42/unid.) **fora do corpo do paciente**.

### Engenharia Biomédica CAD/CAM Implementada (v2.0)
- **Frame Tangente Ortonormal Local `(tx, ty, defectDir)`:** elimina singularidades polares e gera 4 casos sintéticos (`craniectomy18`, `bifrontal`, `frontal`, `zygoma`) com customizador paramétrico de falha (hemisfério, escala, deslocamento).
- **Sistema Poka-Yoke Contínuo & Colinear:** 4 pinos cônicos no molde inferior (3 padrão + 1 pino mestre assimétrico anti-inversão) e **4 cavidades fêmeas correspondentes** no molde superior, ambos extrudados **estritamente paralelos ao eixo de prensagem `defectDir`** com folga radial exata (`0.20–0.50 mm`), impedindo travamento na montagem.
- **DFM Real para Impressão 3D FDM:**
  - **Orientação Plana na Mesa (`Z = 0`) com rotação rígida própria (`det = +1`):** matrizes `R_inf` e `R_sup` apoiam a face traseira plana de ambas as metades em `Z = 0` com as cavidades voltadas para `+Z` (**zero suportes internos**).
  - **Canaleta periférica de rebarba + 4 canais radiais de escape de PMMA** até a borda externa (evita trava hidráulica durante a prensagem).
  - **Chanfro marginal $C^1$ anti-úlcera** controlado por `chamferMm` + espessura exata no platô (`2.8–5.0 mm`) + guias opcionais de drenagem epidural.
- **Auditoria Topológica Real:** verificação de `boundaryEdges === 0`, `nonManifoldEdges === 0`, volume assinalado $V > 0$, espessura estrutural mínima `>= 9 mm` e encaixe na mesa FDM `220 × 220 × 250 mm`.
- **Inspeção Avançada no Navegador:** Three.js r174+ com `OrbitControls`, animação de prensagem desacoplada a **60 FPS**, **Corte Transversal em Tempo Real (Clipping Plane Axial/Coronal/Sagital)**, comparativo de úlcera por titânio, gráfico de **Segurança Térmica Exotérmica do PMMA**, protocolo de impressão PETG/ETO e exportação de **Binary STL + Kit Cirúrgico Completo (`.ZIP`)**.

---

## 3. Como Executar Localmente e Publicar na Vercel

### A. Desenvolvimento & Build Web (Vite + React + TypeScript + Tailwind v4)
```bash
npm install
npm run dev          # Servidor de desenvolvimento local
npm run build        # Build de produção em dist/
```

### B. Deploy 1-Clique na Vercel
O repositório já inclui [`vercel.json`](vercel.json) com build Vite (`dist/`), cabeçalhos de segurança (`CSP`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) e roteamento SPA seguro:
1. Clique no botão **Deploy with Vercel** no topo deste README (ou importe `aramiskamed/projeto-tce` em [vercel.com/new](https://vercel.com/new)); ou
2. Via CLI autenticada:
   ```bash
   npx vercel --prod --yes
   ```
- Espelho automático via GitHub Actions/Pages também configurado em [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).

### C. Motor CLI Python 3 (Paridade Matemática & Schema JSON v2.0)
Zero dependências externas em runtime:
```bash
python3 engine/cranio_mold_cli.py --case craniectomy18 --thickness 4.0 --chamfer 2.0 --clearance 0.35 --outdir samples/
```

### D. Quality Gate & Testes Automatizados
```bash
./scripts/quality_gate.sh mvp
```
Executa: ESLint (`npm run lint`), TypeScript (`tsc --noEmit`), Vitest + cobertura v8 (`>= 60%`), build de produção Vite, `ruff check` e `pytest` com cobertura (`>= 60%`).

---

## 4. Arquitetura do Repositório

- `src/engine/` — Motor geométrico CAD (`cranialMath.ts`, `meshBuilder.ts`, `meshAudit.ts`, `stlCodec.ts`, `economics.ts`)
- `src/components/` — Interface em 2 abas (`StoryTab.tsx`, `ClinicalCharts.tsx`, `Studio3DTab.tsx`, `ThreeViewport.tsx`, `PrintProtocolModal.tsx`)
- `src/__tests__/` — Testes unitários críticos (estanqueidade manifold, não-colisão 3D Poka-Yoke, `Z = 0`, codec STL/ZIP, SIGTAP e curva térmica)
- `engine/cranio_mold_cli.py` + `tests/test_cranio_mold_cli.py` — CLI Python em paridade matemática + testes pytest
- `samples/` — Arquivos `.STL` binários apoiados em `Z = 0` e `audit_craniectomy18.json` (v2.0) pré-gerados para inspeção imediata em PrusaSlicer / OrcaSlicer / Cura
- `docs/specs/projeto-tce-craniomold/SPEC.md` — Especificação técnica revisada e auditada
- `public/assets/pitch-craniomold-3d.mp4` — Vídeo Pitch oficial (2min44s) embutido no portal para avaliação dos jurados

## 5. Licença
Distribuído sob a licença **MIT** ([`LICENSE`](LICENSE)).
