"use client";

import { Note as NoteModel } from "@prisma/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { useState, useEffect } from "react";
import AddEditNoteDialog from "./AddEditNoteDialog";
import createDOMPurify from "dompurify";

interface NoteProps {
  note: NoteModel;
}

const Note = ({ note }: NoteProps) => {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [sanitizedContent, setSanitizedContent] = useState("");

  const wasUpdated = note.updatedAt > note.createdAt;

  const createdUpdatedAtTimestamp = (
    wasUpdated ? note.updatedAt : note.createdAt
  ).toDateString();

  useEffect(() => {
    if (note?.content !== null) {
      setSanitizedContent(createDOMPurify().sanitize(note.content));
    }
  }, [note.content]);

  return (
    <>
      <Card
        className="cursor-pointer transition-shadow hover:shadow-lg"
        onClick={() => setShowEditDialog(true)}
      >
        <CardHeader>
          <CardTitle>{note.title}</CardTitle>
          <CardDescription>
            {createdUpdatedAtTimestamp}
            {wasUpdated && "(updated)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="prose prose-sm dark:prose-invert prose-headings:font-title font-default whitespace-pre-line"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          ></div>
        </CardContent>
      </Card>
      <AddEditNoteDialog
        open={showEditDialog}
        setOpen={setShowEditDialog}
        noteToEdit={note}
      />
    </>
  );
};

export default Note;
