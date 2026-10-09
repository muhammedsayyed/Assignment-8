import { BadException, ConflictException, NotfoundException, TooManyRequestsException } from "../../common/exceptions/error.exception.js";
import { createOne, findOne } from "../../common/repository/index.js";
import { encryption } from "../../common/security/encryption.security.js";
import { hash, compare } from "../../common/security/hash.security.js";
import { UserModel } from "../../DB/model/user.model.js";
import { createLoginCredentials, createRevokeToken, userBaseRevokeTokenKey, userLoginTrailsKey, verifyToken } from "../../common/security/token.security.js";
import { OAuth2Client } from 'google-auth-library';
import { ProviderEnum, TwoStepVerificationEnum } from "../../common/enum/user.enum.js";
import { EmailSubjectEnum } from "../../common/enum/email.enum.js";
import { LogoutEnum } from "../../common/enum/security.enum.js";
import { WEB_CLIENT_IDS } from "../../config.js";
import { emailEvent } from "../../common/utils/email/email.events.js";
import { createOtp } from "../../common/utils/otp.js";
import { del, expire, get, incrBy, keys, set, ttl } from "../../common/services/cache.service.js";
import { userEmailKey, userEmailTrailsKey } from "../../common/utils/email/send.email.js";
import { revokeToken } from "../../common/utils/cache.utils.js";

const client = new OAuth2Client();

// verify google id token with google oauth client
async function verifyGoogleAccount(idToken) {
    const ticket = await client.verifyIdToken({
        idToken,
        audience: WEB_CLIENT_IDS,
    });
    const payload = ticket.getPayload();
    if (!payload?.email_verified) {
        throw BadException("Email is not verified");
    }
    return payload;
}

export const LoginWithGmail = async ({ idToken }, issuer) => {
    const { name, email, picture } = await verifyGoogleAccount(idToken);
    const existAccount = await findOne({
        model: UserModel,
        filter: { email },
    });
    if (existAccount) {
        if (existAccount.provider !== ProviderEnum.GOOGLE) {
            throw ConflictException("invalid account provider");
        }
        return await createLoginCredentials({ user: existAccount, issuer });
    }
    const user = await createOne({
        model: UserModel,
        data: {
            username: name,
            email,
            confirmEmail: new Date(),
            provider: ProviderEnum.GOOGLE,
            image: picture
        }
    });
    return await createLoginCredentials({ user, issuer });
};

const sendEmailOtp = async ({ email, subject, expiresIn = 120, maxTrails = 3, blockInSeconds = 300, title }) => {
    const existOTP_TTL = await ttl({ key: userEmailKey({ email, subject }) });
    if (existOTP_TTL > 0) {
        throw ConflictException(`Sorry we cannot create new otp while existing one is still valid, please wait for ${existOTP_TTL} seconds`);
    }
    const oldTrails = (await get({ key: userEmailTrailsKey({ email, subject }) })) ?? 0;
    if (oldTrails >= maxTrails) {
        throw TooManyRequestsException(`Maximum resend attempts reached`);
    }
    const code = createOtp();
    await set({
        key: userEmailKey({ email, subject }),
        value: await hash(code.toString()),
        ttl: expiresIn
    });
    const currentTrails = await incrBy({ key: userEmailTrailsKey({ email, subject }) });
    if (currentTrails === maxTrails) {
        await expire({ key: userEmailTrailsKey({ email, subject }), ttl: blockInSeconds });
    }
    // Send verification code
    emailEvent.emit("sendEmail", { recipients: { to: email }, subject, data: { code, title: title ?? subject } });
};

export const signup = async ({ email, password, phone, username }) => {
    const duplicatedAccount = await findOne({
        model: UserModel,
        filter: { email },
        options: { select: "email" }
    });
    if (duplicatedAccount) throw ConflictException("Email already exists");
    // hash password and encrypt phone before saving
    const account = await createOne({
        model: UserModel,
        data: {
            email,
            password: await hash(password),
            phone: phone ? await encryption(phone) : undefined,
            username,
            provider: ProviderEnum.SYSTEM
        }
    });
    await sendEmailOtp({ email, subject: EmailSubjectEnum.CONFIRM_EMAIL });
    return account;
};

