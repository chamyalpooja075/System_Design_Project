import { io, Socket } from 'socket.io-client';

export interface StatusUpdatePayload {
  step: 'TOPOLOGY' | 'RULES' | 'STRATEGY' | 'SYNTHESIS' | string;
  message: string;
  timestamp: string;
}

let socket: Socket | null = null;

export const getAnalysisSocket = (): Socket => {
  if (!socket) {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const socketEndpoint = apiUrl ? `${apiUrl}/ws/analysis` : '/ws/analysis';
    socket = io(socketEndpoint, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      console.log('[WebSocket] Connected to Analysis Gateway, socketId:', socket?.id);
    });

    socket.on('disconnect', () => {
      console.log('[WebSocket] Disconnected from Analysis Gateway');
    });
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

export const subscribeToStatusUpdates = (
  callback: (update: StatusUpdatePayload) => void
): (() => void) => {
  const s = getAnalysisSocket();
  s.on('status_update', callback);

  return () => {
    s.off('status_update', callback);
  };
};

export interface CritiqueCompletePayload {
  jobId: string;
  result: any;
  timestamp: string;
}

export const subscribeToCritiqueComplete = (
  callback: (payload: CritiqueCompletePayload) => void
): (() => void) => {
  const s = getAnalysisSocket();
  s.on('critique_complete', callback);

  return () => {
    s.off('critique_complete', callback);
  };
};

