import { NextRequest, NextResponse } from 'next/server';
import { createVoiceServerSession } from '@/lib/voice/session-store';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set in environment variables');
      return NextResponse.json(
        { error: 'Server configuration error: OpenAI API key not configured.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      voicePracticeSessionId,
      studentId,
      context,
    } = body as {
      voicePracticeSessionId?: string;
      studentId?: string;
      context?: {
        topic?: string;
        studentLevel?: string;
        learningGoals?: string[];
        grammarFocus?: string[];
        voiceSpeaker?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
      };
    };

    console.log('[Voice Session API] Request received:', {
      voicePracticeSessionId,
      studentId,
      topic: context?.topic,
      studentLevel: context?.studentLevel,
    });

    if (
      !voicePracticeSessionId ||
      !studentId ||
      !context?.topic ||
      !context?.studentLevel
    ) {
      return NextResponse.json(
        { error: 'Missing required fields for voice session creation.' },
        { status: 400 }
      );
    }

    const response = await createVoiceServerSession({
      voicePracticeSessionId,
      studentId,
      context: {
        topic: context.topic,
        studentLevel: context.studentLevel,
        learningGoals: context.learningGoals ?? [],
        grammarFocus: context.grammarFocus ?? [],
        voiceSpeaker: context.voiceSpeaker,
      },
    });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Failed to create voice session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
    });

    return NextResponse.json(
      {
        error: 'Failed to create voice session.',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
