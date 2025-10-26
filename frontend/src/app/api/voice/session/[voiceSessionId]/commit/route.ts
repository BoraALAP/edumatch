import { NextResponse } from 'next/server';
import { commitVoiceAudio } from '@/lib/voice/session-store';

export const runtime = 'nodejs';

export async function POST(_: Request, { params }: { params: Promise<{ voiceSessionId: string }> }) {
  try {
    const { voiceSessionId } = await params;
    if (!voiceSessionId) {
      return NextResponse.json({ error: 'Missing voiceSessionId.' }, { status: 400 });
    }

    await commitVoiceAudio(voiceSessionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to commit voice audio:', error);
    return NextResponse.json(
      { error: 'Failed to commit voice audio.' },
      { status: 500 }
    );
  }
}
