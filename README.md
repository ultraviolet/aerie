## Inspiration
In many CS courses, we found ourselves with a ton of notes but still feeling unprepared because of a lack of practice. Your LLM of choice can generate a couple of janky multiple-choice questions, but that's not enough to get ready for a real test.

So we built a platform that not only transforms your notes into practice, but also remembers what you've learned. Like a personal tutor who sees exactly where you’re struggling, `aerie` works with you to target your weak spots over time.

## What it does
**Works from your study materials:**
Upload your course materials like syllabi, lecture notes, etc. -> `aerie` generates practice questions grounded in what you’ve actually been taught

**Remembers:**
As you practice, `aerie` builds a living memory of your strengths and weaknesses, using that to surface insights and guide learning. Over time, it will update your materials to reflect your current level.

**Supports:**
An AI conversational tutor is embedded into each question, helping you understand your mistakes in real time by generating diagrams, providing detailed explanations, and walking you through examples.

The result? **Unlimited, tailored practice**. Want to create a practice test focusing on your calculated weaknesses? Got it. Would you like to prioritize a topic from your notes in the study set? Done. And once you’ve chatted with `aerie` about what you got wrong, just keep working through variants by clicking on the _“generate similar question”_ button until you’re confident.

## How we built it
**Frontend:**
- React + TypeScript
- Tailwind CSS + shadcn/ui for styling

**Backend:**
- Python + FastAPI
- SQLAlchemy

**AI:**
- Google Gemini for question generation, tutoring, and learning insights
- Supermemory for document/user RAG and building personal student learning profiles

## Challenges we ran into
- Building a learning profile that's useful (not just "you answered 3 questions")
  - **Solution:** careful integration with Supermemory's graph memory and Gemini for insight extraction. 
- Dealing with changing content within the question component via dynamic wrapping was a repetitive flexbox struggle.
  - **Solution:** careful application of `min-w-0`, `break-words`, and `overflow-hidden` to wrapper containers

## Accomplishments we're proud of
- Creating a complex and effective multistep pipeline from documents and user input to frontend-displayed questions. 
  - We transform a prompt using Gemini’s NLP into **targeted semantic queries** for Supermemory to reference the most relevant user skills and notes. We then ask Gemini to brainstorm the best question types for the material and generate the full question with a preloaded answer and explanation for our frontend to display.
- Crafting a cohesive user experience in a short amount of time with a refined UI, consistently themed visuals, and some fleshed-out animations.
- Supporting many question types: multiple choice, checkbox, true/false, coding, fill-in-the-blank, matching, and drag-and-drop ordering.

## What we learned
- Supermemory's persistent memory and knowledge graphs are extremely powerful for education. By allowing us to build a profile of each student’s skills that evolves over time, each generated question becomes more useful than the last.
- Scrollbar formatting just sucks in webdev. Especially if you want global scroll.

## What's next for aerie
- _Spaced repetition:_ Resurface questions or topics you struggled with at optimal intervals as “needing review.”
- _More question types:_ Diagram labeling, proof construction, FRQs with autograding
- _Mobile support:_ Take your AI tutor with you wherever you go
---
### AI Disclosure
- Used Claude Code for skeleton and AI functionality development
- Used Gemini to assist with frontend UI work and refine quizzes
