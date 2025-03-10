import { createContext } from 'react';
import type { CallStore } from '../store/CallStore';

export const CallStoreContext = createContext<CallStore>({} as CallStore);
