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

const POSTS_SAMPLE = [
  {
    title: "A Day of Learning and Creativity",
    content: `Today was a day filled with engaging activities and creative play. During the morning group time, the children were introduced to calendar blocks, helping them understand the concept of days of the week.

The children eagerly assisted in setting up the home corner, showcasing their teamwork and responsibility.

Before lunch group time, the children explored the idea of packing lists for holidays, discussing the essential items needed in a suitcase and the importance of being prepared when going on a trip.  The children were guided in setting up the dollhouse, encouraging their imagination and role-playing skills.

In a delightful painting activity, the children worked together to paint suitcases in their favourite colours, adding a personal touch to their creative designs.

Outdoors, the children had a blast using different types of crayons to draw on the floor, unleashing their artistic flair in the open space. They also enjoyed a sensory experience by cooking in the sandpit, engaging in imaginative play and sensory exploration.

It was a day of learning, collaboration, and creative expression, where children's imaginations and skills were nurtured in a supportive and stimulating environment.`,
  },
  {
    title: "A Day of Exploration and Imagination",
    content: `Today the children engaged in a special activity where they decorated suitcases by sticking pictures of different places and cities on them, encouraging imagination and cultural exploration.

During morning group time, we had a lovely discussion about the children's weekends, hearing about their weekend adventures and experiences. We also went through our daily routine, setting the tone for a fun day of learning and play.

Before lunch group time, the children engaged in a meaningful conversation about respecting each other's personal space, discussing the importance of keeping a friend's bubble in mind. We also reviewed the Kingfisher room rules, reinforcing positive behaviour and mutual respect.

Throughout the day, the children enjoyed solving puzzles, diving into captivating books, and building with blocks, fostering cognitive skills, literacy, and creativity. It was a day of connection, learning, and joyful moments shared among children and educators.`,
  },
  {
    title: "A Day of Fun and Movement",
    content: `Today was all about fun and movement! Our fantastic sports teacher led us in an exciting obstacle course with hurdles and racquet games, helping the children develop their coordination and motor skills.

Outside, we also explored our creative side by building shapes with natural materials and expressing ourselves through vibrant colors on the pavement.

Back inside, we enjoyed a quiet time reading stories and building impressive structures with blocks. It was a day filled with laughter, learning, and exploring new skills!`,
  },
  {
    title: "A Day of Laughter and Learning",
    content: `We had a wonderful day filled with laughter and learning! Our new room leader introduced herself during group time by reading a captivating story that had everyone engaged. Then, we got our groove on with some fun dancing to shake out our sillies!

Indoors, little hands got busy exploring natural materials, creating unique patterns and textures. The mini bricks also came out, and soon impressive towers and castles filled the room.

Outside, we soaked up the sunshine while riding bikes and building amazing sandcastles fit for royalty. What a fantastic day of play and imagination!`,
  },
];

