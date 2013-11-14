jquery.touchtapevents
=====================

Jquery Plugin - Touch / Tap Events

This is a jquery touch and tap events library for mobile and web applications. This library helps eliminate the 300ms delay
in touch events on mobile devices or desktops with touch screen capabilities.

##Basic usage:
```html
  $(document).on('tap', 'a', function(event) {
    alert('I was tapped!');
  });
  
  $("document").on('taphold', 'a', function(event) {
    alert('I am being held down!');
  });
  
  $("document").on('swiperight', 'div', function(event) {
    alert('I was swiped to the right!');
  });
  
  $("document").on('swipeleft', 'div', function(event) {
    alert('I was swiped to the left!');
  });
  
  $("#home").tap(function(event) {
    alert('I was tapped!');
  });
  
  $("#home").taphold(function(event) {
    alert('I am being held down!');
  });
  
  $("div").swipeleft(function(event) {
    alert('I was swiped to the left!');
  });
```
