"use client";
import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/logo.jpg";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Bot, Plus, BookText, Settings, Menu } from "lucide-react";
import { useState } from "react";
import AddNoteDialog from "@/components/AddEditNoteDialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";
import AIChatButton from "@/components/AIChatButton";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FreeCounter } from "./free-counter";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

interface NavBarProps {
  apiLimitCount: number;
  isPro: boolean;
}

const NavBar = ({ apiLimitCount = 0, isPro = false }: NavBarProps) => {
  const { theme } = useTheme();
  const [showAddEditNoteDialog, setShowAddEditNoteDialog] = useState(false);
  const currentPath = usePathname();
  return (
    <>
      <div className="sticky top-0 bg-white p-4 shadow dark:bg-background">
        <div className="m-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <Link href="/notes" className="flex items-center gap-1">
            <Image src={logo} alt="notes app logo" width={40} height={40} />
            <span className="font-bold">Lightpad</span>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                baseTheme: theme === "dark" ? dark : undefined,
                elements: { avatarBox: { width: "2.5rem", height: "2.5rem" } },
              }}
            />
            <Button onClick={() => setShowAddEditNoteDialog(true)}>
              <Plus size={20} className="mr-2" /> Add Note
            </Button>
            <Button
              asChild
              variant={"ghost"}
              className={cn({
                "": currentPath === "/notes",
              })}
            >
              <Link href="/notes" className="flex">
                <BookText size={20} className="mr-2" />
                Notes
              </Link>
            </Button>
            <Button asChild variant={"ghost"}>
              <Link href="/chat" className="flex">
                <Bot size={20} className="mr-2" />
                AI Chat
              </Link>
            </Button>

            <Button asChild variant={"ghost"}>
              <Link href="/settings" className="flex">
                <Settings size={20} className="mr-2" />
                Settings
              </Link>
            </Button>

            <ThemeToggle />
          </div>
          <div className="flex bg-background md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="mr-auto shrink-0 lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="flex flex-col text-foreground"
              >
                <div className="flex justify-center space-x-3">
                  <Link href="/notes" className="flex items-center gap-1">
                    <Image
                      src={logo}
                      alt="notes app logo"
                      width={40}
                      height={40}
                    />
                    <span className="font-bold">Lightpad</span>
                  </Link>
                  <UserButton
                    afterSignOutUrl="/"
                    appearance={{
                      baseTheme: theme === "dark" ? dark : undefined,
                      elements: {
                        avatarBox: {
                          width: "2.5rem",
                          height: "2.5rem",
                        },
                      },
                    }}
                  />
                  <ThemeToggle />
                </div>
                <Button onClick={() => setShowAddEditNoteDialog(true)}>
                  <Plus size={20} className="mr-2" /> Add Note
                </Button>
                <Button
                  asChild
                  variant={"ghost"}
                  className={cn({
                    "": currentPath === "/notes",
                  })}
                >
                  <Link href="/notes" className="flex">
                    <BookText size={20} className="mr-2" />
                    Notes
                  </Link>
                </Button>
                <Button asChild variant={"ghost"}>
                  <Link href="/chat" className="flex">
                    <Bot size={20} className="mr-2" />
                    AI Chat
                  </Link>
                </Button>

                <Button asChild variant={"ghost"}>
                  <Link href="/settings" className="flex">
                    <Settings size={20} className="mr-2" />
                    Settings
                  </Link>
                </Button>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
      <AddNoteDialog
        open={showAddEditNoteDialog}
        setOpen={setShowAddEditNoteDialog}
      />

      <div className="fixed bottom-2 right-2">
        <FreeCounter apiLimitCount={apiLimitCount} isPro={isPro} />
      </div>
    </>
  );
};

export default NavBar;
