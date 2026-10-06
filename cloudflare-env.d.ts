declare namespace Cloudflare {
  interface Env {
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
