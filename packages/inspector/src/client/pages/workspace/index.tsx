import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ExternalLink,
  Github,
  KanbanSquare,
  Plus,
  Settings,
  ShieldAlert,
  X,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { Button } from "@/client/components/ui/button";
import { Spinner } from "@/client/components/ui/spinner";
import {
  apiFetch,
  enableTool,
  type GithubIssue,
  getGithubIssues,
  getSentryIssues,
  getWorkspaceStatus,
  type SentryIssue,
  type ToolState,
  updateWorkspace,
  type Workspace,
} from "@/client/lib/api";
import { useGlobal } from "@/client/providers/Global";
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

  if (!workspace || !id) {
    return null;
  }

  const cwd = getCwd(workspace);
  const dirName = cwd?.split("/").pop() ?? "Workspace";

  return (
    <div className="flex min-h-screen flex-col p-6">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link to="/">
            <ArrowLeft className="mr-2 h-3.5 w-3.5" />
            Back
          </Link>
        </Button>

        <div className="text-center">
          <h1 className="text-lg font-semibold">{dirName}</h1>
          <p className="text-xs text-muted-foreground">{cwd}</p>
        </div>

        <Button variant="outline" size="sm" asChild>
          <Link to={`/${workspace.id}/settings`}>
            <Settings className="mr-2 h-3.5 w-3.5" />
            Settings
          </Link>
        </Button>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div className="grid w-full max-w-6xl grid-cols-3 gap-4">
          <GitHubCard workspaceId={id} workspace={workspace} />
          <SentryCard workspaceId={id} workspace={workspace} />
          <div className="flex flex-col gap-4">
            <PlaceholderCard
              icon={<Plus className="h-5 w-5" />}
              title="Create Issue"
            />
            <PlaceholderCard
              icon={<KanbanSquare className="h-5 w-5" />}
              title="Create Kanban"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- GitHub Card ---

function GitHubCard({
  workspaceId,
  workspace,
}: {
  workspaceId: string;
  workspace: Workspace;
}) {
  const queryClient = useQueryClient();
  const { updateServerConfig } = useGlobal();

  const { data: status, isLoading: isStatusLoading } = useQuery({
    queryKey: ["workspace-status", workspaceId],
    queryFn: () => getWorkspaceStatus(workspaceId, workspace),
  });

  const github = status?.github;
  const isActive =
    github?.installed && github?.globalEnabled && github?.workspaceEnabled;

  const {
    data: issues,
    isLoading: isIssuesLoading,
    error: issuesError,
  } = useQuery({
    queryKey: ["github-issues", workspaceId],
    queryFn: () => getGithubIssues(workspaceId, workspace),
    enabled: isActive === true,
    retry: false,
  });

  const enableGlobalMutation = useMutation({
    mutationFn: () => enableTool("github"),
    onSuccess: async () => {
      await updateServerConfig({ github: true });
      queryClient.invalidateQueries({
        queryKey: ["workspace-status", workspaceId],
      });
      toast.success("GitHub enabled");
    },
    onError: () => toast.error("Failed to enable GitHub"),
  });

  const toggleWorkspaceMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      updateWorkspace(
        workspaceId,
        { metadata: { github: enabled } },
        workspace,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
      queryClient.invalidateQueries({
        queryKey: ["workspace-status", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["github-issues", workspaceId],
      });
    },
    onError: () => toast.error("Failed to update workspace"),
  });

  if (isStatusLoading) {
    return <ToolCardSkeleton />;
  }

  // State 1: Disabled for this workspace
  if (!github?.workspaceEnabled) {
    return (
      <ToolCardShell
        icon={<Github className="h-5 w-5" />}
        title="GitHub Issues"
      >
        <p className="mb-3 text-sm text-muted-foreground">
          GitHub is disabled for this workspace.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => toggleWorkspaceMutation.mutate(true)}
          disabled={toggleWorkspaceMutation.isPending}
        >
          {toggleWorkspaceMutation.isPending ? (
            <Spinner className="mr-2" />
          ) : null}
          Enable for this project
        </Button>
      </ToolCardShell>
    );
  }

  // State 2: CLI not installed
  if (!github?.installed) {
    return (
      <ToolCardShell
        icon={<Github className="h-5 w-5" />}
        title="GitHub Issues"
      >
        <p className="text-sm text-muted-foreground">
          GitHub CLI (<code className="text-xs">gh</code>) is not installed on
          the server.
        </p>
        <a
          href="https://cli.github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Install GitHub CLI
          <ExternalLink className="h-3 w-3" />
        </a>
      </ToolCardShell>
    );
  }

  // State 3: Not enabled globally
  if (!github?.globalEnabled) {
    return (
      <ToolCardShell
        icon={<Github className="h-5 w-5" />}
        title="GitHub Issues"
      >
        <p className="mb-3 text-sm text-muted-foreground">
          GitHub CLI is available. Enable it to see your issues.
        </p>
        <Button
          size="sm"
          onClick={() => enableGlobalMutation.mutate()}
          disabled={enableGlobalMutation.isPending}
        >
          {enableGlobalMutation.isPending ? <Spinner className="mr-2" /> : null}
          Enable GitHub
        </Button>
      </ToolCardShell>
    );
  }

  // State 4: Active — show issues or error
  return (
    <ToolCardShell
      icon={<Github className="h-5 w-5" />}
      title="GitHub Issues"
      action={
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={() => toggleWorkspaceMutation.mutate(false)}
          disabled={toggleWorkspaceMutation.isPending}
          title="Disable for this project"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      }
    >
      {isIssuesLoading ? (
        <div className="flex justify-center py-4">
          <Spinner className="h-5 w-5" />
        </div>
      ) : issuesError ? (
        <div>
          <p className="mb-3 text-sm text-muted-foreground">
            {issuesError instanceof Error
              ? issuesError.message
              : "Failed to fetch GitHub issues"}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toggleWorkspaceMutation.mutate(false)}
            disabled={toggleWorkspaceMutation.isPending}
          >
            Disable for this project
          </Button>
        </div>
      ) : !issues || issues.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open issues</p>
      ) : (
        <ul className="space-y-1">
          {issues.map((issue) => (
            <GitHubIssueRow key={issue.number} issue={issue} />
          ))}
        </ul>
      )}
    </ToolCardShell>
  );
}

