# Relatório Bug-Hunt — CranioMold 3D (`projeto-tce`)

- **Slug:** `20261123-projeto-tce`
- **URL Alvo (Local Preview / Produção Vercel):** `http://127.0.0.1:4173/` · `https://projeto-tce-ebon.vercel.app`
- **Repositório:** `/opt/projeto-tce` (`aramiskamed/projeto-tce`)
- **Escopo:** `full` (Visão de Usuário Real via Playwright Desktop `1280×800` + Mobile `390×844` + Visão de Desenvolvedor sobre React/Three.js/CAD TS/CLI Python)
- **Data:** `2026-11-23`
- **Status Geral:** **10 defeitos identificados e 100% corrigidos e revalidados** (`0 CRITICAL`, `3 HIGH`, `5 MEDIUM`, `2 LOW`)
- **Evidências Visuais (Screenshots):** `/opt/aralab/bridge/work-screenshots/bug-hunt-20261123-projeto-tce/`

---

## Resumo Executivo por Severidade

| Severidade | Encontrados | Corrigidos & Revalidados | Pendentes |
| :--- | :---: | :---: | :---: |
| **CRITICAL** | 0 | 0 | 0 |
| **HIGH** | 3 | 3 | 0 |
| **MEDIUM** | 5 | 5 | 0 |
| **LOW** | 2 | 2 | 0 |
| **TOTAL** | **10** | **10** | **0** |

> **Verificação do Vídeo Pitch (`public/assets/pitch-craniomold-3d.mp4`):**
> - Status HTTP `200` (`HEAD`) e `206 Partial Content` (`Range: bytes=0-1023`), `video/mp4`, `avc1` (H.264) + `mp4a` (AAC), `moov` em `faststart`, `1920×1080`, `164.35s` (`2min44s`), `readyState: 4`, `error: null`.
> - Roteiro escrito (`AVATAR_SCRIPT_BLOCKS`, seção teleprompter e `docs/ROTEIRO_VIDEO_AVATAR.md`) completamente removido (`hasOldScript: false`).

---

## Achados Consolidados e Resoluções

### `BH-001` [HIGH] — Sobreposição de banners contextuais (Titânio / STL Importado) sobre controles de câmera 3D (Desktop e Mobile)
- **Perspectiva:** `User+Dev`
- **Status:** **Corrigido e revalidado**
- **Passos de reprodução:**
  1. Abrir aba `2. Demonstração 3D · Studio CAD` em Desktop (`1280×800`) ou Mobile (`390×844`).
  2. Clicar em `Simular Placa Titânio Não Prototipada` (ou importar um arquivo `.STL`).
- **Esperado vs. Obtido:** Os banners de alerta deveriam fluir abaixo do HUD superior sem cobrir botões interativos. Antes da correção, `absolute top-14` posicionava o banner vermelho diretamente sobre os 5 botões de câmera (`Frontal`, `Lateral`, `Superior`, `Posterior`, `Reset`), bloqueando cliques; em mobile o pill de status também extrapolava a largura.
- **Evidências:** `04-desktop-titanium-mode.png` (antes) vs `04-desktop-titanium-mode-fixed.png` (depois); `10-mobile-studio3d-titanium-overlap.png` (antes) vs `10-mobile-studio3d-titanium-fixed.png` (depois).
- **Arquivos:** `src/components/Studio3DTab.tsx`
- **Correção aplicada:** Unificados o HUD superior e os banners contextuais dentro de um único container `absolute top-3 left-3 right-3 z-10 flex flex-col gap-2 pointer-events-none`, com `min-w-0 max-w-full sm:max-w-lg` no pill de status.

---

### `BH-002` [HIGH] — STL binário com normais zeradas `(0, 0, 0)` renderiza completamente preto no viewport 3D
- **Perspectiva:** `Dev`
- **Status:** **Corrigido e revalidado (teste unitário adicionado)**
- **Passos de reprodução:** Importar um `.STL` binário válido cujas normais de faceta estejam gravadas como `(0, 0, 0)` (padrão comum em Blender, Fusion360, OpenSCAD e MeshLab).
- **Esperado vs. Obtido:** O parser deveria recalcular a normal geométrica `(b - a) × (c - a)` quando a normal do arquivo é nula/não-finita. Antes da correção, `parseSTLBuffer` propagava `(0, 0, 0)` ao `MeshStandardMaterial`, deixando a peça totalmente preta.
- **Arquivos:** `src/engine/stlCodec.ts`, `src/__tests__/stlCodec.test.ts`
- **Correção aplicada:** Recálculo automático e normalização da normal geométrica por produto vetorial sempre que `nx² + ny² + nz² < 1e-12` ou houver componente não-finito; validado no teste unitário `stlCodec.test.ts`.

