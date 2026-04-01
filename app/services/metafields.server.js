export async function ensureMetafieldDefinitions(admin) {
  const namespace = "custom";
  const key = "membership_agreement";
  
  try {
    // 1. Check if the definition already exists
    const checkResponse = await admin.graphql(
      `#graphql
      query getMetafieldDefinition($ownerType: MetafieldOwnerType!, $query: String!) {
        metafieldDefinitions(first: 1, ownerType: $ownerType, query: $query) {
          edges {
            node {
              id
            }
          }
        }
      }`,
      {
        variables: {
          ownerType: "CUSTOMER",
          query: `namespace:'${namespace}' AND key:'${key}'`
        }
      }
    );

    const checkData = await checkResponse.json();
    if (checkData.data?.metafieldDefinitions?.edges?.length > 0) {
      // Definition exists, we're good
      return;
    }

    // 2. Not found, so create it
    console.log(`🚀 Creating missing metafield definition: ${namespace}.${key}`);
    const createResponse = await admin.graphql(
      `#graphql
      mutation metafieldDefinitionCreate($definition: MetafieldDefinitionInput!) {
        metafieldDefinitionCreate(definition: $definition) {
          createdDefinition {
            id
            name
            type {
              name
            }
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          definition: {
            name: "Membership Agreement Signature PDF",
            namespace,
            key,
            description: "Stores the link to the signed membership agreement PDF generated during registration.",
            type: "file_reference",
            ownerType: "CUSTOMER"
          }
        }
      }
    );

    const createData = await createResponse.json();
    if (createData.data?.metafieldDefinitionCreate?.userErrors?.length > 0) {
      console.error("❌ Failed to create metafield definition:", createData.data.metafieldDefinitionCreate.userErrors);
    } else {
      console.log(`✅ Metafield definition created successfully: ${namespace}.${key}`);
    }

  } catch (error) {
    // We catch everything so the app doesn't crash if Shopify API has a hiccup
    console.error("⚠️ Silent setup failure during metafield check:", error);
  }
}
