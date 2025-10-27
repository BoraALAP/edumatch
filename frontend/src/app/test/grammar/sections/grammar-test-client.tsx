/**
 * Grammar Testing Client Component
 *
 * Purpose: Development tool to test AI grammar correction system
 * Features:
 * - Predefined test cases covering all error types
 * - Manual input for custom testing
 * - Visual display of AI analysis results
 * - Grammar issue breakdown with severity levels
 * - Reuses existing CorrectionMessage component
 *
 * Used for: Testing and validating grammar detection accuracy
 */

"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import CorrectionMessage from "@/components/chat/CorrectionMessage";
import type { GrammarIssue } from "@/lib/chat/types";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, Send, TestTube } from "lucide-react";

interface TestCase {
  id: string;
  name: string;
  sentence: string;
  expectedErrors: string[];
  level?: string;
  description: string;
}

interface TestResult {
  testCase: TestCase;
  hasIssues: boolean;
  issues: GrammarIssue[];
  overallFeedback?: string;
  timestamp: Date;
}

const TEST_CASES: TestCase[] = [
  // Grammar Errors - Subject-Verb Agreement
  {
    id: "grammar-sv-1",
    name: "Subject-Verb Agreement",
    sentence: "She go to school every day.",
    expectedErrors: ["Subject-verb agreement"],
    level: "A2",
    description: "Third person singular verb error",
  },
  {
    id: "grammar-sv-2",
    name: "Subject-Verb Agreement (Plural)",
    sentence: "They was playing soccer yesterday.",
    expectedErrors: ["Subject-verb agreement"],
    level: "A2",
    description: "Plural subject with wrong verb form",
  },

  // Grammar Errors - Tense
  {
    id: "grammar-tense-1",
    name: "Past Tense Error",
    sentence: "I go to Paris yesterday.",
    expectedErrors: ["Tense"],
    level: "A2",
    description: "Past time marker with present tense",
  },
  {
    id: "grammar-tense-2",
    name: "Present Perfect Error",
    sentence: "I have saw that movie.",
    expectedErrors: ["Tense/participle"],
    level: "B1",
    description: "Incorrect past participle form",
  },

  // Grammar Errors - Articles
  {
    id: "grammar-article-1",
    name: "Missing Article",
    sentence: "I need book from library.",
    expectedErrors: ["Article"],
    level: "A1",
    description: "Missing definite articles",
  },
  {
    id: "grammar-article-2",
    name: "Wrong Article",
    sentence: "I bought a apple and a orange.",
    expectedErrors: ["Article"],
    level: "A2",
    description: "Wrong article before vowel sound",
  },

  // Grammar Errors - Prepositions
  {
    id: "grammar-prep-1",
    name: "Wrong Preposition",
    sentence: "I am good in mathematics.",
    expectedErrors: ["Preposition"],
    level: "B1",
    description: 'Should use "at" not "in"',
  },
  {
    id: "grammar-prep-2",
    name: "Missing Preposition",
    sentence: "She arrived the station late.",
    expectedErrors: ["Preposition"],
    level: "A2",
    description: 'Missing "at" before location',
  },

  // Spelling Errors
  {
    id: "spelling-1",
    name: "Common Misspelling",
    sentence: "I need to improve my gremmer skills.",
    expectedErrors: ["Spelling"],
    level: "A1",
    description: 'Misspelled "grammar"',
  },
  {
    id: "spelling-2",
    name: "Multiple Spelling Errors",
    sentence: "I beleive that educashun is importent for succses.",
    expectedErrors: ["Spelling"],
    level: "B1",
    description: "Multiple spelling mistakes",
  },
  {
    id: "spelling-3",
    name: "Challenging Spelling",
    sentence: "The accomodation was convinient and comfortible.",
    expectedErrors: ["Spelling"],
    level: "B2",
    description: "Commonly misspelled words",
  },

  // Vocabulary Errors
  {
    id: "vocab-1",
    name: "Wrong Word Choice",
    sentence: "I am very boring in this class.",
    expectedErrors: ["Vocabulary"],
    level: "A2",
    description: 'Should be "bored" not "boring"',
  },
  {
    id: "vocab-2",
    name: "Inappropriate Word",
    sentence: "I did my homework but I got a terrible mark.",
    expectedErrors: ["Vocabulary"],
    level: "B1",
    description:
      "Context-appropriate word usage (actually this might be correct)",
  },
  {
    id: "vocab-3",
    name: "Word Confusion",
    sentence: "Their going to they are house to get there books.",
    expectedErrors: ["Vocabulary/Spelling"],
    level: "A2",
    description: "Confusing their/there/they're",
  },

  // Idiom Errors
  {
    id: "idiom-1",
    name: "Unnatural Phrasing",
    sentence: "I am making my homework now.",
    expectedErrors: ["Idiom"],
    level: "A2",
    description: 'Should be "doing" not "making"',
  },
  {
    id: "idiom-2",
    name: "Literal Translation",
    sentence: "It gives me cold when I think about it.",
    expectedErrors: ["Idiom"],
    level: "B1",
    description: "Non-English idiom literally translated",
  },

  // Punctuation Errors
  {
    id: "punct-1",
    name: "Missing Comma",
    sentence: "Before I go to sleep I always read a book.",
    expectedErrors: ["Punctuation"],
    level: "B1",
    description: "Missing comma after introductory phrase",
  },
  {
    id: "punct-2",
    name: "Run-on Sentence",
    sentence: "I like pizza I eat it every day.",
    expectedErrors: ["Punctuation"],
    level: "B1",
    description: "Two independent clauses need punctuation",
  },

  // Mixed Errors
  {
    id: "mixed-1",
    name: "Multiple Error Types",
    sentence: "Yesterday I go to the store and buy a apple.",
    expectedErrors: ["Tense", "Article"],
    level: "A2",
    description: "Past tense and article errors",
  },
  {
    id: "mixed-2",
    name: "Complex Mixed Errors",
    sentence:
      "She dont like to makes her homework because its very boring for her.",
    expectedErrors: ["Grammar", "Vocabulary", "Punctuation"],
    level: "B1",
    description: "Subject-verb, verb form, and apostrophe errors",
  },

  // Correct Sentences (Should show ✓)
  {
    id: "correct-1",
    name: "Correct Simple Sentence",
    sentence: "I like to read books in my free time.",
    expectedErrors: [],
    level: "A2",
    description: "Should return no errors",
  },
  {
    id: "correct-2",
    name: "Correct Complex Sentence",
    sentence:
      "Although it was raining, we decided to go for a walk because we needed fresh air.",
    expectedErrors: [],
    level: "B2",
    description: "Should return no errors",
  },
  {
    id: "correct-3",
    name: "Correct Advanced Sentence",
    sentence:
      "Having considered all the available options, I believe this is the most appropriate course of action.",
    expectedErrors: [],
    level: "C1",
    description: "Should return no errors",
  },
];

