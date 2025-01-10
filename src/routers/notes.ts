import express from 'express';
import {
    createNoteController,
    deleteNoteController,
    getAllNotesController,
    updateNoteController
} from "../controllers/notes/notesController";

const router = express.Router();

// Register the methods, and appoint them to the appropriate controller middleware

router.get('/', (req,res) => {
    res.status(200).json({success: true, message: "notes router is working..."})
})

router.get('/get_notes', getAllNotesController)
router.post('/create_note', createNoteController);
router.put('/update_note/:id', updateNoteController);
router.delete('/delete_note/:id', deleteNoteController)

export default router;
