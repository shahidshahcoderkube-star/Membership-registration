import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function Index() {
  const customerAdminUrl = "https://admin.shopify.com/store/floralive/customers";

  return (
    <s-page heading="Membership Registration">
      <s-section heading="Application Installed Successfully">
        <s-paragraph>
          Your <strong>Membership Registration</strong> app is fully configured and active.
        </s-paragraph>
        <s-paragraph>
          All new members who register via your website form will appear in your Shopify Customers list with their signed membership agreements attached to their profiles.
        </s-paragraph>

        <s-stack direction="inline" gap="base" padding-block-start="base">
          <s-button
            variant="primary"
            href={customerAdminUrl}
            target="_top"
          >
            View Registered Customers
          </s-button>
        </s-stack>
      </s-section>

      <s-section heading="Quick Tips">
        <s-unordered-list>
          <s-list-item>
            To see a member's signed agreement, open their customer profile and look for the <strong>Membership Agreement</strong> file in the Metafields section.
          </s-list-item>
          <s-list-item>
            The registration form is currently active on your "Membership Registration" pages.
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}
