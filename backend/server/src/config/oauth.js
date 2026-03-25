import crypto from "crypto";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../models/User.js";
import { roles } from "../utils/constants.js";
import { env } from "./env.js";

let oauthConfigured = false;

function randomPassword() {
  return crypto.randomBytes(24).toString("hex");
}

function firstDefinedEmail(profile) {
  const email = profile?.emails?.find((entry) => entry?.value)?.value;
  return email ? String(email).trim().toLowerCase() : "";
}

async function findOrCreateCitizenFromOAuth(profile, provider) {
  const email = firstDefinedEmail(profile);

  if (!email) {
    throw new Error(`${provider} account did not provide an email address`);
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return existingUser;
  }

  const displayName = String(profile?.displayName || "").trim();
  const fallbackName =
    displayName ||
    String(profile?.username || "").trim() ||
    email.split("@")[0] ||
    "Citizen User";

  return User.create({
    name: fallbackName,
    email,
    password: randomPassword(),
    role: roles.CITIZEN,
    status: "active",
    firstLogin: false,
  });
}

export function isGoogleOAuthEnabled() {
  return Boolean(
    env.oauthGoogleClientId &&
    env.oauthGoogleClientSecret &&
    env.oauthGoogleCallbackUrl,
  );
}

export function configureOAuth() {
  if (oauthConfigured) {
    return;
  }

  if (isGoogleOAuthEnabled()) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: env.oauthGoogleClientId,
          clientSecret: env.oauthGoogleClientSecret,
          callbackURL: env.oauthGoogleCallbackUrl,
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const user = await findOrCreateCitizenFromOAuth(profile, "Google");
            done(null, user);
          } catch (error) {
            done(error);
          }
        },
      ),
    );
  }

  oauthConfigured = true;
}
