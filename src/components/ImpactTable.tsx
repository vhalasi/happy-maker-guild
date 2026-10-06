import type { ImpactRow } from "@/state/appStore";

export function ImpactTable({ rows, compact = false }: { rows: ImpactRow[]; compact?: boolean }) {
  return (
    <table className={`w-full border-collapse ${compact ? "text-[0.65rem]" : "text-xs"}`}>
      <thead>
        <tr className="border-b border-border text-left">
          {["Item", "Before", "After", "Δ"].map((h) => (
            <th key={h} className="data-mono px-2 py-1.5 font-normal uppercase tracking-wider text-muted-foreground">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const positive = r.delta.startsWith("+") && !r.delta.includes("±");
          const neutral = r.delta.includes("±") || r.delta === "0";
          return (
            <tr key={r.item} className="border-b border-border/50 last:border-0">
              <td className="px-2 py-1.5 text-foreground">{r.item}</td>
              <td className="data-mono px-2 py-1.5 text-muted-foreground">{r.before}</td>
              <td className="data-mono px-2 py-1.5 text-foreground">{r.after}</td>
              <td
                className={`data-mono px-2 py-1.5 ${
                  neutral ? "text-muted-foreground" : positive ? "text-warning" : "text-success"
                }`}
              >
                {r.delta}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
