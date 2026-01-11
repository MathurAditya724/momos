import { Link } from "react-router";
import { LogoIcon } from "@/client/components/Logo";
import ToogleThemeIconButton from "./ToogleTheme";

export default function Header() {
  return (
    <header className="h-14 border-b border-border flex items-center px-4 gap-4">
      <Link to="/" className="flex items-center gap-3">
        <LogoIcon className="cursor-pointer" />
      </Link>
      <div className="flex-1" />
      <ToogleThemeIconButton />
    </header>
  );
}
