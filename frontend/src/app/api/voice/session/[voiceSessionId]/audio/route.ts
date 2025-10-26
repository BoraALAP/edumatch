import { NextRequest, NextResponse } from 'next/server';
import { appendVoiceAudio } from '@/lib/voice/session-store';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ voiceSessionId: string }> }
) {
  try {
    const { voiceSessionId } = await params;
    if (!voiceSessionId) {
      return NextResponse.json({ error: 'Missing voiceSessionId.' }, { status: 400 });
    }

    const body = await request.json();
    const { audioBase64 } = body as { audioBase64?: string };

    if (!audioBase64) {
      return NextResponse.json(
        { error: 'audioBase64 is required.' },
        { status: 400 }
      );
    }

    await appendVoiceAudio(voiceSessionId, audioBase64);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to append voice audio:', error);
    return NextResponse.json(
      { error: 'Failed to append voice audio.' },
      { status: 500 }
    );
  }
}
