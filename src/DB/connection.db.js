import mongoose from "mongoose";
import { DB_URI } from "../config.js";
import { ConversationMessageModel, ConversationModel, IdentityRequestModel, RevokedTokenModel, UserModel } from "./model/user.model.js";

export const bootstrapDB = async (app, port) => {
  try {
    await mongoose.connect(DB_URI, { serverSelectionTimeoutMS: 30000 });
    await UserModel.syncIndexes();
    await RevokedTokenModel.syncIndexes();
    await IdentityRequestModel.syncIndexes();
    await ConversationModel.syncIndexes();
    await ConversationMessageModel.syncIndexes();
    console.log("DB Connected Successfully 🌸");
    app.listen(port, () => console.log(`Example app listening on port ${port}!`));
  } catch (error) {
    console.log(error);
    console.log("Fail to connect on DB ❌");
  }
};
