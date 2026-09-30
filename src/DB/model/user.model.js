import mongoose from "mongoose";
import { GenderEnum, RoleEnum } from "../../common/enum/index.js";

// define user schema
const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        minLength: 2,
        maxLength: 25,
        required: true
    },
    lastName: {
        type: String,
        minLength: 2,
        maxLength: 25,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    phone:String,
    DOB: Date,
    confirmEmail:Date,
    image: String,
    coverImage: [String],
    gender: {
        type: Number,
        enum: Object.values(GenderEnum),
        default: GenderEnum.MALE
    },
    role: {
        type: Number,
        default: RoleEnum.USER,
        enum: Object.values(RoleEnum)
    },

}, {
    timestamps: true,
    autoIndex: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    strict: true,
    strictQuery: true
});

// virtual field to split username into firstName and lastName
userSchema.virtual("username").set(function (value) {
    const [firstName, lastName] = value?.split(" ") || [];
    this.set({ firstName, lastName });
}).get(function () {
    return `${this.firstName} ${this.lastName}`;
});

export const UserModel = mongoose.models.User || mongoose.model("User", userSchema);

const revokedTokenSchema = new mongoose.Schema({
    token: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

export const RevokedTokenModel = mongoose.models.RevokedToken || mongoose.model("RevokedToken", revokedTokenSchema);

const messageSchema = new mongoose.Schema({
    content: { type: String, required: true, trim: true, minLength: 1, maxLength: 1000 },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

export const MessageModel = mongoose.models.Message || mongoose.model("Message", messageSchema);
