import { z } from "zod";
import { sendError } from "../utils/response.js";
import { branches, roles } from "../utils/constants.js";

export const etPhoneRegex = /^(?:\+2519\d{8}|09\d{8}|07\d{8})$/;
export const etPhoneMessage =
  "Phone number must be +2519XXXXXXXX, 09XXXXXXXX, or 07XXXXXXXX";
const normalizePhoneNumber = (value) => String(value ?? "").replace(/\s+/g, "").trim();
const requiredPhoneSchema = z
  .string()
  .transform(normalizePhoneNumber)
  .refine((value) => etPhoneRegex.test(value), etPhoneMessage);
const optionalPhoneSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return undefined;
    const normalized = normalizePhoneNumber(value);
    return normalized === "" ? undefined : normalized;
  },
  z.string().regex(etPhoneRegex, etPhoneMessage).optional(),
);
export const amharicNameRegex = /^[\u1200-\u137F\s]+$/;
const readingZoneEnum = z.enum([
  "Water Source Kebele",
  "Woze Kebele",
  "Edget Ber Kebele",
  "Central City Kebele",
  "Bere Kebele",
  "Chamo Kebele",
  "Doysa Kebele",
  "Dilfana Kebele",
  "Kulfo Kebele",
  "Gurba Kebele",
  "Gizola Kebele",
  "Shara Chano Kebele",
  "Chano Dorega Kebele",
]);

export const registerSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  phone: requiredPhoneSchema,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const staffRoles = Object.values(roles).filter(
  (role) => role !== roles.CITIZEN,
);
const branchEnum = z.enum(branches);

export const createStaffSchema = z
  .object({
    name: z.string().min(3),
    email: z.string().email(),
    role: z.enum(staffRoles),
    phone: optionalPhoneSchema,
    password: z.string().min(6).optional(),
    confirmPassword: z.string().min(6).optional(),
    branch: branchEnum.optional(),
    status: z.enum(["active", "inactive"]).optional().default("active"),
  })
  .superRefine((data, context) => {
    if (
      data.password &&
      data.confirmPassword &&
      data.password !== data.confirmPassword
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }

    const requiresBranch =
      data.role !== roles.CITIZEN &&
      data.role !== roles.ADMIN &&
      data.role !== roles.DIRECTOR;

    if (requiresBranch && !data.branch) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["branch"],
        message: "Branch is required for this role",
      });
    }
  });

