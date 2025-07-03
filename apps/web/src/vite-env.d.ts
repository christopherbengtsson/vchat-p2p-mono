/// <reference types="vite/client" />
import { RootStore } from './stores/RootStore';

declare global {
  const APP_VERSION: string;

  interface Window {
    rootStore: RootStore;
  }
}
