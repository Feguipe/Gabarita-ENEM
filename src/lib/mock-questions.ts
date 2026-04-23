import type { Question } from "./types";

export const MOCK_QUESTIONS: Question[] = [
  {
    id: "q1",
    area: "matematica",
    ano: 2022,
    tema: "Porcentagem",
    dificuldade: "facil",
    enunciado:
      "Uma loja oferece desconto de 20% sobre o preço original de um produto que custa R$ 250,00. Após o desconto, aplica-se ainda um acréscimo de 5% sobre o valor com desconto referente a taxa de cartão. Qual o valor final pago pelo cliente?",
    alternativas: [
      { letra: "A", texto: "R$ 195,00", correta: false, explicacaoDistrator: "Cálculo aplicou o desconto mas esqueceu a taxa." },
      { letra: "B", texto: "R$ 200,00", correta: false, explicacaoDistrator: "Valor apenas com desconto, sem a taxa." },
      { letra: "C", texto: "R$ 210,00", correta: true },
      { letra: "D", texto: "R$ 212,50", correta: false, explicacaoDistrator: "Aplicou 5% sobre o valor original em vez do valor com desconto." },
      { letra: "E", texto: "R$ 262,50", correta: false, explicacaoDistrator: "Somou acréscimo em vez de aplicar desconto." },
    ],
    resolucao:
      "250 × 0,80 = 200 (após desconto). 200 × 1,05 = 210 (após taxa). Resposta: R$ 210,00.",
  },
  {
    id: "q2",
    area: "matematica",
    ano: 2021,
    tema: "Função do 1º grau",
    dificuldade: "media",
    enunciado:
      "Um táxi cobra uma bandeirada de R$ 5,00 mais R$ 2,50 por quilômetro rodado. Quantos quilômetros é possível rodar com R$ 30,00?",
    alternativas: [
      { letra: "A", texto: "8 km", correta: false },
      { letra: "B", texto: "10 km", correta: true },
      { letra: "C", texto: "12 km", correta: false },
      { letra: "D", texto: "14 km", correta: false },
      { letra: "E", texto: "15 km", correta: false },
    ],
    resolucao: "30 = 5 + 2,50x → 2,50x = 25 → x = 10 km.",
  },
  {
    id: "q3",
    area: "linguagens",
    ano: 2020,
    tema: "Interpretação de texto",
    dificuldade: "facil",
    enunciado:
      "Considere o trecho: 'O silêncio da madrugada era interrompido apenas pelo canto distante de um galo, anunciando que a vida não parava, mesmo quando o mundo parecia dormir.' A figura de linguagem predominante no trecho é:",
    alternativas: [
      { letra: "A", texto: "Metáfora", correta: false },
      { letra: "B", texto: "Personificação", correta: true },
      { letra: "C", texto: "Hipérbole", correta: false },
      { letra: "D", texto: "Eufemismo", correta: false },
      { letra: "E", texto: "Ironia", correta: false },
    ],
    resolucao:
      "Atribuir ao 'mundo' a ação humana de 'dormir' caracteriza personificação (prosopopeia).",
  },
  {
    id: "q4",
    area: "linguagens",
    ano: 2019,
    tema: "Variação linguística",
    dificuldade: "media",
    enunciado:
      "A variação linguística que ocorre em função da região geográfica do falante é classificada como:",
    alternativas: [
      { letra: "A", texto: "Variação diastrática", correta: false },
      { letra: "B", texto: "Variação diafásica", correta: false },
      { letra: "C", texto: "Variação diatópica", correta: true },
      { letra: "D", texto: "Variação diacrônica", correta: false },
      { letra: "E", texto: "Variação individual", correta: false },
    ],
    resolucao:
      "Variação diatópica = geográfica. Diastrática = social. Diafásica = contexto. Diacrônica = tempo.",
  },
  {
    id: "q5",
    area: "humanas",
    ano: 2022,
    tema: "Geografia do Brasil",
    dificuldade: "media",
    enunciado:
      "A região brasileira que concentra a maior parte da produção industrial do país e também o maior PIB é a:",
    alternativas: [
      { letra: "A", texto: "Norte", correta: false },
      { letra: "B", texto: "Nordeste", correta: false },
      { letra: "C", texto: "Centro-Oeste", correta: false },
      { letra: "D", texto: "Sudeste", correta: true },
      { letra: "E", texto: "Sul", correta: false },
    ],
    resolucao:
      "O Sudeste concentra mais de 50% do PIB nacional e o maior parque industrial, com destaque para SP, RJ e MG.",
  },
  {
    id: "q6",
    area: "humanas",
    ano: 2021,
    tema: "História do Brasil",
    dificuldade: "facil",
    enunciado: "A Proclamação da República no Brasil ocorreu em que ano?",
    alternativas: [
      { letra: "A", texto: "1822", correta: false, explicacaoDistrator: "1822 é a Independência." },
      { letra: "B", texto: "1888", correta: false, explicacaoDistrator: "1888 é a Abolição da Escravatura." },
      { letra: "C", texto: "1889", correta: true },
      { letra: "D", texto: "1891", correta: false, explicacaoDistrator: "1891 é a primeira Constituição Republicana." },
      { letra: "E", texto: "1930", correta: false, explicacaoDistrator: "1930 é a Revolução de Vargas." },
    ],
    resolucao: "A Proclamação da República ocorreu em 15 de novembro de 1889.",
  },
  {
    id: "q7",
    area: "natureza",
    ano: 2022,
    tema: "Biologia - Ecologia",
    dificuldade: "media",
    enunciado:
      "A relação ecológica em que uma espécie se beneficia sem prejudicar ou beneficiar a outra é chamada de:",
    alternativas: [
      { letra: "A", texto: "Mutualismo", correta: false },
      { letra: "B", texto: "Comensalismo", correta: true },
      { letra: "C", texto: "Parasitismo", correta: false },
      { letra: "D", texto: "Predatismo", correta: false },
      { letra: "E", texto: "Competição", correta: false },
    ],
    resolucao:
      "Comensalismo: um se beneficia, o outro é neutro. Ex: rêmora e tubarão.",
  },
  {
    id: "q8",
    area: "natureza",
    ano: 2020,
    tema: "Física - Cinemática",
    dificuldade: "media",
    enunciado:
      "Um carro percorre 180 km em 2 horas em movimento uniforme. Qual sua velocidade média em m/s?",
    alternativas: [
      { letra: "A", texto: "15 m/s", correta: false },
      { letra: "B", texto: "20 m/s", correta: false },
      { letra: "C", texto: "25 m/s", correta: true },
      { letra: "D", texto: "30 m/s", correta: false },
      { letra: "E", texto: "90 m/s", correta: false, explicacaoDistrator: "Esqueceu de converter km/h em m/s." },
    ],
    resolucao: "v = 180/2 = 90 km/h. Conversão: 90 ÷ 3,6 = 25 m/s.",
  },
  {
    id: "q9",
    area: "natureza",
    ano: 2021,
    tema: "Química - Tabela Periódica",
    dificuldade: "facil",
    enunciado:
      "Qual dos elementos abaixo pertence à família dos gases nobres?",
    alternativas: [
      { letra: "A", texto: "Flúor (F)", correta: false },
      { letra: "B", texto: "Oxigênio (O)", correta: false },
      { letra: "C", texto: "Nitrogênio (N)", correta: false },
      { letra: "D", texto: "Argônio (Ar)", correta: true },
      { letra: "E", texto: "Cloro (Cl)", correta: false },
    ],
    resolucao:
      "Gases nobres (família 18/8A): He, Ne, Ar, Kr, Xe, Rn. Argônio é o único da lista.",
  },
  {
    id: "q10",
    area: "matematica",
    ano: 2023,
    tema: "Probabilidade",
    dificuldade: "media",
    enunciado:
      "Em um dado comum de 6 faces, qual a probabilidade de sair um número par ao lançá-lo uma vez?",
    alternativas: [
      { letra: "A", texto: "1/6", correta: false },
      { letra: "B", texto: "1/3", correta: false },
      { letra: "C", texto: "1/2", correta: true },
      { letra: "D", texto: "2/3", correta: false },
      { letra: "E", texto: "1", correta: false },
    ],
    resolucao:
      "Números pares em um dado: 2, 4, 6 (3 casos). Total: 6. P = 3/6 = 1/2.",
  },
  {
    id: "q11",
    area: "linguagens",
    ano: 2022,
    tema: "Literatura",
    dificuldade: "dificil",
    enunciado:
      "A obra 'Grande Sertão: Veredas', considerada uma das mais importantes da literatura brasileira, foi escrita por:",
    alternativas: [
      { letra: "A", texto: "Machado de Assis", correta: false },
      { letra: "B", texto: "José de Alencar", correta: false },
      { letra: "C", texto: "Guimarães Rosa", correta: true },
      { letra: "D", texto: "Graciliano Ramos", correta: false },
      { letra: "E", texto: "Jorge Amado", correta: false },
    ],
    resolucao:
      "Publicada em 1956 por João Guimarães Rosa, marco do regionalismo renovado.",
  },
  {
    id: "q12",
    area: "humanas",
    ano: 2023,
    tema: "Filosofia",
    dificuldade: "media",
    enunciado:
      "A frase 'Penso, logo existo' (Cogito, ergo sum) é atribuída a qual filósofo?",
    alternativas: [
      { letra: "A", texto: "Platão", correta: false },
      { letra: "B", texto: "Aristóteles", correta: false },
      { letra: "C", texto: "René Descartes", correta: true },
      { letra: "D", texto: "Immanuel Kant", correta: false },
      { letra: "E", texto: "Friedrich Nietzsche", correta: false },
    ],
    resolucao:
      "Descartes formulou o cogito no 'Discurso do Método' (1637) como base do pensamento racionalista.",
  },
];
