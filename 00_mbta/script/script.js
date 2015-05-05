/*Start by setting up the canvas */
var margin = {t:0,r:100,b:0,l:100};
var width = $('.canvas').width() - margin.r - margin.l,
    height = $('.canvas').height() - margin.t - margin.b;

var canvas = d3.select('.canvas')
    .append('svg')
    .attr('width',width+margin.r+margin.l)
    .attr('height',height + margin.t + margin.b)
    .append('g')
    .attr('class','canvas')
    .attr('transform','translate('+margin.l+','+margin.t+')');

//Metadata global
var currentTime = "8:00"; //Global variable keeps track of time
var metadata = {}; //Service capacity standards
var carCap = {
    "Orange":58,
    "Red":58,
    "Red-A":58,
    "Red-B":58,
    "Blue":42
}

//Size, padding and positions for the lines
var numLines = 4, //Orange, Red, Blue, Green
    padding = 20; //padding btw lines
var wPerLine = (width-padding*(numLines-1))/numLines; //defines the maximum possible width of the lines

var linePos = d3.map({
    "Orange":{
        x:0,y:0,
        w:wPerLine //tick width
    },
    "Red":{
        x:wPerLine+padding,y:0,
        w:wPerLine
    },
    "Red-A":{
        x:wPerLine*3/4+padding/4,y:0,
        w:(wPerLine-padding)/2
    },
    "Red-B":{
        x:wPerLine*5/4+padding,y:0,
        w:(wPerLine-padding)/2
    },
    "Blue":{
        x:(wPerLine+padding)*2,y:0,
        w:wPerLine
    },
    "Green":{
        x:(wPerLine+padding)*3,y:0,
        w:wPerLine
    }
});

var connectors = [
    {source:{x:wPerLine*3/2+padding,y:2.67},target:{x:wPerLine*5/4+padding/4,y:3.38},line:"Red"},
    {source:{x:wPerLine*3/2+padding,y:2.67},target:{x:wPerLine*7/4+padding,y:6.24},line:"Red"}
]

//Scales
var scaleY = d3.scale.linear().domain([-9,13]).range([0,height]),
    scaleXLeft = d3.scale.linear().domain([0,10000]).range([wPerLine/2,0]),
    scaleXRight = d3.scale.linear().domain([0,10000]).range([wPerLine/2,wPerLine]);

//Generate a time wheel for control
var dispatch = d3.dispatch("timeChange");
var arc = d3.svg.arc()
    .innerRadius(35)
    .outerRadius(60)
    .startAngle(function(d){
        return d/24*Math.PI*2;
    })
    .endAngle(function(d){
        return (d+1)/24*Math.PI*2;
    })
var timeWheel = canvas.append('g')
    .attr('class','time-wheel')
    .attr('transform','translate(60,80)');
timeWheel.append('text')
    .text(currentTime)
    .attr('text-anchor','middle')
    .attr('dy',10)
    .attr('class','important');
timeWheel
    .selectAll('.time-range')
    .data(d3.range(24))
    .enter()
    .append('path')
    .attr('class','time-range')
    .attr('d',arc)
    .on('click', onTimeChange)
function onTimeChange(d){
    currentTime = d+":00";

    timeWheel
        .selectAll('.time-range')
        .attr('class','time-range')
        .filter(function(t){return t===d;})
        .attr('class','time-range current');
    timeWheel.select('.important').text(currentTime);

    //emit event
    dispatch.timeChange(currentTime);
}


//TODO: junky animation
/*var i = 8;
setInterval(function(){
    onTimeChange(i);
    i++;
    if(i>23){ i = 0;}
},200);*/


//Add <g> element for each line
canvas.selectAll('.line')
    .data(["Orange","Red","Red-A","Red-B","Blue","Green"])
    .enter()
    .append('g')
    .attr('class',function(d){return "line "+d})
    .attr('transform',function(d){
        var pos = linePos.get(d);
        return 'translate('+ pos.x + ',' + pos.y + ')';
    })
    .each(function(d){
        var self = this,
            line = d.toLowerCase();

        queue()
            .defer(d3.csv, "data/"+line+"-dist.csv",parseDist)
            .defer(d3.csv, "data/"+line+"-metadata.csv",parseMeta(d))
            .defer(d3.csv, "data/"+line+"-volume-left.csv",parseVolume)
            .defer(d3.csv, "data/"+line+"-volume-right.csv",parseVolume)
            .await(function(err,dist,cap,left,right){
                draw(left,right,dist,self,d,cap);
            });
    });

//Draw connectors between branches
var diagonal = d3.svg.diagonal()
    .projection(function(d){ return [d.x, scaleY(d.y)]; })
canvas.selectAll('.connector')
    .data(connectors)
    .enter()
    .append('path')
    .attr('class',function(d){ return "connnector center-line above "+d.line; })
    .attr('d', diagonal);

//Draw a line at origin
/*canvas.append('line')
    .attr('class','mile-0')
    .attr('x2',width)
    .attr('y1',scaleY(0))
    .attr('y2',scaleY(0))
    .style('stroke','rgb(50,50,50)')
    .style('stroke-width','2px')*/


