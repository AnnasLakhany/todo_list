/**
 * Created by Annas on 12/24/2018.
 */
'use strict';
import { Request, Response } from 'express';
import { parseBody, generateResponse } from '../utilites';
import { hashSync, genSalt, compare } from "bcrypt";
/* import {UserModel, UserRoleModel, CityModel, CountryModel} from '..//models'; */
import { sign, verify } from "jsonwebtoken";
import config from "../conf";
import Notification from '../models/notification';
import { searchQuery } from '../utilites/query-module';
import { decryptValue } from '../utilites/encryption-module';

function getQueryParams(queryParams) {
    let findParams = {};
    findParams = {
        'status.is_deleted': false,
    };
    if (queryParams.search) {
        findParams['$or'] =
            [
                { 'first_name': { $regex: queryParams.search, $options: 'i' } },
                { 'last_name': { $regex: queryParams.search, $options: 'i' } },
                { 'email': { $regex: queryParams.search, $options: 'i' } },
            ];
    }
    if (queryParams.status) {
        findParams['status.is_activated'] = queryParams.status
    }
    if (queryParams.id != undefined && queryParams.id != "") {
        findParams._id = decryptValue(queryParams.id) || "";
    }
    return findParams;
}

const lodash = require('lodash');
import Customer from '../models/customer'
import Crontask from '../models/crontask'
import Brand from '../models/brand'
import mongoose from "mongoose";
import * as Firebase from "firebase/app";
import "firebase/auth";
import "firebase/database";
import * as _ from "lodash";
import * as admin from 'firebase-admin';
import Country from "../models/country";

// var app = admin.initializeApp();
function getUnique(arr, comp) {

    const unique = arr
        .map(e => e[comp])

        // store the keys of the unique objects
        .map((e, i, final) => final.indexOf(e) === i && i)

        // eliminate the dead keys & store unique objects
        .filter(e => arr[e]).map(e => arr[e]);

    return unique;
}

function chunkArray(myArray, chunk_size) {
    var index = 0;
    var arrayLength = myArray.length;
    var tempArray = [];
    var myChunk;
    for (index = 0; index < arrayLength; index += chunk_size) {
        myChunk = myArray.slice(index, index + chunk_size);
        // Do something if you want with the group
        tempArray.push(myChunk);
    }

    return tempArray;
}

