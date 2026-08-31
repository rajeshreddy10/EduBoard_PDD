export interface RippleEffect {
  id: string;
  x: number;
  y: number;
  color: string;
  startTime: number;
}

export interface LaserPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface BoardElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  [key: string]: any;
}

export interface BoardState {
  id: string;
  title: string;
  elements: BoardElement[];
  zoom: number;
  panX: number;
  panY: number;
  activeTool: string;
}
