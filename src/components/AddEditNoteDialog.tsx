import { CreateNoteSchema, createNoteSchema } from "@/lib/validation/note";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogHeader,
  DialogFooter,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Note } from "@prisma/client";
import { useState } from "react";
import AiEditor from "./editor/ai-editor";
import { HTMLContent } from "@tiptap/react";

interface AddNoteDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  noteToEdit?: Note;
}

const AddEditNoteDialog = ({
  open,
  setOpen,
  noteToEdit,
}: AddNoteDialogProps) => {
  const [deleteInProgress, setDeleteInProgess] = useState(false);

  const router = useRouter();
  const form = useForm<CreateNoteSchema>({
    resolver: zodResolver(createNoteSchema),
    defaultValues: {
      title: noteToEdit?.title || "",
      content: noteToEdit?.content || "",
    },
  });
  async function onSubmit(input: CreateNoteSchema) {
    try {
      if (noteToEdit) {
        const response = await fetch(`/api/notes/`, {
          method: "PUT",
          body: JSON.stringify({
            id: noteToEdit.id,
            ...input,
          }),
        });

        if (!response.ok) throw Error("Status code: " + response.status);

        toast.success("Note updated");
      } else {
        const response = await fetch("/api/notes", {
          method: "POST",
          body: JSON.stringify(input),
        });

        if (!response.ok) throw Error("Status code: " + response.status);
        form.reset();
        toast.success("Note created");
      }

      router.refresh();
      setOpen(false);
    } catch (error) {
      console.log(error);
      toast.error("An error occurred");
    }
  }

  async function deleteNote() {
    if (!noteToEdit) return;
    setDeleteInProgess(true);
    try {
      const response = await fetch(`/api/notes/`, {
        method: "DELETE",
        body: JSON.stringify({
          id: noteToEdit.id,
        }),
      });
      if (!response.ok) throw Error("Status code: " + response.status);
      router.refresh();
      setOpen(false);
    } catch (error) {
      console.log(error);
      toast.error("An error occurred");
    } finally {
      setDeleteInProgess(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="mt-10 max-h-screen max-w-[700px] overflow-y-scroll py-20 md:my-0 md:overflow-y-hidden md:p-6">
        <DialogHeader>
          <DialogTitle>{noteToEdit ? "Edit Note" : "Add Note"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note title</FormLabel>
                  <FormControl>
                    <Input placeholder="Note title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note content</FormLabel>
                  <FormControl>
                    {/* <Textarea
                      className="h-[500px]"
                      placeholder="Note content"
                      {...field}
                    /> */}
                    <AiEditor
                      onUpdate={(value) => {
                        field.onChange(value);
                      }}
                      existingContent={field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <div className="flex w-full flex-col gap-1">
                <Button
                  className="w-full"
                  type="submit"
                  isLoading={form.formState.isSubmitting}
                >
                  Submit
                </Button>
                {noteToEdit && (
                  <Button
                    className="w-full"
                    variant={"destructive"}
                    isLoading={deleteInProgress}
                    disabled={form.formState.isSubmitting}
                    onClick={deleteNote}
                    type="button"
                  >
                    Delete note
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditNoteDialog;
