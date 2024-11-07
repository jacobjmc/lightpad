import { EditorBubble, useEditor } from "novel";
import { removeAIHighlight } from "novel/extensions";
import {} from "novel/plugins";
import { Fragment, type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "../../ui/button";
import Magic from "../../ui/icons/magic";
import { AISelector } from "./ai-selector";
import { Instance } from "tippy.js";

interface GenerativeMenuSwitchProps {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
const GenerativeMenuSwitch = ({
  children,
  open,
  onOpenChange,
}: GenerativeMenuSwitchProps) => {
  const { editor } = useEditor();

  if (!editor) {
    return null;
  }

  useEffect(() => {
    if (!open) removeAIHighlight(editor);
  }, [open]);

  return (
    <EditorBubble
      tippyOptions={{
        placement: open ? "bottom-start" : "top-start",
        onHidden: () => {
          onOpenChange(false);
          editor.chain().unsetHighlight().run();
          editor.chain().unsetAIHighlight().run();
        },
      }}
      className="flex w-fit max-w-[90vw] overflow-hidden rounded-md border border-muted bg-background shadow-xl"
    >
      {open && <AISelector open={open} onOpenChange={onOpenChange} />}
      {!open && (
        <Fragment>
          <Button
            className="gap-1 rounded-none text-purple-500"
            variant="ghost"
            onClick={() => onOpenChange(true)}
            size="sm"
          >
            <Magic className="h-5 w-5" />
            Ask AI
          </Button>
          {children}
        </Fragment>
      )}
    </EditorBubble>
  );
};

export default GenerativeMenuSwitch;
