import type { KPIConfig } from "@tada/shared";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRightLeft,
  CalendarRange,
  Clock3,
  CreditCard,
  DollarSign,
  Gauge,
  Globe2,
  Hash,
  Percent,
  ShieldCheck,
  ShoppingCart,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

export const DASHBOARD_COLORS = {
  primary: "#00327D",
  secondary: "#0047AB",
  tertiary: "#1A237E",
  neutral: "#F7F9FB",
  surface: "#FFFFFF",
  surfaceMuted: "#F2F4F8",
  border: "#D8E0EB",
  textPrimary: "#111827",
  textSecondary: "#66758C",
  textMuted: "#8B96A8",
  chartGrid: "#E6ECF4",
  chartAxis: "#90A0B8",
  chartPalette: [
    "#00327D",
    "#0047AB",
    "#1A237E",
    "#6C98FF",
    "#C7D6EE",
    "#E4ECF8",
  ],
} as const;

const KPI_ICON_RULES: Array<{ icon: LucideIcon; keywords: string[] }> = [
  {
    icon: DollarSign,
    keywords: [
      "revenue",
      "sales",
      "amount",
      "payment",
      "billing",
      "invoice",
      "arr",
      "mrr",
      "gmv",
      "price",
      "income",
    ],
  },
  {
    icon: Users,
    keywords: ["user", "customer", "client", "member", "visitor", "account"],
  },
  {
    icon: Percent,
    keywords: [
      "conversion",
      "rate",
      "ratio",
      "share",
      "margin",
      "percent",
      "%",
    ],
  },
  {
    icon: Clock3,
    keywords: ["session", "time", "duration", "latency", "cycle", "depth"],
  },
  {
    icon: ShoppingCart,
    keywords: ["order", "cart", "purchase", "basket", "checkout"],
  },
  {
    icon: TrendingUp,
    keywords: ["growth", "trend", "momentum", "uplift", "expansion"],
  },
  {
    icon: ShieldCheck,
    keywords: ["auth", "authorization", "approval", "secure", "compliance"],
  },
  {
    icon: Gauge,
    keywords: ["load", "usage", "system", "capacity", "utilization"],
  },
  {
    icon: Globe2,
    keywords: ["region", "regional", "geo", "market", "country"],
  },
  {
    icon: ArrowRightLeft,
    keywords: ["ltv", "cac", "mix", "balance", "compare"],
  },
];

const AGGREGATION_ICON_MAP: Record<string, LucideIcon> = {
  count: Hash,
  range: CalendarRange,
  avg: Activity,
  sum: DollarSign,
  min: Target,
  max: TrendingUp,
  mode: CreditCard,
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function resolveKpiIcon(kpi: KPIConfig): LucideIcon {
  const haystack = [
    normalizeText(kpi.label),
    normalizeText(kpi.description),
    normalizeText(kpi.column),
    normalizeText(kpi.aggregation),
  ].join(" ");

  for (const rule of KPI_ICON_RULES) {
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
      return rule.icon;
    }
  }

  if (kpi.isPrimary) {
    return TrendingUp;
  }

  return AGGREGATION_ICON_MAP[normalizeText(kpi.aggregation)] ?? Hash;
}

export function formatAggregationLabel(
  aggregation: string | null | undefined,
): string {
  const normalized = normalizeText(aggregation);

  if (normalized === "avg") {
    return "Average";
  }
  if (normalized === "sum") {
    return "Total";
  }
  if (normalized === "count") {
    return "Count";
  }
  if (normalized === "mode") {
    return "Mode";
  }
  if (normalized === "range") {
    return "Range";
  }
  if (normalized === "min") {
    return "Minimum";
  }
  if (normalized === "max") {
    return "Maximum";
  }

  if (!normalized) {
    return "Metric";
  }

  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
}
