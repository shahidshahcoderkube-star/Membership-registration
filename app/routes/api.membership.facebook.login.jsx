import { redirect } from "react-router";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const returnTo = url.searchParams.get("return_to") || "/";

  if (!shop) {
    return new Response("Missing shop parameter", { status: 400 });
  }

  const clientId = process.env.FACEBOOK_CLIENT_ID;
  if (!clientId) {
    return new Response("Server configuration error: Facebook App ID not found.", { status: 500 });
  }

  // Force https:// for the redirect URI because Facebook requires it
  const hostUrl = url.origin.replace("http://", "https://");
  const redirectUri = `${hostUrl}/api/auth/facebook/callback`;

  console.log("DEBUG: Sending Redirect URI to Facebook ->", redirectUri);

  // Build Facebook OAuth URL
  const facebookAuthUrl = new URL('https://www.facebook.com/v12.0/dialog/oauth');
  facebookAuthUrl.searchParams.set('client_id', clientId);
  facebookAuthUrl.searchParams.set('redirect_uri', redirectUri);
  facebookAuthUrl.searchParams.set('state', JSON.stringify({ shop, returnTo }));
  facebookAuthUrl.searchParams.set('scope', 'email,public_profile');
  facebookAuthUrl.searchParams.set('response_type', 'code');

  return redirect(facebookAuthUrl.toString());
};
