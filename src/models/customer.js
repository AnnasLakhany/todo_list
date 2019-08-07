import mongoose from 'mongoose';
import { TIME_STAMPES, FLAGS } from '../utilites/constants';
import { isEmail } from 'validator';
import { stringify } from 'querystring';
let ObjectId = mongoose.Schema.Types.ObjectId;
let orderSchema = mongoose.Schema({
    brand_id: {
        type: ObjectId,
    },
    offer_id: {
        type: ObjectId,
    },
    timestamps: TIME_STAMPES,
    status: FLAGS
})

let offerAvailSchema = mongoose.Schema({
    offer_id: {
        type: ObjectId
    },
    total_amount: {
        type: String,
        required: true
    },
    save_Amount: {
        type: String
    },
    avail_on: {
        type: Date,
        default: Date.now
    },
    _id: false,

})
let favouriteOfferSchema = mongoose.Schema({
    offer: {
        type: ObjectId,
        // required: true
    },
    _id: false,
    timestamps: TIME_STAMPES,
    status: FLAGS,
})
let favouriteBrandSchema = mongoose.Schema({
    brand: {
        type: ObjectId,
        // required: true
    },
    _id: false,
    timestamps: TIME_STAMPES,
    status: FLAGS,
})
let subscriptionSchema = mongoose.Schema({
    package_id: {
        type: ObjectId
    },
    start_at: {
        type: Date,
        default: Date.now
    },
    end_at: {
        type: Date,
        default: Date.now
    },
    subscription_status: {
        type: Boolean,
        default: true
    },
    activation_code_id: {
        type: ObjectId
    },
    promo_code_id: {
        type: ObjectId
    },
    // _id: false,
    timestamps: TIME_STAMPES,
    status: FLAGS,
})
let deviceSchema = mongoose.Schema({
    device_id: {
        type: String,
        // required: true
    },
    device_name: {
        type: String,
        // required: true
    },
    _id: false,
    timestamps: TIME_STAMPES,
    status: FLAGS
})
let customerSchema = mongoose.Schema({
    first_name: {
        type: String,
        required: true
    },
    device: [deviceSchema],
    subscription: [subscriptionSchema],
    // orders: {
    //     brands: [{
    //         type: ObjectId,
    //     }],
    //     offers: [{
    //         type: ObjectId,
    //     }],
    // },
    last_name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        validate: [isEmail, 'invalid email']
    },
    password: {
        type: String,
        required: true,
    },
    gender: {
        type: String,
        required: true
    },
    date_of_birth: {
        type: Date,
        required: true
    },
    passwordResetToken: {
        type: String,
        default: null
    },
    passwordResetExpires: {
        type: Date,
        default: null
    },
    phone: {
        type: String,
        required: true,
    },
    favouriteOffer: [favouriteOfferSchema],
    favouriteBrand: [favouriteBrandSchema],
    city: {
        type: ObjectId,
        required: true,
    },
    refer_id: {
        type: String,
        unique: true
        // required: true
    },
    role_id: {
        type: ObjectId,
        required: true
    },
    refered: {
        customer_id: [{
            type: ObjectId,
            // required: true
        }]
    },
    offer_Avail: [offerAvailSchema],
    notification_ids: [
        {
            type: ObjectId
            // required: true
        }
    ],
    // package_Id: {
    //     type: ObjectId,
    //     // required: true,
    // }, 
    timestamps: TIME_STAMPES,
    status: FLAGS,
});
var validateEmail = function (email) {
    var re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return re.test(email)
};
let Customer = module.exports = mongoose.model('customer', customerSchema);
module.exports.get = function (filter, callback) {
    if (!filter) {
        filter = {};
    }
    filter["status.is_deleted"] = false;
    // Customer.find(filter,callback);
    Customer.find(filter).lean().exec(callback);
};
module.exports.add = function (customer, callback) {
    Customer.create(customer, callback);
};
// module.exports.save = function (customer, callback) {
//     Customer.save(customer, callback);
// };
module.exports.remove = function (id, callback) {
    let remove = {
        'status.is_deleted': true,
        'status.is_activated': false,
        'timestamps.updated_at': new Date()
    };
    Customer.updateOne({ _id: id }, remove, callback);
};
module.exports.getdata = function (gdate, ldate, callback) {
    let obj = {};
    if (gdate != null || ldate != null) {
        obj = { $or: [{ 'offer_Avail.avail_on': { $gte: new Date(gdate), $lte: new Date(ldate) } }] };
    }
    Customer.find(obj).lean().exec(callback);
};

module.exports.update = function (id, customer, callback) {
    customer.$set = {
        "timestamps.updated_at": new Date(),
    }
    Customer.updateOne({ _id: id }, customer, callback);
};

