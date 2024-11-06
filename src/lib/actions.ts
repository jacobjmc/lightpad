"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "./db/prisma";
import { notesIndex } from "./db/pinecone";
import { Message } from "ai";
import { getEmbedding } from "./openai";

export const addAssistantMessage = async (
  message: string,
  messages: string,
) => {
  try {
    const { userId } = auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const parsedMessage: Message = JSON.parse(message);

    const chunks = parsedMessage.content.split("\n");
    const titleChunk = chunks[0];

    // get the most recent user message to add to the metadata
    const recentUserMessage = await prisma.message.findFirst({
      where: {
        role: "user",
        userId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        content: true,
      },
    });

    console.log(recentUserMessage);

    const title = titleChunk.replace("Title: ", "");

    // get chunks[3] onwards
    const content = chunks.slice(3).join("\n");

    // TODO: Ability for user to add message as a new post

    const embedding = await getEmbeddingForMessages(messages);

    // const metadataText =
    //   "\n" + "role: " + "assistant" + "\n" + title + "\n\n" + content ?? "";

    await prisma.$transaction(async (tx) => {
      await tx.message.create({
        data: {
          content: parsedMessage?.content,
          role: "assistant",
          userId: userId,
        },
      });

      await notesIndex.upsert([
        {
          id: userId,
          values: embedding,
          metadata: {
            userId,
            text: `"role": "user, " ${recentUserMessage?.content} ${messages}`,
          },
        },
      ]);
    });
  } catch (error) {
    console.error("Error adding assistant message: ", error);
    return error;
  }
};

async function getEmbeddingForMessages(messages: string) {
  return getEmbedding(messages);
}
