export type JobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface AnalysisJobPayload {
  jobId: string;
  projectId?: string;
  socketId?: string;
  nodes: any[];
  edges: any[];
  systemContext?: string;
  createdAt: string;
}

export interface AnalysisJobResult {
  jobId: string;
  status: JobStatus;
  data?: any;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
