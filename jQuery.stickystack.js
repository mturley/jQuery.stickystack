// WORK IN PROGRESS, PLEASE DO NOT USE.

// jQuery.stickystack
// make the active element in a selection stick to the edge of the screen.
// conditionally sets and unsets fixed position on elements as you scroll.

// annotated source is documented with docco: http://jashkenas.github.com/docco/

(function( $, window, document, console, undefined ) {

  var stacks = [];
  var nothing = $([]);

  // $.fn.stickystack: treats the selection as a vertical stack of elements, and makes them sticky relative to the mode.
  // the container is defined as the nearest common ancestor which has a scrollbar.
  // the mode can be 'top', 'bottom', or 'always', and defaults to 'top' if no mode is specified.
  // in 'top' mode, element(s) will:
  //    be fixed at the top of the container when the user scrolls past them (one fixed element at a time).
  //    be allowed to go out of view above the container only when the next element in the stack is scrolled to.
  //    be allowed to go out of view below the container as normal.
  // in 'bottom' mode, element(s) will:
  //    be fixed at the bottom of the container until the user scrolls past them (one fixed element at a time).
  //    be allowed to go out of view below the container only when the previous element in the stack is scrolled to.
  //    be allowed to go out of view above the container as normal.
  // in 'always' mode, element(s) will:
  //    be fixed at the top of the container if they normally would be out of view above the container.
  //    be fixed at the bottom of the container if they normally would be out of view below the container.
  //    not be allowed to go out of view at all.
  // this plugin only affects elements which would be out of view without the plugin.
  // elements whose static position is within the viewable area are left at that static position.
  // all positions and states are updated dynamically on the container's scroll event.
  $.fn.stickystack = function(mode) {
    var container, stack;

    if(mode === undefined) mode = 'top'; // the mode defaults to 'top'.

    if(this.hasClass('stickystack-item')) {
      warn("jQuery.stickystack: that stack is already sticky!");
      return null;
    }

    container = this.stickystackFindContainer();
    stack = {                  // each stack object knows:
      'mode'      : mode,      //    what mode it was applied with
      'elements'  : this,      //    what elements it was applied to
      'container' : container  //    what container to listen to
    };
    stacks.push(stack);

    this.addClass('stickystack-item').each(function(index) {
      var t = $(this);
      t.data({
        // each element in the stack stores its original position so it can be reapplied later.
        'stickystackOriginalStyle' : {
          'position' : t.css('position'),
          'top'      : t.css('top')
        },
        'stickystackContainer' : container,
        'stickystackPrevItem' : (index != 0 ? $(stack.elements[index-1]) : nothing),
        'stickystackNextItem' : (index != stack.elements.length-1 ? $(stack.elements[index+1]) : nothing)
      });
      var placeholder = $("<div />").addClass('stickystack-placeholder').css({
        'width'  : t.outerWidth(),
        'height' : '0'
      }).insertBefore(t);
      placeholder.data({
        'fullHeight'     : t.outerHeight(),
        'placeholderFor' : t
      });
      $(this).data('stickystackPlaceholder', placeholder);
    });

    if(!container.data('stickystackInitialized')) {
      container.on('scroll.stickystack', function() {
        $(this).stickystackUpdate();
      });
      container.data({
        'stickystackInitialized' : true,
        'stickystackObj'         : stack   // each container stores a reference to its stack object for easy access.
      });
      container.stickystackUpdate();
    }
  };

  // $.fn.stickystackUpdate: to be called with the selection as an initialized container.  updates item positions.
  $.fn.stickystackUpdate = function() {
    if(!$(this).data('stickystackInitialized')) {
      warn("jQuery.stickystack: can't update that, it's not an initialized stickystack container!");
      return null;
    }
    log("TODO: check for collisions and adjust positions!"); // TODO!
  };

  // $.fn.stickystackUnstick: reverses the effects of the plugin for the selected elements.
  $.fn.stickystackUnstick = function() {
    var container = this.first().data('stickystackContainer');
    container.find('stickystack-placeholder').remove();
    container.find('stickystack-item').each(function() {
      $(this).removeClass('stickystack-item');
      var orig = $(this).data('stickystackOriginalStyle'); // reapplies the stored original position for each element.
      for(var prop in orig) { $(this).css(prop, orig[prop]); }
      $(this).removeData(['stickystackOriginalStyle', 'stickystackContainer']);
    });
    if(container.data('stickystackInitialized')) {
      container.off('scroll.stickystack');
      container.data('stickystackObj').detached = true;
      stacks = stacks.filter(function(stack) { return !stack.detached; });
      container.removeData(['stickystackObj', 'stickystackInitialized']);
    }
  };

  // $.fn.stickystackFindContainer: search this element's ancestors for the nearest element with a scrollbar.
  $.fn.stickystackFindContainer = function() {
    var t = this.stickystackCommonAncestor();
    while(!t.is('body')) {
      var o = t.css('overflow');
      if(o == 'auto' || o == 'scroll' && t.get(0).scrollHeight > t.height()) { return t; }
      t = t.parent();
    }
    return $(window);
  };

  // $.fn.stickystackCommonAncestor: find the closest element which is a parent of all selected elements.
  // this function is borrowed from http://stackoverflow.com/a/3217279 (very slightly changed)
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
    // Iterate until equality is found
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
    return nothing;
  };

  // nerf the console functions so they work if present, but don't break things if absent.
  function log() { if(console.log) console.log.apply(console, arguments); }
  function warn() { if(console.warn) console.warn.apply(console, arguments); }
  function error() { if(console.error) console.error.apply(console, arguments); }

})( jQuery, window, document, console );