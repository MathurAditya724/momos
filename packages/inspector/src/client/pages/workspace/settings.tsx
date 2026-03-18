import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { Spinner } from "@/client/components/ui/spinner";
import { apiFetch, updateWorkspace, type Workspace } from "@/client/lib/api";

export default function WorkspaceSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const handledErrorRef = useRef(false);
  const [serverUrl, setServerUrl] = useState("");

  const {
    data: workspace,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["workspace", id],
    queryFn: () => apiFetch<Workspace>(`/api/workspaces/${id}`),
    enabled: Boolean(id),
    retry: false,
  });

  useEffect(() => {
    if (workspace) {
      setServerUrl(workspace.serverUrl ?? "");
    }
  }, [workspace]);

  useEffect(() => {
    if (error && !handledErrorRef.current) {
      handledErrorRef.current = true;
      navigate("/");
    }
  }, [error, navigate]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!id) {
        throw new Error("Workspace ID is required");
      }

      return updateWorkspace(
        id,
        {
          serverUrl: serverUrl.trim() ? serverUrl.trim() : null,
        },
        workspace,
      );
    },
    onSuccess: () => {
      toast.success("Workspace settings saved");
      navigate(`/${id}`);
    },
    onError: (mutationError) => {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to save workspace settings",
      );
    },
  });

  const canSave = useMemo(() => {
    if (!workspace) {
      return false;
    }

    const normalized = serverUrl.trim();
    return normalized !== (workspace.serverUrl ?? "");
  }, [serverUrl, workspace]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!workspace) {
    return null;
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 p-6">
      <Button variant="outline" asChild className="w-fit">
        <Link to={`/${workspace.id}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Workspace
        </Link>
      </Button>

      <div className="rounded-lg border bg-card p-6">
        <h1 className="mb-1 text-xl font-semibold">Workspace Settings</h1>
        <p className="mb-6 text-sm text-muted-foreground">{workspace.path}</p>

        <div className="space-y-2">
          <Label htmlFor="workspace-server-url">Workspace Server URL</Label>
          <Input
            id="workspace-server-url"
            placeholder="http://192.168.1.100:6274"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            disabled={saveMutation.isPending}
          />
          <p className="text-xs text-muted-foreground">
            If set, this workspace uses this server before falling back to the
            global remote URL.
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" asChild>
            <Link to={`/${workspace.id}`}>Cancel</Link>
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!canSave || saveMutation.isPending}
          >
            {saveMutation.isPending ? <Spinner className="mr-2" /> : null}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
