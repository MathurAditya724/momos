import { ArrowLeft, Home } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/client/components/ui/button";

export default function NotFoundPage() {
  const navigate = useNavigate();
  const [glitchText, setGlitchText] = useState("404");

  // Glitch effect for the 404 text
  useEffect(() => {
    const glitchChars = "!<>-_\\/[]{}—=+*^?#________404";
    const interval = setInterval(() => {
      if (Math.random() > 0.85) {
        const glitch = Array.from({ length: 3 })
          .map(
            () => glitchChars[Math.floor(Math.random() * glitchChars.length)],
          )
          .join("");
        setGlitchText(glitch);
        setTimeout(() => setGlitchText("404"), 50);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="container max-w-4xl mx-auto">
        <div>
          {/* Glitchy 404 */}
          <div className="text-center mb-6">
            <div className="text-8xl md:text-9xl font-bold font-mono text-foreground mb-4 select-none">
              {glitchText}
            </div>
            <div className="text-foreground/60 font-mono text-sm mb-2">
              {"// "}ERROR_CODE: ROUTE_NOT_FOUND
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center font-mono">
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              className="gap-2"
            >
              <ArrowLeft className="size-4" />
              {"go_back()"}
            </Button>
            <Button onClick={() => navigate("/")} className="gap-2">
              <Home className="size-4" />
              {"return_home()"}
            </Button>
          </div>

          {/* Footer message */}
          <div className="mt-8 text-center font-mono text-xs text-foreground/40">
            <div>{"// "}Lost in the inspector?</div>
            <div className="mt-1">
              {"// "}Don't worry, even the best developers hit 404s sometimes.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
