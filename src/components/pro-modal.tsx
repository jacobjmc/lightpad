"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProModal } from "@/hooks/use-pro-modal";
import { Badge } from "@/components/ui/badge";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Zap } from "lucide-react";
import { useState } from "react";

export const ProModal = () => {
  const [loading, setLoading] = useState(false);
  const proModal = useProModal();

  const onSubscribe = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/stripe", {
        method: "GET",
      });

      if (!response.ok) throw new Error("Failed to fetch stripe session");

      const data = await response.json();

      window.location.href = data.url;
    } catch (error) {
      console.log(error, "STRIPE_CLIENT_ERROR");
    } finally {
      {
        setLoading(false);
      }
    }
  };
  return (
    <Dialog open={proModal.isOpen} onOpenChange={proModal.onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex flex-col items-center justify-center gap-y-4 pb-2">
            <div className="flex items-center gap-x-2 py-1 font-bold">
              Upgrade to
              <Badge variant={"premium"} className="py-1 text-sm uppercase">
                Pro
              </Badge>
            </div>
          </DialogTitle>
          <DialogDescription className="space-y-2 pt-2 text-center font-medium text-zinc-900">
            <Card className="p-4">
              <div className="text-2xl font-bold">Unlock all features</div>
              <div className="text-sm text-zinc-600">
                Get access to unlimited AI generations and unlock the full
                potential of the app.
              </div>
            </Card>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            isLoading={loading}
            onClick={onSubscribe}
            size="lg"
            variant={"premium"}
            className="w-full"
          >
            Upgrade
            <Zap className="ml-2 h-4 w-4 fill-white" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
