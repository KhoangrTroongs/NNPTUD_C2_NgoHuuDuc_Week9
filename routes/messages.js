var express = require('express');
var router = express.Router();
let mongoose = require('mongoose');
let MessageModel = require('../schemas/messages');
let { checkLogin } = require('../utils/authHandler.js.js'); // File của bạn có đuôi .js.js
let uploadHandler = require('../utils/uploadHandler');

// 1. GET /:userID - Lấy toàn bộ message giữa user hiện tại và userID (sắp xếp tăng dần theo thời gian)
router.get('/:userID', checkLogin, async (req, res) => {
    try {
        let currentUserId = req.userId;
        let partnerId = req.params.userID;

        let messages = await MessageModel.find({
            $or: [
                { from: currentUserId, to: partnerId },
                { from: partnerId, to: currentUserId }
            ]
        })
        .sort({ createdAt: 1 }) // Sắp xếp cũ -> mới
        .populate('from', 'username fullName avatarUrl')
        .populate('to', 'username fullName avatarUrl');

        res.status(200).send({
            success: true,
            data: messages
        });
    } catch (error) {
        res.status(500).send({ success: false, message: error.message });
    }
});

// 2. GET / - lấy message cuối cùng của mỗi user mà user hiện tại nhắn tin hoặc user khác nhắn cho user hiện tại
router.get('/', checkLogin, async (req, res) => {
    try {
        let currentUserId = req.userId;

        let messages = await MessageModel.aggregate([
            {
                // Lọc ra tất cả các tin nhắn có liên quan đến user hiện tại
                $match: {
                    $or: [
                        { from: new mongoose.Types.ObjectId(currentUserId) }, 
                        { to: new mongoose.Types.ObjectId(currentUserId) }
                    ]
                }
            },
            {
                // Sắp xếp giảm dần theo thời gian để lấy tin nhắn mới nhất
                $sort: { createdAt: -1 } 
            },
            {
                // Group theo id của người chat cùng (nếu from là mình thì chát với to, và ngược lại)
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ["$from", new mongoose.Types.ObjectId(currentUserId)] },
                            "$to",
                            "$from"
                        ]
                    },
                    lastMessage: { $first: "$$ROOT" } // Lấy tin nhắn đầu tiên (do đã sort giảm dần)
                }
            },
            {
                // Join bảng users để lấy thông tin của người chat cùng
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "chatPartner"
                }
            },
            { $unwind: "$chatPartner" },
            {
                // Loại bỏ bỏ các thông tin nhạy cảm của user
                $project: {
                    "chatPartner.password": 0,
                    "chatPartner.forgotpasswordToken": 0,
                    "chatPartner.forgotpasswordTokenExp": 0
                }
            },
            {
                // Sắp xếp các đoạn hội thoại, đoạn nào có tin nhắn mới thì đưa lên trên cùng
                $sort: { "lastMessage.createdAt": -1 } 
            }
        ]);

        res.status(200).send({
            success: true,
            data: messages
        });
    } catch (error) {
        res.status(500).send({ success: false, message: error.message });
    }
});

// 3. POST / - post nội dung bao gồm file hoặc text
router.post('/', checkLogin, uploadHandler.uploadFile.single('file'), async (req, res) => {
    try {
        let currentUserId = req.userId;
        let { to, text } = req.body;
        
        let messageContent = {};

        if (req.file) {
            messageContent.type = 'file';
            messageContent.text = req.file.path.replace(/\\/g, "/"); 
        } else {
            messageContent.type = 'text';
            messageContent.text = text;
        }

        if (!to) {
            return res.status(400).send({ success: false, message: "Thiếu thông tin người nhận 'to'" });
        }

        let newMessage = new MessageModel({
            from: currentUserId,
            to: to,
            messageContent: messageContent
        });

        await newMessage.save();

        res.status(201).send({
            success: true,
            data: newMessage,
            message: "Gửi tin nhắn thành công"
        });
    } catch (error) {
        res.status(500).send({ success: false, message: error.message });
    }
});

module.exports = router;
