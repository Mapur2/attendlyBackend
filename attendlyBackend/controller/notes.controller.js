const { ClassNote, Subject, User } = require("../db/connectDb");
const { forceFlushAndClose } = require("../websocket/noteHandler");
const { summarizeTranscript, flattenTranscript } = require("../utils/groqService");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

// ---------------------------------------------------------------------------
// endSession
// POST /notes/end-session
// Body: { sessionId }
//
// Flow:
//  1. Find the active ClassNote for the sessionId
//  2. Flush any in-memory WS buffer & close the WebSocket
//  3. Call Groq to summarize the full transcript
//  4. Update ClassNote with summary + status = 'summarized'
// ---------------------------------------------------------------------------
const endSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;
  const { id: requesterId, role, institutionId } = req.user;

  if (!sessionId) {
    throw new ApiError(400, "sessionId is required.");
  }

  // Find the active note
  const note = await ClassNote.findOne({
    where: { sessionId, institutionId },
    include: [
      { model: Subject, attributes: ["id", "name", "code"] },
    ],
  });

  if (!note) {
    throw new ApiError(404, `No note-taking session found for sessionId: ${sessionId}`);
  }

  // Authorization: only the owning teacher or an admin can end the session
  if (role !== "admin" && note.teacherId !== requesterId) {
    throw new ApiError(403, "You are not authorized to end this session.");
  }

  if (note.status === "summarized") {
    return res.status(200).json({
      success: true,
      message: "Session was already summarized.",
      data: {
        noteId: note.id,
        sessionId: note.sessionId,
        status: note.status,
        summary: note.summary,
      },
    });
  }

  // Step 1: Flush the WS buffer and close the socket connection
  await forceFlushAndClose(ClassNote, sessionId);

  // Reload note after flush to get the latest transcript
  await note.reload();

  const endedAt = new Date();

  // Step 2: Flatten transcript chunks into plain text for the LLM
  const transcriptText = flattenTranscript(note.transcript);

  if (!transcriptText || transcriptText.trim().length < 10) {
    // No transcript content — just end without summary
    await note.update({
      status: "ended",
      endedAt,
      metadata: {
        ...(note.metadata || {}),
        endedAt: endedAt.toISOString(),
        summarySkipped: true,
        summarySkipReason: "Transcript was empty or too short.",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Session ended. Transcript was empty — no summary generated.",
      data: {
        noteId: note.id,
        sessionId: note.sessionId,
        status: "ended",
        summary: null,
      },
    });
  }

  // Step 3: Groq summarization
  let summary;
  try {
    const subjectName = note.Subject?.name || note.metadata?.subjectName || "Unknown Subject";
    summary = await summarizeTranscript(transcriptText, subjectName, {
      ...(note.metadata || {}),
      startedAt: note.startedAt,
    });
  } catch (llmError) {
    console.error("[NotesController] LLM summarization failed:", llmError.message);
    // Don't fail the whole request — save as ended without summary
    await note.update({
      status: "ended",
      endedAt,
      metadata: {
        ...(note.metadata || {}),
        endedAt: endedAt.toISOString(),
        summaryError: llmError.message,
      },
    });
    throw new ApiError(502, `Session ended, but summarization failed: ${llmError.message}`);
  }

  // Step 4: Persist summary
  const currentMeta = note.metadata || {};
  await note.update({
    status: "summarized",
    summary,
    endedAt,
    metadata: {
      ...currentMeta,
      endedAt: endedAt.toISOString(),
      durationSeconds: note.startedAt
        ? Math.round((endedAt - new Date(note.startedAt)) / 1000)
        : null,
      summaryGeneratedAt: new Date().toISOString(),
      llmModel: "llama-3.3-70b-versatile",
    },
  });

  return res.status(200).json({
    success: true,
    message: "Session ended and summary generated successfully.",
    data: {
      noteId: note.id,
      sessionId: note.sessionId,
      subjectId: note.subjectId,
      status: "summarized",
      summary,
      transcript: note.transcript,
      metadata: note.metadata,
      startedAt: note.startedAt,
      endedAt,
    },
  });
});

// ---------------------------------------------------------------------------
// getNote
// GET /notes/:sessionId
// Returns the ClassNote record (transcript + summary) for a given session.
// ---------------------------------------------------------------------------
const getNote = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { institutionId } = req.user;

  const note = await ClassNote.findOne({
    where: { sessionId, institutionId },
    include: [
      { model: Subject, attributes: ["id", "name", "code"] },
      { model: User, as: "teacher", attributes: ["id", "name", "email"] },
    ],
  });

  if (!note) {
    throw new ApiError(404, `No note found for sessionId: ${sessionId}`);
  }

  return res.status(200).json({
    success: true,
    data: note,
  });
});

// ---------------------------------------------------------------------------
// listNotes
// GET /notes?subjectId=&status=&page=&limit=
// Lists ClassNotes for the teacher's institution, with optional filters.
// ---------------------------------------------------------------------------
const listNotes = asyncHandler(async (req, res) => {
  const { institutionId, id: userId, role } = req.user;
  const { subjectId, status, page = 1, limit = 20 } = req.query;

  const where = { institutionId };

  // Teachers only see their own notes; admins see all
  if (role === "teacher") where.teacherId = userId;
  if (subjectId) where.subjectId = subjectId;
  if (status) where.status = status;

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const { rows: notes, count } = await ClassNote.findAndCountAll({
    where,
    include: [
      { model: Subject, attributes: ["id", "name", "code"] },
      { model: User, as: "teacher", attributes: ["id", "name", "email"] },
    ],
    order: [["createdAt", "DESC"]],
    limit: parseInt(limit),
    offset,
    attributes: { exclude: ["transcript"] }, // Exclude heavy transcript from list view
  });

  return res.status(200).json({
    success: true,
    data: {
      notes,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    },
  });
});

module.exports = {
  endSession,
  getNote,
  listNotes,
};
