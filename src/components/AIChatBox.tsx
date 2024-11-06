"use client";
import { cn } from "@/lib/utils";
import { useChat } from "ai/react";
import {
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

  const inputRef = useRef<HTMLTextAreaElement>(null);
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
        "mx-auto mb-10 h-screen w-full items-center p-1 xl:max-w-[1200px]",
      )}
    >
      <div className="flex h-[650px] flex-col rounded-lg border border-indigo-700 border-opacity-50 bg-white shadow-xl dark:bg-background lg:h-[900px]">
        <p className="mx-auto mt-4 font-mono text-lg font-semibold text-muted-foreground">
          AI Chat
        </p>

        <div className="mt-3 h-full overflow-y-auto px-3" ref={scrollRef}>
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
          {error && (
            <div className="ms-12 flex space-x-2">
              <Button className="" variant={"destructive"}>
                <p className="">{error.message}</p>
              </Button>
            </div>
          )}

          {messagesLoading && (
            <div className="flex h-full flex-col items-center justify-center gap-3 font-mono text-xl tracking-tighter text-muted-foreground">
              <Loader2 className="animate-spin" size={70} />
              Loading...
            </div>
          )}

          {!error && messages.length === 0 && !messagesLoading && (
            <div className="flex h-full flex-col items-center justify-center gap-3 font-mono text-xl tracking-tighter text-muted-foreground">
              <Bot size={70} />
              Ask the AI a question or write some details for the AI to generate
              a post from
            </div>
          )}
        </div>
        <form onSubmit={handleSubmit} className="m-3 flex flex-col gap-2 ">
          <Textarea
            className="resize-none shadow-md"
            value={input}
            onChange={handleInputChange}
            placeholder="Ask a question or write some details for the AI to generate a post from..."
            ref={inputRef}
          />

          <div className="flex-col space-y-2">
            <div className="flex max-w-[500px] flex-col-reverse space-y-1 md:max-w-full md:flex-row md:space-x-2 md:space-y-0">
              <Button
                title="Regenerate response"
                className="my-1 w-full text-xs shadow-md md:my-0 md:w-[200px]"
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
                className="my-1 w-full text-xs shadow-md md:my-0 md:w-[200px]"
                type="button"
                onClick={handleDelete}
              >
                <Trash className="h-4" /> Clear chat history
              </Button>

              <Button
                className="w-full shadow-md md:flex"
                type="submit"
                isLoading={isLoading}
              >
                Send
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

function ChatMessage({
  message: { role, content },
  isLoading,
}: {
  message: Pick<Message, "role" | "content">;
  isLoading?: boolean;
}) {
  const { user } = useUser();
  const router = useRouter();

  const isAiMessage = role === "assistant";

  const { theme, systemTheme } = useTheme();

  const [addNoteLoading, setAddNoteLoading] = useState(false);

  const handleAddNote = async () => {
    setAddNoteLoading(true);
    const input = content.split("\n");
    const title = input[0].replace("Title: ", "");
    const noteContent = input.slice(2).join("\n").replace("Content:\n", "");
    const response = await fetch("/api/notes", {
      method: "POST",
      body: JSON.stringify({ title: title, content: noteContent }),
    });

    if (!response.ok) throw Error("Status code: " + response.status);
    setAddNoteLoading(false);
    toast.success("Note created");
    router.refresh();
  };

  return (
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
            navigator.clipboard.writeText(content);
            toast.success("Copied to clipboard");
          }}
        >
          <Copy className="shrink-0 text-primary" />
        </Button>

        {isAiMessage && <Bot className="ml-2 shrink-0 text-primary" />}
      </div>

      <div className="flex flex-col space-y-2 ">
        <p
          className={cn(
            "whitespace-pre-line rounded-md border  px-3 py-2",
            theme === "dark" || (systemTheme === "dark" && isAiMessage)
              ? "text-black"
              : "text-white",
            isAiMessage ? "bg-gray-100" : "bg-indigo-600",
          )}
        >
          {content}
        </p>
        {isAiMessage && (
          <div className="flex space-x-4">
            <Button
              className="h-min w-full shadow-md"
              disabled={isLoading || addNoteLoading}
              isLoading={addNoteLoading}
              variant={"outline"}
              onClick={handleAddNote}
            >
              Save response to notes
            </Button>
          </div>
        )}
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
  );
}

export default AIChatBox;
