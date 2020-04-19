import ValidateUtils from 'models/common/utils/validate.js';
import tagUtils from 'models/announcement/utils/tag.js';
import LanguageUtils from 'models/common/utils/language.js';
import { host, } from 'settings/server/config.js';
import { classAdd, classRemove, } from 'static/src/js/utils/style.js';
import FilePreview from 'static/src/pug/components/user/announcement/file-preview.pug';
import tinymce from 'tinymce';

// Plugins
import 'tinymce/themes/silver';

export default class AnnouncementEvent {
    constructor ( opt ) {
        opt = opt || {};

        /***
         * Data validation
         * @parm
         * - `blockDOM:     DOM of information block`
         * - `addButtonDOM: DOM of add button to add information`
         * - `loadingDOM:   DOM of loading logo`
         * - `languageId:   Id  of languageId`
         * - `profileId:    Id  of profileId`
         * - `dbTable:      String of the table name of database`
         */

        if ( !ValidateUtils.isValidId( opt.id ) ||
            !ValidateUtils.isValidId( opt.languageId ) ||
            !ValidateUtils.isDomElement( opt.editBlockDOM ) )
            throw new TypeError( 'invalid arguments' );

        this.config = {
            id:                 opt.id,
            author:             -1,
            languageId:         opt.languageId,
            method:             opt.method,
            animationDelayTime: 500,
        };

        this.state = {
            languageId:  opt.languageId,
            newFileId:   0,
            newFiles:    [],
            files:       [],
            tags:        [],
            deleteFiles: [],
            formData:    new FormData(),
        };

        this.DOM = {
            tags: Array.from( opt.editBlockDOM.querySelectorAll( '.edit-block__tags.tags > .tags__tag' ) ).map( ( node ) => {
                const tagId = node.getAttribute( 'data-tag-id' );
                if ( tagId === null )
                    throw new Error( 'DOM attribute `data-tag-id` not found.' );
                if ( !( Number( tagId ) === tagUtils.tagAllId ) && !tagUtils.isSupportedId( Number( tagId ) ) )
                    throw new Error( 'Invalid DOM attribute `data-tag-id`.' );
                return {
                    node,
                    id:   Number( tagId ),
                };
            } ),
            languageButton: {
                [ LanguageUtils.getLanguageId( 'en-US' ) ]: opt.editBlockDOM.querySelector( '.edit-block__language > .language__button--en-US' ),
                [ LanguageUtils.getLanguageId( 'zh-TW' ) ]: opt.editBlockDOM.querySelector( '.edit-block__language > .language__button--zh-TW' ),
            },
            editBlock:    opt.editBlockDOM,
            title:        opt.editBlockDOM.querySelector( '.edit-block__announcement > .announcement__title > .title__input' ),
            content:      opt.editBlockDOM.querySelector( '.edit-block__announcement > .announcement__content > .content__textarea' ),
            uploadFile:   opt.editBlockDOM.querySelector( '.edit-block__announcement > .announcement__attachment > .attachment__input' ),
            submit:       opt.editBlockDOM.querySelector( '.edit-block__announcement > .announcement__release > .release__check' ),
            filePreview:  opt.editBlockDOM.querySelector( '.edit-block__announcement > .announcement__attachment > .attachment__file' ),
            errorMessage: opt.editBlockDOM.querySelector( '.edit-block__announcement > .announcement__release > .release__error-message' ),
        };
    }

    queryApi ( languageId ) {
        return `${ host }/api/announcement/${ this.config.id }?languageId=${ languageId }`;
    }

    async fetchData ( languageId ) {
        try {
            if ( this.config.method === 'edit' ) {
                const res = await fetch( this.queryApi( languageId ) );

                if ( !res.ok )
                    throw new Error( 'No Announcement found' );

                return res.json();
            }

            // If method is add, return empty
            return {
                title:   '',
                content: '',
                tags:    [],
                files:   [],
            };
        }
        catch ( err ) {
            throw err;
        }
    }

