const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authLayer");
const { endSession, getNote, listNotes } = require("../controller/notes.controller");

/**
 * @swagger
 * tags:
 *   name: Notes
 *   description: Real-time class note-taking and LLM summarization
 */

/**
 * @swagger
 * /notes/end-session:
 *   post:
 *     summary: End a note-taking session and trigger LLM summarization
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: The session ID of the active note-taking session to end
 *     responses:
 *       200:
 *         description: Session ended, summary generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     noteId:
 *                       type: string
 *                     sessionId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [summarized, ended]
 *                     summary:
 *                       type: string
 *       400:
 *         description: Missing sessionId
 *       403:
 *         description: Not authorized to end this session
 *       404:
 *         description: Session not found
 *       502:
 *         description: Session ended but LLM summarization failed
 */
router.post("/end-session", authMiddleware, endSession);

/**
 * @swagger
 * /notes/{sessionId}:
 *   get:
 *     summary: Get a class note by session ID (includes transcript and summary)
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The session ID of the class note
 *     responses:
 *       200:
 *         description: Class note record
 *       404:
 *         description: Note not found
 */
router.get("/:sessionId", authMiddleware, getNote);

/**
 * @swagger
 * /notes:
 *   get:
 *     summary: List all class notes for the institution (paginated)
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: subjectId
 *         schema:
 *           type: string
 *         description: Filter by subject UUID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, ended, summarized]
 *         description: Filter by session status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Paginated list of class notes
 */
router.get("/", authMiddleware, listNotes);

module.exports = router;
