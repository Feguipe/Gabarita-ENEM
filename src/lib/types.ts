export type Area = "linguagens" | "humanas" | "natureza" | "matematica";

export type Language = "ingles" | "espanhol" | null;

export interface Question {
  id: string;
  area: Area;
  ano: number;
  tema: string;
  dificuldade: "facil" | "media" | "dificil";
  enunciado: string;
  contextoImagens?: string[];
  introducaoAlternativas?: string;
  alternativas: Alternative[];
  resolucao: string;
  language?: Language;
  index?: number;
}

export interface Alternative {
  letra: "A" | "B" | "C" | "D" | "E";
  texto: string;
  correta: boolean;
  explicacaoDistrator?: string;
  imagem?: string | null;
}

export interface SimulationConfig {
  area: Area | "misto";
  quantidade: number;
  tempoMinutos: number;
  anoMin?: number;
  anoMax?: number;
  language?: "ingles" | "espanhol" | "sem_estrangeira";
  dificuldade?: "facil" | "media" | "dificil" | "qualquer";
}

export interface Answer {
  questionId: string;
  letraEscolhida: string | null;
  tempoGastoMs: number;
  marcadaRevisao: boolean;
}

export type SimulationStatus =
  | "em_andamento"
  | "finalizado"
  | "interrompido_saida"
  | "interrompido_tempo";

export interface Simulation {
  id: string;
  config: SimulationConfig;
  questions: Question[];
  answers: Record<string, Answer>;
  currentIndex: number;
  startedAt: number;
  finishedAt: number | null;
  status: SimulationStatus;
  anticheatEvents: AntiCheatEvent[];
}

export interface TextoMotivador {
  rotulo: string;
  conteudo: string;
}

export interface RedacaoTema {
  id: string;
  tema: string;
  areaFoco: string;
  palavrasChave: string[];
  textosMotivadores: TextoMotivador[];
  comando: string;
  origem: { fonte: string; titulo: string; url: string };
  geradoEm: string;
}

export type RedacaoStatus =
  | "em_andamento"
  | "finalizada"
  | "interrompida_saida";

export interface RedacaoRascunho {
  id: string;
  temaId: string;
  tema: string;
  texto: string;
  atualizadoEm: number;
  criadoEm: number;
  finalizadoEm: number | null;
  status: RedacaoStatus;
  anticheatEvents: AntiCheatEvent[];
  /** Minutos do cronômetro (90 = simula ENEM; 0 = sem limite). */
  tempoLimiteMin?: number;
}

export interface AntiCheatEvent {
  type:
    | "tab_hidden"
    | "window_blur"
    | "fullscreen_exit"
    | "copy_attempt"
    | "paste_attempt"
    | "context_menu"
    | "devtools_shortcut";
  elapsedMs: number;
  at: number;
}
