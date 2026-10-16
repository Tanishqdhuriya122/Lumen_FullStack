import { apierror } from "../utils/apierror.js"

const errorHandler = (err, req, res, next) => {
    let error = err

    if (!(error instanceof apierror)) {
        const statusCode = error.statusCode || 500
        const message = error.message || "Something went wrong"
        error = new apierror(statusCode, message, error?.errors || [], err.stack)
    }

    return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errors: error.errors || [],
    })
}

export { errorHandler }