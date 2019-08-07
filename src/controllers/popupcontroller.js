/**
 * Created by Annas on 12/24/2018.
 */
'use strict'
import { parseBody, generateResponse } from '../utilites';
import { searchQuery } from '../utilites/query-module';
import { decryptValue } from '../utilites/encryption-module';
import Popup from '../models/popup';
import Brand from '../models/brand';

function getQueryParams(queryParams) {
    console.log(queryParams)
    let findParams = {};
    findParams = {
        'status.is_deleted': false,
    };
    if (queryParams.search) {
        findParams['$or'] =
            [
                { 'title': { $regex: queryParams.search, $options: 'i' } },
                { 'image': { $regex: queryParams.search, $options: 'i' } },
            ];
    }
    if (queryParams.status) {
        findParams['status.is_activated'] = queryParams.status
    }
    if (queryParams.offer_id != undefined && queryParams.offer_id != "") {
        findParams['link.offer_id'] = queryParams.offer_id;
    }
    if (queryParams.brand_id != undefined && queryParams.brand_id != "") {
        findParams['link.brand_id'] = queryParams.brand_id;
    }
    if (queryParams.id != undefined && queryParams.id != "") {
        findParams._id = decryptValue(queryParams.id) || "";
    }
    return findParams;
}
function addPopup(body, res) {
    Popup.add(body, function (err, popup) {
        if (err) {
            // console.log(err);
            var errors = {};
            if (err.name == "ValidationError") {
                for (var i in err.errors) {
                    errors[i] = err.errors[i].message;
                }
            } else {
                errors[i] = err.errmsg;
            }
            generateResponse(false, "Unable to process your request, Please retry in few minutes.", errors, res, [], [], []);
        } else {
            generateResponse(true, "Added Successfully", popup, res, ['_id'], []);
        }
    });
}
function updatePopup(body, res, id) {
    Popup.update(id, body, (err, update) => {
        console.log(update);
        if (err) {
            generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
        }
        generateResponse(true, 'Updated Successfully', update, res, [], []);
    })
}
export function create(req, res) {
    try {
        let body = parseBody(req);
        var image_path;
        if (body != undefined && req.files != undefined) {
            for (var i = 0; i < req.files.length; i++) {
                if (req.files[i]['fieldname'] === 'image') {
                    image_path = req.files[i]['path']
                }
                else {
                    generateResponse(false, "Unable to process your request, Please retry in few minutes.", [], res, [], [], []);
                }
            }
            body.image = image_path;

            Brand.get({ _id: body.brand_id }, (err, brand) => {
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

                }
                else {
                    if (brand.length > 0) {
                        addPopup(body, res)
                    }
                    else {
                        generateResponse(false, "Brand not found", [], res, [], [])
                    }
                }
            })
        }

    }
    catch (err) {
        generateResponse(false, 'Unable to process your request.Please retry in few minutes', [], res, [], [], []);
    }
}
export function get(req, res) {
    try {
        var queryString = req.query;
        searchQuery(Popup, function (err, popup) {
            if (err) {
                generateResponse(false, 'Unable to process your request. Please retry in few minutes', [], res, [], [], []);
            } else {
                if (popup.length > 0) {
                    generateResponse(true, 'Success', popup, res, ['_id'], []);
                } else {
                    generateResponse(false, 'Record not found', popup, res, [], [], []);
                }
            }
        }, queryString.limit, queryString.page, {}, getQueryParams(queryString), '');
    }
    catch (err) {
        generateResponse(false, "Unable to process your request, Please retry in few minutes.", [], res, [], [], []);
    }
}
export function update(req, res) {
    try {
        let body = parseBody(req);
        req.params.id = decryptValue(req.params.id);
        var image_path;
        if (body != undefined && req.files != undefined) {
            for (var i = 0; i < req.files.length; i++) {
                if (req.files[i]['fieldname'] === 'image') {
                    image_path = req.files[i]['path']
                }
                else {
                    generateResponse(false, "Unable to process your request, Please retry in few minutes.", [], res, [], [], []);
                }
            }
            body.image = image_path;

            Brand.get({ _id: body.brand_id }, (err, brand) => {
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

                }
                else {
                    if (brand.length > 0) {
                        updatePopup(body, res, req.params.id)
                    }
                    else {
                        generateResponse(false, "Brand not found", [], res, [], [])
                    }
                }
            })
        }

    }
    catch (err) {
        generateResponse(false, 'Unable to process your request.Please retry in few minutes', [], res, [], [], []);
    }
}
export function remove(req, res) {
    try {
        if (req.params.id != undefined || req.params.id != "") {
            req.params.id = decryptValue(req.params.id);
            Popup.get({ _id: req.params.id }, (err, popup) => {
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

                }
                else {
                    if (popup.length > 0) {
                        Popup.remove(req.params.id, (err, update) => {
                            console.log(update);
                            if (err) {
                                generateResponse(false, 'Unable to process your request, Please retry in few minutes.', [], res, [], []);
                            }
                            else {
                                generateResponse(true, 'Removed Successfully', [], res, [], []);
                            }
                        })
                    }
                    else {
                        generateResponse(false, "Pop up not found", [], res, [], [])
                    }
                }
            })
          
        }
        else {
            generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
        }
    }
    catch (err) {
        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
    }
}
