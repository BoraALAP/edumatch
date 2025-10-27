/**
 * Grammar Testing API Route
 *
 * Purpose: Server-side API endpoint for testing grammar corrections
 * Features:
 * - Accepts test sentences and student level
 * - Uses AI service to check grammar
 * - Returns detailed grammar analysis
 *
 * Usage: POST /api/test/grammar
 */

import { NextRequest, NextResponse } from "next/server";
import { aiService } from "@/lib/ai/ai-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sentence, level } = body;

    // Validate input
    if (!sentence || typeof sentence !== "string") {
      return NextResponse.json(
        { error: "Invalid sentence provided" },
        { status: 400 },
      );
    }

    if (!level || typeof level !== "string") {
      return NextResponse.json(
        { error: "Invalid level provided" },
        { status: 400 },
      );
    }

    // Call AI service to check grammar
    const result = await aiService.checkGrammar(sentence, level);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in grammar test API:", error);
    return NextResponse.json(
      { error: "Failed to analyze grammar" },
      { status: 500 },
    );
  }
}
