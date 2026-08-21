import { cn } from "@/lib/utils";
import type { Game } from "@/types/game";

const TAG_STYLES: Record<string, string> = {
  HIT: "bg-rose-400/15 text-rose-300",
  RPG: "bg-violet-400/15 text-violet-300",
  ATMOSPHERIC: "bg-teal-400/15 text-teal-300",
  "OPEN WORLD": "bg-emerald-400/15 text-emerald-300",
  NEW: "bg-primary/90 text-primary-foreground",
  "ROGUE-LIKE": "bg-amber-400/15 text-amber-200",
  SALE: "bg-red-400/15 text-red-300",
  ACTION: "bg-orange-400/15 text-orange-300",
  "SCI-FI": "bg-indigo-400/15 text-indigo-300",
  HARDCORE: "bg-zinc-400/15 text-zinc-300",
};

type GameCardProps = Game & {
  variant?: "landscape" | "portrait";
};

export function GameCard({
  title,
  image,
  price,
  oldPrice,
  discount,
  tags,
  variant = "landscape",
}: GameCardProps) {
  return (
    <article className="flex h-full flex-col">
      <div
        className={cn(
          "w-full overflow-hidden rounded-lg bg-muted",
          variant === "portrait" ? "aspect-[3/4]" : "aspect-video"
        )}
      >
        <img className="h-full w-full object-cover" src={image} alt={title} />
      </div>

      <div className="flex flex-1 flex-col gap-1.5 pt-2.5">
        <h3 className="line-clamp-1 text-[13px] font-medium text-foreground">{title}</h3>

        <div className="flex min-h-[20px] flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide",
                TAG_STYLES[tag] ?? "bg-primary/15 text-primary"
              )}
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-center gap-1.5 pt-0.5">
          {discount ? (
            <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: "#4a6741" }}>
              -{discount}%
            </span>
          ) : null}
          <span className="text-[13px] font-medium text-foreground">${price}</span>
          {oldPrice ? (
            <span className="text-[11px] text-muted-foreground line-through">${oldPrice}</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
