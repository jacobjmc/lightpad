import { notesIndex } from "@/lib/db/pinecone";
import prisma from "@/lib/db/prisma";
import { getEmbedding } from "@/lib/openai";
import { auth } from "@clerk/nextjs";
import { ChatCompletionMessage } from "openai/resources/index.mjs";
import { CoreMessage, generateText, streamText } from "ai";
import { Note } from "@prisma/client";
import { checkApiLimit, increaseApiLimit } from "@/lib/api-limit";
import { NextResponse } from "next/server";
import { checkSubscription } from "@/lib/subscription";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { match } from "ts-pattern";
import { revalidatePath } from "next/cache";

export const POST = async (req: Request) => {
  try {
    const body = await req.json();
    const { prompt, option, command, path } = body;

    const { userId } = auth();

    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const freeTrial = await checkApiLimit();
    const isPro = await checkSubscription();

    if (!freeTrial && !isPro) {
      return new NextResponse("Free trial has expired.", { status: 403 });
    }

    if (
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      const ip = req.headers.get("x-forwarded-for");
      const ratelimit = new Ratelimit({
        redis: redis,
        limiter: Ratelimit.slidingWindow(20, "1 d"),
      });

      const { success, limit, reset, remaining } = await ratelimit.limit(
        `lightpad_chat_ratelimit_${ip}`,
      );

      if (!success) {
        return new Response(
          "You have reached your request limit for the day.",
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": limit.toString(),
              "X-RateLimit-Remaining": remaining.toString(),
              "X-RateLimit-Reset": reset.toString(),
            },
          },
        );
      }
    }

    const systemPrompt =
      "Respond directly to all human messages without unnecessary affirmations or filler phrases like “Certainly!”, “Of course!”, “Absolutely!”, “Great!”, “Sure!”, etc.";

    const messages = match(option)
      .with("continue", () => [
        {
          role: "system",
          content:
            "You are an AI writing assistant that continues existing text based on context from prior text. " +
            "Give more weight/priority to the later characters than the beginning ones. " +
            "Limit your response to no more than 200 characters, but make sure to construct complete sentences." +
            "Use Markdown formatting when appropriate." +
            systemPrompt,
        },
        {
          role: "user",
          content: prompt,
        },
      ])
      .with("improve", () => [
        {
          role: "system",
          content:
            "You are an AI writing assistant that improves existing text. " +
            "Limit your response to no more than 200 characters, but make sure to construct complete sentences." +
            "Use Markdown formatting when appropriate." +
            systemPrompt,
        },
        {
          role: "user",
          content: `The existing text is: ${prompt}`,
        },
      ])
      .with("shorter", () => [
        {
          role: "system",
          content:
            "You are an AI writing assistant that shortens existing text. " +
            "Use Markdown formatting when appropriate." +
            systemPrompt,
        },
        {
          role: "user",
          content: `The existing text is: ${prompt}`,
        },
      ])
      .with("longer", () => [
        {
          role: "system",
          content:
            "You are an AI writing assistant that lengthens existing text. " +
            "Use Markdown formatting when appropriate." +
            systemPrompt,
        },
        {
          role: "user",
          content: `The existing text is: ${prompt}`,
        },
      ])
      .with("fix", () => [
        {
          role: "system",
          content:
            "You are an AI writing assistant that fixes grammar and spelling errors in existing text. " +
            "Limit your response to no more than 200 characters, but make sure to construct complete sentences." +
            "Use Markdown formatting when appropriate." +
            systemPrompt,
        },
        {
          role: "user",
          content: `The existing text is: ${prompt}`,
        },
      ])
      .with("zap", () => [
        {
          role: "system",
          content:
            "You area an AI writing assistant that generates text based on a prompt. " +
            "You take an input from the user and a command for manipulating the text" +
            "Use Markdown formatting when appropriate." +
            systemPrompt,
        },
        {
          role: "user",
          content: `For this text: ${prompt}. You have to respect the command: ${command}`,
        },
      ])
      .run() as CoreMessage[];

    const result = await streamText({
      model: openai("gpt-4o-mini"),
      messages: messages,
      temperature: 0.7,
      frequencyPenalty: 0,
      presencePenalty: 0,
    });

    if (!isPro) {
      await increaseApiLimit();
    }

    revalidatePath("/notes");

    return result.toDataStreamResponse();
  } catch (error) {
    console.log(error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
};