export default function GrammarTestClient() {
  const [customInput, setCustomInput] = useState("");
  const [customLevel, setCustomLevel] = useState("B1");
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runTest = async (testCase: TestCase) => {
    setIsLoading(true);
    setTestResult(null);

    try {
      // Call API route instead of direct AI service
      const response = await fetch("/api/test/grammar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sentence: testCase.sentence,
          level: testCase.level,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze grammar");
      }

      const result = await response.json();

      const testResult: TestResult = {
        testCase,
        hasIssues: result.hasIssues,
        issues: result.issues as GrammarIssue[],
        overallFeedback: result.overallFeedback,
        timestamp: new Date(),
      };

      setTestResult(testResult);

      if (result.hasIssues) {
        toast.success(`Found ${result.issues.length} issue(s)`, {
          description: "Grammar analysis complete",
        });
      } else {
        toast.success("No errors detected", {
          description: "Sentence is grammatically correct",
        });
      }
    } catch (error) {
      console.error("Grammar check error:", error);
      toast.error("Failed to check grammar", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runCustomTest = async () => {
    if (!customInput.trim()) {
      toast.error("Please enter a sentence to test");
      return;
    }

    const customTestCase: TestCase = {
      id: "custom",
      name: "Custom Input",
      sentence: customInput,
      expectedErrors: [],
      level: customLevel,
      description: "User-provided test sentence",
    };

    await runTest(customTestCase);
  };

  const getResultBadge = () => {
    if (!testResult) return null;

    const { testCase, hasIssues } = testResult;
    const expectedToHaveErrors = testCase.expectedErrors.length > 0;

    if (expectedToHaveErrors && hasIssues) {
      return (
        <Badge variant="default" className="bg-green-600">
          <CheckCircle2 className="size-3 mr-1" />
          Detected Correctly
        </Badge>
      );
    } else if (!expectedToHaveErrors && !hasIssues) {
      return (
        <Badge variant="default" className="bg-green-600">
          <CheckCircle2 className="size-3 mr-1" />
          Correct (No Errors)
        </Badge>
      );
    } else if (expectedToHaveErrors && !hasIssues) {
      return (
        <Badge variant="destructive">
          <XCircle className="size-3 mr-1" />
          Missed Errors
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary">
          <XCircle className="size-3 mr-1" />
          False Positive
        </Badge>
      );
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-7xl space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-primary">
          Grammar Testing Tool
        </h1>
        <p className="text-muted-foreground">
          Development tool to test and validate AI grammar correction system
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Test Cases */}
        <div className="space-y-6">
          {/* Custom Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="size-5" />
                Custom Test
              </CardTitle>
              <CardDescription>Enter your own sentence to test</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Test Sentence</label>
                <Textarea
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Enter a sentence to test for grammar errors..."
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">Student Level</label>
                  <select
                    value={customLevel}
                    onChange={(e) => setCustomLevel(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="A1">A1 (Beginner)</option>
                    <option value="A2">A2 (Elementary)</option>
                    <option value="B1">B1 (Intermediate)</option>
                    <option value="B2">B2 (Upper Intermediate)</option>
                    <option value="C1">C1 (Advanced)</option>
                    <option value="C2">C2 (Proficient)</option>
                  </select>
                </div>
                <Button
                  onClick={runCustomTest}
                  disabled={isLoading || !customInput.trim()}
                  className="mt-6"
                >
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="size-4 mr-2" />
                      Test
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Predefined Test Cases */}
          <Card>
            <CardHeader>
              <CardTitle>Predefined Test Cases</CardTitle>
              <CardDescription>
                Click any test to run grammar analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                {TEST_CASES.map((testCase) => (
                  <button
                    key={testCase.id}
                    onClick={() => runTest(testCase)}
                    disabled={isLoading}
                    className="w-full text-left p-3 rounded-lg border hover:bg-secondary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm mb-1">
                          {testCase.name}
                        </div>
                        <div className="text-sm text-muted-foreground italic mb-1">
                          "{testCase.sentence}"
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {testCase.description}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 items-end shrink-0">
                        {testCase.level && (
                          <Badge variant="outline" className="text-xs">
                            {testCase.level}
                          </Badge>
                        )}
                        {testCase.expectedErrors.length > 0 ? (
                          <Badge variant="secondary" className="text-xs">
                            {testCase.expectedErrors.length} error(s)
                          </Badge>
                        ) : (
                          <Badge
                            variant="default"
                            className="text-xs bg-green-600"
                          >
                            Correct
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Results */}
        <div className="space-y-6">
          {isLoading && (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Analyzing grammar...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {!isLoading && testResult && (
            <>
              {/* Test Info */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle>{testResult.testCase.name}</CardTitle>
                      <CardDescription>
                        {testResult.testCase.description}
                      </CardDescription>
                    </div>
                    {getResultBadge()}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Original Sentence
                    </label>
                    <p className="text-base mt-1 p-3 bg-secondary/30 rounded-md">
                      {testResult.testCase.sentence}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Level
                      </label>
                      <Badge variant="outline" className="mt-1">
                        {testResult.testCase.level || "Not specified"}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Issues Found
                      </label>
                      <div className="mt-1">
                        <Badge
                          variant={
                            testResult.hasIssues ? "destructive" : "default"
                          }
                        >
                          {testResult.issues.length} issue(s)
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {testResult.testCase.expectedErrors.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Expected Errors
                      </label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {testResult.testCase.expectedErrors.map(
                          (error, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs"
                            >
                              {error}
                            </Badge>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Grammar Analysis Results */}
              <Card>
                <CardHeader>
                  <CardTitle>Grammar Analysis</CardTitle>
                  <CardDescription>
                    {testResult.hasIssues
                      ? `AI detected ${testResult.issues.length} issue(s)`
                      : "No grammar issues detected"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {testResult.hasIssues ? (
                    <div className="space-y-4">


                      {/* Using CorrectionMessage Component */}
                      <CorrectionMessage
                        content={
                          testResult.overallFeedback ||
                          "Grammar corrections found"
                        }
                        grammarIssues={testResult.issues}
                        severity={
                          testResult.issues.some((i) => i.severity === "major")
                            ? "major"
                            : testResult.issues.some(
                              (i) => i.severity === "moderate",
                            )
                              ? "moderate"
                              : "minor"
                        }
                        showDetails={true}
                      />

                      {/* Raw JSON Data */}
                      <details className="mt-4">
                        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                          View Raw JSON Data
                        </summary>
                        <pre className="mt-2 p-3 bg-secondary/30 rounded-md text-xs overflow-x-auto">
                          {JSON.stringify(
                            {
                              hasIssues: testResult.hasIssues,
                              issues: testResult.issues,
                              overallFeedback: testResult.overallFeedback,
                            },
                            null,
                            2,
                          )}
                        </pre>
                      </details>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center space-y-2">
                        <CheckCircle2 className="size-12 text-green-600 mx-auto" />
                        <p className="font-medium text-green-600">Perfect!</p>
                        <p className="text-sm text-muted-foreground">
                          No grammar issues detected
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {!isLoading && !testResult && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center space-y-2">
                  <TestTube className="size-12 text-muted-foreground mx-auto opacity-20" />
                  <p className="text-sm text-muted-foreground">
                    Select a test case or enter custom input to begin
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
