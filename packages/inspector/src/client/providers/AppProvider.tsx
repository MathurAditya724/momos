import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/react-router/v7";
import type { PropsWithChildren } from "react";
import { BrowserRouter } from "react-router";
import { Toaster, toast } from "sonner";
import { GlobalProvider, useGlobal } from "./Global";
import { ShikiProvider } from "./Shiki";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("An error occurred");
      }
    },
  }),
});

export default function AppProvider(props: PropsWithChildren) {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <NuqsAdapter>
          <ShikiProvider>
            <GlobalProvider>
              {props.children}
              <ToasterWithConfig />
            </GlobalProvider>
          </ShikiProvider>
        </NuqsAdapter>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

function ToasterWithConfig() {
  const { config } = useGlobal();
  return <Toaster position={config.toastPosition} />;
}
