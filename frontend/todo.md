
- on dashboard, profile section button is saying edit profile. then in profile page there is edit profile button again. we can change the dashboard one to "settings"
- in the onboarding we are asking why user is going to use the tool what they want to improve. we need to bring that to profile page as well, they should be able to edit those purposes.
- First message in solo practice from ai is missing. When solo chat is iniciated ai should start the conversation.
- Solo practice is not showing the error. I have done obvious mistakes and it didn't say anything. AI needs to check every message from user and give feedback. when the sentence is correct in everyway it should add a check mark next to the user message. 
 - - here is a list of error types, based on student level ai should be checking. 
1. Grammar Errors

These relate to sentence structure and grammatical rules.

Tense — “Yesterday I go to school” → “Yesterday I went to school.”

Subject-verb agreement — “He go home” → “He goes home.”

Articles — “I have cat” → “I have a cat.”

Prepositions — “I’m good in English” → “I’m good at English.”

Word order — “Always I eat breakfast” → “I always eat breakfast.”

Plural/singular forms — “Two cat” → “Two cats.”

Comparatives/superlatives — “more better” → “better.”

2. Pronunciation & Phonetic Errors

These occur in spoken learning scenarios.

Mispronouncing sounds (“ship” vs. “sheep”)

Incorrect stress or intonation patterns

Dropping or adding syllables

Accent-based confusion affecting clarity

3. Word Choice (Lexical) Errors

Errors in choosing the correct or natural word.

Wrong word meaning — “I did a photo” → “I took a photo.”

False friends (similar-looking but different meaning) — e.g., “actual” vs. “current.”

Collocation — “make a homework” → “do homework.”

Register/tone mismatch — “What’s up, professor?” in formal context.

4. Semantic (Meaning) Errors

When the grammar is correct but meaning is off or confusing.

Ambiguous or illogical sentences: “I am hungry to sleep.”

Misused idioms or figurative expressions.

Context mismatch: “I wear my homework.”

5. Spelling and Typographical Errors

Especially in written practice.

Misspelling common words (“definately” → “definitely”).

Typo errors (“hte” → “the”).

Inconsistent capitalization or punctuation.

6. Pragmatic / Sociolinguistic Errors

When the sentence is grammatically correct but socially inappropriate or unnatural.

Overly direct or impolite phrasing (“Give me salt” → “Could you pass the salt, please?”).

Wrong level of formality (informal greeting in a business email).

Cultural nuance issues (e.g., sarcasm or idioms misused).

7. Syntax vs. Morphology Distinction

Syntax: word arrangement in sentences.

Morphology: structure of words themselves (prefixes/suffixes, conjugations).
E.g., “He go” is morphology error (verb form), “He quickly runs home” → “He runs quickly home” is syntax.

8. Fluency / Style Issues

Not strictly errors, but quality improvements.

Repetition or redundancy.

Overly complex or robotic phrasing.

Unnatural rhythm or phrasing (important for conversational correction).

9. Translation-Based Errors (L1 interference)

When learner’s native language structure interferes.
E.g., Turkish learners might say:

“I to school go every day.” (word order interference)

“I have 25 age.” (direct translation from “25 yaşındayım”).

10. Comprehension or Response Errors

Occur in conversation, not just sentence construction.

Misunderstanding question type (“How long?” → “Two kilometers.”)

Giving unrelated or incomplete responses.

-------------
- solo practice doesn't have the finish chat ( generate report ) button. When user end the conversation then it should be moved to archive and it should have a report attached to it. 
- Please check the db we have tables we don't use anymore. Messages, Feedbacklog, Conversation Analytics and conversation_summaries. not sure do we need them. can we make sure tables are used consistently in the application. 
- when voice chat is paused and user goes back, conversation gets in to archive folder.
- when user likes the person in the match selection, they get browser Alert prompt, we should show them a toast from shadcn. component is already added
- Peer conversation and solo chat grammer correction components are different, they should be using the same component. Solo chat has the right component /components/chat/CorrectionMessage
- when user signs out it takes back to login page but login doesn't load properly, give 405
- in the onboarding upload avatar icon is only clickable, but actually whole thing should be clickable. Create a component for it and use it in profile edit page.