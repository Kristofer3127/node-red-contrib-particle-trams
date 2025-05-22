"use strict";

const ParticleBaseNode = require("../../src/particle-base-node");

module.exports = (RED) => {
  class ParticleVariableNode {
    constructor(config) {
      RED.nodes.createNode(this, config);

      new ParticleBaseNode({
        self: this,
        node: config,
        RED: RED,
        properties: ["name", "scope", "device", "product", "variable"],
        inputProperties: ["device", "variable"],
        functionName: "getVariable",
        functionArguments: [
          { key: "deviceId", value: "device" },
          { key: "name", value: "variable" },
          { key: "product", value: "product" },
        ],
        mandatoryArguments: ["deviceId", "name"],
        success: {
          fields: [
            { key: "payload" },
            { key: "variable", value: "variable" },
            { key: "device", value: "device" },
          ],
          status: "fetched",
        },
        info: {
          status: "fetching",
        },
        error: {
          status: "failed",
          onRuntime: "Failed to fetch variable",
        },
      });
    }
  }

  RED.nodes.registerType("particle-variable", function (config) {
    return new ParticleVariableNode(config);
  });
};
