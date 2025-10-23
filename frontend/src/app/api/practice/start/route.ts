/**
 * Solo Practice Start API Route
 *
 * Generates an engaging starter prompt to begin a practice session.
 * Uses Mastra agents for improved voice and streaming capabilities.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateStarterPrompt } from '@/mastra/agents/solo-practice-agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, studentLevel, learningGoals = [] } = body;

    if (!topic || !studentLevel) {
      return NextResponse.json(
        { error: 'topic and studentLevel are required' },
        { status: 400 }
      );
    }

    // Generate starter prompt using AI
    const starterMessage = await generateStarterPrompt({
      topic,
      studentLevel,
      learningGoals,
    });

    return NextResponse.json({
      success: true,
      starterMessage,
    });
  } catch (error) {
    console.error('Error generating starter prompt:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
