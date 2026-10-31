export default {
  providers: [
    {
      // Format: https://<clerk-domain>.clerk.accounts.dev
      // Set CLERK_JWT_ISSUER_DOMAIN in Convex dashboard env vars
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN as string,
      applicationID: "convex",
    },
  ],
};
