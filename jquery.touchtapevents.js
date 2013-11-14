var supportTouch = ('ontouchstart' in document.documentElement),
    scrollEvent = "touchmove scroll",
    touchStartEvent = supportTouch ? "touchstart" : "mousedown",
    touchStopEvent = supportTouch ? "touchend" : "mouseup",
    touchMoveEvent = supportTouch ? "touchmove" : "mousemove",
    touchCancelEvent = supportTouch ? "touchcancel" : "mousecancel";

(function($, window, undefined) {
    var $document = $(document);

    // add new event shortcuts
    $.each(("touchstart touchmove touchend tap taphold swipe swipeleft swiperight scrollstart scrollstop").split(" "),
        function(i, name) {
            $.fn[name] = function(fn) {
                return fn ? this.bind(name, fn) : this.trigger(name);
            };
        });

    $.event.special.scrollstart = {
        enabled: true,

        setup: function() {
            var thisObject = this,
                $this = $(thisObject),
                scrolling,
                timer;

            function trigger(event, state) {
                scrolling = state;
                triggerCustomEvent(thisObject, scrolling ? "scrollstart" : "scrollstop", event);
            }

            // iPhone triggers scroll after a small delay; use touchmove instead
            $this.bind(scrollEvent, function(event) {
                if (!$.event.special.scrollstart.enabled) {
                    return;
                }

                if (!scrolling) {
                    trigger(event, true);
                }

                clearTimeout(timer);
                timer = setTimeout(function() {
                    trigger(event, false);
                }, 50);
            });
        }
    };

    $.event.special.tap = {
        tapholdTappingThreshold: 200,
        tapholdThreshold: 1000,

        setup: function() {
            var thisObject = this,
                $this = $(thisObject);

            $this.bind(touchStartEvent, function(event) {
                if (event.which && event.which !== 1) {
                    return false;
                }

                var origTarget = event.target,
                    origEvent = event.originalEvent,
                    holdTimer = null,
                    tapTimer = null,
                    targetIsDocument = ($this.context == document),
                    $target = (targetIsDocument) ? $(origTarget) : $this;

                function clearTimers() {
                    clearTimeout(holdTimer);
                    clearTimeout(tapTimer);
                }

                function clearTappingClasses() {
                    $('.ui-tap').removeClass('ui-tap');
                    $('.ui-taphold').removeClass('ui-taphold');
                }

                function clearTapHandlers() {
                    clearTimers();
                    $this.unbind(touchStopEvent, tapHandler);
                    $document.unbind(touchMoveEvent, moveHandler);
                    $document.unbind(touchCancelEvent, cancelHandler);
                }

                function tapHandler(event) {
                    clearTapHandlers();
                    clearTappingClasses();
                    // ONLY trigger a 'tap' event if the start target is the same as the stop target.
                    if (origTarget === event.target) {
                        triggerCustomEvent(thisObject, "tap", event);
                    }
                }

                function cancelHandler(event) {
                    clearTapHandlers();
                    clearTappingClasses();
                }

                function moveHandler(event) {
                    clearTapHandlers();
                    clearTappingClasses();
                }

                $this.bind(touchStopEvent, tapHandler);
                $document.bind(touchMoveEvent, moveHandler);
                $document.bind(touchCancelEvent, cancelHandler);

                var parentEl = null;

                // The tap and taphold classes are applied to element parents up to the first DIV element
                $target.addClass('ui-tap');
                if (!$target.is("div")) {
                    parentEl = $target.parent();
                }

                if (parentEl != null) {
                    var divFound = false;
                    while (!divFound) {
                        parentEl.addClass('ui-tap');
                        if (!(divFound = parentEl.is("div"))) {
                            parentEl = parentEl.parent();
                        }
                    }
                }

                tapTimer = setTimeout(function() {
                    parentEl = null;
                    $target.addClass('ui-taphold');
                    if (!$target.is("div")) {
                        parentEl = $(origTarget).parent();
                    }

                    if (parentEl != null) {
                        var divFound = false;
                        while (!divFound) {
                            parentEl.addClass('ui-taphold');
                            if (!(divFound = parentEl.is("div"))) {
                                parentEl = parentEl.parent();
                            }
                        }
                    }
                }, $.event.special.tap.tapholdTappingThreshold);

                holdTimer = setTimeout(function() {
                    var tapHoldEvent = $.Event("taphold", {
                        target: origTarget
                    });
                    triggerCustomEvent(thisObject, "taphold", tapHoldEvent);
                    if (tapHoldEvent.result !== undefined && tapHoldEvent.result == true) {
                        //if the taphold event returns true, that indicates we do not want to handle a tap event on event end
                        //console.log('taphold returned true, aborting tap handlers')
                        clearTapHandlers();
                        clearTappingClasses();
                    }
                }, $.event.special.tap.tapholdThreshold);
            });
        }
    };

    // also handles swipeleft, swiperight
    $.event.special.swipe = {
        scrollSupressionThreshold: 100, // More than this horizontal displacement, and we will suppress scrolling.
        durationThreshold: 1000, // More time than this, and it isn't a swipe.
        horizontalDistanceThreshold: 30, // Swipe horizontal displacement must be more than this.
        verticalDistanceThreshold: 75, // Swipe vertical displacement must be less than this.
        velocityThreshold: 20, // Minimum velocity to release swipe before touchend

        start: function(event) {
            var data = event.originalEvent.touches ?
                event.originalEvent.touches[0] : event;
            return {
                time: (new Date()).getTime(),
                coords: [data.pageX, data.pageY],
                originEvent: event,
                origin: $(event.target)
            };
        },

        stop: function(event) {
            var data = event.originalEvent.touches ?
                event.originalEvent.touches[0] : event;
            return {
                time: (new Date()).getTime(),
                coords: [data.pageX, data.pageY]
            };
        },

        handleSwipe: function(start, stop) {
            if ((stop.time - start.time < $.event.special.swipe.durationThreshold || $(start.originEvent.currentTarget).data('drag')) &&
                Math.abs(start.coords[0] - stop.coords[0]) > $.event.special.swipe.horizontalDistanceThreshold &&
                Math.abs(start.coords[1] - stop.coords[1]) < $.event.special.swipe.verticalDistanceThreshold) {
                start.origin.trigger("swipe")
                    .trigger(start.coords[0] > stop.coords[0] ? "swipeleft" : "swiperight");
            }
        },

        setup: function() {
            var thisObject = this,
                $this = $(thisObject);

            $this.bind(touchStartEvent, function(event) {
                var start = $.event.special.swipe.start(event),
                    lastPosX,
                    stop, pos, origLeft, targetIsDocument = ($this.context == document),
                    eventTarget;

                if (targetIsDocument) {
                    return true;
                } else {
                    eventTarget = $this;
                }

                pos = eventTarget.position();

                origLeft = pos.left;

                function dragHandler(start, stop, direction, max) {
                    var dist = start.coords[0] - stop.coords[0],
                        dragThreshold = $.event.special.swipe.horizontalDistanceThreshold * 1.25;
                    var openOffset = 0;

                    dist = (dist / -1);

                    if (eventTarget.hasClass('ui-drag-open')) {
                        if (direction == "right") {
                            direction = "left";
                        } else {
                            direction = "right";
                        }
                        if (max !== undefined) {
                            openOffset = max;
                        }
                    }

                    if (direction == "right") {
                        dist = dist - dragThreshold;

                        if (max !== undefined) {
                            if (dist > max) {
                                dist = max;
                            }
                        }

                        if (dist <= 0) {
                            dist = 0;
                        }

                        if (openOffset != 0) {
                            dist -= openOffset;
                        }
                    } else {
                        dist = dist + dragThreshold;

                        if (max !== undefined) {
                            if (dist < (max / -1)) {
                                dist = (max / -1);
                            }
                        }

                        if (dist >= 0) {
                            dist = 0;
                        }

                        if (openOffset != 0) {
                            dist += openOffset;
                        }
                    }

                    if (!eventTarget.hasClass('dragging')) {
                        eventTarget.addClass('dragging');
                    }

                    var transformType = eventTarget.data('dragtype');

                    if (transformType !== undefined && transformType != 'translate3d') {
                        eventTarget.css('left', (origLeft + dist) + 'px');
                    } else {
                        eventTarget.css('-webkit-transform', "translate3d(" + dist + "px,0,0)");
                    }
                }

                function moveHandler(event) {
                    if (!start) {
                        return;
                    }

                    stop = $.event.special.swipe.stop(event);

                    // prevent vertical scrolling
                    if (Math.abs(start.coords[0] - stop.coords[0]) > $.event.special.swipe.scrollSupressionThreshold) {
                        event.preventDefault();
                    }

                    if (Navigation.allowDrag && eventTarget.data('drag') !== undefined && $(event.target).parents('.prevent-drag-bubble').length == 0) {
                        dragHandler(start, stop, eventTarget.data('drag'), eventTarget.data('maxdrag'));
                    } else {
                        if (stop) {
                            // normal swipes will listen for velocity
                            var velocity = Math.abs(stop.coords[0] - lastPosX);

                            //console.log(velocity);
                            if (velocity > 0 && velocity > $.event.special.swipe.velocityThreshold) {
                                $this.unbind(touchStopEvent, stopHandler);
                                stopHandler();
                                return;
                            }

                            lastPosX = stop.coords[0];
                        }
                    }
                }

                function stopHandler(event) {
                    $this.unbind(touchMoveEvent, moveHandler);

                    if (eventTarget.hasClass('dragging')) {
                        eventTarget.removeClass('dragging');
                        eventTarget.removeAttr('style');
                    }

                    if (start && stop) {
                        $.event.special.swipe.handleSwipe(start, stop);
                    }

                    start = stop = undefined;
                }

                $this.bind(touchMoveEvent, moveHandler)
                    .one(touchStopEvent, stopHandler);
            });
        }
    };
    $.each({
        scrollstop: "scrollstart",
        taphold: "tap",
        swipeleft: "swipe",
        swiperight: "swipe"
    }, function(event, sourceEvent) {
        $.event.special[event] = {
            setup: function() {
                $(this).bind(sourceEvent, $.noop);
            }
        };
    });
})(jQuery, this);

function triggerCustomEvent(obj, eventType, event) {
    var originalType = event.type;
    event.type = eventType;
    $.event.dispatch.call(obj, event);
    event.type = originalType;
}