

/*Start by setting up the canvas */
var margin = {t:0,r:200,b:0,l:200};
var width = $('.canvas').width() - margin.r - margin.l,
    height = $('.canvas').height() - margin.t - margin.b;

var padding = 3;

var canvas = d3.select('.canvas')
    .append('svg')
    .attr('width',width+margin.r+margin.l)
    .attr('height',height + margin.t + margin.b)
    .append('g')
    .attr('class','canvas')
    .attr('transform','translate('+margin.l+','+margin.t+')');

//map
var projection = d3.geo.conicConformal()
    .scale(300000)
    .translate([width/2,height/2])
    .center([-71.0636,42.3581])
    .precision(.1);

var path = d3.geo.path()
    .projection(projection);

//City-wide data numbers
var cityTripsByMode = d3.map(),
    cityTripTotal = 0,
    neighborhoodData = d3.map();

//Scales
var scales = {};
scales.color1 = d3.scale.linear().domain([0,.6]).range(["#fff","#a1bdc3"]);
scales.color2 = d3.scale.linear().domain([-1,0,1]).range(['#03afeb','white','#ef4924']);
scales.color3 = d3.scale.ordinal().domain(['Drive Alone','Carpool','Public Transit','Walk','Other']).range(['red','orange','blue','green','black']);

scales.r = d3.scale.sqrt().domain([2000,30000]).range([35,120]);

var force = d3.layout.force()
    .charge(0)
    .gravity(0)
    .size([width,height]);

/* Acquire and parse data */
queue()
    .defer(d3.csv,'data/hood_mode.csv',parse)
    .defer(d3.json,'data/boston_centroids.geojson')
    .await(dataLoaded);

function dataLoaded(err,data,geo){

    var nodes = geo.features
        .map(function(d){
            var xy = projection(d.geometry.coordinates),
                value = neighborhoodData.get(d.properties.NID)?neighborhoodData.get(d.properties.NID):undefined;

            return{
                x:xy[0],
                y:xy[1],
                x0:xy[0],
                y0:xy[1],
                value:value,
                id:d.properties.NID,
                r:value?scales.r(value.modes.get('Drive Alone')):0 //this is necessary for collision detection
            }

        });

    console.log(nodes);

    //draw scales
    canvas.selectAll('legend')
        .data([5000,10000,15000])
        .enter()
        .append('circle')
        .attr('class','legend')
        .attr('r',function(d){
            return scales.r(d);
        })
        .attr('cy',100)
        .style('fill','none')
        .style('stroke','black')
        .style('stroke-width','1px');


    var node = canvas.selectAll('.hood')
        .data(nodes)
        .enter()
        .append('g')
        .attr('class','hood')
        .attr('transform',function(d){
            return "translate("+d.x+','+d.y+')';
        });

    /*node.append('circle')
        .attr('r',function(d){
            
            if(d.r < 0){
                return 0;
            }
            return d.r;
        })
        .style('fill',function(d){
            if(!d.value){   return 0; }
            return scales.color1(d.value.modes.get('Drive Alone')/d.value.tripTotal)
            return 
        });*/
    node.append('text')
        .text(function(d){
            return d.id;
        })
        .attr('text-anchor','middle');

    //Generate a small pie chart for each neighborhood
    //First a pie layout generator
    var pie = d3.layout.pie()
        .value(function(d){
            return d.value;
        })
        .sort(null); //no sort
    var arc = d3.svg.arc();

    node.each(function(d){
        if(!d.value) return;

        arc
            .outerRadius(0)
            .innerRadius(d.r<22?(d.r/2):(d.r-20));

        d3.select(this)
        .selectAll('.pie')
        .data( pie(d.value.modes.entries()) )
        .enter()
        .append('path')
        .attr('class','pie')
        .attr('d',arc)
        .style('fill',function(f){
            return scales.color3(f.data.key);
        })
    });


    force
        .nodes(nodes)
        .on('tick',tick)
        .start();

    function tick(e){
        node
            .each(gravity(e.alpha*.1))
            .each(collide(.5))
            .attr('transform',function(d){
                return "translate("+d.x+','+d.y+')';
            });
    }

    function gravity(k){
    return function(d) {
      d.x += (d.x0 - d.x) * k;
      d.y += (d.y0 - d.y) * k;
    };

    }

    function collide(k){
    var q = d3.geom.quadtree(nodes);
    return function(node) {
      var nr = node.r + padding,
          nx1 = node.x - nr,
          nx2 = node.x + nr,
          ny1 = node.y - nr,
          ny2 = node.y + nr;
      q.visit(function(quad, x1, y1, x2, y2) {
        if (quad.point && (quad.point !== node)) {
          var x = node.x - quad.point.x,
              y = node.y - quad.point.y,
              l = x * x + y * y,
              r = nr + quad.point.r;
          if (l < r * r) {
            l = ((l = Math.sqrt(l)) - r) / l * k;
            node.x -= x *= l;
            node.y -= y *= l;
            quad.point.x += x;
            quad.point.y += y;
          }
        }
        return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
      });
    };
    }
        


}

function parse(d){
    var newRow = {};
    newRow.id = d.NID;
    newRow.name = d.Neighborhood;
    delete d.NID;
    delete d.Neighborhood;
    newRow.modes = d3.map();
    newRow.tripTotal = 0;

    //Go through each mode per hood
    for(var m in d){
        newRow.modes.set(m,+d[m]);

        newRow.tripTotal += +d[m];

        if(cityTripsByMode.get(m)==undefined){
            cityTripsByMode.set(m,0);
        }
        else{
            var newModeTotal = cityTripsByMode.get(m) + (+d[m]);
            cityTripsByMode.set(m,newModeTotal);
        }

        delete d[m];
    }

    cityTripTotal += newRow.tripTotal;

    neighborhoodData.set(newRow.id,newRow);

    return newRow;
}

