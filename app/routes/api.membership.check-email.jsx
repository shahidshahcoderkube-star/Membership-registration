import { json } from "@react-router/node";

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ success: false, message: "Method not allowed" }, { status: 405 });
  }

  try {
    // 1. Authenticate the App Proxy request from Shopify
    let auth;
    try {
      const { authenticate } = await import("../shopify.server");
      auth = await authenticate.public.appProxy(request);
      console.log(`[Check Email] Authenticated for shop: ${auth.session?.shop}`);
    } catch (authError) {
      console.error("❌ Proxy Auth Error:", authError.message);
      return json({ 
        success: false, 
        message: "Invalid proxy signature." 
      }, { status: 400 });
    }

    const { admin } = auth;

    // 2. Parse the JSON body
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return json({ success: false, message: "Email is required" }, { status: 400 });
    }

    // 3. Query Shopify to check if customer exists
    const emailCheckResponse = await admin.graphql(
      `query getCustomerByEmail($query: String!) {
        customers(first: 1, query: $query) {
          edges {
            node {
              id
              email
            }
          }
        }
      }`,
      { variables: { query: `email:${email}` } }
    );

    const emailCheckData = await emailCheckResponse.json();
    const customerFound = emailCheckData.data?.customers?.edges?.length > 0;

    return json({ 
      success: true, 
      registered: customerFound 
    });

  } catch (error) {
    console.error("Fatal Check Email error:", error);
    return json({ success: false, message: "Server error occurred." }, { status: 500 });
  }
};
