import { FolderOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cloneWorkspace, type Workspace } from "@/client/lib/api";
import { useGlobal } from "@/client/providers/Global";
import { extractRepoName } from "@/shared/utils";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Spinner } from "./ui/spinner";

type CloneRepoModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (workspace: Workspace) => void;
};

export function CloneRepoModal({
  open,
  onOpenChange,
  onSuccess,
}: CloneRepoModalProps) {
  const { serverConfig } = useGlobal();
  const [gitUrl, setGitUrl] = useState("");
  const [destination, setDestination] = useState(
    () => serverConfig.cloneDirectory || "",
  );
  const [isCloning, setIsCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && !destination && serverConfig.cloneDirectory) {
      setDestination(serverConfig.cloneDirectory);
    }
  }, [destination, open, serverConfig.cloneDirectory]);

  const handleSelectFolder = async () => {
    if (!window.electronAPI) return;

    const selectedPath = await window.electronAPI.selectFolder();
    if (selectedPath) {
      setDestination(selectedPath);
    }
  };

  const handleClone = async () => {
    if (!gitUrl.trim()) {
      setError("Please enter a git URL");
      return;
    }

    if (!destination.trim()) {
      setError("Please select a destination folder");
      return;
    }

    setIsCloning(true);
    setError(null);

    try {
      // Build full destination path with repo name
      const repoName = extractRepoName(gitUrl);

      const workspace = await cloneWorkspace(gitUrl, destination);

      // Reset form and close
      setGitUrl("");
      onOpenChange(false);
      toast.success(`Cloned ${repoName}`);
      onSuccess?.(workspace);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      toast.error(message);
    } finally {
      setIsCloning(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isCloning) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setError(null);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clone Repository</DialogTitle>
          <DialogDescription>
            Enter the git URL and select a destination folder
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="git-url">Repository URL</Label>
            <Input
              id="git-url"
              placeholder="https://github.com/user/repo.git"
              value={gitUrl}
              onChange={(e) => setGitUrl(e.target.value)}
              disabled={isCloning}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="destination">Destination Folder</Label>
            <div className="flex gap-2">
              <Input
                id="destination"
                placeholder="/path/to/projects"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                disabled={isCloning}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleSelectFolder}
                disabled={isCloning || !window.electronAPI}
                title="Browse for folder"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
            {destination && gitUrl && (
              <p className="text-xs text-muted-foreground">
                Will clone to: {destination}/{extractRepoName(gitUrl)}
              </p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isCloning}
          >
            Cancel
          </Button>
          <Button onClick={handleClone} disabled={isCloning}>
            {isCloning && <Spinner className="mr-2" />}
            {isCloning ? "Cloning..." : "Clone"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
