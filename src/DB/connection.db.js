import mongoose from "mongoose";
import { DB_URI } from "../config.js";
import { RevokedTokenModel, UserModel } from "./model/user.model.js";

export const bootstrapDB = async (app, port) => {
  try {
    await mongoose.connect(DB_URI, { serverSelectionTimeoutMS: 30000 });
    await UserModel.syncIndexes();
    await RevokedTokenModel.syncIndexes();
    console.log("DB Connected Successfully 🌸");
    app.listen(port, () => console.log(`Example app listening on port ${port}!`));
  } catch (error) {
    console.log(error);
    console.log("Fail to connect on DB ❌");
  }
};
