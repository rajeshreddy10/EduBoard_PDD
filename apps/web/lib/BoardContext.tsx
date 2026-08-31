'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react';
import { Board, DrawingStroke, GestureData, GestureMapping } from '@/lib/types';
import * as store from '@/lib/store';
import { socketService } from '@/lib/socket';
import { historyService } from '@/lib/services/firebaseData';
import { useAuth } from '@/lib/AuthContext';

interface BoardContextType {
  currentBoard: Board | null;
  boards: Board[];
  strokes: DrawingStroke[];
  selectedTool: string;
  selectedColor: string;
  strokeWidth: number;
  opacity: number;
  zoom: number;
  offset: { x: number; y: number };
  isDrawing: boolean;
  gesture: GestureData | null;
  collaborators: { userId: string; name: string; color: string; cursor?: { x: number; y: number } }[];
  undoStack: DrawingStroke[][];
  redoStack: DrawingStroke[][];
  waypoints: { id: string; name: string; x: number; y: number; zoom: number }[];
  addWaypoint: (name: string) => void;
  goToWaypoint: (id: string) => void;
  removeWaypoint: (id: string) => void;
  setCurrentBoard: (board: Board | null) => void;
  setSelectedTool: (tool: string) => void;
  setSelectedColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setOpacity: (opacity: number) => void;
  setZoom: (zoom: number) => void;
  setOffset: (offset: { x: number; y: number }) => void;
  setIsDrawing: (drawing: boolean) => void;
  addStroke: (stroke: DrawingStroke) => void;
  undo: () => void;
  redo: () => void;
  clearBoard: () => void;
  loadBoard: (id: string) => void;
  createBoard: (title?: string) => Board;
  saveBoard: (payload?: Board) => Promise<void>;
  deleteBoard: (id: string) => void;
  exportBoard: (format: 'png' | 'pdf' | 'json') => void;
  handleGesture: (gesture: GestureData) => void;
}

const BoardContext = createContext<BoardContextType | undefined>(undefined);

