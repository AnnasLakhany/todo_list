'use strict';
import { verify } from "jsonwebtoken";
import config from "../conf";
import multer from 'multer';
import mongoose from 'mongoose';
const Role = require("../models/role");
export function log(req, res, next) {
    console.log(req.originalUrl);
    next();
}
export function multerMiddleware(req, res, next) {
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, './uploads/');
        },
        filename: function (req, file, cb) {
            cb(null, Date.now() + '-' + file.originalname);
        }
    });
    const fileFilter = (req, file, cb) => {
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === "image/png" || file.mimetype === "image/PNG") {
            cb(null, true);
        } else {
            cb(null, false);
        }
    };
    let upload = multer({
        storage: storage,
        fileFilter: fileFilter
    }).any();
    upload(req, res, (err) => {
        if (err) {
            console.log(err);
            res.status(400).json({ success: false, error: ["File Cannot be Uploaded"] });
        }
        next();
    });
}
export function loggedIn(req, res, next) {
    decodeToken(req).then(data => {

        req.user = data.payload;
        next();
    }).catch(ex => {
        // let error = {type: ERROR_TYPE.FORCE_UPDATE, message: 'Update your application.'};
        // let error = {type: ERROR_TYPE.DEACTIVATE_USER, message: 'User is deactivated.'};
        // let error = {type: ERROR_TYPE.CUSTOM, message: 'Oops something went wrong..'};
        res.status(400).json({ success: false, error: ["Unauthenticated request"] });
    });
}
export function decodeToken(req) {
    return new Promise((resolve, reject) => {
        let { token } = req.headers;
        verify(token, `${config.app['jwtsecret']}`, (err, decoded) => {
            if (err === null) {
                resolve(decoded);
            } else {
                reject(err);
            }
        });
    });
}
