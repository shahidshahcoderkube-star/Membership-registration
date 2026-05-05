import { redirect } from "react-router";

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

    const { email, otpCode } = await request.json();
    if (!email || !otpCode) {
      return Response.json({ success: false, message: "Email and OTP are required" }, { status: 400 });
    }

    // 1. Verify OTP
    const prisma = (await import("../db.server")).default;
    const verification = await prisma.otpVerification.findUnique({ where: { email } });
    if (!verification) {
      return Response.json({ success: false, message: "Registration not initiated or expired." }, { status: 400 });
    }
    if (verification.otpCode !== otpCode) {
      return Response.json({ success: false, message: "Invalid verification code." }, { status: 400 });
    }
    if (new Date() > verification.expiresAt) {
      return Response.json({ success: false, message: "Verification code expired. Please request a new one." }, { status: 400 });
    }

    // 2. Finalize Registration using shared service
    const { finalizeRegistration } = await import("../services/registration.server");
    try {
      await finalizeRegistration({
        admin,
        email: verification.email,
        firstName: verification.firstName,
        lastName: verification.lastName,
        signature: verification.signature,
        agreement: verification.agreement,
        createdAt: verification.createdAt
      });

      // Cleanup OTP
      await prisma.otpVerification.delete({ where: { email } });

      return Response.json({ 
        success: true, 
        message: "Registration complete!",
        redirect: "/account/login" 
      });

    } catch (finalizeError) {
      console.error("Finalization error:", finalizeError);
      
      // If Shopify says the email is taken, it's a "connected" account error
      if (finalizeError.message.toLowerCase().includes("taken") || finalizeError.message.toLowerCase().includes("exists")) {
        return Response.json({ 
          success: false, 
          message: `This account is already connected.` 
        }, { status: 400 });
      }

      return Response.json({ success: false, message: finalizeError.message }, { status: 500 });
    }

  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("Verification processing error:", error);
    return Response.json({ success: false, message: "Fatal server error occurred verifying the OTP." }, { status: 500 });
  }
};