function GitHubIssueRow({ issue }: { issue: GithubIssue }) {
  return (
    <li>
      <a
        href={issue.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-start gap-2 rounded-md p-1.5 -mx-1.5 transition-colors hover:bg-muted/50"
      >
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
          #{issue.number}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm group-hover:text-primary">
          {issue.title}
        </span>
        <span
          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
            issue.state === "OPEN"
              ? "bg-green-500/10 text-green-600"
              : "bg-violet-500/10 text-violet-600"
          }`}
        >
          {issue.state === "OPEN" ? "Open" : "Closed"}
        </span>
      </a>
    </li>
  );
}

// --- Sentry Card ---

function SentryCard({
  workspaceId,
  workspace,
}: {
  workspaceId: string;
  workspace: Workspace;
}) {
  const queryClient = useQueryClient();
  const { updateServerConfig } = useGlobal();

  const { data: status, isLoading: isStatusLoading } = useQuery({
    queryKey: ["workspace-status", workspaceId],
    queryFn: () => getWorkspaceStatus(workspaceId, workspace),
  });

  const sentry = status?.sentry;
  const isActive =
    sentry?.installed && sentry?.globalEnabled && sentry?.workspaceEnabled;

  const {
    data: issues,
    isLoading: isIssuesLoading,
    error: issuesError,
  } = useQuery({
    queryKey: ["sentry-issues", workspaceId],
    queryFn: () => getSentryIssues(workspaceId, workspace),
    enabled: isActive === true,
    retry: false,
  });

  const enableGlobalMutation = useMutation({
    mutationFn: () => enableTool("sentry"),
    onSuccess: async () => {
      await updateServerConfig({ sentry: true });
      queryClient.invalidateQueries({
        queryKey: ["workspace-status", workspaceId],
      });
      toast.success("Sentry enabled");
    },
    onError: () => toast.error("Failed to enable Sentry"),
  });

  const toggleWorkspaceMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      updateWorkspace(
        workspaceId,
        { metadata: { sentry: enabled } },
        workspace,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
      queryClient.invalidateQueries({
        queryKey: ["workspace-status", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["sentry-issues", workspaceId],
      });
    },
    onError: () => toast.error("Failed to update workspace"),
  });

  if (isStatusLoading) {
    return <ToolCardSkeleton />;
  }

  // State 1: Disabled for this workspace
  if (!sentry?.workspaceEnabled) {
    return (
      <ToolCardShell
        icon={<ShieldAlert className="h-5 w-5" />}
        title="Sentry Issues"
      >
        <p className="mb-3 text-sm text-muted-foreground">
          Sentry is disabled for this workspace.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => toggleWorkspaceMutation.mutate(true)}
          disabled={toggleWorkspaceMutation.isPending}
        >
          {toggleWorkspaceMutation.isPending ? (
            <Spinner className="mr-2" />
          ) : null}
          Enable for this project
        </Button>
      </ToolCardShell>
    );
  }

  // State 2: CLI not installed
  if (!sentry?.installed) {
    return (
      <ToolCardShell
        icon={<ShieldAlert className="h-5 w-5" />}
        title="Sentry Issues"
      >
        <p className="text-sm text-muted-foreground">
          Sentry CLI (<code className="text-xs">sentry</code>) is not installed
          on the server.
        </p>
        <a
          href="https://docs.sentry.io/cli/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Install Sentry CLI
          <ExternalLink className="h-3 w-3" />
        </a>
      </ToolCardShell>
    );
  }

  // State 3: Not enabled globally
  if (!sentry?.globalEnabled) {
    return (
      <ToolCardShell
        icon={<ShieldAlert className="h-5 w-5" />}
        title="Sentry Issues"
      >
        <p className="mb-3 text-sm text-muted-foreground">
          Sentry CLI is available. Enable it to see your issues.
        </p>
        <Button
          size="sm"
          onClick={() => enableGlobalMutation.mutate()}
          disabled={enableGlobalMutation.isPending}
        >
          {enableGlobalMutation.isPending ? <Spinner className="mr-2" /> : null}
          Enable Sentry
        </Button>
      </ToolCardShell>
    );
  }

  // State 4: Active — show issues or error
  return (
    <ToolCardShell
      icon={<ShieldAlert className="h-5 w-5" />}
      title="Sentry Issues"
      action={
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={() => toggleWorkspaceMutation.mutate(false)}
          disabled={toggleWorkspaceMutation.isPending}
          title="Disable for this project"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      }
    >
      {isIssuesLoading ? (
        <div className="flex justify-center py-4">
          <Spinner className="h-5 w-5" />
        </div>
      ) : issuesError ? (
        <div>
          <p className="mb-3 text-sm text-muted-foreground">
            {issuesError instanceof Error
              ? issuesError.message
              : "Failed to fetch Sentry issues"}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toggleWorkspaceMutation.mutate(false)}
            disabled={toggleWorkspaceMutation.isPending}
          >
            Disable for this project
          </Button>
        </div>
      ) : !issues || issues.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recent issues</p>
      ) : (
        <ul className="space-y-1">
          {issues.map((issue) => (
            <SentryIssueRow key={issue.id} issue={issue} />
          ))}
        </ul>
      )}
    </ToolCardShell>
  );
}

function SentryIssueRow({ issue }: { issue: SentryIssue }) {
  const levelColor: Record<string, string> = {
    fatal: "bg-red-500/10 text-red-600",
    error: "bg-red-500/10 text-red-600",
    warning: "bg-yellow-500/10 text-yellow-600",
    info: "bg-blue-500/10 text-blue-600",
    debug: "bg-gray-500/10 text-gray-600",
  };

  return (
    <li>
      <a
        href={issue.permalink}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-start gap-2 rounded-md p-1.5 -mx-1.5 transition-colors hover:bg-muted/50"
      >
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
          {issue.shortId}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm group-hover:text-primary">
          {issue.title}
        </span>
        {issue.level && (
          <span
            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${levelColor[issue.level] ?? levelColor.info}`}
          >
            {issue.level}
          </span>
        )}
      </a>
    </li>
  );
}

// --- Shared Components ---

function ToolCardShell({
  icon,
  title,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="flex-1 text-sm font-semibold">{title}</h2>
        {action}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function ToolCardSkeleton() {
  return (
    <div className="flex flex-col rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-5 w-5 animate-pulse rounded bg-muted" />
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

function PlaceholderCard({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed bg-card p-6 text-center">
      <span className="mb-2 text-muted-foreground/50">{icon}</span>
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">Coming soon</p>
    </div>
  );
}