    subscribeEditor () {
        tinymce.init( {
            selector:  '#content__textarea',
            width:     '100%',
            statusbar: false,
            plugins:   'table lists',
            menubar:   'table',
            toolbar:   `formatselect | 
                        bold italic strikethrough forecolor backcolor | 
                        link | 
                        alignleft aligncenter alignright alignjustify  | 
                        numlist bullist outdent indent  | 
                        removeformat`,
        } );
        Object.keys( this.DOM.languageButton ).forEach( ( languageId ) => {
            this.DOM.languageButton[ languageId ].addEventListener( 'click', ( e ) => {
                e.preventDefault();

                /***
                 * Store content in another language
                 */

                this.data[ this.state.languageId ].title = this.DOM.title.value;
                this.data[ this.state.languageId ].content = tinymce.get( 'content__textarea' ).getContent();

                /***
                 * Change button css
                 */

                Object.keys( this.DOM.languageButton ).forEach( ( id ) => {
                    classRemove( this.DOM.languageButton[ id ], 'language__button--active' );
                } );
                classAdd( this.DOM.languageButton[ languageId ], 'language__button--active' );

                /***
                 * Set content in selected language
                 */

                this.state.languageId = languageId;
                this.DOM.title.value = this.data[ languageId ].title;
                tinymce.get( 'content__textarea' ).setContent( this.data[ languageId ].content );
            } );
        } );
    }

    subscribeTagEvent () {
        this.DOM.tags.forEach( ( tag ) => {
            tag.node.addEventListener( 'click', ( e ) => {
                e.preventDefault();
                const index = this.state.tags.indexOf( tag.id );
                if ( index < 0 ) {
                    this.state.tags.push( tag.id );
                    classAdd( tag.node, 'tags__tag--active' );
                }
                else {
                    this.state.tags.splice( index, 1 );
                    classRemove( tag.node, 'tags__tag--active' );
                }
            } );
        } );
    }

    subscribeFileUploadButton () {
        this.DOM.uploadFile.addEventListener( 'change', ( e ) => {
            this.state.newFileId -= e.target.files.length;

            Array.from( e.target.files ).forEach( async ( file, index ) => {
                await this.addFilePreviewBlock( file, this.state.newFileId + index );
            } );
        } );
    }

    subscribeSubmitButton () {
        this.DOM.submit.addEventListener( 'click', ( e ) => {
            e.preventDefault();
            this.data[ this.state.languageId ].title = this.DOM.title.value;
            this.data[ this.state.languageId ].content = tinymce.get( 'content__textarea' ).getContent();

            if ( this.isDataValidate() ) {
                if ( this.config.method === 'add' )
                    this.uploadPostAnnouncement();
                else
                    this.uploadPatchAnnouncement();
            }
        } );
    }

    async addFilePreviewBlock ( file, id ) {
        new Promise( ( res ) => {
            const tempDOM = document.createElement( 'temp-section' );
            tempDOM.innerHTML = FilePreview( {
                host,
                name: file.name,
                id,
            } );

            this.DOM.filePreview.appendChild( tempDOM.firstChild );
            res();
        } )
        .then( () => {
            if ( id < 0 ) {
                const loaderDOM = this.DOM.filePreview.querySelector( `.file__file-preview > .file-preview__loader--${ id }` );
                classAdd( loaderDOM, 'file-preview__loader--active' );
            }
        } )
        .then( async () => {
            const loaderDOM = this.DOM.filePreview.querySelector( `.file__file-preview > .file-preview__loader--${ id }` );
            const fileReader = new FileReader();
            fileReader.onload = () => {
                const unit8Array = new Uint8Array( fileReader.result );
                this.state.newFiles.push( {
                    tempId:  id,
                    name:    file.name,
                    content: Array.from( unit8Array ),
                } );
                classRemove( loaderDOM, 'file-preview__loader--active' );
            };
            fileReader.readAsArrayBuffer( file );

            const deleteDOM = this.DOM.filePreview.querySelector( `.file__file-preview > .file-preview__delete--${ id }` );

            /***
            *   Add delete button event listener
            */

            deleteDOM.addEventListener( 'click', () => {
                if ( id > 0 )
                    this.state.deleteFiles.push( id );

                else
                    this.state.newFiles = this.state.newFiles.filter( e => e.tempId !== id );

                deleteDOM.parentNode.remove();
            } );
        } );
    }

