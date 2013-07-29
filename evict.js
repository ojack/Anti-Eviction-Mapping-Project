
//var CartoDB = Backbone.CartoDB({ user: 'viz2' });
var CartoDB = Backbone.CartoDB({ user: 'ojack' });

var EarthQuake = CartoDB.CartoDBModel.extend({

  //ANIMATION_TIME: 3600*4*1000,
  ANIMATION_TIME: 2,

  getPos: function() {
   // alert(this.get('id'));
    if(this.get('position')==null){
      return new MM.Location(-33, 45);
    }
   var coords = this.get('position').coordinates;

    return new MM.Location(coords[1], coords[0]);
   // return new MM.Location(-33, 45);
  },

  isActive: function(t) {
     // var dt = t - this.time.getTime();
     var dt = t - this.time;
      return dt > 0 && dt < this.ANIMATION_TIME;
  },

  scaleAt: function(t) {
      //var dt = t - this.time.getTime();
       var dt = t - this.time;
      var interpol_time = this.ANIMATION_TIME;
      if(dt > 0 && dt < interpol_time) {
          var tt = this.scale*dt/interpol_time;
          var r = 1 + 20* Math.sqrt(tt);
          return r;
      }
      return 0;
  },

  opacity: function(t) {
    //  var dt = t - this.time.getTime();
    var dt = t - this.time;
      var interpol_time = this.ANIMATION_TIME*1.2;
      if(dt > 0 && dt < interpol_time) {
          var a= (1 - dt/interpol_time);
          return Math.max(0, a*a)*0.3;
      }
      return 0.0;
  }

});

var EarthQuakes = CartoDB.CartoDBCollection.extend({

  initialize: function(vehicle) {
    _.bindAll(this, 'transform');
    this.bind('reset', this.transform);
  },

  // transform the data and prepare some needs interpolations
  transform: function() {
    this.each(function(m) {

    //  m.time = new Date(m.get('timestamp'));
   // m.time = m.get('timestamp');
     //alert(m.get('timestamp') + m.time) ;
    });

    this.each(function(m) {
      //m.scale = parseFloat(m.get('magnitude'));
      m.scale = 4;
    });
  },

  getActiveEarthquakes: function(t) {
      var active = [];
      this.each(function(m) {
          if(m.isActive(t)) {
              active.push({ 'id': m.id , 'data': m });
          }
      });
      return active;
  },



  model: EarthQuake, 
  //table: 'earthquaked3', //public table
  table: 'condo_lottery',
  columns: {
      //'timestamp': 'date_utc',
      'timestamp': 'year',
      'position': 'the_geom',
      //'magnitude': 'magnitude',
      'id': 'cartodb_id'
  },
 // order: 'date_utc'
  order: 'year'

});


/*
 * animated overlay
 */
function Overlay(map, earthquakes) {

    this.earthquakes = earthquakes;
    //this.time = earthquakes.first().time.getTime();
    this.time = earthquakes.first().time;

    this.div = document.createElement('div');
    this.div.style.position = 'absolute';
    this.div.style.width =  map.dimensions.x + "px";
    this.div.style.height = map.dimensions.y + "px";
    map.parent.appendChild(this.div);
    this.svg = d3.select(this.div).append("svg:svg")
           .attr("width",  map.dimensions.x)
           .attr("height", map.dimensions.y);

    var self = this;
    var callback = function(m, a) { 
      return self.draw(m); 
    };
    map.addCallback('drawn', callback);
    this.draw(map);

}

Overlay.prototype = {
  draw: function(map) {
    var self = this;
    var node = this.svg.selectAll("g")
          .data(this.earthquakes.getActiveEarthquakes(this.time), function(d) { return d.id; })
            .attr('transform', function(val) {
                  var eq = val.data;
                  var p = eq.getPos(self.time);
                  p = map.coordinatePoint(map.locationCoordinate(p));
                  return "translate(" + p.x + "," + p.y +")";
             })
          .enter()
            .append('g')
            .attr('transform', function(val) {
                  var eq = val.data;
                  var p = eq.getPos(self.time);
                  p = map.coordinatePoint(map.locationCoordinate(p));
                  return "translate(" + p.x + "," + p.y +")";
          });
    node.append("circle")
      .attr('style', "stroke: #FFF; fill: #F00; fill-opacity: 0.3");

    this.svg.selectAll('g').selectAll('circle')
      .attr("r", function(b) {
        return b.data.scaleAt(self.time);
      })
      .attr('style', function(b) {
        var o = b.data.opacity(self.time);
        return "stroke: #FFF; fill: #F00; fill-opacity: " + o + "; stroke-opacity: " + o;
      });
  }
}


function initMap() {
    var map;


    // create map
    var src = document.getElementById('src');
    template = 'https://maps.nlp.nokia.com/maptiler/v2/maptile/newest/normal.day/{Z}/{X}/{Y}/256/png8?lg=eng&token=61YWYROufLu_f8ylE0vn0Q&app_id=qIWDkliFCtLntLma2e6O';
    var subdomains = [ '', 'a.', 'b.', 'c.' ];
    var provider = new MM.TemplatedLayer(template, subdomains);

    map = new MM.Map(document.getElementById('map'), provider);

    var earthquakes = new EarthQuakes();
    var setup_layer = function() {
      var f = new Overlay(map, earthquakes);
      setInterval(function() {
        //f.time += 300000; 
        f.time += 0.02; 
        f.draw(map);
      //  document.getElementById('date').innerHTML = new Date(f.time).toString().replace(/GMT.*/g,'');
      document.getElementById('date').innerHTML = f.time;
      },20);
    };

    // fetch all data
    earthquakes.bind('reset', setup_layer);
    earthquakes.fetch();
    if(!location.hash) {
        map.setCenterZoom(new MM.Location(37.75, -122.45), 12);
    }
    var hash = new MM.Hash(map);


}
