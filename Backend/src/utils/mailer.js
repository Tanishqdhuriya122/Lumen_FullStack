// import nodemailer from "nodemailer";

// // Explicit host/port/secure instead of the "gmail" shorthand — more reliable
// // across different networks/firewalls than letting nodemailer auto-resolve it.
// const transporter = nodemailer.createTransport({
//   host: "smtp.gmail.com",
//   port: 465,
//   secure: true, // true for port 465, false for port 587
//   auth: {
//     user: process.env.SMTP_EMAIL,
//     pass: process.env.SMTP_PASSWORD,
//   },
// });

// // Verify the connection once at startup so you get a clear error immediately,
// // instead of only discovering a broken config when someone triggers send-otp.
// transporter.verify((error) => {
//   if (error) {
//     console.error("❌ Nodemailer SMTP connection failed:", error.message);
//   } else {
//     console.log("✅ Nodemailer SMTP connection ready");
//   }
// });

// export const sendOtpEmail = async (toEmail, otp, purpose = "login") => {
//   const subject = purpose === "signup" ? "Verify your email" : "Your login code";
//   const heading = purpose === "signup" ? "Verify your email address" : "Your one-time login code";

//   await transporter.sendMail({
//     from: `"Twidio" <${process.env.SMTP_EMAIL}>`,
//     to: toEmail,
//     subject,
//     html: `
//       <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
//         <h2>${heading}</h2>
//         <p>Your one-time code is:</p>
//         <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
//         <p style="color: #666; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
//       </div>
//     `,
//   });
// };

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOtpEmail = async (toEmail, otp, purpose = "login") => {
  const subject = purpose === "signup" ? "Verify your email" : "Your login code";
  const heading = purpose === "signup" ? "Verify your email address" : "Your one-time login code";

  await resend.emails.send({
    from: 'Twidio <onboarding@resend.dev>',
    to: toEmail,
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
        <h2>${heading}</h2>
        <p>Your one-time code is:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
        <p style="color: #666; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });
};