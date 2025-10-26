/**
 * Grammar Checker Tool
 *
 * Purpose: Tool for agents to check grammar in student messages
 * Features:
 * - Check grammar and provide corrections
 * - Severity-based filtering
 * - Level-appropriate suggestions
 */

import { aiService } from '@/lib/ai/ai-service';
import { z } from 'zod';

export const grammarCheckerTool = {
  name: 'check_grammar',
  description: 'Check grammar in student text and provide corrections',
  parameters: z.object({
    text: z.string().describe('The text to check for grammar issues'),
    studentLevel: z.string().describe('Student proficiency level (A1, A2, B1, B2, C1, C2)'),
  }),
  execute: async ({ text, studentLevel }: { text: string; studentLevel: string }) => {
    try {
      const result = await aiService.checkGrammar(text, studentLevel);

      // Show ALL issues to help students learn (including minor ones)
      const allIssues = result.issues;

      return {
        hasIssues: allIssues.length > 0,
        issueCount: allIssues.length,
        issues: allIssues.map(issue => ({
          type: issue.type || 'grammar',
          severity: issue.severity,
          original: issue.original,
          suggestion: issue.suggestion ?? issue.correction ?? issue.original,
          explanation: issue.explanation,
        })),
      };
    } catch (error) {
      console.error('Error checking grammar:', error);
      return { hasIssues: false, issueCount: 0, issues: [], error: 'Failed to check grammar' };
    }
  },
};
