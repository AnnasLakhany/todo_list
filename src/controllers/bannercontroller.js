/**
 * Created by Annas on 12/24/2018.
 */
'use strict'
import { parseBody, generateResponse } from '../utilites';
import { searchQuery } from '../utilites/query-module';
import { decryptValue } from '../utilites/encryption-module';
import Banner from '../models/banner';
import Brand from '../models/brand';
import BannerCategory from '../models/bannerCategory'
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
                { 'bannerImage': { $regex: queryParams.search, $options: 'i' } },
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
{// alternate way
    // var offer_id = null;
    // var brand_id = null;
    // if (body.offer_id!= undefined && body.offer_id != "") {
    //     offer_id = body.offer_id ;
    // }
    // if (body.brand_id!= undefined && body.brand_id != "") {
    //     brand_id = body.brand_id ;
    // }
    // // console.log(offer_id,brand_id);
    // Brand.get({
    //     "offer._id": offer_id
    // },(err,offer) => {
    //     if(err){
    //         console.log('error',err);
    //     }
    //     else{
    //         // console.log('offer',offer);
    //     } 
    // }) 
    // Brand.get({
    //     _id:brand_id
    // },(err,brand) => {
    //     if(err)
    //         { 
    //             console.log('error',err);
    //         }
    //         else{
    //             // console.log('brand',brand);
    //         } 
    //     });
    // console.log('body',body)
    // return;
}
function addBanner(body,res) {
    Banner.add(body, function (err, banner) {
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
            generateResponse(true, "Added Successfully", banner, res, ['_id'], []);
        }
    });
}
function updateBanner(body,res,id) {
    Banner.update(id, body, (err, update) => {
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
        var bannerImage_path;
        if (body != undefined && req.files != undefined) {
            for (var i = 0; i < req.files.length; i++) {
                if (req.files[i]['fieldname'] === 'bannerImage') {
                    bannerImage_path = req.files[i]['path']
                }
                else {
                    generateResponse(false, "Unable to process your request, Please retry in few minutes.", [], res, [], [], []);
                }
            }
            body.bannerImage = bannerImage_path;
            body.link = {
                offer_id: body.offer_id,
                brand_id: body.brand_id
            }

            if (((body.offer_id != undefined && body.offer_id != '') || (body.brand_id != undefined && body.brand_id != '')) && (body.category_id != undefined && body.category_id != '')) {
                if ((body.offer_id != undefined && body.offer_id != '') && (body.brand_id != undefined && body.brand_id != '') && (body.category_id != undefined && body.category_id != '')) {
                    Brand.get({
                        "offer._id": body.offer_id
                    }, (err, offer) => {
                        if (err) {
                            var errors = err.errmsg;
                            generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], [], []);
                        }
                        else {
                            if (offer.length > 0) {
                                Brand.get({
                                    _id: body.brand_id
                                }, (err, brand) => {
                                    if (err) {
                                        var errors = err.errmsg;
                                        generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], [], []);
                                        // flag = false;
                                    }
                                    else {
                                        if (brand.length > 0) {
                                            BannerCategory.get({
                                                _id: body.category_id
                                            }, (err, banner_category) => {
                                                if (err) {
                                                    var errors = err.errmsg;
                                                    generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], [], []);
                                                }
                                                else {
                                                    if (banner_category.length > 0) {
                                                        addBanner(body,res);

                                                    }
                                                    else {
                                                        var errors = {
                                                            error: "Banner Category does not exist"
                                                        };
                                                        generateResponse(false, 'Unable to process your request.', errors, res, [], [], []);
                                                    }
                                                }
                                            })


                                        }
                                        else {
                                            var errors = {
                                                error: "Brand does not exist"
                                            };
                                            generateResponse(false, 'Unable to process your request.', errors, res, [], [], []);
                                        }
                                    }
                                });
                            }
                            else {
                                var errors = {
                                    error: "Offer does not exist"
                                };
                                generateResponse(false, 'Unable to process your request.', errors, res, [], [], []);
                                // flag = false;
                            }
                        }
                    });
                }
                else if ((body.offer_id != undefined && body.offer_id != '') && (body.category_id != undefined && body.category_id != '')) {
                    Brand.get({
                        "offer._id": body.offer_id
                    }, (err, offer) => {
                        if (err) {
                            var errors = err.errmsg;
                            generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], [], []);
                        }
                        else {
                            if (offer.length > 0) {
                                BannerCategory.get({
                                    _id: body.category_id
                                }, (err, banner_category) => {
                                    if (err) {
                                        var errors = err.errmsg;
                                        generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], [], []);
                                    }
                                    else {
                                        if (banner_category.length > 0) {
                                            addBanner(body,res);

                                        }
                                        else {
                                            var errors = {
                                                error: "Banner Category does not exist"
                                            };
                                            generateResponse(false, 'Unable to process your request.', errors, res, [], [], []);
                                        }
                                    }
                                })
                            }
                            else {
                                var errors = {
                                    error: "Offer does not exist"
                                };
                                generateResponse(false, 'Unable to process your request.', errors, res, [], [], []);
                            }
                        }
                    })
                }
                else if ((body.brand_id != undefined && body.brand_id != '') && (body.category_id != undefined && body.category_id != '')) {
                    Brand.get({
                        _id: body.brand_id
                    }, (err, brand) => {
                        if (err) {
                            var errors = err.errmsg;
                            generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], [], []);
                        }
                        else {
                            if (brand.length > 0) {
                                BannerCategory.get({
                                    _id: body.category_id
                                }, (err, banner_category) => {
                                    if (err) {
                                        var errors = err.errmsg;
                                        generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], [], []);
                                    }
                                    else {
                                        if (banner_category.length > 0) {
                                            addBanner(body,res);

                                        }
                                        else {
                                            var errors = {
                                                error: "Banner Category does not exist"
                                            };
                                            generateResponse(false, 'Unable to process your request.', errors, res, [], [], []);
                                        }
                                    }
                                })
                            }
                            else {
                                var errors = {
                                    error: "Brand does not exist"
                                };
                                generateResponse(false, 'Unable to process your request.', errors, res, [], [], []);
                            }
                        }
                    })
                }
            } else {
                var errors = {
                    title: "One or more fields required"
                };
                generateResponse(false, "Unable to process your request", errors, res, [], [], []);
            }
        }
        else {
            generateResponse(false, 'Unable to process your request.Please retry in few minutes', errors, res, [], [], []);
        }
    }
    catch (err) {
        generateResponse(false, 'Unable to process your request.Please retry in few minutes', [], res, [], [], []);
    }
}
export function get(req, res) {
    try {
        var queryString = req.query;
        searchQuery(Banner, function (err, banner) {
            if (err) {
                generateResponse(false, 'Unable to process your request. Please retry in few minutes', [], res, [], [], []);
            } else {
                if (banner.length > 0) {
                    generateResponse(true, 'Success', banner, res, ['_id'], []);
                } else {
                    generateResponse(false, 'Record not found', banner, res, [], [], []);
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
        if (req.params.id != undefined || req.params.id != "") {
            req.params.id = decryptValue(req.params.id);

            let body = parseBody(req);
            var bannerImage_path;
            if (body != undefined && req.files != undefined) {
                for (var i = 0; i < req.files.length; i++) {
                    if (req.files[i]['fieldname'] === 'bannerImage') {
                        bannerImage_path = req.files[i]['path']
                    }
                }
                body.bannerImage = bannerImage_path;
                body.link = {
                    offer_id: body.offer_id,
                    brand_id: body.brand_id
                }
                if (((body.offer_id != undefined && body.offer_id != '') || (body.brand_id != undefined && body.brand_id != '')) && (body.category_id != undefined && body.category_id != '')) {

                    if ((body.offer_id != undefined && body.offer_id != '') && (body.brand_id != undefined && body.brand_id != '') && (body.category_id != undefined && body.category_id != '')) {
                        Brand.get({
                            "offer._id": body.offer_id
                        }, (err, offer) => {
                            if (err) {
                                var errors = err.errmsg;
                                generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], []);
                            }
                            else {
                                if (offer.length > 0) {
                                    Brand.get({
                                        _id: body.brand_id
                                    }, (err, brand) => {
                                        if (err) {
                                            var errors = err.errmsg;
                                            generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], []);
                                            // flag = false;
                                        }
                                        else {
                                            if (brand.length > 0) {
                                                BannerCategory.get({
                                                    _id: body.category_id
                                                }, (err, banner_category) => {
                                                    if (err) {
                                                        var errors = err.errmsg;
                                                        generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], [], []);
                                                    }
                                                    else {
                                                        if (banner_category.length > 0) {
                                                            updateBanner(body,res,req.params.id);

                                                        }
                                                        else {
                                                            var errors = {
                                                                error: "Banner Category does not exist"
                                                            };
                                                            generateResponse(false, 'Unable to process your request.', errors, res, [], [], []);
                                                        }
                                                    }
                                                })

                                            }
                                            else {
                                                var errors = {
                                                    error: "Brand does not exist"
                                                };
                                                generateResponse(false, 'Unable to process your request.', errors, res, [], []);
                                            }
                                        }
                                    });
                                }
                                else {
                                    var errors = {
                                        error: "Offer does not exist"
                                    };
                                    generateResponse(false, 'Unable to process your request.', errors, res, [], []);
                                    // flag = false;
                                }
                            }
                        });
                    }
                    else if ((body.offer_id != undefined && body.offer_id != '') && (body.category_id != undefined && body.category_id != '')) {
                        Brand.get({
                            "offer._id": body.offer_id
                        }, (err, offer) => {
                            if (err) {
                                var errors = err.errmsg;
                                generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], []);
                            }
                            else {
                                if (offer.length > 0) {
                                    BannerCategory.get({
                                        _id: body.category_id
                                    }, (err, banner_category) => {
                                        if (err) {
                                            var errors = err.errmsg;
                                            generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], [], []);
                                        }
                                        else {
                                            if (banner_category.length > 0) {
                                                updateBanner(body,res,req.params.id);

                                            }
                                            else {
                                                var errors = {
                                                    error: "Banner Category does not exist"
                                                };
                                                generateResponse(false, 'Unable to process your request.', errors, res, [], [], []);
                                            }
                                        }
                                    })
                                }
                                else {
                                    var errors = {
                                        error: "Offer does not exist"
                                    };
                                    generateResponse(false, 'Unable to process your request.', errors, res, [], []);
                                }
                            }
                        })
                    }
                    else if ((body.brand_id != undefined && body.brand_id != '') && (body.category_id != undefined && body.category_id != '')) {
                        Brand.get({
                            _id: body.brand_id
                        }, (err, brand) => {
                            if (err) {
                                var errors = err.errmsg;
                                generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], []);
                            }
                            else {
                                if (brand.length > 0) {
                                    BannerCategory.get({
                                        _id: body.category_id
                                    }, (err, banner_category) => {
                                        if (err) {
                                            var errors = err.errmsg;
                                            generateResponse(false, 'Unable to process your request, Please retry in few minutes', errors, res, [], [], []);
                                        }
                                        else {
                                            if (banner_category.length > 0) {
                                                updateBanner(body,res,req.params.id);

                                            }
                                            else {
                                                var errors = {
                                                    error: "Banner Category does not exist"
                                                };
                                                generateResponse(false, 'Unable to process your request.', errors, res, [], [], []);
                                            }
                                        }
                                    })
                                }
                                else {
                                    var errors = {
                                        error: "Brand does not exist"
                                    };
                                    generateResponse(false, 'Unable to process your request.', errors, res, [], []);
                                }
                            }
                        })
                    }
                } else {
                    var errors = {
                        title: "One or more fields required"
                    };
                    generateResponse(false, "Unable to process your request", errors, res, [], []);
                }
            }
            else {
                generateResponse(false, 'Unable to process your request.Please retry in few minutes', errors, res, [], []);
            }
        }
        else {
            generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
        }
    }
    catch (err) {
        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
    }
}
export function remove(req, res) {
    try {
        if (req.params.id != undefined || req.params.id != "") {
            req.params.id = decryptValue(req.params.id);
            Banner.remove(req.params.id, (err, update) => {
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
            generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
        }
    }
    catch (err) {
        generateResponse(false, 'Unable to process your request, Please retry in few minutes', [], res, [], []);
    }
}
