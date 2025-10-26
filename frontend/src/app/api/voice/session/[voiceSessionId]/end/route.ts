import { NextResponse } from 'next/server';
import { endVoiceServerSession } from '@/lib/voice/session-store';

export const runtime = 'nodejs';

export async function POST(
  _: Request,
  { params }: { params: Promise<{ voiceSessionId: string }> }
) {
  try {
    const { voiceSessionId } = await params;
    if (!voiceSessionId) {
      return NextResponse.json({ error: 'Missing voiceSessionId.' }, { status: 400 });
    }

    await endVoiceServerSession(voiceSessionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to end voice session:', error);
    return NextResponse.json(
      { error: 'Failed to end voice session.' },
      { status: 500 }
    );
  }
}
