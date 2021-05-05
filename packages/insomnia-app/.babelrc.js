module.exports = /** @type { import('@babel/core').TransformOptions } */ {
  "presets": [
    "@babel/preset-react",
  ],
  "plugins": [
    "babel-plugin-styled-components",
    [
      "@babel/plugin-proposal-decorators",
      {
        "legacy": true
      }
    ],
    ["@babel/plugin-proposal-class-properties", { "loose" : true }],
    "@babel/plugin-proposal-optional-chaining"
  ],
  "env": {
    "development": {
      "plugins": [
        "react-hot-loader/babel"
      ]
    },
    "test": {
      "presets": [
        [
          "@babel/preset-env",
          {
            "targets": {
              "node": "12"
            }
          }
        ],
      ]
    }
  }
}