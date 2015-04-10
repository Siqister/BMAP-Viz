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

var scaleR = d3.scale.linear().domain([0,1.3]).range([0,height/2-200])

//Metadata global
d3.csv('data/inbound.csv',parse,function(err,data){
    var points = data.length;

    var line = d3.svg.line.radial()
        .angle(function(d){
            return d.id/points * Math.PI * 2;
        })
        .radius(function(d){
            return scaleR(d.v1);
        })
        .interpolate('cardinal')


    canvas.append('g')
        .attr('class','scale')
        .attr('transform','translate('+width/2+','+height/2+')')
        .selectAll('.tick-y')
        .data([.2,.4,.6,.8,1,1.2])
        .enter()
        .append('circle')
        .attr('class','tick-y')
        .attr('r',function(d){
            return scaleR(d);
        })
        .style('fill','none')
        .style('stroke',function(d){
            if(d==1){return 'black'};
            return 'rgb(200,200,200)'
        })
        .style('stroke-width','1px')
        .style('stroke-dasharray','3px 2px');

    var tickX = canvas.append('g')
        .attr('class','scale')
        .attr('transform','translate('+width/2+','+height/2+')')
        .selectAll('.tick-x')
        .data(data)
        .enter()
        .append('g')
        .attr('class','tick-x')
        .attr('transform',function(d){
            var angle = d.id/points * 360 - 90;
            return 'rotate('+angle+')';
        });

    tickX
        .append('line')
        .attr('x1',scaleR(.1))
        .attr('x2',scaleR(1.3))
        .style('fill','none')
        .style('stroke','rgb(200,200,200)')
        .style('stroke-width','1px');
    tickX
        .append('text')
        .attr('x',scaleR(1.3))
        .text(function(d){
            return d.name;
        })
        .attr('dy',5)
        .style('font-size','10px')

    canvas.append('path')
        .attr('class','s8am')
        .datum(data)
        .attr('transform','translate('+width/2+','+height/2+')')
        .attr('d',function(d){
            return line(d)+'z';
        })
        .style('fill','none')
        .style('stroke','rgb(80,80,80)')
        .style('stroke-width','2px');

    line
        .radius(function(d){
            return scaleR(d.v2);
        })

    canvas.append('path')
        .attr('class','ns8am')
        .datum(data)
        .attr('transform','translate('+width/2+','+height/2+')')
        .attr('d',function(d){
            return line(d)+'z';
        })
        .style('fill','none')
        .style('stroke','rgb(150,150,150)')
        .style('stroke-width','1px');



});

function parse(d){
    return {
        name:d.RD_NAME,
        dir:d.RD_DIRECTION,
        v1:+d.S8AM,
        v2:+d.NS8AM,
        id:+d.id
    }
}