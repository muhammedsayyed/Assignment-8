import mongoose from "mongoose";
import { DB_URI } from "../config.js";
import { UserModel } from "./model/user.model.js";

// connect to MongoDB and start the server
export const bootstrapDB = async (app, port) => {
  try {
    await mongoose.connect(DB_URI, { serverSelectionTimeoutMS: 30000 });
    await UserModel.syncIndexes();
    console.log("DB Connected Successfully 🌸");
    app.listen(port, () => console.log(`Example app listening on port ${port}!`))
  } catch (error) {
    console.log(error);
    console.log("Fail to connect on DB ❌");
  }
};