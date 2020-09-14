import tables from 'models/faculty/operations/associations.js';
import validateUtils from 'models/common/utils/validate.js';
import { faculty, } from 'models/common/utils/connect.js';

export default async ( opt ) => {
    try {
        opt = opt || {};
        let dbTable = null;

        // Turn first letter of table name to uppercase
        // TODO: check if a valid table name?
        // TODO: check if going to delete profile?
        if ( typeof opt.dbTable === typeof '' )
            dbTable = opt.dbTable[ 0 ].toUpperCase() + opt.dbTable.substr( 1 );
        else {
            const error = new Error( 'Invalid table name' );
            error.status = 400;
            throw error;
        }

        // Check if profileId is valid
        if ( !validateUtils.isValidId( opt.profileId ) ) {
            const error = new Error( 'Invalid profile id' );
            error.status = 400;
            throw error;
        }

        // Check if dbTableItemId is valid
        if ( !validateUtils.isPositiveInteger( opt.dbTableItemId ) ) {
            const error = new Error( `Invalid ${ dbTable } id` );
            error.status = 400;
            throw error;
        }

        // StudentAward need different delete procedure
        if ( dbTable === 'StudentAward' ) {
            return faculty.transaction( t => tables.Student.findAll( {
                where: {
                    studentAwardId: opt.dbTableItemId,
                },
                transaction: t,
            } )
            .then( studentId => tables.StudentI18n.destroy( {
                where: {
                    studentId,
                },
                transaction: t,
            } ) )
            .then( () => tables.Student.destroy( {
                where: {
                    studentAwardId: opt.dbTableItemId,
                },
                transaction: t,
            } ) )
            .then( () => tables.StudentAwardI18n.destroy( {
                where: {
                    studentAwardId: opt.dbTableItemId,
                },
                transaction: t,
            } ) )
            .then( () => tables.StudentAward.destroy( {
                where: {
                    studentAwardId: opt.dbTableItemId,
                },
                transaction: t,
            } ) ) )
            .then( () => ( { 'message': 'success', } ) )
            .catch( ( err ) => {
                throw err;
            } );
        }

        // TechnologyTransfer need different delete procedure
        if ( dbTable === 'TechnologyTransfer' ) {
            return faculty.transaction( t => tables.TechnologyTransferPatent.findAll( {
                where: {
                    technologyTransferId: opt.dbTableItemId,
                },
                transaction: t,
            } )
            .then( technologyTransferPatentId => tables.TechnologyTransferPatentI18n.destroy( {
                where: {
                    technologyTransferPatentId,
                },
                transaction: t,
            } ) )
            .then( () => tables.TechnologyTransferPatent.destroy( {
                where: {
                    technologyTransferId: opt.dbTableItemId,
                },
                transaction: t,
            } ) )
            .then( () => tables.TechnologyTransferI18n.destroy( {
                where: {
                    technologyTransferId: opt.dbTableItemId,
                },
                transaction: t,
            } ) )
            .then( () => tables.technologyTransfer.destroy( {
                where: {
                    technologyTransferId: opt.dbTableItemId,
                },
                transaction: t,
            } ) ) )
            .then( () => ( { 'message': 'success', } ) )
            .catch( ( err ) => {
                throw err;
            } );
        }

        // Department and ResearchGroup don't need to delete i18n part
        if ( dbTable === 'Department' || dbTable === 'ResearchGroup' ) {
            return tables[ dbTable ].destroy( {
                where: {
                    profileId: opt.profileId,
                    type:      opt.type,
                },
            } )
            .then( () => ( { 'message': 'success', } ) )
            .catch( ( err ) => {
                throw err;
            } );
        }

        return faculty.transaction( t => tables[ `${ dbTable }I18n` ].destroy( {
            where: {
                [ `${ opt.dbTable }Id` ]: opt.dbTableItemId,
            },
            transaction: t,
        } ).then( () => tables[ dbTable ].destroy( {
            where: {
                [ `${ opt.dbTable }Id` ]: opt.dbTableItemId,
            },
            transaction: t,
        } ) ) )
        .then( () => ( { 'message': 'success', } ) )
        .catch( ( err ) => {
            throw err;
        } );
    }
    catch ( err ) {
        console.error( err );
        throw err;
    }
};
