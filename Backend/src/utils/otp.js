import crypto from "crypto";
import bcrypt from "bcrypt";

// Generates a 6-digit numeric OTP and its bcrypt hash for storage.
// Only the hash is ever saved to the DB — same principle as password hashing —
// so a database leak doesn't expose usable OTPs.
export const generateOtp = async () => {
  const otp = crypto.randomInt(100000, 999999).toString();
  const hashedOtp = await bcrypt.hash(otp, 10);
  return { otp, hashedOtp };
};

export const verifyOtpHash = async (plainOtp, hashedOtp) => {
  return await bcrypt.compare(plainOtp, hashedOtp);
};