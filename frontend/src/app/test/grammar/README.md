# Grammar Testing Tool

## Overview

A comprehensive development tool for testing and validating the EduMatch AI grammar correction system.

## Location

`/test/grammar`

## Purpose

This page provides a testing interface to validate that the AI grammar correction system correctly identifies:

- Grammar errors (subject-verb agreement, tense, articles, prepositions, word order, etc.)
- Spelling mistakes
- Vocabulary misuse
- Idiomatic errors
- Punctuation errors
- Mixed error types
- Correct sentences (should show no errors)

## Features

### Predefined Test Cases

The tool includes **26 comprehensive test cases** covering:

1. **Subject-Verb Agreement** (2 tests)
2. **Tense Errors** (2 tests)
3. **Article Errors** (2 tests)
4. **Preposition Errors** (2 tests)
5. **Spelling Errors** (3 tests)
6. **Vocabulary Errors** (3 tests)
7. **Idiomatic Errors** (2 tests)
8. **Punctuation Errors** (2 tests)
9. **Mixed Errors** (2 tests)
10. **Correct Sentences** (3 tests at A2, B2, C1 levels)

### Custom Input Testing

- Enter any sentence to test
- Select student proficiency level (A1-C2)
- Get real-time AI analysis

### Visual Feedback

- **Result badges**: Shows if AI correctly detected errors
  - ✓ Detected Correctly (green)
  - ✓ Correct (No Errors) (green)
  - ✗ Missed Errors (red)
  - ✗ False Positive (gray)

- **Grammar corrections**: Uses the same `CorrectionMessage` component as production
- **Detailed breakdown**: Expandable issue details with before/after comparisons
- **Raw JSON**: View the complete API response structure

## Usage

### Running Tests

1. Navigate to `/test/grammar` in your development environment
2. Click any predefined test case to run analysis
3. View results in the right panel
4. Click "Show details" to see full grammar issue breakdown

### Custom Testing

1. Enter your sentence in the "Custom Test" input
2. Select appropriate student level
3. Click "Test" button
4. Review AI analysis results

### Interpreting Results

**Test Case Info:**

- Name and description of the test
- Original sentence
- Student level
- Expected errors
- Number of issues found

**Grammar Analysis:**

- Overall AI feedback
- Individual grammar issues with:
  - Severity level (minor/moderate/major)
  - Category (grammar, spelling, vocabulary, etc.)
  - Before/after comparison
  - Detailed explanation
- Raw JSON structure for debugging

## Test Case Examples

### Grammar Error

```
Sentence: "She go to school every day."
Expected: Subject-verb agreement error
Level: A2
```

### Spelling Error

```
Sentence: "I need to improve my gremmer skills."
Expected: Spelling error (grammar)
Level: A1
```

### Correct Sentence

```
Sentence: "I like to read books in my free time."
Expected: No errors
Level: A2
```

## Technical Implementation

### Architecture

```
/app/test/grammar/
├── page.tsx                          # Server component
└── sections/
    └── grammar-test-client.tsx      # Client component with UI
```

### Dependencies

- **AI Service**: `/lib/ai/ai-service.ts` - Grammar checking via Mastra
- **Components**:
  - `CorrectionMessage` - Grammar feedback display
  - `GrammarIssueDetail` - Individual issue breakdown
  - Shadcn UI components (Card, Button, Badge, Input, Textarea)
- **Toast**: Sonner for notifications

### Data Flow

1. User selects test case or enters custom input
2. Client calls `aiService.checkGrammar(text, level)`
3. AI Service uses Mastra conversation agent
4. Agent returns `GrammarCorrectionResult`
5. Client displays results using `CorrectionMessage` component

## API Response Structure

```typescript
{
  hasIssues: boolean;
  issues: Array<{
    original: string;           // Incorrect text
    correction: string;         // Corrected text
    explanation: string;        // Why it's wrong
    severity: 'minor' | 'moderate' | 'major';
    category?: string;          // Error type
  }>;
  overallFeedback?: string;    // AI summary
}
```

## Development Tips

### Adding New Test Cases

Edit `grammar-test-client.tsx` and add to `TEST_CASES` array:

```typescript
{
  id: 'unique-id',
  name: 'Test Name',
  sentence: 'Your test sentence.',
  expectedErrors: ['Error Type'],
  level: 'A2',
  description: 'What this test checks',
}
```

### Debugging AI Responses

- Use "View Raw JSON Data" toggle to see complete response
- Check console for errors
- Verify `aiService.checkGrammar()` is working
- Test Mastra agent directly if needed

### Testing Different Levels

The AI adjusts feedback based on student level:

- **A1-A2**: Only major errors that affect comprehension
- **B1**: Moderate to major errors
- **B2-C2**: More nuanced issues

## Validation Checklist

When testing grammar detection:

- [ ] All spelling errors are detected
- [ ] Grammar errors identified correctly
- [ ] Severity levels are appropriate
- [ ] Explanations are clear and helpful
- [ ] Correct sentences show no errors
- [ ] Level-appropriate feedback
- [ ] Mixed errors all caught
- [ ] No false positives on correct text

## Future Enhancements

Potential improvements:

- [ ] Batch testing (run all tests at once)
- [ ] Export test results to CSV/JSON
- [ ] Track accuracy over time
- [ ] Compare different AI models
- [ ] Add pronunciation testing
- [ ] Integration with CI/CD pipeline

## Related Files

- `/lib/ai/ai-service.ts` - AI service interface
- `/mastra/agents/conversation-agent.ts` - Grammar checking logic
- `/components/chat/CorrectionMessage.tsx` - Correction display
- `/components/chat/GrammarIssueDetail.tsx` - Issue details

## Notes

- This is a **development tool only** - not for production use
- Requires valid OpenAI API key for Mastra
- Grammar checking uses GPT-4o-mini model
- Test results may vary based on AI model behavior

---

**Last Updated**: October 2024
**Version**: 1.0
