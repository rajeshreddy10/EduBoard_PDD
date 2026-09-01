'use client';

import { io, Socket } from 'socket.io-client';

const getSocketUrl = () => {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  if (typeof window !== 'undefined' && window.location.hostname) {
    return `http://${window.location.hostname}:3001`;
  }
  return 'http://localhost:3001';
};

class EduBoardSocket {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();

  connect(token?: string) {
    if (this.socket?.connected) return;

    const socketUrl = getSocketUrl();

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('[EduBoardSocket] Connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[EduBoardSocket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[EduBoardSocket] Connection error:', error.message);
    });

    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach(cb => {
        this.socket?.on(event, cb);
      });
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
    this.socket?.on(event, callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: (...args: any[]) => void) {
    this.listeners.get(event)?.delete(callback);
    this.socket?.off(event, callback);
  }

  // Realtime Board Collaboration
  joinBoard(boardId: string) { this.emit('board:join', { boardId }); }
  leaveBoard(boardId: string) { this.emit('board:leave', { boardId }); }
  sendStroke(boardId: string, stroke: any) { this.emit('board:stroke', { boardId, stroke }); }
  sendCursor(boardId: string, position: { x: number; y: number }) { this.emit('board:cursor', { boardId, position }); }

  onStroke(callback: (data: any) => void) { return this.on('board:stroke:received', callback); }
  onCursor(callback: (data: any) => void) { return this.on('board:cursor:received', callback); }
  onUserJoined(callback: (data: any) => void) { return this.on('board:user:joined', callback); }
  onUserLeft(callback: (data: any) => void) { return this.on('board:user:left', callback); }

  // Classroom Realtime
  joinClassroom(classroomId: string) { this.emit('classroom:join', { classroomId }); }
  leaveClassroom(classroomId: string) { this.emit('classroom:leave', { classroomId }); }
  sendChat(classroomId: string, message: string) { this.emit('classroom:chat', { classroomId, message }); }
  raiseHand(classroomId: string) { this.emit('classroom:hand:raise', { classroomId }); }
  lowerHand(classroomId: string) { this.emit('classroom:hand:lower', { classroomId }); }
  sendPollVote(classroomId: string, pollId: string, optionId: string) {
    this.emit('classroom:poll:vote', { classroomId, pollId, optionId });
  }

  onChat(callback: (data: any) => void) { return this.on('classroom:chat:received', callback); }
  onHandRaised(callback: (data: any) => void) { return this.on('classroom:hand:raised', callback); }
  onPollUpdate(callback: (data: any) => void) { return this.on('classroom:poll:update', callback); }
  onStudentJoined(callback: (data: any) => void) { return this.on('classroom:student:joined', callback); }
  onStudentLeft(callback: (data: any) => void) { return this.on('classroom:student:left', callback); }

  // Gesture Streaming
  sendGesture(data: any) { this.emit('gesture:data', data); }
  onGesture(callback: (data: any) => void) { return this.on('gesture:data:received', callback); }

  // AI
  requestAISummary(lectureId: string) { this.emit('ai:summary:request', { lectureId }); }
  onAISummary(callback: (data: any) => void) { return this.on('ai:summary:ready', callback); }

  isConnected(): boolean { return this.socket?.connected ?? false; }
}

export const socketService = new EduBoardSocket();
