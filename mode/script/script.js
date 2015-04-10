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

var size = 400;
var color = d3.scale.category20()
    //.domain(['auto','carpool','transit','walk','bike','other','wfh']);
var change = d3.scale.linear().domain([0,.5]).range([size/2-110,size/2-20]);

var baseline;

var pie = d3.layout.pie()
    .value(function(d){
        return d.share;
    });
var arc = d3.svg.arc()
    .innerRadius(size/2-115)
    .outerRadius(size/2-105);
var format = d3.format('%');

//Metadata global
d3.csv('data/city_mode_share.csv',parse,function(err,data){
    var charts = canvas.selectAll('.year')
        .data(data)
        .enter()
        .append('g')
        .attr('class','year')
        .attr('transform', function(d,i){
            var perRow = Math.floor(width/size);
            var x = i * size,
                y = 0;
            if((x+size)>width){
                x = (i-perRow)*size;
                y = size;
            }
            return 'translate('+x+','+y+')';
        });
    charts.selectAll('.slice')
        .data(function(d){
            return pie(d.values);
        })
        .enter()
        .append('path')
        .attr('transform','translate('+size/2+','+size/2+')')
        .attr('d',arc)
        .style('fill',function(d,i){
            return color(i);
        });
    var arrows = charts
        .append('g')
        .attr('transform','translate('+size/2+','+size/2+')')
        .selectAll('.arrow')
        .data(function(d){
            return pie(d.values);
        })
        .enter()
        .append('g')
        .attr('class','arrow');
    arrows
        .attr('transform',function(d){
            var angle = (d.startAngle+ d.endAngle)/2 * (180/Math.PI); //clockwise from 12
            return 'rotate('+(angle-90)+')';
        })
        .append('text')
        .attr('x',size/2-110)
        .text(function(d){
            return d.value+"%";
        });
    arrows
        .append('line')
        .attr('x1',change(0))
        .attr('x2',function(d){
            return change(d.data.change);
        })
        .style('stroke',function(d,i){
            return color(i);
        })
        .style('stroke-width','2px');
    arrows
        .append('text')
        .attr('x',size/2-50)
        .text(function(d){
            return format(d.data.change);
        });

    charts
        .append('g')
        .attr('transform','translate('+size/2+','+size/2+')')
        .selectAll('.ring')
        .data([-.25,0,.25,.5])
        .enter()
        .append('circle')
        .attr('r',function(d){
            return change(d);
        })
        .style('fill','none')
        .style('stroke','black');
});

function parse(d){
    var values = [],
        year = +d.year,
        source = d.source;

    delete d.year;
    delete d.source;

    if(year==1990){
        baseline = d3.map();
        for(key in d){
            baseline.set(key,+d[key]);
        }
    }


    for(key in d){
        var v = +d[key];

        values.push({
            mode:key,
            share:v,
            change:baseline?((v-baseline.get(key))/baseline.get(key)):0
        })
    }

    return {
        year:year,
        values:values
    }
}