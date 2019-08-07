import mongoose from 'mongoose';
import { TIME_STAMPES, FLAGS } from '../utilites/constants';
import { isEmail } from 'validator';
import { stringify } from 'querystring';
let ObjectId = mongoose.Schema.Types.ObjectId;
let popupSchema = mongoose.Schema({
    _id: false
});
// let screenSchema = mongoose.Schema({
//     screen_name: {
//         type: String,
//         required: true,
//     },
//     screen_id: {
//         type: String,
//         required: true,
//     },
//     popup: popupSchema,
//     _id: false

// });
let actionSchema = mongoose.Schema({
    screen_id: {
        type: String,
        // required: true,
        default: null
    },
    brand_id_action: {
        type: ObjectId,
        // required: true,
        default: null
    },
    collection_id: {
        type: ObjectId,
        // required: true,
        default: null
    },
    link: {
        type: String,
        // required: true,
        default: null
    },
    popup: popupSchema,
    _id: false

});
let citytypeSchema = mongoose.Schema({
    base: {
        type: Boolean,
        default: false
    },
    real: {
        type: Boolean,
        default: false
    },
    _id: false
});
let daterangetransactionSchema = mongoose.Schema({
    start_date: {
        type: Date,
        default: null
    },
    end_date: {
        type: Date,
        default: null

    },
    _id: false
});
let offertransactionSchema = mongoose.Schema({
    offer_id: {
        type: ObjectId,
        default: null

    },
    minimumofferavail: {
        type: String,
        default: null
    },
    _id: false
});
let realtimeSchema = mongoose.Schema({
    radius: {
        type: Number,
        default: null

    },
    _id: false
});
let citySchema = mongoose.Schema({
    citytype: citytypeSchema,
    daterangetransaction: daterangetransactionSchema,
    offertransaction: offertransactionSchema,
    _id: false

});
let notificationSchema = mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true
    },
    action: actionSchema,
    icon: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    fliter: {
        city: citySchema,
        realtime: realtimeSchema
    },
    city_id: {
        type: ObjectId,
        default: null

    },
    brand_id: {
        type: ObjectId,
        default: null

    },
    brandlocation_id: {
        type: ObjectId,
        default: null

    },
    timestamps: TIME_STAMPES,
    status: FLAGS,
});

let Notification = module.exports = mongoose.model('notification', notificationSchema);
module.exports.get = function (filter, callback) {
    if (!filter) {
        filter = {};
    }
    filter["status.is_deleted"] = false;
    // notification(filter,callback);
    Notification.find(filter).lean().exec(callback);
};

module.exports.add = function (notification, callback) {
    Notification.create(notification, callback);
};
module.exports.remove = function (id, callback) {
    let remove = {
        'status.is_deleted': true,
        'status.is_activated': false,
        'timestamps.updated_at': new Date()
    };
    Notification.updateOne({ _id: id }, remove, callback);
};
module.exports.update = function (id, notification, callback) {
    notification.$set = {
        "timestamps.updated_at": new Date(),
    }
    Notification.updateOne({ _id: id }, notification, callback);
};
