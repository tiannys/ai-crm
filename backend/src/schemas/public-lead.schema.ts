import { z } from 'zod';

const optionalText = (maxLength: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().max(maxLength).optional(),
  );

export const publicLeadSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  email: z.string().trim().email('Enter a valid email address').max(254)
    .transform((value) => value.toLowerCase()),
  phone: optionalText(50),
  companyName: optionalText(200),
  jobTitle: optionalText(120),
  message: z.string().trim().min(10, 'Please provide at least 10 characters').max(5000),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Consent is required' }),
  }),
  // Honeypot: real users never see or fill this field.
  website: optionalText(200),
}).strict();

export type PublicLeadInput = z.infer<typeof publicLeadSchema>;
