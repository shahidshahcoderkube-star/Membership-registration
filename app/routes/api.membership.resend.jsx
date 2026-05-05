import nodemailer from "nodemailer";

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return Response.json({ success: false, message: "Method not allowed" }, { status: 405 });
  }

  try {
    const { authenticate } = await import("../shopify.server");
    const { admin } = await authenticate.public.appProxy(request);
    if (!admin) {
      return Response.json({ success: false, message: "Unauthorized proxy request" }, { status: 401 });
    }

    const { email } = await request.json();

    if (!email) {
      return Response.json({ success: false, message: "Email is required to resend" }, { status: 400 });
    }

    // 1. Verify they have a pending registration
    const prisma = (await import("../db.server")).default;
    const pendingRegistration = await prisma.otpVerification.findUnique({
      where: { email }
    });

    if (!pendingRegistration) {
      return Response.json({ success: false, message: "No pending registration found to resend." }, { status: 404 });
    }

    // 1.5. AUTOMATIC DATABASE CLEANUP
    // Delete any abandoned registrations older than 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    try {
      await Promise.all([
        prisma.otpVerification.deleteMany({ where: { createdAt: { lt: oneDayAgo } } }),
        prisma.oAuthVerification.deleteMany({ where: { createdAt: { lt: oneDayAgo } } })
      ]);
    } catch (cleanupError) {
      console.warn("Silent failure during DB cleanup:", cleanupError);
    }

    // 2. Generate new OTP and reset 1-minute clock
    const newOtpCode = generateOTP();
    const newExpiresAt = new Date(Date.now() + 60 * 1000); // 1 minute from now

    await prisma.otpVerification.update({
      where: { email },
      data: {
        otpCode: newOtpCode,
        expiresAt: newExpiresAt
      }
    });

    // 3. Resend the Email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const htmlTemplate = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; font-size: 24px; margin-bottom: 10px;">Your New Verification Code</h1>
          <p style="color: #666; font-size: 16px;">Hello ${pendingRegistration.firstName}, you requested a new verification code. Please use it below to complete your application.</p>
        </div>
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
          <span style="display: block; font-size: 36px; font-weight: bold; letter-spacing: 5px; color: #000;">${newOtpCode}</span>
        </div>
        <div style="text-align: center; color: #999; font-size: 14px;">
          <p>This code will expire in <strong>1 minute</strong>.</p>
          <p>If you did not request this code, please ignore this email.</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
        <div style="text-align: center; color: #bbb; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} Living Light Health. All rights reserved.</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: "Your NEW Membership Verification Code",
      text: `Hello ${pendingRegistration.firstName},\n\nYou requested a new verification code.\n\nYour NEW Verification Code is: ${newOtpCode}\n\nThis code will expire in 1 minute. Please enter it on the website to complete your registration.\n\nThank you!`,
      html: htmlTemplate
    };

    try {
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        await transporter.sendMail(mailOptions);
      } else {
        console.warn(`WARNING: Missing SMTP credentials. Resent OTP is ${newOtpCode}`);
      }
    } catch (emailError) {
      console.error("Nodemailer completely failed:", emailError);
      return Response.json({ success: false, message: "Failed to send email. Check Nodemailer config." }, { status: 500 });
    }

    // 4. Respond with success
    return Response.json({
      success: true,
      message: "New verification code sent!"
    });

  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    console.error("Resend processing error:", error);
    return Response.json({ success: false, message: "Fatal server error occurred resending OTP." }, { status: 500 });
  }
};
