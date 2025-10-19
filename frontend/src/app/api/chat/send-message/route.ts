/**
 * Send Message API Route
 *
 * Handles sending user messages to the database.
 * This endpoint inserts messages into the messages table.
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { matchId, content, senderId, senderType = 'user' } = body;

    if (!matchId || !content) {
      return NextResponse.json(
        { error: 'matchId and content are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Insert message into database
    // For testing: sender_id is just a string identifier, not a real UUID
    // So we set it to null since we don't have real users
    const { data, error } = await supabase
      .from('messages')
      .insert({
        match_id: matchId,
        sender_id: null, // Set to null for testing without auth
        sender_type: senderType,
        content: content,
        message_type: 'text',
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting message:', error);
      return NextResponse.json(
        { error: 'Failed to send message', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: data });
  } catch (error) {
    console.error('Error in send-message API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
