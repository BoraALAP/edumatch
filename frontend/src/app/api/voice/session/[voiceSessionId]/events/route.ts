import { NextResponse } from 'next/server';
import { consumeVoiceEvents } from '@/lib/voice/session-store';

export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: Promise<{ voiceSessionId: string }> }) {
  try {
    const { voiceSessionId } = await params;
    if (!voiceSessionId) {
      return NextResponse.json({ error: 'Missing voiceSessionId.' }, { status: 400 });
    }

    const events = consumeVoiceEvents(voiceSessionId);
    return NextResponse.json({ events });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('not found') ? 404 : 500;
    if (status === 404) {
      console.warn('Voice session not found when polling events:', message);
    } else {
      console.error('Failed to retrieve voice events:', message);
    }
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