    isDataValidate () {
        let errorMessage = '';

        /***
         * Validate data and set error message
         */

        if ( this.state.tags.length <= 0 )
            errorMessage = '請至少選擇一個標籤';
        if (
            !ValidateUtils.isValidString( this.data[ LanguageUtils.getLanguageId( 'zh-TW' ) ].title ) ||
            this.data[ LanguageUtils.getLanguageId( 'zh-TW' ) ].title.length <= 0
        )
            errorMessage = '中文標題為必填欄位';
        if (
            !ValidateUtils.isValidString( this.data[ LanguageUtils.getLanguageId( 'zh-TW' ) ].content ) ||
            this.data[ LanguageUtils.getLanguageId( 'zh-TW' ) ].content.length <= 0
        )
            errorMessage = '中文內容為必填欄位';
        if (
            !ValidateUtils.isValidString( this.data[ LanguageUtils.getLanguageId( 'en-US' ) ].title ) ||
            this.data[ LanguageUtils.getLanguageId( 'en-US' ) ].title.length <= 0
        )
            errorMessage = '英文標題為必填欄位';
        if (
            !ValidateUtils.isValidString( this.data[ LanguageUtils.getLanguageId( 'en-US' ) ].content ) ||
            this.data[ LanguageUtils.getLanguageId( 'en-US' ) ].content.length <= 0
        )
            errorMessage = '英文內容為必填欄位';

        if ( errorMessage !== '' ) {
            this.setErrorMessage( errorMessage );
            return false;
        }

        this.setErrorMessage( '' );
        return true;
    }

    setErrorMessage ( errorMessage ) {
        this.DOM.errorMessage.textContent = errorMessage;
    }

    uploadPostAnnouncement () {
        fetch( `${ host }/announcement/add`, {
            method:   'POST',
            type:     'string',
            body:   JSON.stringify( {
                'method':           'post',
                'author':           this.config.author,
                'isPinned':         0,
                'isPublished':      1,
                'imageUrl':         null,
                'views':            0,
                'tags':             this.state.tags.map( tagId => ( {
                    tagId,
                } ) ),
                'announcementI18n': LanguageUtils.supportedLanguageId.map( languageId => ( {
                    languageId,
                    title:      this.data[ languageId ].title,
                    content:    this.data[ languageId ].content.replace( /&nbsp;/gi, ' ' ).replace( /\n/g, '' ),
                } ) ),
                'fileI18n': this.state.newFiles.map( file => ( {
                    languageId: this.state.languageId,
                    name:       file.name,
                    content:    file.content,
                } ) ),
            } ),
        } )
        .then( () => {
            location.href = `${ host }/announcement/all?languageId=${ this.config.languageId }`;
        } );
    }

    uploadPatchAnnouncement () {
        let tagString = '';

        /***
         * Use a string to submit which tags be choosed
         * ex. `tag1 tag2 tag3 ...`
         */

        this.state.tags.forEach( ( tag ) => {
            tagString += `${ tag } `;
        } );
        const files = {};
        this.state.files.forEach( ( file ) => {
            files[ file.fileId ] = file.name;
        } );

        fetch( `${ host }/announcement/add`, {
            method:   'POST',
            type:     'string',
            body:   JSON.stringify( {
                'method':           'patch',
                'isPublished':      1,
                'announcementId':   this.config.id,
                'author':           this.config.author,
                'imageUrl':         null,
                'views':            0,
                'i18n':           {
                    [ LanguageUtils.getLanguageId( 'en-US' ) ]: {
                        title:   this.data[ LanguageUtils.getLanguageId( 'en-US' ) ].title,
                        content: this.data[ LanguageUtils.getLanguageId( 'en-US' ) ].content.replace( /&nbsp;/gi, ' ' ).replace( /\n/g, '' ),
                    },
                    [ LanguageUtils.getLanguageId( 'zh-TW' ) ]: {
                        title:   this.data[ LanguageUtils.getLanguageId( 'zh-TW' ) ].title,
                        content: this.data[ LanguageUtils.getLanguageId( 'zh-TW' ) ].content.replace( /&nbsp;/gi, ' ' ).replace( /\n/g, '' ),
                    },
                },
                'tags':           tagString,
                'fileI18n':       {},
            } ),
        } )
        .then( () => {
            location.href = `${ host }/announcement/${ this.config.id }?languageId=${ this.config.languageId }`;
        } );
    }

    exec () {
        Promise.all( LanguageUtils.supportedLanguageId.map( id => this.fetchData( id ) ) )
        .then( async ( data ) => {
            fetch( `${ host }/user/id`, {
                credentials: 'include',
                method:      'post',
            } )
            .then( async res => res.json() )
            .then( async ( res ) => {
                this.config.author = res.roleId;
            } );
            this.data = data;
            if ( data !== null ) {
                this.state.tags = data[ this.config.languageId ].tags;
                this.state.files = data[ this.config.languageId ].files;
            }
        } )
        .then( () => {
            this.subscribeTagEvent();
            this.subscribeEditor();
            this.subscribeFileUploadButton();
            this.subscribeSubmitButton();
            this.DOM.filePreview.innerHTML = '';
            this.state.files.forEach( async ( file ) => {
                await this.addFilePreviewBlock( file, file.fileId );
            } );
        } );
    }
}
