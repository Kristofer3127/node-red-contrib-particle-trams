"use strict";

const helpers = require("../../src/helpers");
const ParticleBaseNode = require("../../src/particle-base-node");

module.exports = (RED) => {
  /**
   * Node-RED node for subscribing to Particle events
   * @param {Object} config Node configuration
   */
  function ParticleSubscribeNode(config) {
    RED.nodes.createNode(this, config);

    const node = this;

    /**
     * Handle incoming Particle events
     * @param {Object} eventData Event data from Particle
     */
    const handleEvent = (eventData) => {
      helpers.onSuccess({
        status: node.status.bind(node),
        message: "new event",
      });

      node.send({
        event: eventData.name,
        payload: eventData.data,
        published_at: eventData.published_at,
        device: eventData.coreid,
      });
    };

    /**
     * Determine device ID based on configuration
     * @param {Object} options Node configuration options
     * @returns {string|undefined} Configured device ID
     */
    const resolveDeviceId = ({ device, product }) => {
      if (product) {
        return device === "" ? undefined : device;
      } else {
        return device === "" ? "mine" : device;
      }
    };

    new ParticleBaseNode({
      self: node,
      node: config,
      RED: RED,
      properties: ["name", "scope", "device", "product", "event"],
      functionName: "listenToEventStream",
      functionArguments: [
        {
          key: "deviceId",
          customValue: resolveDeviceId,
        },
        { key: "name", value: "event" },
        { key: "product", value: "product" },
        {
          key: "onEvent",
          defaultValue: handleEvent,
        },
      ],
      mandatoryArguments: [],
      runOnLoad: true,
      info: {
        status: "setting up stream",
      },
      error: {
        status: "failed to set up stream",
        onRuntime: "Failed to set up stream",
      },
    });
  }

  RED.nodes.registerType("particle-subscribe", ParticleSubscribeNode);
};
