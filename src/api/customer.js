'use strict';
import { Router } from "express";
import { log, loggedIn, multerMiddleware } from "../middlewares/index";
import { login, register, get, update, remove, addFavouriteOffer, removeFavouriteOffer, getFavouriteOffer, getCode, resetPassword, offerAvail, getFavouriteBrand, addFavouriteBrand } from '../controllers/customercontroller';
export default class CustomerAPI {
    constructor() {
        this.router = Router();
        this.registerRoutes();
    }
    registerRoutes() {
        let router = this.router;
        router.post('/login', log, login);
        router.post('/register', log, register);
        router.get('/get', log, loggedIn, get);
        router.put('/update/:id', log, loggedIn, update);
        router.delete('/remove/:id', log, loggedIn, remove);

        router.put('/getCode', log, getCode);
        router.put('/resetPassword', log, resetPassword);

        router.put('/offerAvail/:id', log, loggedIn, offerAvail);

        router.put('/addFavouriteOffer/:id', log, loggedIn, addFavouriteOffer);
        router.get('/getFavouriteOffer/:id', log, loggedIn, getFavouriteOffer);
        router.delete('/removeFavouriteOffer/:id', log, loggedIn, removeFavouriteOffer);

        router.put('/addFavouriteBrand/:id', log, loggedIn, addFavouriteBrand);
        router.get('/getFavouriteBrand/:id', log, loggedIn, getFavouriteBrand);
    }
    getRouter() {
        return this.router;
    }
    getRouteGroup() {
        return '/customer';
    }
}