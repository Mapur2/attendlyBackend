const { DataTypes } = require("sequelize");

/**
 * ClassNote Model
 * Stores real-time transcripts captured during a live class session via WebSocket,
 * and the LLM-generated summary produced at session end.
 */
const createClassNoteModel = (sequelize) => {
  const ClassNote = sequelize.define(
    "ClassNote",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      // Links to the existing attendance session
      sessionId: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      // Foreign keys
      subjectId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "Subjects", key: "id" },
      },
      teacherId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "Users", key: "id" },
      },
      institutionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "Institutions", key: "id" },
      },

      // Lifecycle state of the note-taking session
      status: {
        type: DataTypes.ENUM("active", "ended", "summarized"),
        defaultValue: "active",
        allowNull: false,
      },

      /**
       * Stored as a JSONB array of chunk objects:
       * [
       *   { chunkIndex: 0, text: "...", timestamp: "ISO8601", wordCount: 12 },
       *   ...
       * ]
       */
      transcript: {
        type: DataTypes.JSONB,
        defaultValue: [],
        allowNull: false,
      },

      // LLM-generated summary; populated when status transitions to 'summarized'
      summary: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      /**
       * Rich session metadata stored as JSONB:
       * {
       *   userAgent: "...",
       *   clientIp: "...",
       *   platform: "...",
       *   totalChunks: 0,
       *   totalWordCount: 0,
       *   subjectName: "...",
       *   teacherName: "...",
       *   institutionName: "...",
       * }
       */
      metadata: {
        type: DataTypes.JSONB,
        defaultValue: {},
        allowNull: true,
      },

      // Precise session timing
      startedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      endedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      timestamps: true,
      tableName: "ClassNotes",
      indexes: [
        { fields: ["sessionId"] },
        { fields: ["teacherId"] },
        { fields: ["subjectId"] },
        { fields: ["institutionId"] },
        { fields: ["status"] },
      ],
    }
  );

  return ClassNote;
};

module.exports = createClassNoteModel;