---

### `BH-003` [HIGH] — Animação de prensagem (60 FPS) continua mutando estado após sair das etapas de molde
- **Perspectiva:** `User+Dev`
- **Status:** **Corrigido e revalidado**
- **Passos de reprodução:**
  1. Na aba 2 (Etapa 4), clicar em `Animar Prensagem (60 FPS)`.
  2. Clicar em `ETAPA 01`, `ETAPA 02`, `Simular Placa Titânio` ou importar `.STL`.
- **Esperado vs. Obtido:** A animação deveria pausar automaticamente. Antes da correção, o botão permanecia como `Pausar Prensagem` e o `requestAnimationFrame` continuava disparando `setExplodePct` a cada 50 ms (`explodeT1: 56 -> explodeT2: 71`), causando ~20 re-renders/s desnecessários.
- **Arquivos:** `src/components/Studio3DTab.tsx`, `src/components/ThreeViewport.tsx`
- **Correção aplicada:** `setAnimating(false)` automático ao trocar para Etapas 1/2, ativar modo Titânio ou importar STL, somado à guarda no loop `animate()` em `ThreeViewport.tsx`.

---

### `BH-004` [MEDIUM] — Modal `PrintProtocolModal` não fecha com `Escape`, clique no backdrop e não trava scroll do fundo
- **Perspectiva:** `User+Dev`
- **Status:** **Corrigido e revalidado**
- **Passos de reprodução:** Abrir `Protocolo PETG/ETO`, pressionar `Escape` ou clicar fora da janela modal.
- **Esperado vs. Obtido:** O modal deveria fechar ao pressionar `Escape` ou clicar no overlay e bloquear scroll da página de fundo. Antes da correção, ambas as interações eram ignoradas (`modalStillOpenAfterEsc: true`, `modalStillOpenAfterBackdrop: true`).
- **Evidências:** `06-desktop-protocol-modal.png` + validação Playwright pós-correção (`false` em ambos).
- **Arquivos:** `src/components/PrintProtocolModal.tsx`
- **Correção aplicada:** Listener `keydown` para `Escape`, `onClick` no backdrop (`e.target === e.currentTarget`) e trava/restauração de `document.body.style.overflow`.

---

### `BH-005` [MEDIUM] — Navegação entre abas pelo cabeçalho não reposiciona o scroll para o topo
- **Perspectiva:** `User+Dev`
- **Status:** **Corrigido e revalidado**
- **Passos de reprodução:** Rolar até a seção do vídeo pitch na Aba 1 e clicar em `2. Demonstração 3D · Studio CAD` no cabeçalho.
- **Esperado vs. Obtido:** A nova aba deveria abrir no topo (`scrollY === 0`), exibindo o cabeçalho do Studio e o viewport 3D. Antes da correção, a Aba 2 abria presa no rodapé.
- **Evidências:** `03-desktop-studio3d.png` (antes) vs `03-desktop-studio3d-fixed.png` (depois, `scrollYAfterTab2Click: 0`).
- **Arquivos:** `src/App.tsx`
- **Correção aplicada:** Helper `handleSelectTab` com `window.scrollTo({ top: 0, behavior: 'smooth' })` e atributo `aria-current="page"` nos botões de navegação.

---

### `BH-006` [MEDIUM] — Vazamento de geometrias/materiais WebGL ao desmontar `ThreeViewport`
- **Perspectiva:** `Dev`
- **Status:** **Corrigido e revalidado**
- **Passos de reprodução:** Alternar repetidamente entre Aba 1 e Aba 2 (montando e desmontando `ThreeViewport`).
- **Esperado vs. Obtido:** Todos os buffers WebGL (`rootGroup`, `GridHelper`, `PlaneHelper`) e o `<canvas>` deveriam ser descartados no cleanup do `useEffect`. Antes da correção, apenas `controls.dispose()` e `renderer.dispose()` eram chamados.
- **Arquivos:** `src/components/ThreeViewport.tsx`
- **Correção aplicada:** Função reutilizável `disposeObject3D` invocada no cleanup de desmontagem para `rootGroup`, `grid` e `helper`, além da remoção segura de `renderer.domElement`.

