import config from "../conf/";
import { decryptValue, encryptValue } from "../utilites/encryption-module";

export function generateResponse(success, message, data, res, keys, d_keys) {
    if (keys.length > 0 && data != null && data != undefined) {
        if (data.length > 0) {
            for (var i in data) {
                for (var ki in keys) {
                    if (data[i][keys[ki]] != undefined) {
                        data[i][keys[ki]] = encryptValue(data[i][keys[ki]])
                    }
                }

            }
        }
    }
    if (d_keys.length > 0 && data != null && data != undefined) {
        if (data.length > 0) {
            for (var i in data) {
                for (var j in data[i][d_keys[0]]) {
                    if (data[i][d_keys[0]][j][d_keys[1]] != undefined) {
                        data[i][d_keys[0]][j][d_keys[1]] = decryptValue(data[i][d_keys[0]][j][d_keys[1]])
                    }
                }

            }
        }
    }
    res.json({ success, message, data });
}

export function parseBody(req) {
    let obj;
    if (typeof req.body === 'object') {
        obj = req.body;
    } else {
        obj = JSON.parse(req.body);
    }

    return obj;
}
export function getCurrentTimestamp() {
    let date = new Date();
    return date.getTime();
}

