import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Settings } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Button } from "@/client/components/ui/button";
import { Spinner } from "@/client/components/ui/spinner";
import { apiFetch, type Workspace } from "@/client/lib/api";
import { getCwd } from "@/shared/utils";

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const handledErrorRef = useRef(false);

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
    if (error && !handledErrorRef.current) {
      handledErrorRef.current = true;
      navigate("/");
    }
  }, [error, navigate]);

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

  const cwd = getCwd(workspace);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 p-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>

        <Button asChild>
          <Link to={`/${workspace.id}/settings`}>
            <Settings className="mr-2 h-4 w-4" />
            Workspace Settings
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h1 className="mb-2 text-2xl font-semibold">Workspace</h1>
        <p className="text-sm text-muted-foreground">ID: {workspace.id}</p>
        <p className="mt-4 text-sm">
          <span className="font-medium">Path:</span> {cwd ?? "-"}
        </p>
      </div>
    </div>
  );
}
