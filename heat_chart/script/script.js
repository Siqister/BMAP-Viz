/* Part 6 Rearranging DOM */


/*Start by setting up the canvas */
var margin = {t:50,r:200,b:50,l:200};
var width = $('.canvas').width() - margin.r - margin.l,
    height = $('.canvas').height() - margin.t - margin.b;

var canvas = d3.select('.canvas')
    .append('svg')
    .attr('width',width+margin.r+margin.l)
    .attr('height',height + margin.t + margin.b)
    .append('g')
    .attr('class','canvas')
    .attr('transform','translate('+margin.l+','+margin.t+')');



//Specific to this viz
var yPadding = 13,
    cellWidth = width/9;
var scaleY = d3.scale.linear();

var cityTripTotal = 0;

var colorScale = d3.scale.linear().domain([0,.4]).range(['white','#ff0040']);
var format = d3.format('.1%');


d3.csv("data/travel_time_split_by_tract.csv",parse,loaded);

function loaded(err,data){
    var neighborhoods = d3.nest()
        .key(function(d){ return d.neighborhood; })
        .entries(data);

    neighborhoods.forEach(function(n){
        n.tripTotal = 0;
        n.values.forEach(function(tract){
            n.tripTotal += tract.total;
        });
    });

    scaleY
        .domain([0,cityTripTotal])
        .range([0,height-(neighborhoods.length-1)*yPadding]);

    draw(neighborhoods);
}

function draw(neighborhoods){
    var currentY = 0;

    var hoodNode = canvas.selectAll('.hood')
        .data(neighborhoods)
        .enter()
        .append('g')
        .attr('class','hood')
        .attr('transform',function(d,i){
            var yPos = currentY;
            currentY += yPadding + scaleY(d.tripTotal);
            return 'translate(0,'+yPos+')';
        });
    hoodNode.append('text')
        .text(function(d){
            return d.key;
        });

    hoodNode.each(function(d){
        var currentY2 = 0;

        //draw <g> for each tract
        var tractNode = d3.select(this)
            .selectAll('.tract')
            .data(d.values)
            .enter()
            .append('g').attr('class','tract')
            .attr('transform',function(t){
                var yPos = currentY2;
                currentY2 += scaleY(t.total);
                return 'translate(0,'+yPos+')';
            })
            .on('click', function(t){
                console.log(t);
            })

        //highlight subneighborhoods
        tractNode
            .append('text')
            .text(function(t){
                return t.subhood;
            })
            .attr('x',width)
            .style('font-size','8px');

        //draw <rect> for each timeshare
        tractNode.each(function(t){
            var timeShares = d3.select(this)
                .selectAll('.time-share')
                .data(t.split)
                .enter()
                .append('rect')
                .attr('class','time-share')
                .attr('x',function(s,i){
                    return i*cellWidth;
                })
                .attr('width',cellWidth)
                .attr('height', scaleY(t.total))
                .style('fill',function(s){
                    //split can be between 0 and 30%;
                    return colorScale(s);
                })
                .style('stroke',function(s){
                    if(t.subhood) return "blue";
                    else return null;
                })
            d3.select(this)
                .selectAll('.time-share-text')
                .data(t.split)
                .enter()
                .append('text')
                .attr('class','time-share-text')
                .attr('x', function(s,i){
                    return i*cellWidth;
                })
                .text(function(s){
                    return format(s);
                })
                .style('font-size','4px')
            /*timeShares.sort(function(a,b){
                return b-a;
            });
            d3.select(timeShares[0][0])
                .style('stroke','blue')
                .style('stroke-width','1px');*/
        })
    })
}

function parse(d){
    var newRow = {};
    newRow.neighborhood = d.Neighborhood;
    newRow.geoid = d["GEO.id"];
    newRow.total = +d.HD01_VD01;
    newRow.split = [];
    newRow.subhood = d["Sub-Neighborhood"]?d["Sub-Neighborhood"]:undefined;

    delete d.Neighborhood;
    delete d["GEO.id"];
    delete d.HD01_VD01;
    delete d["GEO.id2"];
    delete d["GEO.display-label"];
    delete d["Sub-Neighborhood"];

    for(var key in d){
        if(newRow.total != 0){
            newRow.split.push(+d[key]/newRow.total);
        }
    }

    cityTripTotal += newRow.total;

    return newRow;
}

function layout(data){
}