/*Start by setting up the canvas */
var margin = {t:100,r:150,b:50,l:200};
var width = $('.canvas').width() - margin.r - margin.l,
    height = $('.canvas').height() - margin.t - margin.b;

var commuteTime = d3.select('#commute-time');

//Global data variables
//TODO: trip totals actually include cities in Suffolk that are not Boston, but ok for now
var cityTripTotal = 0,
    cityWorkerTotal = 0, //cityWorkerTotal = cityTripTotal + work from home
    tractMetadata = d3.map();

//Global visual variables
var yPadding = 5,
    cellWidth = width/8,
    scaleY = d3.scale.linear(),
    scaleColor = d3.scale.linear().domain([0,.2]).range(['white','black']);
var fisheye = d3.fisheye.circular()
      .radius(60);
var format = d3.format('%.1')

//map projections
var projection = d3.geo.conicConformal()
    .rotate([0,0])
    .center([-71.0636,42.3581])
    .scale(240000)
    .translate([width/2,height/2])
    .precision(.1)

var path = d3.geo.path()
    .projection(projection);




//Load data
d3.csv("data/tract_metadata.csv", parseMeta, function(err,meta){
    queue()
        .defer(d3.csv, "data/ACS_13_5YR_B08303_with_ann.csv", parseTime)
        .defer(d3.csv, "data/ACS_13_5YR_B08301_with_ann.csv", parseMode)
        .await(dataLoaded);
})

function dataLoaded(err, time, mode){


    drawTimeChart(time,commuteTime);
}

function drawTimeChart(tracts,ctx){

    var canvas = ctx
        .append('svg')
        .attr('width',width+margin.r+margin.l)
        .attr('height',height + margin.t + margin.b)
        .append('g')
        .attr('class','canvas')
        .attr('transform','translate('+margin.l+','+margin.t+')');
    var tooltip = ctx.select('.custom-tooltip');

    //Nest tracts by neighborhoods
    //And remove those in HI
    //Compute neighorhood trip total
    var hoods = d3.nest()
        .key(function(d){return d.neighborhood})
        .map(tracts,d3.map);
    hoods.remove('Harbor Islands');

    hoods = hoods.entries();
    hoods
        .sort(function(a,b){
            if(a.key > b.key){
                return 1
            }else if(a.key < b.key){
                return -1;
            }
        });
    hoods.forEach(function(h){
        h.total = 0;
        h.value.forEach(function(tract){
            h.total += tract.total;
        });
    });

    //Set up the scales
    scaleY
        .domain([0,cityTripTotal])
        .range([0,height-(hoods.length-1)*yPadding]);


    //Start drawings
    var node = canvas.selectAll('.node')
        .data(chartLayout(hoods),function(d){return d.key})
        .enter()
        .append('g')
        .attr('class',function(d){
            if(d.depth == 0){ return 'node share'}
            else if(d.depth == 1){return 'node tract'}
            else{return 'node neighborhood'}
        })
        .attr('transform',function(d){
            return 'translate('+d.x+','+d.y+')';
        });
    node.filter(function(d){return d.depth == 2; })
        .append('text')
        .text(function(d){
            return d.key;
        })
        .attr('text-anchor','end')
        .attr('dy',10)
        .attr('dx',-5);
    var shareNode = node.filter(function(d){return d.depth == 0; })
        .append('rect')
        .attr('width',function(d){return d.dx;})
        .attr('height',function(d){return d.dy;})
        .style('fill',function(d){
            return scaleColor(d.share);
        })
        .on('mouseover',onShareEnter)
        .on('mousemove',onShareHover)
        .on('mouseout',onShareOut);

    canvas.on('mousemove',function(){
        fisheye.focus(d3.mouse(this));

        node.each(function(d){
            d.fisheye = fisheye(d);
            })
            .attr('transform',function(d){
                return 'translate('+d.fisheye.x+','+d.fisheye.y+')';
            });

        shareNode
            .attr('width',function(d){return d.dx * d.fisheye.z;})
            .attr('height',function(d){return d.dy * d.fisheye.z;})
    })

    function onShareEnter(s){
        tooltip
            .transition()
            .style('opacity',1);
        tooltip
            .append('p')
            .html((function(){
                if(s.subNeighborhood){
                    return '<span class="data">'+ (s.displayName.split(','))[0] + ' </span>('+s.subNeighborhood+', '+s.neighborhood+')';
                }else{
                    return '<span class="data">'+ (s.displayName.split(','))[0] + ' </span>('+s.neighborhood+')';
                }
            })())
        tooltip
            .append('p')
            .html((function(){
                return '<span class="data">'+s.trip+'</span> workers (<span class="data">'+format(s.share)+'</span>) have commutes in the '+s.time+' minute range';
            })())


    }
    function onShareHover(s){
        var xy = d3.mouse(ctx.node());
        tooltip
            .style('left',xy[0]-90+'px')
            .style('bottom',(height+150-xy[1])+'px');
    }
    function onShareOut(s){
        tooltip
            .transition()
            .style('opacity',0);

        tooltip.selectAll('p')
            .remove();
    }

    function chartLayout(hoods){
        //a modified hierarchical layout
        //hoods -> tracts -> shares
        //returns a flat array of positions
        var positions = [],
            currentY = 0;

        hoods.forEach(function(h){
            h.x = 0;
            h.y = currentY;
            h.depth = 2;
            positions.push(h);

            var currentY2 = 0;
            h.value.forEach(function(t){
                t.x = 0;
                t.y = currentY2 + currentY;
                t.depth = 1;
                t.key = t.geoid;
                positions.push(t);

                var currentX = 0;
                t.timeShares.forEach(function(s,i){
                    s.x = currentX;
                    s.y = currentY2 + currentY;
                    s.dx = cellWidth;
                    s.dy = scaleY(t.total);
                    s.depth = 0;
                    s.key = t.geoid + '-' + i;

                    positions.push(s);

                    currentX += cellWidth;
                })

                currentY2 += scaleY(t.total);
            })

            currentY += yPadding + scaleY(h.total);
        })

        return positions;
    }

}

function parseTime(d){
    //each newRow represents a census tract
    var newRow = {};

    newRow.displayName = d['GEO.display-label'];
    newRow.geoid = d['GEO.id'];
    newRow.geoid2 = d['GEO.id2'];
    newRow.total = +d.Total;
    newRow.timeShares = [];

    //Grab metadata from the global metadata map
    var m = tractMetadata.get(newRow.geoid);
    if(m == undefined || newRow.total == 0){
        //if no metadata, means tract is outside of Boston
        //if total for the tract is 0, ignore
        return;
    }else{
        newRow.neighborhood = m.neighborhood;
        newRow.subNeighborhood = m.subNeighborhood;
    }

    delete d['GEO.display-label'];
    delete d['GEO.id'];
    delete d['GEO.id2'];
    delete d.Total;

    for(var key in d){
        if(newRow.total != 0){
            newRow.timeShares.push({
                displayName: newRow.displayName,
                neighborhood: newRow.neighborhood,
                subNeighborhood: newRow.subNeighborhood,
                time:key,
                trip:+d[key],
                share:+d[key]/newRow.total
            })
        }
    }

    cityTripTotal += newRow.total;

    return newRow;
}
function parseMode(d){
    return d;
}
function parseMeta(d){
    tractMetadata.set(
        d['GEO.id'],
        {
            neighborhood: d.Neighborhood,
            subNeighborhood: d['Sub-Neighborhood']?d['Sub-Neighborhood']:undefined
        }
    )
}