/**
 * Grammar Testing Page
 *
 * Purpose: Development tool for testing AI grammar correction system
 * Server component that renders the testing interface
 *
 * Features:
 * - Comprehensive test suite with predefined cases
 * - Custom input testing
 * - Real-time AI grammar analysis
 * - Visual feedback with CorrectionMessage component
 *
 * Usage: /test/grammar (development only)
 */

import GrammarTestClient from "./sections/grammar-test-client";

export const metadata = {
  title: "Grammar Testing Tool - EduMatch",
  description:
    "Development tool to test and validate AI grammar correction system",
};

export default function GrammarTestPage() {
  return <GrammarTestClient />;
}