module.exports.updateByDeviceId = function (device_id, notification_id, callback) {
    let noti = mongoose.Types.ObjectId(notification_id);
    let customer = {}
    customer.$set = {
        "timestamps.updated_at": new Date()

    }
    customer.$push = {
        "notification_ids": [noti]
    }
    Customer.updateOne({ "device.device_id": device_id }, customer, callback);
};

module.exports.updateExpiry = function (data, callback) {
    Customer.updateOne(
        { _id: mongoose.Types.ObjectId(data.customer_id), "subscription.activation_code_id": mongoose.Types.ObjectId(data.activation_code_id) },
        {
            $set: {
                "subscription.$.subscription_status": true,
                "subscription.$.end_at": data.currentEndDate,
                "subscription.$.status.is_deleted": false,
                "subscription.$.status.is_activated": true,
                "subscription.$.timestamps.updated_at": new Date()
            }
        }
        , callback)
    // Customer.updateOne({ _id: id }, remove, callback);
};

module.exports.countAvailOffers = function (customer_id, offer_id, callback) {
    Customer.aggregate([
        {
            $match: { "_id": mongoose.Types.ObjectId(customer_id) }
        },
        { $unwind: "$offer_Avail" }
        , {
            $match: {
                $and: [
                    { "offer_Avail.avail_on": { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
                    { "offer_Avail.offer_id": mongoose.Types.ObjectId(offer_id) }
                ]
            }

        }
        , { $count: "total_count" }
    ], callback)
};
module.exports.removeFavouriteOffer = function (id, offer_id, callback) {
    Customer.updateOne(
        { _id: mongoose.Types.ObjectId(id), "favouriteOffer.offer": mongoose.Types.ObjectId(offer_id) },
        {
            $set: {
                "favouriteOffer.$.status.is_deleted": true,
                "favouriteOffer.$.status.is_activated": false,
                "favouriteOffer.$.timestamps.updated_at": new Date()
            }
        }
        , callback)
    // Customer.updateOne({ _id: id }, remove, callback);
};
module.exports.updateFavouriteOffer = function (id, offer_id, callback) {
    Customer.updateOne(
        { _id: mongoose.Types.ObjectId(id), "favouriteOffer.offer": mongoose.Types.ObjectId(offer_id) },
        {
            $set: {
                "favouriteOffer.$.status.is_deleted": false,
                "favouriteOffer.$.status.is_activated": true,
                "favouriteOffer.$.timestamps.updated_at": new Date()
            }
        }
        , callback)
    // Customer.updateOne({ _id: id }, remove, callback);
};
module.exports.getFavouriteoffer_1 = function (data, callback) {
    Customer.aggregate([
        // { $unwind: "$favouriteOffer" },
        {
            $match: {
                "$and": [{
                    $and: data
                }]
            }
        }], callback)
}
module.exports.getFavouriteoffer = function (id, callback) {
    Customer.aggregate([{ $unwind: "$favouriteOffer" },
    {
        $match: {
            "$and": [{
                _id: mongoose.Types.ObjectId(id),
                'status.is_deleted': false,
                'favouriteOffer.status.is_deleted': false
            }]
        }
    }], callback)
}
module.exports.getFavouriteBrand = function (id, callback) {
    Customer.aggregate([{ $unwind: "$favouriteBrand" },
    {
        $match: {
            "$and": [{
                _id: mongoose.Types.ObjectId(id),
                'status.is_deleted': false,
                'favouriteBrand.status.is_deleted': false
            }]
        }
    }], callback)
}
module.exports.updateFavouriteBrand = function (id, brand_id, callback) {
    Customer.updateOne(
        { _id: mongoose.Types.ObjectId(id), "favouriteBrand.brand": mongoose.Types.ObjectId(brand_id) },
        {
            $set: {
                "favouriteBrand.$.status.is_deleted": false,
                "favouriteBrand.$.status.is_activated": true,
                "favouriteBrand.$.timestamps.updated_at": new Date()
            }
        }
        , callback)
    // Customer.updateOne({ _id: id }, remove, callback);
};
module.exports.removeFavouriteBrand = function (id, brand_id, callback) {
    Customer.updateOne(
        { _id: mongoose.Types.ObjectId(id), "favouriteBrand.brand": mongoose.Types.ObjectId(brand_id) },
        {
            $set: {
                "favouriteBrand.$.status.is_deleted": true,
                "favouriteBrand.$.status.is_activated": false,
                "favouriteBrand.$.timestamps.updated_at": new Date()
            }
        }
        , callback)
    // Customer.updateOne({ _id: id }, remove, callback);
};