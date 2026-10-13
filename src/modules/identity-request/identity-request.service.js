import { IdentityRequestModel, MessageModel, UserModel } from "../../DB/model/user.model.js";
import { findById, findOne, find } from "../../common/repository/db.repository.js";
import { NotfoundException, ConflictException, ForbiddenException, BadException } from "../../common/exceptions/error.exception.js";
import { IdentityRequestStatusEnum } from "../../common/enum/user.enum.js";

export const createIdentityRequest = async (user, data) => {
    const messageId = data.messageId || data.message;
    const message = await findById({ model: MessageModel, id: messageId });
    if (!message) throw NotfoundException("Message not found");

    // Only the recipient can request sender identity
    if (message.receiver.toString() !== user._id.toString()) {
        throw ForbiddenException("Only the message receiver can request sender identity");
    }

    if (!message.sender) {
        throw BadException("Cannot request identity for a message without recorded sender");
    }

    if (message.sender.toString() === user._id.toString()) {
        throw BadException("Cannot request identity for your own message");
    }

    // Prevent duplicate requests
    const existingRequest = await findOne({
        model: IdentityRequestModel,
        filter: { message: message._id }
    });
    if (existingRequest) throw ConflictException("Identity request already exists for this message");

    const request = await IdentityRequestModel.create({
        message: message._id,
        requestedBy: user._id,
        sender: message.sender,
        status: IdentityRequestStatusEnum.PENDING
    });

    const response = request.toObject ? request.toObject() : { ...request._doc };
    delete response.sender;
    return response;
};

export const getIdentityRequests = async (user) => {
    const requests = await find({
        model: IdentityRequestModel,
        filter: { $or: [{ requestedBy: user._id }, { sender: user._id }] },
        options: {
            populate: [
                { path: "message", select: "content createdAt" },
                { path: "requestedBy", select: "firstName lastName email image username" },
                { path: "sender", select: "firstName lastName email image username" }
            ],
            sort: { createdAt: -1 },
            lean: true
        }
    });

    // Sanitize sender identity based on ownership and approval status
    return requests.map(req => {
        const isRequester = req.requestedBy?._id?.toString() === user._id.toString() ||
                            req.requestedBy?.toString() === user._id.toString();

        if (isRequester) {
            if (req.status !== IdentityRequestStatusEnum.ACCEPTED) {
                const { sender, ...rest } = req;
                return rest;
            }
        }
        return req;
    });
};

export const getIdentityRequestById = async (user, requestId) => {
    const request = await findById({
        model: IdentityRequestModel,
        id: requestId,
        options: {
            populate: [
                { path: "message", select: "content createdAt" },
                { path: "requestedBy", select: "firstName lastName email image username" },
                { path: "sender", select: "firstName lastName email image username" }
            ],
            lean: true
        }
    });

    if (!request) throw NotfoundException("Identity request not found");

    const isRequester = request.requestedBy?._id?.toString() === user._id.toString() ||
                        request.requestedBy?.toString() === user._id.toString();
    const isSender = request.sender?._id?.toString() === user._id.toString() ||
                     request.sender?.toString() === user._id.toString();

    if (!isRequester && !isSender) {
        throw ForbiddenException("Unauthorized to view this identity request");
    }

    if (isRequester && request.status !== IdentityRequestStatusEnum.ACCEPTED) {
        const { sender, ...rest } = request;
        return rest;
    }

    return request;
};

export const updateIdentityRequestStatus = async (user, requestId, status) => {
    const request = await findById({
        model: IdentityRequestModel,
        id: requestId,
        options: { populate: [{ path: "message" }] }
    });
    if (!request) throw NotfoundException("Identity request not found");

    // Only the original sender can accept or reject
    const senderId = request.sender?._id ? request.sender._id.toString() : request.sender.toString();
    if (senderId !== user._id.toString()) {
        throw ForbiddenException("Only the original sender can accept or reject this request");
    }

    if (request.status !== IdentityRequestStatusEnum.PENDING) {
        throw ConflictException("This request has already been processed");
    }

    let numericStatus;
    if (typeof status === "string") {
        const lower = status.toLowerCase();
        if (lower === "accepted") numericStatus = IdentityRequestStatusEnum.ACCEPTED;
        else if (lower === "rejected") numericStatus = IdentityRequestStatusEnum.REJECTED;
        else throw BadException("Invalid status value");
    } else if (typeof status === "number") {
        if (![IdentityRequestStatusEnum.ACCEPTED, IdentityRequestStatusEnum.REJECTED].includes(status)) {
            throw BadException("Invalid status value");
        }
        numericStatus = status;
    } else {
        throw BadException("Invalid status value");
    }

    request.status = numericStatus;
    await request.save();

    await request.populate([
        { path: "requestedBy", select: "firstName lastName email image username" },
        { path: "sender", select: "firstName lastName email image username" }
    ]);

    return request;
};
