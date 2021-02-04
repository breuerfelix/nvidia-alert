const sleep = s =>
  new Promise(resolve => setTimeout(resolve, s * 1000));

module.exports = {sleep};
