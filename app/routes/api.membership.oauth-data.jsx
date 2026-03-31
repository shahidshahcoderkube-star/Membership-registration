
export const loader = async ({ request }) => {
  try {
    // 1. Authenticate the App Proxy request from Shopify
    const { authenticate } = await import("../shopify.server");
    const { admin } = await authenticate.public.appProxy(request);
    if (!admin) {
      return Response.json({ success: false, message: "Unauthorized proxy request" }, { status: 401 });
    }

    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return Response.json({ success: false, message: "Missing token" }, { status: 400 });
    }

    // 2. Find the OAuth record
    const prisma = (await import("../db.server")).default;
    const oauthRecord = await prisma.oAuthVerification.findUnique({
      where: { id: token }
    });

    if (!oauthRecord) {
      return Response.json({ success: false, message: "Invalid or expired session." }, { status: 404 });
    }

    // 3. Check expiry
    if (new Date() > oauthRecord.expiresAt) {
      return Response.json({ success: false, message: "Session expired. Please try Google login again." }, { status: 400 });
    }

    // 4. Return the non-sensitive profile data
    return Response.json({
      success: true,
      data: {
        email: oauthRecord.email,
        firstName: oauthRecord.firstName,
        lastName: oauthRecord.lastName,
        provider: oauthRecord.provider
      }
    });

  } catch (error) {
    console.error("OAuth Data Fetch Error:", error);
    return Response.json({ success: false, message: "Server error fetching profile." }, { status: 500 });
  }
};
