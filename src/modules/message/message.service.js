import { IdentityRequestModel, MessageModel, UserModel } from "../../DB/model/user.model.js";
import { find, findById, findOne } from "../../common/repository/db.repository.js";
import { ForbiddenException, NotfoundException } from "../../common/exceptions/error.exception.js";
import { IdentityRequestStatusEnum } from "../../common/enum/user.enum.js";

export const createMessage = async (user, data) => {
    // check receiver exists before creating message
    const receiver = await findById({ model: UserModel, id: data.receiver });
    if (!receiver) throw NotfoundException("Receiver not found");

    const message = await MessageModel.create({ ...data, sender: user._id });

    // preserve sender internally while hiding it in the anonymous message response
    const messageObj = message.toObject ? message.toObject() : { ...message._doc };
    delete messageObj.sender;
    return messageObj;
};

export const getMessages = async (user) => {
    const messages = await find({
        model: MessageModel,
        filter: { receiver: user._id },
        options: {
            sort: { createdAt: -1 },
            lean: true
        }
    });

    const messageIds = messages.map(m => m._id);
    const acceptedRequests = await find({
        model: IdentityRequestModel,
        filter: {
            message: { $in: messageIds },
            status: IdentityRequestStatusEnum.ACCEPTED
        },
        options: {
            populate: [{ path: "sender", select: "firstName lastName email image username" }],
            lean: true
        }
    });

    const acceptedMap = new Map();
    for (const req of acceptedRequests) {
        acceptedMap.set(req.message.toString(), req.sender);
    }

    return messages.map(m => {
        const acceptedSender = acceptedMap.get(m._id.toString());
        if (acceptedSender) {
            return { ...m, sender: acceptedSender, isAnonymous: false };
        }
        const { sender, ...rest } = m;
        return { ...rest, isAnonymous: true };
    });
};

export const getMessageById = async (user, messageId) => {
    const message = await findById({ model: MessageModel, id: messageId, options: { lean: true } });
    if (!message) throw NotfoundException("Message not found");

    const isReceiver = message.receiver.toString() === user._id.toString();
    const isSender = message.sender && message.sender.toString() === user._id.toString();

    if (!isReceiver && !isSender) {
        throw ForbiddenException("Unauthorized to access this message");
    }

    if (isReceiver) {
        const acceptedRequest = await findOne({
            model: IdentityRequestModel,
            filter: { message: message._id, status: IdentityRequestStatusEnum.ACCEPTED },
            options: {
                populate: [{ path: "sender", select: "firstName lastName email image username" }],
                lean: true
            }
        });

        if (acceptedRequest) {
            return { ...message, sender: acceptedRequest.sender, isAnonymous: false };
        }
        const { sender, ...rest } = message;
        return { ...rest, isAnonymous: true };
    }

    return message;
};
