// a jQuery plugin for adaptive sticky element positioning written by [Mike Turley](http://www.miketurley.com).
// ------------------------------------------------------------------------------------------------------------

// jQuery.stickystack makes the active element in a selection stick to the edge of the screen.
// it works by conditionally setting and unsetting fixed and absolute position on elements as you scroll.
//
// a demo can be found [here](../demo.html).
//
// this annotated source code was generated with the wonderful [docco](http://jashkenas.github.com/docco/).


// license
// -------
// jQuery.stickystack is dual-licensed under the
// [MIT](../MIT-LICENSE.txt) and
// [GPL](../GPL-LICENSE.txt) licenses, as is jQuery itself.
// you may use jQuery.stickystack anywhere you are permitted to use jQuery, including in a commercial project
// as long as this license statement is left intact.


// usage
// -----
//     $(document).ready(function() {
//       $(".some-class").stickystack();         // create
//       // optionally, later on:
//       $(".some-class").stickystackUnstick();  // destroy
//     });


// the only global variable (not truly global, since it's in a closure) is `stacks`,
// an array of objects to track the stacks you've created.
(function( $ ) {

  var stacks = [];

  // $.fn.* (jQuery selector functions)
  // ----------------------------------
  // this plugin provides the following top-level jQuery functions:
  //
  // * **`$.fn.stickystack`** initializes a stickystack.
  // * **`$.fn.stickystackResetStyle`** restores element's original styles.
  // * **`$.fn.stickystackUpdate`** updates element positions on scroll.
  // * **`$.fn.stickystackUnstick`** undoes the effects of the plugin.
  // * **`$.fn.stickystackFindContainer`** looks for scrollbars.
  // * **`$.fn.stickystackCommonAncestor`** finds a common ancestor.
  // * **`$.fn.stickystackScrollable`** is a helper for the `scroll` event.

  // $.fn.stickystack
  // ----------------
  // this is the main plugin function, used to set up a stickystack.
  $.fn.stickystack = function(mode) {

    var container, stack;

    // this function treats the selection as a vertical stack of elements, and makes them sticky relative to the mode.
    // the "container" is defined as the nearest common ancestor which has a scrollbar. (see $.fn.stickystackFindContainer)

    // the mode can be 'top' or 'always', and defaults to 'top' if no mode is specified.

    if(mode === undefined) mode = 'top';

    if(mode != 'top' && mode != 'always') {
      warn("jQuery.stickystack: invalid mode: ",mode);
      return null;
    }

    // * in 'top' mode, elements will:
    //   * be fixed at the top of the container when the user scrolls past them (one fixed element at a time).
    //   * be allowed to go out of view above the container only when the next element in the stack is scrolled to.
    //   * be allowed to go out of view below the container as normal.
    // * in 'always' mode, elements will:
    //   * be fixed at the top of the container if they normally would be out of view above the container.

    // this plugin only affects elements which would be out of view without the plugin.
    // elements whose static position is within the viewable area are left at that static position.
    // all positions and states are updated dynamically on the container's scroll event.

    // if called on elements which are already "sticky", the plugin will refuse to repeat itself.
    if(this.hasClass('stickystack-item')) {
      warn("jQuery.stickystack: that stack is already sticky!");
      return null;
    }

    container = this.stickystackFindContainer();
    // each stack object keeps track of:

    // * what mode it was applied with
    // * what elements it was applied to
    // * what container to listen to
    stack = {
      'mode'      : mode,
      'elements'  : this,
      'container' : container
    };
    stacks.push(stack);

    // this loop initializes each item in the stack.
    this.addClass('stickystack-item').addClass('stickystack-mode-'+mode).each(function(index) {
      var t = $(this);
      // a placeholder matching the width of each element is inserted before it, and given the element's full height
      // as a data key.  this way, we can apply and un-apply height to the placeholder, so that when elements are
      // positioned with float or absolute, the space they left behind in the document does not collapse.
      var placeholder = $("<div />").addClass('stickystack-placeholder').css({
        'width'  : t.outerWidth(),
        'height' : '0'
      }).insertBefore(t);
      placeholder.data({
        'fullHeight'     : t.outerHeight(),
        'placeholderFor' : t
      });

      // each element in the stack stores its original position so it can be reapplied later.
      t.data({
        'stickystackOriginalStyle' : {
          'position' : t.css('position'),
          'top'      : t.css('top'),
          'left'     : t.css('left'),
          'width'    : t.css('width'),
          'z-index'  : t.css('z-index'),
          'opacity'  : t.css('opacity')
        },
        // each element in the stack also stores references to the stack's container...
        'stickystackContainer'   : container,
        // ...previous and next items...
        'stickystackPrevItem'    : (index != 0 ? $(stack.elements[index-1]) : $([])),
        'stickystackNextItem'    : (index != stack.elements.length-1 ? $(stack.elements[index+1]) : $([])),
        // ...the placeholder and the mode.
        'stickystackPlaceholder' : placeholder,
        'stickystackMode'        : mode
      });
    });

    // if the container is not already initialized, set up the scroll listener
    // using [jQuery.on()](http://api.jquery.com/on/) with a .stickystack namespace.
    if(!container.data('stickystackInitialized')) {
      container.stickystackScrollable().on('scroll.stickystack', function() {
        container.stickystackUpdate();
      });
      container.data({
        'stickystackInitialized' : true,
        'stickystackObj'         : stack   // each container stores a reference to its stack object for easy access.
      });
      container.stickystackUpdate();
    }
  };



  // $.fn.stickystackResetStyle
  // --------------------------
  // restores element's original styles and flattens the placeholder element back to height 0.
  // this is called on elements that should no longer be fixed or absolute.
  $.fn.stickystackResetStyle = function() {
    if(this.length != 0) {
      var orig = $(this).data('stickystackOriginalStyle');
      for(var prop in orig) { $(this).css(prop, orig[prop]); }
      var placeholder = $(this).data('stickystackPlaceholder');
      placeholder.css('height', '0');
      $(this).removeClass('stickystack-fixed stickystack-absolute');
    }
  };



  // $.fn.stickystackUpdate
  // ----------------------
  // called on scroll, this function updates the positions of items in the stack.
  // it is to be called with the selection as an initialized container.
  // this is where most of the magic happens!
  $.fn.stickystackUpdate = function() {
    var container = this;
    if(this.is($(window))) container = $('body');
    if(!container.data('stickystackInitialized')) {
      warn("jQuery.stickystack: that's not an initialized stickystack container:", container);
      if(this.first().data('stickystackContainer')) {
        log("jQuery.stickystack: updated anyway based on the associated container.");
        this.first().data('stickystackContainer').stickystackUpdate();
      }
      return null;
    }
    var topBuffer = 0;
    // the function loops through each of the elements in the stack:
    container.find('.stickystack-item').each(function() {
      // for each element, fetch the mode, placeholder, width, scrollTop and previous element.
      var t = $(this);
      var mode = t.data('stickystackMode');
      var placeholder = t.data('stickystackPlaceholder');
      var width = t.width();
      var scrollTop = t.data('stickystackContainer').get(0).scrollTop;
      var prev = t.data('stickystackPrevItem');
      // detect whether this element's placeholder is out of view above the window.
      var outOfViewAbove = placeholder.offset().top <= scrollTop + topBuffer;
      // detect whether this element is currently colliding with the previous element.
      // this will only occur when the previous element is fixed, and this element has been scrolled into it.
      var colliding = false;
      if(prev.length != 0) colliding = placeholder.offset().top <= prev.offset().top + prev.outerHeight();
      // if a collision is detected, set the previous element's position absolutely to just above this element.
      // this is what gives the effect of sticky elements "bumping" each other out of the way.
      // in a collision, we also assert that the previous element's placeholder is taking up its full height.
      if(colliding) {
        prev.removeClass('stickystack-fixed').addClass('stickystack-absolute').css({
          'position'   : 'absolute',
          'top'        : (t.offset().top - prev.outerHeight())+'px',
          'left'       : container.offset().left,
          'z-index'    : 0,
          'visibility' : 'visible'
        });
        var prevplaceholder = prev.data('stickystackPlaceholder');
        prevplaceholder.css('height', prevplaceholder.data('fullHeight')+'px');
      }
      // if this element's placeholder is in view, ensure we are not messing with its styles.
      // otherwise, set it as the fixed element.
      if(!outOfViewAbove) {
        t.stickystackResetStyle();
      } else {
        t.removeClass('stickystack-absolute').addClass('stickystack-fixed').css({
          'position'   : 'fixed',
          'top'        : topBuffer+'px',
          'width'      : width+'px',
          'z-index'    : 100,
          'visibility' : 'visible'
        });
        placeholder.css({
          'height' : placeholder.data('fullHeight')+'px'
        });
        // if this element's sticky mode is 'always', we add its height to the topBuffer.
        // this forces other sticky elements to be fixed just below it since it will always be in view.
        if(mode == 'always') topBuffer += $(this).outerHeight();
      }
    });
    // if there is a 'top'-mode element which is currently fixed, hide all absolutely-positioned items.
    // this means that once an item is moved above its fixed position, it disappears rather than hanging out
    // behind whatever other elements may be there.
    if(container.find('.stickystack-fixed.stickystack-mode-top').length != 0) {
      container.find('.stickystack-absolute').css('visibility','hidden');
    }
  };



  // $.fn.stickystackUnstick
  // -----------------------
  // this function reverses all effects of the plugin for the selected elements.
  $.fn.stickystackUnstick = function() {
    var classes = 'stickystack-item stickystack-mode-top stickystack-mode-always stickystack-fixed stickystack-absolute';
    var container = this.first().data('stickystackContainer');
    container.find('stickystack-placeholder').remove();
    container.find('stickystack-item').each(function() {
      $(this).removeClass(classes);
      $(this).stickystackResetStyle();
      $(this).removeData(['stickystackOriginalStyle', 'stickystackContainer']);
    });
    if(container.data('stickystackInitialized')) {
      container.stickystackScrollable().off('scroll.stickystack');
      container.data('stickystackObj').detached = true;
      stacks = stacks.filter(function(stack) { return !stack.detached; });
      container.removeData(['stickystackObj', 'stickystackInitialized']);
    }
  };



  // $.fn.stickystackFindContainer
  // -----------------------------
  // this function searches the element's ancestors for the nearest element with a scrollbar.
  $.fn.stickystackFindContainer = function() {
    var t = this.stickystackCommonAncestor();
    while(!t.is('body')) {
      var o = t.css('overflow');
      if(o == 'auto' || o == 'scroll' && t.get(0).scrollHeight > t.height()) { return t; }
      t = t.parent();
    }
    return t;
  };



  // $.fn.stickystackCommonAncestor
  // ------------------------------
  // this function finds the closest element which is a parent of all selected elements.
  // **disclaimer: this function is borrowed without explicit permission from <http://stackoverflow.com/a/3217279>**
  $.fn.stickystackCommonAncestor = function() {
    if(this.length == 0) return this;
    var parents = [];
    var minlen = Infinity;
    this.each(function() {
      var curparents = $(this).parents();
      parents.push(curparents);
      minlen = Math.min(minlen, curparents.length);
    });
    for (var i in parents) {
      parents[i] = parents[i].slice(parents[i].length - minlen);
    }
    for (var i = 0; i < parents[0].length; i++) {
      var equal = true;
      for (var j in parents) {
        if (parents[j][i] != parents[0][i]) {
          equal = false;
          break;
        }
      }
      if (equal) return $(parents[0][i]);
    }
    return $([]);
  };



  // $.fn.stickystackScrollable
  // --------------------------
  // this 2-line function simply makes sure the selected element is one that can trigger a 'scroll' event.
  // it only exists to handle the special case in which the container is the body tag, in which case
  // the 'scroll' event is really coming from the window.
  // In other cases, the scrollable and the container are the same element.
  $.fn.stickystackScrollable = function() {
    if(this.is("body")) return $(window);
    return this;
  };



  // nerf the console functions so they work if present, but don't break things if absent.
  function log() { if(console.log) console.log.apply(console, arguments); }
  function warn() { if(console.warn) console.warn.apply(console, arguments); }

})( jQuery );

// that's it!  you read all the way to the bottom!  aren't you having an exciting day.