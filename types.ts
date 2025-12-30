export interface LottieFile {
  v: string;
  fr: number;
  ip: number;
  op: number;
  w: number;
  h: number;
  nm: string;
  layers: any[];
  assets: any[];
}

export enum Resolution {
  HD = '720p',
  FHD = '1080p',
  UHD = '4K'
}

export enum FrameRate {
  FPS_30 = 30,
  FPS_60 = 60,
  FPS_120 = 120
}

export interface ConvertOptions {
  resolution: Resolution;
  fps: FrameRate;
}

export interface ConversionStatus {
  state: 'idle' | 'loading_ffmpeg' | 'rendering' | 'encoding' | 'completed' | 'error';
  progress: number; // 0 to 100
  message?: string;
  outputUrl?: string;
  error?: string;
}

export interface GeminiAnalysisResult {
  summary: string;
  technicalDetails: string;
  creativeSuggestions: string;
}
