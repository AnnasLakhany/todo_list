/**
 * Created by Annas on 12/24/2018.
 */
'use strict';
import { Request, Response } from 'express';
import { parseBody, generateResponse } from '../utilites';
import { searchQuery } from '../utilites/query-module';
import { decryptValue, encryptValue } from '../utilites/encryption-module';
import { hashSync, genSalt, genSaltSync, compare } from "bcrypt";
import { sign, verify } from "jsonwebtoken";
import config from "../conf";
import Customer from '../models/customer';
import Package from '../models/package';
import Country from '../models/country'
import Brand from '../models/brand';
import Promocode from '../models/promocode';
import ActivationCode from '../models/activationcode';
import mongoose from 'mongoose';
import moment from 'moment';
import _ from 'underscore'
import { assert } from 'assert';
import { realpathSync, promises } from 'fs';
const lodash = require('lodash');
// const User = require('../models/user');
const nodemailer = require('nodemailer');
const helperFunction = require('../utilites/helper');
function makeReferid(length, id) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" + id;
    for (var i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}
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
                { 'phone': { $regex: queryParams.search, $options: 'i' } },
                // {'package_Id': {$regex: queryParams.search, $options: 'i'}}
            ];
    }
    if (queryParams.status) {
        findParams['status.is_activated'] = queryParams.status
    }
    if (queryParams.id != undefined && queryParams.id != "") {
        findParams._id = decryptValue(queryParams.id) || "";
    }
    // if (queryParams.package_Id != undefined && queryParams.package_Id != "") {
    //     findParams.package_Id = decryptValue(queryParams.package_Id) || "";
    // }
    return findParams;
}
export function login(req, res) {
    try {
        let body = parseBody(req);
        Customer.get({
            email: body.email
        }, (err, customer) => {
            if (err) {
                generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
            } else {
                if (customer.length > 0) {
                    var pkg = [];
                    var pkg_detail;
                    lodash.forEach(customer, (val) => {
                        lodash.forEach(val.subscription, (val1) => {
                            pkg_detail = {
                                package_id: encryptValue(val1.package_id),
                                package_name: "",
                                start_at: val1.start_at,
                                end_at: val1.end_at
                            }
                            pkg.push(pkg_detail);
                        });
                    });
                    var customer = customer[0]
                    // compare(body.password, customer.password, (err, valid) => {
                    // if (valid) {
                    var pkg_name = [];
                    var pkg_id = [];
                    lodash.forEach(pkg, (val) => {
                        pkg_id.push(decryptValue(val.package_id));
                    })
                    Package.get({
                        '_id': { $in: pkg_id }
                    }, (err, pkgs) => {
                        if (err) {
                            generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
                        } else {
                            if (pkgs.length > 0) {
                                lodash.forEach(pkgs, (val) => {
                                    var pkg_obj = {
                                        name: val.name,
                                        _id: encryptValue(val._id)
                                    }
                                    pkg_name.push(pkg_obj)
                                })
                                lodash.forEach(pkg, (val) => {
                                    lodash.forEach(pkg_name, (val1) => {
                                        if (JSON.stringify(val1._id) == JSON.stringify(val.package_id)) {
                                            val.package_name = val1.name
                                        }
                                    })
                                })
                                let payload = {
                                    first_name: customer.first_name,
                                    last_name: customer.last_name,
                                    email: customer.email,
                                    _id: encryptValue(customer._id),
                                    role_id: customer.role_id
                                };
                                let token = sign({ payload }, `${config.app['jwtsecret']}`, { expiresIn: "1y" });
                                let userData = {
                                    customer: payload,
                                    packages: pkg,
                                    token: token
                                };
                                console.log(userData.customer._id)
                                generateResponse(true, 'Successfully Logged in', userData, res, ['_id'], []);
                            } else {
                                generateResponse(false, "Record not found.", [], res, [], []);
                            }
                        }
                    })
                    // } else {
                    //     generateResponse(false, "Email or password incorrect", [], res, [], []);
                    // }
                    // });
                } else {
                    generateResponse(false, "Record not found.", [], res, [], []);
                }
            }
        });
    } catch (err) {
        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
    }
}
export function register(req, res) {
    try {
        let body = parseBody(req);
        var queryString = req.query
        // console.log(queryString.refer_code) 
        // return;
        body.role_id = mongoose.Types.ObjectId(config.app['customer_role_id']);
        // body.device.role_id
        Customer.get({
            email: body.email
        }, (err, customer) => {
            if (err) {
                generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
            } else {
                if (customer.length == 0) {
                    if (body.city != "" || body.city != null) {
                        Package.get({
                            _id: mongoose.Types.ObjectId(config.app['deactive_package_id']),
                            // 'city_id': mongoose.Types.ObjectId(body.city),
                            'is_expirable.is_expire': false
                        }, (err, pkg) => {
                            if (err) {
                                var errors = err.errmsg;
                                generateResponse(false, "Unable to process your request", errors, res, [], []);
                            } else {
                                if (pkg.length > 0) {
                                    var pkg_id = pkg[0]['_id'];
                                    ActivationCode.getMax({
                                        "package_id": pkg_id
                                    }, (err, code) => {
                                        if (err) {
                                            var errors = err.errmsg;
                                            generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], []);
                                        } else {
                                            let start_from = 1;
                                            if (code != null) {
                                                if (code.activation_code) {
                                                    start_from = parseInt(code.activation_code.serial) + 1;
                                                }
                                            }
                                            let new_serial = (start_from + 0) + "";
                                            while (new_serial.length < 10) new_serial = "0" + new_serial;
                                            var data = {
                                                package_id: pkg_id,
                                                validity: 365,
                                                activation_code: {
                                                    prefix: "BB",
                                                    type: 'D',
                                                    serial: new_serial,
                                                    code: Math.floor(Math.random() * 90000) + 10000
                                                }
                                            }
                                            ActivationCode.add(data, function (err, code) {
                                                if (err) {
                                                    var errors = err.errmsg;
                                                    generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], []);
                                                } else {
                                                    Country.get({
                                                        "cities._id": body.city
                                                    }, (err, city) => {
                                                        if (err) {
                                                            var errors = err.errmsg;
                                                            generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], []);
                                                        } else {
                                                            if (city.length > 0) {
                                                                // if (body.confirm_password != body.password) {
                                                                //     var errors = {
                                                                //         password: "Password doen't match"
                                                                //     };
                                                                //     generateResponse(false, "Unable to process your request, Please retry in few minutes.", errors, res, [], []);
                                                                // }
                                                                // else {
                                                                var randomPassword = Math.random().toString(36).slice(-8);
                                                                var salt = genSaltSync(10);
                                                                body.password = hashSync(randomPassword, salt);
                                                                if (body.promo_code && body.promo_code != "" && body.promo_code != null) {
                                                                    Promocode.get({
                                                                        code: body.promo_code,
                                                                        'status.is_deleted': true
                                                                    }, (err, promocode) => {
                                                                        if (err) {
                                                                            var errors = err.errmsg;
                                                                            generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], []);
                                                                        } else {
                                                                            if (promocode.length > 0) {
                                                                                body.subscription = [];
                                                                                var ptoday = new Date();
                                                                                var pdate = ptoday.getFullYear() + '-' + (ptoday.getMonth() + 1) + '-' + ptoday.getDate();
                                                                                var new_pdate = moment(pdate, "YYYY-MM-DD").add(promocode[0]["validity"], 'days');
                                                                                var pday = new_pdate.format('DD');
                                                                                var pmonth = new_pdate.format('MM');
                                                                                var pyear = new_pdate.format('YYYY');
                                                                                body.subscription.push({
                                                                                    package_id: promocode[0]['package_id'],
                                                                                    promo_code_id: promocode[0]['_id'],
                                                                                    end_at: pyear + '-' + pmonth + '-' + pday,
                                                                                    // activation_code_id: activation_code_id,
                                                                                })
                                                                                var today = new Date();
                                                                                var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
                                                                                var new_date = moment(date, "YYYY-MM-DD").add(code.validity, 'days');
                                                                                var day = new_date.format('DD');
                                                                                var month = new_date.format('MM');
                                                                                var year = new_date.format('YYYY');
                                                                                body.subscription.push({
                                                                                    package_id: code.package_id,
                                                                                    // start_at: body.start_at,
                                                                                    end_at: year + '-' + month + '-' + day,
                                                                                    activation_code_id: code._id,
                                                                                })
                                                                                Customer.add(body, function (err, customer) {
                                                                                    if (err) {
                                                                                        console.log(err);
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
                                                                                        generateResponse(true, "Added Successfully", customer, res, ['_id'], []);
                                                                                        ActivationCode.update(
                                                                                            code._id,
                                                                                            { "is_used": true }
                                                                                            , (err, update) => {
                                                                                                if (err) {
                                                                                                    var errors = err.errmsg;
                                                                                                    generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], []);
                                                                                                } else {
                                                                                                    console.log('activation code status updated', update);
                                                                                                    // generateResponse(true, 'Updated Successfully', update, res, [], []);
                                                                                                }
                                                                                            })
                                                                                        var refer_id_ = makeReferid(8, customer._id)
                                                                                        Customer.get({
                                                                                            refer_id: refer_id_
                                                                                        }, (err, res) => {
                                                                                            if (err) {
                                                                                                generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
                                                                                            } else {
                                                                                                if (res.length == 0) {
                                                                                                    Customer.update(mongoose.Types.ObjectId(customer._id),
                                                                                                        { refer_id: refer_id_ },
                                                                                                        function (err, update) {
                                                                                                            if (err) {
                                                                                                                console.log(err);
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
                                                                                                                console.log('refer id added', update);
                                                                                                            }
                                                                                                        });
                                                                                                } else {
                                                                                                    refer_id_ = makeReferid(8, customer._id)
                                                                                                    Customer.update(mongoose.Types.ObjectId(customer._id),
                                                                                                        { refer_id: refer_id_ },
                                                                                                        function (err, update) {
                                                                                                            if (err) {
                                                                                                                console.log(err);
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
                                                                                                                console.log('refer id added', update);
                                                                                                            }
                                                                                                        });
                                                                                                }
                                                                                            }
                                                                                        })
                                                                                    }
                                                                                });
                                                                            } else {
                                                                                var errors = {
                                                                                    error: "Promo Code not found"
                                                                                };
                                                                                generateResponse(false, 'Unable to process your request.', errors, res, [], []);
                                                                            }
                                                                        }
                                                                    })
                                                                } else {
                                                                    if ((queryString.refer_code != undefined && queryString.refer_code != "" && queryString.refer_code != null) && (body.promo_code == undefined || body.promo_code == "" || body.promo_code == null)) {
                                                                        Customer.get({
                                                                            refer_id: queryString.refer_code
                                                                        }, (err, data1) => {
                                                                            if (err) {
                                                                                generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
                                                                            } else {
                                                                                if (data1.length > 0) {
                                                                                    var today = new Date();
                                                                                    var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
                                                                                    var new_date = moment(date, "YYYY-MM-DD").add(code.validity, 'days');
                                                                                    var day = new_date.format('DD');
                                                                                    var month = new_date.format('MM');
                                                                                    var year = new_date.format('YYYY');
                                                                                    body.subscription = {
                                                                                        package_id: code.package_id,
                                                                                        // start_at: body.start_at,
                                                                                        end_at: year + '-' + month + '-' + day,
                                                                                        activation_code_id: code._id,
                                                                                    }
                                                                                    Customer.add(body, function (err, customer) {
                                                                                        if (err) {
                                                                                            console.log(err);
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
                                                                                            generateResponse(true, "Added Successfully", customer, res, ['_id'], []);
                                                                                            var flag = true
                                                                                            lodash.forEach(data1[0]['subscription'], (val) => {
                                                                                                if (JSON.stringify(val.package_id) == JSON.stringify(config.app['refer_package_id']) && val.subscription_status == true) {
                                                                                                    flag = false;
                                                                                                }
                                                                                            })
                                                                                            if (flag) {
                                                                                                Package.get({
                                                                                                    _id: mongoose.Types.ObjectId(config.app['refer_package_id']),
                                                                                                    // 'city_id': mongoose.Types.ObjectId(body.city),
                                                                                                    'is_expirable.is_expire': false
                                                                                                }, (err, pkgdetail) => {
                                                                                                    if (err) {
                                                                                                        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
                                                                                                    } else {
                                                                                                        if (pkgdetail.length > 0) {
                                                                                                            ActivationCode.getMax({
                                                                                                                "package_id": pkgdetail[0]['_id']
                                                                                                            }, (err, Rcode) => {
                                                                                                                if (err) {
                                                                                                                    var errors = err.errmsg;
                                                                                                                    generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], []);
                                                                                                                } else {
                                                                                                                    let start_from = 1;
                                                                                                                    if (Rcode != null) {
                                                                                                                        if (Rcode.activation_code) {
                                                                                                                            start_from = parseInt(Rcode.activation_code.serial) + 1;
                                                                                                                        }
                                                                                                                    }
                                                                                                                    let new_serial = (start_from + 0) + "";
                                                                                                                    while (new_serial.length < 10) new_serial = "0" + new_serial;
                                                                                                                    var data = {
                                                                                                                        package_id: pkgdetail[0]['_id'],
                                                                                                                        validity: 30,
                                                                                                                        activation_code: {
                                                                                                                            prefix: "BB",
                                                                                                                            type: 'R',
                                                                                                                            serial: new_serial,
                                                                                                                            code: Math.floor(Math.random() * 90000) + 10000
                                                                                                                        }
                                                                                                                    }
                                                                                                                    ActivationCode.add(data, function (err, RAcode) {
                                                                                                                        if (err) {
                                                                                                                            var errors = err.errmsg;
                                                                                                                            generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], []);
                                                                                                                        } else {
                                                                                                                            var today = new Date();
                                                                                                                            var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
                                                                                                                            var new_date = moment(date, "YYYY-MM-DD").add(RAcode.validity, 'days');
                                                                                                                            var day = new_date.format('DD');
                                                                                                                            var month = new_date.format('MM');
                                                                                                                            var year = new_date.format('YYYY');
                                                                                                                            console.log(customer._id)
                                                                                                                            let payload = {
                                                                                                                                subscription: {
                                                                                                                                    package_id: RAcode.package_id,
                                                                                                                                    // start_at: body.start_at,
                                                                                                                                    end_at: year + '-' + month + '-' + day,
                                                                                                                                    activation_code_id: RAcode._id,
                                                                                                                                },
                                                                                                                                'refered.customer_id': mongoose.Types.ObjectId(customer._id)
                                                                                                                                // refered: {
                                                                                                                                //     customer_id: mongoose.Types.ObjectId(customer._id)
                                                                                                                                // }
                                                                                                                            }
                                                                                                                            payload.refer = {}
                                                                                                                            Customer.update(data1[0]['_id'],
                                                                                                                                { $push: payload },
                                                                                                                                function (err, update) {
                                                                                                                                    if (err) {
                                                                                                                                        console.log(err);
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
                                                                                                                                        console.log('customer id added to refer array and refer subcription added', update);
                                                                                                                                    }
                                                                                                                                });
                                                                                                                        }
                                                                                                                    })
                                                                                                                }
                                                                                                            })
                                                                                                        }
                                                                                                    }
                                                                                                })
                                                                                            } else {
                                                                                                Customer.update(data1[0]['_id'],
                                                                                                    //start from here add subcription
                                                                                                    { $push: { 'refered.customer_id': mongoose.Types.ObjectId(customer._id) } },
                                                                                                    function (err, update) {
                                                                                                        if (err) {
                                                                                                            console.log(err);
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
                                                                                                            console.log('customer id added to refer array', update);
                                                                                                        }
                                                                                                    });
                                                                                            }
                                                                                            ActivationCode.update(code._id,
                                                                                                { "is_used": true }
                                                                                                , (err, update) => {
                                                                                                    if (err) {
                                                                                                        var errors = err.errmsg;
                                                                                                        generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], []);
                                                                                                    } else {
                                                                                                        console.log('activation code status updated');
                                                                                                        // generateResponse(true, 'Updated Successfully', update, res, [], []);
                                                                                                    }
                                                                                                })
                                                                                            var refer_id_ = makeReferid(8, customer._id)
                                                                                            Customer.get({
                                                                                                refer_id: refer_id_
                                                                                            }, (err, res) => {
                                                                                                if (err) {
                                                                                                    generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
                                                                                                } else {
                                                                                                    if (res.length == 0) {
                                                                                                        Customer.update(mongoose.Types.ObjectId(customer._id),
                                                                                                            { refer_id: refer_id_ },
                                                                                                            function (err, update) {
                                                                                                                if (err) {
                                                                                                                    console.log(err);
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
                                                                                                                    console.log('refer id added', update);
                                                                                                                }
                                                                                                            });
                                                                                                    } else {
                                                                                                        refer_id_ = makeReferid(8, customer._id)
                                                                                                        Customer.update(mongoose.Types.ObjectId(customer._id),
                                                                                                            { refer_id: refer_id_ },
                                                                                                            function (err, update) {
                                                                                                                if (err) {
                                                                                                                    console.log(err);
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
                                                                                                                    console.log('refer id added', update);
                                                                                                                }
                                                                                                            });
                                                                                                    }
                                                                                                }
                                                                                            })
                                                                                        }
                                                                                    });
                                                                                } else {
                                                                                    var errors = {
                                                                                        error: "Refered Code not found"
                                                                                    };
                                                                                    generateResponse(false, 'Unable to process your request.', errors, res, [], []);
                                                                                }
                                                                            }
                                                                        })
                                                                    } else {
                                                                        var today = new Date();
                                                                        var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
                                                                        var new_date = moment(date, "YYYY-MM-DD").add(code.validity, 'days');
                                                                        var day = new_date.format('DD');
                                                                        var month = new_date.format('MM');
                                                                        var year = new_date.format('YYYY');
                                                                        body.subscription = {
                                                                            package_id: code.package_id,
                                                                            // start_at: body.start_at,
                                                                            end_at: year + '-' + month + '-' + day,
                                                                            activation_code_id: code._id,
                                                                        }
                                                                        Customer.add(body, function (err, customer) {
                                                                            if (err) {
                                                                                console.log(err);
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
                                                                                generateResponse(true, "Added Successfully", customer, res, ['_id'], []);
                                                                                ActivationCode.update(code._id,
                                                                                    { "is_used": true }
                                                                                    , (err, update) => {
                                                                                        if (err) {
                                                                                            var errors = err.errmsg;
                                                                                            generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], []);
                                                                                        } else {
                                                                                            console.log('activation code status updated');
                                                                                            // generateResponse(true, 'Updated Successfully', update, res, [], []);
                                                                                        }
                                                                                    })
                                                                                var refer_id_ = makeReferid(8, customer._id)
                                                                                Customer.get({
                                                                                    refer_id: refer_id_
                                                                                }, (err, res) => {
                                                                                    if (err) {
                                                                                        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
                                                                                    } else {
                                                                                        if (res.length == 0) {
                                                                                            Customer.update(mongoose.Types.ObjectId(customer._id),
                                                                                                { refer_id: refer_id_ },
                                                                                                function (err, update) {
                                                                                                    if (err) {
                                                                                                        console.log(err);
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
                                                                                                        console.log('refer id added', update);
                                                                                                    }
                                                                                                });
                                                                                        } else {
                                                                                            refer_id_ = makeReferid(8, customer._id)
                                                                                            Customer.update(mongoose.Types.ObjectId(customer._id),
                                                                                                { refer_id: refer_id_ },
                                                                                                function (err, update) {
                                                                                                    if (err) {
                                                                                                        console.log(err);
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
                                                                                                        console.log('refer id added', update);
                                                                                                    }
                                                                                                });
                                                                                        }
                                                                                    }
                                                                                })
                                                                            }
                                                                        });
                                                                    }
                                                                }
                                                                // }
                                                            } else {
                                                                var errors = {
                                                                    error: "City not found"
                                                                };
                                                                generateResponse(false, 'Unable to process your request.', errors, res, [], []);
                                                            }
                                                        }
                                                    })
                                                }
                                            })
                                        }
                                    })
                                } else {
                                    var errors = {
                                        Package: "Package not found"
                                    };
                                    generateResponse(false, "Unable to process your request", errors, res, [], []);
                                }
                            }
                        })
                    } else {
                        var errors = {
                            error: "One or more required fields are missing"
                        };
                        generateResponse(false, 'Unable to process your request.', errors, res, [], []);
                    }
                } else {
                    var errors = {
                        email: "Email already exist"
                    };
                    generateResponse(false, "Unable to process your request", errors, res, [], []);
                }
            }
        });
    } catch (err) {
        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
    }
}
export function get(req, res) {
    var queryString = req.query;
    // var filter = {};
    searchQuery(Customer, function (err, customer) {
        if (err) {
            generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
        } else {
            if (customer.length > 0) {
                generateResponse(true, 'Success', customer, res, ['_id'], []);
            } else {
                generateResponse(false, 'Record not found', customer, res, [], []);
            }
        }
    }, queryString.limit, queryString.page, {}, getQueryParams(queryString), '');
}
export function update(req, res) {
    try {
        if (req.params.id != undefined || req.params.id != "") {
            req.params.id = decryptValue(req.params.id);
            let body = parseBody(req);
            if ((body.password != undefined && body.password != '') && (body.confirm_password != undefined && body.confirm_password != '')) {
                Customer.get({
                    _id: req.params.id
                }, (err, customer) => {
                    if (err) {
                        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
                    } else {
                        if (customer.length > 0) {
                            console.log(body.old_password, customer[0]['password'])
                            compare(body.old_password, customer[0]['password'], (err, valid) => {
                                if (valid) {
                                    body.password = hashSync(body.new_password, 10);
                                    Customer.update(req.params.id, body, function (err, customer) {
                                        if (err) {
                                            console.log(err);
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
                                            generateResponse(true, "Password Changed Successfully", customer, res, [], []);
                                        }
                                    });
                                } else {
                                    generateResponse(false, 'Wrong Password', [], res, [], []);
                                }
                            })
                        } else {
                            generateResponse(false, 'Record not found.', [], res, [], []);
                        }
                    }
                })
            } else {
                Customer.get({
                    _id: req.params.id
                }, (err, customer) => {
                    if (err) {
                        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
                    } else {
                        if (customer.length > 0) {
                            if (body.city != undefined && body.city != '') {
                                Country.get({
                                    "cities._id": body.city
                                }, (err, city) => {
                                    if (err) {
                                        var errors = err.errmsg;
                                        generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], []);
                                    } else {
                                        if (city.length > 0) {
                                            Customer.update(req.params.id, body, function (err, customer) {
                                                if (err) {
                                                    console.log(err);
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
                                                    // console.log(Object.keys(customer).length);
                                                    generateResponse(true, "Updated Successfully", customer, res, [], []);
                                                }
                                            });
                                        } else {
                                            var errors = {
                                                error: "City not found"
                                            };
                                            generateResponse(false, 'Unable to process your request.', errors, res, [], []);
                                        }
                                    }
                                })
                            } else {
                                var errors = {
                                    error: "One or more fields required"
                                };
                                generateResponse(false, 'Unable to process your request.', errors, res, [], []);
                            }
                        } else {
                            generateResponse(false, 'Record not found.', [], res, [], []);
                        }
                    }
                });
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
            Customer.get(
                { _id: req.params.id },
                (err, customer) => {
                    if (err) {
                        var errors = err.errmsg;
                        generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], []);
                    } else {
                        if (customer.length > 0) {
                            Customer.remove(req.params.id, (err, update) => {
                                console.log(update);
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
        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
    }
}
export function getCode(req, res) {
    try {
        let body = parseBody(req);
        if (body.email != undefined || body.email != "") {
            Customer.get({
                email: body.email
            }, (err, user) => {
                if (err) {
                    generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
                } else {
                    if (!user) {
                        return res.status(200).json({
                            title: "Get Code Error",
                            message: `No Account With That Email Exist Or Email is Invalid`
                        });
                    }
                    const token = helperFunction.RandomValue(5);
                    // user.passwordResetToken = token;
                    // user.passwordResetExpires = Date.now() + 60 * 60 * 1 * 1000;
                    var passwordResetToken = token;
                    var passwordResetExpires = Date.now() + 60 * 60 * 1 * 1000;
                    Customer.update(
                        user[0]['_id'],
                        {
                            passwordResetToken: passwordResetToken,
                            passwordResetExpires: passwordResetExpires
                        }, (err, data) => {
                            if (err) {
                                generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
                            } else {
                                generateResponse(true, "Token Generated Successfully", data, res, [], []);
                            }
                        })
                    //email part here !! 
                    // const smtpTransport = nodemailer.createTransport({
                    //     //from google
                    //     // host: 'smtp.gmail.com',
                    //     // port: 587,
                    //     // secure: false,
                    //     // requireTLS: true,
                    //     //bilal's code
                    //     host: 'smtp.gmail.com',
                    //     port: 465,
                    //     secure: true,
                    //     auth: {
                    //         user: config.app['email'],
                    //         pass: config.app['password']
                    //     },
                    //     tls: {
                    //         rejectUnauthorized: false
                    //     }
                    // });
                    // const mailOptions = {
                    //     to: user.email,
                    //     from: 'Kick ' + '<' + config.app['email'] + '>',
                    //     subject: 'Kick Password Reset Token',
                    //     text: `You have requested for password reset token. \n`
                    //         + `Use this token to reset your password: ${token} `
                    // };
                    // smtpTransport.sendMail(mailOptions, (err, response) => {
                    //     if (err) {
                    //         return next(err)
                    //     }
                    //     return res.status(200).json({ title: "Token Sent", message: `A reset token has been sent to ${user.email}` });
                    // });
                }
            })
        } else {
            generateResponse(false, 'One or required field is required', [], res, [], []);
        }
    } catch (err) {
        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
    }
}
export function offerAvail(req, res) {
    try {
        if (req.params.id != undefined || req.params.id != "") {
            req.params.id = decryptValue(req.params.id);
            let body1 = parseBody(req);
            // console.log(body); return;
            Customer.get({
                _id: req.params.id
            }, (err, customer) => {
                if (err) {
                    generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
                } else {
                    if (customer.length > 0) {
                        body1.forEach((body) => {
                            Brand.get({
                                'offer._id': body.offer_id
                            }, (err, brand) => {
                                // if (err) {
                                //     var errors = {};
                                //     if (err.name == "ValidationError") {
                                //         for (var i in err.errors) {
                                //             errors[i] = err.errors[i].message;
                                //         }
                                //     } else {
                                //         errors[i] = err.errmsg;
                                //     }
                                //     generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], []);
                                // } else {
                                if (brand.length > 0) {
                                    // Customer.countAvailOffers(req.params.id, body.offer_id, (err, availCount) => {
                                    // if (err) {
                                    //     var errors = {};
                                    //     if (err.name == "ValidationError") {
                                    //         for (var i in err.errors) {
                                    //             errors[i] = err.errors[i].message;
                                    //         }
                                    //     } else {
                                    //         errors[i] = err.errmsg;
                                    //     }
                                    //     generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], []);
                                    // } 
                                    // else {
                                    // var per_day_number_of_avails;
                                    // var customerAvailOfferCount;
                                    // lodash.forEach(brand[0]['offer'], (val) => {
                                    //     if (JSON.stringify(val._id) == JSON.stringify(body.offer_id)) {
                                    //         per_day_number_of_avails = val.per_day_number_of_avails
                                    //     }
                                    // })

                                    // if (availCount == "") {
                                    //     customerAvailOfferCount = 0 + parseInt(body.count)
                                    // }
                                    // else {
                                    //     availCount = availCount[0]
                                    //     customerAvailOfferCount = availCount.total_count + parseInt(body.count)
                                    // }
                                    // if (customerAvailOfferCount <= per_day_number_of_avails) {
                                    var option;
                                    var save_amount;
                                    lodash.forEach(brand[0]['offer'], (val) => {
                                        if (JSON.stringify(val._id) == JSON.stringify(body.offer_id)) {
                                            if (val.hyper.is_hyper == true && val.hyper.number_of_unit > 0) {
                                                option = 'hyper';
                                                save_amount = val.hyper.save_amount
                                            } else if (val.baga.is_baga == true) {
                                                option = 'baga';
                                                save_amount = val.baga.save_amount
                                            } else if (val.flat_discount.is_flat_discount == true && val.flat_discount.discounted_percent == 0) {
                                                option = 'flat_discount';
                                                save_amount = val.flat_discount.discounted_amount
                                            } else if (val.flat_discount.is_flat_discount == true && val.flat_discount.discounted_percent != 0) {
                                                option = 'discount_percentage';
                                                save_amount = (Number(body.total_amount) * Number(val.flat_discount.discounted_percent)) / 100;
                                            }
                                        }
                                    })
                                    switch (option) {
                                        case 'hyper':
                                            var is_hyper
                                            var start_datetime
                                            var expair_datetime
                                            var number_of_unit
                                            var amount
                                            lodash.forEach(brand[0]['offer'], (val) => {
                                                if (JSON.stringify(val._id) == JSON.stringify(body.offer_id)) {
                                                    is_hyper = val.hyper.is_hyper
                                                    start_datetime = val.hyper.start_datetime
                                                    expair_datetime = val.hyper.expair_datetime
                                                    number_of_unit = val.hyper.number_of_unit - body.count
                                                    amount = val.hyper.amount
                                                    // save_amount = val.hyper.hyper_save_amount
                                                }
                                            })
                                            let payload = {
                                                "offer.$.hyper": {
                                                    is_hyper: is_hyper,
                                                    start_datetime: start_datetime,
                                                    expair_datetime: expair_datetime,
                                                    number_of_unit: number_of_unit,
                                                    amount: amount,
                                                    save_amount: save_amount
                                                },
                                            }
                                            body.offer_Avail = {
                                                offer_id: body.offer_id,
                                                save_Amount: save_amount,
                                                total_amount: body.total_amount
                                            }

                                            Brand.updateOffer(brand[0]['_id'],
                                                body.offer_id,
                                                payload
                                                // , (err, update) => {
                                                //     if (err) {
                                                //         var errors = err.errmsg;
                                                //         // generateResponse(false, 'Unable to process your request, Please retry in few minutes444', errors, res, [], []);
                                                //     } else {
                                                //         console.log(update)
                                                //         // generateResponse(true, 'Updated Successfully', update, res, [], []);
                                                //     }
                                                // }
                                            )
                                            break;
                                        case 'baga':
                                            body.offer_Avail = {
                                                offer_id: body.offer_id,
                                                save_Amount: save_amount,
                                                total_amount: body.total_amount
                                            }
                                            break;
                                        case 'flat_discount':
                                            body.offer_Avail = {
                                                offer_id: body.offer_id,
                                                save_Amount: save_amount,
                                                total_amount: body.total_amount
                                            }
                                            break;
                                        case 'discount_percentage':
                                            body.offer_Avail = {
                                                offer_id: body.offer_id,
                                                save_Amount: save_amount,
                                                total_amount: body.total_amount
                                            }
                                            break;
                                        default:
                                            // flag = false
                                            body.offer_Avail = {
                                                offer_id: body.offer_id,
                                                save_Amount: 0,
                                                total_amount: body.total_amount
                                            }
                                    }
                                    // let check_count =1;

                                    for (let i = 1; i <= body.count; i++) {
                                        Customer.update(req.params.id,
                                            { $push: body },
                                            function (err, offerAvail) { }
                                            //     if (err) {
                                            //         console.log(err);
                                            //         var errors = {};
                                            //         if (err.name == "ValidationError") {
                                            //             for (var i in err.errors) {
                                            //                 errors[i] = err.errors[i].message;
                                            //             }
                                            //         } else {
                                            //             errors[i] = err.errmsg;
                                            //         }
                                            //         // generateResponse(false, "Unable to process your request, Please retry in few minutes.", errors, res, [], []);
                                            //     } 
                                            //     // else {
                                            //     //     // check_count++;
                                            //     //     // if (check_count == body.count) {
                                            //     //     //     generateResponse(true, "Offer data added to customer", offerAvail, res, [], []);
                                            //     //     // }

                                            //     //     // generateResponse(true, "Offer data added to customer", offerAvail, res, [], []);
                                            //     // }
                                            // }
                                        );
                                    }
                                    // }
                                    // else {
                                    //     // generateResponse(false, `Your daily limit is exceed. Your limit is ${per_day_number_of_avails} and you have only ${per_day_number_of_avails - (customerAvailOfferCount - body.count)} offers remaining `, [], res, [], []);
                                    // }
                                    // }
                                    // })

                                }
                                // else {
                                //     generateResponse(false, 'Offer not found', [], res, [], []);
                                // }
                                // }
                            })
                        })
                        generateResponse(true, 'Offer Avail Successfully', [], res, [], []);

                    } else {
                        generateResponse(false, 'Customer not found', [], res, [], []);
                    }
                }
            })
        } else {
            generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
        }
    } catch (err) {
        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
    }
}
export function resetPassword(req, res) {
    try {
        let body = parseBody(req);
        if (body.email != undefined || body.email != "") {
            Customer.get({
                email: body.email,
                passwordResetExpires: {
                    $gt: new Date()
                },
                passwordResetToken: body.reset_token
            }, (err, user) => {
                if (err) {
                    generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
                } else {
                    if (user.length > 0) {
                        if (user[0]['passwordResetToken'] != body.reset_token) {
                            return res.status(200).json({
                                title: "Invalid Reset Token",
                                message: `Please enter a valid password reset token`
                            });
                        } else {
                            if (body.password.length < 5) {
                                return res.status(200).json({
                                    title: 'Password Error',
                                    message: 'Password must not be less than 5 characters.'
                                });
                            }
                            if (body.password && body.confirm_password) {
                                if (body.confirm_password == body.password) {
                                    var salt = genSaltSync(10);
                                    var password = hashSync(body.password, salt);
                                    var passwordResetToken = undefined;
                                    var passwordResetExpires = undefined;
                                    Customer.update(
                                        user[0]['_id'],
                                        {
                                            passwordResetToken: passwordResetToken,
                                            passwordResetExpires: passwordResetExpires,
                                            password: password
                                        }, (err, data) => {
                                            if (err) {
                                                generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
                                            } else {
                                                generateResponse(true, "Password Reset Successfully", data, res, [], []);
                                            }
                                        })
                                    //email part here !! 
                                    // const smtpTransport = nodemailer.createTransport({
                                    //     //from google
                                    //     // host: 'smtp.gmail.com',
                                    //     // port: 587,
                                    //     // secure: false,
                                    //     // requireTLS: true,
                                    //     //bilal's code
                                    //     host: 'smtp.gmail.com',
                                    //     port: 465,
                                    //     secure: true,
                                    //     auth: {
                                    //         user: process.env.EMAIL,
                                    //         pass: process.env.PASSWORD
                                    //     },
                                    //     tls: {
                                    //         rejectUnauthorized: false
                                    //     }
                                    // });
                                    // const mailOptions = {
                                    //     to: user.email,
                                    //     from: 'Kick ' + '<' + process.env.EMAIL + '>',
                                    //     subject: 'Password update successful',
                                    //     text: `This is a confirmation that you changed the password for ${user.email}`
                                    // };
                                    // smtpTransport.sendMail(mailOptions, (err, response) => {
                                    //     if (err) {
                                    //         return next(err)
                                    //     }
                                    //     return res.status(200).json({
                                    //         title: "Password Reset Successful",
                                    //         message: `Your password has been successfully updated. You can now login`
                                    //     });
                                    // });
                                } else {
                                    var errors = {
                                        password: "Password doen't match"
                                    };
                                    generateResponse(false, "Unable to process your request, Please retry in few minutes.", errors, res, [], []);
                                }
                            }
                        }
                    } else {
                        return res.status(200).json({
                            title: "Token Expired Error",
                            message: `Password reset token has expired or is invalid. Enter your email to get a new token.`
                        });
                    }
                }
            })
        } else {
            generateResponse(false, 'One or required field is required', [], res, [], []);
        }
    } catch (err) {
        console.log(err)
        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
    }
}
// export function addFavouriteOffer(req, res) {
//     try {
//         if (req.params.id != undefined || req.params.id != "") {
//             req.params.id = decryptValue(req.params.id);
//             let body = parseBody(req);
//             if (body) {
//                 body.favouriteOffer = {
//                     offer: body.Offer
//                 }
//                 Customer.get(
//                     {
//                         _id: req.params.id
//                     }
//                     , (err, customer) => {
//                         if (err) {
//                             generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
//                         } else {
//                             if (customer.length > 0) {
//                                 Customer.get(
//                                     {
//                                         "_id":req.params.id,
//                                         "favouriteOffer.offer": body.Offer,
//                                         "favouriteOffer.status.is_deleted": true,
//                                         "favouriteOffer.status.is_activated": false
//                                     }
//                                     , (err, favOffer) => {
//                                         if (err) {
//                                             generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
//                                         } else {
//                                             if (favOffer.length > 0) {
//                                                 var temp_count = 0
//                                                 for (var i = 0; i < customer.length; i++) {
//                                                     if (customer[i]['status']['is_deleted'] == false) {
//                                                         for (var j = 0; j < customer[i]['favouriteOffer'].length; j++) {
//                                                             if ((customer[i]['favouriteOffer'][j]['offer'] == body.favouriteOffer.offer) && (customer[i]['favouriteOffer'][j]['status']['is_deleted'] == false)) {
//                                                                 temp_count++;
//                                                             }
//                                                         }
//                                                     }
//                                                 }
//                                                 if (temp_count > 0) {
//                                                     // console.log('here2');
//                                                     Customer.removeFavouriteOffer(req.params.id,
//                                                         body.favouriteOffer.offer,
//                                                         (err, customer) => {
//                                                             if (err) {
//                                                                 generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
//                                                             } else {
//                                                                 generateResponse(true, "Updated Successfully", customer, res, [], []);
//                                                             }
//                                                         })
//                                                 } else {
//                                                     // console.log('here3');
//                                                     Customer.updateFavouriteOffer(req.params.id,
//                                                         body.favouriteOffer.offer,
//                                                         (err, customer) => {
//                                                             if (err) {
//                                                                 generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
//                                                             } else {
//                                                                 generateResponse(true, "Updated Successfully", customer, res, [], []);
//                                                             }
//                                                         })
//                                                 }
//                                             } else {
//                                                 Brand.get({
//                                                     "offer._id": mongoose.Types.ObjectId(body.Offer)
//                                                 },
//                                                     (err, offer) => {
//                                                         if (err) {
//                                                             generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
//                                                         } else {
//                                                             var temp_count = 0
//                                                             for (var i = 0; i < offer.length; i++) {
//                                                                 if (offer[i]['status']['is_deleted'] == false) {
//                                                                     for (var j = 0; j < offer[i]['offer'].length; j++) {
//                                                                         if ((offer[i]['offer'][j]['_id'] == body.favouriteOffer.offer) && (offer[i]['offer'][j]['status']['is_deleted'] == false)) {
//                                                                             temp_count++;
//                                                                         }
//                                                                     }
//                                                                 }
//                                                             }
//                                                             if (offer.length > 0 && (temp_count == offer.length)) {
//                                                                 // console.log('here1');
//                                                                 Customer.update(req.params.id,
//                                                                     { $push: body },
//                                                                     (err, customer) => {
//                                                                         if (err) {
//                                                                             generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
//                                                                         } else {
//                                                                             generateResponse(true, "Updated Successfully", customer, res, [], []);
//                                                                         }
//                                                                     })
//                                                             } else {
//                                                                 var errors = {
//                                                                     error: "offer does not exist"
//                                                                 };
//                                                                 generateResponse(false, 'Unable to process your request.', errors, res, [], []);
//                                                             }
//                                                         }
//                                                     })
//                                             }
//                                         }
//                                     })
//                             } else {
//                                 generateResponse(false, 'Record not found.', [], res, [], []);
//                             }
//                         }
//                     });
//             } else {
//                 generateResponse(false, "Unable to process your request, Please retry in few minutes.", errors, res, [], []);
//             }
//         } else {
//             generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
//         }
//     } catch (err) {
//         generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
//     }
// }
export function addFavouriteOffer(req, res) {
    try {
        if (req.params.id != undefined || req.params.id != "") {
            req.params.id = decryptValue(req.params.id);
            let body = parseBody(req);
            if (body) {
                body.favouriteOffer = {
                    offer: body.Offer
                }
                Brand.get({ "offer._id": body.Offer }, (err, offer) => {
                    if (err) {
                        console.log(err);
                        var errors = {};
                        if (err.name == "ValidationError") {
                            for (var i in err.errors) {
                                errors[i] = err.errors[i].message;
                            }
                        } else {
                            errors[i] = err.errmsg;
                        }
                        generateResponse(false, "Unable to process your request, Please retry in few minutes.", errors, res, [], []);
                    }
                    else {
                        if (offer.length > 0) {
                            Customer.get({
                                _id: req.params.id,
                                "favouriteOffer.offer": body.Offer,
                            }, (err, favOff) => {
                                if (err) {
                                    console.log(err);
                                    var errors = {};
                                    if (err.name == "ValidationError") {
                                        for (var i in err.errors) {
                                            errors[i] = err.errors[i].message;
                                        }
                                    } else {
                                        errors[i] = err.errmsg;
                                    }
                                    generateResponse(false, "Unable to process your request, Please retry in few minutes.", errors, res, [], []);

                                }
                                else {
                                    if (favOff.length == 0) {
                                        Customer.update(req.params.id,
                                            { $push: body },
                                            (err, customer) => {
                                                if (err) {
                                                    generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
                                                } else {
                                                    generateResponse(true, "Updated Successfully", customer, res, [], []);
                                                }
                                            })
                                    }
                                    else {
                                        favOff = favOff[0]
                                        var temp = favOff.favouriteOffer
                                        var filterRes = temp.find((favOffer) => {
                                            if (favOffer.offer.toString() == body.Offer) {
                                                return favOffer
                                            }
                                        })
                                        let flag = filterRes.status.is_deleted
                                        if (flag) {
                                            Customer.updateFavouriteOffer(req.params.id,
                                                body.Offer,
                                                (err, customer) => {
                                                    if (err) {
                                                        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
                                                    } else {
                                                        generateResponse(true, "Updated Successfully", customer, res, [], []);
                                                    }
                                                })
                                        }
                                        else {
                                            Customer.removeFavouriteOffer(req.params.id,
                                                body.Offer,
                                                (err, customer) => {
                                                    if (err) {
                                                        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
                                                    } else {
                                                        generateResponse(true, "Updated Successfully", customer, res, [], []);
                                                    }
                                                })
                                        }
                                    }
                                }

                            })
                        }
                        else {
                            generateResponse(false, 'Offer not found.', [], res, [], []);
                        }
                    }

                })
            } else {
                generateResponse(false, "Unable to process your request, Please retry in few minutes.", errors, res, [], []);
            }
        } else {
            generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
        }
    } catch (err) {
        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
    }
}
export function getFavouriteOffer(req, res) {
    try {
        if (req.params.id != undefined || req.params.id != "") {
            req.params.id = decryptValue(req.params.id);
            Customer.getFavouriteoffer(req.params.id,
                (err, customer) => {
                    if (err) {
                        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
                    } else {
                        generateResponse(true, "Success", customer, res, ['_id'], []);
                    }
                })
        } else {
            generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
        }
    } catch (err) {
        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
    }
}
export function removeFavouriteOffer(req, res) {
    try {
        if (req.params.id != undefined || req.params.id != "") {
            req.params.id = decryptValue(req.params.id);
            let body = parseBody(req);
            if ((body != null || body != undefined) && (body.Offer != null || body.Offer != undefined)) {
                body.favouriteOffer = {
                    offer: body.Offer
                }
                Customer.get({
                    _id: req.params.id
                }, (err, customer) => {
                    if (err) {
                        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
                    } else {
                        if (customer.length > 0) {
                            Customer.get({
                                "favouriteOffer.offer": mongoose.Types.ObjectId(body.Offer)
                            },
                                (err, customer) => {
                                    if (err) {
                                        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
                                    } else {
                                        var temp_count = 0
                                        for (var i = 0; i < customer.length; i++) {
                                            if (customer[i]['status']['is_deleted'] == false) {
                                                for (var j = 0; j < customer[i]['favouriteOffer'].length; j++) {
                                                    if ((customer[i]['favouriteOffer'][j]['offer'] == body.favouriteOffer.offer) && (customer[i]['favouriteOffer'][j]['status']['is_deleted'] == false)) {
                                                        temp_count++;
                                                    }
                                                }
                                            }
                                        }
                                        if (customer.length > 0 && (temp_count == customer.length)) {
                                            Customer.removeFavouriteOffer(req.params.id,
                                                body.favouriteOffer.offer,
                                                (err, customer) => {
                                                    if (err) {
                                                        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
                                                    } else {
                                                        generateResponse(true, "Updated Successfully", customer, res, [], []);
                                                    }
                                                })
                                        } else {
                                            var errors = {
                                                error: "favourite Offer does not exist"
                                            };
                                            generateResponse(false, 'Unable to process your request.', errors, res, [], []);
                                        }
                                    }
                                })
                        } else {
                            generateResponse(false, 'Record not found.', [], res, [], []);
                        }
                    }
                });
            } else {
                generateResponse(false, "Unable to process your request, Please retry in few minutes.", [], res, [], []);
            }
        } else {
            generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
        }
    } catch (err) {
        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
    }
}
export function getFavouriteBrand(req, res) {
    try {
        if (req.params.id != undefined || req.params.id != "") {
            req.params.id = decryptValue(req.params.id);
            Customer.getFavouriteBrand(req.params.id,
                (err, customer) => {
                    if (err) {
                        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
                    } else {
                        generateResponse(true, "Success", customer, res, ['_id'], []);
                    }
                })
        } else {
            generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
        }
    } catch (err) {
        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
    }
}
export function addFavouriteBrand(req, res) {
    try {
        if (req.params.id != undefined || req.params.id != "") {
            req.params.id = decryptValue(req.params.id);
            let body = parseBody(req);
            if (body) {
                body.favouriteBrand = {
                    brand: body.Brand
                }
                Brand.get({ "_id": body.Brand }, (err, brand) => {
                    if (err) {
                        console.log(err);
                        var errors = {};
                        if (err.name == "ValidationError") {
                            for (var i in err.errors) {
                                errors[i] = err.errors[i].message;
                            }
                        } else {
                            errors[i] = err.errmsg;
                        }
                        generateResponse(false, "Unable to process your request, Please retry in few minutes.", errors, res, [], []);
                    }
                    else {
                        if (brand.length > 0) {
                            Customer.get({
                                _id: req.params.id,
                                "favouriteBrand.brand": body.Brand,
                            }, (err, favBrnd) => {
                                if (err) {
                                    console.log(err);
                                    var errors = {};
                                    if (err.name == "ValidationError") {
                                        for (var i in err.errors) {
                                            errors[i] = err.errors[i].message;
                                        }
                                    } else {
                                        errors[i] = err.errmsg;
                                    }
                                    generateResponse(false, "Unable to process your request, Please retry in few minutes.", errors, res, [], []);

                                }
                                else {
                                    if (favBrnd.length == 0) {
                                        Customer.update(req.params.id,
                                            { $push: body },
                                            (err, customer) => {
                                                if (err) {
                                                    generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
                                                } else {
                                                    generateResponse(true, "Updated Successfully", customer, res, [], []);
                                                }
                                            })
                                    }
                                    else {
                                        favBrnd = favBrnd[0]
                                        var temp = favBrnd.favouriteBrand
                                        var filterRes = temp.find((favBrand) => {
                                            if (favBrand.brand.toString() == body.Brand) {
                                                return favBrand
                                            }
                                        })
                                        let flag = filterRes.status.is_deleted
                                        if (flag) {
                                            Customer.updateFavouriteBrand(req.params.id,
                                                body.Brand,
                                                (err, customer) => {
                                                    if (err) {
                                                        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
                                                    } else {
                                                        generateResponse(true, "Updated Successfully", customer, res, [], []);
                                                    }
                                                })
                                        }
                                        else {
                                            Customer.removeFavouriteBrand(req.params.id,
                                                body.Brand,
                                                (err, customer) => {
                                                    if (err) {
                                                        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
                                                    } else {
                                                        generateResponse(true, "Updated Successfully", customer, res, [], []);
                                                    }
                                                })
                                        }
                                    }
                                }

                            })
                        }
                        else {
                            generateResponse(false, 'Brand not found.', [], res, [], []);
                        }
                    }

                })
            } else {
                generateResponse(false, "Unable to process your request, Please retry in few minutes.", errors, res, [], []);
            }
        } else {
            generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
        }
    } catch (err) {
        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
    }
}