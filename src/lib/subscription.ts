import { auth, currentUser } from "@clerk/nextjs";
import prisma from "./db/prisma";

const DAY_IN_MS = 86_400_000;

export const checkSubscription = async () => {
  const { userId } = auth();

  const user = await currentUser();

  if (
    user?.emailAddresses[0].emailAddress === "jacobjmc23@gmail.com" ||
    user?.emailAddresses[0].emailAddress === "hengyouee@gmail.com" ||
    user?.emailAddresses[0].emailAddress === "jmcdeveloper23@gmail.com"
  ) {
    return true;
  }

  if (!userId) {
    return false;
  }

  const userSubscription = await prisma.userSubscription.findUnique({
    where: {
      userId,
    },
    select: {
      stripeSubscriptionId: true,
      stripeCurrentPeriodEnd: true,
      stripeCustomerId: true,
      stripePriceId: true,
    },
  });

  if (!userSubscription) {
    return false;
  }

  const isValid =
    userSubscription.stripePriceId &&
    userSubscription.stripeCurrentPeriodEnd?.getTime()! + DAY_IN_MS >
      Date.now();

  return !!isValid;
};
