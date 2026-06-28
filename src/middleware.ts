export { default } from "next-auth/middleware";

export const config = {
  // Protect the admin app; leave auth, ingestion, webhooks and cron open.
  matcher: [
    "/dashboard/:path*",
    "/contacts/:path*",
    "/pipeline/:path*",
    "/sequences/:path*",
    "/batches/:path*",
    "/deals/:path*",
    "/memberships/:path*",
    "/tasks/:path*",
    "/broadcasts/:path*",
    "/templates/:path*",
    "/audit/:path*",
    "/settings/:path*",
  ],
};
