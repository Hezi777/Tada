"use client";

import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DASHBOARD_ICON_OPTIONS, DASHBOARD_COLOR_OPTIONS } from "@tada/shared";
import {
    BarChart3,
    PieChart,
    TrendingUp,
    Store,
    ShoppingCart,
    Users,
    Activity,
    Target,
    Zap,
    Layers,
    X,
} from "lucide-react";

type Props = {
    open: boolean;
    onClose: () => void;
    onCreated: (dashboard: {
        name: string;
        icon: string;
        color: string;
    }) => void;
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    "bar-chart": BarChart3,
    "pie-chart": PieChart,
    "trending-up": TrendingUp,
    store: Store,
    "shopping-cart": ShoppingCart,
    users: Users,
    activity: Activity,
    target: Target,
    zap: Zap,
    layers: Layers,
};

export function getIconComponent(
    iconName: string,
): React.ComponentType<{ className?: string }> {
    return ICON_MAP[iconName] ?? BarChart3;
}

export default function CreateDashboardModal({
    open,
    onClose,
    onCreated,
}: Props) {
    const [name, setName] = useState("");
    const [selectedIcon, setSelectedIcon] = useState<string>(
        DASHBOARD_ICON_OPTIONS[0],
    );
    const [selectedColor, setSelectedColor] = useState<string>(
        DASHBOARD_COLOR_OPTIONS[0],
    );

    if (!open) return null;

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;
        onCreated({
            name: name.trim(),
            icon: selectedIcon,
            color: selectedColor,
        });
        setName("");
        setSelectedIcon(DASHBOARD_ICON_OPTIONS[0]);
        setSelectedColor(DASHBOARD_COLOR_OPTIONS[0]);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Card className="relative w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-white p-0 shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
                    <h2 className="font-display text-lg text-[var(--color-text-primary)]">
                        New Dashboard
                    </h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8 rounded-full text-[var(--color-text-muted)] hover:bg-slate-100"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 px-6 py-5">
                    {/* Name */}
                    <div>
                        <label className="mb-1.5 block text-[12px] font-medium text-[var(--color-text-secondary)]">
                            Name
                        </label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Q4 Sales Analysis"
                            className="h-10 rounded-lg border-[var(--color-border)] bg-[var(--color-bg)] text-sm focus-visible:ring-[#3B82F6]"
                            autoFocus
                        />
                    </div>

                    {/* Icon picker */}
                    <div>
                        <label className="mb-2 block text-[12px] font-medium text-[var(--color-text-secondary)]">
                            Icon
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {DASHBOARD_ICON_OPTIONS.map((iconName) => {
                                const IconComp = getIconComponent(iconName);
                                const isSelected = iconName === selectedIcon;
                                return (
                                    <button
                                        key={iconName}
                                        type="button"
                                        onClick={() => setSelectedIcon(iconName)}
                                        className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${isSelected
                                            ? "ring-2 ring-[#3B82F6] ring-offset-2"
                                            : "hover:bg-slate-50"
                                            }`}
                                        style={{
                                            backgroundColor: isSelected ? selectedColor + "18" : undefined,
                                            color: isSelected ? selectedColor : "var(--color-text-muted)",
                                        }}
                                    >
                                        <IconComp className="h-5 w-5" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Color picker */}
                    <div>
                        <label className="mb-2 block text-[12px] font-medium text-[var(--color-text-secondary)]">
                            Color
                        </label>
                        <div className="flex gap-2">
                            {DASHBOARD_COLOR_OPTIONS.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setSelectedColor(color)}
                                    className={`h-8 w-8 rounded-full transition-all ${color === selectedColor
                                        ? "ring-2 ring-offset-2"
                                        : "hover:scale-110"
                                        }`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="rounded-xl border border-[var(--color-border)] p-4">
                        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                            Preview
                        </p>
                        <div className="flex items-center gap-3">
                            <div
                                className="flex h-10 w-10 items-center justify-center rounded-xl"
                                style={{ backgroundColor: selectedColor + "20", color: selectedColor }}
                            >
                                {(() => {
                                    const PreviewIcon = getIconComponent(selectedIcon);
                                    return <PreviewIcon className="h-5 w-5" />;
                                })()}
                            </div>
                            <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                                {name || "Untitled dashboard"}
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="h-9 rounded-lg px-4 text-sm text-[var(--color-text-secondary)]"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!name.trim()}
                            className="h-9 rounded-lg px-5 text-sm"
                            style={{ backgroundColor: selectedColor }}
                        >
                            Create Dashboard
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
