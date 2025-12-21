"use client";

import { useState } from "react";
import { LayerSelector } from "@/components/timeline/layer-selector";

export const TimelineClient = () => {
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">Filter by layers:</span>
        <LayerSelector
          selectedIds={selectedLayerIds}
          onSelectionChange={setSelectedLayerIds}
        />
      </div>

      {selectedLayerIds.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Selected layer IDs: {selectedLayerIds.join(", ")}
        </div>
      )}
    </div>
  );
};
