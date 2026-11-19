# Royal Palm Aerial Photography: website

A one-page static site for Azure Static Web Apps, with a small Azure Function (`/api/contact`) that emails you each contact-form request.

```
index.html                  The homepage
404.html                    "Page not found" page
staticwebapp.config.json    Azure Static Web Apps settings (API runtime, 404, security headers)
assets/                     Logo mark, gold watermark, favicon (SVG)
images/                     Put your photos here (see images/README.txt)
api/                        Azure Function for the contact form (Node 20)
```

## 1. Before you publish

- Replace every `[bracketed]` placeholder in `index.html`: prices, number of photos, video length, turnaround, phone number (also the `tel:` link).
- Add your photos to `images/` and swap each placeholder box for the commented `<img>` line next to it.
- Make sure "FAA Part 107 certified" and "Fully insured" are true on launch day.
- Change `hello@royalpalmaerial.com` if you'll use a different address.

To preview locally, open `index.html` in a browser. The form only works once deployed (or with the SWA CLI, below).

## 2. Deploy to Azure Static Web Apps (Free plan)

**Option A: GitHub (recommended, auto-deploys on every push)**
1. Put this folder in a GitHub repository.
2. Azure Portal > Create a resource > **Static Web App**. Plan: **Free**. Source: **GitHub**, pick the repo and branch.
3. Build details: Build preset **Custom**, App location `/`, Api location `api`, Output location *(leave empty)*.
4. Azure adds a GitHub Actions workflow to the repo and deploys. Your site appears at `https://<random-name>.azurestaticapps.net`.

**Option B: SWA CLI (no GitHub)**
```
npm install -g @azure/static-web-apps-cli
cd api && npm install && cd ..
swa deploy . --api-location api --env production --deployment-token <token from the portal>
```
Local test with the API running: `swa start . --api-location api`

## 3. Make the contact form send email

The function uses **Azure Communication Services (ACS) Email**.

1. Create an **Email Communication Services** resource. Under *Provision domains*, either add the free Azure-managed domain (fastest) or add `royalpalmaerial.com` as a custom domain and add the DNS records it shows you (SPF, DKIM) so mail comes from your own domain.
2. Create a **Communication Services** resource and, under *Email > Domains*, connect the domain from step 1.
3. Copy the Communication Services **connection string** (Keys blade).
4. In the Static Web App: **Settings > Environment variables**, add:

| Name | Value |
|---|---|
| `ACS_CONNECTION_STRING` | the connection string |
| `CONTACT_FROM` | the sender address ACS gives you, e.g. `DoNotReply@royalpalmaerial.com` |
| `CONTACT_TO` | the inbox that should receive requests |

5. Submit the form on the live site to test. Replying to the email goes straight to the customer (the function sets Reply-To).

ACS email is billed per message at a fraction of a cent, so a contact form costs pennies a month.

**Simpler alternative: Formspree.** Create a form at formspree.io, then in `index.html` change
`const FORM_ENDPOINT = "/api/contact";` to your Formspree URL. You can then delete the `api/` folder.

## 4. Custom domain

Static Web App > **Custom domains** > Add:
- `www.royalpalmaerial.com`: add the CNAME record it shows at your domain registrar.
- `royalpalmaerial.com` (apex): use the TXT validation record, then an ALIAS/ANAME record if your registrar supports it, or move DNS to Azure DNS.

HTTPS certificates are issued and renewed automatically.
