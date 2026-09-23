import jwt from "jsonwebtoken"
import { ACCESS_ADMIN_TOKEN_SIGNATURE, ACCESS_TOKEN_EXPIRES_IN, ACCESS_USER_TOKEN_SIGNATURE, REFRESH_ADMIN_TOKEN_SIGNATURE, REFRESH_TOKEN_EXPIRES_IN, REFRESH_USER_TOKEN_SIGNATURE } from "../../config.js";
import { BadException, NotfoundException } from "../exceptions/error.exception.js";
import { findById } from "../repository/db.repository.js";
import { UserModel } from "../../DB/model/user.model.js";
import { TokenTypeEnum } from "../enum/security.enum.js";
import { RoleEnum } from "../enum/user.enum.js";

// create a JWT token
export const createToken = async ({
    payload = {},
    options = {},
    secret = ACCESS_USER_TOKEN_SIGNATURE
} = {}) => {
    return jwt.sign(payload, secret, options)
}


// verify a JWT token
export const verifyToken = async ({
    token = "",
    secret = ACCESS_USER_TOKEN_SIGNATURE
} = {}) => {
    return jwt.verify(token, secret)
}



// Returns the access and refresh token signatures based on the given role
const getTokenSignatures = async ({ role = RoleEnum.USER } = {}) => {
    let signatures;
    switch (role) {
        case RoleEnum.ADMIN:
            signatures = { accessSignature: ACCESS_ADMIN_TOKEN_SIGNATURE, refreshSignature: REFRESH_ADMIN_TOKEN_SIGNATURE }
            break;
        default:
            signatures = { accessSignature: ACCESS_USER_TOKEN_SIGNATURE, refreshSignature: REFRESH_USER_TOKEN_SIGNATURE }
            break;
    }
    return signatures
}



// Returns the appropriate signature based on token type (access or refresh)
const getSignature = async ({ tokenType = TokenTypeEnum.ACCESS  , role = RoleEnum.USER} = {}) => {
    const signatures = await getTokenSignatures({ role })
    return tokenType == TokenTypeEnum.ACCESS ? signatures.accessSignature : signatures.refreshSignature
}



// decode and verify the token from the request
export const decodeToken = async ({
    authorization = "",
    tokenType = TokenTypeEnum.ACCESS
} = {}) => {

    // Decode the token without signature verification
    const decoded = jwt.decode(authorization) 
    console.log({ decoded })
    if (!decoded?.aud?.length) {
        throw BadException("invalid token")
    }

    const payload = await verifyToken({ token: authorization , secret: await getSignature({ tokenType , role: decoded.aud[0] }) })
    if (!payload?.sub) {
        throw BadException("missing token payload")
    }

    // Fetch the user from the database using the token subject
    const user = await findById({
        model: UserModel,
        id: payload.sub
    })
    if (!user) {
        throw NotfoundException("Invalid user")
    }
    return {user,payload}
}



// Creates access and refresh tokens for user login
export const createLoginCredentials = async ({
    user,
    issuer,
    options = {}
}) => {
    const { accessSignature, refreshSignature } = await getTokenSignatures({ role:user.role })
    const access_token = await createToken({
        payload:{sub:user._id},
        secret: accessSignature,
        options: {
            ...options,
            issuer,
            audience: [user.role],
            expiresIn: ACCESS_TOKEN_EXPIRES_IN
        }
    })

    const refresh_token = await createToken({
        payload:{sub:user._id},
        secret: refreshSignature,
        options: {
            ...options,
            issuer,
            audience: [user.role],
            expiresIn: REFRESH_TOKEN_EXPIRES_IN
        }
    })

    return { access_token, refresh_token }
}
