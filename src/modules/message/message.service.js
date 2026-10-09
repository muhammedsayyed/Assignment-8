import { MessageModel, UserModel } from "../../DB/model/user.model.js"
import { findById } from "../../common/repository/db.repository.js"
import { NotfoundException } from "../../common/exceptions/error.exception.js"

export const createMessage = async (user, data) => {
    // check receiver exists before creating message
    const receiver = await findById({ model: UserModel, id: data.receiver })
    if (!receiver) throw NotfoundException("Receiver not found")
    return await MessageModel.create({ ...data, sender: user._id })
}
