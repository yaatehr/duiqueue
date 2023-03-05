import {Request, Response} from 'express';
import {IError} from '../domain/IError';
import path from '../route/path';

// Check to see if the requested route has the requested method as well
export default (req: Request, res: Response, next: (param?: unknown) => void): void => {
    try{
        const base_url = req.url.split('?')[0];
        // console.log(req.url);
        // console.log(base_url);
        const route = path(base_url);
        // console.log(route.methods);
        // console.log(route.methods.includes(req.method))
        if (route.methods.includes(req.method)) {
            next();   
        } else {
            const error: IError = {
                status: 405,
                message: "Method not allowed, YET!"
            }
            res.setHeader("allow", route.methods);
            res.status(405).json(error);
        }
    } catch(e){
        const error: IError = {
            status: 404,
            message: req.url + " Not found, YET!"
        }
        res.status(404).json(error);
    }

}
