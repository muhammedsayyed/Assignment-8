import { TokenTypeEnum } from "../common/enum/security.enum.js";
import { ForbiddenException, UnauthorizedException } from "../common/exceptions/error.exception.js";
import { decodeToken } from "../common/security/token.security.js";

// verify jwt token and attach user to request
export const authentication = (tokenType = TokenTypeEnum.ACCESS) => {
    return async (req, res, next) => {
        const { authorization } = req.headers;
        if (!authorization) {
            throw UnauthorizedException("Unauthorized Account");
        }
        const { user, payload } = await decodeToken({ authorization, tokenType });
        req.user = user;
        req.payload = payload;
        req.token = authorization;
        next();
    };
};

// Attach the current user when a valid bearer token is supplied, while allowing guests.
export const optionalAuthentication = async (req, res, next) => {
    const { authorization } = req.headers;
    if (!authorization) return next();

    const { user, payload } = await decodeToken({ authorization, tokenType: TokenTypeEnum.ACCESS });
    req.user = user;
    req.payload = payload;
    req.token = authorization;
    next();
};

// check user role permissions
export const authorization = (accessRole) => {
    return async (req, res, next) => {
        if (req.user.role < accessRole) {
            throw ForbiddenException("Forbidden Account");
        }
        next();
    };
};
