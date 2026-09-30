import { ConflictException, NotfoundException } from "../../common/exceptions/error.exception.js"
import { createOne, findOne } from "../../common/repository/index.js"
import { encryption } from "../../common/security/encryption.security.js"
import { hash , compare } from "../../common/security/hash.security.js"
import { UserModel } from "../../DB/model/user.model.js"
import { createLoginCredentials } from "../../common/security/token.security.js"
import { RevokedTokenModel } from "../../DB/model/user.model.js"


// register a new user
export const signup = async ({ email, password,phone, username }) => {
    const duplicatedAccount = await findOne({
        model: UserModel,
        filter: { email },
        options: { select: "email" }
    })
    if (duplicatedAccount) throw ConflictException("Email already exists")
    const account = await createOne({
        model: UserModel,
        data: { email, password: await hash(password),phone:await encryption(phone), username }
    })
    return account
}

// login user and return tokens
export const login = async ({ email, password },issuer) => {
    const account = await findOne({
        model: UserModel,
        filter: { email }
    })
    if (!account) throw NotfoundException("Invalid email or password")
    const match = await compare(password, account.password)
    if (!match) throw NotfoundException("Invalid email or password")
        return await createLoginCredentials({user:account , issuer}) 
}

// logout from current session
export const logout = async (user, token) => {
    if (!token) throw NotfoundException("Invalid token")
    return await RevokedTokenModel.create({ token, user: user._id })
}
