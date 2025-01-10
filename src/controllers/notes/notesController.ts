import { Request, Response } from 'express';
import {prisma} from "../../managers/dbManager";

export async function createNoteController(req: Request, res: Response) {
    const { text } = req.body;
    if(!text) {
        return res.status(400).json({success: false, message: "Missing text to store as a note!"})
    }

    const note = await prisma.note.create({
        data: {
            "text": text,
        }
    })

    return res.status(201).json({success: true, message: "", note})
}

export async function updateNoteController(req: Request, res: Response) {
    const { id } = req.params;
    const { text } = req.body;

    if (!text) {
        return res.status(400).json({ success: false, message: "Missing text to update the note!" });
    }

    try {
        const updatedNote = await prisma.note.update({
            where: { id: id },
            data: { text: text },
        });

        return res.status(200).json({ success: true, message: "Note updated successfully", note: updatedNote });
    } catch (error) {
        return res.status(404).json({ success: false, message: "Note not found" });
    }
}

export async function deleteNoteController(req: Request, res: Response) {
    const { id } = req.params;

    try {
        await prisma.note.delete({
            where: { id: id },
        });

        return res.status(200).json({ success: true, message: "Note deleted successfully" });
    } catch (error) {
        return res.status(404).json({ success: false, message: "Note not found" });
    }
}

export async function getAllNotesController(req: Request, res: Response) {
    try {
        const notes = await prisma.note.findMany({
            select: {
                id: true,
                text: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        const formattedNotes = notes.map(note => ({
            id: note.id,
            fields: {
                "Created At": note.createdAt.toISOString(),
                "Note": note.text,
            },
        }));

        return res.status(200).json({ success: true, notes: formattedNotes });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error fetching notes" });
    }
}