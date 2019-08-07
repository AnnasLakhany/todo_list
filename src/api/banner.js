'use strict';
import { Router } from "express";
import { log, loggedIn, multerMiddleware } from "../middlewares/index";
import { create, get, update, remove } from '../controllers/bannercontroller';
// const multer = require('multer');
// const storage = multer.diskStorage({
//     destination: function(req, file, cb) {
//       cb(null, './uploads/');
//     },
//     filename: function(req, file, cb) {
//       cb(null, Date.now() +'-'+ file.originalname);
//     }
//   });
//   const fileFilter = (req, file, cb) => {
//     // reject a file
//     if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
//       cb(null, true);
//     } else {
//       cb(null, false);
//     }
//   };
//   const upload = multer({
//     storage: storage,
//     // limits: {
//     //   fileSize: 1024 * 1024 * 5
//     // },
//     fileFilter: fileFilter
//   });
export default class BannerAPI {
    constructor() {
        this.router = Router();
        this.registerRoutes();
    }
    registerRoutes() {
        let router = this.router;
        router.post('/create', multerMiddleware, log, loggedIn, create);
        router.get('/get', log, loggedIn, get);
        router.put('/update/:id', multerMiddleware, log, loggedIn, update);
        router.delete('/remove/:id', log, loggedIn, remove);
    }
    getRouter() {
        return this.router;
    }
    getRouteGroup() {
        return '/banner';
    }
}