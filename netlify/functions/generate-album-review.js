"use strict";

// Backward-compatible route for older Muze clients.
exports.handler = async function handler(event, context) {
  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch (_) {}
  event.body = JSON.stringify({ ...body, action: body.action || "generate" });
  return require("./editorial-review").handler(event, context);
};
