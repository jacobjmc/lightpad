"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { MAX_FREE_COUNTS } from "@/constants";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import { Zap } from "lucide-react";
import { useProModal } from "@/hooks/use-pro-modal";

type Props = { apiLimitCount: number; isPro: boolean };
export const FreeCounter = ({ apiLimitCount = 0, isPro = false }: Props) => {
  const proModal = useProModal();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (isPro) {
    return null;
  }

  return (
    <>
      <div className="px-3">
        <Card className="border-2">
          <CardContent className="py-6">
            <div className="mb-4 space-y-2 text-center text-sm dark:text-white">
              <p>
                {apiLimitCount} / {MAX_FREE_COUNTS} Free generations
              </p>
              <Progress
                className="h-3"
                value={(apiLimitCount / MAX_FREE_COUNTS) * 100}
              />
            </div>
            <Button
              onClick={proModal.onOpen}
              variant={"premium"}
              className="w-full"
            >
              Upgrade
              <Zap className="ml-2 h-4 w-4 fill-white" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
};
