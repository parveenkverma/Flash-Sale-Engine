module.exports = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;

  // ---- CLIENT ERROR (4xx) ----//
  if (status >= 400 && status < 500 && status !== 409) {
    return res.status(status).json({
      type: "RXERROR",
      message: err.message || "Bad Request"
    });
  }

  // ---- CONFLICT ERROR (409) ----//
  if (status === 409) {
    return res.status(409).json({
      type: "RXERROR",
      message: err.message || "Conflict"
    });
  }

  // ---- MONGOOSE VALIDATION ERROR → 400 ----//
  if (err.name === "ValidationError") {
    return res.status(400).json({
      type: "RXERROR",
      message: "Validation failed",
      errors: err.errors
    });
  }

  // ---- MONGOOSE CAST ERROR (invalid ObjectId etc.) → 400 ----//
  if (err.name === "CastError") {
    return res.status(400).json({
      type: "RXERROR",
      message: `Invalid ${err.path}: ${err.value}`
    });
  }

  // ---- SYSTEM ERROR (5xx) ----//
  console.error("[SERVER ERROR]", err);

  return res.status(500).json({
    type: "RXERROR",
    message: "Internal Server Error"
  });
};
