import { CheckCircle, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getRemoteUrl,
  setRemoteUrl,
  testRemoteConnection,
} from "@/client/lib/api";
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

type ConnectRemoteModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect?: () => void;
};

export function ConnectRemoteModal({
  open,
  onOpenChange,
  onConnect,
}: ConnectRemoteModalProps) {
  const [url, setUrl] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [currentRemote, setCurrentRemote] = useState<string | null>(null);

  // Load current remote URL when modal opens
  useEffect(() => {
    if (open) {
      const remote = getRemoteUrl();
      setCurrentRemote(remote);
      setUrl(remote || "");
      setTestResult(null);
    }
  }, [open]);

  const handleTestConnection = async () => {
    if (!url.trim()) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const isHealthy = await testRemoteConnection(url);
      setTestResult(isHealthy);
      if (!isHealthy) {
        toast.error("Failed to connect to remote server");
      }
    } catch {
      setTestResult(false);
      toast.error("Failed to connect to remote server");
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = () => {
    if (!url.trim()) return;

    setRemoteUrl(url);
    setCurrentRemote(url);
    onOpenChange(false);
    onConnect?.();
    toast.success("Connected to remote server");
  };

  const handleDisconnect = () => {
    setRemoteUrl(null);
    setCurrentRemote(null);
    setUrl("");
    setTestResult(null);
    onOpenChange(false);
    onConnect?.();
    toast.success("Disconnected from remote server");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect to Remote Server</DialogTitle>
          <DialogDescription>
            Connect to a Momos server running on a different machine
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {currentRemote && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">
                Currently connected to:{" "}
                <span className="font-medium">{currentRemote}</span>
              </span>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="remote-url">Server URL</Label>
            <div className="flex gap-2">
              <Input
                id="remote-url"
                placeholder="http://192.168.1.100:6274"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setTestResult(null);
                }}
                disabled={isTesting}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting || !url.trim()}
              >
                {isTesting ? <Spinner className="mr-2" /> : null}
                Test
              </Button>
            </div>
          </div>

          {testResult !== null && (
            <div
              className={`flex items-center gap-2 p-3 rounded-md ${
                testResult
                  ? "bg-green-500/10 text-green-600"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {testResult ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Connection successful!</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm">
                    Failed to connect. Please check the URL and try again.
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {currentRemote && (
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              className="mr-auto"
            >
              Disconnect
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConnect}
            disabled={!url.trim() || testResult === false}
          >
            Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
