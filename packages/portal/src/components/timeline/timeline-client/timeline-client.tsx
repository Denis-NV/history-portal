"use client";

import { useState } from "react";
import { LayerSelector } from "@/components/timeline/layer-selector";
import { CardsTable } from "@/components/timeline/cards-table";

export const TimelineClient = () => {
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">Filter by layers:</span>
        <LayerSelector
          selectedIds={selectedLayerIds}
          onSelectionChange={setSelectedLayerIds}
        />
      </div>

      <CardsTable layerIds={selectedLayerIds} />
    </div>
  );
};
