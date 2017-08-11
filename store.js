const fs = require('fs');

const store = {};

function load(datasetName) {
  return store[datasetName];
}

function save(datasetName, data) {
  store[datasetName] = data;
}

module.exports = {
  load,
  save
};
