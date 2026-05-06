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

// =============== SALA DE ESTUDOS ===============

export type SalaStatus = "aberta" | "em_andamento" | "encerrada" | "expirada";

export interface SalaConfig {
  area: Area | "misto";
  quantidade: number;
  language?: "ingles" | "espanhol" | "sem_estrangeira";
  /** 0 = sem limite */
  tempoPorQuestaoSeg: number;
  /** Se true, sair da aba/colar encerra simulado individual do aluno */
  modoRigoroso: boolean;
}

export interface Sala {
  id: string;
  codigo: string;
  codigo_admin: string;
  config: SalaConfig;
  question_ids: string[];
  status: SalaStatus;
  created_at: string;
  started_at: string | null;
  expires_at: string;
}

// =============== OFICINA DE REDAÇÃO ===============

export interface OficinaConfig {
  /** 0 = sem limite */
  tempoMin: number;
  modoRigoroso: boolean;
}

export interface Oficina {
  id: string;
  codigo: string;
  codigo_admin: string;
  config: OficinaConfig;
  tema_id: string;
  tema_snapshot: RedacaoTema;
  status: SalaStatus;
  created_at: string;
  started_at: string | null;
  expires_at: string;
}

export interface ParticipanteOficina {
  id: string;
  oficina_id: string;
  nickname: string;
  joined_at: string;
  started_at: string | null;
  finished_at: string | null;
  texto: string;
  caracteres: number;
  linhas: number;
}

export interface ParticipanteSala {
  id: string;
  sala_id: string;
  nickname: string;
  joined_at: string;
  started_at: string | null;
  finished_at: string | null;
  acertos: number;
  total: number;
  tempo_total_ms: number;
  /** Map de questionId → letra escolhida */
  respostas: Record<string, string | null>;
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
