import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { v4 as uuidv4 } from "uuid";
import type { TagBucket } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return uuidv4();
}

export function now(): string {
  return new Date().toISOString();
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + "...";
}

// Contrast utility - determines if text should be light or dark based on background color
export function getContrastTextColor(hexColor: string): string {
  // Default to dark text if invalid color
  if (!hexColor || !hexColor.startsWith("#")) return "#1A1A1A";

  // Parse hex color
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance using sRGB formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return dark text for light backgrounds, light text for dark backgrounds
  return luminance > 0.6 ? "#1A1A1A" : "#FFFFFF";
}

export function getContrastMutedColor(hexColor: string): string {
  if (!hexColor || !hexColor.startsWith("#")) return "#6A6864";

  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return muted colors based on background
  return luminance > 0.6 ? "#6A6864" : "#B4B2AC";
}

// Tag styling helpers
export function getTagStyles(bucket: TagBucket): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (bucket) {
    case "commit":
      return {
        bg: "bg-[#D8F3DC]",
        text: "text-[#2D6A4F]",
        border: "border-[#2D6A4F]/30",
        dot: "bg-[#2D6A4F]",
      };
    case "discard":
      return {
        bg: "bg-[#F5F5F5]",
        text: "text-[#9E9E9E]",
        border: "border-[#9E9E9E]/30",
        dot: "bg-[#9E9E9E]",
      };
    case "hold":
      return {
        bg: "bg-[#FEF3C7]",
        text: "text-[#B45309]",
        border: "border-[#B45309]/30",
        dot: "bg-[#B45309]",
      };
    case "reference":
      return {
        bg: "bg-[#DBEAFE]",
        text: "text-[#1E40AF]",
        border: "border-[#1E40AF]/30",
        dot: "bg-[#1E40AF]",
      };
  }
}

export function getTagLabel(tagId: string): string {
  const labels: Record<string, string> = {
    commit: "Use this",
    discard: "Don't use",
    hold: "Park it",
    reference: "Reference",
  };
  return labels[tagId] || tagId;
}

// Parse conversation text into chunks
export function parseConversation(
  text: string
): { speaker: "human" | "assistant"; content: string }[] {
  const turns: { speaker: "human" | "assistant"; content: string }[] = [];

  // Try to detect speaker patterns
  const patterns = [
    /^(Human|User|Me):\s*/im,
    /^(Assistant|Claude|AI):\s*/im,
  ];

  // Split by speaker markers
  const lines = text.split("\n");
  let currentSpeaker: "human" | "assistant" | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const userMatch = line.match(/^(Human|User|Me):\s*(.*)/i);
    const assistantMatch = line.match(/^(Assistant|Claude|AI):\s*(.*)/i);

    if (userMatch) {
      if (currentSpeaker && currentContent.length) {
        turns.push({
          speaker: currentSpeaker,
          content: currentContent.join("\n").trim(),
        });
      }
      currentSpeaker = "human";
      currentContent = [userMatch[2]];
    } else if (assistantMatch) {
      if (currentSpeaker && currentContent.length) {
        turns.push({
          speaker: currentSpeaker,
          content: currentContent.join("\n").trim(),
        });
      }
      currentSpeaker = "assistant";
      currentContent = [assistantMatch[2]];
    } else {
      currentContent.push(line);
    }
  }

  if (currentSpeaker && currentContent.length) {
    turns.push({
      speaker: currentSpeaker,
      content: currentContent.join("\n").trim(),
    });
  }

  // Fallback: if no turns detected, treat entire text as assistant
  if (turns.length === 0 && text.trim()) {
    turns.push({ speaker: "assistant", content: text.trim() });
  }

  return turns;
}

export function chunkAssistantTurn(content: string): string[] {
  // Split by double newlines (paragraph breaks)
  const paragraphs = content
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20); // skip very short chunks

  if (paragraphs.length === 0) {
    return content.trim() ? [content.trim()] : [];
  }

  return paragraphs;
}

export function autoTitle(text: string): string {
  const words = text.split(/\s+/).slice(0, 8).join(" ");
  return words.replace(/[#*`_]/g, "").trim();
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
