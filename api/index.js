const app = require('../server');

let initialization;

module.exports = async function handler(req, res) {
  initialization ||= app.initializeServer();
  await initialization;
  return app(req, res);
};
