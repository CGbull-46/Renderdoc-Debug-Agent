export type StepStatus = 'pending' | 'processing' | 'completed';
export type SubmissionStatus = 'processing' | 'resolved' | 'warning' | 'critical';

export interface LogEntry {
  type: 'tool' | 'info' | 'analysis';
  content: string;
}

export interface CoTStep {
  id: string;
  title: string;
  status: StepStatus;
  logs: LogEntry[];
}

export interface MessageSummary {
  title: string;
  description: string;
  tag: string;
}

export interface Message {
  id: string;
  role: 'user' | 'agent';
  content?: string;
  submissionId?: string;
  status?: SubmissionStatus;
  steps?: CoTStep[];
  summary?: MessageSummary;
}

export interface PipelineState {
  highlightStage: 'IA' | 'VS' | 'RS' | 'PS' | 'OM' | null;
  warningMessage?: string;
}

export interface SubmissionEvidence {
  colorBuffer?: string;
  depthBuffer?: string;
}

export interface Submission {
  id: string;
  timestamp: string;
  title: string;
  status: SubmissionStatus;
  pipelineState: PipelineState;
  evidence: SubmissionEvidence;
}
