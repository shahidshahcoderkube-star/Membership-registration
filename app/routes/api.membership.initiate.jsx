import { redirect } from "react-router";
import nodemailer from "nodemailer";

// Simple helper to generate a random 6-digit number
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return Response.json({ success: false, message: "Method not allowed" }, { status: 405 });
  }

  try {
    // 1. Authenticate the App Proxy request from Shopify
    const { authenticate } = await import("../shopify.server");
    const { admin } = await authenticate.public.appProxy(request);

    if (!admin) {
      return Response.json({ success: false, message: "Unauthorized proxy request" }, { status: 401 });
    }

    // 2. Parse the JSON body
    const body = await request.json();
    const { firstName, lastName, email, signature, agreement, oauthToken } = body;

    if (!email) {
      return Response.json({ success: false, message: "Email is required" }, { status: 400 });
    }

    // --- CHECK FOR OAUTH REGISTRATION ---
    if (oauthToken) {
      // 1. Verify the OAuth Token
      const prisma = (await import("../db.server")).default;
      const oauthRecord = await prisma.oAuthVerification.findUnique({ where: { id: oauthToken } });
      if (!oauthRecord || oauthRecord.email !== email || new Date() > oauthRecord.expiresAt) {
        return Response.json({ success: false, message: "Invalid or expired session. Please login again." }, { status: 400 });
      }

      // --- CRITICAL FIX: CHECK IF CUSTOMER ALREADY EXISTS ---
      const emailCheckResponse = await admin.graphql(
        `query getCustomerByEmail($query: String!) {
          customers(first: 1, query: $query) {
            edges { node { id } }
          }
        }`,
        { variables: { query: `email:${email}` } }
      );
      const emailCheckData = await emailCheckResponse.json();
      if (emailCheckData.data?.customers?.edges?.length > 0) {
        const providerName = oauthRecord.provider.charAt(0).toUpperCase() + oauthRecord.provider.slice(1);
        return Response.json({ success: false, message: `This ${providerName} account is already connected.` }, { status: 400 });
      }

      // 2. Finalize Registration IMMEDIATELY (Skip OTP)
      const { finalizeRegistration } = await import("../services/registration.server");
      try {
        await finalizeRegistration({
            admin,
            email,
            firstName,
            lastName,
            signature,
            agreement,
            createdAt: new Date()
        });

        // Cleanup OAuth record
        await prisma.oAuthVerification.delete({ where: { id: oauthToken } });

        return Response.json({ 
          success: true, 
          message: "Registration complete!",
          redirect: "/account/login" 
        });

      } catch (finalizeError) {
        console.error("OAuth Registration finalization error:", finalizeError);
        
        // If Shopify says the email is taken, it's a "connected" account error
        if (finalizeError.message.toLowerCase().includes("taken") || finalizeError.message.toLowerCase().includes("exists")) {
          const providerName = oauthRecord.provider.charAt(0).toUpperCase() + oauthRecord.provider.slice(1);
          return Response.json({ 
            success: false, 
            message: `This ${providerName} account is already connected.` 
          }, { status: 400 });
        }

        return Response.json({ success: false, message: finalizeError.message }, { status: 500 });
      }
    }

    // --- STANDARD OTP FLOW ---

    // 2.5. Check if email already exists in Shopify
    const emailCheckResponse = await admin.graphql(
      `query getCustomerByEmail($query: String!) {
        customers(first: 1, query: $query) {
          edges { node { id } }
        }
      }`,
      { variables: { query: `email:${email}` } }
    );
    const emailCheckData = await emailCheckResponse.json();
    if (emailCheckData.data?.customers?.edges?.length > 0) {
      return Response.json({ success: false, message: "Email already exists" }, { status: 400 });
    }

    // 3. Generate 6-digit Code & Expiry (1 MINUTE)
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 60 * 1000);

    // 4. Upsert data to Prisma
    const prisma = (await import("../db.server")).default;
    await prisma.otpVerification.upsert({
      where: { email },
      update: {
        otpCode,
        firstName,
        lastName,
        signature,
        agreement,
        expiresAt,
        createdAt: new Date()
      },
      create: { email, otpCode, firstName, lastName, signature, agreement, expiresAt }
    });

    // 5. Send Email Securely
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: "Your Membership Verification Code",
      text: `Hello ${firstName},\n\nYour Verification Code is: ${otpCode}\n\nThis code will expire in exactly 1 minute. Please enter it quickly on the website to complete your registration.\n\nThank you!`,
    };

    try {
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        await transporter.sendMail(mailOptions);
        console.log(`✅ SUCCESS: OTP sent to ${email}`);
      } else {
        console.warn(`⚠️ WARNING: SMTP credentials missing in .env! Cannot send email. Code: ${otpCode}`);
      }
    } catch (emailError) {
      console.error("Nodemailer failed:", emailError);
      return Response.json({ success: false, message: "Failed to send email. Check Nodemailer config." }, { status: 500 });
    }

    return Response.json({ success: true, message: "Verification code sent successfully!" });

  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("Fatal Initiate processing error:", error);
    return Response.json({ success: false, message: "Fatal server error occurred processing the form." }, { status: 500 });
  }
};
