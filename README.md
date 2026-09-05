This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

## Environment Variables

Ensure the following variables are configured in your `.env` file based on `.env.example`. **Never expose actual secrets in source control.**

```text
# AI Agent (server-only)
LLM_PROVIDER=openai          # openai | groq
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
# GROQ_API_KEY=              # set LLM_PROVIDER=groq to use Groq (OpenAI-compatible, free tier)
# GROQ_MODEL=openai/gpt-oss-120b
CAMPUS_TIMEZONE=Asia/Dhaka   # resolves "today" / "tomorrow" for the campus

# Supabase (server-side; never exposed to the browser except NEXT_PUBLIC_*)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PORT=3000
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Testing

```bash
npm test           # vitest unit tests (AI agent loop, datetime)
npm run ai:smoke   # live LLM smoke test — requires an API key in .env
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
