const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  messageContent: {
    type: {
      type: String,
      enum: ['file', 'text']
    },
    text: String
  }
});
console.log(schema.path('messageContent.type'));
console.log(schema.path('messageContent'));
