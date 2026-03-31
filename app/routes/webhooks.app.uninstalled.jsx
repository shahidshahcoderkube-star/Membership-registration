import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  try {
    const { shop, topic } = await authenticate.webhook(request);
    console.log(`✅ Webhook received: ${topic} for ${shop}`);

    if (shop) {
      await db.session.deleteMany({ where: { shop } });
      console.log(`✅ Sessions successfully deleted for ${shop}`);
    }

    return new Response();
  } catch (error) {
    console.error("❌ WEBHOOK ERROR in app/uninstalled:", error.message);
    if (error.stack) console.error(error.stack);
    
    // Explicitly return a 500 so we can see it in Shopify dashboard
    return new Response("Internal Server Error", { status: 500 });
  }
};

