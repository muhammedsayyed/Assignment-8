import bcrypt from "bcrypt";

export const hash = async (plaintext, rounds = 12, minor = "b") => {
    const salt = bcrypt.genSaltSync(rounds, minor).toString();
    return await bcrypt.hash(plaintext, salt);
};

export const compare = async (plaintext, cipherText) => {
    return await bcrypt.compare(plaintext, cipherText);
};