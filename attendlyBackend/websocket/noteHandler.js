const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const url = require("url");

// ---------------------------------------------------------------------------
// In-memory map of active note-taking sessions.
// Key: sessionId  →  Value: { ws, noteId, buffer, bufferSize, flushTimer }
// ---------------------------------------------------------------------------
const activeSessions = new Map();

// How many chunks to accumulate before forcing a DB flush
const FLUSH_CHUNK_THRESHOLD = 5;
// How many milliseconds of inactivity before auto-flushing to DB
const FLUSH_INTERVAL_MS = 10_000;

// ---------------------------------------------------------------------------
// countWords — simple word counter for metadata tracking
// ---------------------------------------------------------------------------
const countWords = (text = "") =>
  text.trim().split(/\s+/).filter(Boolean).length;

// ---------------------------------------------------------------------------
// flushBuffer
// Writes buffered transcript chunks to the DB for a given sessionId.
// Called on threshold hit, timer expiry, or session end.
// ---------------------------------------------------------------------------
const flushBuffer = async (ClassNote, sessionId) => {
  const session = activeSessions.get(sessionId);
  if (!session || session.buffer.length === 0) return;

  const chunksToFlush = [...session.buffer];
  session.buffer = [];
  session.bufferSize = 0;

  try {
    const note = await ClassNote.findByPk(session.noteId);
    if (!note) return;

    const existingTranscript = note.transcript || [];
    const updatedTranscript = [...existingTranscript, ...chunksToFlush];

    const currentMeta = note.metadata || {};
    const addedWords = chunksToFlush.reduce((sum, c) => sum + (c.wordCount || 0), 0);

    await note.update({
      transcript: updatedTranscript,
      metadata: {
        ...currentMeta,
        totalChunks: updatedTranscript.length,
        totalWordCount: (currentMeta.totalWordCount || 0) + addedWords,
      },
    });

    console.log(`[NoteHandler] Flushed ${chunksToFlush.length} chunk(s) for session: ${sessionId}`);
  } catch (err) {
    console.error(`[NoteHandler] Flush failed for session ${sessionId}:`, err.message);
    // Put chunks back into buffer so they aren't lost
    session.buffer.unshift(...chunksToFlush);
    session.bufferSize = session.buffer.length;
  }
};

// ---------------------------------------------------------------------------
// scheduleFlush
// Resets the auto-flush timer for a session.
// ---------------------------------------------------------------------------
const scheduleFlush = (ClassNote, sessionId) => {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  if (session.flushTimer) clearTimeout(session.flushTimer);
  session.flushTimer = setTimeout(() => {
    flushBuffer(ClassNote, sessionId);
  }, FLUSH_INTERVAL_MS);
};

// ---------------------------------------------------------------------------
// authenticateWsHandshake
// Validates JWT from query string. Returns decoded user payload or throws.
// ---------------------------------------------------------------------------
const authenticateWsHandshake = (requestUrl) => {
  const { query } = url.parse(requestUrl, true);
  const token = query.token;

  if (!token) throw new Error("Missing authentication token.");

  const decoded = jwt.verify(token, process.env.SECRET_TOKEN);
  return decoded; // { id, role, institutionId, email, ... }
};

