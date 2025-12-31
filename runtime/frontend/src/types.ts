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

export interface ProjectCapture {
  name: string;
  path: string;
  addedAt: string;
}

export interface ProjectMeta {
  version: number;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  captures: ProjectCapture[];
}

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
  hasCapture: boolean;
}

export type ResourceKind = 'rdc' | 'image' | 'json' | 'log' | 'other';

export interface ProjectResource {
  path: string;
  type: ResourceKind;
  size: number;
  updatedAt: string;
}

export type ModelRole = 'planner' | 'action' | 'both';

export interface ModelOption {
  id: string;
  label: string;
  role: ModelRole;
}

export interface ModelsResponse {
  models: ModelOption[];
  defaultPlanner: string;
  defaultAction: string;
}

export interface HistoryPayload {
  version: number;
  submissions: Submission[];
  messages: Message[];
}
