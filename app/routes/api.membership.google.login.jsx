import { redirect } from "react-router";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return new Response("Missing shop parameter", { status: 400 });
  }

  // Force https:// for the redirect URI because Google requires it, 
  // and local proxies sometimes report http:// internally.
  const hostUrl = url.origin.replace("http://", "https://");
  const redirectUri = `${hostUrl}/api/auth/google/callback`;

  console.log("DEBUG: Sending Redirect URI to Google ->", redirectUri);




  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return new Response("Server configuration error: Google Client ID not found.", { status: 500 });
  }

  const returnTo = url.searchParams.get("return_to") || "/";

  // Build Google OAuth URL
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', clientId);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('access_type', 'offline');
  googleAuthUrl.searchParams.set('prompt', 'consent');
  
  // SECURELY PASS THE SHOP AND RETURN URL TO GOOGLE
  const state = JSON.stringify({ shop, returnTo });
  googleAuthUrl.searchParams.set('state', state);


  return redirect(googleAuthUrl.toString());
};
