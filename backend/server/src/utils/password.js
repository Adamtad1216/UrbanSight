import crypto from "crypto";

const TEMP_PASSWORD_LENGTH = 12;
const PASSWORD_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";

export function generateTemporaryPassword(length = TEMP_PASSWORD_LENGTH) {
  const bytes = crypto.randomBytes(length);
  let password = "";

  for (let index = 0; index < length; index += 1) {
    const alphabetIndex = bytes[index] % PASSWORD_ALPHABET.length;
    password += PASSWORD_ALPHABET[alphabetIndex];
  }

  return password;
}
