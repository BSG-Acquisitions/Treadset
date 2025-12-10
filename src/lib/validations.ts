import { z } from "zod";

// Relaxed phone validation - accepts common US formats
const phoneRegex = /^(\+?1?[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/;

export const pricingTierSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().optional(),
  rate: z.number().min(0, "Rate must be positive").optional(),
});

export const clientSchema = z.object({
  company_name: z.string().min(1, "Company name is required").max(200, "Company name must be less than 200 characters"),
  contact_name: z.string().max(200, "Contact name must be less than 200 characters").optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  phone: z.string().regex(phoneRegex, "Invalid phone format").optional().or(z.literal("")),
  notes: z.string().max(2000, "Notes must be less than 2000 characters").optional(),
  // Address fields - REQUIRED for manifest generation
  mailing_address: z.string().min(1, "Street address is required for manifests").max(500, "Address must be less than 500 characters"),
  city: z.string().min(1, "City is required for manifests").max(100, "City must be less than 100 characters"),
  state: z.string().min(2, "State is required for manifests").max(2, "State must be 2 characters"),
  zip: z.string().min(1, "ZIP code is required for manifests").max(10, "ZIP code must be less than 10 characters"),
  county: z.string().min(1, "County is required for manifests").max(100, "County must be less than 100 characters"),
});

export const locationSchema = z.object({
  client_id: z.string().uuid("Client is required"),
  name: z.string().max(200, "Name must be less than 200 characters").optional(),
  address: z.string().min(1, "Address is required").max(500, "Address must be less than 500 characters"),
  access_notes: z.string().max(1000, "Access notes must be less than 1000 characters").optional(),
  pricing_tier_id: z.string().uuid().optional(),
  is_active: z.boolean().default(true),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const vehicleSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name must be less than 200 characters"),
  license_plate: z.string().max(20, "License plate must be less than 20 characters").optional(),
  capacity: z.number().int().min(1, "Capacity must be at least 1").optional(),
  is_active: z.boolean().default(true),
});

export type PricingTierFormData = z.infer<typeof pricingTierSchema>;
export type ClientFormData = z.infer<typeof clientSchema>;
export type LocationFormData = z.infer<typeof locationSchema>;
export type VehicleFormData = z.infer<typeof vehicleSchema>;
