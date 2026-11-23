export interface JourneyStep {
  badge: string;
  badgeTone: 'rose' | 'amber' | 'emerald';
  shortTitle: string;
  shortTag: string;
  title: string;
  desc: string;
  citationLabel: string;
  citationUrl: string;
  citationSecondaryLabel?: string;
  citationSecondaryUrl?: string;
  metric: string;
  submetric: string;
  targetStage: 1 | 2 | 3 | 4;
  titaniumMode: boolean;
}

export const JOURNEY_STEPS: JourneyStep[] = [
  {
    badge: 'ATO 01 · ENTRADA GRAVÍSSIMA NO PRONTO-SOCORRO',
    badgeTone: 'rose',
    shortTag: 'ATO 01 · TRAUMA AGUDO',
    shortTitle: 'Colisão de moto aos 18 anos & Craniectomia',
    title: 'Mulher jovem de 18 anos atingida na volta do trabalho por motorista alcoolizado',
    desc: 'Voltando para casa de motocicleta após o expediente, uma jovem de 18 anos sofre colisão frontal causada por um condutor etilizado. Admitida gravíssima com hipertensão intracraniana refratária, precisa de uma craniectomia descompressiva fronto-parieto-temporal de emergência (~156 cm²) para permitir a expansão do edema cerebral e salvar sua vida.',
    citationLabel: 'Carteri & Silva, RBTI 2021 (131.015 internações/ano)',
    citationUrl: 'https://www.scielo.br/j/rbti/a/K5yzpQH78f4FmwmjPjjppCm/?lang=pt',
    citationSecondaryLabel: 'MIT Tech Review Brasil (~30.000 craniectomias/ano)',
    citationSecondaryUrl:
      'https://mittechreview.com.br/proteses-cranianas-por-impressao-3d-realidade-acessivel-aos-pacientes-do-sus/',
    metric: '156 cm² de falha óssea aberta',
    submetric:
      'Encéfalo desprotegido sob o couro cabeludo, exposto à pressão atmosférica e ao risco permanente de trauma secundário.',
    targetStage: 1,
    titaniumMode: false,
  },
  {
    badge: 'ATO 02 · MESES DE REABILITAÇÃO NEUROFUNCIONAL RETARDADA',
    badgeTone: 'amber',
    shortTag: 'ATO 02 · SÍNDROME DO TREFINADO',
    shortTitle: 'Meses internada com reabilitação travada',
    title: 'A síndrome do trefinado trava a recuperação motora, cognitiva e da fala',
    desc: 'Passada a fase crítica, a jovem permanece meses em reabilitação neurofuncional, mas evolui com estagnação motora, cefaleia ortostática, disfasia, déficit de atenção e depressão pelo afundamento visível do crânio. Sem a barreira óssea, a pressão atmosférica comprime diretamente o córtex e reduz a perfusão arterial e o fluxo liquórico.',
    citationLabel: 'Maricevich & Campolina, RBCP 2017 (Coorte SUS, n = 14)',
    citationUrl: 'https://www.scielo.br/j/rbcp/a/MTFjPtbdLVRJKL5r98Nwzss/?lang=pt',
    metric: '78,6% a 92,9% sintomáticos',
    submetric:
      'Fila superior a 7 anos no SUS por próteses customizadas comerciais mantém pacientes jovens fora do trabalho e do convívio social.',
    targetStage: 2,
    titaniumMode: false,
  },
  {
    badge: 'ATO 03 · COMPLICAÇÃO GRAVE DA PLACA NÃO PROTOTIPADA',
    badgeTone: 'rose',
    shortTag: 'ATO 03 · FALHA DO TITÂNIO',
    shortTitle: 'Pontas ulceram a pele, infectam e exigem remoção',
    title: 'Tentativa com placas de titânio não prototipadas ulcera a pele, infecta e exige remoção',
    desc: 'Diante do custo proibitivo de R$ 120 mil a R$ 200 mil de uma OPME industrial customizada, realiza-se reconstrução com placas/telas metálicas de titânio adaptadas manualmente. Sem obedecer à curvatura tridimensional contínua do crânio, as pontas metálicas geram isquemia e ulceram a pele fina, infectando a ferida operatória e obrigando a remoção cirúrgica completa do implante.',
    citationLabel: 'PMC12502944, 2025 (até 25% de cirurgias de revisão)',
    citationUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12502944/',
    citationSecondaryLabel: 'RBCP 2017 (15,9% infecção · 11,8% extrusão)',
    citationSecondaryUrl: 'https://www.scielo.br/j/rbcp/a/MTFjPtbdLVRJKL5r98Nwzss/?lang=pt',
    metric: 'Deiscência + Infecção = Estaca Zero',
    submetric:
      'Veja no Studio 3D os pontos vermelhos onde as quinas não prototipadas concentram pressão contra o retalho cutâneo.',
    targetStage: 1,
    titaniumMode: true,
  },
  {
    badge: 'ATO 04 · RESOLUÇÃO DEFINITIVA COM MOLDE NEGATIVO 3D + PMMA',
    badgeTone: 'emerald',
    shortTag: 'ATO 04 · MOLDE NEGATIVO 3D',
    shortTitle: 'Prótese prototipada (< R$ 800) e alta funcional',
    title: 'Prótese prototipada por menos de R$ 800 integra sem tensão e destrava a reabilitação',
    desc: 'A partir da tomografia em fase óssea, o software espelha o hemicrânio íntegro, aplica chanfro marginal contínuo sem quinas vivas e imprime o molde negativo bipartido em PETG com pinos Poka-Yoke e canais de escape. No centro cirúrgico, o cimento de PMMA (R$ 145,42 no SIGTAP) polimeriza fora do corpo dentro do molde estéril. O implante encaixa perfeitamente, a ferida cicatriza íntegra e a síndrome do trefinado regride.',
    citationLabel: 'Araujo et al., UNIOESTE/HUOP 2026 (custo < R$ 800 no SUS)',
    citationUrl: 'https://e-revista.unioeste.br/index.php/variasaude/pt_BR/article/view/36386',
    metric: '< R$ 800,00 · > 99,2% economia',
    submetric:
      'Cabe integralmente no financiamento vigente do SUS e devolve proteção cerebral, simetria e autonomia aos 18 anos.',
    targetStage: 4,
    titaniumMode: false,
  },
];

export const SIGTAP_ROWS = [
  {
    code: '04.03.01.001-2',
    href: 'https://unisus.com.br/sigtap/procedimento/0403010012-cranioplastia',
    desc: 'Cranioplastia (SH R$ 799,64 + SP R$ 522,48, inclui anestesia)',
    value: 'R$ 1.322,12',
  },
  {
    code: '07.02.03.138-0',
    href: 'https://app.clinplus.com.br/ferramentas/codigo-sus/0702031380',
    desc: 'Cimento ósseo s/ antibiótico — PMMA (até 3 unid. compatíveis)',
    value: 'R$ 145,42',
  },
  {
    code: '07.02.03.008-2',
    href: 'https://www.qualcid.com.br/procedimento/0702030082/cimento-c-antibiotico',
    desc: 'Cimento ósseo c/ antibiótico — PMMA (alternativa para revisão pós-infecção)',
    value: 'R$ 262,63',
  },
  {
    code: '07.02.05.048-2',
    href: 'https://app.clinplus.com.br/ferramentas/codigo-sus/0702050482',
    desc: 'Placa de titânio sistema mini/microfragmentos (inclui parafusos de fixação)',
    value: 'R$ 361,81',
  },
];
