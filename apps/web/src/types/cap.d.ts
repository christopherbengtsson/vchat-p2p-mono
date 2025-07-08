declare module '@cap.js/widget' {
  export interface CapSolution {
    token: string;
  }

  export interface CapOptions {
    apiEndpoint: string;
    workers?: number;
  }

  export interface CapEventDetail {
    token?: string;
    message?: string;
    progress?: number;
  }

  export interface CapEvent extends CustomEvent {
    detail: CapEventDetail;
  }

  class Cap {
    constructor(options: CapOptions);
    solve(): Promise<CapSolution>;
    reset(): void;
    token: string;
    addEventListener(
      event: 'solve' | 'error' | 'progress',
      handler: (event: CapEvent) => void,
    ): void;
    removeEventListener(
      event: 'solve' | 'error' | 'progress',
      handler: (event: CapEvent) => void,
    ): void;
  }

  export default Cap;
}
