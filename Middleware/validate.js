const {formatJoiError} = require("../helper/helper")
module.exports = (schema={}) => {
    return async (req,res,next) => {
        const input = req.body || {};
        // validate input parameters
        let result = await schema.validate(input, { abortEarly: false, allowUnknown: true });

        if (result.error) {
            let error = formatJoiError(result.error);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        next();
    }
}