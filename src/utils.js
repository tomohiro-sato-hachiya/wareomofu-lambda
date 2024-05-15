const convertFromHexToUtf8 = (str) => Buffer.from(str, "hex").toString("utf8");

module.exports = {
  convertFromHexToUtf8,
};
