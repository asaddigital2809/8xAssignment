/**
 * Creates a throwaway Ethereal SMTP inbox and prints the env lines for it.
 * Mail sent through it is never delivered; open https://ethereal.email/login with
 * these credentials (or the preview URL logged per message) to read it.
 *
 *   npm run email:ethereal
 */
import nodemailer from "nodemailer";

nodemailer.createTestAccount().then(
  (account) => {
    console.log(`SMTP_HOST=${account.smtp.host}`);
    console.log(`SMTP_PORT=${account.smtp.port}`);
    console.log(`SMTP_USER=${account.user}`);
    console.log(`SMTP_PASS=${account.pass}`);
  },
  (err) => {
    console.error("Could not create an Ethereal account:", err.message);
    process.exit(1);
  },
);
