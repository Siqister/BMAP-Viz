

/*Start by setting up the canvas */
var margin = {t:0,r:300,b:0,l:500};
var width = $('.canvas').width() - margin.r - margin.l,
    height = $('.canvas').height() - margin.t - margin.b;

var canvas = d3.select('.canvas')
    .append('svg')
    .attr('width',width+margin.r+margin.l)
    .attr('height',height + margin.t + margin.b)
    .append('g')
    .attr('class','canvas')
    .attr('transform','translate('+margin.l+','+margin.t+')');

var nodes, links = [], map = d3.map();

var sankey = d3.sankey()
    .nodeWidth(20)
    .nodePadding(45)
    .size([width,height]);
var path = sankey.link();


/* Acquire and parse data */
d3.csv('data/in_out_boston_by_mode_2.csv', parse, dataLoaded);

function dataLoaded(err,rows){


    nodes = map.values();

    sankey
        .nodes(nodes)
        .links(links)
        .layout(64);


    draw();
}

function draw(){



    var link = canvas.append('g').selectAll('.link')
        .data(links)
        .enter()
        .append('path')
        .attr('class','link')
        .attr('d',path)
        .style('stroke-width',function(d){return d.dy})
        .style('fill','none')
        .style('stroke','black')
        .style('stroke-opacity',.5);
    var node = canvas.append('g').selectAll('node')
        .data(nodes)
        .enter()
        .append('g')
        .attr('class','node')
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
        //.call(repositionNodes)
        .call(d3.behavior.drag()
            //.origin(function(d){ return d;})
            .on('drag',dragmove)

        );

    node.append('rect')
        .attr("height", function(d) { return d.dy; })
        .attr("width", sankey.nodeWidth())
        .style('fill',function(d){
            return d.type == "O"?"red":"blue";
        })
    node.append('text')
        .text(function(d){return d.name + '/' + d.type + '/' + d.mode});

    function dragmove(d){
        d3.select(this).attr("transform", "translate(" + (d.x = Math.max(0, Math.min(width - d.dx, d3.event.x))) + "," + (d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))) + ")");
        sankey.relayout();
        link.attr("d", path);
    }

    function repositionNodes(node){

        var BO = node.filter(function(d){ return d.name=="Boston" && d.type=="O"}),
            BD = node.filter(function(d){ return d.name=="Boston" && d.type=="D"}),
            OO = node.filter(function(d){ return d.name=="Outside" && d.type=="O"}),
            OD = node.filter(function(d){ return d.name=="Outside" && d.type=="D"});


        var initPos = [
            {x:200,y:0},
            {x:300,y:height/2},
            {x:width-50, y:0},
            {x:width-50, y:height/2}
        ];

        BO.each(function(d,i){
            d3.select(this)
                .attr("transform", "translate("+initPos[0].x+','+initPos[0].y+')');
            initPos[0].y += d.dy;
        })
        BD.each(function(d,i){
            d3.select(this)
                .attr("transform", "translate("+initPos[1].x+','+initPos[1].y+')');
            initPos[1].y += d.dy;
        })
        OO.each(function(d,i){
            d3.select(this)
                .attr("transform", "translate("+initPos[2].x+','+initPos[2].y+')');
            initPos[2].y += d.dy;
        })
        OD.each(function(d,i){
            d3.select(this)
                .attr("transform", "translate("+initPos[3].x+','+initPos[3].y+')');
            initPos[3].y += d.dy;
        })

        console.log("ok!");
        sankey.relayout();
        link.attr("d", path);
    }

}

function parse(row,i){
    switch(i){
        //B to B
        case 0:
            delete row.OD;
            for(var key in row){
                var source = {
                    name:"Boston",
                    type:"O",
                    mode:key
                };
                var target = {
                    name:"Boston",
                    type:"D",
                    mode:key
                };
                map.set("Boston-O-" + key, source);
                map.set("Boston-D-" + key, target)

                links.push({
                    source: map.get("Boston-O-" + key)?map.get("Boston-O-" + key):source,
                    target: map.get("Boston-D-" + key)?map.get("Boston-D-" + key):target,
                    value: +row[key]
                });

            }
        break;

        //O to B
        case 1:
            delete row.OD;
            for(var key in row){
                var source = {
                    name:"Outside",
                    type:"O",
                    mode:key
                };
                map.set("Outside-O-" + key, source);

                links.push({
                    source: map.get("Outside-O-" + key)?map.get("Outside-O-" + key):source,
                    target: map.get("Boston-D-" + key),
                    value: +row[key]
                });
            }
        break;

        //B to O
        case 2:
            delete row.OD;
            for(var key in row){
                var target = {
                    name:"Outside",
                    type:"D",
                    mode:key
                };
                map.set("Outside-D-"+key, target);

                links.push({
                    source: map.get("Boston-O-" + key),
                    target: map.get("Outside-D-" + key)?map.get("Outside-D-"+key):target,
                    value: +row[key]
                });

            }
        break;
    }
}