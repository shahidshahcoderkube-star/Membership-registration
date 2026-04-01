import { redirect } from "react-router";

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


  // 3. Check if Shopify customer already exists and Store in Prisma
  try {
    const prisma = (await import("../db.server")).default;
    const shopify = (await import("../shopify.server")).default;

    // Determine the actual shop domain for API calls
    let targetShop = shop;
    let targetReturnTo = "/";
    try {
      const stateObj = JSON.parse(shop);
      targetShop = stateObj.shop;
      targetReturnTo = stateObj.returnTo;
    } catch (e) {
      // Fallback
    }

    // A. Check if customer exists in Shopify
    const { admin } = await shopify.unauthenticated.admin(targetShop);
    const response = await admin.graphql(
      `#graphql
      query findCustomerByEmail($query: String!) {
        customers(first: 1, query: $query) {
          nodes {
            id
          }
        }
      }
      `,
      {
        variables: {
          query: `email:${email}`,
        },
      }
    );

    const responseJson = await response.json();
    const existingCustomers = responseJson.data?.customers?.nodes || [];

    if (existingCustomers.length > 0) {
      console.log(`Google Registration: Customer already exists for ${email}`);
      const cleanReturnTo = targetReturnTo.startsWith('/') ? targetReturnTo : `/${targetReturnTo}`;
      const separator = cleanReturnTo.includes('?') ? '&' : '?';
      const errorUrl = `https://${targetShop}${cleanReturnTo}${separator}error=account_exists`;
      return redirect(errorUrl);
    }

    // B. Create/Update the temporary OAuth record 
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

    // 4. Redirect back to the original page with the token
    const cleanReturnTo = targetReturnTo.startsWith('/') ? targetReturnTo : `/${targetReturnTo}`;
    const separator = cleanReturnTo.includes('?') ? '&' : '?';
    const finalReturnUrl = `https://${targetShop}${cleanReturnTo}${separator}oauth_token=${oauthRecord.id}`;
    
    return redirect(finalReturnUrl);

  } catch (error) {
    console.error("Google OAuth Callback Error:", error);
    return new Response("An unexpected error occurred during Google registration. Please try again.", { status: 500 });
  }
};

