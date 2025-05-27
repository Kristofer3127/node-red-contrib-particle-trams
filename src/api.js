"use strict";

const Particle = require("particle-api-js");

module.exports = class Api {
  /**
   * API wrapper constructor
   *
   * @param {ParticleConfigNode} auth
   * @param {Console} logger
   */
  constructor(auth, logger = console) {
    this._auth = auth;
    this._logger = logger;
    this._defaultExpiresIn = 2147483647;
    this._init();
  }

  /**
   * Login using the client credentials, store the access token
   * and set up token refresh before it expires
   *
   * @returns {Promise} Login promise
   */
  login() {
    return this._particle.loginAsClientOwner({}).then((res) => {
      this._logger.log(`Authenticated with Particle, Dependency version: ${require("particle-api-js/package.json").version}`);
      this._accessToken = res.body.access_token;
      // Reauthenticate before the token expires
      // There is res.body.expires_in property but
      // as setTimeout is using 32 bit int the maximum
      // we can set is 2147483647 (~24 days)
      const expiresIn = Math.min(this._defaultExpiresIn, res.body.expires_in);
      this._expirationTimer = setTimeout(
        this._reauthenticate.bind(this),
        expiresIn
      );

      return this._accessToken;
    });
  }

  /**
   * Get the EventStream and subscribe to the 'event' event
   * with onEvent callback
   *
   * @param {Object} options Stream options
   * @param {Function} options.onEvent Event handler callback
   * @param {String} options.deviceId Device ID or name
   * @param {String} options.name Event name
   * @param {String} options.product Product ID or slug
   * @returns {Promise} Resolves when adding listener succeeded
   */
  listenToEventStream(options) {
    const { onEvent, deviceId, name, product } = options;
    this._lastListenOptions = options;

    return this._particle
      .getEventStream(
        this._addAuth({
          deviceId,
          name,
          product,
        })
      )
      .then((stream) => {
        this._stream = stream;
        this._stream.on("event", onEvent);
        this._stream.on("error", this._reauthenticate.bind(this));
        this._stream.on("end", this._reauthenticate.bind(this));
      });
  }

  /**
   * Publish a Particle event
   *
   * @param {Object} params Event params
   * @param {String} params.name Event name
   * @param {String} params.data Event data
   * @param {String} params.product Event for this product ID or slug
   * @param {Boolean} params.isPrivate Should the event be publicly available?
   * @returns {Promise} Resolves when event has been published
   */
  publishEvent(params) {
    return this._particle.publishEvent(this._addAuth(params));
  }

  /**
   * Get the value of a device variable
   * @param {Object} params Options for this API call
   * @param {String} params.deviceId Device ID or Name
   * @param {String} params.name Variable name
   * @param {String} [params.product] Device in this product ID or slug
   * @return {Promise} Resolves with the variable value
   */
  getVariable(params) {
    return this._particle.getVariable(this._addAuth(params)).then(
      (response) => response.body.result,
      (error) => {
        throw error;
      }
    );
  }

  /**
   * Call a device function
   * @param {Object} params Options for this API call
   * @param {String} params.deviceId Device ID or Name
   * @param {String} params.name Function name
   * @param {String} params.argument Function argument
   * @param {String} [params.product] Device in this product ID or slug
   * @return {Promise} Resolves with the function return value
   */
  callFunction(params) {
    return this._particle.callFunction(this._addAuth(params)).then(
      (response) => response.body.return_value,
      (error) => {
        throw error;
      }
    );
  }

  /**
   * Make a direct request to the Particle API
   * @param {Object} params Request parameters
   * @return {Promise} Resolves with the API response
   */
  request(params) {
    return this._particle.request(this._addAuth(params));
  }

  /**
   * Close the stream, remove all timers, listeners etc.
   */
  cleanup() {
    clearTimeout(this._expirationTimer);

    if (this._stream) {
      this._stream.abort();
    }

    this._particle.deleteCurrentAccessToken({
      auth: this._accessToken,
    });
  }

  /**
   * Helper method to add auth token to params
   * @param {Object} params Parameters to add auth to
   * @return {Object} Parameters with auth token added
   * @private
   */
  _addAuth(params) {
    return Object.assign({}, params, { auth: this._accessToken });
  }

  /**
   * Instantiate Particle and set the config
   *
   * @private
   */
  _init() {
    this._particle = new Particle({
      clientId: this._auth.clientId,
      clientSecret: this._auth.clientSecret,
    });
    this._particle.setContext("tool", {
      name: "node-red-contrib-particle",
    });
  }

  /**
   * Callback that fetches a new token and recreates all
   * event callbacks to prevent data loss.
   *
   * @private
   */
  _reauthenticate() {
    this._logger.log("Reauthenticating...");
    this.cleanup();

    this.login()
      .then(() => {
        if (this._lastListenOptions) {
          this._logger.log(this._lastListenOptions);
          this._logger.log("Reconnecting to event stream...");

          this.listenToEventStream(this._lastListenOptions).catch((err) => {
            this._logger.error(`Failed to reconnect to event stream: ${err}`);
          });
        }
      })
      .catch(() => {
        const retryIn = 5;
        this._logger.error(
          `Failed to reauthenticate. Trying again in ${retryIn} seconds`
        );
        setTimeout(this._reauthenticate.bind(this), retryIn * 1000);
      });
  }
};
