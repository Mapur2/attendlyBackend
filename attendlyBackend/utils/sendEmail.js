const nodemailer = require('nodemailer')

const sendEmail = async (userEmail, content) => {
  try {
    const config = {
      service: 'gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASS
      }
    };

    let transporter = nodemailer.createTransport(config);

    const htmlBody = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            .header { background-color: #f8f8f8; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .footer { background-color: #f8f8f8; padding: 10px; text-align: center; font-size: 0.9em; color: #555; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Welcome to Attenly</h1>
          </div>
          <div class="content">
            <p>Dear Customer,</p>
            ${content}
            <p>Thank you for choosing Attendly as your trusted partner. We are delighted to have you with us and look forward to providing you with top-notch service and support.</p>
            <p>If you have any questions, please don't hesitate to reach out.</p>
          </div>
          <div class="footer">
            <p>Best regards,</p>
            <p>The Attendly Team</p>
          </div>
        </body>
      </html>
    `;

    let message = {
      from: process.env.EMAIL,          
      to: userEmail,                   
      subject: "StoreEdge Notification",
      text: `Hello, ${userEmail}. Welcome to StoreEdge!`, 
      html: htmlBody,                  
    };

    const info = await transporter.sendMail(message);
    return info;
  } catch (error) {
    console.log("Error sending email:", error);
    return null
  }
};

module.exports = sendEmail
