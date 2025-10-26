/**
 * Shared Constants for Onboarding and Practice
 *
 * Single source of truth for:
 * - Topics/Interests (with emojis for consistent display)
 * - Language proficiency levels (CEFR standard)
 * - Learning goals
 */

// Topics and Interests (used in both onboarding and practice selection)
export const TOPICS_AND_INTERESTS = [
  '🎬 Movies & TV',
  '🎮 Gaming',
  '📚 Books & Reading',
  '🎵 Music',
  '⚽ Sports',
  '✈️ Travel',
  '🍳 Cooking',
  '🎨 Art',
  '💻 Technology',
  '🔬 Science',
  '📱 Social Media',
  '🏋️ Fitness',
  '🐕 Animals',
  '🌱 Nature',
  '🎭 Theater',
  '📸 Photography',
] as const;

// Additional practice topics (not in default interests)
export const ADDITIONAL_PRACTICE_TOPICS = [
  '🌍 Daily Life & Routines',
  '🎯 Future Plans & Dreams',
  '💼 Career & Work',
  '🏫 Education & Learning',
] as const;

// Combined list of all available practice topics
export const ALL_PRACTICE_TOPICS = [
  ...TOPICS_AND_INTERESTS,
  ...ADDITIONAL_PRACTICE_TOPICS,
] as const;

// Language proficiency levels (CEFR standard)
export const LANGUAGE_LEVELS = [
  {
    value: 'A1',
    label: 'A1',
    description: 'Beginner - I can understand and use basic phrases',
  },
  {
    value: 'A2',
    label: 'A2',
    description: 'Elementary - I can communicate in simple tasks',
  },
  {
    value: 'B1',
    label: 'B1',
    description: 'Intermediate - I can handle most daily situations',
  },
  {
    value: 'B2',
    label: 'B2',
    description: 'Upper Intermediate - I can express myself fluently',
  },
  {
    value: 'C1',
    label: 'C1',
    description: 'Advanced - I can use language flexibly',
  },
  {
    value: 'C2',
    label: 'C2',
    description: 'Proficient - I have mastery of the language',
  },
] as const;

// Learning goals for students
export const LEARNING_GOALS = [
  'Improve conversational fluency',
  'Prepare for exams (TOEFL, IELTS, etc.)',
  'Practice for job interviews',
  'Learn business English',
  'Improve pronunciation',
  'Expand vocabulary',
  'Practice grammar',
  'Make international friends',
  'Travel preparation',
  'Academic writing',
  'Casual conversation practice',
  'Professional development',
] as const;

// Type exports for TypeScript
export type Topic = typeof ALL_PRACTICE_TOPICS[number];
export type Interest = typeof TOPICS_AND_INTERESTS[number];
export type LanguageLevel = typeof LANGUAGE_LEVELS[number]['value'];
export type LearningGoal = typeof LEARNING_GOALS[number];
