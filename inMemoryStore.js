const fs = require('fs');

const store = {};

function getStore() {
  return store;
}

function load(datasetName) {
  return store[datasetName];
}

function push(datasetName, data) {
  if (!store[datasetName])
    store[datasetName] = {};
  store[datasetName].push(...data);
}

module.exports = {
  getStore,
  load,
  push,
};
