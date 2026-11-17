-- Passwordless member sign-in (email OTP) does not set a password.
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;