export function BoardProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [selectedTool, setSelectedTool] = useState('pen');
  const [selectedColor, setSelectedColor] = useState('#6366f1');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [opacity, setOpacity] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [gesture, setGesture] = useState<GestureData | null>(null);
  const [undoStack, setUndoStack] = useState<DrawingStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawingStroke[][]>([]);
  const [waypoints, setWaypoints] = useState<{ id: string; name: string; x: number; y: number; zoom: number }[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const strokesRef = useRef<DrawingStroke[]>([]);

  const addWaypoint = useCallback((name: string) => {
    const newWaypoint = {
      id: Date.now().toString(),
      name: name || `View ${waypoints.length + 1}`,
      x: offset.x,
      y: offset.y,
      zoom: zoom
    };
    setWaypoints(prev => [...prev, newWaypoint]);
    store.addActivity({ type: 'board_edited', description: `Added waypoint "${name}"` });
  }, [offset, zoom, waypoints.length]);

  const goToWaypoint = useCallback((id: string) => {
    const wp = waypoints.find(w => w.id === id);
    if (wp) {
      // Smoothly update the view
      setOffset({ x: wp.x, y: wp.y });
      setZoom(wp.zoom);
    }
  }, [waypoints]);

  const removeWaypoint = useCallback((id: string) => {
    setWaypoints(prev => prev.filter(w => w.id !== id));
  }, []);

  useEffect(() => { strokesRef.current = strokes; }, [strokes]);

  // Load user boards/history from Firestore if user logged in, else fallback to local store
  useEffect(() => {
    if (user?.id) {
      const unsub = historyService.subscribeToHistory(user.id, (firestoreItems) => {
        if (firestoreItems.length > 0) {
          setBoards(firestoreItems);
        } else {
          // If Firestore is empty, seed with local store
          const local = store.getBoards();
          setBoards(local);
          // Sync local boards to Firestore for this user
          local.forEach(b => historyService.saveHistoryItem(user.id, { ...b, createdBy: user.id }));
        }
      });
      return () => { if (unsub) unsub(); };
    } else {
      setBoards(store.getBoards());
    }
  }, [user?.id]);

  useEffect(() => {
    const unsubStroke = socketService.onStroke((data) => {
      if (data.boardId === currentBoard?.id) {
        setStrokes(prev => [...prev, data.stroke]);
      }
    });
    const unsubCursor = socketService.onCursor((data) => {
      if (data.boardId === currentBoard?.id) {
        setCollaborators(prev => prev.map(c => c.userId === data.userId ? { ...c, cursor: data.position } : c));
      }
    });
    return () => { unsubStroke(); unsubCursor(); };
  }, [currentBoard?.id]);

  const addStroke = useCallback((stroke: DrawingStroke) => {
    setStrokes(prev => {
      setUndoStack(u => [...u, prev]);
      const next = [...prev, stroke];
      strokesRef.current = next;
      setRedoStack([]);
      return next;
    });
    if (currentBoard) socketService.sendStroke(currentBoard.id, stroke);
  }, [currentBoard]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(u => u.slice(0, -1));
    setRedoStack(r => [...r, strokes]);
    setStrokes(prev);
  }, [undoStack, strokes]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(r => r.slice(0, -1));
    setUndoStack(u => [...u, strokes]);
    setStrokes(next);
  }, [redoStack, strokes]);

  const clearBoard = useCallback(() => {
    setUndoStack(u => [...u, strokes]);
    setStrokes([]);
    setRedoStack([]);
  }, [strokes]);

  const loadBoard = useCallback(async (id: string) => {
    let board = boards.find(b => b.id === id) || store.getBoard(id);
    if (!board && user?.id) {
      board = (await historyService.getHistoryItem(user.id, id)) || undefined;
    }
    if (board) {
      setCurrentBoard(board);
      setStrokes(store.getDrawings(id));
      setUndoStack([]);
      setRedoStack([]);
      socketService.joinBoard(id);
    }
  }, [boards, user]);

  const createBoard = useCallback((title?: string) => {
    const board = store.createBoard({ title, createdBy: user?.id || 'u1' });
    if (user?.id) {
      historyService.saveHistoryItem(user.id, board).catch(console.error);
    }
    setBoards(prev => [board, ...prev.filter(b => b.id !== board.id)]);
    loadBoard(board.id);
    store.addActivity({ type: 'board_created', description: `Created session "${board.title}"` });
    return board;
  }, [loadBoard, user]);

  const saveBoard = useCallback(async (payload?: Board) => {
    const targetBoard = payload || currentBoard;
    if (!targetBoard) return;

    const updatedBoard: Board = {
      ...targetBoard,
      content: payload?.content || (strokes.length > 0 ? JSON.stringify(strokes) : targetBoard.content || ''),
      updatedAt: new Date().toISOString()
    };

    store.saveDrawings(targetBoard.id, payload?.strokes || strokes);
    store.updateBoard(targetBoard.id, updatedBoard);
    
    if (user?.id) {
      await historyService.saveHistoryItem(user.id, updatedBoard);
    }
    
    setBoards(prev => {
      const exists = prev.some(b => b.id === targetBoard.id);
      if (exists) {
        return prev.map(b => b.id === targetBoard.id ? updatedBoard : b);
      }
      return [updatedBoard, ...prev];
    });

    store.addActivity({ type: 'board_edited', description: `Saved history session "${targetBoard.title}"` });
  }, [currentBoard, strokes, user]);

  const deleteBoard = useCallback((id: string) => {
    store.deleteBoard(id);
    if (user?.id) {
      historyService.deleteHistoryItem(user.id, id).catch(console.error);
    }
    setBoards(prev => prev.filter(b => b.id !== id));
    if (currentBoard?.id === id) {
      setCurrentBoard(null);
      setStrokes([]);
    }
  }, [currentBoard?.id, user]);

  const exportBoard = useCallback((format: 'png' | 'pdf' | 'json') => {
    if (!currentBoard) return;
    store.addActivity({ type: 'export', description: `Exported "${currentBoard.title}" as ${format.toUpperCase()}` });
  }, [currentBoard]);

  const handleGesture = useCallback((gestureData: GestureData) => {
    setGesture(gestureData);
    const mappings = store.getGestureMappings();
    const mapping = mappings.find(m => m.gesture === gestureData.gestureName && m.isActive);
    if (!mapping) return;

    switch (mapping.action) {
      case 'draw': setIsDrawing(true); break;
      case 'erase': setSelectedTool('eraser'); break;
      case 'clear': clearBoard(); break;
      case 'undo': undo(); break;
      case 'redo': redo(); break;
      case 'pan': break;
      case 'zoom': break;
      case 'select': setSelectedTool('select'); break;
    }
  }, [clearBoard, undo, redo]);

  return (
    <BoardContext.Provider value={{
      currentBoard, boards, strokes, selectedTool, selectedColor, strokeWidth, opacity,
      zoom, offset, isDrawing, gesture, collaborators,
      undoStack, redoStack, waypoints,
      setCurrentBoard, setSelectedTool, setSelectedColor, setStrokeWidth, setOpacity,
      setZoom, setOffset, setIsDrawing,
      addStroke, undo, redo, clearBoard, loadBoard, createBoard, saveBoard, deleteBoard, exportBoard, handleGesture,
      addWaypoint, goToWaypoint, removeWaypoint
    }}>
      {children}
    </BoardContext.Provider>
  );
}

export function useBoard() {
  const context = useContext(BoardContext);
  if (!context) throw new Error('useBoard must be used within BoardProvider');
  return context;
}

