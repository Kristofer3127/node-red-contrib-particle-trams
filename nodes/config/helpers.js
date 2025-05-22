"use strict";

// Only initialize helpers in browser environment if not already defined
if (typeof window !== "undefined" && !window.helpers) {
  // HTML generators for node configuration UI
  const UI = {
    generateFieldScopeSelector: () => `
      <div class="form-row form-row-radio">
        <label for="node-input-scope"><i class="im im-scope-icon"></i> <span>Scope</span></label>
        <label class="radio">
          <input type="radio" name="node-input-scope-options" id="node-input-scope-user" value="user">
          User
        </label>
        <label class="radio">
          <input type="radio" name="node-input-scope-options" id="node-input-scope-product" value="product">
          Product
        </label>
        <input type="hidden" id="node-input-scope">
      </div>
      <div class="form-row hidden" id="particle-scope-product">
        <label for="node-input-scope"><i class="im im-product-icon"></i> <span>Product</span></label>
        <input type="text" id="node-input-product" placeholder="Product slug or ID">
      </div>
    `,

    generateFieldSelect: (field) => {
      let options = field.values
        .map((val) => {
          const selected = val.value === field.defaultValue ? "selected" : "";
          return `<option value="${val.value}" ${selected}>${val.title}</option>`;
        })
        .join("");

      return `
        <div class="form-row">
          <label for="node-input-${field.name}"><i class="${field.icon}"></i> ${field.title}</label>
          <select id="node-input-${field.name}">
            ${options}
          </select>
        </div>
      `;
    },

    generateField: (field) => {
      if (field.type === "scope-selector") {
        return UI.generateFieldScopeSelector(field);
      }

      if (field.type === "select") {
        return UI.generateFieldSelect(field);
      }

      return `
        <div class="form-row">
          <label for="node-input-${field.name}"><i class="${field.icon}"></i> ${
        field.title
      }</label>
          <input type="${field.type === "object" ? "text" : field.type}" 
                 id="node-input-${field.name}" 
                 placeholder="${field.placeholder}">
        </div>
      `;
    },

    generateEditTemplate: ({ name, fields }) => {
      const html = fields.map((field) => UI.generateField(field)).join("");
      $(`script[data-template-name="${name}"]`).html(html);
    },

    generateDocumentation: ({
      name,
      title,
      inputs = [],
      outputs = [],
      details,
      resources,
    }) => {
      let html = `<p>${title}</p>`;

      if (inputs.length > 0) {
        html += `
          <h3>Inputs</h3>
          <dl class="message-properties">
            ${inputs
              .map(
                (input) => `
              <dt class="${input.optional ? "optional" : ""}">${input.name} 
                <span class="property-type">${input.type}</span>
              </dt>
              <dd>${input.description}</dd>
            `
              )
              .join("")}
          </dl>
        `;
      }

      if (outputs.length > 0) {
        html += `
          <h3>Outputs</h3>
          <dl class="message-properties">
            ${outputs
              .map(
                (output) => `
              <dt>${output.name} <span class="property-type">${output.type}</span></dt>
              <dd>${output.description}</dd>
            `
              )
              .join("")}
          </dl>
        `;
      }

      html += `
        <h3>Details</h3>
        <p>${details}</p>
        <h3>Resources</h3>
        <ul>
          ${resources
            .map(
              (resource) => `
            <li>
              <a href="${resource.link}">${resource.name}</a> - ${resource.description}
            </li>
          `
            )
            .join("")}
        </ul>
      `;

      $(`script[data-help-name="${name}"]`).html(html);
    },

    addCSS: () => {
      $("body").append(`
        <link rel="stylesheet" href="https://s3.amazonaws.com/icomoon.io/49057/Dashboard/style.css?r41hg3">
        <style>
          .form-row input[type="radio"] {
            width: auto !important;
          }
          .form-row label i.fa {
            width: 14px;
          }
          .form-row-radio {
            padding-top: 9px;
          }
        </style>
      `);
    },
  };

  // Client-side node configuration
  const generateClientConfig = (config) => {
    const nodeClient = {
      ...config,
      category: "particle",
      color: "#C0DEED",
    };

    if (config._scopeSelector === true) {
      nodeClient.onScopeChange = function () {
        const stream =
          $("input[name=node-input-scope-options]:checked").val() || "user";

        if (stream === "product") {
          $("#particle-scope-product").removeClass("hidden");
        } else {
          $("#particle-scope-product").addClass("hidden");
          $("#node-input-product").val("");
        }

        $("#node-input-stream").val(stream);
      };

      nodeClient.oneditprepare = function () {
        $("input[name=node-input-scope-options]")
          .prop("checked", null)
          .change(nodeClient.onScopeChange.bind(this));

        const isProduct = $("#node-input-product").val();

        if (isProduct) {
          $("#node-input-scope-product").prop("checked", true);
        } else {
          $("#node-input-scope-user").prop("checked", true);
        }

        nodeClient.onScopeChange();
      };

      nodeClient.oneditsave = function () {
        nodeClient.onScopeChange();
      };
    }

    return nodeClient;
  };

  const generateNodeFromDefinition = (name, definition) => {
    UI.generateEditTemplate(definition.editTemplate);
    UI.generateDocumentation(definition.documentation);
    UI.addCSS();

    RED.nodes.registerType(name, generateClientConfig(definition.client));
  };

  // Expose helpers API
  window.helpers = {
    generateEditTemplate: UI.generateEditTemplate,
    generateDocumentation: UI.generateDocumentation,
    generateClientConfig,
    generateNodeFromDefinition,
  };
}
