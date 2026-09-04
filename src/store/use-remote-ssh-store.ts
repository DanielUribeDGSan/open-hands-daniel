import { create } from "zustand";

export interface SshHost {
  name: string;
  hostName: string;
  user: string;
  identityFile: string;
  port?: number;
}

interface RemoteSshState {
  connectedHost: SshHost | null;
  setConnectedHost: (host: SshHost | null) => void;
  isConnecting: boolean;
  setIsConnecting: (connecting: boolean) => void;
}

export const useRemoteSshStore = create<RemoteSshState>((set) => ({
  connectedHost: null,
  setConnectedHost: (host) => set({ connectedHost: host }),
  isConnecting: false,
  setIsConnecting: (connecting) => set({ isConnecting: connecting }),
}));
