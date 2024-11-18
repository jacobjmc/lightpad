"use client";
import { cn } from "@/lib/utils";
import { useChat } from "ai/react";
import {
  ArrowUp,
  ArrowUpCircle,
  ArrowUpNarrowWide,
  Bot,
  Copy,
  ListRestart,
  Loader2,
  RefreshCcw,
  RefreshCcwDot,
  Stars,
  Trash,
  X,
  XCircle,
} from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Message } from "ai";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { addAssistantMessage } from "@/lib/actions";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";
import { useProModal } from "@/hooks/use-pro-modal";
import ReactMarkdown from "react-markdown";

interface AIChatBoxProps {
  open: boolean;
  onClose?: () => void;
}

const AIChatBox = ({ open, onClose }: AIChatBoxProps) => {
  const router = useRouter();
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    setMessages,
    isLoading,
    error,
    reload,
  } = useChat({
    onFinish: async (message) => {
      const stringMessage = JSON.stringify(message);

      const stringMessages = JSON.stringify(messages);
      await addAssistantMessage(stringMessage, stringMessages);
      router.refresh();
    },
  }); // /api/chat

  const [messagesLoading, setMessagesLoading] = useState(true);

  const fetchMessages = async () => {
    const response = await fetch("/api/messages");
    const data = await response.json();

    setMessages(data);
    setMessagesLoading(false);
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleDelete = async () => {
    const data = await fetch("/api/chat", {
      method: "DELETE",
    });

    console.log(data);

    fetchMessages();
  };

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (error?.message === "Free trial has expired.") {
      proModal.onOpen();
    }
  }, [error]);

  const lastMessageIsUser = messages[messages.length - 1]?.role === "user";

  const proModal = useProModal();

  return (
    <div
      className={cn(
        "mx-auto mb-10 h-auto w-full items-center p-1 xl:max-w-[900px]",
      )}
    >
      <div className="flex h-[650px] flex-col rounded-lg bg-white dark:bg-background lg:h-[900px]">
        <p className="mx-auto mt-4 font-mono text-lg font-semibold text-muted-foreground">
          AI Chat
        </p>

        <div className="mt-10 h-auto px-3" ref={scrollRef}>
          {messages.map((message) => (
            <ChatMessage
              isLoading={isLoading}
              key={message.id}
              message={message}
            />
          ))}
          {isLoading && lastMessageIsUser && (
            <ChatMessage
              isLoading={isLoading}
              message={{ role: "assistant", content: "Thinking..." }}
            />
          )}
        </div>
        <div className="my-auto">
          {messagesLoading && (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3 font-mono text-xl tracking-tighter text-muted-foreground">
                <Loader2 className="animate-spin" size={70} />
                Loading...
              </div>
            </div>
          )}

          {!error && messages.length === 0 && !messagesLoading && (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3 font-mono text-xl tracking-tighter text-muted-foreground">
                <Bot size={70} />
                Ask the AI a question about your notes...
              </div>
            </div>
          )}

          {error && (
            <div className="ms-12 flex space-x-2">
              <Button className="" variant={"destructive"}>
                <p className="">{error.message}</p>
              </Button>
            </div>
          )}
        </div>
        <form
          onSubmit={(e) => {
            handleSubmit(e);
          }}
          className="sticky bottom-0 m-3 mt-5 flex flex-col gap-2 bg-background pb-5"
        >
          <div className="flex items-center rounded-xl border border-input bg-slate-100 dark:bg-background">
            <Input
              className="h-12 flex-1 resize-none border-none bg-transparent focus-visible:ring-0 focus-visible:ring-ring focus-visible:ring-offset-0"
              value={input}
              onChange={handleInputChange}
              placeholder="Ask a question..."
              ref={inputRef}
            />
            <Button
              size="icon"
              className="z-50 mr-1 rounded-full bg-foreground hover:bg-foreground/70 disabled:bg-muted-foreground"
              type="submit"
              disabled={!input || isLoading}
            >
              <ArrowUp className="h-6 w-6 text-background" />
            </Button>
          </div>

          <div className="flex-col space-y-2">
            <div className="flex max-w-[500px] flex-col-reverse space-y-1 md:max-w-full md:flex-row md:space-x-2 md:space-y-0">
              <Button
                title="Regenerate response"
                className="my-1 w-full rounded-xl text-xs md:my-0 md:w-[200px]"
                disabled={isLoading}
                variant={"outline"}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) =>
                  reload()
                }
              >
                <ListRestart className="h-4" /> Regenerate last response
              </Button>
              <Button
                title="Clear chat"
                variant="outline"
                className="my-1 w-full rounded-xl text-xs md:my-0 md:w-[200px]"
                type="button"
                disabled={isLoading}
                onClick={handleDelete}
              >
                <Trash className="h-4" /> Clear chat history
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

function ChatMessage({
  message,
  isLoading,
}: {
  message: Pick<Message, "role" | "content">;
  isLoading?: boolean;
}) {
  const { user } = useUser();
  const router = useRouter();

  const isAiMessage = message.role === "assistant";

  const { theme, systemTheme } = useTheme();

  const scrollToMessageRef = useRef<HTMLDivElement>(null);

  // Helper function to check if the user is near the bottom of the chat
  const isNearBottom = () => {
    if (!scrollToMessageRef.current) return false;
    const { scrollTop, scrollHeight, clientHeight } =
      scrollToMessageRef.current.parentElement!;
    return scrollHeight - scrollTop <= clientHeight + 50; // Adjust the threshold as needed
  };

  useEffect(() => {
    if (scrollToMessageRef.current && isNearBottom()) {
      scrollToMessageRef.current.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [isLoading]);

  useEffect(() => {
    if (scrollToMessageRef.current) {
      scrollToMessageRef.current.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, []);

  return (
    <div>
      <div
        className={cn(
          "mb-3 flex items-center ",
          isAiMessage ? "me-5 justify-start" : "ms-5 justify-end",
        )}
      >
        <div className="flex flex-col space-y-5">
          <Button
            title="Copy to clipboard"
            className="mr-2"
            variant={"ghost"}
            size={"icon"}
            onClick={() => {
              navigator.clipboard.writeText(message.content);
              toast.success("Copied to clipboard");
            }}
          >
            <Copy className="shrink-0 text-primary" />
          </Button>
          {isAiMessage && <Bot className="ml-2 shrink-0 text-primary" />}
        </div>
        <div className="flex flex-col space-y-2">
          <p
            className={cn(
              "prose rounded-xl px-3 py-2",
              systemTheme === "dark" && isAiMessage
                ? "text-black"
                : "text-white",
              isAiMessage ? "bg-slate-100" : "bg-indigo-600",
            )}
          >
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </p>
        </div>
        {!isAiMessage && user?.imageUrl && (
          <div>
            <Image
              src={user.imageUrl}
              alt="User image"
              width={100}
              height={100}
              className="ml-2 h-10 w-10 rounded-full object-cover"
            />
          </div>
        )}
      </div>

      <div className="relative inset-y-44 bottom-0" ref={scrollToMessageRef} />
    </div>
  );
}

export default AIChatBox;
