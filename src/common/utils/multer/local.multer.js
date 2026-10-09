import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { resolve } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { BadException } from '../../exceptions/error.exception.js';

export const fileValidation = {
    image: ["image/jpeg", "image/png", "image/gif"],
    files: ["application/pdf", "application/json"]
};

export const localFileUpload = ({ maxFileSize = 5 } = {}) => {
    const storage = multer.memoryStorage();
    return multer({ storage, limits: { fileSize: maxFileSize * 1024 * 1024 } });
};

export const processFile = async ({ customPath = "general", file, validation = [] }) => {
    // check magic bytes from buffer to verify real file type
    const result = await fileTypeFromBuffer(file.buffer);
    if (!result || !validation.includes(result.mime)) {
        throw BadException("Invalid file formats");
    } else {
        await mkdir(resolve(`./assets/${customPath}`), { recursive: true });
        const uniqueFilePath = `assets/${customPath}/${randomUUID()}.${result.ext}`;
        await writeFile(resolve(`./${uniqueFilePath}`), file.buffer);
        file.finalPath = uniqueFilePath;
        return file;
    }
};

export const processFiles = async ({ customPath = "general", files = [], validation = [] }) => {
    const validatedFiles = [];
    for (const file of files) {
        const result = await fileTypeFromBuffer(file.buffer);
        if (!result || !validation.includes(result.mime)) {
            throw BadException("Invalid file formats");
        }
        validatedFiles.push({ file, result });
    }

    await mkdir(resolve(`./assets/${customPath}`), { recursive: true });
    const assets = [];
    for (const { file, result } of validatedFiles) {
        const uniqueFilePath = `assets/${customPath}/${randomUUID()}.${result.ext}`;
        await writeFile(resolve(`./${uniqueFilePath}`), file.buffer);
        file.finalPath = uniqueFilePath;
        assets.push(file);
    }
    return assets;
};

export const processFields = async ({ customPath = "general", fields = {}, validation = [] }) => {
    for (const field of Object.keys(fields)) {
        for (const file of fields[field]) {
            const result = await fileTypeFromBuffer(file.buffer);
            if (!result || !validation.includes(result.mime)) {
                throw BadException("Invalid file formats");
            }
        }
    }

    const assets = [];
    for (const field of Object.keys(fields)) {
        const files = await processFiles({ customPath, files: fields[field], validation });
        assets.push({ field, files });
    }
    return assets;
};

export const processMulterUpload = async ({ req, customPath = "general", validation = [] }) => {
    if (req.file) {
        await processFile({ customPath, file: req.file, validation });
    } else if (Array.isArray(req.files)) {
        await processFiles({ customPath, files: req.files, validation });
    } else if (typeof req.files === "object" && Object.keys(req.files ?? {})?.length) {
        await processFields({ customPath, fields: req.files, validation });
    }
};