// ---------------------------------------------------------------------------
// handleConnection
// Called for each new WebSocket connection to /ws/notes
// ---------------------------------------------------------------------------
const handleConnection = async (ws, req, ClassNote, User, Subject) => {
  const { query } = url.parse(req.url, true);
  const { sessionId, subjectId } = query;

  let userId;
  let institutionId;

  // --- Auth ---
  try {
    const decoded = authenticateWsHandshake(req.url);
    userId = decoded.id;
    institutionId = decoded.institutionId;
    console.log(decoded)

    if (decoded.role !== "teacher" && decoded.role !== "admin") {
      ws.close(4003, "Only teachers or admins can start note-taking sessions.");
      return;
    }
  } catch (err) {
    ws.close(4001, `Authentication failed: ${err.message}`);
    return;
  }

  // --- Validate required params ---
  if (!sessionId || !subjectId) {
    ws.close(4002, "Missing required query params: sessionId, subjectId");
    return;
  }

  // --- Load teacher & subject info for metadata ---
  let teacher = null;
  let subject = null;
  try {
    [teacher, subject] = await Promise.all([
      User.findByPk(userId, { attributes: ["id", "name", "email"] }),
      Subject.findByPk(subjectId, { attributes: ["id", "name", "code"] }),
    ]);
  } catch (err) {
    console.error("[NoteHandler] DB lookup error:", err.message);
  }

  // --- Prevent duplicate active sessions for the same sessionId ---
  if (activeSessions.has(sessionId)) {
    ws.close(4004, "An active note-taking session already exists for this sessionId.");
    return;
  }

  // --- Create ClassNote record in DB ---
  let note;
  const startedAt = new Date();
  try {
    note = await ClassNote.create({
      sessionId,
      subjectId,
      teacherId: userId,
      institutionId,
      status: "active",
      transcript: [],
      summary: null,
      startedAt,
      metadata: {
        userAgent: req.headers["user-agent"] || "unknown",
        clientIp: req.socket.remoteAddress || "unknown",
        platform: req.headers["x-platform"] || "unknown",
        totalChunks: 0,
        totalWordCount: 0,
        teacherName: teacher?.name || "unknown",
        teacherEmail: teacher?.email || "unknown",
        subjectName: subject?.name || "unknown",
        subjectCode: subject?.code || "unknown",
        startedAt: startedAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("[NoteHandler] Failed to create ClassNote:", err.message);
    ws.close(1011, "Internal server error: could not create note record.");
    return;
  }

  // --- Register in active sessions map ---
  activeSessions.set(sessionId, {
    ws,
    noteId: note.id,
    buffer: [],
    bufferSize: 0,
    flushTimer: null,
    chunkIndex: 0,
  });

  console.log(`[NoteHandler] Session started: ${sessionId} | Note ID: ${note.id}`);

  // --- Send session_info handshake to client ---
  ws.send(
    JSON.stringify({
      type: "session_info",
      noteId: note.id,
      sessionId,
      subjectId,
      subjectName: subject?.name || "Unknown",
      status: "active",
      startedAt: startedAt.toISOString(),
      message: "Note-taking session started. Send chunks as { type: 'chunk', text: '...' }",
    })
  );

  // -------------------------------------------------------------------------
  // Message handler — receives transcript chunks from the client
  // -------------------------------------------------------------------------
  ws.on("message", async (rawData) => {
    let parsed;
    try {
      parsed = JSON.parse(rawData.toString());
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "Invalid JSON payload." }));
      return;
    }

    const { type, text } = parsed;

    if (type !== "chunk") {
      ws.send(JSON.stringify({ type: "error", message: `Unknown message type: "${type}". Expected "chunk".` }));
      return;
    }

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      ws.send(JSON.stringify({ type: "error", message: "Chunk text is empty or invalid." }));
      return;
    }

    const session = activeSessions.get(sessionId);
    if (!session) {
      ws.send(JSON.stringify({ type: "error", message: "Session not found. Please reconnect." }));
      return;
    }

    // Build chunk object
    const chunkIndex = session.chunkIndex++;
    const chunk = {
      chunkIndex,
      text: text.trim(),
      timestamp: new Date().toISOString(),
      wordCount: countWords(text),
    };

    // Add to buffer
    session.buffer.push(chunk);
    session.bufferSize++;

    // Acknowledge receipt immediately
    ws.send(JSON.stringify({ type: "ack", chunkIndex, wordCount: chunk.wordCount }));

    // Flush if threshold hit, otherwise reset the debounce timer
    if (session.bufferSize >= FLUSH_CHUNK_THRESHOLD) {
      if (session.flushTimer) clearTimeout(session.flushTimer);
      await flushBuffer(ClassNote, sessionId);
    } else {
      scheduleFlush(ClassNote, sessionId);
    }
  });

  // -------------------------------------------------------------------------
  // Close handler — fires when client disconnects (intentional or network drop)
  // -------------------------------------------------------------------------
  ws.on("close", async (code, reason) => {
    console.log(`[NoteHandler] WS closed for session ${sessionId} | Code: ${code}`);

    const session = activeSessions.get(sessionId);
    if (!session) return;

    // Cancel pending timer
    if (session.flushTimer) clearTimeout(session.flushTimer);

    // Flush any remaining buffer
    if (session.buffer.length > 0) {
      await flushBuffer(ClassNote, sessionId);
    }

    // Mark as ended in DB if still active (not already summarized by webhook)
    try {
      const note = await ClassNote.findByPk(session.noteId);
      if (note && note.status === "active") {
        await note.update({
          status: "ended",
          endedAt: new Date(),
          metadata: {
            ...(note.metadata || {}),
            endedAt: new Date().toISOString(),
            closeCode: code,
            closeReason: reason?.toString() || "client disconnected",
          },
        });
      }
    } catch (err) {
      console.error(`[NoteHandler] Failed to mark note as ended:`, err.message);
    }

    activeSessions.delete(sessionId);
  });

  // -------------------------------------------------------------------------
  // Error handler
  // -------------------------------------------------------------------------
  ws.on("error", (err) => {
    console.error(`[NoteHandler] WS error for session ${sessionId}:`, err.message);
  });
};

// ---------------------------------------------------------------------------
// setupWebSocket
// Attaches the WebSocket server to the existing HTTP server.
// Only handles connections to the path /ws/notes
// ---------------------------------------------------------------------------
const setupWebSocket = (httpServer, { ClassNote, User, Subject }) => {
  const wss = new WebSocket.Server({
    server: httpServer,
    path: "/ws/notes",
  });

  wss.on("connection", (ws, req) => {
    handleConnection(ws, req, ClassNote, User, Subject).catch((err) => {
      console.error("[NoteHandler] Unhandled connection error:", err.message);
      ws.close(1011, "Internal server error.");
    });
  });

  console.log("[NoteHandler] WebSocket server attached at ws://<host>/ws/notes");
  return wss;
};

// ---------------------------------------------------------------------------
// getActiveSession — exported so notes.controller.js can close a WS by sessionId
// ---------------------------------------------------------------------------
const getActiveSession = (sessionId) => activeSessions.get(sessionId);

// ---------------------------------------------------------------------------
// forceFlushAndClose
// Called by the end-session webhook to cleanly terminate a WS session.
// ---------------------------------------------------------------------------
const forceFlushAndClose = async (ClassNote, sessionId) => {
  const session = activeSessions.get(sessionId);
  if (!session) return false; // Already closed or never existed

  if (session.flushTimer) clearTimeout(session.flushTimer);

  // Flush remaining buffer
  if (session.buffer.length > 0) {
    await flushBuffer(ClassNote, sessionId);
  }

  // Gracefully close the WS connection
  if (session.ws && session.ws.readyState === WebSocket.OPEN) {
    session.ws.send(
      JSON.stringify({ type: "session_ended", message: "Session ended by teacher. Summarization in progress..." })
    );
    session.ws.close(1000, "Session ended by teacher.");
  }

  activeSessions.delete(sessionId);
  return true;
};

module.exports = {
  setupWebSocket,
  getActiveSession,
  forceFlushAndClose,
  flushBuffer,
};