export function create(req, res) {
    try {
        let body = parseBody(req);
        if (body) {

            if (body.screen_id) {
                body.action = {
                    screen_id: body.screen_id
                }
            }
            if (body.brand_id_action) {
                body.action = {
                    brand_id_action: body.brand_id_action
                }
            }
            if (body.collection_id) {
                body.action = {
                    collection_id: body.collection_id
                }
            }
            if (body.link) {
                body.action = {
                    link: body.link
                }
            }

            body.fliter = {
                city: {
                    citytype: {
                        base: body.base,
                        real: body.real
                    }

                }

            }
            body.fliter.city.daterangetransaction = {
                start_date: body.start_date,
                end_date: body.end_date
            }
            body.fliter.city.offertransaction = {
                offer_id: body.offer_id,
                minimumofferavail: body.minimumofferavail
            }

            body.fliter.realtime = {
                radius: body.radius
            }

            lodash.forEach(req.files, (val) => {
                if (val.fieldname == 'icon')
                    body.icon = val.path
                if (val.fieldname == 'image')
                    body.image = val.path
            })
            // console.log(body,'----',crontaskbody); return;
            Notification.add(body, function (err, notification) {
                if (err) {
                    var errors = {};
                    if (err.name == "ValidationError") {
                        for (var i in err.errors) {
                            errors[i] = err.errors[i].message;
                        }
                    } else {
                        errors[i] = err.errmsg;
                    }
                    generateResponse(false, "Unable to process your request, Please retry in few minutes.", errors, res, [], []);
                } else {
                    generateResponse(true, "Added Successfully", notification, res, ['_id'], []);

                    //filtration process starts here

                    Customer.getdata(notification.fliter.city.daterangetransaction.start_date, notification.fliter.city.daterangetransaction.end_date, function (err, data) {
                        // data = data[0];
                        Brand.getSpecificOffer(mongoose.Types.ObjectId(notification.brandlocation_id), function (err, data1) {

                            // let payload = {
                            //     title: notification.title,
                            //     message: notification.message,
                            //     icon: notification.icon,
                            //     image: notification.image,
                            //     device_id: []
                            // }
                            // var customer_array ;
                            var device_id = []

                            var final_array = [];

                            if (notification.fliter.city.citytype.base) {
                                var result = data.filter(val => JSON.stringify(val.city) == JSON.stringify(notification.city_id));
                                final_array = result;

                            }
                            if (notification.fliter.city.offertransaction.offer_id != null) {
                                var result1 = [];
                                var count = 0;
                                lodash.forEach(data, function (val) {
                                    lodash.forEach(val.offer_Avail, function (val1) {
                                        if (JSON.stringify(val1.offer_id) == JSON.stringify(notification.fliter.city.offertransaction.offer_id)) {
                                            count++;
                                        }
                                    })
                                    if (count > 0 && count >= notification.fliter.city.offertransaction.minimumofferavail) {
                                        result1.push(val)
                                    }
                                    count = 0

                                })

                                if (final_array != '' && final_array != null && final_array != undefined) {
                                    final_array = Object.assign({}, result1, final_array)
                                    final_array = Object.values(final_array);

                                } else {
                                    final_array = result1;
                                }

                            }
                            if (notification.fliter.city.daterangetransaction.start_date != null && notification.fliter.city.daterangetransaction.end_date != null && notification.brandlocation_id != null) {
                                var offer_id = []
                                var recent_offer_used = []
                                data1.forEach(function (val) {
                                    offer_id.push(val.offer._id)
                                })

                                lodash.forEach(data, (val) => {
                                    lodash.forEach(val.offer_Avail, (val1) => {
                                        lodash.forEach(offer_id, (val2) => {
                                            if (JSON.stringify(val1.offer_id) == JSON.stringify(val2)) {
                                                recent_offer_used.push(val)
                                            }
                                        })

                                    })
                                })
                                recent_offer_used = getUnique(recent_offer_used, '_id');
                                if (final_array != '' && final_array != null && final_array != undefined) {
                                    final_array = Object.assign({}, recent_offer_used, final_array)
                                    final_array = Object.values(final_array);

                                } else {
                                    final_array = recent_offer_used;

                                }


                            }
                            if (final_array == '' || final_array == null || final_array == undefined) {
                                final_array = data;
                            }
                            lodash.forEach(final_array, (val) => {
                                lodash.forEach(val.device, (val1) => {
                                    if (val.status.is_deleted == false && val.status.is_activated == true) {
                                        device_id.push(val1.device_id)

                                    }
                                })
                            })

                            //filtration process ends here with Registration Tokens

                            //crontask starts entry here

                            // Split in group of 1000 items
                            var result = chunkArray(device_id, 1000);
                            for (var j = 0; j < result.length; j++) {
                                var temp_array = []
                                let crontaskbody = {
                                    name: body.name,
                                    notification_id: notification._id,
                                    targetAPI: '/api/notification/pushnotification/' + notification._id,
                                    meta: JSON.stringify(notification),
                                    is_reoccurring: body.is_reoccurring,
                                    start_date: body.crontask_start_date
                                }
                                for (var k = 0; k < result[j].length; k++) {
                                    temp_array.push({ 'identifier': result[j][k] })

                                }
                                crontaskbody.details = temp_array

                                console.log(crontaskbody);
                                // return
                                Crontask.add(crontaskbody, function (err, crontask) {
                                    if (err) {
                                        var errors = {};
                                        if (err.name == "ValidationError") {
                                            for (var i in err.errors) {
                                                errors[i] = err.errors[i].message;
                                            }
                                        } else {
                                            errors[i] = err.errmsg;
                                        }
                                        // console.log(errors)
                                        console.log('Errors:', errors);

                                        // generateResponse(false, "Unable to process your request, Please retry in few minutes.", errors, res, [], []);
                                    } else {
                                        console.log('Cron Task Added Successfully');
                                        // generateResponse(true, "Added Successfully", crontask, res, ['_id'], []);
                                    }
                                });

                            }

                            //crontask ends entry here

                        })

                    });


                }
            });
        } else {
            generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
        }
    } catch (err) {
        console.log(err)
        generateResponse(false, "Unable to process your request, Please retry in few minutes.", err, res, [], []);
    }
}

