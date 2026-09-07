import React, { useEffect, useState } from "react";
import { Server, X, Copy, Terminal, Edit } from "lucide-react";
import toast from "react-hot-toast";

import { BaseModalTitle } from "#/components/shared/modals/confirmation-modals/base-modal";
import { ModalBackdrop } from "#/components/shared/modals/modal-backdrop";
import { ModalCloseButton } from "#/components/shared/modals/modal-close-button";
import { modalWidthClassName } from "#/components/shared/modals/modal-body";
import { BrandButton } from "#/components/features/settings/brand-button";
import { cn } from "#/utils/utils";
import { modalTitleSmClassName } from "#/utils/modal-classes";
import { LocalWorkspace } from "#/types/workspace";
import { workspaceFromPath } from "#/utils/desktop-folder-path";
import { useRemoteSshStore } from "#/store/use-remote-ssh-store";
import { useNavigation } from "#/context/navigation-context";

interface SshHost {
  name: string;
  hostName: string;
  user: string;
  identityFile: string;
}

interface SshHostBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAbsoluteFolders: (workspaces: LocalWorkspace[]) => void;
}

export function SshHostBrowserModal({
  isOpen,
  onClose,
  onAddAbsoluteFolders,
}: SshHostBrowserModalProps) {
  const [hosts, setHosts] = useState<SshHost[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [sshfsError, setSshfsError] = useState(false);
  const [promptPasswordFor, setPromptPasswordFor] = useState<SshHost | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const { setConnectedHost } = useRemoteSshStore();
  const { navigate } = useNavigation();

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      window.desktop?.getSshHosts?.().then(h => {
        setHosts(h || []);
        setLoading(false);
      }).catch(e => {
        toast.error("Failed to load SSH hosts");
        setLoading(false);
      });
    }
  }, [isOpen]);

  const handleConnect = async (host: SshHost) => {
    setConnecting(host.name);
    try {
      const result = await window.desktop?.connectSsh?.(host);
      if (result && result.success) {
        setConnectedHost(host);
        onClose();
        setPromptPasswordFor(null);
        setPasswordInput("");
        toast.success(`Conectado a ${host.name}`);
        navigate("/");
      } else {
        toast.error("Failed to connect to SSH server");
      }
    } catch (error: any) {
      const msg = error.message || "";
      if (msg.toLowerCase().includes("auth") || msg.toLowerCase().includes("methods failed") || msg.toLowerCase().includes("permission denied")) {
        setPromptPasswordFor(host);
        toast.error(`Authentication required for ${host.name}`);
      } else {
        toast.error(msg || "Failed to connect to SSH server");
      }
    } finally {
      setConnecting(null);
    }
  };

  const handleEditConfig = async () => {
    try {
      const success = await window.desktop?.openSshConfig?.();
      if (!success) {
        toast.error("Failed to open ~/.ssh/config");
      }
    } catch (err) {
      toast.error("Error opening config file");
    }
  };

  if (!isOpen) return null;

  return (
    <ModalBackdrop onClose={onClose}>
      <div
        className={cn(
          "relative flex flex-col rounded-xl bg-[var(--oh-background)] shadow-2xl",
          modalWidthClassName,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 pb-4">
          <BaseModalTitle className={modalTitleSmClassName}>
            Connect to Remote SSH Server
          </BaseModalTitle>
          <ModalCloseButton onClose={onClose} />
        </div>

        <div className="flex flex-col gap-4 p-6 pt-0">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm text-[var(--oh-text-secondary)]">
              Select a host from your <code>~/.ssh/config</code> to mount as a workspace.
            </p>
            <BrandButton variant="secondary" onClick={handleEditConfig} className="shrink-0 gap-2">
              <Edit className="size-4" />
              <span>Edit Config</span>
            </BrandButton>
          </div>


          {sshfsError ? (
            <div className="flex flex-col gap-3 rounded-lg border border-red-500/50 bg-red-500/10 p-4">
              <div className="flex items-start gap-3">
                <Terminal className="mt-0.5 size-5 shrink-0 text-red-400" />
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold text-white">Missing Dependencies</h3>
                  <p className="text-xs text-[var(--oh-text-secondary)]">
                    Your Mac requires <code>mutagen</code> to connect to remote servers. Run the following command in your terminal to install it.
                  </p>
                  <div className="mt-2 flex items-center justify-between rounded bg-black/40 px-3 py-2">
                    <code className="text-[10px] text-white">brew trust mutagen-io/mutagen && brew install mutagen-io/mutagen/mutagen</code>
                    <button
                      type="button"
                      className="ml-2 text-[var(--oh-muted)] hover:text-white"
                      onClick={() => {
                        navigator.clipboard.writeText("brew trust mutagen-io/mutagen && brew install mutagen-io/mutagen/mutagen");
                        toast.success("Copied to clipboard");
                      }}
                      title="Copy to clipboard"
                    >
                      <Copy className="size-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <BrandButton variant="secondary" onClick={() => setSshfsError(false)}>
                      Dismiss
                    </BrandButton>
                  </div>
                </div>
              </div>
            </div>
           ) : promptPasswordFor ? (
            <div className="flex flex-col gap-4 p-4 rounded-lg border border-[var(--oh-border)] bg-[#1e1e1e]">
              <h3 className="text-sm font-semibold text-white">Password required for {promptPasswordFor.name}</h3>
              <input
                type="password"
                className="w-full bg-[var(--oh-background)] border border-[var(--oh-border)] rounded px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter SSH password..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && passwordInput) {
                    void handleConnect({ ...promptPasswordFor, password: passwordInput });
                  }
                }}
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-2">
                <BrandButton variant="secondary" onClick={() => setPromptPasswordFor(null)}>
                  Cancel
                </BrandButton>
                <BrandButton 
                  variant="primary" 
                  isDisabled={!passwordInput || connecting !== null}
                  onClick={() => void handleConnect({ ...promptPasswordFor, password: passwordInput })}
                >
                  {connecting ? "Connecting..." : "Connect"}
                </BrandButton>
              </div>
            </div>
           ) : (
            <div className="max-h-[300px] overflow-y-auto rounded-lg border border-[var(--oh-border)] bg-[#1e1e1e]">
              {loading ? (
                <div className="p-4 text-center text-sm text-[var(--oh-muted)]">Loading hosts...</div>
              ) : hosts.length === 0 ? (
                <div className="flex flex-col items-center gap-3 p-8 text-center text-sm text-[var(--oh-muted)]">
                  <p>No SSH hosts found in ~/.ssh/config</p>
                  <BrandButton variant="primary" onClick={handleEditConfig}>
                    Create Config File
                  </BrandButton>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--oh-border)]">
                {hosts.map((host, idx) => (
                  <li key={idx} className="flex items-center justify-between p-3 hover:bg-[var(--oh-background)]">
                    <div className="flex items-center gap-3">
                      <Server className="size-5 text-[var(--oh-text-secondary)]" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">{host.name}</span>
                        <span className="text-xs text-[var(--oh-muted)]">{host.user}@{host.hostName}</span>
                      </div>
                    </div>
                    <BrandButton
                      variant="primary"
                      onClick={() => void handleConnect(host)}
                      isDisabled={connecting !== null}
                    >
                      {connecting === host.name ? "Connecting..." : "Connect"}
                    </BrandButton>
                  </li>
                ))}
              </ul>
            )}
            </div>
          )}
        </div>
      </div>
    </ModalBackdrop>
  );
}
