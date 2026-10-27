/* Modelo de programa padrão (12 semanas) — baseado na planilha "Acompanhamento de Treino 12 Semanas".
   É usado ao criar uma pessoa nova e na opção "Modelo base" de Novo programa.
   Cada pessoa também pode criar e editar os próprios programas no app (Mais → Programas).
   Formato de cada exercício: ["Nome", "Tipo", "Prescrição"]
   Tipos: Força, Core, Funcional, Cardio, Mobilidade, Flexibilidade
   Prescrições: "3 x 8–12", "3 x 20–40 s", "2 x 30 s por lado", "25 min"  */
window.PLANO_PADRAO = {
  nome: "Programa base — 12 semanas",
  objetivo: "Ganho de massa muscular, flexibilidade, condicionamento e qualidade de vida",
  fases: [
    { de: 1, ate: 2,  nome: "Adaptação",
      dica: "Semanas de adaptação: cargas leves, foco na técnica. Se estiver voltando de uma pausa, faça 2 séries por exercício." },
    { de: 3, ate: 8,  nome: "Consolidação e progressão",
      dica: "Completou todas as séries no limite superior da faixa, com boa técnica e 2–3 repetições sobrando? Aumente um pouco a carga na próxima sessão." },
    { de: 9, ate: 12, nome: "Revisão e consolidação",
      dica: "Mantenha a progressão com técnica impecável. Compare suas cargas com as das primeiras semanas no painel de Evolução." }
  ],
  treinos: [
    { id: "A", dia: 1, diaNome: "Segunda", foco: "Peito, costas e ombros", exercicios: [
      ["Supino na máquina (chest press)", "Força", "3 x 8–12"],
      ["Puxada frontal na polia", "Força", "3 x 8–12"],
      ["Remada sentada na polia", "Força", "2 x 10–12"],
      ["Elevação lateral com halteres", "Força", "2 x 12–15"],
      ["Tríceps na polia", "Força", "2 x 10–15"]
    ]},
    { id: "B", dia: 2, diaNome: "Terça", foco: "Pernas e core", exercicios: [
      ["Leg press", "Força", "3 x 10–12"],
      ["Flexora sentada", "Força", "3 x 10–12"],
      ["Levantamento terra romeno com halteres", "Força", "2 x 8–10"],
      ["Elevação de panturrilhas", "Força", "2 x 12–15"],
      ["Prancha abdominal", "Core", "3 x 20–40 s"]
    ]},
    { id: "C", dia: 3, diaNome: "Quarta", foco: "Cardio e flexibilidade", exercicios: [
      ["Bicicleta ergométrica", "Cardio", "25 min"],
      ["World's greatest stretch (mobilidade)", "Mobilidade", "2 x 5 por lado"],
      ["Alongamento dos flexores do quadril", "Flexibilidade", "2 x 30 s por lado"],
      ["Alongamento dos posteriores da coxa", "Flexibilidade", "2 x 30 s por lado"],
      ["Alongamento de panturrilhas", "Flexibilidade", "2 x 30 s por lado"]
    ]},
    { id: "D", dia: 4, diaNome: "Quinta", foco: "Peito, costas e braços", exercicios: [
      ["Supino inclinado com halteres", "Força", "3 x 8–12"],
      ["Remada com apoio para o peito", "Força", "3 x 8–12"],
      ["Face pull na polia", "Força", "2 x 12–15"],
      ["Desenvolvimento sentado com halteres", "Força", "2 x 8–12"],
      ["Rosca bíceps com halteres", "Força", "2 x 10–15"]
    ]},
    { id: "E", dia: 5, diaNome: "Sexta", foco: "Pernas, funcional e cardio", exercicios: [
      ["Agachamento goblet", "Força", "3 x 8–12"],
      ["Elevação de quadril (ponte de glúteos)", "Força", "2 x 12–15"],
      ["Supino em pé na polia", "Força", "2 x 10–12"],
      ["Caminhada do fazendeiro (farmer's walk)", "Funcional", "3 x 30–40 s"],
      ["Caminhada na esteira", "Cardio", "12–15 min"]
    ]}
  ],
  orientacoes: [
    ["Antes de começar", "Use as primeiras 2 semanas para adaptação. Se estiver retornando após pausa, comece com 2 séries por exercício e cargas leves."],
    ["Registro de força", "Em cada treino, registre a carga usada, as repetições (ou o tempo) de cada série, o esforço percebido (1–10) e observações. Registre a carga total conforme o equipamento."],
    ["Progressão", "Quando completar todas as séries no limite superior da faixa, com técnica boa e cerca de 2–3 repetições em reserva, aumente a carga em pequeno incremento na próxima sessão. O app avisa quando for a hora."],
    ["Cardio", "Registre minutos, modalidade e esforço. Intensidade moderada: você consegue conversar em frases completas. Aumente gradualmente, conforme tolerância."],
    ["Flexibilidade", "Faça os alongamentos sem dor e sem forçar amplitude. Registre os minutos concluídos e a percepção de rigidez/mobilidade."],
    ["Segurança", "Interrompa diante de dor no peito, tontura, falta de ar desproporcional ou dor aguda. Se tiver doença, lesão ou restrição clínica, valide o plano com profissional de saúde."],
    ["Dias livres", "Sábado e domingo: descanso ou caminhada leve. Como meta geral, progrida gradualmente em direção a 150 minutos semanais de atividade aeróbica moderada."],
    ["Composição corporal", "Massa muscular e gordura corporal: registre apenas quando repetir a bioimpedância (ex.: InBody). Exames antigos servem só como referência histórica."]
  ]
};
