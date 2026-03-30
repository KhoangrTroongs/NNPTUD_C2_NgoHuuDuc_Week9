let mongoose = require('mongoose');

let messageContentSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['file', 'text'],
        required: true
    },
    text: {
        type: String, // Có thể là đoạn text hoặc là URL/đường dẫn của file
        required: true
    }
}, { _id: false }); // Không tạo _id cho sub-document này

let messageSchema = new mongoose.Schema({
    from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    messageContent: {
        type: messageContentSchema,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('message', messageSchema);
