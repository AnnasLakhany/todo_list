import mongoose from 'mongoose';
import { TIME_STAMPES, FLAGS } from '../utilites/constants';
import { isEmail } from 'validator';
let ObjectId = mongoose.Schema.Types.ObjectId;

let popupSchema = mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    brand_id: {
        type: ObjectId,
        required: true
    },
    timestamps: TIME_STAMPES,
    status: FLAGS
});
let Popup = module.exports = mongoose.model('popups', popupSchema);
module.exports.get = function (filter, callback) {
    if (!filter) {
        filter = {};
    }
    filter["status.is_deleted"] = false;
    Popup.find(filter).lean().exec(callback);
};
module.exports.add = function (popup, callback) {
    Popup.create(popup, callback);
};
module.exports.remove = function (id, callback) {
    let remove = {
        'status.is_deleted': true,
        'status.is_activated': false,
        'timestamps.updated_at': new Date()
    };
    Popup.updateOne({ _id: id }, remove, callback);
};
module.exports.update = function (id, popup, callback) {
    let update = {
        'title': popup.title,
        'description': popup.description,
        'image': popup.image,
        'brand_id': popup.brand_id,    
        'timestamps.updated_at': new Date()
    };
    Popup.updateOne({ _id: id }, update, callback);
};
