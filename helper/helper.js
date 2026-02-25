// helper: return value if defined, otherwise fallback
const isset = (string, value = "") => {
  return typeof string != "undefined" ? string : value;
};

// Format joi validator error
const formatJoiError = (errors) => {
  let joiErrors = errors.details;
  let formatError = {};
  joiErrors.forEach((data) => {
    formatError[data.path[0]] = data.message.replace(/"/g, "");
  });
  return formatError;
};

module.exports = {
  isset,
  formatJoiError
};
