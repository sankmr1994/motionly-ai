import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { getServerEnv } from "@motionly/config";
import { getDatabaseClient, getDatabaseHandle } from "@motionly/db";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { sendTransactionalEmail } from "./email";

const environment = getServerEnv();

export const auth = betterAuth({
  appName: "Motionly",
  baseURL: environment.APP_URL,
  secret: environment.BETTER_AUTH_SECRET,
  database: mongodbAdapter(getDatabaseHandle(), {
    client: getDatabaseClient(),
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 10,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendTransactionalEmail({
        to: user.email,
        subject: "Reset your Motionly password",
        heading: "Reset your password",
        message: "Use this secure link to choose a new Motionly password.",
        actionLabel: "Reset password",
        actionUrl: url,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendTransactionalEmail({
        to: user.email,
        subject: "Verify your Motionly email",
        heading: "Verify your email",
        message:
          "Confirm this email address to finish creating your Motionly account.",
        actionLabel: "Verify email",
        actionUrl: url,
      });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    database: { joins: true },
  },
  plugins: [nextCookies()],
});
