export const GENDER_TYPE = ['M', 'F', 'U'];
export const EMPLOYEE_TYPE = ['Permanent', 'Probation', 'Trainee', 'Contract'];
export const ASSET_STATUS = ['Lost', 'Received', 'Returned'];

export const TIME_STAMPES = {
    updated_at: {
        type: Date,
        default: Date.now
    },
    created_at: {

        type: Date,
        default: Date.now
    }
};
export const FLAGS = {

    is_deleted: {
        type: Boolean,
        default: false
    },
    is_activated: {
        type: Boolean,
        default: true
    }

}