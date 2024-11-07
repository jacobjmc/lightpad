"use client";
import {
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  type EditorInstance,
  EditorRoot,
  type JSONContent,
  useEditor,
} from "novel";
import {
  ImageResizer,
  addAIHighlight,
  handleCommandNavigation,
} from "novel/extensions";
import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { defaultExtensions } from "@/components/editor/extensions";
import { Separator } from "@/components/ui/separator";

import { NodeSelector } from "@/components/editor/selectors/node-selector";
import GenerativeMenuSwitch from "@/components/editor/generative/generative-menu-switch";

import { ColorSelector } from "@/components/editor/selectors/color-selector";
import { TextButtons } from "@/components/editor/selectors/text-buttons";
import { LinkSelector } from "@/components/editor/selectors/link-selector";
import {
  slashCommand,
  suggestionItems,
} from "@/components/editor/slash-command";

import hljs from "highlight.js";
import { generateJSON, HTMLContent } from "@tiptap/react";

const extensions = [...defaultExtensions, slashCommand];

const defaultEditorContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "",
        },
      ],
    },
  ],
};

type AiEditorProps = {
  onUpdate?: (content: HTMLContent) => void;
  existingContent?: HTMLContent;
};

const AiEditor = ({ onUpdate, existingContent }: AiEditorProps) => {
  const [initialContent, setInitialContent] = useState<null | JSONContent>(
    null,
  );
  const [charsCount, setCharsCount] = useState();

  const [openNode, setOpenNode] = useState(false);
  const [openColor, setOpenColor] = useState(false);
  const [openLink, setOpenLink] = useState(false);
  const [openAI, setOpenAI] = useState(false);

  //Apply Codeblock Highlighting on the HTML from editor.getHTML()
  const highlightCodeblocks = (content: string) => {
    const doc = new DOMParser().parseFromString(content, "text/html");
    doc.querySelectorAll("pre code").forEach((el) => {
      // @ts-ignore
      // https://highlightjs.readthedocs.io/en/latest/api.html?highlight=highlightElement#highlightelement
      hljs.highlightElement(el);
    });
    return new XMLSerializer().serializeToString(doc);
  };

  const debouncedUpdates = useDebouncedCallback(
    async (editor: EditorInstance) => {
      const html = editor.getHTML();
      onUpdate?.(html);
      setCharsCount(editor.storage.characterCount.words());
    },
    500,
  );

  useEffect(() => {
    const content = existingContent
      ? generateJSON(existingContent, extensions)
      : null;
    if (content) setInitialContent(content);
    else setInitialContent(defaultEditorContent);
  }, []);

  if (!initialContent) return null;

  return (
    <div className="relative w-full max-w-screen-lg">
      <div className="absolute right-5 top-2 z-10 mb-5 flex gap-2">
        <div
          className={
            charsCount
              ? "rounded-lg bg-accent px-2 py-1 text-sm text-muted-foreground"
              : "hidden"
          }
        >
          {charsCount} Words
        </div>
      </div>
      <EditorRoot>
        <EditorContent
          initialContent={initialContent}
          extensions={extensions}
          className="text-wrap max-h-[400px] min-h-[300px] w-full max-w-screen-sm resize-none overflow-y-auto border bg-background sm:rounded-lg"
          editorProps={{
            handleDOMEvents: {
              keydown: (_view, event) => handleCommandNavigation(event),
            },
            attributes: {
              class:
                "prose prose-md dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full",
            },
          }}
          onUpdate={({ editor }) => {
            debouncedUpdates(editor);
          }}
        >
          <EditorCommand className="text-wrap z-50 max-h-[330px] overflow-y-auto rounded-md border border-muted bg-background px-1 py-2 shadow-md transition-all">
            <EditorCommandEmpty className="px-2 text-muted-foreground">
              No results
            </EditorCommandEmpty>
            <EditorCommandList>
              {suggestionItems.map((item) => (
                <EditorCommandItem
                  value={item.title}
                  onCommand={(val) => item.command?.(val)}
                  className="flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-accent aria-selected:bg-accent"
                  key={item.title}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-muted bg-background">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </EditorCommandItem>
              ))}
            </EditorCommandList>
          </EditorCommand>

          <GenerativeMenuSwitch open={openAI} onOpenChange={setOpenAI}>
            <Separator orientation="vertical" />
            <NodeSelector open={openNode} onOpenChange={setOpenNode} />
            <Separator orientation="vertical" />
            <LinkSelector open={openLink} onOpenChange={setOpenLink} />
            <Separator orientation="vertical" />
            <TextButtons />
            <Separator orientation="vertical" />
            <ColorSelector open={openColor} onOpenChange={setOpenColor} />
          </GenerativeMenuSwitch>
        </EditorContent>
      </EditorRoot>
    </div>
  );
};

export default AiEditor;
