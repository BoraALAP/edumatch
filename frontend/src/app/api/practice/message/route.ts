/**
 * Solo Practice Message API Route
 *
 * Handles conversation with the AI Coach.
 * Provides real-time responses with grammar corrections.
 * Uses Mastra agents for improved voice and streaming capabilities.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runSoloPracticeAgent } from '@/mastra/agents/solo-practice-agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      topic,
      studentLevel,
      learningGoals = [],
      grammarFocus = [],
      conversationHistory = [],
      message,
    } = body;

    if (!topic || !studentLevel || !message) {
      return NextResponse.json(
        { error: 'topic, studentLevel, and message are required' },
        { status: 400 }
      );
    }

    // Run the solo practice agent
    const response = await runSoloPracticeAgent(
      {
        topic,
        studentLevel,
        learningGoals,
        conversationHistory,
        grammarFocus,
      },
      message
    );

    return NextResponse.json({
      success: true,
      coachMessage: response.message,
      hasCorrection: response.includesCorrection,
      correction: response.correction,
    });
  } catch (error) {
    console.error('Error in solo practice:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
