const { z } = require('zod');

const signupSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50),
    email: z.string().email(),
    password: z.string().min(6),
    country: z.string().min(2),
    city: z.string().min(2),
    referralCode: z.string().optional(),
    deviceId: z.string().optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string(),
    deviceId: z.string().optional(),
  }),
});

module.exports = {
  signupSchema,
  loginSchema,
};