//Draw individual lines, including branches
function draw(top,bottom,dist,ctx,name,cap){


    var distTable = d3.map(dist, function(d){return d.id;});
    var minDist = d3.min(dist, function(d){return d.dist}),
        maxDist = d3.max(dist, function(d){return d.dist});
    var lineMetadata = metadata[name];

    //Name of the line
    if(!(name=="Red-A" || name=="Red-B")){
        d3.select(ctx).append('text')
            .text(name)
            .attr('class','important')
            .attr('y',height-60);
    }

    //Generate rectangles for each station

    var line = d3.svg.area()
        .x(function(d){
            return scaleXLeft(d.vol.get(currentTime));
        })
        .y(function(d){
            var meta = distTable.get(d.id);
            return scaleY(meta.dist);
        })
        .x0(wPerLine/2)
        .interpolate('step');

    var areaLeft = d3.select(ctx).append('path')
        .attr('class','area left')
        .datum(top)
        .attr('d',line);

    var line2 = d3.svg.area()
        .x(function(d){
            return scaleXRight(d.vol.get(currentTime));
        })
        .y(function(d){
            var meta = distTable.get(d.id);
            return scaleY(meta.dist);
        })
        .x0(wPerLine/2)
        .interpolate('step');

    var areaRight = d3.select(ctx).append('path')
        .attr('class','area right')
        .datum(bottom)
        .attr('d',line2);

    //Generate capacity areas
    var capArea = d3.svg.area()
        .defined(function(d){
            return d.id != "";
        })
        .x(function(d){
            //var capPerCar = d.vol.get(currentTime);
            var capPerCar = carCap[name];
            return scaleXLeft(capPerCar * lineMetadata.get("tph-l").get(currentTime) * lineMetadata.get("avg-consist").get(currentTime));
        })
        .y(function(d){
            var meta = distTable.get(d.id);
            return scaleY(meta.dist);
        })
        .x0(wPerLine/2)
        .interpolate('step');

    var capAreaLeft = d3.select(ctx).append('path')
        .attr('class','cap-area left')
        .datum(cap)
        .attr('d',capArea);

    var capArea2 = d3.svg.area()
        .defined(function(d){
            return d.id != "";
        })
        .x(function(d){
            //var capPerCar = d.vol.get(currentTime);
            var capPerCar = carCap[name];
            return scaleXRight(capPerCar * lineMetadata.get("tph-r").get(currentTime) * lineMetadata.get("avg-consist").get(currentTime));
        })
        .y(function(d){
            var meta = distTable.get(d.id);
            return scaleY(meta.dist);
        })
        .x0(wPerLine/2)
        .interpolate('step');

    var capAreaRight = d3.select(ctx).append('path')
        .attr('class','cap-area right')
        .datum(cap)
        .attr('d',capArea2);

    //Center line
    d3.select(ctx).append('line')
        .attr('x1',wPerLine/2)
        .attr('x2',wPerLine/2)
        .attr('y1',scaleY(minDist))
        .attr('y2',scaleY(maxDist))
        .attr('class','center-line below')
        .style('stroke','white')
        .style('stroke-width','3px');
    d3.select(ctx).append('line')
        .attr('x1',wPerLine/2)
        .attr('x2',wPerLine/2)
        .attr('y1',scaleY(minDist))
        .attr('y2',scaleY(maxDist))
        .attr('class','center-line above '+name)
        .style('stroke-width','1.5px');

    //Ticks for stations
    var tickWidth = linePos.get(name).w;
    var stations = d3.select(ctx).selectAll('.station')
        .data(dist)
        .enter()
        .append('g')
        .attr('class','station')
        .attr('transform',function(d){
            return 'translate('+(wPerLine/2-tickWidth/2)+','+scaleY(d.dist)+')';
        });
    stations.append('line')
        .attr('x2',tickWidth);
    stations.append('text')
        .text(function(d){ return d.id });

    //Listen to time change events
    dispatch.on('timeChange.'+name, function(d){
        line
            .x(function(d){
                return scaleXLeft(d.vol.get(currentTime));
            })
            .x0(wPerLine/2);
        line2
            .x(function(d){
                return scaleXRight(d.vol.get(currentTime));
            })
            .x0(wPerLine/2);
        capArea
            .x(function(d){
                //var capPerCar = d.vol.get(currentTime);
                var capPerCar = carCap[name];
                return scaleXLeft(capPerCar * lineMetadata.get("tph-l").get(currentTime) * lineMetadata.get("avg-consist").get(currentTime));
            })
            .x0(wPerLine/2);
        capArea2
            .x(function(d){
                //var capPerCar = d.vol.get(currentTime);
                var capPerCar = carCap[name];
                return scaleXRight(capPerCar * lineMetadata.get("tph-r").get(currentTime) * lineMetadata.get("avg-consist").get(currentTime));
            })
            .x0(wPerLine/2);

        areaLeft
            .transition()
            .attr('d',line);
        areaRight
            .transition()
            .attr('d',line2);
        capAreaLeft
            .transition()
            .attr('d',capArea);
        capAreaRight
            .transition()
            .attr('d',capArea2);

    });

}


function parseDist(d){
    return {
        id:d.Station,
        dist:+d.Distance
    }
}

function parseMeta(line){
    metadata[line] = d3.map();

    return function(d){

        if(d["Station"]=="tph-l"||d["Station"]=="tph-r"||d["Station"]=="avg-consist"){
            metadata[line].set(d["Station"], (parseVolume(d)).vol);
        }
        else if(d["Station"===""]){
            return;
        }else{
            return parseVolume(d);
        }

    }

}

function parseVolume(d){
    var station = d["Station"];
    delete d["Station"];

    var volume = d3.map();

    for(time in d){
        volume.set(time,+d[time]);
    }

    return {
        id:station,
        vol:volume
    }
}