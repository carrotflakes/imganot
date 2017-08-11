const fs = require('fs');

const store = {};

function getStore() {
  return store;
}

function load(datasetName) {
  return store[datasetName] || {};
}

function save(datasetName, userId, data) {
  if (!store[datasetName])
    store[datasetName] = {};
  store[datasetName][userId] = data;
}

module.exports = {
  getStore,
  load,
  save,
};
