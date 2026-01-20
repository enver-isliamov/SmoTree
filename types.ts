
export enum UserRole {
  ADMIN = 'Admin',
  EDITOR = 'Editor',
  REVIEWER = 'Reviewer',
  CLIENT = 'Client'
}

export enum CommentStatus {
  OPEN = 'open',
  RESOLVED = 'resolved'
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  role: UserRole;
}

export interface Point {
  x: number;
  y: number;
}

export type ShapeType = 'pen' | 'rect' | 'arrow';

export interface Drawing {
  color: string;
  shapeType: ShapeType;
  points: Point[];
  canvasWidth: number;
  canvasHeight: number;
}

export interface Comment {
  id: string;
  userId: string;
  timestamp: number; // in seconds (Start time)
  duration?: number; // Optional duration in seconds
  text: string;
  status: CommentStatus;
  createdAt: string;
  drawing?: Drawing | null;
  replies?: Comment[];
}

export interface VideoVersion {
  id: string;
  versionNumber: number;
  url: string;
  uploadedAt: string;
  filename: string;
  comments: Comment[];
  // Temporary fields for local session playback
  localFileUrl?: string; 
  localFileName?: string;
}

export interface ProjectAsset {
  id: string;
  title: string;
  thumbnail: string;
  versions: VideoVersion[];
  currentVersionIndex: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  client: string;
  updatedAt: string;
  assets: ProjectAsset[];
  team: User[];
  ownerId?: string;
}