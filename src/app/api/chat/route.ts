import { notesIndex } from "@/lib/db/pinecone";
import prisma from "@/lib/db/prisma";
import { getEmbedding } from "@/lib/openai";
import { auth } from "@clerk/nextjs";
import { ChatCompletionMessage } from "openai/resources/index.mjs";
import { generateText, streamText } from "ai";
import { Note } from "@prisma/client";
import { checkApiLimit, increaseApiLimit } from "@/lib/api-limit";
import { NextResponse } from "next/server";
import { checkSubscription } from "@/lib/subscription";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const POST = async (req: Request) => {
  try {
    const body = await req.json();
    const messages: any = body.messages;

    const { userId } = auth();

    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!messages[messages.length - 1].content) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
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
        limiter: Ratelimit.slidingWindow(40, "1 d"),
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

    const messageContent = messages[messages.length - 1].content as string;

    const messagesTruncated = messages.slice(-6);

    console.log(messagesTruncated);

    const embedding = await getEmbedding(
      messagesTruncated.map((message: any) => message.content).join("\n"),
    );

    const vectorQueryResponse = await notesIndex.query({
      vector: embedding,
      topK: 20,
      filter: { userId },
    });

    type SampleNotes = Note | Pick<Note, "title" | "content">;

    let relevantNotes: SampleNotes[] = await prisma.note.findMany({
      where: {
        id: { in: vectorQueryResponse.matches.map((match) => match.id) },
      },
    });

    const updateUserMessages = await prisma.message.create({
      data: {
        content: messageContent,
        role: "user",
        userId: userId,
      },
    });

    if (!updateUserMessages) {
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }

    // console.log("Relevant notes found: ", relevantNotes);

    const systemMessage =
      `<Instructions>You are an intelligent note-taking app. You answer the user's question based on their existing notes` +
      "The relevant notes for this query are:\n" +
      relevantNotes
        .map((note) => `Title: ${note.title}\n\nContent:\n${note.content}`)
        .join("\n\n") +
      "\n\n" +
      "</Instructions>";

    // Get the response from Claude HAIKU model
    const claudeResponse = await streamText({
      model: anthropic("claude-3-haiku-20240307"),
      system: systemMessage,
      messages: [...messagesTruncated],
      temperature: 1,
      frequencyPenalty: 0.7,
      maxTokens: 2000,
    });

    if (!isPro) {
      await increaseApiLimit();
    }

    return claudeResponse.toDataStreamResponse();
  } catch (error) {
    console.log(error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
};

export const DELETE = async (req: Request) => {
  try {
    const { userId } = auth();

    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const messages = await prisma.$transaction(async (tx) => {
      await tx.message.deleteMany({ where: { userId } });
      await notesIndex.deleteOne(userId);
    });

    return Response.json({ messages });
  } catch (error) {
    console.error("[DELETE MESSAGES]", error);
    return Response.json({ error: "Internal Error" }, { status: 500 });
  }
};

export const PUT = async (req: Request) => {
  try {
    const { userId } = auth();

    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, content } = body;

    const message = await prisma.message.update({
      where: {
        id,
      },
      data: {
        content,
      },
    });

    return Response.json({ message });
  } catch (error) {
    console.error("[PUT MESSAGES]", error);
    return Response.json({ error: "Internal Error" }, { status: 500 });
  }
};
