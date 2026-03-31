import { redirect } from "react-router";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return new Response("Invalid request from Facebook. Missing code or state.", { status: 400 });
  }

  let shop, returnTo;
  try {
    const stateObj = JSON.parse(state);
    shop = stateObj.shop;
    returnTo = stateObj.returnTo;
  } catch (e) {
    return new Response("Invalid state parameter.", { status: 400 });
  }

  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new Response("Server configuration error: Facebook credentials not configured.", { status: 500 });
  }

  // Force https:// for the redirect URI
  const hostUrl = url.origin.replace("http://", "https://");
  const redirectUri = `${hostUrl}/api/auth/facebook/callback`;

  // 1. Exchange the code for an Access Token
  const tokenResponse = await fetch("https://graph.facebook.com/v12.0/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    console.error("Facebook Token Fetch Failed:", await tokenResponse.text());
    return new Response("Failed to authenticate with Facebook.", { status: 500 });
  }

  const tokenData = await tokenResponse.json();

  // 2. Fetch the User's Profile
  const profileResponse = await fetch(`https://graph.facebook.com/me?fields=id,first_name,last_name,email&access_token=${tokenData.access_token}`);
  
  if (!profileResponse.ok) {
    console.error("Facebook Profile Fetch Failed:", await profileResponse.text());
    return new Response("Failed to load Facebook profile.", { status: 500 });
  }

  const profile = await profileResponse.json();
  const { email, first_name, last_name } = profile;

  if (!email) {
    return new Response("Facebook account must have an email associated.", { status: 400 });
  }

  // 3. Store in Prisma temporary OAuth table
  const prisma = (await import("../db.server")).default;
  const oauthRecord = await prisma.oAuthVerification.upsert({
    where: { email },
    update: {
      firstName: first_name || "",
      lastName: last_name || "",
      provider: "facebook",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
    },
    create: {
      email,
      firstName: first_name || "",
      lastName: last_name || "",
      provider: "facebook",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  // 4. Redirect back to the original page
  const cleanReturnTo = returnTo.startsWith('/') ? returnTo : `/${returnTo}`;
  const separator = cleanReturnTo.includes('?') ? '&' : '?';
  const returnUrl = `https://${shop}${cleanReturnTo}${separator}oauth_token=${oauthRecord.id}`;

  return redirect(returnUrl);
};
