
// create multiple documents
export const create = async ({
    model,
    data = [{}],
    options = { validateBeforeSave: true }
} = {}) => {

    return await model.create(data, options)
}


// create a single document
export const createOne = async ({
    model,
    data = {},
    options = { validateBeforeSave: true }
} = {}) => {
    const [doc] = await create({ model, data: [data], options });
    return doc
}

// find one document by filter
export const findOne = async ({
    model,
    filter = {},
    options = {}
} = {}) => {
    const doc = model.findOne(filter);
    if (options.select) {
        doc.select(options.select);
    }
    if (options.populate) {
        doc.populate(options.populate);
    }
    if (options.lean) {
        doc.lean();
    }
    return await doc.exec();
}

// find one document by id
export const findById = async ({
    id,
    options = {},
    model
} = {}) => {
    const doc = model.findById(id);
    if (options.select) {
        doc.select(options.select);
    }
    if (options.populate) {
        doc.populate(options.populate);
    }
    if (options.lean) {
        doc.lean(options.lean);
    }
    return await doc.exec();
}

// find multiple documents with options
export const find = async ({
    filter = {},
    options = {},
    model
} = {}) => {
    const doc = model.find(filter);
    if (options.select) {
        doc.select(options.select);
    }
    if (options.populate) {
        doc.populate(options.populate);
    }
    if (options.skip) {
        doc.skip(options.skip);
    }
    if (options.limit) {
        doc.limit(options.limit);
    }
    if (options.sort) {
        doc.sort(options.sort);
    }
    if (options.lean) {
        doc.lean(options.lean);
    }
    return await doc.exec();
}

// insert many documents at once
export const insertMany = async ({
    data,
    model
} = {}) => {
    return (await model.insertMany(data))
}

// update one document
export const updateOne = async ({
    filter,
    update,
    options,
    model
} = {}) => {
    return await model.updateOne(
        filter || {},
        { ...update, $inc: { __v: 1 } },
        options
    );
}

// find and update one document
export const findOneAndUpdate = async ({
    filter,
    update,
    options,
    model
} = {}) => {
    return await model.findOneAndUpdate(
        filter || {},
        { ...update, $inc: { __v: 1 } },
        {
        new: true,
        runValidators: true,
        ...options,
        }
    );
}

// find by id and update
export const findByIdAndUpdate = async ({
    id,
    update,
    options = { new: true },
    model
}) => {
    return await model.findByIdAndUpdate(
        id,
        { ...update, $inc: { __v: 1 } },
        options
    );
}

// delete one document
export const deleteOne = async ({
    filter,
    model
} = {}) => {
    return await model.deleteOne(filter || {});
}

// delete many documents
export const deleteMany = async ({
    filter,
    model
} = {}) => {
    return await model.deleteMany(filter || {});
}

// find and delete one document
export const findOneAndDelete = async ({
    filter,
    model
} = {}) => {
    return await model.findOneAndDelete(
        filter || {},
    );
}
