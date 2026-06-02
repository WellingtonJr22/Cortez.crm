/// <reference types="vite/client" />

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (res: any) => void }) => void;
          renderButton: (element: HTMLElement, options: { theme: string; size: string }) => void;
        };
      };
    };
  }
}

export {};
