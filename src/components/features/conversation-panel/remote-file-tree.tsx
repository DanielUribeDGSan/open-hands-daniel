import React, { useState, useEffect } from "react";
import { Folder, FolderOpen, FileText } from "lucide-react";
import { useRemoteSshStore } from "#/store/use-remote-ssh-store";
import { useNavigation } from "#/context/navigation-context";

interface RemoteFileNode {
  name: string;
  path: string;
  isDirectory: boolean;
}

interface TreeItemProps {
  node: RemoteFileNode;
}

const TreeItem: React.FC<TreeItemProps> = ({ node }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState<RemoteFileNode[]>([]);
  const [loading, setLoading] = useState(false);
  const { setEditingFilePath } = useRemoteSshStore();

  const toggleOpen = async () => {
    if (!node.isDirectory) {
      setEditingFilePath(node.path);
      return;
    }
    if (!isOpen && children.length === 0) {
      setLoading(true);
      try {
        const files = await window.desktop?.listRemoteFiles?.(node.path);
        if (files) setChildren(files);
      } catch (e) {
        console.error("Failed to list files", e);
      }
      setLoading(false);
    }
    setIsOpen(!isOpen);
  };

  const handleDragStart = (e: React.DragEvent) => {
    // Both files and folders can be dragged
    e.dataTransfer.setData("application/x-remote-folder", JSON.stringify(node));
  };

  return (
    <div className="pl-4">
      <div
        className="flex items-center space-x-2 cursor-pointer hover:bg-zinc-800/50 py-1 px-2 rounded group"
        onClick={toggleOpen}
        draggable={true}
        onDragStart={handleDragStart}
      >
        {node.isDirectory ? (
          isOpen ? <FolderOpen size={16} className="text-blue-400" /> : <Folder size={16} className="text-blue-400" />
        ) : (
          <FileText size={16} className="text-zinc-400" />
        )}
        <span className="text-sm truncate select-none text-zinc-200">{node.name}</span>
        {loading && <span className="text-[10px] text-zinc-500 animate-pulse">...</span>}
      </div>
      
      {isOpen && node.isDirectory && (
        <div className="border-l border-zinc-800 ml-2 mt-1">
          {children.map(child => (
            <TreeItem key={child.path} node={child} />
          ))}
        </div>
      )}
    </div>
  );
};

export const RemoteFileTree: React.FC = () => {
  const { connectedHost, setConnectedHost } = useRemoteSshStore();
  const [rootPath, setRootPath] = useState("/");
  const [inputPath, setInputPath] = useState("/");
  const [rootFiles, setRootFiles] = useState<RemoteFileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { navigate } = useNavigation();

  // Debounce el inputPath -> rootPath
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputPath.trim() !== "") {
        setRootPath(inputPath);
      }
    }, 600); // 600ms debounce
    return () => clearTimeout(timer);
  }, [inputPath]);

  useEffect(() => {
    if (!connectedHost) return;
    let isMounted = true;
    
    const loadRoot = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const files = await window.desktop?.listRemoteFiles?.(rootPath);
        if (isMounted && files) {
          setRootFiles(files);
        }
      } catch (e: any) {
        if (isMounted) setErrorMsg("Error: No se pudo cargar la ruta (verifica que exista y sea válida).");
        console.error("Failed to load root", e);
      }
      if (isMounted) setLoading(false);
    };
    loadRoot();

    return () => { isMounted = false; };
  }, [connectedHost, rootPath]);

  const handleDisconnect = async () => {
    await window.desktop?.disconnectSsh?.();
    setConnectedHost(null);
    navigate("/");
  };

  if (!connectedHost) return null;

  return (
    <div className="flex flex-col flex-1 overflow-y-auto">
      <div className="flex items-center justify-between bg-green-900/20 text-green-400 text-xs px-4 py-2 mb-2 border-b border-green-900/30">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span className="font-semibold truncate">Conectado a {connectedHost.name}</span>
        </div>
        <button 
          onClick={handleDisconnect}
          className="text-xs text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/40 px-2 py-1 rounded transition-colors"
        >
          Salir
        </button>
      </div>

      <div className="px-4 mb-2 flex items-center gap-2">
        <input
          type="text"
          className="flex-1 bg-[var(--oh-background)] border border-[var(--oh-border)] rounded px-2 py-1 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-blue-500 transition-colors"
          placeholder="/var/www/html"
          value={inputPath}
          onChange={(e) => setInputPath(e.target.value)}
        />
      </div>
      
      <div className="text-[10px] text-zinc-500 px-4 mb-2">Arrastra una carpeta al chat</div>

      {loading ? (
        <div className="text-sm text-zinc-400 px-4 animate-pulse">Cargando archivos...</div>
      ) : errorMsg ? (
        <div className="text-sm text-red-400 px-4">{errorMsg}</div>
      ) : (
        <div className="pb-4">
          {rootFiles.map(node => (
            <TreeItem key={node.path} node={node} />
          ))}
        </div>
      )}
    </div>
  );
};
