import mongoose from 'mongoose';
import { TIME_STAMPES, FLAGS } from '../utilites/constants';
import { isEmail } from 'validator';
let ObjectId = mongoose.Schema.Types.ObjectId;
let bannerSchema = mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    bannerImage: {
        type: String,
        required: true
    },
    link: {
        offer_id: {
            type: ObjectId,
        },
        brand_id: {
            type: ObjectId,
        }
    },
    category_id: {
        type: ObjectId,
        required: true
    },
    timestamps: TIME_STAMPES,
    status: FLAGS
});
let Banner = module.exports = mongoose.model('banners', bannerSchema);
module.exports.get = function (filter, callback) {
    if (!filter) {
        filter = {};
    }
    filter["status.is_deleted"] = false;
    Banner.find(filter).lean().exec(callback);
};
module.exports.add = function (banner, callback) {
    Banner.create(banner, callback);
};
module.exports.remove = function (id, callback) {
    let remove = {
        'status.is_deleted': true,
        'status.is_activated': false,
        'timestamps.updated_at': new Date()
    };
    Banner.updateOne({ _id: id }, remove, callback);
};
module.exports.update = function (id, banner, callback) {
    let update = {
        'title': banner.title,
        'bannerImage': banner.bannerImage,
        'link': {
            'offer_id': banner.offer_id,
            'brand_id': banner.brand_id,
        },
        'timestamps.updated_at': new Date()
    };
    Banner.updateOne({ _id: id }, update, callback);
};
