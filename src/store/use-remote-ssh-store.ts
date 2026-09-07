import { create } from "zustand";

export interface SshHost {
  name: string;
  hostName: string;
  user: string;
  identityFile: string;
  port?: number;
  password?: string;
}

interface RemoteSshState {
  connectedHost: SshHost | null;
  setConnectedHost: (host: SshHost | null) => void;
  isConnecting: boolean;
  setIsConnecting: (connecting: boolean) => void;
  editingFilePath: string | null;
  setEditingFilePath: (path: string | null) => void;
}

export const useRemoteSshStore = create<RemoteSshState>((set) => ({
  connectedHost: null,
  setConnectedHost: (host) => set({ connectedHost: host }),
  isConnecting: false,
  setIsConnecting: (connecting) => set({ isConnecting: connecting }),
  editingFilePath: null,
  setEditingFilePath: (path) => set({ editingFilePath: path }),
}));
