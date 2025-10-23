/**
 * Solo Practice Interface Component
 *
 * Interactive AI conversation practice interface with streaming.
 * Features:
 * - Topic selection from interests and curriculum
 * - Real-time streaming conversation with AI Coach (via AI SDK)
 * - Grammar corrections displayed inline
 * - Conversation history
 * - Progress tracking
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Profile } from '@/types';
import { createClient } from '@/lib/supabase/client';

interface SoloPracticeInterfaceProps {
  profile: Profile;
}

// Default topics based on common interests
const SUGGESTED_TOPICS = [
  'Travel and Tourism',
  'Movies and Entertainment',
  'Technology and Innovation',
  'Food and Cooking',
  'Sports and Fitness',
  'Books and Literature',
  'Music and Arts',
  'Nature and Environment',
  'Daily Life and Routines',
  'Future Plans and Dreams',
];

export default function SoloPracticeInterface({
  profile,
}: SoloPracticeInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // State
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [input, setInput] = useState('');

  // AI SDK useChat hook for streaming
  const {
    messages,
    sendMessage,
    status,
    error,
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/practice/chat',
      body: {
        data: {
          topic: selectedTopic,
          studentLevel: profile.proficiency_level,
          learningGoals: (profile as any).learning_goals || [],
          grammarFocus: [], // TODO: Get from curriculum
        },
      },
    }),
  });

  // Suggested topics from user interests
  const userTopics = profile.interests || [];
  const allTopics = [...new Set([...userTopics, ...SUGGESTED_TOPICS])];

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startPractice = async (topic: string) => {
    setIsStarting(true);
    setSelectedTopic(topic);

    try {
      // Create a solo_practice_sessions record
      const { data: session, error: sessionError } = await supabase
        .from('solo_practice_sessions')
        .insert({
          student_id: profile.id,
          topic,
          proficiency_level: profile.proficiency_level,
          learning_goals: (profile as any).learning_goals || [],
          grammar_focus: [], // TODO: Get from curriculum
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Error creating solo practice session:', sessionError);
        throw sessionError;
      }

      if (session) {
        // Redirect to the dedicated solo practice chat page
        window.location.href = `/practice/${session.id}`;
      }
    } catch (error) {
      console.error('Error starting practice:', error);
      alert('Failed to start practice session. Please try again.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim() || status === 'streaming' || !selectedTopic) return;

    const message = input.trim();
    setInput(''); // Clear input immediately

    await sendMessage({ text: message });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!input.trim() || status === 'streaming' || !selectedTopic) return;

      const message = input.trim();
      setInput(''); // Clear input immediately

      sendMessage({ text: message });
    }
  };

  const resetPractice = () => {
    setSelectedTopic(null);
    // Messages will be cleared by recreating the useChat hook
    window.location.reload(); // Simple way to reset the chat
  };

  // Topic selection view
  if (!selectedTopic) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Choose a Topic
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Select a topic to start practicing. The AI coach will help you improve your
            conversation skills.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allTopics.map((topic) => (
              <button
                key={topic}
                onClick={() => startPractice(topic)}
                disabled={isStarting}
                className="p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left"
              >
                <div className="font-medium text-foreground">{topic}</div>
                {profile.interests?.includes(topic) && (
                  <Badge variant="secondary" className="mt-2 text-xs">
                    Your Interest
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-6 bg-primary/5 border-primary/20">
          <h3 className="font-semibold text-foreground mb-2">💡 Practice Tips</h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Try to use complete sentences</li>
            <li>Don&apos;t worry about making mistakes - that&apos;s how you learn!</li>
            <li>The AI coach will gently correct grammar errors</li>
            <li>Practice for at least 5-10 minutes to see improvement</li>
            <li>You can change topics anytime</li>
          </ul>
        </Card>
      </div>
    );
  }

  // Practice conversation view
  return (
    <div className="space-y-4">
      {/* Topic Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-sm text-muted-foreground">Practicing</div>
              <div className="font-semibold text-foreground">{selectedTopic}</div>
            </div>
            <Badge variant="secondary">{profile.proficiency_level}</Badge>
          </div>
          <Button onClick={resetPractice} variant="outline" size="sm">
            Change Topic
          </Button>
        </div>
      </Card>

      {/* Messages */}
      <Card className="h-[500px] flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => {
            const isAssistant = message.role === 'assistant';
            // Get text content from message parts
            const messageText = message.parts
              .filter((part) => part.type === 'text')
              .map((part: any) => part.text)
              .join('');

            return (
              <div
                key={message.id}
                className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}
              >
                <div className={`max-w-lg ${isAssistant ? '' : 'flex flex-col items-end'}`}>
                  <div
                    className={`px-4 py-2 rounded-lg ${
                      isAssistant
                        ? 'bg-card border border-border'
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{messageText}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 px-1">
                    {new Date().toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })}
          {status === 'streaming' && (
            <div className="flex justify-start">
              <div className="bg-card border border-border px-4 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="text-sm text-muted-foreground">Coach is thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-4">
          <form onSubmit={handleSubmit}>
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
                disabled={status === 'streaming'}
                rows={2}
                className="flex-1 resize-none"
              />
              <Button type="submit" disabled={!input.trim() || status === 'streaming'}>
                {status === 'streaming' ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></div>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              💡 The AI coach will provide gentle corrections and keep the conversation going
            </p>
          </form>
        </div>
      </Card>
    </div>
  );
}
