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
import type { CardWithUser, CardsResponse } from "@/app/api/cards/types";

export const CardsTable = () => {
  const [cards, setCards] = useState<CardWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCards() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/cards");

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
  }, []);

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
        No cards found. Create your first card!
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Summary</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
            <TableHead>User</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cards.map((card) => (
            <TableRow key={card.id}>
              <TableCell className="font-medium">{card.title}</TableCell>
              <TableCell className="max-w-md truncate text-muted-foreground">
                {card.summary || "—"}
              </TableCell>
              <TableCell>
                {formatDate(card.startYear, card.startMonth, card.startDay)}
              </TableCell>
              <TableCell>
                {card.endYear
                  ? formatDate(card.endYear, card.endMonth, card.endDay)
                  : "—"}
              </TableCell>
              <TableCell>{card.userName}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
