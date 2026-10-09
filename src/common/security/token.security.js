import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { ACCESS_ADMIN_TOKEN_SIGNATURE, ACCESS_TOKEN_EXPIRES_IN, ACCESS_USER_TOKEN_SIGNATURE, REFRESH_ADMIN_TOKEN_SIGNATURE, REFRESH_TOKEN_EXPIRES_IN, REFRESH_USER_TOKEN_SIGNATURE } from "../../config.js";
import { BadException, NotfoundException, UnauthorizedException } from "../exceptions/error.exception.js";
import { findById } from "../repository/db.repository.js";
import { UserModel } from "../../DB/model/user.model.js";
import { TokenTypeEnum } from "../enum/security.enum.js";
import { RoleEnum } from "../enum/user.enum.js";
import { isTokenRevoked } from "../utils/cache.utils.js";
import { exist, set } from "../services/index.js";

export const userLoginTrailsKey = ({ email }) => {
    return `User::login:trails:${email}`;
};

export const userBaseKey = ({ userId }) => {
    return `User::${userId.toString()}`;
};

export const userBaseRevokeTokenKey = ({ userId }) => {
    return `${userBaseKey({ userId })}::Revoke_Token`;
};

export const userRevokeTokenKey = ({ userId, jti }) => {
    return `${userBaseRevokeTokenKey({ userId })}::${jti}`;
};

export const createToken = async ({
    payload = {},
    options = {},
    secret = ACCESS_USER_TOKEN_SIGNATURE
} = {}) => {
    return jwt.sign(payload, secret, options);
};

export const verifyToken = async ({
    token = "",
    secret = ACCESS_USER_TOKEN_SIGNATURE
} = {}) => {
    return jwt.verify(token, secret);
};

// get jwt secret based on user role
const getTokenSignatures = async ({ role = RoleEnum.USER } = {}) => {
    let signatures;
    switch (role) {
        case RoleEnum.ADMIN:
            signatures = { accessSignature: ACCESS_ADMIN_TOKEN_SIGNATURE, refreshSignature: REFRESH_ADMIN_TOKEN_SIGNATURE };
            break;
        default:
            signatures = { accessSignature: ACCESS_USER_TOKEN_SIGNATURE, refreshSignature: REFRESH_USER_TOKEN_SIGNATURE };
            break;
    }
    return signatures;
};

const getSignature = async ({ tokenType = TokenTypeEnum.ACCESS, role = RoleEnum.USER } = {}) => {
    const signatures = await getTokenSignatures({ role });
    return tokenType === TokenTypeEnum.ACCESS ? signatures.accessSignature : signatures.refreshSignature;
};

export const decodeToken = async ({
    authorization = "",
    tokenType = TokenTypeEnum.ACCESS
} = {}) => {
    const decoded = jwt.decode(authorization);
    if (!decoded?.aud?.length) {
        throw BadException("invalid token");
    }

    const payload = await verifyToken({ token: authorization, secret: await getSignature({ tokenType, role: decoded.aud[0] }) });
    if (!payload?.sub) {
        throw BadException("missing token payload");
    }

    // check if this token was revoked in redis
    if (payload.jti && (await exist({ key: userRevokeTokenKey({ userId: payload.sub, jti: payload.jti }) }))) {
        throw UnauthorizedException("expired login credentials");
    }

    if (await isTokenRevoked(authorization)) {
        throw UnauthorizedException("Token has been revoked");
    }

    const user = await findById({
        model: UserModel,
        id: payload.sub
    });
    if (!user) {
        throw NotfoundException("Invalid user");
    }

    // check if password was changed after token was issued
    if ((user.changeCredentialsTime?.getTime() ?? 0) > payload.iat * 1000) {
        throw UnauthorizedException("Expired login credentials");
    }

    return { user, payload };
};

// create access and refresh token pair with the same jti
export const createLoginCredentials = async ({
    user,
    issuer,
    options = {}
}) => {
    const { accessSignature, refreshSignature } = await getTokenSignatures({ role: user.role });
    const jwtid = randomUUID();

    const access_token = await createToken({
        payload: { sub: user._id },
        secret: accessSignature,
        options: {
            ...options,
            issuer,
            audience: [user.role],
            expiresIn: ACCESS_TOKEN_EXPIRES_IN,
            jwtid
        }
    });

    const refresh_token = await createToken({
        payload: { sub: user._id },
        secret: refreshSignature,
        options: {
            ...options,
            issuer,
            audience: [user.role],
            expiresIn: REFRESH_TOKEN_EXPIRES_IN,
            jwtid
        }
    });

    return { access_token, refresh_token };
};

// blacklist token in redis until refresh token expires
export const createRevokeToken = async ({ payload, user }) => {
    const currentTime = Math.ceil(Date.now() / 1000);
    const refreshExpiresAt = payload.iat + REFRESH_TOKEN_EXPIRES_IN;
    const revokeTtl = refreshExpiresAt - currentTime;
    const userId = user?._id || user || payload.sub;
    const key = userRevokeTokenKey({ userId, jti: payload.jti });
    await set({ key, value: payload.jti, ttl: Math.max(revokeTtl, 1) });
    return;
};
