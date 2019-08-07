'use strict';
import { Router } from "express";
import { log, loggedIn, multerMiddleware } from "../middlewares/index";
import { create, get, update, remove } from '../controllers/popupcontroller';

export default class PopupAPI {
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
        return '/popup';
    }
}