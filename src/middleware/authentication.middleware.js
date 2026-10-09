import { TokenTypeEnum } from "../common/enum/security.enum.js";
import { ForbiddenException, UnauthorizedException } from "../common/exceptions/error.exception.js";
import { decodeToken } from "../common/security/token.security.js";

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

export const authorization = (accessRole) => {
    return async (req, res, next) => {
        if (req.user.role < accessRole) {
            throw ForbiddenException("Forbidden Account");
        }
        next();
    };
};
