import { z } from "zod";

// login validation schema
export const login = z.strictObject({
    email: z.email(),
    password: z.string().min(8).max(16)
})


// signup validation - extends login with extra fields
export const signup = login.extend({
    username: z.string(),
    phone: z.e164(),
    confirmPassword: z.string().min(8).max(16)
}).superRefine((data, ctx) => {
    console.log({ data, ctx });
    if (data.password != data.confirmPassword) {
        ctx.addIssue({
            code: "custom",
            path: ["confirmPassword"],
            message: "password mismatch with confirmation password"
        })
    }
    if (!data.username.includes(" ")) {
        ctx.addIssue({
            code: "custom",
            path: ["username"],
            message: "username must contain 2 parts"
        })
    }
})

// validate user id from route parameters
export const userId = z.strictObject({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/)
})

export const updateProfile = z.strictObject({
    username: z.string().trim().min(5).max(51).regex(/^[a-zA-Z]+\s[a-zA-Z]+$/).optional(),
    phone: z.e164().optional(),
    DOB: z.iso.date().optional(),
    gender: z.union([z.literal(0), z.literal(1), z.enum(["0", "1"]).transform(Number)]).optional()
}).refine((data) => Object.keys(data).length > 0, "At least one field is required")

export const createMessage = z.strictObject({
    content: z.string().trim().min(1).max(1000),
    receiver: z.string().regex(/^[0-9a-fA-F]{24}$/)
})
