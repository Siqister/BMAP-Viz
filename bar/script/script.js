/* Part 6 Rearranging DOM */


/*Start by setting up the canvas */
var margin = {t:50,r:200,b:50,l:200};
var width = $('.canvas').width() - margin.r - margin.l,
    height = $('.canvas').height() - margin.t - margin.b;

console.log(height);

var canvas = d3.select('.canvas')
    .append('svg')
    .attr('width',width+margin.r+margin.l)
    .attr('height',height + margin.t + margin.b)
    .append('g')
    .attr('class','canvas')
    .attr('transform','translate('+margin.l+','+margin.t+')');

//Specific to this viz
var padding = 8;
scaleX = d3.scale.linear().domain([0,1]).range([width/2,width]);
scaleY = d3.scale.linear();

var colorScale = d3.scale.category20();

var pctFormat =  d3.format('.1%'),
    totalFormat = d3.format(',');

d3.csv("data/hood_mode_share_acs2013_5year.csv",parse,loaded);

function parse(d){
    var newRow = {}, totalTrips = 0;

    newRow.neighborhood = d.Neighborhood;
    newRow.modes = [];
    delete d.Neighborhood;

    for(var key in d){
        newRow.modes.push({
            mode:key,
            trips: +d[key]
        })

        totalTrips += Math.abs(+d[key]);
    }
    newRow.totalTrips = totalTrips;

    newRow.modes.forEach(function(m){
        m.share = m.trips/newRow.totalTrips;
    })

    return newRow;
}

function loaded(err,data){
    console.log(layout(data));

    var hoodNodes = canvas.selectAll('neighborhood')
        .data(layout(data))
        .enter()
        .append('g')
        .attr('transform',function(d){
            return 'translate(0,'+ d.y+ ')';
        });
    hoodNodes
        .append('text')
        .text(function(h){
            return totalFormat(Math.round(h.totalTrips))
        })
        .attr('x',width);
    hoodNodes
        .each(function(d){
            d3.select(this)
                .selectAll('mode')
                .data(d.modes)
                .enter()
                .append('rect')
                .attr('x',function(m){
                    return m.x;
                })
                .attr('width',function(m){
                    return m.dx;
                })
                .attr('height',d.dy)
                .style('fill',function(m,i){
                    return colorScale(i);
                });

            d3.select(this)
                .selectAll('mode-text')
                .data(d.modes)
                .enter()
                .append('text')
                .attr('class','mode-text')
                .text(function(m){
                    return pctFormat(m.share)
                })
                .attr('x',function(m){
                    return m.x;
                })
                .style('font-size','10px')
                .attr('dy',10)

            d3.select(this)
                .append('text')
                .text(d.neighborhood);

        });

    /*canvas.append('rect')
        .attr('width',width)
        .attr('height',height);*/
    canvas.selectAll('tick')
        .data([-1,-.75,-.5,-.25,0,.25,.5,.75,1])
        .enter()
        .append('line')
        .attr('class','tick')
        .attr('x1',function(d){return scaleX(d)})
        .attr('x2',function(d){return scaleX(d)})
        .attr('y1',0)
        .attr('y2',height)
        .style('stroke','purple');

}

function layout(data){
    var totalTrips = 0,
        neighborhoods = 0,
        currentY = 0;

    data.forEach(function(h){
        totalTrips += h.totalTrips;
        neighborhoods += 1;
    })

    scaleY
        .domain([0,totalTrips])
        .range([0,height - (neighborhoods-1)*padding]);

    data.forEach(function(h){
        h.y = currentY;
        h.dy = scaleY(h.totalTrips);

        currentY = currentY + h.dy + padding;

        //var currentX = scaleX(h.modes[0].share);
        var currentX = scaleX(0);
        h.modes.forEach(function(m){
            m.x = currentX;
            m.dx = scaleX(Math.abs(m.share))-scaleX(0);

            currentX += m.dx;
        })
    })

    return data;
}