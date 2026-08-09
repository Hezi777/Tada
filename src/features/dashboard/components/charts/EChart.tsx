"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart, PieChart, ScatterChart } from "echarts/charts";
import {
  AriaComponent,
  GraphicComponent,
  GridComponent,
  TooltipComponent,
} from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import type { EChartsCoreOption, EChartsType } from "echarts/core";

echarts.use([
  AriaComponent,
  BarChart,
  GridComponent,
  GraphicComponent,
  LineChart,
  PieChart,
  ScatterChart,
  SVGRenderer,
  TooltipComponent,
]);

type EChartProps = {
  option: EChartsCoreOption;
  width: number;
  height: number;
  label: string;
  isInteracting?: boolean;
};

export function EChart({
  option,
  width,
  height,
  label,
  isInteracting = false,
}: EChartProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const instance = echarts.init(element, undefined, { renderer: "svg" });
    chartRef.current = instance;
    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(element);

    return () => {
      observer.disconnect();
      instance.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    chartRef.current?.setOption(
      {
        ...option,
        animation: !isInteracting && !reduceMotion,
        aria: { enabled: true, description: label },
      },
      { notMerge: true },
    );
  }, [isInteracting, label, option]);

  return (
    <div
      ref={elementRef}
      role="img"
      aria-label={label}
      className="overflow-hidden"
      style={{ width, height }}
    />
  );
}
