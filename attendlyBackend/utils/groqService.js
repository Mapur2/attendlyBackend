const Groq = require("groq-sdk");

// ---------------------------------------------------------------------------
// Groq Client
// ---------------------------------------------------------------------------
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Model to use — llama-3.3-70b-versatile is Groq's fastest high-quality model
const GROQ_MODEL = "llama-3.3-70b-versatile";

// ---------------------------------------------------------------------------
// buildPrompt
// Constructs the system + user prompt for summarization.
// ---------------------------------------------------------------------------
const buildSummarizationPrompt = (transcriptText, subjectName, metadata = {}) => {
  const systemPrompt = `You are an expert academic assistant. Your job is to analyze teacher lecture transcripts and produce structured, student-friendly class notes.

Always respond in the following markdown format:

## 📚 Class Summary — {Subject}

### 🎯 Key Topics Covered
- List the main topics discussed

### 📝 Detailed Notes
Structured notes grouped by topic, with clear explanations.

### 💡 Key Concepts & Definitions
Important terms, formulas, or definitions mentioned.

### ❓ Questions Raised / Discussion Points
Any questions asked or open discussion points during the lecture.

### 📌 Takeaways
2–4 bullet points summarizing the most important things to remember.

Keep the language clear, concise, and appropriate for students. Do not hallucinate content that was not in the transcript.`;

  const userPrompt = `Subject: ${subjectName || "Unknown Subject"}
${metadata.teacherName ? `Teacher: ${metadata.teacherName}` : ""}
${metadata.totalWordCount ? `Transcript Word Count: ${metadata.totalWordCount}` : ""}
${metadata.startedAt ? `Session Date: ${new Date(metadata.startedAt).toLocaleString()}` : ""}

Transcript:
"""
${transcriptText}
"""

Please produce structured class notes from this transcript.`;

  return { systemPrompt, userPrompt };
};

// ---------------------------------------------------------------------------
// summarizeTranscript
// Main exported function — takes raw transcript text and returns a summary string.
// ---------------------------------------------------------------------------
const summarizeTranscript = async (transcriptText, subjectName = "Unknown Subject", metadata = {}) => {
  if (!transcriptText || transcriptText.trim().length < 20) {
    throw new Error("Transcript is too short to summarize.");
  }

  const { systemPrompt, userPrompt } = buildSummarizationPrompt(transcriptText, subjectName, metadata);

  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,       // Lower = more factual, less creative
      max_tokens: 2048,
      top_p: 1,
      stream: false,
    });

    const summary = completion.choices?.[0]?.message?.content;
    if (!summary) throw new Error("Groq returned an empty response.");

    return summary;
  } catch (error) {
    console.error("[GroqService] Summarization failed:", error?.message || error);
    throw new Error(`LLM summarization failed: ${error?.message || "Unknown error"}`);
  }
};

// ---------------------------------------------------------------------------
// flattenTranscript
// Helper — converts the JSONB transcript array into a single plain-text string
// suitable for feeding into the LLM.
// ---------------------------------------------------------------------------
const flattenTranscript = (transcriptChunks = []) => {
  return transcriptChunks
    .sort((a, b) => a.chunkIndex - b.chunkIndex)
    .map((chunk) => chunk.text)
    .join(" ")
    .trim();
};

module.exports = {
  summarizeTranscript,
  flattenTranscript,
};