const SHOWANDTELL_SAMPLE = [
  {
    title: "Letter of the Week: A Show and Tell Adventure",
    content: `This week, we are exploring the exciting world of the letter M, and the children's contributions made for a vibrant and engaging day filled with curiosity and creativity.

Alaska shared a coin, which led to fascinating discussions about money, its value, and how we use it in our daily lives. The children enjoyed sharing their experiences with coins and what they can buy.

Alex introduced a Minion toy, leading to laughter and conversations about these beloved characters from the movies. The children shared their favourite moments from the films, igniting their imaginations and enthusiasm.

Ayla shared a mandarin, promoting healthy eating discussions. The children were excited to talk about their favourite fruits and snacks, and they even enjoyed a sensory experience with the mandarin's bright colour and fragrant scent.

Jessica captivated everyone with her face mask, encouraging conversations about self-care and how we can take care of our skin. The children eagerly talked about their own experiences with masks, making it a fun and informative topic.

Leonidas brought in his monstrous monster truck, which thrilled the group. This prompted discussions about how trucks work, their features, and the adventures that come with such powerful vehicles.

Freddie shared a meerkat toy, leading to interesting conversations about this fascinating animal and its habitats. The children were eager to learn more about meerkats and share fun facts they knew.

Thanasi introduced a magnet, which intrigued everyone as they explored its mysterious properties. The children took turns testing what objects were magnetic, showing their scientific curiosity.

Harriet added to show and tell with her monkey toy, prompting lively discussions about our furry friends and their playful nature.

Through this delightful journey with the letter M, the children expanded their vocabulary while encouraging creativity, collaboration, and a love for learning.`,
  },
  {
    title: `Exploring the Letter J`,
    content: `This week, the focus on the letter J brought wonderful contributions from the children, enriching their learning experience through sharing and discovery.

Thanasi captivated everyone by sharing pictures of his family, highlighting the love and connection they share. He mentioned that his mum’s name is Jessica, which helped the children link familiar names to the letter J, fostering a sense of belonging and understanding of family.

Ryan showcased his jaw-shaped truck, prompting discussions about vehicle shapes and their uses, enhancing the children's understanding of transportation and engineering concepts.

Freddie introduced us to the world of jobs with his collection of Paw Patrol characters, each representing a different profession. This encouraged talks about various careers and the importance of teamwork, imagination, and helping others in our community.

Ava G surprised everyone with her jaw-shaped clip, encouraging discussions about practical items and their functions, as well as how items can share similarities in shape and purpose.

Alex enriched the exploration with his presentation on the job of a painter, inspiring creative conversations about art and the skills involved in this profession. The children were excited to discuss their own experiences with painting and creativity.

Hannah introduced a jellyfish book, leading to captivating discussions about marine life and the beauty of nature. The story showed the children’s curiosity about underwater worlds.

Ariana delighted the group by sharing a picture of the jacky winter bird, which opened up conversations about wildlife and the different species found in nature.

Through these diverse and engaging activities centred around the letter J, the children expanded their vocabulary, enriched their understanding of various topics, and nurtured their creativity and connections with one another.`,
  },
];

const EXCLUDED_PHRASES = [
  "sparking",
  "spark",
  "sparked",
  "at our childcare centre",
  "we ended the day with",
  "x wrapped up the day",
  "array of",
  "dive into",
  "diving into",
  "dove into",
  "glimpse into",
  "magical",
  "world of",
];

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

    if (relevantNotes.length === 0) {
      relevantNotes = POSTS_SAMPLE;
    }

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
      `<Instructions>You are an early childhood educator in Melbourne Australia. You are responsible for writing daily posts aimed at parents that detail the childrens' day at the childcare centre. The user will give you information that you will use to write a daily post. You will only include the activities that the user provides you in your response. You will only include the children that the user provides you in an individual message. Your responses will use Australian English/spelling. Do NOT say "at our childcare centre".  Do NOT include a sign-off at the end. ONLY refer to the children as children, NOT "kids" or "little adventurers" or anything else. Do NOT use the same repetitive phrases over and over. Do NOT include 'we ended the day with' or 'x wrapped up the day' or 'lastly' or 'last but not least' or 'finally' or anything similar as you do not know the order of events unless the user tells you explicitly.  Your responses should include a Title and Content.` +
      "Examples of past posts you can use to learn to improve your responses are the following:\n" +
      relevantNotes
        .map((note) => `Title: ${note.title}\n\nContent:\n${note.content}`)
        .join("\n\n") +
      "\n\n" +
      "If the message is in the following form: Name - item, Name - item etc. then make sure to include all children's names and the post will be a 'Letter of the week' show and tell post unless instructed otherwise. Do NOT put the letters in quotation marks. For show and tell/letter of the week posts, you can use the following examples to help you:\n" +
      SHOWANDTELL_SAMPLE.map(
        (note) => `Title: ${note.title}\n\nContent:\n${note.content}`,
      ).join("\n\n") +
      "</Instructions>";

    // Get the response from Claude HAIKU model
    const response = await generateText({
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

    console.log(response);

    const claudeResponseText = response.text;

    // Use GPT-4o-mini to replace the excluded phrases
    const gptResult = await streamText({
      model: openai("gpt-4o-mini"),
      prompt: `Replace the following excluded words and phrases in the content <excluded>${EXCLUDED_PHRASES}</excluded>. Also, remove any indication or reference to the order that the events occured in. content: ${claudeResponseText}`,
      maxTokens: 2000,
    });

    // const stream = OpenAIStream(response);

    return gptResult.toDataStreamResponse();
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
