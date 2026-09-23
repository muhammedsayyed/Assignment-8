import { TokenTypeEnum } from "../common/enum/security.enum.js"
import { UnauthorizedException } from "../common/exceptions/error.exception.js"
import { decodeToken } from "../common/security/token.security.js"

// check if user is logged in by verifying the token
export const authentication = (tokenType = TokenTypeEnum.ACCESS) => {
    return async (req, res, next) => {
    const { authorization } = req.headers
    if (!authorization) {
        throw UnauthorizedException("Unauthorized Account")
    }
    const { user , payload } = await decodeToken({ authorization , tokenType })
    req.user = user
    req.payload = payload
    next()
    }
}




// check if user has the required role
export const authorization = (accessRole) => {
    return async (req, res, next) => {
        if (req.user.role < accessRole) {
            throw ForbiddenException("Forbidden Account")
        }
        next()
    }
}

