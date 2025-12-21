"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/table";
import { formatDate } from "@/lib/utils";
import type { LayerRole } from "@history-portal/db";
import type {
  CardWithLayer,
  CardsRequest,
  CardsResponse,
} from "@/app/api/cards/types";

type Props = {
  layerIds: string[];
};

/**
 * Formats role with visual styling
 */
const formatRole = (role: LayerRole): string => {
  return role.charAt(0).toUpperCase() + role.slice(1);
};

export const CardsTable = ({ layerIds }: Props) => {
  const [cards, setCards] = useState<CardWithLayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCards() {
      setIsLoading(true);
      setError(null);

      try {
        const requestBody: CardsRequest = {
          layerIds: layerIds.length > 0 ? layerIds : undefined,
        };

        const response = await fetch("/api/cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch cards");
        }

        const data: CardsResponse = await response.json();
        setCards(data.cards);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }

    fetchCards();
  }, [layerIds]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        Loading cards...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8 text-destructive">
        Error: {error}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        {layerIds.length === 0
          ? "Select layers to view cards"
          : "No cards found in selected layers"}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
            <TableHead>Layer</TableHead>
            <TableHead>Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cards.map((card) => (
            <TableRow key={`${card.id}-${card.layerId}`}>
              <TableCell className="font-medium">{card.title}</TableCell>
              <TableCell>
                {formatDate(card.startYear, card.startMonth, card.startDay)}
              </TableCell>
              <TableCell>
                {card.endYear
                  ? formatDate(card.endYear, card.endMonth, card.endDay)
                  : "—"}
              </TableCell>
              <TableCell>{card.layerTitle}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    card.role === "owner"
                      ? "bg-purple-100 text-purple-700"
                      : card.role === "editor"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {formatRole(card.role)}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
