# Supabase Configuration Guide for CareerTwin AI (Vercel & Production)

Follow these simple steps in your **Supabase Dashboard** to make sure confirmation emails and authentication work flawlessly in production on Vercel without rate limits or localhost redirects.

---

## 1. Fix Confirmation Email Redirect URL (`localhost` ➔ Vercel URL)

When a user signs up and receives an email confirmation link, Supabase redirects them back to the configured URL. If your Supabase project still has `http://localhost:5000` or `http://localhost:3000` as the Site URL, the confirmation links will redirect to `localhost`.

### Steps:
1. Open your project on [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **Authentication** (left sidebar) ➔ **URL Configuration**.
3. Set **Site URL** to your Vercel production domain:
   ```text
   https://careertwin-ai.vercel.app
   ```
   *(Or your custom domain / deployed Vercel domain)*
4. Under **Redirect URLs**, click **Add URL** and add the following wildcard and exact patterns:
   - `https://careertwin-ai.vercel.app/**`
   - `https://*.vercel.app/**`
   - `http://localhost:5000/**` (so local development also works)
   - `http://localhost:3000/**`
5. Click **Save Changes**.

---

## 2. Fix "Email rate limit exceeded" on New Account Creation

Supabase's default shared email service has a strict rate limit of **3 to 4 emails per hour** per project on the free tier. When creating accounts repeatedly or testing, Supabase returns:
> `over_email_send_rate_limit: Email rate limit exceeded`

### Recommended Solution (Instant Signups without Rate Limits):
1. In your Supabase Dashboard, go to **Authentication** ➔ **Providers** ➔ **Email**.
2. Turn **OFF** the toggle **"Confirm email"** (disable email confirmation).
3. Click **Save**.
4. **Result:** New users can sign up and immediately start practicing without needing to wait for an email or hitting the 3-emails/hour restriction!

### Alternative Solution (If you want email confirmation with higher limits):
1. In Supabase Dashboard, go to **Project Settings** ➔ **Authentication** ➔ **SMTP Settings**.
2. Turn **Enable Custom SMTP** to **ON**.
3. Connect any free SMTP provider (such as [Resend](https://resend.com) with 3,000 emails/month free, SendGrid, or Gmail SMTP).
4. **Result:** Unlimited confirmation emails sent directly from your custom domain with zero Supabase rate limiting.

---

## 3. Recommended Environment Variables on Vercel

Ensure these environment variables are set in your **Vercel Project Settings ➔ Environment Variables**:

| Variable | Description |
| :--- | :--- |
| `VITE_SUPABASE_URL` | Your Supabase Project URL (`https://xyz.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase Project Anon/Public Key |
| `SUPABASE_URL` | Same as `VITE_SUPABASE_URL` |
| `SUPABASE_ANON_KEY` | Same as `VITE_SUPABASE_ANON_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | *(Optional but recommended)* Supabase Service Role Key from API Settings. When provided, enables server-side instant account creation with zero rate limits! |
| `DATABASE_URL` | Your Supabase PostgreSQL Connection String (Pooler or Direct) |
| `JWT_SECRET` | 32+ character random secret string |
| `OPENAI_API_KEY` or `GEMINI_API_KEY` | Your AI API Key |

---

## Summary of Code Enhancements Made in This Update:
- ✅ **Dynamic `emailRedirectTo`**: Both client-side `supabase.auth.signUp` and backend API now dynamically extract `${window.location.origin}/auth/callback` instead of any static fallback.
- ✅ **Admin Auto-Confirm Creation**: When `SUPABASE_SERVICE_ROLE_KEY` is present, the server uses `auth.admin.createUser({ email_confirm: true })`, completely eliminating the 3-emails/hour rate limit.
- ✅ **Rate Limit Warning & Guidance**: If the Supabase rate limit is reached on client signups, a clear, friendly alert explains how to disable "Confirm email" or sign in with Google.
