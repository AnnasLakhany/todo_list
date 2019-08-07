'use strict';
import { Router } from "express";
import {log, loggedIn, multerMiddleware} from "../middlewares/index";
import { login, create, get, update, remove,pushnotification, getCustomerNotifications } from '../controllers/notificationcontroller';
export default class NotificationAPI {
    constructor() {
        this.router = Router();
        this.registerRoutes();
    }
    registerRoutes() {
        let router = this.router;
        // router.post('/login', log, login);
        router.post('/create', log,loggedIn,multerMiddleware, create);
        router.get('/get', log, loggedIn, get);
        router.put('/update/:id', log, loggedIn,multerMiddleware, update);
        router.delete('/remove/:id', log, loggedIn, remove);
        router.get('/pushnotification', log, loggedIn, pushnotification);
        router.get('/getCustomerNotifications', log, loggedIn, getCustomerNotifications);

    }
    getRouter() {
        return this.router;
    }
    getRouteGroup() {
        return '/notification';
    }
}
