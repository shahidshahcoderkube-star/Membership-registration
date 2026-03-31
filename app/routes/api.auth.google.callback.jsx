import { redirect } from "react-router";
import { unauthenticated } from "../shopify.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const shop = url.searchParams.get("state"); // Our securely passed shop domain

  if (!code || !shop) {
    return new Response("Invalid request format. Missing code or state.", { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new Response("Server configuration error: Google credentials not configured.", { status: 500 });
  }

  // Force https:// to match the initial request and satisfy Google's strict requirements
  const hostUrl = url.origin.replace("http://", "https://");
  const redirectUri = `${hostUrl}/api/auth/google/callback`;


  // 1. Exchange the code for an Access Token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    console.error("Google Token Fetch Failed:", await tokenResponse.text());
    return new Response("Failed to authenticate with Google.", { status: 500 });
  }

  const tokenData = await tokenResponse.json();

  // 2. Fetch the User's Profile
  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!profileResponse.ok) {
    console.error("Google Profile Fetch Failed:", await profileResponse.text());
    return new Response("Failed to load Google profile.", { status: 500 });
  }

  const profile = await profileResponse.json();
  let firstName = profile.given_name || "";
  let lastName = profile.family_name || "";
  const email = profile.email;

  // If Google puts the full name in given_name, we split it.
  if (firstName && !lastName && firstName.includes(" ")) {
    const parts = firstName.trim().split(/\s+/);
    firstName = parts[0];
    lastName = parts.slice(1).join(" ");
  }

  if (!email) {
    return new Response("Google account must have an email associated.", { status: 400 });
  }


  // 3. Store in Prisma temporary OAuth table
  const prisma = (await import("../db.server")).default;
  const oauthRecord = await prisma.oAuthVerification.upsert({
    where: { email },
    update: {
      firstName: firstName,
      lastName: lastName,
      provider: "google",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
    },
    create: {
      email,
      firstName: firstName,
      lastName: lastName,
      provider: "google",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });


  // 4. Redirect back to the original page where the user started registration
  let returnUrl = `https://${shop}/?oauth_token=${oauthRecord.id}`;
  try {
    const stateObj = JSON.parse(shop);
    const finalShop = stateObj.shop;
    const finalReturnTo = stateObj.returnTo;
    
    // Ensure returnTo starts with /
    const cleanReturnTo = finalReturnTo.startsWith('/') ? finalReturnTo : `/${finalReturnTo}`;
    
    // Combine to form the full Shopify URL
    // We append the oauth_token so the liquid block can detect it
    const separator = cleanReturnTo.includes('?') ? '&' : '?';
    returnUrl = `https://${finalShop}${cleanReturnTo}${separator}oauth_token=${oauthRecord.id}`;
  } catch (e) {
    // Fallback if state is not JSON (e.g. from an old request)
    returnUrl = `https://${shop}/?oauth_token=${oauthRecord.id}`;
  }

  return redirect(returnUrl);

};

