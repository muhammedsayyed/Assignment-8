import { findById, findByIdAndUpdate } from "../../common/repository/db.repository.js";
import { UserModel } from "../../DB/model/user.model.js";
import { createLoginCredentials, createRevokeToken, userBaseRevokeTokenKey } from "../../common/security/token.security.js";
import { decryption, encryption } from "../../common/security/encryption.security.js";
import { ConflictException } from "../../common/exceptions/error.exception.js";
import { ACCESS_TOKEN_EXPIRES_IN } from "../../config.js";
import { deleteCache, getCache, setCache } from "../../common/utils/cache.utils.js";
import { LogoutEnum } from "../../common/enum/security.enum.js";
import { del, keys } from "../../common/services/index.js";

const profileResponse = async (account, { includePrivate = false } = {}) => {
    const data = typeof account.toObject === "function" ? account.toObject({ virtuals: false }) : { ...account };
    data.username = [data.firstName, data.lastName].filter(Boolean).join(" ").trim() || data.username || "";
    delete data.password;
    delete data.changeCredentialsTime;

    if (includePrivate && data.phone?.includes(":::")) {
        data.phone = await decryption(data.phone);
    } else if (!includePrivate) {
        delete data.phone;
    }

    return data;
};

export const profile = async (user, options = {}) => {
    const userId = user._id || user;
    const key = `profile:${userId}`;
    let account = await getCache(key);

    if (!account) {
        account = await findById({ model: UserModel, id: userId, options: { lean: true } });
    }
    if (!account) return account;

    // Keep the encrypted database form in cache; decrypt only for the account owner.
    await setCache(key, account);
    return await profileResponse(account, options);
};

export const update = async (user, data) => {
    const updateData = { ...data };
    if (updateData.username) {
        const [firstName, ...lastNameParts] = updateData.username.trim().split(/\s+/);
        updateData.firstName = firstName;
        updateData.lastName = lastNameParts.join(" ");
        delete updateData.username;
    }
    // encrypt phone if updated
    if (updateData.phone && !updateData.phone.includes(":::")) {
        updateData.phone = await encryption(updateData.phone);
    }

    const account = await findByIdAndUpdate({
        model: UserModel,
        id: user._id,
        update: updateData
    });
    // clear cached profile after update
    await deleteCache(`profile:${user._id}`);
    return await profileResponse(account, { includePrivate: true });
};

export const rotateToken = async (payload, user, issuer) => {
    // only allow rotation if access token is near expiry
    const accessExpiresIn = (payload.iat + ACCESS_TOKEN_EXPIRES_IN) * 1000;
    const currentTime = Date.now() + (30 * 60000);
    if (currentTime < accessExpiresIn) {
        throw ConflictException("Sorry we cannot create new login credentials while current access token still within valid time range");
    }
    const data = await createLoginCredentials({ user, issuer });
    await createRevokeToken({ payload, user });
    return data;
};

export const logout = async (payload, user, { action = LogoutEnum.DEVICE } = {}) => {
    switch (action) {
        case LogoutEnum.ALL:
            // invalidate all sessions by updating credentials time
            user.changeCredentialsTime = new Date();
            await user.save();
            const matchedKeys = await keys({ prefix: userBaseRevokeTokenKey({ userId: payload.sub }) });
            if (matchedKeys?.length) {
                await del({ key: matchedKeys });
            }
            break;
        default:
            await createRevokeToken({ payload, user });
            break;
    }
    return { loggedOut: true };
};
