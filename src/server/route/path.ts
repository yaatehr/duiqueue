import {Ipath, IPathRoute} from "../domain/IPath";

function path(url: string): IPathRoute {
    const allRoutes: Ipath = {
        "/test": {
            methods: ["POST", "GET", "PUT", "DELETE"]
        },
        "/duiqueue": {
            methods: ["GET"]
        },
        "/duiqueue/progress": {
            methods: ["GET", "POST"]
        },
        "/extra": {
            methods: ["POST", "GET", "PUT"]
        }
    }
    return allRoutes[url];
}

export default path;
