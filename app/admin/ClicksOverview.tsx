"use client";

import { useEffect, useState } from "react";
import type { Board } from "@/lib/types";
import { fetchJson } from "@/lib/fetch-json";

type ClickStats = { total: number; series: { date: string; clicks: number }[] };

const RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

const selectClass =
  "rounded-full border border-line bg-paper px-3 py-1.5 font-sans text-xs uppercase tracking-[0.08em] text-ink-soft outline-none focus:border-oxblood";

// Same shape as Pinterest's own analytics overview — a date range and a
// content filter (here, "Board" instead of Pinterest's content type) sitting
// above a number and a graph that both react to them.
export default function ClicksOverview({ boards }: { boards: Board[] }) {
  const [range, setRange] = useState("30");
  const [boardId, setBoardId] = useState("");
  const [stats, setStats] = useState<ClickStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError(null);
      const params = new URLSearchParams({ range });
      if (boardId) params.set("board_id", boardId);
      const result = await fetchJson<ClickStats>(`/api/admin/click-stats?${params}`);
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStats(result.data);
    }
    // `cancelled` guards against a stale response landing after a newer
    // filter change has already fired another request.
    load();
    return () => {
      cancelled = true;
    };
  }, [range, boardId]);

  const max = stats ? Math.max(1, ...stats.series.map((point) => point.clicks)) : 1;

  // Fixed viewBox coordinate space, scaled to the container by the SVG
  // itself (preserveAspectRatio="none") — the actual pixel size is whatever
  // width the card ends up rendering at.
  const chartWidth = 600;
  const chartHeight = 128;
  const points =
    stats?.series.map((point, i) => ({
      ...point,
      x: stats.series.length > 1 ? (i / (stats.series.length - 1)) * chartWidth : chartWidth / 2,
      y: chartHeight - (point.clicks / max) * (chartHeight - 6) - 3,
    })) ?? [];
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`
      : "";

  return (
    <div className="rounded-2xl bg-paper-2 p-5 shadow-[0_2px_8px_rgba(23,21,15,0.05)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-xl text-ink">Outbound clicks</h2>
        <div className="flex flex-wrap gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            aria-label="Date range"
            className={selectClass}
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={boardId}
            onChange={(e) => setBoardId(e.target.value)}
            aria-label="Board"
            className={selectClass}
          >
            <option value="">All boards</option>
            {boards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="mt-3 font-sans text-sm text-oxblood">{error}</p>}

      {!stats ? (
        <p className="mt-5 text-sm text-taupe">Loading…</p>
      ) : stats.total === 0 ? (
        <p className="mt-5 text-sm text-taupe">No clicks in this range yet.</p>
      ) : (
        <>
          <p className="mt-4 font-serif text-3xl text-ink">{stats.total.toLocaleString()}</p>
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
            className="mt-4 h-32 w-full"
            role="img"
            aria-label={`${stats.total} outbound clicks over the selected range`}
          >
            <path d={areaPath} className="fill-oxblood/10" stroke="none" />
            <path
              d={linePath}
              className="stroke-oxblood"
              fill="none"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            {points.map((p) => (
              <circle key={p.date} cx={p.x} cy={p.y} r={p.clicks > 0 ? 3 : 2} className="fill-oxblood">
                <title>{`${p.date}: ${p.clicks} click${p.clicks === 1 ? "" : "s"}`}</title>
              </circle>
            ))}
          </svg>
        </>
      )}
    </div>
  );
}
