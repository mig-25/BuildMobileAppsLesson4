Modernizr.addTest('standalone', function() {
  return window.navigator.standalone;
});

if("ontouchend" in document) {
  touchEndEvent = "touchend";
} else {
  touchEndEvent = "mouseup";
}

function displayLocations(groups) {
  $("#spots-list").children().remove();
  for(var i = 0; i < groups.length; i++) {
    if(groups[i].type === 'nearby') {
      $('#tmpl-4sq')
        .tmpl(groups[i].items)
        .appendTo('#spots-list');
    }
  }
}

function displayPhotos(photos) {
  $('#tmpl-gallery')
    .tmpl(photos)
    .appendTo('#gallery');

  $('#gallery .gallery-item:first-child').addClass('current');
}

function fetchLocation(lat, lng) {
  var url = "https://api.foursquare.com/v2/venues/search?", 
  location = "&ll=" + lat + "," + lng, 
  secrets = "&client_id=LUOAE4CT1NYESLQF02IQ4DFNBSICP4ISQ3ZUXXFQDMMQEHAN&client_secret=2I2WF11JDE2GPDULFN5XVUZJN522RK2BHZJ03CCDSNYDSYRZ";

  $.ajax({
    url: url + location + secrets + "&callback=",
    type: 'GET',
    dataType: 'JSON',
    success: function(data) {
      displayLocations(data.response.groups);
    },
    error: function() {
      alert("Error fetching locations");
    }
  });
}

function fetchGeo() {
  navigator.geolocation.getCurrentPosition(function(pos) {
    var lat = pos.coords.latitude;
    var lng = pos.coords.longitude;

    fetchLocation(lat, lng);
  }, function(error) {
    var msg = "";
    switch(error.code) {
    case error.PERMISSION_DENIED:
      msg = "Oops! You have disallowed our app!";
      break;
    case error.POSITION_UNAVAILABLE:
      msg = "Sorry, we couldn't get your location.";
      break;
    case error.TIMEOUT:
      msg = "Sorry, fetch timeout expired.";
      break;
    }
    alert(msg);
  }, {
    maximumAge: 10000,
    timeout: 10000,
    enableHighAccuracy: true
  });
}

function fetchCelebrityPhotos(tag) {
  $('#gallery').children().remove();
  $.ajax({
    url: 'http://api.flickr.com/services/feeds/photos_public.gne?tags=' + tag + '&tagmode=any&format=json&jsoncallback=?',
    type: 'GET',
    dataType: 'JSON',
    success: function(data) {
      displayPhotos(data.items);
    }
  });
}

var visits = {
  history: [],
  add: function(page) {
    this.history.push(page);
  },
  hasBack: function() {
    return this.history.length > 1;
  },
  back: function() {
    if(!this.hasBack()) {
      return;
    }
    var curPage = this.history.pop();
    return this.history.pop();
  },
  clear: function() {
    history.go(-1 * this.history.length);
    this.history = [];
  }
};

$(document).ready(function() {
  fetchGeo();
  $('#tab-bar li').bind(touchEndEvent, function(e) {
    e.preventDefault();
    visits.clear();
    var nextPage = $(e.target.hash);
    changePage(nextPage, "fade");
    $("#tab-bar").attr("class", "page-" + e.target.hash.slice(6));
  });

  $('#spots-list li').live('click', function(e) {
    e.preventDefault();

    $.ajax({
      url: './data/stars.json',
      dataType: 'json',
      success: function(data) {
        $('#page-spot section').html('<ul id="spots-list" class="table-view table-action"></ul>');
        $('#tmpl-spots')
          .tmpl(data)
          .appendTo('#page-spot section ul');

        changePage('#page-spot', 'push');
      }
    });
  });

  $('#page-spot li').live('click', function(e) {
    e.preventDefault();
    fetchCelebrityPhotos($(this).find('h2').html().toLowerCase().replace(/\s/, ''));
    changePage('#page-gallery', 'push');
  });
  
  $('#stars-list li').live('click', function(e) {
    e.preventDefault();
    changePage('#page-star', 'push');
  });

  $(".back").live('click', function(e) {
    e.preventDefault();
    window.history.back();
  });

  window.addEventListener("popstate", function(e) { 
    e.preventDefault();
    var lastPage = visits.back();
    if(lastPage) {
      changePage(lastPage, 'push', true);
    }
  }, false);

  function transition(toPage, fromPage, type, reverse) {
    var fromPage = $(fromPage), 
    toPage = $(toPage),
    reverse = reverse ? " reverse" : "";
    
    if(!("WebKitTransitionEvent" in window)) {
      toPage.addClass("current");
      fromPage.removeClass("current");
      return;
    }

    toPage
      .addClass("current " + type + " in" + reverse)
      .bind("webkitAnimationEnd", function() {
        fromPage.removeClass("current " + type + " out" + reverse);
        toPage
          .removeClass(type + " in" + reverse)
          .unbind("webkitAnimationEnd");
      });
    fromPage.addClass(type + " out" + reverse);
  }

  function changePage(page, type, reverse) {
    window.history.pushState({
      page: $(page).attr('id'),
      transition: type,
      reverse: !!reverse
    }, "", '#' + $(page).attr('id'));

    var fromPage = $('#pages > .current');
   
    page = $(page);
    if(page.hasClass("current") || page === fromPage) {
      return;
    }

    visits.add(page);
    transition(page, fromPage, type, reverse);
  }
  
  function slidePic(isLeft) {
    var photos = $("#gallery .gallery-item"),
    current = photos.siblings(".current"),
    next;

    if(isLeft) {
      next = current.next();
    } else {
      next = current.prev();
    }
    if(next.length === 0) {
      return;
    }

    transition(next, current, "push", !isLeft);
  }


  var xStart, gesturing = false;
  $("#gallery").bind({
    "touchstart mousedown": function(e) {
      e.preventDefault();
      var event = e.originalEvent,
      touch = event.targetTouches ? event.targetTouches[0] : e
      xStart = touch.pageX;
    },
    "touchend mouseup": function(e) {
      e.preventDefault();
      if(gesturing) {
        gesturing = false;
        return;
      }
      var event = e.originalEvent,
      touch = event.changedTouches ? event.changedTouches[0] : e,
      diffX = touch.pageX - xStart;

      if(Math.abs(diffX) > 30) {
        if(diffX > 0) { 
          slidePic(false);
        } else {
          slidePic(true);
        }
      }
    },
    "touchmove": function(e) {
      e.preventDefault();
    }
  });

  var rotation = 0, scale = 1;
  $('#gallery .gallery-item').live({
    "gesturechange": function(e) {
      gesturing = true;
      var gesture = e.originalEvent;
      var curScale = gesture.scale * scale; 
      var curRotation = (gesture.rotation + rotation) % 360;

      $(this).find('img').css(
        "webkitTransform", "scale(" + curScale + ")" + "rotate(" + curRotation + "deg)"
      );
    },
    
    "gestureend": function(e) {
      var gesture = e.originalEvent;
      scale *= gesture.scale; 
      rotation = (rotation + gesture.rotation) % 360;
    }
  });

  changePage($('#page-spots'), 'show');
});

$(window).bind("load orientationchange", 
  function() { 
    switch(window.orientation) {
    case 0: 
      $("#about").hide(); 
      $("#pages").show(); 
      break;
    case 90: 
    case -90:
      $("#about").show(); 
      $("#pages").hide(); 
      break;
  } 
});
