import { ConversationModel, ConversationMessageModel, IdentityRequestModel } from "../../DB/model/user.model.js";
import { findById, findByIdAndUpdate, findOne, find } from "../../common/repository/db.repository.js";
import { NotfoundException, ConflictException, ForbiddenException } from "../../common/exceptions/error.exception.js";
import { IdentityRequestStatusEnum } from "../../common/enum/user.enum.js";

export const createConversation = async (user, data) => {
    const requestId = data.identityRequestId || data.identityRequest || data.requestId;
    const request = await findById({
        model: IdentityRequestModel,
        id: requestId
    });
    if (!request) throw NotfoundException("Identity request not found");

    // Only allow conversation creation if request was accepted
    if (request.status !== IdentityRequestStatusEnum.ACCEPTED) {
        throw ConflictException("Conversation can only be created for accepted identity requests");
    }

    // Verify authenticated user is a participant of this request
    const requesterId = request.requestedBy?._id ? request.requestedBy._id.toString() : request.requestedBy.toString();
    const senderId = request.sender?._id ? request.sender._id.toString() : request.sender.toString();
    const currentUserId = user._id.toString();

    if (currentUserId !== requesterId && currentUserId !== senderId) {
        throw ForbiddenException("Only participants can create a conversation");
    }

    // Prevent duplicate conversation
    const existingConversation = await findOne({
        model: ConversationModel,
        filter: { identityRequest: request._id }
    });
    if (existingConversation) {
        throw ConflictException("Conversation already exists for this identity request");
    }

    const conversation = await ConversationModel.create({
        participants: [request.requestedBy?._id || request.requestedBy, request.sender?._id || request.sender],
        identityRequest: request._id,
        message: request.message?._id || request.message
    });

    return await findById({
        model: ConversationModel,
        id: conversation._id,
        options: {
            populate: [
                { path: "participants", select: "firstName lastName email image username" },
                { path: "identityRequest" },
                { path: "message", select: "content createdAt" }
            ],
            lean: true
        }
    });
};

export const getConversations = async (user) => {
    return await find({
        model: ConversationModel,
        filter: { participants: user._id },
        options: {
            populate: [
                { path: "participants", select: "firstName lastName email image username" },
                { path: "identityRequest", select: "status createdAt" },
                { path: "message", select: "content createdAt" }
            ],
            sort: { updatedAt: -1 },
            lean: true
        }
    });
};

export const getConversationById = async (user, conversationId) => {
    const conversation = await findById({
        model: ConversationModel,
        id: conversationId,
        options: {
            populate: [
                { path: "participants", select: "firstName lastName email image username" },
                { path: "identityRequest" },
                { path: "message", select: "content createdAt" }
            ],
            lean: true
        }
    });
    if (!conversation) throw NotfoundException("Conversation not found");

    const isParticipant = conversation.participants.some(p =>
        (p._id ? p._id.toString() : p.toString()) === user._id.toString()
    );
    if (!isParticipant) {
        throw ForbiddenException("Unauthorized to access this conversation");
    }

    return conversation;
};

export const sendConversationMessage = async (user, conversationId, data) => {
    const conversation = await findById({
        model: ConversationModel,
        id: conversationId
    });
    if (!conversation) throw NotfoundException("Conversation not found");

    // Only participants can send messages
    const isParticipant = conversation.participants.some(p => (p._id ? p._id.toString() : p.toString()) === user._id.toString());
    if (!isParticipant) {
        throw ForbiddenException("Only participants can send messages in this conversation");
    }

    const message = await ConversationMessageModel.create({
        conversation: conversation._id,
        sender: user._id,
        content: data.content
    });

    // Touch conversation updated time
    await findByIdAndUpdate({ model: ConversationModel, id: conversation._id, update: { updatedAt: new Date() } });

    return await findById({
        model: ConversationMessageModel,
        id: message._id,
        options: {
            populate: [{ path: "sender", select: "firstName lastName email image username" }],
            lean: true
        }
    });
};

export const getConversationMessages = async (user, conversationId) => {
    const conversation = await findById({
        model: ConversationModel,
        id: conversationId
    });
    if (!conversation) throw NotfoundException("Conversation not found");

    // Only participants can read messages
    const isParticipant = conversation.participants.some(p => (p._id ? p._id.toString() : p.toString()) === user._id.toString());
    if (!isParticipant) {
        throw ForbiddenException("Only participants can view messages from this conversation");
    }

    return await find({
        model: ConversationMessageModel,
        filter: { conversation: conversation._id },
        options: {
            populate: [{ path: "sender", select: "firstName lastName email image username" }],
            sort: { createdAt: 1 },
            lean: true
        }
    });
};

export const deleteConversation = async (user, conversationId) => {
    const conversation = await findById({ model: ConversationModel, id: conversationId });
    if (!conversation) throw NotfoundException("Conversation not found");

    const isParticipant = conversation.participants.some(participant =>
        participant.toString() === user._id.toString()
    );
    if (!isParticipant) throw ForbiddenException("Only participants can delete this conversation");

    await ConversationMessageModel.deleteMany({ conversation: conversation._id });
    await conversation.deleteOne();
    return { deleted: true };
};