// verify otp and mark email as confirmed
export const confirmEmail = async ({ otp, email }) => {
    const account = await findOne({
        model: UserModel,
        filter: { email, provider: ProviderEnum.SYSTEM, confirmEmail: { $exists: false } }
    });
    if (!account) throw NotfoundException("Invalid account");
    const hashOtp = await get({ key: userEmailKey({ email, subject: EmailSubjectEnum.CONFIRM_EMAIL }) });
    if (!hashOtp || !(await compare(otp, hashOtp))) {
        throw ConflictException("Invalid OTP");
    }
    account.confirmEmail = new Date();
    await account.save();
    const matchedKeys = await keys({ prefix: userEmailKey({ email, subject: EmailSubjectEnum.CONFIRM_EMAIL }) });
    if (matchedKeys?.length) {
        await del({ key: matchedKeys });
    }
    return { message: "Email confirmed successfully" };
};

export const resendConfirmEmail = async ({ email }) => {
    const account = await findOne({
        model: UserModel,
        filter: { email, provider: ProviderEnum.SYSTEM, confirmEmail: { $exists: false } }
    });
    if (!account) throw NotfoundException("Invalid account");
    await sendEmailOtp({ email, subject: EmailSubjectEnum.CONFIRM_EMAIL });
    return { message: "Confirmation code sent to your email" };
};

export const requestForgotPassword = async ({ email }) => {
    const account = await findOne({
        model: UserModel,
        filter: { email, provider: ProviderEnum.SYSTEM, confirmEmail: { $exists: true } }
    });
    if (!account) throw NotfoundException("Invalid account");
    await sendEmailOtp({ email, subject: EmailSubjectEnum.FORGOT_PASSWORD });
    return { message: "Reset password code sent to your email" };
};

export const verifyForgotPassword = async ({ otp, email }) => {
    const account = await findOne({
        model: UserModel,
        filter: { email, provider: ProviderEnum.SYSTEM, confirmEmail: { $exists: true } }
    });
    if (!account) throw NotfoundException("Invalid account");
    const hashOtp = await get({ key: userEmailKey({ email, subject: EmailSubjectEnum.FORGOT_PASSWORD }) });
    if (!hashOtp || !(await compare(otp, hashOtp))) {
        throw ConflictException("Invalid OTP");
    }
    return account;
};

export const resetPassword = async ({ otp, email, password }) => {
    const account = await verifyForgotPassword({ otp, email });
    account.password = await hash(password);
    // update credentials time to invalidate previous tokens
    account.changeCredentialsTime = new Date();
    await account.save();
    const result = await Promise.all([
        keys({ prefix: userBaseRevokeTokenKey({ userId: account._id }) }),
        keys({ prefix: userEmailKey({ email, subject: EmailSubjectEnum.FORGOT_PASSWORD }) })
    ]);
    const keysToDelete = [...(result[0] || []), ...(result[1] || [])];
    if (keysToDelete.length) {
        await del({ key: keysToDelete });
    }
    return { message: "Password reset successfully" };
};

export const login = async ({ email, password }, issuer) => {
    const account = await findOne({
        model: UserModel,
        filter: { email, provider: ProviderEnum.SYSTEM, confirmEmail: { $exists: true } }
    });
    if (!account) throw NotfoundException("Invalid email or password");

    // Prevent brute-force login attempts
    const loginTrailsKey = userLoginTrailsKey({ email });
    const loginTrails = (await get({ key: loginTrailsKey })) ?? 0;
    if (loginTrails >= 5) {
        const remainingTime = await ttl({ key: loginTrailsKey });
        throw TooManyRequestsException(`Too many login attempts, please try again after ${remainingTime} seconds`);
    }

    const match = await compare(password, account.password);
    if (!match) {
        const currentTrails = await incrBy({ key: loginTrailsKey });
        if (currentTrails >= 5) {
            await expire({ key: loginTrailsKey, ttl: 5 * 60 });
            const remainingTime = await ttl({ key: loginTrailsKey });
            throw TooManyRequestsException(`Too many login attempts, please try again after ${remainingTime} seconds`);
        }
        throw NotfoundException("Invalid email or password");
    }

    await del({ key: loginTrailsKey });

    // if 2fa is enabled, send otp and require 2fa confirmation
    if (account.twoStepVerification === TwoStepVerificationEnum.ENABLED) {
        await sendEmailOtp({ email: account.email, subject: EmailSubjectEnum.TWO_STEP_VERIFICATION });
        return { twoStepVerification: true, message: "Verification code sent to your email" };
    }

    return await createLoginCredentials({ user: account, issuer });
};

