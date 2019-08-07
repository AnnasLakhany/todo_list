export function searchQuery(Model, callback, limit, page, sort = {}, find_params = {}, reference = '') {
    Model.find(find_params, callback)
        .lean(true)
        .populate(reference)
        .sort(sort)
        .skip(parseInt((limit * page) - limit))
        .limit(parseInt(limit));
}
export function getCountOfRecords(Model, callback, params = {}) {
    Model.countDocuments(params, callback);
}
