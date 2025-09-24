import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/connection";
import * as schema from "../db/schema/auth";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg", // PostgreSQL
    schema: schema,
  }),
  baseURL:
    process.env.NODE_ENV === "production"
      ? "https://rowad.speedballhub.com"
      : "http://localhost:2000",
  trustedOrigins:
    process.env.NODE_ENV === "production"
      ? [
          "https://rowad.speedballhub.com",
          "http://rowad.speedballhub.com",
          // Allow local development to access production API
          "http://localhost:3000",
          "http://localhost:3001",
          "http://127.0.0.1:3000",
        ]
      : [
          "http://localhost:3000",
          "http://localhost:3001",
          "http://127.0.0.1:3000",
        ],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true if you want to require email verification
    sendResetPassword: async ({ user, url, token }, request) => {
      // TODO: Implement email sending for password reset
      console.log(`Password reset for ${user.email}: ${url}`);
      console.log(`Reset token: ${token}`);

      // For now, just log the reset URL
      // In production, you would send an email here
      // Example:
      // await sendEmail({
      //   to: user.email,
      //   subject: "Reset your password",
      //   html: `<p>Click <a href="${url}">here</a> to reset your password.</p>`,
      // });
    },
  },
  user: {
    additionalFields: {
      // You can add additional fields here if needed
      // For example, if you want to store user roles, preferences, etc.
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  advanced: {
    database: { generateId: false }, // Use UUID for all IDs
  },
  plugins: [bearer()],
});
