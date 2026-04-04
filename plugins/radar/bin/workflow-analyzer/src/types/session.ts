export interface ParsedSession {
  id: string;
  source: string;
  project?: string;
  startedAt: Date;
  endedAt?: Date;
  durationMinutes?: number;
  model?: string;

  messages: Message[];
  toolCalls: ToolCall[];
  errors: ErrorEvent[];

  // Enrichment fields (populated after parsing)
  topic?: string;
  category?: string;

  metadata: Record<string, unknown>;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  promptLength?: number;
}

export interface ToolCall {
  id: string;
  name: string;
  success: boolean;
  errorMessage?: string;
  timestamp?: Date;
  durationMs?: number;
  retryOf?: string;
}

export interface ErrorEvent {
  toolName: string;
  errorMessage: string;
  timestamp: Date;
  sessionContext: string;
}

export interface SessionGroup {
  topic: string;
  category: string;
  sessions: ParsedSession[];
  platforms: string[];
  totalDurationMinutes: number;
  sessionCount: number;
}
