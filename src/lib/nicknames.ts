/**
 * Gerador de nicknames anônimos com tema vestibular/universitário.
 * Combinação: <prefixo> <curso/escola> <numero>
 * Ex: "Vestibulando Medicina 47", "Calouro Engenharia 12"
 */

const PREFIXOS = [
  "Vestibulando",
  "Calouro",
  "Aluno",
  "Estudante",
  "Cursinho",
  "Candidato",
  "Veterano",
  "Treineiro",
  "Concurseiro",
  "Monitor",
  "Aprendiz",
  "Bolsista",
];

const AREAS_NICK = [
  // Saúde
  "Medicina",
  "Enfermagem",
  "Odontologia",
  "Veterinária",
  "Psicologia",
  "Farmácia",
  "Fisioterapia",
  "Biomedicina",
  "Nutrição",
  // Exatas / engenharias
  "Engenharia",
  "Computação",
  "Matemática",
  "Física",
  "Química",
  "Estatística",
  "Arquitetura",
  // Humanas
  "Direito",
  "História",
  "Geografia",
  "Filosofia",
  "Sociologia",
  "Letras",
  "Pedagogia",
  "Jornalismo",
  // Bio
  "Biologia",
  "Ecologia",
  "Agronomia",
  "Zootecnia",
  // Sociais aplicadas
  "Economia",
  "Administração",
  "Contabilidade",
  "Publicidade",
  "Design",
  "RelaçõesInternacionais",
  // Artes
  "Música",
  "Teatro",
  "Artes",
  "Cinema",
  // Carreiras alternativas
  "ETec",
  "Federal",
  "Estadual",
];

function escolher<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function gerarNickname(): string {
  const prefixo = escolher(PREFIXOS);
  const area = escolher(AREAS_NICK);
  const numero = Math.floor(Math.random() * 99) + 1;
  return `${prefixo} ${area} ${numero}`;
}

/** Gera código curto pra sala/admin no formato XXX-NNNN */
export function gerarCodigoSala(): string {
  const letras = "BCDFGHJKLMNPQRSTVWXYZ"; // sem vogais pra não formar palavras
  const l = Array.from(
    { length: 4 },
    () => letras[Math.floor(Math.random() * letras.length)]
  ).join("");
  const n = Math.floor(Math.random() * 9000) + 1000;
  return `${l}-${n}`;
}

/** Gera código admin (mais longo, pra dificultar adivinhar) */
export function gerarCodigoAdmin(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 16 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}
