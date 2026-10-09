import { z } from "zod";
import { GenderEnum } from "./enum/user.enum.js";
import { LangEnum } from "./enum/security.enum.js";

const matchFields = ({ original, copy, data, ctx }) => {
    if (data[original] != data[copy]) {
        ctx.addIssue({
            code: "custom",
            path: [copy],
            message: `Fail to match between ${original} and ${copy}`
        });
    }
};

export const generalValidationFields = {
    email: z.email({ message: "invalid email please try again" }),
    otp: z.string().regex(/^[0-9]{6}$/, { message: "invalid OTP please try again" }),
    password: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/, { message: "invalid password please try again" }).min(8).max(16),
    username: (lang) => z.string().min(2, { message: lang == LangEnum.AR ? "عفوا، لا يمكن ادخال اسم مستخدم اقل من حرفين" : "min length is 2 char" }),
    phone: z.e164(),
    confirmPassword: z.string().min(8).max(16),
    gender: z.union([z.nativeEnum(GenderEnum), z.enum(["0", "1"]).transform(Number)]),
    matchFields
};
