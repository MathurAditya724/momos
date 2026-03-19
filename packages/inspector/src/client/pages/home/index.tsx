import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderOpen, GitBranch, Globe } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { CloneRepoModal } from "@/client/components/CloneRepoModal";
import { ConnectRemoteModal } from "@/client/components/ConnectRemoteModal";
import { Logo } from "@/client/components/Logo";
import { Button } from "@/client/components/ui/button";
import { Spinner } from "@/client/components/ui/spinner";
import { apiFetch, updateWorkspace, type Workspace } from "@/client/lib/api";

type WorkspacesResponse = {
  data: Workspace[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
};

async function fetchWorkspaces(): Promise<WorkspacesResponse> {
  return apiFetch<WorkspacesResponse>("/api/workspaces");
}

export default function HomePage() {
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [remoteModalOpen, setRemoteModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    data: response,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["workspaces"],
    queryFn: fetchWorkspaces,
  });

  const workspaces = response?.data ?? [];

  const handleOpenProject = async () => {
    if (!window.electronAPI) {
      toast.error("Open Project is only available in Electron");
      return;
    }

    const selectedPath = await window.electronAPI.selectFolder();
    if (selectedPath) {
      try {
        const workspace = await apiFetch<Workspace>("/api/workspaces", {
          method: "POST",
          body: JSON.stringify({ path: selectedPath }),
        });

        // Refresh workspaces list
        queryClient.invalidateQueries({ queryKey: ["workspaces"] });
        navigate(`/${workspace.id}`);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to open project",
        );
      }
    }
  };

  const handleOpenWorkspace = async (workspace: Workspace) => {
    try {
      await updateWorkspace(workspace.id, {}, workspace);
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      navigate(`/${workspace.id}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to open workspace",
      );
    }
  };

  const handleCloneSuccess = (workspace: Workspace) => {
    queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    navigate(`/${workspace.id}`);
  };

  const handleRemoteConnect = () => {
    queryClient.invalidateQueries({ queryKey: ["workspaces"] });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      {/* Logo */}
      <Logo className="w-64 mb-8" />

      {/* Action Buttons */}
      <div className="flex gap-3 mb-12">
        <Button
          onClick={handleOpenProject}
          disabled={!window.electronAPI}
          title={!window.electronAPI ? "Only available in Electron" : undefined}
        >
          <FolderOpen className="mr-2 h-4 w-4" />
          Open Project
        </Button>
        <Button onClick={() => setCloneModalOpen(true)}>
          <GitBranch className="mr-2 h-4 w-4" />
          Clone Repo
        </Button>
        <Button variant="outline" onClick={() => setRemoteModalOpen(true)}>
          <Globe className="mr-2 h-4 w-4" />
          Connect Remote
        </Button>
      </div>

      {/* Recent Workspaces */}
      <div className="w-full max-w-xl">
        <h3 className="text-sm text-muted-foreground mb-3">
          Recent workspaces
        </h3>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="h-6 w-6" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            <p className="text-sm">Failed to load workspaces</p>
          </div>
        ) : workspaces.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No recent workspaces</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {workspaces.map((workspace) => (
              <button
                type="button"
                key={workspace.id}
                onClick={() => handleOpenWorkspace(workspace)}
                className="py-1.5 px-2 rounded text-left text-sm text-muted-foreground truncate transition-colors hover:text-foreground hover:bg-muted/50"
              >
                {workspace.path}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <CloneRepoModal
        open={cloneModalOpen}
        onOpenChange={setCloneModalOpen}
        onSuccess={handleCloneSuccess}
      />
      <ConnectRemoteModal
        open={remoteModalOpen}
        onOpenChange={setRemoteModalOpen}
        onConnect={handleRemoteConnect}
      />
    </div>
  );
}
