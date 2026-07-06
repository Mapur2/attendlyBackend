const { Attendance, User } = require('../db/connectDb');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

const generatePdfBuffer = (summaryText, subjectName) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      doc.fontSize(20).text(`Class Summary: ${subjectName}`, { align: 'center' });
      doc.moveDown();
      
      // Clean up markdown hashes, asterisks, and emojis for pdfkit
      const cleanSummary = summaryText
        .replace(/\*\*/g, '') // remove bold markers
        .replace(/##/g, '') // remove headings markers
        .replace(/#/g, '')
        .replace(/[“”]/g, '"') // smart quotes to regular quotes
        .replace(/[‘’]/g, "'") // smart single quotes
        .replace(/[—–]/g, '-') // em/en dashes to hyphen
        .replace(/[^\x00-\x7F]/g, ''); // strip remaining unicode (emojis)

      doc.fontSize(12).text(cleanSummary, { align: 'left', lineGap: 4 });
      
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

const sendSummaryToStudents = async (sessionId, institutionId, summaryText, subjectName) => {
  try {
    console.log(`[SummaryEmailService] Starting for session ${sessionId}`);

    // 1. Fetch all student user IDs who attended this session
    const attendanceRecords = await Attendance.findAll({
      where: { sessionId },
      attributes: ['userId']
    });

    if (!attendanceRecords.length) {
      console.log(`[SummaryEmailService] No attendees found for session ${sessionId}. Skipping emails.`);
      return;
    }

    const userIds = [...new Set(attendanceRecords.map(a => a.userId))];

    // 2. Fetch their emails
    const students = await User.findAll({
      where: { id: userIds, role: 'student' },
      attributes: ['email', 'name']
    });

    if (!students.length) {
      console.log(`[SummaryEmailService] No valid student emails found for session ${sessionId}. Skipping emails.`);
      return;
    }

    // 3. Generate PDF
    const pdfBuffer = await generatePdfBuffer(summaryText, subjectName);

    // 4. Send emails using Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASS
      }
    });

    let successCount = 0;
    for (const student of students) {
        if (!student.email) continue;
        
        try {
            await transporter.sendMail({
                from: process.env.EMAIL,
                to: student.email,
                subject: `Class Summary - ${subjectName}`,
                html: `<p>Hi ${student.name},</p><p>Please find attached the summary for your recent <strong>${subjectName}</strong> class.</p><p>Best regards,<br/>The Attendly Team</p>`,
                attachments: [
                    {
                        filename: 'Class_Summary.pdf',
                        content: pdfBuffer,
                        contentType: 'application/pdf'
                    }
                ]
            });
            
            successCount++;
        } catch (err) {
            console.error(`[SummaryEmailService] Failed to send to ${student.email}:`, err);
        }
    }
    console.log(`[SummaryEmailService] Finished sending summaries. Successfully sent: ${successCount}/${students.length}`);
  } catch (error) {
    console.error("[SummaryEmailService] Error in sending summary emails:", error);
  }
};

module.exports = { sendSummaryToStudents };
