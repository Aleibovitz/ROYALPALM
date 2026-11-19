// POST /api/contact
// Receives the website's contact form and emails it to you
// through Azure Communication Services Email.
//
// Required application settings (Static Web App > Settings > Environment variables):
//   ACS_CONNECTION_STRING  Connection string of your Azure Communication Services resource
//   CONTACT_FROM           Verified sender address, e.g. DoNotReply@royalpalmaerial.com
//   CONTACT_TO             Where requests go, e.g. hello@royalpalmaerial.com

const { app } = require("@azure/functions");
const { EmailClient } = require("@azure/communication-email");

const LIMITS = { name: 120, email: 200, phone: 40, service: 60, address: 300, message: 4000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value, max) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

app.http("contact", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { error: "Invalid request." } };
    }

    // Honeypot: real people never fill the hidden "company" field.
    if (body && body.company) {
      return { status: 200, jsonBody: { ok: true } };
    }

    const f = {};
    for (const [key, max] of Object.entries(LIMITS)) f[key] = clean(body?.[key], max);

    if (!f.name) return { status: 400, jsonBody: { error: "Name is required." } };
    if (!EMAIL_RE.test(f.email)) return { status: 400, jsonBody: { error: "A valid email is required." } };

    const { ACS_CONNECTION_STRING, CONTACT_FROM, CONTACT_TO } = process.env;
    if (!ACS_CONNECTION_STRING || !CONTACT_FROM || !CONTACT_TO) {
      context.error("Contact form is not configured: missing app settings.");
      return { status: 500, jsonBody: { error: "Server not configured." } };
    }

    const subject = `New shoot request: ${f.service || "General"} - ${f.name}`.replace(/[\r\n]+/g, " ");
    const plainText = [
      "New request from royalpalmaerial.com",
      "",
      `Name:     ${f.name}`,
      `Email:    ${f.email}`,
      `Phone:    ${f.phone || "-"}`,
      `Service:  ${f.service || "-"}`,
      `Address:  ${f.address || "-"}`,
      "",
      "Message:",
      f.message || "-",
    ].join("\n");

    try {
      const client = new EmailClient(ACS_CONNECTION_STRING);
      const poller = await client.beginSend({
        senderAddress: CONTACT_FROM,
        recipients: { to: [{ address: CONTACT_TO }] },
        replyTo: [{ address: f.email, displayName: f.name }],
        content: { subject, plainText },
      });
      await poller.pollUntilDone();
      return { status: 200, jsonBody: { ok: true } };
    } catch (err) {
      context.error("Email send failed:", err?.message || err);
      return { status: 502, jsonBody: { error: "Could not send right now." } };
    }
  },
});
