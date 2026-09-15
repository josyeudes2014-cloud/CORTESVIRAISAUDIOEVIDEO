export type MediaKind = 'video' | 'audio';

export interface LocalProject {
  id: string;
  name: string;
  file: File;
  url: string;
  kind: MediaKind;
  duration: number;
  size: number;
  createdAt: number;
}

export interface ClipRange {
  start: number;
  end: number;
}

export type WorkspaceTab = 'moments' | 'transcript' | 'clips';

export interface ExportResult {
  blob: Blob;
  extension: 'mp4' | 'webm' | 'm4a';
  mimeType: string;
}
