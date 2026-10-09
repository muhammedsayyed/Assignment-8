import { findById, findByIdAndUpdate } from "../../common/repository/db.repository.js";
import { UserModel } from "../../DB/model/user.model.js";
import { createLoginCredentials, createRevokeToken, userBaseRevokeTokenKey } from "../../common/security/token.security.js";
import { encryption } from "../../common/security/encryption.security.js";
import { ConflictException } from "../../common/exceptions/error.exception.js";
import { ACCESS_TOKEN_EXPIRES_IN } from "../../config.js";
import { deleteCache, getCache, setCache } from "../../common/utils/cache.utils.js";
import { LogoutEnum } from "../../common/enum/security.enum.js";
import { del, keys } from "../../common/services/index.js";

export const profile = async (user) => {
    const userId = user._id || user;
    const key = `profile:${userId}`;
    const cachedProfile = await getCache(key);
    if (cachedProfile) return cachedProfile;

    const account = await findById({ model: UserModel, id: userId, options: { lean: true } });
    if (!account) return account;

    // Cache user profile
    await setCache(key, account);
    return account;
};

export const update = async (user, data) => {
    const updateData = { ...data };
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
    return account;
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