export function get(req, res) {
    try {
        var queryString = req.query;
        searchQuery(Notification, function (err, notification) {
            if (err) {
                var errors = err.errmsg;
                generateResponse(false, 'Unable to process your request, Please retry in few minutes.', errors, res, [], []);
            } else {
                if (notification.length > 0) {
                    generateResponse(true, 'Success', notification, res, ['_id'], []);
                } else {
                    generateResponse(false, 'Record not found.', notification, res, [], []);
                }
            }
        }, queryString.limit, queryString.page, {}, getQueryParams(queryString), '');
    } catch (err) {
        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
    }
}

export function update(req, res) {
    try {
        if (req.params.id != undefined || req.params.id != "") {
            req.params.id = decryptValue(req.params.id);
            let body = parseBody(req);
            // console.log(body)
            if (body) {
                Notification.get({
                    _id: req.params.id
                }, (err, notification) => {
                    if (err) {
                        var errors = err.errmsg;
                        generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], []);
                    } else {
                        if (notification.length > 0) {
                            if (body.confirm_password == body.password) {
                                if (body.email != undefined && body.email != '') {
                                    generateResponse(false, 'You Can Not Change Your Email Address', [], res, [], []);
                                } else {
                                    if (body.password != undefined && body.password != '') {
                                        body.password = hashSync(body.password, 10);
                                        Notification.update(req.params.id, body, (err, update) => {
                                            if (err) {
                                                var errors = err.errmsg;
                                                generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], []);
                                            } else {
                                                generateResponse(true, 'Updated Successfully', update, res, [], []);
                                            }
                                        });
                                    } else {
                                        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
                                    }
                                }
                            } else {
                                var errors = {
                                    password: "Password doen't match"
                                };
                                generateResponse(false, "Unable to process your request.", errors, res, [], []);
                            }
                        } else {
                            generateResponse(false, 'Record not found.', [], res, [], []);
                        }
                    }
                });
            } else {
                generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
            }
        } else {
            generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
        }
    } catch (err) {
        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
    }
}

export function remove(req, res) {
    try {
        if (req.params.id != undefined || req.params.id != "") {
            req.params.id = decryptValue(req.params.id);
            Notification.get(
                { _id: req.params.id }
                , (err, notification) => {
                    if (err) {
                        var errors = err.errmsg;
                        generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], []);
                    } else {
                        if (notification.length > 0) {
                            Notification.remove(req.params.id, (err, update) => {
                                // console.log(update);
                                if (err) {
                                    var errors = err.errmsg;
                                    generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], []);
                                } else {
                                    generateResponse(true, 'Removed Successfully', [], res, [], []);
                                }
                            })
                        } else {
                            generateResponse(false, "Record not found", [], res, [], []);
                        }
                    }
                })

        } else {
            generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
        }
    } catch (err) {
        console.log(err);
        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
    }
}

function countarr(array_elements) {
    // var array_elements = ["a", "b", "c", "d", "e", "a", "b", "c", "f", "g", "h", "h", "h", "e", "a"];

    array_elements.sort();
    var arr = []
    var current = null;
    var cnt = 0;
    for (var i = 0; i < array_elements.length; i++) {
        if (array_elements[i] != current) {
            if (cnt > 0) {
                arr[i] =
                    {
                        code: current, count: cnt
                    }


                // console.log(current + ' comes --> ' + cnt + ' times')
            }
            current = array_elements[i];
            cnt = 1;
        } else {
            cnt++;
        }
    }
    if (cnt > 0) {
        arr[0] =
            {
                code: current, count: cnt
            }
    }
    return arr;

}

