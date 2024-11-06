import prisma from "@/lib/db/prisma";
import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";

export const GET = async (req: Request) => {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const messages = await prisma.message.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("[GET MESSAGES]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
};