export const updateUserSchema = z.object({
  name: z.string().min(3).optional(),
  email: z.string().email().optional(),
  phone: optionalPhoneSchema,
  role: z.enum(Object.values(roles)).optional(),
  branch: branchEnum.optional(),
  status: z.enum(["active", "inactive"]).optional(),
  isActive: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

export const updateProfileSchema = z
  .object({
    name: z.string().min(3).optional(),
    email: z.string().email().optional(),
    phone: optionalPhoneSchema,
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.email !== undefined ||
      data.phone !== undefined,
    {
      message: "At least one profile field is required",
    },
  );

export const requestApprovalSchema = z.object({
  note: z.string().max(500).optional(),
});

export const inspectionSchema = z.object({
  toolsRequired: z
    .array(
      z.object({
        toolId: z.string().min(1),
        quantity: z.coerce.number().positive(),
      }),
    )
    .min(1),
  notes: z.string().min(3),
});

const toolSourceEnum = z.enum(["Warehouse", "Store", "Local", "Service"]);

export const createToolSchema = z.object({
  code: z.string().trim().min(1).max(40),
  description: z.string().trim().min(2).max(200),
  source: toolSourceEnum,
  measurement: z.string().trim().min(1).max(40),
  stockPrice: z.coerce.number().min(0),
  customerPrice: z.coerce.number().min(0),
});

export const updateToolSchema = z
  .object({
    code: z.string().trim().min(1).max(40).optional(),
    description: z.string().trim().min(2).max(200).optional(),
    source: toolSourceEnum.optional(),
    measurement: z.string().trim().min(1).max(40).optional(),
    stockPrice: z.coerce.number().min(0).optional(),
    customerPrice: z.coerce.number().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.code !== undefined ||
      data.description !== undefined ||
      data.source !== undefined ||
      data.measurement !== undefined ||
      data.stockPrice !== undefined ||
      data.customerPrice !== undefined ||
      data.isActive !== undefined,
    {
      message: "At least one tool field is required",
    },
  );

const configurationWorkflowSchema = z
  .object({
    requiredTechniciansForCompletion: z.coerce.number().int().min(1).max(10).optional(),
    autoAssignSurveyor: z.boolean().optional(),
    autoAssignTechnicians: z.boolean().optional(),
    autoAssignMeterReader: z.boolean().optional(),
  })
  .optional();

const configurationPaymentsSchema = z
  .object({
    requireReceiptUpload: z.boolean().optional(),
    allowResubmissionAfterRejection: z.boolean().optional(),
    supportedMethods: z.array(z.string().trim().min(2).max(120)).max(80).optional(),
  })
  .optional();

const configurationToolsSchema = z
  .object({
    maxImportFileSizeMb: z.coerce.number().min(1).max(50).optional(),
    updateDuplicateCodeOnImport: z.boolean().optional(),
  })
  .optional();

const configurationNotificationsSchema = z
  .object({
    notifyCitizenOnStatusChange: z.boolean().optional(),
    notifyAssigneeOnAutoAssignment: z.boolean().optional(),
  })
  .optional();

const configurationCitizenPortalSchema = z
  .object({
    showAssignedMeterReaderInfo: z.boolean().optional(),
  })
  .optional();

export const updateConfigurationSchema = z
  .object({
    workflow: configurationWorkflowSchema,
    payments: configurationPaymentsSchema,
    tools: configurationToolsSchema,
    notifications: configurationNotificationsSchema,
    citizenPortal: configurationCitizenPortalSchema,
  })
  .refine(
    (data) =>
      data.workflow !== undefined ||
      data.payments !== undefined ||
      data.tools !== undefined ||
      data.notifications !== undefined ||
      data.citizenPortal !== undefined,
    {
      message: "At least one configuration section is required",
    },
  );

export const paymentSubmissionSchema = z.object({
  transactionId: z.string().min(2),
  paymentMethod: z.string().min(2),
});

export const paymentVerificationSchema = z.object({
  note: z.string().max(500).optional(),
});

export const paymentRejectionSchema = z.object({
  rejectionReason: z.string().min(3),
});

export const completionSchema = z.object({
  note: z.string().max(500).optional(),
});

export const issueSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  waterConnectionCode: z.string().min(4),
  customerCode: z.string().min(4),
  category: z.string().optional().default("general"),
  location: z.object({
    latitude: z.coerce.number(),
    longitude: z.coerce.number(),
    address: z.string().optional().default(""),
  }),
  attachments: z.array(z.string().url()).optional().default([]),
});

export const issueTechnicianUpdateSchema = z.object({
  toolsRequired: z
    .array(
      z.object({
        code: z.string().min(1),
        description: z.string().min(1),
        source: z.string().min(1),
        quantity: z.coerce.number().positive(),
        unitPrice: z.coerce.number().positive(),
      }),
    )
    .optional()
    .default([]),
  note: z.string().max(500).optional(),
});

export const newConnectionSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(3, "Customer name must be at least 3 characters")
    .max(80, "Customer name must not exceed 80 characters"),
  customerNameAmharic: z
    .string()
    .trim()
    .min(2, "Customer name in Amharic must be at least 2 characters")
    .max(80, "Customer name in Amharic must not exceed 80 characters")
    .regex(amharicNameRegex, "Customer name in Amharic must use Amharic letters only"),
  email: z.string().email("Enter a valid email address"),
  tinNumber: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "TIN number must be exactly 10 digits"),
  phoneNumber: z
    .string()
    .transform(normalizePhoneNumber)
    .refine((value) => etPhoneRegex.test(value), etPhoneMessage),
  numberOfFamily: z.coerce
    .number()
    .int("Number of family members must be a whole number")
    .min(1, "Number of family members must be at least 1")
    .max(30, "Number of family members must not exceed 30"),
  address: z
    .string()
    .trim()
    .min(5, "Address must be at least 5 characters")
    .max(150, "Address must not exceed 150 characters"),
  houseNumberZone: z
    .string()
    .trim()
    .min(2, "House number/zone must be at least 2 characters")
    .max(60, "House number/zone must not exceed 60 characters"),
  readingZone: readingZoneEnum,
  meterSize: z.enum([
    "15mm",
    "20mm",
    "25mm",
    "32mm",
    "3/8 Inch",
    "1/4 Inch",
    "1/2 Inch",
    "3/4 Inch",
    "1 Inch",
    "1 1/2 Inch",
    "2 Inch",
  ]),
  customerGroup: z.enum([
    "Domestic",
    "Commercial",
    "Government",
    "Residential",
    "Industry",
    "Communal",
    "Hydrant",
    "NGO",
    "Religious Organization",
    "Public Fountain",
    "Master Meter",
    "Bono",
    "Administrative",
    "Employee",
    "Lavaggio",
    "Public Health Institute",
    "Regional and Federal Institution",
    "Local Government",
  ]),
  type: z.enum([
    "Private",
    "Shared",
    "Tap",
    "Hydrant",
    "Cattle Drink",
    "Well",
  ]),
  serviceType: z.string().default("New Water Connection"),
  description: z
    .string()
    .trim()
    .max(500, "Description must not exceed 500 characters")
    .optional()
    .default(""),
  branch: branchEnum,
  location: z.object({
    latitude: z
      .coerce
      .number()
      .min(3, "Latitude must be within Ethiopia")
      .max(15, "Latitude must be within Ethiopia"),
    longitude: z
      .coerce
      .number()
      .min(33, "Longitude must be within Ethiopia")
      .max(48, "Longitude must be within Ethiopia"),
  }),
  housePlan: z.string().url(),
  idCard: z.string().url(),
  attachments: z.array(z.string().url()).optional().default([]),
});

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const firstError = result.error.issues[0];
      return sendError(res, 400, firstError?.message || "Validation failed");
    }

    req.body = result.data;
    next();
  };
}
