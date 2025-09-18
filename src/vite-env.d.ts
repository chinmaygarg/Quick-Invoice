/// <reference types="vite/client" />

// Tauri API types
declare global {
  interface Window {
    __TAURI__: {
      invoke: (command: string, args?: Record<string, any>) => Promise<any>;
      listen: (event: string, handler: (event: any) => void) => Promise<any>;
      emit: (event: string, payload?: any) => Promise<void>;
      convertFileSrc: (filePath: string) => string;
    };
  }
}

export {};