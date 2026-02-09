const nodemailer = require('nodemailer');

// Create a test account if in development
let transporter;

if (process.env.NODE_ENV === 'development') {
  // Use ethereal.email for testing in development
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.ETHEREAL_USER || 'your-ethereal-username',
      pass: process.env.ETHEREAL_PASS || 'your-ethereal-password'
    }
  });
} else {
  // Use real SMTP in production
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

const sendEmail = async (mailOptions) => {
  try {
    // Set default from address if not provided
    if (!mailOptions.from) {
      mailOptions.from = process.env.SMTP_FROM || 'noreply@yourdomain.com';
    }

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = { sendEmail };
