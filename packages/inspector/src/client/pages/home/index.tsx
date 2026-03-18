import { useQuery } from "@tanstack/react-query";
import { FolderGit2, Loader2, XCircle } from "lucide-react";

type Workspace = {
  id: string;
  path: string;
  createdAt: string;
  updatedAt: string;
};

async function fetchWorkspaces(): Promise<Workspace[]> {
  const response = await fetch("/api/workspaces");
  if (!response.ok) {
    throw new Error("Failed to fetch workspaces");
  }
  return response.json();
}

export default function HomePage() {
  const {
    data: workspaces,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["workspaces"],
    queryFn: fetchWorkspaces,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="size-8 animate-spin" />
        <p>Loading workspaces...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 text-destructive">
        <XCircle className="size-8" />
        <p>Failed to load workspaces</p>
      </div>
    );
  }

  if (!workspaces || workspaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <FolderGit2 className="size-8" />
        <p>No workspaces registered</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 p-8">
      <h1 className="text-xl font-semibold text-foreground">Workspaces</h1>
      <div className="flex flex-col gap-4 w-full max-w-2xl">
        {workspaces.map((workspace) => (
          <div
            key={workspace.id}
            className="flex items-center gap-3 rounded-lg border bg-card p-4 shadow-sm"
          >
            <FolderGit2 className="size-5 text-muted-foreground flex-shrink-0" />
            <span className="truncate text-sm font-medium text-foreground">
              {workspace.path}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
