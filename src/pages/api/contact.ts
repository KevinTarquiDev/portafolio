import type { APIRoute } from "astro";
import {
  BREVO_API_KEY,
  CONTACT_SENDER_EMAIL,
  CONTACT_SENDER_NAME,
  CONTACT_RECIPIENT_EMAIL,
} from "astro:env/server";
import type { BrevoConfig } from "../../lib/brevo";
import { resolveSenderName, sendContactEmail } from "../../lib/brevo";
import { handleContactRequest } from "../../lib/contact-handler";
import { hitRateLimit, rateLimitKey } from "../../lib/rate-limit";
import { getResume } from "../../lib/resume";

// Única ruta on-demand del sitio: todo lo demás es estático.
export const prerender = false;

function resolveConfig(): BrevoConfig | null {
  if (!BREVO_API_KEY || !CONTACT_SENDER_EMAIL) {
    return null;
  }

  const { basics } = getResume("es");

  return {
    apiKey: BREVO_API_KEY,
    senderEmail: CONTACT_SENDER_EMAIL,
    senderName: resolveSenderName(CONTACT_SENDER_NAME, basics["x-displayName"]),
    recipientEmail: CONTACT_RECIPIENT_EMAIL ?? basics.email,
  };
}

export const POST: APIRoute = async ({ request }) => {
  return handleContactRequest(request, {
    config: resolveConfig(),
    send: sendContactEmail,
    rateLimit: (req) => hitRateLimit(rateLimitKey(req)),
  });
};
