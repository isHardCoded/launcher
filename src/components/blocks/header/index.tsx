import { Search } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ROUTE_HREF, type Route } from "@/hooks/use-hash-route";

const NAV: { label: string; href: string; route?: Route }[] = [
  { label: "STORE", href: ROUTE_HREF.store, route: "store" },
  { label: "LIBRARY", href: "#" },
  { label: "COMMUNITY", href: "#" },
  { label: "PROFILE", href: ROUTE_HREF.profile, route: "profile" },
];

type HeaderProps = {
  route: Route;
  // Поиск показываем только там, где он что-то фильтрует.
  search?: string;
  onSearchChange?: (search: string) => void;
};

export function Header({ route, search = "", onSearchChange }: HeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-8 border-b border-border bg-background px-5">
      <a href={ROUTE_HREF.store} className="text-[15px] font-semibold tracking-[0.18em] text-foreground">
        PLAYHUB
      </a>

      <nav className="flex h-full items-center gap-6">
        {NAV.map((item) => (
          <a
            key={item.label}
            href={item.href}
            aria-current={item.route === route ? "page" : undefined}
            className={
              item.route === route
                ? "flex h-full items-center border-b-2 border-primary text-[13px] font-medium tracking-[0.08em] text-foreground"
                : "flex h-full items-center border-b-2 border-transparent text-[13px] font-medium tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground"
            }
          >
            {item.label}
          </a>
        ))}
      </nav>

      {onSearchChange && (
        <InputGroup className="ml-auto h-9 w-[280px] rounded-full border-transparent bg-muted">
          <InputGroupAddon>
            <Search className="size-4 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Поиск по названию..."
            className="text-[13px] placeholder:text-muted-foreground"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </InputGroup>
      )}
    </header>
  );
}
