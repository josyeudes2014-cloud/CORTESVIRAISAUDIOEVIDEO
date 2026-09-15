import type { ExportResult, LocalProject, MediaKind } from '../types';

const GIGABYTE = 1024 * 1024 * 1024;
export const MAX_LOCAL_FILE_SIZE = 8 * GIGABYTE;

export const ACCEPTED_MEDIA_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-matroska',
  'video/x-msvideo',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/aac',
  'audio/flac',
  'audio/ogg',
];

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const whole = Math.floor(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? value.toFixed(0) : value.toFixed(1)} ${
    units[exponent]
  }`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getMediaKind(file: File): MediaKind | null {
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';

  const extension = file.name.split('.').pop()?.toLowerCase();
  if (['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v'].includes(extension ?? '')) {
    return 'video';
  }
  if (['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg'].includes(extension ?? '')) {
    return 'audio';
  }
  return null;
}

function readDuration(url: string, kind: MediaKind): Promise<number> {
  return new Promise((resolve, reject) => {
    const media = document.createElement(kind === 'video' ? 'video' : 'audio');
    media.preload = 'metadata';
    media.src = url;

    const cleanup = () => {
      media.removeAttribute('src');
      media.load();
    };

    media.addEventListener(
      'loadedmetadata',
      () => {
        const duration = media.duration;
        cleanup();
        if (!Number.isFinite(duration) || duration <= 0) {
          reject(new Error('Não foi possível identificar a duração deste arquivo.'));
          return;
        }
        resolve(duration);
      },
      { once: true },
    );

    media.addEventListener(
      'error',
      () => {
        cleanup();
        reject(
          new Error(
            'Este arquivo não pôde ser aberto pelo navegador. Tente MP4, WebM, MP3 ou WAV.',
          ),
        );
      },
      { once: true },
    );
  });
}

export async function createLocalProject(file: File): Promise<LocalProject> {
  const kind = getMediaKind(file);
  if (!kind) {
    throw new Error('Selecione um arquivo de vídeo ou áudio compatível.');
  }
  if (file.size <= 0) {
    throw new Error('O arquivo selecionado está vazio.');
  }
  if (file.size > MAX_LOCAL_FILE_SIZE) {
    throw new Error('Para esta versão local, use arquivos de até 8 GB.');
  }

  const url = URL.createObjectURL(file);
  try {
    const duration = await readDuration(url, kind);
    return {
      id: crypto.randomUUID(),
      name: file.name.replace(/\.[^/.]+$/, ''),
      file,
      url,
      kind,
      duration,
      size: file.size,
      createdAt: Date.now(),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

type CaptureMediaElement = HTMLMediaElement & {
  captureStream?: () => MediaStream;
  mozCaptureStream?: () => MediaStream;
};

function getRecorderFormat(kind: MediaKind): {
  mimeType: string;
  extension: ExportResult['extension'];
} | null {
  if (typeof MediaRecorder === 'undefined') return null;

  const options =
    kind === 'video'
      ? [
          ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'mp4'],
          ['video/mp4', 'mp4'],
          ['video/webm;codecs=vp9,opus', 'webm'],
          ['video/webm;codecs=vp8,opus', 'webm'],
          ['video/webm', 'webm'],
        ]
      : [
          ['audio/mp4', 'm4a'],
          ['audio/webm;codecs=opus', 'webm'],
          ['audio/webm', 'webm'],
        ];

  for (const [mimeType, extension] of options) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return {
        mimeType,
        extension: extension as ExportResult['extension'],
      };
    }
  }
  return null;
}

function waitForSeek(media: HTMLMediaElement, target: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (Math.abs(media.currentTime - target) < 0.025) {
      resolve();
      return;
    }

    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Não foi possível posicionar o vídeo no início do corte.'));
    };
    const cleanup = () => {
      media.removeEventListener('seeked', onSeeked);
      media.removeEventListener('error', onError);
    };

    media.addEventListener('seeked', onSeeked);
    media.addEventListener('error', onError);
    media.currentTime = target;
  });
}

export async function exportMediaRange(
  media: HTMLMediaElement,
  kind: MediaKind,
  start: number,
  end: number,
): Promise<ExportResult> {
  if (end <= start) {
    throw new Error('O final do corte precisa ser maior que o início.');
  }
  if (end - start < 0.25) {
    throw new Error('Selecione pelo menos 0,25 segundo para exportar.');
  }

  const format = getRecorderFormat(kind);
  if (!format) {
    throw new Error(
      'Este navegador não oferece exportação local compatível. Use uma versão recente do Chrome ou Edge.',
    );
  }

  const captureMedia = media as CaptureMediaElement;
  const capture = captureMedia.captureStream ?? captureMedia.mozCaptureStream;
  if (!capture) {
    throw new Error(
      'Seu navegador não permite capturar a mídia para exportação local. Use Chrome ou Edge atualizado.',
    );
  }

  media.pause();
  await waitForSeek(media, start);

  const stream = capture.call(media);
  if (stream.getTracks().length === 0) {
    throw new Error('Não foi possível capturar as faixas deste arquivo.');
  }

  const chunks: BlobPart[] = [];
  const videoElement = media instanceof HTMLVideoElement ? media : null;
  const pixelCount = videoElement
    ? videoElement.videoWidth * videoElement.videoHeight
    : 0;
  const videoBitsPerSecond =
    pixelCount >= 3840 * 2160 ? 20_000_000 : pixelCount >= 1920 * 1080 ? 10_000_000 : 6_000_000;

  const recorder = new MediaRecorder(stream, {
    mimeType: format.mimeType,
    ...(kind === 'video' ? { videoBitsPerSecond } : {}),
    audioBitsPerSecond: 192_000,
  });

  const result = new Promise<ExportResult>((resolve, reject) => {
    let rafId = 0;
    let settled = false;

    const cleanup = () => {
      cancelAnimationFrame(rafId);
      media.removeEventListener('ended', stopRecording);
      stream.getTracks().forEach((track) => track.stop());
    };

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(message));
    };

    const stopRecording = () => {
      if (recorder.state !== 'inactive') recorder.stop();
    };

    const watch = () => {
      if (media.currentTime >= end || media.ended) {
        media.pause();
        stopRecording();
        return;
      }
      rafId = requestAnimationFrame(watch);
    };

    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    });

    recorder.addEventListener(
      'error',
      () => fail('A exportação foi interrompida pelo navegador.'),
      { once: true },
    );

    recorder.addEventListener(
      'stop',
      () => {
        if (settled) return;
        settled = true;
        cleanup();
        const blob = new Blob(chunks, { type: format.mimeType });
        if (blob.size === 0) {
          reject(new Error('O navegador não gerou dados para este corte.'));
          return;
        }
        resolve({
          blob,
          extension: format.extension,
          mimeType: format.mimeType,
        });
      },
      { once: true },
    );

    recorder.start(250);
    void media
      .play()
      .then(() => {
        rafId = requestAnimationFrame(watch);
      })
      .catch(() => fail('O navegador bloqueou a reprodução necessária para exportar.'));
  });

  return result;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
