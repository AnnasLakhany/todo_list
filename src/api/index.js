'use strict';
import { Router, NextFunction, Request, Response } from "express";
import CustomerAPI from "./customer";
import BannerAPI from "./banner";
import NotificationAPI from "./notification";
import PopupAPI from './popup';

export default class Api {
    constructor(app) {
        this.app = app;
        this.router = Router();
        this.routeGroups = [];
    }
    loadRouteGroups() {
        this.routeGroups.push(new CustomerAPI());
        this.routeGroups.push(new NotificationAPI());
        this.routeGroups.push(new BannerAPI());
        this.routeGroups.push(new PopupAPI());


    }
    setContentType(req, resp, next) {
        resp.set('Content-Type', 'text/json');
        next();
    }
    registerGroup() {
        this.loadRouteGroups();
        this.routeGroups.forEach(rg => {
            let setContentType = rg.setContentType ? rg.setContentType : this.setContentType;
            this.app.use('/api' + rg.getRouteGroup(), setContentType, rg.getRouter())
        });
    }
}
