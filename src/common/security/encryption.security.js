import crypto from "node:crypto";
import { ENC_KEY, IV_LENGTH } from "../../config.js";

// encrypt text using AES-256-CBC
export const encryption = async (plaintext) => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-cbc", ENC_KEY, iv);
    let encryptData = cipher.update(plaintext, "utf-8", "hex");
    encryptData += cipher.final("hex");
    return `${iv.toString("hex")}:::${encryptData}`;
};


// decrypt the encrypted text back to plain text
export const decryption = async (cipherText) => {
    const [iv, encryptedData] = cipherText.split(":::");
    const iv_vector = Buffer.from(iv, "hex");
    const decipherVector = crypto.createDecipheriv("aes-256-cbc",ENC_KEY,iv_vector);
    let plaintext = decipherVector.update(encryptedData,"hex","utf8");
    plaintext += decipherVector.final("utf8");
    return plaintext;
}