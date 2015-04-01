/*Start by setting up the canvas */
var margin = {t:0,r:200,b:0,l:200};
var width = $('.canvas').width() - margin.r - margin.l,
    height = $('.canvas').height() - margin.t - margin.b;

var canvas = d3.select('.canvas')
    .append('svg')
    .attr('width',width+margin.r+margin.l)
    .attr('height',height + margin.t + margin.b)
    .append('g')
    .attr('class','canvas')
    .attr('transform','translate('+margin.l+','+margin.t+')');

//map
var projection = d3.geo.conicConformal()
    .rotate([0,0])
    .center([-71.0636,42.3581])
    .scale(240000)
    .translate([width/2,height/2])
    .precision(.1)

var path = d3.geo.path()
    .projection(projection);

//City-wide data numbers
var cityTripsByMode = d3.map(),
    cityTripTotal = 0,
    neighborhoodData = d3.map();

var currentMode = "Other";
var hoods; //DOM elements for neighborhoods
var tooltip = d3.select('.custom-tooltip');
var offsetX = 300,
    offsetY = -30;

//Scales
var scales = {};
scales.color1 = d3.scale.linear().domain([0,.6]).range(["#fff","#a1bdc3"]);
scales.color2 = d3.scale.linear().domain([-1,0,1]).range(['#03afeb','white','#ef4924']);

var format = d3.format(".1%");

/* Acquire and parse data */
queue()
    .defer(d3.csv,'data/hood_mode.csv',parse)
    .defer(d3.json,'data/boston.geojson')
    .await(dataLoaded);

function dataLoaded(err,data,geo){

    d3.select('.control')
        .selectAll('.btn')
        .data(data[0].modes.keys())
        .enter()
        .append('button')
        .attr('type','button')
        .attr('class','btn btn-default')
        .on('click',changeMode)
        .html(function(d){  return d; });


    hoods = canvas
        //.append('g')
        //.attr('class','boston')
        //.attr('transform','rotate(-30)')
        .selectAll('.hood')
        .data(geo.features)
        .enter()
        .append('path')
        .attr('class','hood')
        .attr('d',path)
        .style('fill',function(d){
            var data = neighborhoodData.get(d.properties.NID);

            if(!data){
                console.log("error",d.properties.NID);
                return;
            }

            var hoodModeShare = (data.modes.get(currentMode)/data.tripTotal),
                cityModeShare = cityTripsByMode.get(currentMode)/cityTripTotal;

            return scales.color2((hoodModeShare-cityModeShare)/cityModeShare);
        })
        .on('click',onClick);

    function onClick(d,i){
        var xy = (path.centroid(d.geometry));
        var name = d.properties.Name;
        var data = neighborhoodData.get(d.properties.NID);

        var msg = "<span class='name'>"+name+"</span> \n " + "<span class='data'>" 
            + format(data.modes.get(currentMode)/data.tripTotal) + "</span> \n "
            + "of trips take place by " + currentMode;

        tooltip.html(msg)
            .transition()
            .style('top',(xy[1]+offsetY)+'px')
            .style('left',(xy[0]+offsetX)+'px')
            .style('opacity',1);


    }
}

function changeMode(d,i){
    currentMode = d;
    console.log(currentMode);

    tooltip
        .transition()
        .style('opacity',0);

    redraw(currentMode);
}

function redraw(mode){
    hoods
        .transition()
        .style('fill',function(d){
            var data = neighborhoodData.get(d.properties.NID);

            if(!data){
                console.log("error",d.properties.NID);
                return;
            }

            var hoodModeShare = (data.modes.get(mode)/data.tripTotal),
                cityModeShare = cityTripsByMode.get(mode)/cityTripTotal;

            return scales.color2((hoodModeShare-cityModeShare)/cityModeShare);
        });
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

