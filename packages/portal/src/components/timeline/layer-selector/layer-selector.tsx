"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/shadcn/button";
import { Checkbox } from "@/components/shadcn/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shadcn/popover";
import { cn } from "@/lib/utils";

type Layer = {
  id: string;
  title: string;
};

type Props = {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
};

export const LayerSelector = ({ selectedIds, onSelectionChange }: Props) => {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchLayers = async () => {
      try {
        const response = await fetch("/api/layers");
        if (!response.ok) throw new Error("Failed to fetch layers");
        const data = await response.json();
        setLayers(data.layers);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLayers();
  }, []);

  const handleToggle = (layerId: string) => {
    if (selectedIds.includes(layerId)) {
      onSelectionChange(selectedIds.filter((id) => id !== layerId));
    } else {
      onSelectionChange([...selectedIds, layerId]);
    }
  };

  const selectedCount = selectedIds.length;
  const buttonLabel =
    selectedCount === 0
      ? "Select layers..."
      : selectedCount === 1
        ? layers.find((l) => l.id === selectedIds[0])?.title ?? "1 layer"
        : `${selectedCount} layers selected`;

  if (error) {
    return (
      <div className="text-sm text-destructive">Error loading layers</div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-[280px] justify-between", isLoading && "opacity-50")}
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : buttonLabel}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ml-2 shrink-0 opacity-50"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-2" align="start">
        {layers.length === 0 ? (
          <div className="py-2 px-2 text-sm text-muted-foreground">
            No layers found
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {layers.map((layer) => (
              <label
                key={layer.id}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent cursor-pointer"
              >
                <Checkbox
                  checked={selectedIds.includes(layer.id)}
                  onCheckedChange={() => handleToggle(layer.id)}
                />
                <span className="text-sm">{layer.title}</span>
              </label>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
