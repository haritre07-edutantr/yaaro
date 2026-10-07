declare namespace Cloudflare {
  interface Env {
    FCM_SERVICE_ACCOUNT?: string;
    APNS_KEY_ID?: string;
    APNS_TEAM_ID?: string;
    APNS_PRIVATE_KEY?: string;
    APNS_BUNDLE_ID?: string;
    APNS_ENVIRONMENT?: string;
    SUPABASE_URL?: string;
    SUPABASE_PUBLISHABLE_KEY?: string;
    PUBLIC_APP_ORIGIN?: string;
    AUTH_EMAIL_DELIVERY_READY?: string;
    SUPER_ADMIN_USER_ID?: string;
    TURN_URLS?: string;
    TURN_SHARED_SECRET?: string;
    CLOUDFLARE_TURN_KEY_ID?: string;
    CLOUDFLARE_TURN_API_TOKEN?: string;
    SPACE_HUB?: DurableObjectNamespace;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
