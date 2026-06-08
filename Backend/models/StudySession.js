const mongoose = require('mongoose');

const studySessionSchema = new mongoose.Schema({
    subject: {type: String, required: true},
    topic: {type: String, required: true},
    studyData: {type: String, required: true},
    priority: {type: String, required: true, enum: ['Alta', 'Media', 'Bassa']},
    completed: {type: Boolean, default: false},
    fileName: {type: String, default: ""}, 
    fileUrl: {type: String, default: ""},
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }

}, {timestamps: true});

module.exports = mongoose.model('StudySession', studySessionSchema);
