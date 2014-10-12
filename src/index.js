import { junk } from 'utils';
import EventEmitter from 'eventEmitter';

export default class Screen extends EventEmitter {

    /**
     * Attaches itself to the element supplied and gets ready to print
     *
     * @constructs
     */
    constructor( el, opts ) {

        this.parent = el;
        this.el = this.createElement();
        this.opts = Object.assign({
            cols: 80,
            rows: 24
        }, opts || {} );

        // Set DOM styles
        this.insertStyle();
        this.parent.classList.add( 'tatty' );
        this.lineHeight = 19;
        this.height = 'default';
        this.width = 'default';

        // Set initial lines
        this.lines = [];
        this.cursor = {
            x: -1,
            y: -1
        };
    }

    /**
     * Write the characters to the teleprinter at the current cursor position.
     *
     * @param chars {String} the characters to print
     */
    write( chars ) {
        chars = chars.replace( /\s/, '&nbsp' );

        // If there are no lines then we need to create one
        if ( this.cursor.x < 0 ) {
            this.createLine();
            this.cursor.x = 0;
            this.cursor.y = 0;
        }

        var line = this.el.querySelectorAll( '.line' )[ this.cursor.y ];
        var contents = line.innerHTML;

        line.innerHTML = contents.slice( 0, this.cursor.x ) + chars + contents.slice( this.cursor.x, contents.length );
        this.cursor.x += chars.length + 1;
    }

    /**
     * Writes the specified characters to a new line
     *
     * @param chars {String} the characters to print
     */
    writeln( chars ) {
        chars = chars.replace( /\s/, '&nbsp' );

        // Split the input into separate lines to print
        var lines = this.splitLine( chars );

        for ( let i = 0; i < lines.length; i++ ) {
            var line = this.createLine();
            line.innerHTML = lines[ i ];
            this.cursor.x = lines[ i ].length + 1;
        }

        this.cursor.y += lines.length;
    }

    /*-----------------------------------------------------------*\
     *
     *  Getters/Setters
     *
    \*-----------------------------------------------------------*/

    /**
     * Mirrors the desired tatty height with the dom element.
     * Use 'default' to set height based on line height and number of lines
     */
    set height( h ) {
        if ( !this.el ) return;

        if ( h === 'default' ) {
            this.parent.style.height = this.opts.rows * this.lineHeight + 'px';
            return;
        }

        this.parent.style.height = h + 'px';
    }

    /**
     * Grabs the element height and returns as an integer
     */
    get height() {
        if ( !this.el ) return;

        return ~~this.parent.style.height.replace( 'px', '' );
    }

    /**
     * Sets the width of the element.
     * Use 'default' to set the width based on character width and number of columns
     */
    set width( w ) {
        if ( !this.el ) return;

        if ( w === 'default' ) {
            this.parent.style.width = this.opts.cols * this.charWidth + 'px';
            return;
        }

        this.parent.style.width = w + 'px';
    }

    /**
     * Grabs the element width and returns as an integer
     */
    get width() {
        if ( !this.el ) return;

        return ~~this.parent.style.width.replace( 'px', '' );
    }

    /**
     * Calculates the char width based on the width of the current 'm' character
     */
    get charWidth() {
        var el = document.createElement( 'span' );
        el.style.opacity = 0;
        el.innerHTML = 'm';
        this.parent.appendChild( el );
        var fontWidth = el.offsetWidth;
        this.parent.removeChild( el );
        return fontWidth;
    }

    /**
     * Returns the current onscreen buffer size
     */
    get bufferSize() {
        return this.opts.cols * this.opts.rows;
    }

    /*-----------------------------------------------------------*\
     *
     *  Helpers
     *
    \*-----------------------------------------------------------*/

    /**
     * Creates a new line and appends it
     */
    createLine() {
        var div = document.createElement( 'div' );
        div.classList.add( 'line' );
        div.style.top = this.lineHeight * this.lines.length + 'px';
        div.style.width = this.width + 'px';

        this.el.appendChild( div );
        this.lines.push( div );

        // Sort out tatty size
        this.el.style.width = this.width + 'px';
        this.el.style.height = this.lines.length * this.lineHeight + 'px';

        this.showLastLine();
        return div;
    }


    /**
     * Calculates the last visible line and scrolls the pane to show it.
     * Is not cross-browser.
     */
    showLastLine() {
        this.el.style.transform = 'translatey(-' + ( ( this.lines.length * this.lineHeight ) - ( this.lineHeight * this.opts.rows ) ) + 'px )';
    }

    /**
     * Creates a prompt line and sets up the input field
     */
    prompt() {
        var cmd = this.createLine();
        cmd.innerHTML = '&nbsp>&nbsp';

        this.trigger( 'prompt', [ true ] );
    }

    /**
     * Inserts the main style for the tatty element
     */
    insertStyle() {
        var style = document.createElement( 'style' );
        style.id = 'tatty';
        style.innerHTML = `
            .tatty {
                position: relative;
                background:white;
                color: #333a3c;
                font-family: 'Source Code Pro';
                font-size: 15px;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
                overflow: hidden;
            }
            .tatty .inner {
                position: absolute;
            }
            .tatty .line {
                position: absolute;
            }
        `;

        var head = document.querySelector( 'head' );
        head.appendChild( style );
    }

    /**
     * Creates the main tatty element and appends it to the viewport
     */
    createElement() {
        var el = document.createElement( 'div' );
        el.classList.add( 'inner' );
        this.parent.appendChild( el );
        return el;
    }


    /**
     * Splits the input string into separate lines
     *
     * @param chars {String} characters to print to the screen
     * @returns {Array} representing lines to print
     */
    splitLine( chars ) {
        // If only one line then simply return
        if ( chars.length <= this.opts.cols ) {
            return [ chars ];
        }

        // Grabs the space character before the cut-off position, or returns -1 if there is no whitespace character
        function findLastSpacePosition( start ) {
            let i = start;
            while( chars[ i ] !== ' ' ) {
                i--;

                // If not found then return -1
                if ( i < 0 ) break;
            }

            // If not found then return the max number of chars per line
            return i < 0 ? this.opts.cols : i;
        }

        // Actual string-slicing
        function strip( start, end ) {
            var tmp = chars.slice( start, end );
            chars = chars.slice( end + 1, chars.length );
            return tmp;
        }

        var output = [];

        // Keep popping off a lines-worth of characters from the full string
        while( chars.length > this.opts.cols ) {
            // If a space exists then output up to the space, otherwise output the max number of chars for a line
            output.push( strip( 0, findLastSpacePosition( this.opts.cols ) ) )
        }

        // Push the last one on
        output.push( chars );

        return output;
    }
}
