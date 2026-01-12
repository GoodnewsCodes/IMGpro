export {};

declare global {
  interface Window {
    electronAPI: {
      ping: () => Promise<string>;
      convertImage: (data: {
        inputPath?: string;
        buffer?: Uint8Array;
        format: string;
        quality?: number;
      }) => Promise<{ success: boolean; buffer?: Uint8Array; error?: string }>;
      optimizeImage: (data: {
        buffer: Uint8Array;
        format?: string;
        quality?: number;
        preset?: "small" | "balanced" | "high";
      }) => Promise<{ success: boolean; buffer?: Uint8Array; error?: string }>;
      resizeImage: (data: {
        inputPath?: string;
        buffer?: Uint8Array;
        width?: number;
        height?: number;
        fit?: string;
        format?: string;
        quality?: number;
        mask?: "square" | "rounded" | "circle";
      }) => Promise<{ success: boolean; buffer?: Uint8Array; error?: string }>;
      manipulateImage: (data: {
        buffer: Uint8Array;
        crop?: { left: number; top: number; width: number; height: number };
        rotate?: number;
        flip?: boolean;
        flop?: boolean;
        round?: boolean;
      }) => Promise<{ success: boolean; buffer?: Uint8Array; error?: string }>;
      mirrorImage: (data: {
        buffer: Uint8Array;
        type: string;
      }) => Promise<{ success: boolean; buffer?: Uint8Array; error?: string }>;
      generateIco: (
        buffers: Uint8Array[]
      ) => Promise<{ success: boolean; buffer?: Uint8Array; error?: string }>;
      selectSavePath: (defaultPath: string) => Promise<string | null>;
      saveFile: (data: {
        filePath: string;
        buffer: Uint8Array;
      }) => Promise<{ success: boolean; error?: string }>;
      getRemoveBgKey: () => Promise<string | null>;
      setRemoveBgKey: (
        key: string
      ) => Promise<{ success: boolean; error?: string }>;
      removeBgApi: (
        buffer: Uint8Array
      ) => Promise<{ success: boolean; buffer?: Uint8Array; error?: string }>;
      clearCache: () => Promise<{ success: boolean; error?: string }>;
    };
  }
}
