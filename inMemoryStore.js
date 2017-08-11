const fs = require('fs');

const store = {};

function getStore() {
  return store;
}

function getAchievement(datasetName) {
  const data = store[datasetName] || {};
  const achivement = {};
  for (const userId of Object.keys(data)) {
    if (data[userId].length > 0) {
      achivement[userId] = data[userId].length;
    }
  }
  return achivement;
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
  getAchievement,
  load,
  save,
};
