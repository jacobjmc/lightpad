# LightPad 📝✨

LightPad is a modern AI-powered note-taking application built with Next.js that combines traditional note-taking with artificial intelligence to enhance your writing and organization experience.

## Features

- **AI-Enhanced Writing**: Use the AI-enhanced editor to improve your writing
- **Smart Note Organization**: Efficiently manage and organize your notes
- **Real-time Chat Interface**: Interact with AI to get answers from your notes
- **Rich Text Editor**: Full-featured editor with formatting options and slash commands
- **Dark/Light Mode**
- **Authentication**: Secure user authentication with Clerk
- **Subscription System**: Premium features with Stripe integration

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Prisma, Pinecone
- **AI Integration**: OpenAI
- **Authentication**: Clerk
- **Payments**: Stripe
- **UI Components**: Custom components and shadcn/ui

## Project Structure

```
lightpad/
├── src/
│   ├── app/           # Next.js app router and pages
│   ├── components/    # React components
│   │   ├── editor/    # Rich text editor components
│   │   └── ui/        # Reusable UI components
│   ├── hooks/         # Custom React hooks
│   └── lib/          # Utility functions and configurations
```

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```
   OPENAI_API_KEY=
   DATABASE_URL=
   STRIPE_SECRET_KEY=
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## License

[MIT License](LICENSE)
