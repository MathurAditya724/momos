import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Play, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/client/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/client/components/ui/form";
import { Input } from "@/client/components/ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/client/components/ui/resizable";
import { ScrollArea } from "@/client/components/ui/scroll-area";
import { Skeleton } from "@/client/components/ui/skeleton";
import { Textarea } from "@/client/components/ui/textarea";
import { client } from "@/client/config/endpoint";
import { useShiki } from "@/client/providers/Shiki";

const formSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  prompt: z.string().min(1, "Prompt is required"),
});

type FormValues = z.infer<typeof formSchema>;

export default function HomePage() {
  const shiki = useShiki();
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);
  const [runResponse, setRunResponse] = useState<{
    stdout: string;
    stderr: string;
    exitCode: number;
  } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
      prompt: "",
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const response = await client.generate.$post({
        json: values,
      });
      return response.json() as unknown as Promise<{ code: string }>;
    },
    onSuccess: (data) => {
      setGeneratedCode(data.code);
      setRunResponse(null);
    },
  });

  const runMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await client.run.$post({
        json: { code },
      });
      return response.json() as Promise<{
        stdout: string;
        stderr: string;
        exitCode: number;
      }>;
    },
    onSuccess: (data) => {
      setRunResponse(data);
    },
  });

  // Highlight code when it changes
  useEffect(() => {
    if (!generatedCode || !shiki) {
      setHighlightedCode(null);
      return;
    }

    shiki
      .codeToHtml(generatedCode, {
        lang: "javascript",
        themes: {
          light: "github-light-default",
          dark: "github-dark-default",
        },
      })
      .then(setHighlightedCode);
  }, [generatedCode, shiki]);

  const onSubmit = (values: FormValues) => {
    generateMutation.mutate(values);
  };

  const handleRun = () => {
    if (generatedCode) {
      runMutation.mutate(generatedCode);
    }
  };

  return (
    <div className="size-full">
      <ResizablePanelGroup direction="horizontal">
        {/* Left Panel - Form */}
        <ResizablePanel defaultSize={35} minSize={25}>
          <div className="flex h-full flex-col p-6">
            <h2 className="mb-6 text-lg font-semibold">Generate Test Script</h2>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-1 flex-col gap-4"
              >
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com"
                          type="url"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="prompt"
                  render={({ field }) => (
                    <FormItem className="flex flex-1 flex-col">
                      <FormLabel>Prompt</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe what you want to test, e.g., 'Test the login flow with valid credentials'"
                          className="flex-1 resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={generateMutation.isPending}
                  className="w-full"
                >
                  {generateMutation.isPending ? (
                    <>Generating...</>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      Generate
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel - Code and Response */}
        <ResizablePanel defaultSize={65} minSize={40}>
          <ResizablePanelGroup direction="vertical">
            {/* Code Panel */}
            <ResizablePanel defaultSize={60} minSize={30}>
              <div className="flex h-full flex-col overflow-hidden">
                <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Generated Code
                  </span>
                  {generatedCode && (
                    <Button
                      size="sm"
                      onClick={handleRun}
                      disabled={runMutation.isPending}
                    >
                      {runMutation.isPending ? (
                        <>Running...</>
                      ) : (
                        <>
                          <Play className="size-3" />
                          Run
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <ScrollArea className="min-h-0 flex-1 bg-muted/30">
                  <div className="p-4">
                    {generateMutation.isPending ? (
                      <CodeSkeleton />
                    ) : highlightedCode ? (
                      <div
                        className="[&_pre]:bg-transparent! [&_pre]:p-0 [&_code]:text-sm"
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: Shiki output is safe
                        dangerouslySetInnerHTML={{ __html: highlightedCode }}
                      />
                    ) : (
                      <CodePlaceholder />
                    )}
                  </div>
                </ScrollArea>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Response Panel */}
            <ResizablePanel defaultSize={40} minSize={20}>
              <div className="flex h-full flex-col overflow-hidden">
                <div className="flex shrink-0 items-center border-b px-4 py-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Output
                  </span>
                  {runResponse && (
                    <span
                      className={`ml-auto text-xs ${runResponse.exitCode === 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      Exit code: {runResponse.exitCode}
                    </span>
                  )}
                </div>
                <ScrollArea className="min-h-0 flex-1">
                  <div className="p-4">
                    {runMutation.isPending ? (
                      <ResponseSkeleton />
                    ) : runResponse ? (
                      <ResponseOutput response={runResponse} />
                    ) : (
                      <ResponsePlaceholder />
                    )}
                  </div>
                </ScrollArea>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

function CodeSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

function CodePlaceholder() {
  return (
    <div className="flex h-full min-h-32 items-center justify-center text-muted-foreground">
      <div className="text-center">
        <Sparkles className="mx-auto mb-2 size-8 opacity-50" />
        <p className="text-sm">Enter a URL and prompt to generate test code</p>
      </div>
    </div>
  );
}

function ResponseSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-full" />
    </div>
  );
}

function ResponsePlaceholder() {
  return (
    <div className="flex h-full min-h-20 items-center justify-center text-muted-foreground">
      <div className="text-center">
        <Play className="mx-auto mb-2 size-6 opacity-50" />
        <p className="text-sm">Run the code to see output here</p>
      </div>
    </div>
  );
}

function ResponseOutput({
  response,
}: {
  response: { stdout: string; stderr: string; exitCode: number };
}) {
  return (
    <div className="space-y-4 font-mono text-sm">
      {response.stdout && (
        <div>
          <div className="mb-1 text-xs font-medium text-muted-foreground">
            stdout
          </div>
          <pre className="whitespace-pre-wrap rounded-md bg-muted p-3">
            {response.stdout}
          </pre>
        </div>
      )}
      {response.stderr && (
        <div>
          <div className="mb-1 text-xs font-medium text-red-600">stderr</div>
          <pre className="whitespace-pre-wrap rounded-md bg-red-50 p-3 text-red-800 dark:bg-red-950/30 dark:text-red-400">
            {response.stderr}
          </pre>
        </div>
      )}
      {!response.stdout && !response.stderr && (
        <p className="text-muted-foreground">No output</p>
      )}
    </div>
  );
}