// Push Notifications
export function pushnotification(req, res) {
    try {
        if (req.params.id != undefined || req.params.id != "") {
            // req.params.id = decryptValue(req.params.id);
            Crontask.get(
                (err, crontask) => {
                    // console.log(crontask);
                    crontask.forEach(function (val) {
                        ;
                        Notification.get(
                            { _id: val.notification_id }
                            , (err, notification) => {
                                if (err) {
                                    var errors = err.errmsg;
                                    generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], []);
                                } else {
                                    if (notification.length > 0) {
                                        notification = notification[0];

                                        let payload = {
                                            title: notification.title,
                                            message: notification.message,
                                            icon: notification.icon,
                                            image: notification.image,
                                            device_id: []
                                        }
                                        // var customer_array ;

                                        var final_array = [];
                                        var device_id = []
                                        val.details.forEach(function (details) {
                                            device_id.push(details.identifier);
                                            Customer.updateByDeviceId(details.identifier, val.notification_id, function (err, customer) {
                                                if(err){
                                                    console.log(err)
                                                } else {
                                                    console.log(customer);
                                                }
                                            })
                                        })


                                        payload.device_id = device_id;

                                        if (!admin.apps.length) {
                                            var serviceAccount = require("../middlewares/service-account-file");

                                            // Initialize the app with a service account, granting admin privileges
                                            admin.initializeApp({
                                                credential: admin.credential.cert(serviceAccount),
                                            });
                                        }
                                        // This registration token comes from the client FCM SDKs.


                                        // var registrationToken = ['dyPAjpDiHj0:APA91bFCYXfmlIT3mpPxp_retG8DhuJKeBV68S6SfUzfqpjF35pIHdi0eFwZW7TK-JeaF-titF6BFU_MhpY7fFe4qRXVlnPi8FxCHJhir8m4e39ZCur_KLn21hAGe3mtPTshInUfy50r',
                                        //                          'dnZOzaAPEgo:APA91bG_MX9--XE6gi9VrqvsqKWLyl45ERTnFt9IjvuiSLLmC4Ws3wzKkqYSekmH9EXhpAD0MFEfvrHkwLneoO4RD_Z1H6dFcPN4j_tx5EJn_YCALzJbvPBWj1Z6OfVTM3jFveTPw_3m'];

                                        var registrationToken = payload.device_id

                                        // var registrationToken = arr


                                        // Send a message to the device corresponding to the provided
                                        // registration token.
                                        var notification_payload = {
                                            notification: {
                                                title: ' Big Bang',
                                                body: 'Ramadan Mubarak from The Big Bang.'
                                            }
                                            // notification: {
                                            //     title: payload.title,
                                            //     body: payload.message,
                                            //     icon: payload.icon,
                                            //     image: payload.image
                                            // }
                                        };
                                        // console.log(notification_payload,"------------",registrationToken)
                                        // return;
                                        admin.messaging().sendToDevice(registrationToken, notification_payload)
                                            .then(function (response) {
                                                // See the MessagingDevicesResponse reference documentation for
                                                // the contents of response.
                                                // console.log('Successfully sent message:', response);


                                                // const fs = require('fs')
                                                let data = JSON.stringify(response);

                                                var arr = [];
                                                lodash.forEach(response.results, (val) => {
                                                    lodash.forEach(val.error, (val1) => {
                                                        if (val1.code != undefined) {
                                                            arr.push(val1.code);
                                                            // console.log('Error Code: ', val1.code)
                                                            // console.log('Error message: ', val1.message)
                                                        }

                                                    })
                                                })
                                                let body = [];
                                                var error_count = countarr(arr);

                                                body.result = {
                                                    success_count: response.successCount,
                                                    failure_count: response.failureCount,
                                                    failed_reason: error_count
                                                }
                                                body.is_executed = true;
                                                Crontask.update(val._id, body, (err, update) => {
                                                })


                                            })
                                            .catch(function (error) {
                                                // console.log('Error sending message:', error);
                                                generateResponse(false, "Error sending message", [], error, [], []);

                                            });


                                    } else {
                                        generateResponse(false, "Record not found", [], res, [], []);
                                    }
                                }
                            })
                    });
                    generateResponse(true, 'Notification send successfully.', [], res, [], []);

                })

        } else {
            generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
        }
    } catch (err) {
        console.log(err);
        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
    }
}