---

### `BH-007` [MEDIUM] — Upload de `.STL` lê arquivos >25 MB em RAM antes de validar, ignora `reader.onerror` e não limpa erro ao trocar de contexto
- **Perspectiva:** `User+Dev`
- **Status:** **Corrigido e revalidado**
- **Passos de reprodução:** Enviar um arquivo inválido ou maior que 25 MB em `Importar .STL` e depois alternar de etapa/caso.
- **Esperado vs. Obtido:** Rejeitar arquivos vazios ou >25 MB antes de `FileReader.readAsArrayBuffer`, tratar `reader.onerror`, permitir fechar o alerta e limpá-lo ao trocar de caso/etapa.
- **Arquivos:** `src/components/Studio3DTab.tsx`
- **Correção aplicada:** Pré-validação de `file.size` (0 e `> STL_LIMITS.MAX_FILE_BYTES`), handler `reader.onerror`, botão de dispensa (`X`) e limpeza automática de `importError` nas trocas de etapa/caso/modo.

---

### `BH-008` [MEDIUM] — Inconsistência de numeração dos Atos clínicos entre Aba 1 (`Ato 03 / Ato 04`) e Studio 3D (`Ato 2 vs Ato 3`)
- **Perspectiva:** `User+Dev`
- **Status:** **Corrigido e revalidado**
- **Passos de reprodução:** Ler a jornada clínica da Aba 1 (`ATO 03 · FALHA DO TITÂNIO`, `ATO 04 · MOLDE NEGATIVO 3D`) e abrir o comparativo de Titânio na Aba 2.
- **Esperado vs. Obtido:** Os rótulos da Aba 2 devem referenciar `Ato 03` (Falha do Titânio) e `Ato 04` (Molde Negativo 3D), e não `Ato 2 vs Ato 3`.
- **Evidências:** `04-desktop-titanium-mode.png` vs `04-desktop-titanium-mode-fixed.png` (`mentionsAto2InStudio: false`).
- **Arquivos:** `src/components/Studio3DTab.tsx`
- **Correção aplicada:** Atualizados HUD, banner vermelho e card lateral para `Ato 03` e `ATO 03 vs ATO 04`.

---

### `BH-009` [LOW] — Âncora `#secao-video-pitch` sem `scroll-margin-top` compensando o cabeçalho sticky em Mobile
- **Perspectiva:** `User+Dev`
- **Status:** **Corrigido e revalidado**
- **Passos de reprodução:** No viewport Mobile (`390×844`, header fixo de `131px`), clicar em `Assistir Vídeo Pitch (2min44s)`.
- **Esperado vs. Obtido:** A seção de vídeo deve parar abaixo da barra de navegação fixa.
- **Arquivos:** `src/components/StoryTab.tsx`
- **Correção aplicada:** Adicionadas classes `scroll-mt-36 md:scroll-mt-24` em `<section id="secao-video-pitch">`.

---

### `BH-010` [LOW] — CLI Python (`engine/cranio_mold_cli.py`) não sanitizava parâmetros `NaN`/`inf` antes de `clamp`
- **Perspectiva:** `Dev`
- **Status:** **Corrigido e revalidado (teste pytest adicionado)**
- **Passos de reprodução:** Invocar `generate_kit(case_id="zygoma", thickness_mm=float("nan"), chamfer_mm=float("inf"))`.
- **Esperado vs. Obtido:** Assim como `sanitizeMoldParams` em TypeScript, valores não-finitos devem recair para os padrões seguros (`4.0`, `2.0`, `0.35`, `1.0`).
- **Arquivos:** `engine/cranio_mold_cli.py`, `tests/test_cranio_mold_cli.py`
- **Correção aplicada:** Adicionado `_finite_or()` e guarda `math.isfinite()` em `clamp()`, cobertos por `test_non_finite_parameters_are_sanitized`.
