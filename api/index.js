const { app, initializeServer } = require('../server');

let initialization;

module.exports = async function handler(req, res) {
  initialization ||= initializeServer();
  await initialization;
  return app(req, res);
};
