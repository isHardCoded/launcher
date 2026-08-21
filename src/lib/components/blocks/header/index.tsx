import { Search } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

const NAV = ["STORE", "LIBRARY", "COMMUNITY", "PROFILE"] as const;

export function Header() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-8 border-b border-border bg-background px-5">
      <a href="#" className="text-[15px] font-semibold tracking-[0.18em] text-foreground">
        PLAYHUB
      </a>

      <nav className="flex h-full items-center gap-6">
        {NAV.map((item) => (
          <a
            key={item}
            href="#"
            className={
              item === "STORE"
                ? "flex h-full items-center border-b-2 border-primary text-[13px] font-medium tracking-[0.08em] text-foreground"
                : "flex h-full items-center border-b-2 border-transparent text-[13px] font-medium tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground"
            }
          >
            {item}
          </a>
        ))}
      </nav>

      <InputGroup className="ml-auto h-9 w-[280px] rounded-full border-transparent bg-muted">
        <InputGroupAddon>
          <Search className="size-4 text-muted-foreground" />
        </InputGroupAddon>
        <InputGroupInput
          placeholder="Search games, friends, ..."
          className="text-[13px] placeholder:text-muted-foreground"
        />
      </InputGroup>
    </header>
  );
}