export const enableTwoStepVerification = async ({ user }) => {
    if (user.twoStepVerification === TwoStepVerificationEnum.ENABLED) {
        throw ConflictException("Two-step verification is already enabled");
    }
    await sendEmailOtp({
        email: user.email,
        subject: EmailSubjectEnum.TWO_STEP_VERIFICATION
    });
    return { message: "Verification code sent to your email" };
};

export const confirmTwoStepVerification = async ({ user, email, otp }) => {
    if (email !== user.email) {
        throw BadException("Invalid email");
    }
    if (user.twoStepVerification === TwoStepVerificationEnum.ENABLED) {
        throw ConflictException("Two-step verification is already enabled");
    }
    const hashOtp = await get({ key: userEmailKey({ email, subject: EmailSubjectEnum.TWO_STEP_VERIFICATION }) });
    if (!hashOtp || !(await compare(otp, hashOtp))) {
        throw ConflictException("Invalid OTP");
    }
    user.twoStepVerification = TwoStepVerificationEnum.ENABLED;
    await user.save();
    const matchedKeys = await keys({ prefix: userEmailKey({ email, subject: EmailSubjectEnum.TWO_STEP_VERIFICATION }) });
    if (matchedKeys?.length) {
        await del({ key: matchedKeys });
    }
    return { message: "Two-step verification enabled successfully" };
};

export const loginConfirmation = async ({ email, otp }, issuer) => {
    const account = await findOne({
        model: UserModel,
        filter: {
            email,
            provider: ProviderEnum.SYSTEM,
            confirmEmail: { $exists: true },
            twoStepVerification: TwoStepVerificationEnum.ENABLED
        }
    });
    if (!account) {
        throw NotfoundException("Invalid account");
    }
    const hashOtp = await get({ key: userEmailKey({ email, subject: EmailSubjectEnum.TWO_STEP_VERIFICATION }) });
    if (!hashOtp || !(await compare(otp, hashOtp))) {
        throw ConflictException("Invalid OTP");
    }
    const matchedKeys = await keys({ prefix: userEmailKey({ email, subject: EmailSubjectEnum.TWO_STEP_VERIFICATION }) });
    if (matchedKeys?.length) {
        await del({ key: matchedKeys });
    }
    return await createLoginCredentials({ user: account, issuer });
};

export const disableTwoStepVerification = async ({ user }) => {
    if (user.twoStepVerification === TwoStepVerificationEnum.DISABLED) {
        throw ConflictException("Two-step verification is already disabled");
    }
    user.twoStepVerification = TwoStepVerificationEnum.DISABLED;
    await user.save();
    return { message: "Two-step verification disabled successfully" };
};

export const logout = async (tokenOrPayload, user, { action = LogoutEnum.DEVICE } = {}) => {
    if (typeof tokenOrPayload === "string") {
        const payload = await verifyToken({ token: tokenOrPayload });
        if (!payload.exp) throw NotfoundException("Token expiration is missing");
        await revokeToken(tokenOrPayload, payload.exp);
        return { loggedOut: true };
    }
    const payload = tokenOrPayload;
    switch (action) {
        case LogoutEnum.ALL:
            // update credentials time to invalidate all active tokens
            if (user) {
                user.changeCredentialsTime = new Date();
                await user.save();
            }
            if (payload?.sub) {
                const matchedKeys = await keys({ prefix: userBaseRevokeTokenKey({ userId: payload.sub }) });
                if (matchedKeys?.length) {
                    await del({ key: matchedKeys });
                }
            }
            break;
        default:
            if (payload && user) {
                await createRevokeToken({ payload, user });
            }
            break;
    }
    return { loggedOut: true };
};
