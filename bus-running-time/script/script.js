/*Start by setting up the canvas */
var margin = {t:100,r:200,b:100,l:200};
var width = $('.canvas').width() - margin.r - margin.l,
    height = $('.canvas').height() - margin.t - margin.b;

var canvas = d3.select('.canvas')
    .append('svg')
    .attr('width',width+margin.r+margin.l)
    .attr('height',height + margin.t + margin.b)
    .append('g')
    .attr('class','canvas')
    .attr('transform','translate('+margin.l+','+margin.t+')');

//scales
var scaleX = d3.scale.linear().domain([6,23]).range([0,width]),
    scaleY = d3.scale.linear().domain([.5,-.5]).range([height,0])

//Metadata global
d3.csv('data/bus-running-time-v-2.csv',parse,function(err,data){
    console.log(data);

    var line = d3.svg.line()
        .x(function(d){return scaleX(d.t)})
        .y(function(d){return scaleY(d.v)})
        .defined(function(d){return d.v})
        .interpolate('cardinal');

    canvas.selectAll('.route')
        .data(data)
        .enter()
      .append('path')
        .attr('d',function(d){
            return line(d.times);
        })
        .attr('class','route')
        .style('fill','none')
        .style('stroke',function(d){
            if(d.type=='K'){return 'red';}
            else if(d.route == "77" || d.route == "22"){ return 'black';}
            else{ return "blue";}
        })
        .style('stroke-opacity',function(d){
            if(d.route == 'AVG' || d.route == "77" || d.route == "22") return 1;
            else return .1;
        })
        .style('stroke-width','2px')
        .on('click',function(d){
            console.log(d.route);
        })

    //axis
    var axisX = d3.svg.axis()
        .orient('bottom')
        .tickSize(40,10)
        .ticks(24)
        .scale(scaleX);
    canvas.append('g')
        .attr('class','axis x')
        .attr('transform','translate('+0+','+height/2+')')
        .call(axisX);
    var axisY = d3.svg.axis()
        .orient('left')
        .tickSize(-width,0)
        .scale(scaleY);
    canvas.append('g')
        .attr('class','axis y')
        .call(axisY);


});

function parse(d){
    var times = [];

    var route = d.Route,
        type = d['KEY/NONKEY'];
    delete d.Route;
    delete d['KEY/NONKEY'];
    delete d['Average of scheduledrunning'];
    delete d['MIN'];
    delete d['#ofSamples'];

    for(key in d){
        times.push({
            t:+key,
            v:+d[key]?+d[key]:undefined
        })
    }
    return {
        route:route,
        type:type,
        times:times
    }
}