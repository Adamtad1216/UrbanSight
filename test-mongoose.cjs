const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  status: { type: String, enum: ['submitted', 'completed', 'rejected'] }
});
const Model = mongoose.model('TestModel', schema);

async function run() {
  try {
    await Model.findOne({ status: { $nin: ['completed', 'rejected'] } });
    console.log("Query 1 success");
  } catch (e) {
    console.error("Query 1 error:", e.message);
  }

  try {
    await Model.findOne({ status: { $nin: undefined } });
    console.log("Query 2 success");
  } catch (e) {
    console.error("Query 2 error:", e.message);
  }

  try {
    await Model.create({ status: { $nin: ['completed', 'rejected'] } });
    console.log("Create success");
  } catch (e) {
    console.error("Create error:", e.message);
  }
}

run();
