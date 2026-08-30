import type { KPIConfig } from "@/shared/contracts";
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
  Tag,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

export const DASHBOARD_COLORS = {
  primary: "#00327D",
  secondary: "#0047AB",
  tertiary: "#295ea8",
  neutral: "#F7F9FB",
  surface: "#FFFFFF",
  surfaceMuted: "#F2F4F6",
  border: "rgba(25, 28, 30, 0.12)",
  textPrimary: "#191C1E",
  textSecondary: "#434653",
  textMuted: "#9BA3B2",
  chartGrid: "#ECEEF0",
  chartAxis: "#6B7280",
  chartPalette: [
    "#00327D",
    "#0047AB",
    "#295EA8",
    "#6C98FF",
    "#C7D6EE",
    "#E7EEF8",
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
    icon: TrendingUp,
    keywords: ["profit", "margin"],
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
  // "sum" doesn't imply currency by itself — a genuinely money-shaped KPI
  // (revenue/sales/amount/...) already matches a label/column rule above
  // before falling back here, so this default stays generic (Hash), not $.
  sum: Hash,
  min: Target,
  max: TrendingUp,
  mode: CreditCard,
};

/** 3D illustration shown as the KPI card's hero graphic, keyed by the
 * Lucide icon `resolveKpiIcon`/`getKpiIcon` already resolved for that card. */
const ICON_ILLUSTRATION_MAP = new Map<LucideIcon, string>([
  [DollarSign, "kpi-revenue.png"],
  [Users, "kpi-customers.png"],
  [Percent, "kpi-conversion.png"],
  [Clock3, "kpi-time.png"],
  [ShoppingCart, "kpi-orders.png"],
  [TrendingUp, "kpi-growth.png"],
  [ShieldCheck, "kpi-security.png"],
  [Gauge, "kpi-system.png"],
  [Globe2, "kpi-region.png"],
  [ArrowRightLeft, "kpi-comparison.png"],
  [Hash, "kpi-count.png"],
  [CalendarRange, "kpi-daterange.png"],
  [Activity, "kpi-average.png"],
  [Target, "kpi-target.png"],
  [CreditCard, "kpi-payment.png"],
  [Tag, "kpi-count.png"],
]);

/** Path under `/illustrations/kpi/...` for a resolved KPI icon, or `null` if
 * no illustration exists yet for that icon. */
export function resolveIllustrationForIcon(icon: LucideIcon): string | null {
  const filename = ICON_ILLUSTRATION_MAP.get(icon);
  return filename ? `/illustrations/kpi/${filename}` : null;
}

export function resolveKpiIllustration(kpi: KPIConfig): string | null {
  return resolveIllustrationForIcon(resolveKpiIcon(kpi));
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function resolveKpiIcon(kpi: KPIConfig): LucideIcon {
  const haystack = [
    normalizeText(kpi.label),
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
