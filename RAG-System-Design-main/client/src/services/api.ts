import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('system_design_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to catch 401/403 and maintain session integrity
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      // Clear invalid or expired credentials
      authService.logout();
      window.dispatchEvent(
        new CustomEvent('auth:unauthorized', {
          detail: {
            message: error.response?.data?.message || 'Unauthorized: Session expired or invalid token',
            status: 401,
          },
        })
      );
    } else if (status === 403) {
      window.dispatchEvent(
        new CustomEvent('auth:forbidden', {
          detail: {
            message: error.response?.data?.message || 'Access denied: You do not have permission to access this resource',
            status: 403,
          },
        })
      );
    }
    return Promise.reject(error);
  }
);

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  isAdmin: boolean;
}

export interface AuthResponse {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  diagrams: Array<{ id: string; version: number; updatedAt: string }>;
}

export interface CritiqueResponse {
  source: 'ai' | 'deterministic-fallback';
  cached?: boolean;
  metrics: {
    services: number;
    databases: number;
    caches: number;
    queues: number;
    spof: string[];
    fanOut: number;
    redundancyScore: number;
    warnings?: string[];
  };
  ruleViolations?: Array<{
    id: string;
    ruleId: string;
    severity: 'CRITICAL' | 'WARNING' | 'SUGGESTION';
    category: string;
    title: string;
    message: string;
    impact: string;
    remediation: string;
    affectedNodes?: string[];
  }>;
  citedPatterns?: Array<{
    docKey: string;
    title: string;
    topic: string;
    similarity: number;
    summary: string;
  }>;
  analysis: {
    executiveSummary: string;
    strengths: string[];
    spofRisks: string[];
    scalabilityBottlenecks: string[];
    recommendations: string[];
  };
  rawCritiqueText: string;
}

export const authService = {
  async register(email: string, password: string, name?: string): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/register', { email, password, name });
    localStorage.setItem('system_design_token', res.data.accessToken);
    localStorage.setItem('system_design_refresh', res.data.refreshToken);
    return res.data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/login', { email, password });
    localStorage.setItem('system_design_token', res.data.accessToken);
    localStorage.setItem('system_design_refresh', res.data.refreshToken);
    return res.data;
  },

  async getProfile(): Promise<{ user: UserProfile }> {
    const res = await api.get<{ user: UserProfile }>('/auth/me');
    return res.data;
  },

  logout() {
    localStorage.removeItem('system_design_token');
    localStorage.removeItem('system_design_refresh');
  },

  hasToken(): boolean {
    return !!localStorage.getItem('system_design_token');
  },
};

export const projectService = {
  async list(): Promise<ProjectSummary[]> {
    const res = await api.get<ProjectSummary[]>('/projects');
    return res.data;
  },

  async create(name: string, description?: string): Promise<ProjectSummary> {
    const res = await api.post<ProjectSummary>('/projects', { name, description });
    return res.data;
  },

  async get(projectId: string) {
    const res = await api.get(`/projects/${projectId}`);
    return res.data;
  },

  async remove(projectId: string) {
    const res = await api.delete(`/projects/${projectId}`);
    return res.data;
  },

  async saveDiagram(projectId: string, nodes: any[], edges: any[], metrics?: any) {
    const res = await api.post(`/diagrams/${projectId}/save`, { nodes, edges, metrics });
    return res.data;
  },

  async getDiagram(projectId: string) {
    const res = await api.get(`/diagrams/${projectId}`);
    return res.data;
  },

  async getDiagramHistory(projectId: string): Promise<Array<{ id: string; version: number; createdAt: string }>> {
    const res = await api.get(`/diagrams/${projectId}/history`);
    return res.data;
  },

  async getDiagramVersion(projectId: string, version: number) {
    const res = await api.get(`/diagrams/${projectId}/version/${version}`);
    return res.data;
  },
};

export const aiService = {
  async generateCritique(
    nodes: any[],
    edges: any[],
    systemContext?: string,
    projectId?: string,
    socketId?: string
  ): Promise<CritiqueResponse> {
    const res = await api.post<CritiqueResponse>('/ai/critique', {
      nodes,
      edges,
      systemContext,
      projectId,
      socketId,
    });
    return res.data;
  },

  async evaluateMetrics(nodes: any[], edges: any[]) {
    const res = await api.post('/metrics/evaluate', { nodes, edges });
    return res.data;
  },

  async enqueueCritiqueAsync(
    nodes: any[],
    edges: any[],
    systemContext?: string,
    projectId?: string,
    socketId?: string
  ): Promise<{
    jobId: string;
    status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    channel: string;
    message: string;
    pollUrl: string;
  }> {
    const res = await api.post('/ai/critique/async', {
      nodes,
      edges,
      systemContext,
      projectId,
      socketId,
      async: true,
    });
    return res.data;
  },

  async getJobStatus(jobId: string): Promise<{
    jobId: string;
    status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    data?: CritiqueResponse;
    error?: string;
  }> {
    const res = await api.get(`/ai/jobs/${jobId}`);
    return res.data;
  },
};

export interface InterviewQuestionItem {
  id: string;
  question: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  category: string;
  targetComponent?: string;
  contextExplanation: string;
  idealAnswer: string;
  keyConcepts: string[];
}

export interface AnswerEvaluationResult {
  accuracyScore: number;
  isCorrect: boolean;
  strengths: string[];
  missingPoints: string[];
  feedback: string;
  idealAnswer: string;
}

export const interviewService = {
  async getQuestions(
    nodes: any[],
    edges: any[],
    count: number = 5,
    systemContext?: string
  ): Promise<InterviewQuestionItem[]> {
    const res = await api.post<InterviewQuestionItem[]>('/ai/interview/questions', {
      nodes,
      edges,
      count,
      systemContext,
    });
    return res.data;
  },

  async evaluateAnswer(payload: {
    questionId: string;
    question: string;
    idealAnswer: string;
    keyConcepts?: string[];
    userAnswer: string;
    nodes?: any[];
    edges?: any[];
  }): Promise<AnswerEvaluationResult> {
    const res = await api.post<AnswerEvaluationResult>('/ai/interview/evaluate', payload);
    return res.data;
  },
};