export function getCustomerNotifications(req, res) {
    try {
        let objectIdArray = req.body.map(id => mongoose.Types.ObjectId(id));
        Notification.get({_id : { $in : objectIdArray } }, function (err, data) {
            generateResponse(true, 'Customer Notifications', data, res, [], []);
        })
    } catch (err) {
        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
    }
}


//all working of push notification
//
// // var config = {
// //     apiKey: "AIzaSyBTvSoyX0x-C03sJ93sXFcQVliEsoKm9DI",
// //     authDomain: "pushnotif-a85fb.firebaseapp.com",
// //     databaseURL: "https://pushnotif-a85fb.firebaseio.com",
// //     projectId: "pushnotif-a85fb",
// //     storageBucket: "pushnotif-a85fb.appspot.com",
// //     messagingSenderId: "643396331268"
// // // };
// // let config = {
// //     "type": "service_account",
// //     "project_id": "pushnotif-a85fb",
// //     "private_key_id": "6073e14997ec3bee1bcb2431710970e6f2368949",
// //     "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC123Oi//r2U0SJ\n3yAqfTDC9i3D9qjs+EHRrD55YYA1WJXjgruT5wRsE/ZRGgZq5rIe3A1L2EcIWNDz\np1gvhzL5tFOgavEOXOGD29EZhSslRcUgcxWcFydh9FGF8G5M8pUxKL+0gITOJp7h\nRkh3dery1Z3LiEyEK194ZJvCYRwt5EpaouJSxxJIXbmwFnXaQsoVycOSMcHJlFYG\nrB6vYFFQil8brB8h0xe0jiO7OQCGbR73iQhU8DYq25rUrpssdH9PZdNZ7HcDbZuY\nVpMwZ9kfkwFsQEJ3ceeZGb5azBreT28ERs6tO9dJoC//BjdxHeelqZy73bjOESea\nJzFiAXprAgMBAAECggEAI/nvDW8Akdx1MaU/cshjbh5PfXX9gyu1saoWjeK4/1Sw\nClshiqfoGw1z7CVu4ZUT5cD4rGlz2/XeGGWhr31am0WOSaz+VS4QuwowepD6sRv1\nXG8H9mIqO1mfCxU+bOCMnTYHfsjx/OptAfnqeh+MxE94MPyczoTaFTIqEjEt5vHt\nPVqcHWho8Wv8f7drlcwW5grMHcwstUIhuDaW9NNI5aEvwvgast1kgwsfIv9yLWZr\n9ct55JfCW/flxoQ+QfhD0yM5dCcMftyp/A26/m0Uyjqq51BnzMT4xiV+eWALRLCx\n1BPBmZ1Tic6urR+bMD/r78STdlFYz+vVcAfGnmPnyQKBgQD9bp3f730IvgXAcKOk\nMjnEVSU3hvv4FMvOFeSa+TLSivuHPzYwD3DIeDBg22HwQlgP8pec9qTsWfBEsEJZ\nUlMNdH6nhaLj1UlxCRSpRiwySeJ/K/bC86MHyCb4/L5yY7+YFzvUoPQwLeaC7sy9\nUCq6M/U5/YfrfuDZqG5zQp+lHQKBgQC3syziy3S4VKMqeqqxVCm1DNi2IR8wad9H\nOlM65uKRDsXEcsQNspjRvqdyoF3cxdZwTQt9VdmTPDD725npyHfGp2fmZZCMDcuI\nKKBLz1aUi1a5OQ3dUnf7xgEI4TZXQEsxrj2hWBCAKue7j3VwGdHS4Lko2hTRLJT1\ntFQqiqsvJwKBgQDE6HVx0LntWPdPFjWPFhccHKvWAOM1VbMkZI5Ceuyp+aKE6vBH\nVzfiCsBMASiPbHzPp0V1h42MtjSgqfJjRDuTcLgXoRV2v/lYAh4zh3o/eHirJpWL\n05EQMstVGcs/RZFPsn2iL4yLAp7fjHs3fFo2YrheXkaFCwfZFaz7kQBJYQKBgFMj\nCAFsStrRkza6ZV3z1RxXQAzNWKw0fhRiVSCnNYqowOBzgD8iwP7L5kR+R3yPHMme\nVMDYhauY5iJV9IZVb7+8K82d0ZlQ9PgeSs2EfI6lsQ4KwDeWBy8vIXC/XDSIqH9H\neCT5Eh6vTEkaV+/v/4IMqj/O0vUH1DKO9jh6oZapAoGAafsHlzP23my1xE1COpit\n2lrwCSC+4+/hSV59j5CPMrC37i9Lg/8k76/yGcGigkKzvqBQaRWFBncfwbEM9O39\nXWvkcyHIBaBWEJ9qNBjhTClZzG8XYYX8yOw0OZlXaGsZbFcD6c6syrNdE1lwkKPS\npCeUDX5nLoRXBGz0AphDucU=\n-----END PRIVATE KEY-----\n",
// //     "client_email": "firebase-adminsdk-fj9e1@pushnotif-a85fb.iam.gserviceaccount.com",
// //     "client_id": "101865302165523710159",
// //     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
// //     "token_uri": "https://oauth2.googleapis.com/token",
// //     "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
// //     "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fj9e1%40pushnotif-a85fb.iam.gserviceaccount.com"
// // }
// //  var a = admin.initializeApp(app);
// if (!admin.apps.length) {
//     var serviceAccount = require("../middlewares/service-account-file");
//
//     // Initialize the app with a service account, granting admin privileges
//     admin.initializeApp({
//         credential: admin.credential.cert(serviceAccount),
//     });                                    }
//
//
// // console.log(); return;
// // admin.initializeApp({
// //     credential: admin.credential.applicationDefault(),
// // });
// // admin.initializeApp(config);
// // This registration token comes from the client FCM SDKs.
// var registrationToken = ['dyPAjpDiHj0:APA91bFCYXfmlIT3mpPxp_retG8DhuJKeBV68S6SfUzfqpjF35pIHdi0eFwZW7TK-JeaF-titF6BFU_MhpY7fFe4qRXVlnPi8FxCHJhir8m4e39ZCur_KLn21hAGe3mtPTshInUfy50r',
//     'dnZOzaAPEgo:APA91bG_MX9--XE6gi9VrqvsqKWLyl45ERTnFt9IjvuiSLLmC4Ws3wzKkqYSekmH9EXhpAD0MFEfvrHkwLneoO4RD_Z1H6dFcPN4j_tx5EJn_YCALzJbvPBWj1Z6OfVTM3jFveTPw_3m'];
//
//
// // Send a message to the device corresponding to the provided
// // registration token.
// var payload1 = {
//     notification: {
//         title: ' up 1.43% on the day',
//         body: ' gained 11.80 points to close at 835.67, up 1.43% on the day.'
//     }
// };
// // admin.messaging().s
// admin.messaging().sendToDevice(registrationToken, payload1)
//     .then(function (response) {
//         // See the MessagingDevicesResponse reference documentation for
//         // the contents of response.
//         console.log('Successfully sent message:', response);
//     })
//     .catch(function (error) {
//         console.log('Error sending message:', error);
//     });
//


