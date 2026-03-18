import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { Spinner } from "@/client/components/ui/spinner";
import { useGlobal } from "@/client/providers/Global";

export default function SettingsPage() {
  const { serverConfig, updateServerConfig } = useGlobal();
  const [cloneDirectory, setCloneDirectory] = useState(
    serverConfig.cloneDirectory,
  );

  useEffect(() => {
    setCloneDirectory(serverConfig.cloneDirectory);
  }, [serverConfig.cloneDirectory]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await updateServerConfig({
        cloneDirectory,
      });
    },
    onSuccess: () => {
      toast.success("Settings updated");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update settings",
      );
    },
  });

  const handleSelectFolder = async () => {
    if (!window.electronAPI) {
      return;
    }

    const selectedPath = await window.electronAPI.selectFolder();
    if (selectedPath) {
      setCloneDirectory(selectedPath);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6">
      <Button variant="outline" asChild className="w-fit">
        <Link to="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Link>
      </Button>

      <div className="rounded-lg border bg-card p-6">
        <h1 className="mb-1 text-xl font-semibold">Global Settings</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Configure values shared across all workspaces.
        </p>

        <div className="space-y-2">
          <Label htmlFor="clone-directory">Default Clone Directory</Label>
          <div className="flex gap-2">
            <Input
              id="clone-directory"
              placeholder="/path/to/projects"
              value={cloneDirectory}
              onChange={(e) => setCloneDirectory(e.target.value)}
              disabled={saveMutation.isPending}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleSelectFolder}
              disabled={saveMutation.isPending || !window.electronAPI}
              title="Browse for folder"
            >
              <FolderOpen className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Used as the default destination when cloning repositories.
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? <Spinner className="mr-2" /> : null}
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
