import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles } from "lucide-react";
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
import { Textarea } from "@/client/components/ui/textarea";

const formSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  prompt: z.string().min(1, "Prompt is required"),
});

export type FormValues = z.infer<typeof formSchema>;

interface GenerateFormProps {
  onGenerate: (values: FormValues) => void;
  isLoading: boolean;
}

export function GenerateForm({ onGenerate, isLoading }: GenerateFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
      prompt: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    onGenerate(values);
  };

  return (
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
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
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
  );
}
