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