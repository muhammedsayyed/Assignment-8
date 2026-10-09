import { z } from "zod";
import { generalValidationFields } from "../../common/validation.js";

export const loginSchema = z.strictObject({
    email: generalValidationFields.email,
    password: generalValidationFields.password
});

export const login = (lang) => {
    return z.object({
        body: loginSchema,
        query: z.strictObject({
            lang: z.string().length(2).optional()
        }).optional()
    });
};
login.safeParse = (data) => loginSchema.safeParse(data);
login.parse = (data) => loginSchema.parse(data);

export const signupSchema = loginSchema.extend({
    username: z.string().min(2),
    phone: generalValidationFields.phone,
    confirmPassword: generalValidationFields.password,
    gender: generalValidationFields.gender.optional(),
}).superRefine((data, ctx) => {
    generalValidationFields.matchFields({ original: "password", copy: "confirmPassword", data, ctx });
});

export const signup = (lang) => {
    return z.object({
        body: loginSchema.extend({
            username: generalValidationFields.username(lang),
            phone: generalValidationFields.phone,
            confirmPassword: generalValidationFields.password,
            gender: generalValidationFields.gender.optional(),
        }).superRefine((data, ctx) => {
            generalValidationFields.matchFields({ original: "password", copy: "confirmPassword", data, ctx });
        })
    });
};
signup.safeParse = (data) => signupSchema.safeParse(data);
signup.parse = (data) => signupSchema.parse(data);

export const confirmEmail = (lang) => {
    return z.object({
        body: z.strictObject({
            email: generalValidationFields.email,
            otp: generalValidationFields.otp,
        })
    });
};

export const resendConfirmEmail = (lang) => {
    return z.object({
        body: z.strictObject({
            email: generalValidationFields.email
        })
    });
};

export const resetPassword = (lang) => {
    return z.object({
        body: z.strictObject({
            email: generalValidationFields.email,
            otp: generalValidationFields.otp,
            password: generalValidationFields.password,
            confirmPassword: generalValidationFields.password,
        }).superRefine((data, ctx) => {
            generalValidationFields.matchFields({ original: "password", copy: "confirmPassword", data, ctx });
        })
    });
};

export const confirmTwoStepVerification = (lang) => {
    return z.object({
        body: z.strictObject({
            email: generalValidationFields.email,
            otp: generalValidationFields.otp
        })
    });
};

export const userId = z.strictObject({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/)
});

export const updateProfile = z.strictObject({
    username: z.string().trim().min(5).max(51).regex(/^[a-zA-Z]+\s[a-zA-Z]+$/).optional(),
    phone: z.e164().optional(),
    DOB: z.iso.date().optional(),
    gender: z.union([z.literal(0), z.literal(1), z.enum(["0", "1"]).transform(Number)]).optional()
}).refine((data) => Object.keys(data).length > 0, "At least one field is required");

export const createMessage = z.strictObject({
    content: z.string().trim().min(1).max(1000),
    receiver: z.string().regex(/^[0-9a-fA-F]{24}$/)
});
