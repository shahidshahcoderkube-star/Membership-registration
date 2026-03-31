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

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: "Your NEW Membership Verification Code",
      text: `Hello ${pendingRegistration.firstName},\n\nYou requested a new verification code.\n\nYour NEW Verification Code is: ${newOtpCode}\n\nThis code will expire in exactly 1 minute. Please enter it on the website to complete your registration.\n\nThank you!`,
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
